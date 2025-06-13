/*
  # Fix update_user_xp RPC Function

  1. Updates
    - Modify the update_user_xp function to properly handle integer values
    - Ensure the function can be called from the client side
    - Add proper error handling and validation

  2. Security
    - Maintain security definer to ensure proper access control
    - Grant execute permissions to authenticated users
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS update_user_xp(uuid, text, integer);

-- Create the updated function with proper integer handling
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
  -- Validate input parameters
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;
  
  IF p_event_type IS NULL THEN
    RAISE EXCEPTION 'Event type cannot be null';
  END IF;
  
  IF p_event_type NOT IN ('like', 'dislike', 'add_to_library', 'listening', 'daily_login') THEN
    RAISE EXCEPTION 'Invalid event type: %', p_event_type;
  END IF;
  
  -- Ensure p_value is a valid integer
  IF p_value IS NULL OR p_value < 0 THEN
    p_value := 1; -- Default to 1 if null or negative
  END IF;
  
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
      points_to_add := p_value; -- Points based on minutes
      UPDATE user_xp SET listening_time = listening_time + p_value
      WHERE user_id = p_user_id;
    WHEN 'daily_login' THEN
      points_to_add := 5;
      
      -- Only update if last login was not today
      IF current_xp.last_login_date IS NULL OR current_xp.last_login_date < CURRENT_DATE THEN
        UPDATE user_xp SET 
          daily_logins = daily_logins + 1,
          last_login_date = CURRENT_DATE
        WHERE user_id = p_user_id;
      ELSE
        -- No points if already logged in today
        points_to_add := 0;
      END IF;
  END CASE;
  
  -- Update total points and tier
  new_total_points := current_xp.total_points + points_to_add;
  
  -- Calculate new tier based on points
  IF new_total_points >= 100000 THEN
    new_tier := 'Gold';
  ELSIF new_total_points >= 40000 THEN
    new_tier := 'Silver';
  ELSIF new_total_points >= 5000 THEN
    new_tier := 'Purple';
  ELSE
    new_tier := 'Red';
  END IF;
  
  UPDATE user_xp SET 
    total_points = new_total_points,
    tier = new_tier,
    last_updated = now()
  WHERE user_id = p_user_id;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION update_user_xp(uuid, text, integer) TO authenticated;

-- Create a function to check daily login and award XP
CREATE OR REPLACE FUNCTION check_daily_login(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  last_login date;
BEGIN
  -- Get the user's last login date
  SELECT last_login_date INTO last_login
  FROM user_xp
  WHERE user_id = p_user_id;
  
  -- If no record exists or last login was not today, award daily login XP
  IF last_login IS NULL OR last_login < CURRENT_DATE THEN
    PERFORM update_user_xp(p_user_id, 'daily_login');
  END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_daily_login(uuid) TO authenticated;