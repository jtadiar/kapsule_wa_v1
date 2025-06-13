-- Drop existing functions and triggers first
DROP TRIGGER IF EXISTS on_track_interaction ON track_interactions;
DROP FUNCTION IF EXISTS handle_track_interaction();
DROP FUNCTION IF EXISTS increment_track_likes(TEXT);
DROP FUNCTION IF EXISTS increment_track_dislikes(TEXT);
DROP FUNCTION IF EXISTS increment_track_play_count(TEXT);

-- Function to increment track likes
CREATE FUNCTION increment_track_likes(p_track_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tracks 
  SET likes = COALESCE(likes, 0) + 1
  WHERE id = p_track_id;
END;
$$;

-- Function to increment track dislikes
CREATE FUNCTION increment_track_dislikes(p_track_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tracks 
  SET dislikes = COALESCE(dislikes, 0) + 1
  WHERE id = p_track_id;
END;
$$;

-- Function to increment track play count
CREATE FUNCTION increment_track_play_count(p_track_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tracks 
  SET play_count = COALESCE(play_count, 0) + 1
  WHERE id = p_track_id;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION increment_track_likes(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_track_dislikes(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_track_play_count(TEXT) TO authenticated;

-- Create trigger function to update track counters on interaction
CREATE FUNCTION handle_track_interaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.interaction_type = 'like' THEN
    PERFORM increment_track_likes(NEW.track_id);
  ELSIF NEW.interaction_type = 'dislike' THEN
    PERFORM increment_track_dislikes(NEW.track_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to automatically update track counters
CREATE TRIGGER on_track_interaction
  AFTER INSERT ON track_interactions
  FOR EACH ROW
  EXECUTE FUNCTION handle_track_interaction();