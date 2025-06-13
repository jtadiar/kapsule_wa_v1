-- Grant all permissions on user_xp table to authenticated users
GRANT ALL ON user_xp TO authenticated;

-- Grant usage on the user_xp_id_seq sequence to authenticated users
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
    EXECUTE 'GRANT USAGE ON SEQUENCE user_xp_id_seq TO authenticated';
  END IF;
END $$;

-- Ensure RLS policies are properly set
DO $$
BEGIN
  -- Drop existing policies to recreate them
  DROP POLICY IF EXISTS "Users can view their own XP data" ON user_xp;
  DROP POLICY IF EXISTS "Users can update their own XP data" ON user_xp;
  DROP POLICY IF EXISTS "Users can insert their own XP data" ON user_xp;
  
  -- Create policies with proper permissions
  CREATE POLICY "Users can view their own XP data"
    ON user_xp
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
    
  CREATE POLICY "Users can update their own XP data"
    ON user_xp
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
    
  CREATE POLICY "Users can insert their own XP data"
    ON user_xp
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());
    
  CREATE POLICY "Users can delete their own XP data"
    ON user_xp
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());
END $$;