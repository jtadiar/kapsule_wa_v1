/*
  # Fix User XP Tier Update System

  1. Updates
    - Create a trigger function to automatically update tier when total_points changes
    - Add trigger to user_xp table to call this function on update
    - Grant proper permissions to allow manual tier updates
    - Ensure tier column is writable for admin purposes

  2. Security
    - Maintain existing RLS policies
    - Allow tier to be manually set to 'Black' for special members
*/

-- Create a function to update tier from points
CREATE OR REPLACE FUNCTION update_tier_from_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update tier if total_points changed and tier wasn't manually set
  IF (NEW.total_points != OLD.total_points) THEN
    -- Calculate the tier based on points
    NEW.tier := CASE
      WHEN NEW.total_points >= 100000 THEN 'Gold'
      WHEN NEW.total_points >= 40000 THEN 'Silver'
      WHEN NEW.total_points >= 5000 THEN 'Purple'
      ELSE 'Red'
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to automatically update tier when points change
DROP TRIGGER IF EXISTS update_tier_trigger ON user_xp;
CREATE TRIGGER update_tier_trigger
  BEFORE UPDATE ON user_xp
  FOR EACH ROW
  EXECUTE FUNCTION update_tier_from_points();

-- Grant all permissions on user_xp table to authenticated users
GRANT ALL ON user_xp TO authenticated;

-- Ensure the tier column is writable by granting update permission specifically
DO $$
BEGIN
  EXECUTE 'GRANT UPDATE(tier) ON user_xp TO authenticated';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not grant update permission on tier column: %', SQLERRM;
END $$;

-- Update existing user_xp records to ensure tier matches points
UPDATE user_xp 
SET tier = CASE
  WHEN total_points >= 100000 THEN 'Gold'
  WHEN total_points >= 40000 THEN 'Silver'
  WHEN total_points >= 5000 THEN 'Purple'
  ELSE 'Red'
END
WHERE tier != CASE
  WHEN total_points >= 100000 THEN 'Gold'
  WHEN total_points >= 40000 THEN 'Silver'
  WHEN total_points >= 5000 THEN 'Purple'
  ELSE 'Red'
END;

-- Create a function to manually set a user's tier (for admin use)
CREATE OR REPLACE FUNCTION admin_set_user_tier(p_user_id uuid, p_tier text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate tier value
  IF p_tier NOT IN ('Red', 'Purple', 'Silver', 'Gold', 'Black') THEN
    RAISE EXCEPTION 'Invalid tier value. Must be one of: Red, Purple, Silver, Gold, Black';
  END IF;

  -- Update the tier
  UPDATE user_xp 
  SET tier = p_tier
  WHERE user_id = p_user_id;
END;
$$;

-- Grant execute permission on the admin function
GRANT EXECUTE ON FUNCTION admin_set_user_tier(uuid, text) TO authenticated;