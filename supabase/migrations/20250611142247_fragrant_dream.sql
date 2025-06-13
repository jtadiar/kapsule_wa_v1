-- Update the calculate_tier function with new tier thresholds
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

-- Update existing user_xp records to use new tier names
UPDATE user_xp 
SET tier = calculate_tier(total_points);

-- Update the default tier for new users
ALTER TABLE user_xp 
ALTER COLUMN tier SET DEFAULT 'Red';

-- Grant permissions to ensure the table is not read-only
GRANT ALL ON user_xp TO authenticated;

-- Check if the sequence exists before granting permissions
DO $$
DECLARE
  seq_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.sequences 
    WHERE sequence_schema = 'public' 
    AND sequence_name = 'user_xp_id_seq'
  ) INTO seq_exists;
  
  IF seq_exists THEN
    EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE user_xp_id_seq TO authenticated';
  END IF;
END $$;