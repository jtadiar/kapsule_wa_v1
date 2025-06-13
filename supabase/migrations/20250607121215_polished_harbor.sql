/*
  # Add genre column to subscribers table

  1. Changes
    - Add `genre` column to `subscribers` table
    - Column is nullable since it's only used for artists
    - Column type is text to store genre names

  2. Security
    - No RLS changes needed as table already has appropriate policies
*/

-- Add genre column to subscribers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscribers' AND column_name = 'genre'
  ) THEN
    ALTER TABLE subscribers ADD COLUMN genre text;
  END IF;
END $$;