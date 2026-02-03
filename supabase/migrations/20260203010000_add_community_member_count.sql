-- Add member_count column to communities table
-- This allows everyone to see member counts without needing access to community_members

-- Add the column
ALTER TABLE public.communities 
ADD COLUMN IF NOT EXISTS member_count integer NOT NULL DEFAULT 0;

-- Create trigger function to update member_count
CREATE OR REPLACE FUNCTION public.update_community_member_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE communities 
    SET member_count = member_count + 1 
    WHERE id = NEW.community_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE communities 
    SET member_count = GREATEST(0, member_count - 1) 
    WHERE id = OLD.community_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_community_member_change ON public.community_members;

-- Create the trigger
CREATE TRIGGER on_community_member_change
AFTER INSERT OR DELETE ON public.community_members
FOR EACH ROW
EXECUTE FUNCTION public.update_community_member_count();

-- Backfill existing counts
UPDATE public.communities c
SET member_count = (
  SELECT COUNT(*)::integer 
  FROM public.community_members cm 
  WHERE cm.community_id = c.id
);
