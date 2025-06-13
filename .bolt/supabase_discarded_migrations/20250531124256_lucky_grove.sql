-- Create function to increment track likes
CREATE OR REPLACE FUNCTION increment_track_likes(track_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tracks
  SET likes = likes + 1
  WHERE id = track_id;
  
  -- Also increment the added_to_library count since liking adds to library
  UPDATE tracks
  SET added_to_library = added_to_library + 1
  WHERE id = track_id;
END;
$$;

-- Create function to increment track dislikes
CREATE OR REPLACE FUNCTION increment_track_dislikes(track_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tracks
  SET dislikes = dislikes + 1
  WHERE id = track_id;
END;
$$;

-- Create function to increment play count
CREATE OR REPLACE FUNCTION increment_play_count(track_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tracks
  SET play_count = play_count + 1
  WHERE id = track_id;
END;
$$;

-- Create function to get a random track
CREATE OR REPLACE FUNCTION get_random_track()
RETURNS TABLE (
  id TEXT,
  title TEXT,
  artist TEXT,
  audiosrc TEXT,
  likes BIGINT,
  dislikes BIGINT,
  play_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id, title, artist, audiosrc, likes, dislikes, play_count
  FROM tracks
  WHERE is_deleted = false
  ORDER BY RANDOM()
  LIMIT 1;
$$;