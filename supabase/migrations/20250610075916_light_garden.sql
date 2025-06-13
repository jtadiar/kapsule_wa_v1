/*
  # Fix Profile Images Storage RLS Policy

  1. Storage Policy Updates
    - Enable RLS on storage.objects table for profile-images bucket
    - Add policy for authenticated users to upload their own profile images
    - Add policy for public read access to profile images
    - Add policy for users to update/delete their own profile images

  2. Security
    - Users can only upload files with their user ID in the path
    - Public read access for profile images
    - Users can manage their own uploaded images
*/

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to upload profile images
CREATE POLICY "Users can upload their own profile images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy for public read access to profile images
CREATE POLICY "Public can view profile images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-images');

-- Policy for users to update their own profile images
CREATE POLICY "Users can update their own profile images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'profile-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy for users to delete their own profile images
CREATE POLICY "Users can delete their own profile images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);