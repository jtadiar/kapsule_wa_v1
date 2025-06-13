/*
  # Create User XP Tracking System

  1. New Tables
    - `user_xp`: Tracks user engagement and XP points
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `total_points` (integer, total accumulated XP)
      - `tier` (text, tier name based on points)
      - `swipes` (integer, sum of likes + dislikes)
      - `likes` (integer, number of liked tracks)
      - `dislikes` (integer, number of disliked tracks)
      - `added_to_library` (integer, tracks added to library)
      - `listening_time` (integer, total minutes of listening)
      - `daily_logins` (integer, total days logged in)
      - `last_login_date` (date, last login date for daily tracking)
      - `last_updated` (timestamp, for syncing)

  2. Security
    - Enables Row Level Security (RLS)
    - Policies for users to manage their own XP data

  3. Functions
    - Auto-create XP record for new users
    - Calculate tier based on total points
*/

-- Create user_xp table
CREATE TABLE IF NOT EXISTS user_xp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_points integer DEFAULT 0 NOT NULL,
  tier text DEFAULT 'Bronze' NOT NULL,
  swipes integer DEFAULT 0 NOT NULL,
  likes integer DEFAULT 0 NOT NULL,
  dislikes integer DEFAULT 0 NOT NULL,
  added_to_library integer DEFAULT 0 NOT NULL,
  listening_time integer DEFAULT 0 NOT NULL,
  daily_logins integer DEFAULT 0 NOT NULL,
  last_login_date date DEFAULT CURRENT_DATE,
  last_updated timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own XP data"
  ON user_xp
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own XP data"
  ON user_xp
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert their own XP data"
  ON user_xp
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_xp_user_id ON user_xp(user_id);
CREATE INDEX IF NOT EXISTS idx_user_xp_total_points ON user_xp(total_points);
CREATE INDEX IF NOT EXISTS idx_user_xp_tier ON user_xp(tier);

-- Function to calculate tier based on points
CREATE OR REPLACE FUNCTION calculate_tier(points integer)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  IF points >= 10000 THEN
    RETURN 'Diamond';
  ELSIF points >= 5000 THEN
    RETURN 'Platinum';
  ELSIF points >= 2500 THEN
    RETURN 'Gold';
  ELSIF points >= 1000 THEN
    RETURN 'Silver';
  ELSE
    RETURN 'Bronze';
  END IF;
END;
$$;

-- Function to update user XP
CREATE OR REPLACE FUNCTION update_user_xp(
  p_user_id uuid,
  p_event_type text,
  p_value integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_xp user_xp%ROWTYPE;
  points_to_add integer := 0;
  new_total_points integer;
  new_tier text;
BEGIN
  -- Get current XP data
  SELECT * INTO current_xp FROM user_xp WHERE user_id = p_user_id;
  
  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO user_xp (user_id) VALUES (p_user_id);
    SELECT * INTO current_xp FROM user_xp WHERE user_id = p_user_id;
  END IF;
  
  -- Calculate points based on event type
  CASE p_event_type
    WHEN 'like' THEN
      points_to_add := 1;
      UPDATE user_xp SET 
        likes = likes + 1,
        swipes = swipes + 1
      WHERE user_id = p_user_id;
    WHEN 'dislike' THEN
      points_to_add := 1;
      UPDATE user_xp SET 
        dislikes = dislikes + 1,
        swipes = swipes + 1
      WHERE user_id = p_user_id;
    WHEN 'add_to_library' THEN
      points_to_add := 2;
      UPDATE user_xp SET added_to_library = added_to_library + 1
      WHERE user_id = p_user_id;
    WHEN 'listening' THEN
      points_to_add := p_value; -- 1 point per minute
      UPDATE user_xp SET listening_time = listening_time + p_value
      WHERE user_id = p_user_id;
    WHEN 'daily_login' THEN
      points_to_add := 5;
      UPDATE user_xp SET 
        daily_logins = daily_logins + 1,
        last_login_date = CURRENT_DATE
      WHERE user_id = p_user_id;
  END CASE;
  
  -- Update total points and tier
  new_total_points := current_xp.total_points + points_to_add;
  new_tier := calculate_tier(new_total_points);
  
  UPDATE user_xp SET 
    total_points = new_total_points,
    tier = new_tier,
    last_updated = now()
  WHERE user_id = p_user_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_user_xp(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_tier(integer) TO authenticated;

-- Update the handle_new_user function to create XP record
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

  -- Create XP record for new user
  INSERT INTO public.user_xp (user_id, last_login_date)
  VALUES (NEW.id, CURRENT_DATE);

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

-- Create XP records for existing users who don't have them
INSERT INTO user_xp (user_id, last_login_date)
SELECT id, CURRENT_DATE
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_xp);