-- Create function to increment track likes
CREATE OR REPLACE FUNCTION increment_track_likes(p_track_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE tracks 
  SET likes = COALESCE(likes, 0) + 1
  WHERE id = p_track_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to increment track dislikes
CREATE OR REPLACE FUNCTION increment_track_dislikes(p_track_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE tracks 
  SET dislikes = COALESCE(dislikes, 0) + 1
  WHERE id = p_track_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to increment play count
CREATE OR REPLACE FUNCTION increment_track_play_count(p_track_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE tracks 
  SET play_count = COALESCE(play_count, 0) + 1
  WHERE id = p_track_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION increment_track_likes(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_track_dislikes(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_track_play_count(TEXT) TO authenticated;