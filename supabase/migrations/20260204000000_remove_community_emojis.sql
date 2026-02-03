-- Remove emojis from communities (pictures are enough for display).
-- Keeps the emoji column; sets all values to NULL.
UPDATE public.communities SET emoji = NULL;
