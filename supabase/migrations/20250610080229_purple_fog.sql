-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policies for tracks bucket
CREATE POLICY "Artists can upload tracks"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tracks' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Public can view tracks"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'tracks');

CREATE POLICY "Artists can update their own tracks"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tracks' AND
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'tracks' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Artists can delete their own tracks"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'tracks' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policies for coverart bucket
CREATE POLICY "Artists can upload cover art"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'coverart' AND
  auth.uid()::text = (storage.foldername(name))[1]
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
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'coverart' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Artists can delete their own cover art"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'coverart' AND
  auth.uid()::text = (storage.foldername(name))[1]
);