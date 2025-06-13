/*
  # Fix Library Count Tracking

  1. Updates
    - Update the track interaction trigger to increment added_to_library count on tracks table
    - Add function to handle library additions and removals
    - Ensure library count is properly tracked for all users including artists

  2. Functions
    - `increment_track_library_adds`: Increments library count on tracks table
    - `decrement_track_library_adds`: Decrements library count on tracks table
    - Updated `handle_track_interaction`: Now handles library additions
*/

-- Function to increment track library adds
CREATE OR REPLACE FUNCTION increment_track_library_adds(p_track_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tracks 
  SET added_to_library = COALESCE(added_to_library, 0) + 1
  WHERE id = p_track_id;
END;
$$;

-- Function to decrement track library adds
CREATE OR REPLACE FUNCTION decrement_track_library_adds(p_track_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tracks 
  SET added_to_library = GREATEST(COALESCE(added_to_library, 0) - 1, 0)
  WHERE id = p_track_id;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION increment_track_library_adds(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_track_library_adds(TEXT) TO authenticated;

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_track_interaction ON track_interactions;
DROP FUNCTION IF EXISTS handle_track_interaction();

-- Create updated trigger function to handle all interaction types including library
CREATE OR REPLACE FUNCTION handle_track_interaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Handle likes
  IF NEW.interaction_type = 'like' THEN
    PERFORM increment_track_likes(NEW.track_id);
  -- Handle dislikes  
  ELSIF NEW.interaction_type = 'dislike' THEN
    PERFORM increment_track_dislikes(NEW.track_id);
  END IF;
  
  -- Handle library additions (when added_to_library is set to true)
  IF NEW.added_to_library = true AND (OLD.added_to_library IS NULL OR OLD.added_to_library = false) THEN
    PERFORM increment_track_library_adds(NEW.track_id);
  -- Handle library removals (when added_to_library is set to false)
  ELSIF NEW.added_to_library = false AND OLD.added_to_library = true THEN
    PERFORM decrement_track_library_adds(NEW.track_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically update track counters on interaction changes
CREATE TRIGGER on_track_interaction
  AFTER INSERT OR UPDATE ON track_interactions
  FOR EACH ROW
  EXECUTE FUNCTION handle_track_interaction();

-- Update existing library counts to match current data
UPDATE tracks 
SET added_to_library = (
  SELECT COUNT(*)
  FROM track_interactions 
  WHERE track_interactions.track_id = tracks.id 
  AND track_interactions.added_to_library = true
)
WHERE id IN (
  SELECT DISTINCT track_id 
  FROM track_interactions 
  WHERE added_to_library = true
);