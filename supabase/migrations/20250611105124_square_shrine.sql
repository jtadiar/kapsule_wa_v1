/*
  # Update Tier Names

  1. Changes
    - Update the calculate_tier function to use new tier names: Red, Silver, Gold, Black
    - Update existing user_xp records to use new tier names
    - Maintain the same point thresholds but with new tier names

  2. New Tier Structure
    - Red (0-999 points) - Community member
    - Silver (1000-2499 points) - Pro member  
    - Gold (2500-9999 points) - Elite member
    - Black (10000+ points) - VIP member
*/

-- Update the calculate_tier function with new tier names
CREATE OR REPLACE FUNCTION calculate_tier(points integer)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  IF points >= 10000 THEN
    RETURN 'Black';
  ELSIF points >= 2500 THEN
    RETURN 'Gold';
  ELSIF points >= 1000 THEN
    RETURN 'Silver';
  ELSE
    RETURN 'Red';
  END IF;
END;
$$;

-- Update existing user_xp records to use new tier names
UPDATE user_xp 
SET tier = calculate_tier(total_points);

-- Update the default tier for new users
ALTER TABLE user_xp 
ALTER COLUMN tier SET DEFAULT 'Red';