/*
  # Add SFX Presets Table

  1. New Tables
    - `sfx_presets`: Stores user's saved SFX board presets
      - Includes `user_id` (references `auth.users`)
      - Stores preset name and pad configurations
      - Implements RLS for user data protection

  2. Security
    - Enables Row Level Security (RLS)
    - Implements policies for authenticated users to manage their own presets
*/

CREATE TABLE IF NOT EXISTS sfx_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL,
  pads jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sfx_presets ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own presets
CREATE POLICY "Users can manage their own presets"
  ON sfx_presets
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Create index for faster lookups
CREATE INDEX idx_sfx_presets_user_id ON sfx_presets(user_id);