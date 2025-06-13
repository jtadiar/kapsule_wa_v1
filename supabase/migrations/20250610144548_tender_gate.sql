/*
  # Fix User Data Integrity Issues

  1. Data Cleanup
    - Ensure all artist_profiles have corresponding entries in profiles table
    - Ensure all listener_profiles have corresponding entries in profiles table
    - Fix any mismatched IDs between tables
    - Clean up orphaned records

  2. Constraints
    - Add proper foreign key constraints to ensure data integrity
    - Update existing data to match proper relationships

  3. Security
    - Maintain existing RLS policies
    - Ensure data consistency across all user-related tables
*/

-- First, let's identify and fix any data inconsistencies

-- Ensure all artist_profiles have corresponding profiles entries
INSERT INTO profiles (id, username, artist_name, role, created_at)
SELECT 
  ap.id,
  ap.username,
  ap.artist_name,
  'artist' as role,
  ap.created_at
FROM artist_profiles ap
LEFT JOIN profiles p ON ap.id = p.id
WHERE p.id IS NULL;

-- Ensure all listener_profiles have corresponding profiles entries
INSERT INTO profiles (id, username, role, created_at)
SELECT 
  lp.id,
  lp.username,
  'listener' as role,
  lp.created_at
FROM listener_profiles lp
LEFT JOIN profiles p ON lp.id = p.id
WHERE p.id IS NULL;

-- Update profiles table to ensure correct roles
UPDATE profiles 
SET role = 'artist', artist_name = ap.artist_name
FROM artist_profiles ap
WHERE profiles.id = ap.id AND profiles.role != 'artist';

UPDATE profiles 
SET role = 'listener'
WHERE profiles.id IN (SELECT id FROM listener_profiles) 
AND profiles.role != 'listener';

-- Clean up any listener_profiles that should be artists
DELETE FROM listener_profiles 
WHERE id IN (
  SELECT lp.id 
  FROM listener_profiles lp
  INNER JOIN artist_profiles ap ON lp.id = ap.id
);

-- Clean up any artist_profiles that should be listeners
DELETE FROM artist_profiles 
WHERE id IN (
  SELECT ap.id 
  FROM artist_profiles ap
  INNER JOIN listener_profiles lp ON ap.id = lp.id
);

-- Update follows table to use correct artist_id references
UPDATE follows 
SET artist_id = ap.id
FROM artist_profiles ap
WHERE follows.artist_name = ap.artist_name 
AND (follows.artist_id IS NULL OR follows.artist_id != ap.id);

-- Remove any follows records that reference non-existent artists
DELETE FROM follows 
WHERE artist_name NOT IN (SELECT artist_name FROM artist_profiles WHERE artist_name IS NOT NULL);

-- Update tracks table to ensure proper artist_id references
UPDATE tracks 
SET artist_id = ap.id
FROM artist_profiles ap
WHERE tracks.artist = ap.artist_name 
AND (tracks.artist_id IS NULL OR tracks.artist_id != ap.id);

-- Add proper foreign key constraints if they don't exist
DO $$
BEGIN
  -- Add foreign key constraint for artist_profiles -> profiles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'artist_profiles_id_fkey' 
    AND table_name = 'artist_profiles'
  ) THEN
    ALTER TABLE artist_profiles 
    ADD CONSTRAINT artist_profiles_id_fkey 
    FOREIGN KEY (id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  -- Add foreign key constraint for listener_profiles -> profiles  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'listener_profiles_id_fkey' 
    AND table_name = 'listener_profiles'
  ) THEN
    ALTER TABLE listener_profiles 
    ADD CONSTRAINT listener_profiles_id_fkey 
    FOREIGN KEY (id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  -- Add foreign key constraint for follows -> artist_profiles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'follows_artist_id_fkey' 
    AND table_name = 'follows'
  ) THEN
    ALTER TABLE follows 
    ADD CONSTRAINT follows_artist_id_fkey 
    FOREIGN KEY (artist_id) REFERENCES artist_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_follows_artist_name ON follows(artist_name);
CREATE INDEX IF NOT EXISTS idx_tracks_artist_name ON tracks(artist);

-- Update the handle_new_user function to prevent future data inconsistencies
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Always create the base profile first
  INSERT INTO public.profiles (id, username, role, artist_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'role',
    NEW.raw_user_meta_data->>'artist_name'
  );

  -- Create role-specific profile
  IF NEW.raw_user_meta_data->>'role' = 'listener' THEN
    INSERT INTO public.listener_profiles (id, username)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'username');
  ELSIF NEW.raw_user_meta_data->>'role' = 'artist' THEN
    INSERT INTO public.artist_profiles (
      id, 
      username, 
      artist_name, 
      email,
      bio,
      instagram,
      website
    )
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'username',
      NEW.raw_user_meta_data->>'artist_name',
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'bio', ''),
      NEW.raw_user_meta_data->>'instagram',
      NEW.raw_user_meta_data->>'website'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;