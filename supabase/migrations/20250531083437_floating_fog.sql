-- Drop the existing trigger that's causing automatic listener profile creation
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;

-- Create a new function to handle user creation properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create listener profile if the user's role is 'listener'
  IF NEW.raw_user_meta_data->>'role' = 'listener' THEN
    INSERT INTO public.listener_profiles (id, username)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'username');
  END IF;

  -- Always create the base profile
  INSERT INTO public.profiles (id, username, role, artist_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'role',
    NEW.raw_user_meta_data->>'artist_name'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger with the updated function
CREATE TRIGGER handle_new_user
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Update existing profiles to ensure correct roles
UPDATE public.profiles
SET role = 'artist'
WHERE id IN (
  SELECT id FROM public.artist_profiles
);

-- Remove any incorrect listener profiles for artists
DELETE FROM public.listener_profiles
WHERE id IN (
  SELECT id FROM public.profiles WHERE role = 'artist'
);