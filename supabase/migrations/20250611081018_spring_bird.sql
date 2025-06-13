/*
  # Fix User XP Tracking System Migration

  1. Tables
    - Create `user_xp` table if it doesn't exist
    - Add proper indexes and constraints

  2. Security
    - Enable RLS and create policies only if they don't exist
    - Policies for users to manage their own XP data

  3. Functions
    - Create XP calculation and update functions
    - Update user creation trigger to include XP records
*/

-- Create user_xp table only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_xp') THEN
    CREATE TABLE user_xp (
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
  END IF;
END $$;

-- Enable RLS only if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'user_xp' AND n.nspname = 'public' AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create policies only if they don't exist
DO $$
BEGIN
  -- Check and create SELECT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_xp' AND policyname = 'Users can view their own XP data'
  ) THEN
    CREATE POLICY "Users can view their own XP data"
      ON user_xp
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;

  -- Check and create UPDATE policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_xp' AND policyname = 'Users can update their own XP data'
  ) THEN
    CREATE POLICY "Users can update their own XP data"
      ON user_xp
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  -- Check and create INSERT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_xp' AND policyname = 'Users can insert their own XP data'
  ) THEN
    CREATE POLICY "Users can insert their own XP data"
      ON user_xp
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

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
  VALUES (NEW.id, CURRENT_DATE)
  ON CONFLICT (user_id) DO NOTHING;

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