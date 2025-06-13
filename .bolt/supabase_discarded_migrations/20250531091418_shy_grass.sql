-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_by_role();

-- Create improved function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user_by_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Create the base profile first
  INSERT INTO public.profiles (
    id,
    username,
    role,
    artist_name,
    bio,
    created_at
  ) VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    COALESCE(NEW.raw_user_meta_data->>'role', 'listener'),
    NEW.raw_user_meta_data->>'artist_name',
    NEW.raw_user_meta_data->>'bio',
    NOW()
  );

  -- Handle role-specific profile creation
  IF NEW.raw_user_meta_data->>'role' = 'artist' THEN
    -- Create artist profile
    INSERT INTO public.artist_profiles (
      id,
      username,
      artist_name,
      bio,
      email,
      instagram,
      website,
      subscription_tier,
      verification_status,
      followers,
      gold_badge_applied,
      created_at
    ) VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'username',
      NEW.raw_user_meta_data->>'artist_name',
      NEW.raw_user_meta_data->>'bio',
      NEW.email,
      NEW.raw_user_meta_data->>'instagram',
      NEW.raw_user_meta_data->>'website',
      'basic',
      'none',
      0,
      false,
      NOW()
    );
  ELSIF NEW.raw_user_meta_data->>'role' = 'listener' THEN
    -- Create listener profile
    INSERT INTO public.listener_profiles (
      id,
      username,
      bio,
      subscription_tier,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'username',
      NEW.raw_user_meta_data->>'bio',
      'free',
      NOW(),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger with the correct name
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_by_role();

-- Clean up any inconsistencies
UPDATE public.profiles SET role = 'artist' 
WHERE id IN (SELECT id FROM public.artist_profiles);

DELETE FROM public.listener_profiles 
WHERE id IN (SELECT id FROM public.profiles WHERE role = 'artist');