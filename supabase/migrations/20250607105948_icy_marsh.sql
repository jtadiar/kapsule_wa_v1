/*
  # Create Subscribers Table for Interest Registration

  1. New Tables
    - `subscribers`: Stores user interest registrations
      - `id` (uuid, primary key)
      - `role` (text, either 'listener' or 'artist')
      - `name` (text, required)
      - `artist_name` (text, optional - only for artists)
      - `email` (text, required, unique)
      - `username` (text, optional)
      - `created_at` (timestamp)

  2. Security
    - No RLS needed as this is for public registration
    - Unique constraint on email to prevent duplicates
*/

CREATE TABLE IF NOT EXISTS subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('listener', 'artist')),
  name text NOT NULL,
  artist_name text,
  email text NOT NULL UNIQUE,
  username text,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster email lookups
CREATE INDEX idx_subscribers_email ON subscribers(email);
CREATE INDEX idx_subscribers_role ON subscribers(role);
CREATE INDEX idx_subscribers_created_at ON subscribers(created_at);