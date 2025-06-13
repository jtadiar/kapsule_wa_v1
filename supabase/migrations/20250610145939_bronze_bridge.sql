/*
  # Fix Follower Count Persistence

  1. Functions
    - `update_artist_follower_count`: Updates follower count based on actual follows
    - `handle_follow_change`: Trigger function to update counts on follow/unfollow

  2. Triggers
    - Automatically update follower counts when follows are added/removed

  3. Data Fixes
    - Sync all existing follower counts with actual follows data
*/

-- Function to update artist follower count based on actual follows
CREATE OR REPLACE FUNCTION update_artist_follower_count(artist_name_param TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  follower_count INTEGER;
  artist_profile_id UUID;
BEGIN
  -- Get the actual follower count from follows table
  SELECT COUNT(*) INTO follower_count
  FROM follows 
  WHERE artist_name = artist_name_param;
  
  -- Get the artist profile ID
  SELECT id INTO artist_profile_id
  FROM artist_profiles 
  WHERE artist_name = artist_name_param;
  
  -- Update the follower count in artist_profiles
  IF artist_profile_id IS NOT NULL THEN
    UPDATE artist_profiles 
    SET followers = follower_count
    WHERE id = artist_profile_id;
  END IF;
END;
$$;

-- Function to handle follow changes and update counts
CREATE OR REPLACE FUNCTION handle_follow_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Handle INSERT (new follow)
  IF TG_OP = 'INSERT' THEN
    PERFORM update_artist_follower_count(NEW.artist_name);
    RETURN NEW;
  END IF;
  
  -- Handle DELETE (unfollow)
  IF TG_OP = 'DELETE' THEN
    PERFORM update_artist_follower_count(OLD.artist_name);
    RETURN OLD;
  END IF;
  
  -- Handle UPDATE (if artist_name changes)
  IF TG_OP = 'UPDATE' THEN
    -- Update count for old artist name if it changed
    IF OLD.artist_name != NEW.artist_name THEN
      PERFORM update_artist_follower_count(OLD.artist_name);
    END IF;
    -- Update count for new artist name
    PERFORM update_artist_follower_count(NEW.artist_name);
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_follow_change ON follows;

-- Create trigger to automatically update follower counts
CREATE TRIGGER on_follow_change
  AFTER INSERT OR UPDATE OR DELETE ON follows
  FOR EACH ROW
  EXECUTE FUNCTION handle_follow_change();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_artist_follower_count(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION handle_follow_change() TO authenticated;

-- Sync all existing follower counts with actual follows data
UPDATE artist_profiles 
SET followers = (
  SELECT COUNT(*)
  FROM follows 
  WHERE follows.artist_name = artist_profiles.artist_name
)
WHERE artist_name IS NOT NULL;

-- Set follower count to 0 for artists with no follows
UPDATE artist_profiles 
SET followers = 0
WHERE followers IS NULL;