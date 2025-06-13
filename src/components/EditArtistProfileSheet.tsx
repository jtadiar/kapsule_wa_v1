import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface EditArtistProfileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  profile: {
    id: string;
    username: string;
    artist_name: string;
    bio: string;
    profile_image_url: string | null;
    verification_status: string;
    gold_badge_applied: boolean;
  };
  onUpdate: () => void;
}

const EditArtistProfileSheet: React.FC<EditArtistProfileSheetProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdate
}) => {
  const [artistName, setArtistName] = useState(profile.artist_name);
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [applyingVerification, setApplyingVerification] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setArtistName(profile.artist_name);
    setUsername(profile.username);
    setBio(profile.bio);
  }, [profile]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      setError('');
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('artist_profiles')
        .update({ profile_image_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      onUpdate();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!artistName.trim() || !username.trim()) {
      setError('Artist name and username are required');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .neq('id', profile.id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingUser) {
        setError('Username is already taken');
        return;
      }

      const { error: artistError } = await supabase
        .from('artist_profiles')
        .update({
          artist_name: artistName,
          username: username,
          bio: bio
        })
        .eq('id', profile.id);

      if (artistError) throw artistError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          username: username,
          artist_name: artistName
        })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      onUpdate();
      onClose();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyVerification = async () => {
    try {
      setApplyingVerification(true);
      setError('');

      const { error } = await supabase
        .from('artist_profiles')
        .update({ verification_status: 'pending' })
        .eq('id', profile.id);

      if (error) throw error;

      onUpdate();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setApplyingVerification(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 30 }}
          className="fixed inset-0 bg-[#0f0f0f] z-50"
        >
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-800">
            <button 
              onClick={onClose}
              className="text-[#ff383a] font-medium"
            >
              Cancel
            </button>
            <h2 className="text-white text-lg font-medium">Edit Profile</h2>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="text-[#ff383a] font-medium disabled:opacity-50"
            >
              Save
            </button>
          </div>

          <div className="p-6 space-y-6 overflow-y-auto scrollbar-hide pb-32">
            <div className="flex flex-col items-center">
              <div className="relative w-24 h-24 mb-2">
                {profile.profile_image_url ? (
                  <img
                    src={profile.profile_image_url}
                    alt="Profile"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gray-800" />
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-[#ff383a] font-medium"
              >
                Change Profile Photo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Artist Name
              </label>
              <input
                type="text"
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                className="w-full bg-[#1f1f1f] text-white p-4 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#ff383a]"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#1f1f1f] text-white p-4 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#ff383a]"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-[#1f1f1f] text-white p-4 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#ff383a] min-h-[100px]"
              />
            </div>

            <div className="bg-[#1f1f1f] p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium mb-1 flex items-center gap-2">
                    Verification
                    {profile.gold_badge_applied && (
                      <img
                        src="https://fihjahpokzdqomytswpy.supabase.co/storage/v1/object/sign/assets/Vector%20(4).svg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82MmU3MzViMy00NTE1LTRlZDctODY0My0wMWY2NWQxZjk2ZWIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhc3NldHMvVmVjdG9yICg0KS5zdmciLCJpYXQiOjE3NDg5MzUxMzksImV4cCI6MjA2NDI5NTEzOX0.IWBy-InoQwnwl5Q77PFrw2zWNw3UxlJGLWa778U4a8c"
                        alt="Verified"
                        className="w-4 h-4"
                      />
                    )}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {profile.gold_badge_applied ? (
                      'Your account is verified'
                    ) : profile.verification_status === 'pending' ? (
                      'Verification pending'
                    ) : (
                      'Apply for verification'
                    )}
                  </p>
                </div>
                {!profile.gold_badge_applied && profile.verification_status === 'none' && (
                  <button
                    onClick={handleApplyVerification}
                    disabled={applyingVerification}
                    className="bg-[#ff383a] text-white px-4 py-2 rounded-full text-sm font-medium disabled:opacity-50"
                  >
                    {applyingVerification ? 'Applying...' : 'Apply'}
                  </button>
                )}
              </div>
            </div>

            {error && (
              <p className="text-[#ff383a] text-sm text-center">{error}</p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EditArtistProfileSheet;