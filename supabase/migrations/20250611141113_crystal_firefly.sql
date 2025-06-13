-- Update the calculate_tier function with new tier thresholds
CREATE OR REPLACE FUNCTION calculate_tier(points integer)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  IF points >= 150001 THEN
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

-- Grant UPDATE permission to the user_xp table for authenticated users
GRANT UPDATE ON user_xp TO authenticated;

-- Grant SELECT permission to the user_xp table for authenticated users
GRANT SELECT ON user_xp TO authenticated;

-- Grant INSERT permission to the user_xp table for authenticated users
GRANT INSERT ON user_xp TO authenticated;