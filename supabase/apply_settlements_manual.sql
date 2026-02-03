-- Run this in Supabase Dashboard > SQL Editor if "npx supabase db push" doesn't work
-- Creates settlements table and updates balance functions to include settlements

-- 1. Create settlements table
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

ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS settlements_group_idx ON public.settlements(group_id);
CREATE INDEX IF NOT EXISTS settlements_payer_idx ON public.settlements(payer_id);
CREATE INDEX IF NOT EXISTS settlements_payee_idx ON public.settlements(payee_id);

DROP POLICY IF EXISTS "users can view own settlements" ON public.settlements;
CREATE POLICY "users can view own settlements" ON public.settlements FOR SELECT TO authenticated
USING (
  payer_id = auth.uid() OR payee_id = auth.uid()
  OR (group_id IS NOT NULL AND EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = settlements.group_id AND gm.user_id = auth.uid()))
);

DROP POLICY IF EXISTS "users can create settlements" ON public.settlements;
CREATE POLICY "users can create settlements" ON public.settlements FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND (payer_id = auth.uid() OR payee_id = auth.uid()));

DROP POLICY IF EXISTS "users can delete own settlements" ON public.settlements;
CREATE POLICY "users can delete own settlements" ON public.settlements FOR DELETE TO authenticated
USING (created_by = auth.uid());

GRANT SELECT, INSERT, DELETE ON public.settlements TO authenticated;

-- 2. Update get_user_balances to include settlements (same signature as existing)
CREATE OR REPLACE FUNCTION public.get_user_balances(p_user_id uuid)
RETURNS TABLE (other_user_id uuid, other_user_email text, other_user_name text, balance numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_user_id uuid := COALESCE(p_user_id, auth.uid());
BEGIN
  IF current_user_id IS NULL THEN RETURN; END IF;
  RETURN QUERY
  WITH 
  i_owe AS (SELECT e.paid_by AS other_id, SUM(es.share) AS amount FROM expenses e JOIN expense_splits es ON es.expense_id = e.id WHERE es.user_id = current_user_id AND e.paid_by != current_user_id GROUP BY e.paid_by),
  they_owe AS (SELECT es.user_id AS other_id, SUM(es.share) AS amount FROM expenses e JOIN expense_splits es ON es.expense_id = e.id WHERE e.paid_by = current_user_id AND es.user_id != current_user_id GROUP BY es.user_id),
  i_paid AS (SELECT payee_id AS other_id, SUM(amount) AS amount FROM settlements WHERE payer_id = current_user_id GROUP BY payee_id),
  i_received AS (SELECT payer_id AS other_id, SUM(amount) AS amount FROM settlements WHERE payee_id = current_user_id GROUP BY payer_id),
  combined AS (
    SELECT other_id, SUM(net) AS balance FROM (
      SELECT other_id, amount AS net FROM they_owe
      UNION ALL SELECT other_id, -amount AS net FROM i_owe
      UNION ALL SELECT other_id, amount AS net FROM i_paid
      UNION ALL SELECT other_id, -amount AS net FROM i_received
    ) t GROUP BY other_id HAVING ABS(SUM(net)) > 0.01
  )
  SELECT c.other_id, COALESCE(p.email, '')::text, p.full_name, c.balance
  FROM combined c LEFT JOIN profiles p ON p.user_id = c.other_id;
END;
$$;
