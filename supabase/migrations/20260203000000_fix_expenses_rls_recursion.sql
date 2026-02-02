-- Fix infinite recursion: expenses SELECT policy was querying expense_splits,
-- and expense_splits policies query expenses, causing a cycle when inserting splits.
-- Drop the policy that selects from expense_splits; group members already see
-- expenses via "users can view own expenses" (group_id IN group_members).

DROP POLICY IF EXISTS "users can view split expenses" ON public.expenses;
