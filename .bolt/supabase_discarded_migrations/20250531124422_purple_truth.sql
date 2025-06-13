-- Function to increment track likes and create interaction record
CREATE OR REPLACE FUNCTION increment_track_likes(track_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the likes counter in tracks table
  UPDATE tracks 
  SET likes = likes + 1,
      added_to_library = added_to_library + 1
  WHERE id = track_id;

  -- Create or update the track interaction record
  INSERT INTO track_interactions (user_id, track_id, interaction_type, added_to_library)
  VALUES (auth.uid(), track_id, 'like', true)
  ON CONFLICT (user_id, track_id) 
  DO UPDATE SET 
    interaction_type = 'like',
    added_to_library = true,
    created_at = NOW();
END;
$$;

-- Function to increment track dislikes and create interaction record
CREATE OR REPLACE FUNCTION increment_track_dislikes(track_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the dislikes counter in tracks table
  UPDATE tracks 
  SET dislikes = dislikes + 1
  WHERE id = track_id;

  -- Create or update the track interaction record
  INSERT INTO track_interactions (user_id, track_id, interaction_type)
  VALUES (auth.uid(), track_id, 'dislike')
  ON CONFLICT (user_id, track_id) 
  DO UPDATE SET 
    interaction_type = 'dislike',
    created_at = NOW();
END;
$$;

-- Function to increment play count and update views
CREATE OR REPLACE FUNCTION increment_play_count(track_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the play count in tracks table
  UPDATE tracks 
  SET play_count = play_count + 1
  WHERE id = track_id;

  -- Update or create the track interaction record with view count
  INSERT INTO track_interactions (user_id, track_id, interaction_type, views)
  VALUES (auth.uid(), track_id, 'view', 1)
  ON CONFLICT (user_id, track_id) 
  DO UPDATE SET 
    views = track_interactions.views + 1;
END;
$$;