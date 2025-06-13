/*
  # Fix User XP Tier Update System

  1. Updates
    - Fix the update_user_xp function to properly update tier based on points
    - Make tier column read & write for admin updates
    - Add a trigger to automatically update tier when points change
    - Add a function to manually set tier for admin use

  2. Security
    - Maintain existing RLS policies
    - Ensure tier column can be manually updated by admins
*/

-- Create a trigger function to automatically update tier when points change
CREATE OR REPLACE FUNCTION update_tier_from_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update tier if points changed and tier wasn't manually set
  IF NEW.total_points IS DISTINCT FROM OLD.total_points THEN
    -- Calculate tier based on points
    IF NEW.total_points >= 100000 THEN
      NEW.tier := 'Gold';
    ELSIF NEW.total_points >= 40000 THEN
      NEW.tier := 'Silver';
    ELSIF NEW.total_points >= 5000 THEN
      NEW.tier := 'Purple';
    ELSE
      NEW.tier := 'Red';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS update_tier_trigger ON user_xp;

-- Create the trigger to automatically update tier when points change
CREATE TRIGGER update_tier_trigger
BEFORE UPDATE ON user_xp
FOR EACH ROW
EXECUTE FUNCTION update_tier_from_points();

-- Create a function for admins to manually set tier
CREATE OR REPLACE FUNCTION admin_set_user_tier(
  p_user_id uuid,
  p_tier text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate tier
  IF p_tier NOT IN ('Red', 'Purple', 'Silver', 'Gold', 'Black') THEN
    RAISE EXCEPTION 'Invalid tier: %. Must be Red, Purple, Silver, Gold, or Black', p_tier;
  END IF;
  
  -- Update tier
  UPDATE user_xp
  SET tier = p_tier
  WHERE user_id = p_user_id;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION admin_set_user_tier(uuid, text) TO authenticated;

-- Fix any existing records where tier doesn't match points
UPDATE user_xp
SET tier = 
  CASE
    WHEN total_points >= 100000 THEN 'Gold'
    WHEN total_points >= 40000 THEN 'Silver'
    WHEN total_points >= 5000 THEN 'Purple'
    ELSE 'Red'
  END
WHERE tier != 
  CASE
    WHEN total_points >= 100000 THEN 'Gold'
    WHEN total_points >= 40000 THEN 'Silver'
    WHEN total_points >= 5000 THEN 'Purple'
    ELSE 'Red'
  END
  AND tier != 'Black'; -- Don't change Black tier (admin assigned)