/*
  # Fix Loyalty Card Tier System

  1. Updates
    - Update the calculate_tier function with correct tier thresholds
    - Rename tiers to match the new naming convention:
      - Red (0-5000 points) - Community member
      - Purple (5001-40000 points) - Pro member
      - Silver (40001-150000 points) - Elite member
      - Gold (150001+ points) - VIP member
      - Black (admin assigned) - Special tier

  2. Data Migration
    - Update all existing user_xp records to use the new tier names
*/

-- Update the calculate_tier function with new tier thresholds
CREATE OR REPLACE FUNCTION calculate_tier(points integer)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  IF points >= 150000 THEN
    RETURN 'Gold';
  ELSIF points >= 40001 THEN
    RETURN 'Silver';
  ELSIF points >= 5001 THEN
    RETURN 'Purple';
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