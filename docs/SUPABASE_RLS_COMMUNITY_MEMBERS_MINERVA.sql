-- =============================================================================
-- Community Members: Restrict joining city/university communities to
-- @uni.minerva.edu only. Private communities (e.g. Personal Friends, invites)
-- remain joinable via RPC/invite.
-- Run this in Supabase Dashboard → SQL Editor.
-- =============================================================================

-- Drop existing INSERT policy on community_members (names may vary)
drop policy if exists "users can join communities" on community_members;
drop policy if exists "members insert" on community_members;
drop policy if exists "community_members insert" on community_members;

-- Allow insert only when:
-- - user_id = auth.uid()
-- - and (community is private OR (city/university AND user email ends with @uni.minerva.edu))
create policy "community_members insert minerva or private"
on community_members for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    (select c.kind from public.communities c where c.id = community_id) = 'private'
    or (
      (select c.kind from public.communities c where c.id = community_id) in ('city', 'university')
      and (select lower(p.email) from public.profiles p where p.user_id = auth.uid()) like '%@uni.minerva.edu'
    )
  )
);
