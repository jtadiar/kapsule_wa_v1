/*
  # Add User Genre Memory Table

  1. New Tables
    - `user_genre_memory`: Stores user's preferred genre for TutorLab
      - `user_id` (uuid, primary key, references auth.users)
      - `genre` (text, nullable - stores the user's preferred genre)

  2. Security
    - No RLS needed as this is accessed via service role
    - Simple table for storing user preferences
*/

CREATE TABLE IF NOT EXISTS user_genre_memory (
  user_id uuid PRIMARY KEY,
  genre text
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_genre_memory_user_id ON user_genre_memory(user_id);