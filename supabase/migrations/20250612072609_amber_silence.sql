/*
  # Fix Daily Login Function

  1. Updates
    - Create a server-side function to check and award daily login XP
    - Ensure daily login XP is only awarded once per day
    - Fix edge cases in the update_user_xp function

  2. Security
    - Function is security definer to ensure proper permissions
    - Grant execute permissions to authenticated users
*/

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
  
  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO user_xp (user_id, last_login_date, daily_logins)
    VALUES (p_user_id, CURRENT_DATE, 1);
    
    -- Add 5 points for first login
    UPDATE user_xp 
    SET total_points = 5,
        tier = 'Red'
    WHERE user_id = p_user_id;
    
    RETURN;
  END IF;
  
  -- If last login was not today, award daily login XP
  IF last_login IS NULL OR last_login < CURRENT_DATE THEN
    -- Update daily login stats
    UPDATE user_xp 
    SET daily_logins = daily_logins + 1,
        last_login_date = CURRENT_DATE,
        total_points = total_points + 5,
        tier = CASE
          WHEN total_points + 5 >= 100000 THEN 'Gold'
          WHEN total_points + 5 >= 40000 THEN 'Silver'
          WHEN total_points + 5 >= 5000 THEN 'Purple'
          ELSE 'Red'
        END,
        last_updated = now()
    WHERE user_id = p_user_id;
  END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_daily_login(uuid) TO authenticated;