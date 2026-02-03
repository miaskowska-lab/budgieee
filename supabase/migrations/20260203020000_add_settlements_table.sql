-- Settlements table to record payments between users
-- When someone pays another person to settle a balance

CREATE TABLE IF NOT EXISTS public.settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  payer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'USD',
  note text,
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS settlements_group_idx ON public.settlements(group_id);
CREATE INDEX IF NOT EXISTS settlements_payer_idx ON public.settlements(payer_id);
CREATE INDEX IF NOT EXISTS settlements_payee_idx ON public.settlements(payee_id);
CREATE INDEX IF NOT EXISTS settlements_created_at_idx ON public.settlements(created_at DESC);

-- RLS Policies
-- Users can view settlements where they are involved OR are in the same group
CREATE POLICY "users can view own settlements"
ON public.settlements
FOR SELECT
TO authenticated
USING (
  payer_id = auth.uid() 
  OR payee_id = auth.uid()
  OR (group_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM group_members gm 
    WHERE gm.group_id = settlements.group_id 
    AND gm.user_id = auth.uid()
  ))
);

-- Users can create settlements where they are the payer or payee
CREATE POLICY "users can create settlements"
ON public.settlements
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (payer_id = auth.uid() OR payee_id = auth.uid())
);

-- Users can delete their own settlements (in case of mistake)
CREATE POLICY "users can delete own settlements"
ON public.settlements
FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON public.settlements TO authenticated;

-- Update the balance calculation function to include settlements
-- This function calculates net balance between the current user and another user
CREATE OR REPLACE FUNCTION public.get_user_balances()
RETURNS TABLE (
  other_user_id uuid,
  other_user_email text,
  other_user_name text,
  balance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH 
  -- Amount I owe others from expense splits (where someone else paid)
  i_owe AS (
    SELECT 
      e.paid_by AS other_id,
      SUM(es.share) AS amount
    FROM expenses e
    JOIN expense_splits es ON es.expense_id = e.id
    WHERE es.user_id = current_user_id
      AND e.paid_by != current_user_id
    GROUP BY e.paid_by
  ),
  -- Amount others owe me (from expenses I paid)
  they_owe AS (
    SELECT 
      es.user_id AS other_id,
      SUM(es.share) AS amount
    FROM expenses e
    JOIN expense_splits es ON es.expense_id = e.id
    WHERE e.paid_by = current_user_id
      AND es.user_id != current_user_id
    GROUP BY es.user_id
  ),
  -- Settlements I made (reduces what I owe)
  i_paid AS (
    SELECT 
      payee_id AS other_id,
      SUM(amount) AS amount
    FROM settlements
    WHERE payer_id = current_user_id
    GROUP BY payee_id
  ),
  -- Settlements received (reduces what they owe me)
  i_received AS (
    SELECT 
      payer_id AS other_id,
      SUM(amount) AS amount
    FROM settlements
    WHERE payee_id = current_user_id
    GROUP BY payer_id
  ),
  -- Combine all to get net balances
  combined AS (
    SELECT other_id, SUM(net) AS balance
    FROM (
      -- They owe me (positive)
      SELECT other_id, amount AS net FROM they_owe
      UNION ALL
      -- I owe them (negative)
      SELECT other_id, -amount AS net FROM i_owe
      UNION ALL
      -- I paid them (positive - reduces what I owe / they now owe me more)
      SELECT other_id, amount AS net FROM i_paid
      UNION ALL
      -- They paid me (negative - reduces what they owe / I now owe them more)
      SELECT other_id, -amount AS net FROM i_received
    ) all_transactions
    GROUP BY other_id
    HAVING ABS(SUM(net)) > 0.01
  )
  SELECT 
    c.other_id,
    COALESCE(p.email, '') AS other_user_email,
    p.full_name AS other_user_name,
    c.balance
  FROM combined c
  LEFT JOIN profiles p ON p.user_id = c.other_id;
END;
$$;

-- Function to get balances within a specific group
CREATE OR REPLACE FUNCTION public.get_group_balances(p_group_id uuid)
RETURNS TABLE (
  other_user_id uuid,
  other_user_email text,
  other_user_name text,
  balance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Verify user is a member of this group
  IF NOT EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_id = p_group_id AND user_id = current_user_id
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH 
  -- Amount I owe others in this group
  i_owe AS (
    SELECT 
      e.paid_by AS other_id,
      SUM(es.share) AS amount
    FROM expenses e
    JOIN expense_splits es ON es.expense_id = e.id
    WHERE e.group_id = p_group_id
      AND es.user_id = current_user_id
      AND e.paid_by != current_user_id
    GROUP BY e.paid_by
  ),
  -- Amount others owe me in this group
  they_owe AS (
    SELECT 
      es.user_id AS other_id,
      SUM(es.share) AS amount
    FROM expenses e
    JOIN expense_splits es ON es.expense_id = e.id
    WHERE e.group_id = p_group_id
      AND e.paid_by = current_user_id
      AND es.user_id != current_user_id
    GROUP BY es.user_id
  ),
  -- Settlements I made in this group
  i_paid AS (
    SELECT 
      payee_id AS other_id,
      SUM(amount) AS amount
    FROM settlements
    WHERE payer_id = current_user_id
      AND group_id = p_group_id
    GROUP BY payee_id
  ),
  -- Settlements received in this group
  i_received AS (
    SELECT 
      payer_id AS other_id,
      SUM(amount) AS amount
    FROM settlements
    WHERE payee_id = current_user_id
      AND group_id = p_group_id
    GROUP BY payer_id
  ),
  combined AS (
    SELECT other_id, SUM(net) AS balance
    FROM (
      SELECT other_id, amount AS net FROM they_owe
      UNION ALL
      SELECT other_id, -amount AS net FROM i_owe
      UNION ALL
      SELECT other_id, amount AS net FROM i_paid
      UNION ALL
      SELECT other_id, -amount AS net FROM i_received
    ) all_transactions
    GROUP BY other_id
    HAVING ABS(SUM(net)) > 0.01
  )
  SELECT 
    c.other_id,
    COALESCE(p.email, '') AS other_user_email,
    p.full_name AS other_user_name,
    c.balance
  FROM combined c
  LEFT JOIN profiles p ON p.user_id = c.other_id;
END;
$$;
