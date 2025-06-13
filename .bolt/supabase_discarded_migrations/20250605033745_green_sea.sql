/*
  # Add cover art support to tracks table

  1. Changes
    - Add `cover_art_url` column to tracks table
*/

ALTER TABLE tracks
ADD COLUMN IF NOT EXISTS cover_art_url text;