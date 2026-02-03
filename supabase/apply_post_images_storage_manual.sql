-- Run this in Supabase Dashboard > SQL Editor to create post images storage
-- This creates a public bucket for community post images

-- Step 1: Create the bucket via the Storage UI first (recommended)
-- Go to: Supabase Dashboard > Storage > New bucket
-- Name: post-images
-- Public: Yes
-- File size limit: 10MB
-- Allowed MIME types: image/jpeg, image/jpg, image/png, image/gif, image/webp, image/heic, image/heif

-- Step 2: Then run these policies:

-- Drop existing policies if they exist (safe to run)
DROP POLICY IF EXISTS "Users can upload post images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view post images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own post images" ON storage.objects;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload post images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'post-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow anyone to view post images (public bucket)
CREATE POLICY "Anyone can view post images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'post-images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete own post images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'post-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
