-- Ensure new users get a profile row automatically
-- Run: npx supabase db push (or apply via Supabase Dashboard SQL Editor)

-- Create/replace the function that inserts into profiles on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    new.id,
    COALESCE(new.email, ''),
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(COALESCE(new.email, ''), '@', 1))
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name);
  RETURN new;
END;
$$;

-- Drop trigger if it exists (avoids duplicate)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger: runs after each new user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
