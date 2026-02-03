-- Temporarily allow any authenticated user to join communities
-- (Relaxing the Minerva @uni.minerva.edu restriction)
-- To restore later, re-apply the original policy from SUPABASE_RLS_COMMUNITY_MEMBERS_MINERVA.sql

-- Drop the existing Minerva-only policy
DROP POLICY IF EXISTS "community_members insert minerva or private" ON public.community_members;

-- Create a new policy that allows any authenticated user to join
CREATE POLICY "community_members insert any authenticated"
ON public.community_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
);
