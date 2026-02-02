-- Backfill profiles for users who signed up before the trigger existed
-- Run this ONCE in Supabase Dashboard > SQL Editor if existing auth.users have no profiles

INSERT INTO public.profiles (user_id, email, full_name)
SELECT 
  u.id,
  COALESCE(u.email, ''),
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(COALESCE(u.email, ''), '@', 1))
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;
