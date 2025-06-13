/*
  # Fix Storage Permissions for Cover Art Generation

  1. Updates
    - Ensure proper storage permissions for the coverart bucket
    - Fix RLS policies to allow authenticated users to upload and manage cover art
    - Add policies for public read access to cover art images

  2. Security
    - Maintain security while allowing proper access for cover art generation
    - Ensure users can only manage their own files
*/

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for coverart bucket to avoid conflicts
DROP POLICY IF EXISTS "Artists can upload cover art" ON storage.objects;
DROP POLICY IF EXISTS "Public can view cover art" ON storage.objects;
DROP POLICY IF EXISTS "Artists can update their own cover art" ON storage.objects;
DROP POLICY IF EXISTS "Artists can delete their own cover art" ON storage.objects;

-- Create improved policies for coverart bucket
CREATE POLICY "Artists can upload cover art"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'coverart' AND
  (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid()::text = (storage.foldername(name))[1])
);

CREATE POLICY "Public can view cover art"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'coverart');

CREATE POLICY "Artists can update their own cover art"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'coverart' AND
  (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid()::text = (storage.foldername(name))[1])
);

CREATE POLICY "Artists can delete their own cover art"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'coverart' AND
  (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid()::text = (storage.foldername(name))[1])
);

-- Grant proper permissions on storage.objects
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO public;

-- Ensure the coverart bucket exists and has proper configuration
DO $$
DECLARE
  bucket_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'coverart'
  ) INTO bucket_exists;
  
  IF NOT bucket_exists THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('coverart', 'coverart', true);
  ELSE
    UPDATE storage.buckets
    SET public = true
    WHERE name = 'coverart';
  END IF;
END $$;