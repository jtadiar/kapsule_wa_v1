/*
  # Fix Tier Update System

  1. Updates
    - Update the calculate_tier function with correct tier thresholds
    - Add function to get tier display names
    - Fix the update_user_xp function to properly update tier
    - Ensure all existing records have the correct tier based on points

  2. Security
    - Grant proper permissions to authenticated users
    - Recreate RLS policies with proper checks
*/

-- Update the calculate_tier function with correct tier thresholds
CREATE OR REPLACE FUNCTION calculate_tier(points integer)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  IF points >= 100000 THEN
    RETURN 'Gold';
  ELSIF points >= 40000 THEN
    RETURN 'Silver';
  ELSIF points >= 5000 THEN
    RETURN 'Purple';
  ELSE
    RETURN 'Red';
  END IF;
END;
$$;

-- Function to get tier display name
CREATE OR REPLACE FUNCTION get_tier_display_name(tier_name text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  CASE tier_name
    WHEN 'Red' THEN RETURN 'Community';
    WHEN 'Purple' THEN RETURN 'Pro';
    WHEN 'Silver' THEN RETURN 'Elite';
    WHEN 'Gold' THEN RETURN 'VIP';
    WHEN 'Black' THEN RETURN 'Black';
    ELSE RETURN 'Community';
  END CASE;
END;
$$;

-- Update the update_user_xp function to properly update tier
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

-- Ensure all users have proper permissions on the user_xp table
GRANT ALL ON user_xp TO authenticated;

-- Check if policies exist before trying to drop them
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_xp' AND policyname = 'Users can view their own XP data') THEN
    DROP POLICY "Users can view their own XP data" ON user_xp;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_xp' AND policyname = 'Users can update their own XP data') THEN
    DROP POLICY "Users can update their own XP data" ON user_xp;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_xp' AND policyname = 'Users can insert their own XP data') THEN
    DROP POLICY "Users can insert their own XP data" ON user_xp;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_xp' AND policyname = 'Users can delete their own XP data') THEN
    DROP POLICY "Users can delete their own XP data" ON user_xp;
  END IF;
  
  -- Create policies with proper permissions
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
    
  CREATE POLICY "Users can delete their own XP data"
    ON user_xp
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());
END $$;

-- Update existing user_xp records to use the new tier calculation
UPDATE user_xp 
SET tier = calculate_tier(total_points);

-- Create a function to manually update a user's tier based on their points
CREATE OR REPLACE FUNCTION refresh_user_tier(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_xp 
  SET tier = calculate_tier(total_points)
  WHERE user_id = p_user_id;
END;
$$;

-- Grant execute permission on the refresh function
GRANT EXECUTE ON FUNCTION refresh_user_tier(uuid) TO authenticated;