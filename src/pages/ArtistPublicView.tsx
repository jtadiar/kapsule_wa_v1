import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, User, Play, UserPlus, UserCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { usePlayerStore } from '../store/playerStore';
import { useThemeStore, getThemeColors } from '../store/themeStore';

interface ArtistProfile {
  id: string;
  username: string;
  artist_name: string;
  bio: string;
  profile_image_url: string | null;
  gold_badge_applied: boolean;
  followers: number;
}

interface Track {
  id: string;
  title: string;
  artist: string;
  audiosrc: string;
  cover_art_url: string | null;
  genre: string | null;
  label: string | null;
  likes: number;
  uploaded_at: string;
  is_liked: boolean;
}

const ArtistPublicView: React.FC = () => {
  const { artistId } = useParams<{ artistId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { playTrack } = usePlayerStore();
  const { theme } = useThemeStore();
  const themeColors = getThemeColors(theme);
  
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  useEffect(() => {
    if (!user || !artistId) {
      navigate('/login');
      return;
    }
    fetchArtistProfile();
    fetchArtistTracks();
  }, [user, artistId, navigate]);

  const fetchArtistProfile = async () => {
    if (!artistId) return;

    try {
      // Get artist profile with current follower count
      const { data, error } = await supabase
        .from('artist_profiles')
        .select('id, username, artist_name, bio, profile_image_url, gold_badge_applied, followers')
        .eq('id', artistId)
        .single();

      if (error) throw error;
      
      setProfile(data);
      
      // Check follow status after profile is loaded
      if (data && data.artist_name) {
        await checkFollowStatus(data.artist_name);
      }
    } catch (error) {
      console.error('Error fetching artist profile:', error);
      navigate(-1);
    }
  };

  const fetchArtistTracks = async () => {
    if (!artistId || !user) return;

    try {
      // Get all tracks by this artist
      const { data: allTracks, error: tracksError } = await supabase
        .from('tracks')
        .select('id, title, artist, audiosrc, cover_art_url, genre, label, likes, uploaded_at')
        .eq('artist_id', artistId)
        .eq('is_deleted', false)
        .order('uploaded_at', { ascending: false });

      if (tracksError) throw tracksError;

      // Get user's liked tracks for this artist
      const { data: likedTracks, error: likesError } = await supabase
        .from('track_interactions')
        .select('track_id')
        .eq('user_id', user.id)
        .eq('interaction_type', 'like')
        .in('track_id', (allTracks || []).map(track => track.id));

      if (likesError) throw likesError;

      const likedTrackIds = new Set((likedTracks || []).map(item => item.track_id));

      // Mark tracks as liked/unliked
      const tracksWithLikeStatus = (allTracks || []).map(track => ({
        ...track,
        is_liked: likedTrackIds.has(track.id)
      }));

      setTracks(tracksWithLikeStatus);
    } catch (error) {
      console.error('Error fetching artist tracks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkFollowStatus = async (artistName?: string) => {
    if (!user) return;
    
    const nameToCheck = artistName || (profile?.artist_name || '');
    if (!nameToCheck) return;

    try {
      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('artist_name', nameToCheck)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setIsFollowing(!!data);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleFollow = async () => {
    if (!user || !profile || isFollowLoading) return;

    try {
      setIsFollowLoading(true);

      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('artist_name', profile.artist_name);

        if (error) throw error;

        setIsFollowing(false);
      } else {
        // Follow - use upsert to handle potential duplicates
        const { error } = await supabase
          .from('follows')
          .upsert({
            follower_id: user.id,
            artist_name: profile.artist_name,
            artist_id: profile.id
          }, {
            onConflict: 'follower_id,artist_name'
          });

        if (error) throw error;

        setIsFollowing(true);
      }

      // The database trigger will automatically update the follower count
      // Refresh the profile to get the updated count
      await fetchArtistProfile();

    } catch (error) {
      console.error('Error updating follow status:', error);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleTrackClick = (track: Track) => {
    if (track.is_liked) {
      playTrack(track);
    }
  };

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: themeColors.background }}>
        <div 
          className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2"
          style={{ borderColor: themeColors.primary }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: themeColors.background }}>
      {/* Header */}
      <div className="flex items-center justify-between p-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 hover:opacity-80 transition-opacity"
          style={{ color: themeColors.primary }}
        >
          <ChevronLeft size={24} />
          <span>Back</span>
        </button>
      </div>

      {/* Profile Section */}
      <div className="px-6 pb-8">
        <div className="text-center mb-8">
          <div className="relative w-32 h-32 mx-auto mb-6">
            {profile.profile_image_url ? (
              <img
                src={profile.profile_image_url}
                alt="Profile"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div 
                className="w-full h-full rounded-full flex items-center justify-center"
                style={{ backgroundColor: themeColors.cardBackground }}
              >
                <User size={48} style={{ color: themeColors.textSecondary }} />
              </div>
            )}
          </div>

          <h1 style={{ color: themeColors.text }} className="text-2xl font-bold mb-1 flex items-center justify-center gap-2">
            {profile.artist_name}
            {profile.gold_badge_applied && (
              <img
                src="https://fihjahpokzdqomytswpy.supabase.co/storage/v1/object/sign/assets/Vector%20(4).svg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82MmU3MzViMy00NTE1LTRlZDctODY0My0wMWY2NWQxZjk2ZWIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhc3NldHMvVmVjdG9yICg0KS5zdmciLCJpYXQiOjE3NDg5MzUxMzksImV4cCI6MjA2NDI5NTEzOX0.IWBy-InoQwnwl5Q77PFrw2zWNw3UxlJGLWa778U4a8c"
                alt="Verified"
                className="w-4 h-4"
              />
            )}
          </h1>
          <p style={{ color: themeColors.textSecondary }} className="mb-2">@{profile.username}</p>
          {profile.bio && (
            <p style={{ color: themeColors.text }} className="mb-4">{profile.bio}</p>
          )}
          <p style={{ color: themeColors.primary }} className="mb-6">{profile.followers} followers</p>

          {/* Follow Button */}
          <button
            onClick={handleFollow}
            disabled={isFollowLoading}
            className={`px-8 py-3 rounded-full font-medium flex items-center justify-center gap-2 mx-auto transition-all ${
              isFollowing 
                ? 'border-2 hover:opacity-80' 
                : 'text-white hover:opacity-90'
            } disabled:opacity-50`}
            style={{
              backgroundColor: isFollowing ? 'transparent' : themeColors.primary,
              borderColor: isFollowing ? themeColors.primary : 'transparent',
              color: isFollowing ? themeColors.primary : '#ffffff'
            }}
          >
            {isFollowLoading ? (
              <div 
                className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2"
                style={{ borderColor: isFollowing ? themeColors.primary : '#ffffff' }}
              />
            ) : isFollowing ? (
              <>
                <UserCheck size={20} />
                Following
              </>
            ) : (
              <>
                <UserPlus size={20} />
                Follow
              </>
            )}
          </button>
        </div>

        {/* Tracks Section */}
        <div>
          <h2 style={{ color: themeColors.text }} className="text-xl font-bold mb-4">Tracks</h2>
          
          {tracks.length === 0 ? (
            <div className="text-center py-8">
              <p style={{ color: themeColors.textSecondary }}>This artist hasn't uploaded any tracks yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tracks.map((track) => (
                <motion.div
                  key={track.id}
                  onClick={() => handleTrackClick(track)}
                  className={`rounded-xl p-4 transition-opacity ${
                    track.is_liked ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                  }`}
                  style={{ backgroundColor: themeColors.cardBackground }}
                  whileTap={track.is_liked ? { scale: 0.98 } : undefined}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center"
                      style={{ backgroundColor: themeColors.inputBackground }}
                    >
                      {track.is_liked && track.cover_art_url ? (
                        <img 
                          src={track.cover_art_url} 
                          alt={track.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Play size={20} style={{ color: themeColors.textSecondary }} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 style={{ color: themeColors.text }} className="font-medium truncate">
                        {track.is_liked ? track.title : '****'}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <p style={{ color: themeColors.textSecondary }} className="text-sm truncate">
                          {track.is_liked ? (track.genre || 'No genre') : '****'}
                        </p>
                        <span style={{ color: themeColors.textSecondary }}>•</span>
                        <p style={{ color: themeColors.textSecondary }} className="text-sm truncate">
                          {track.is_liked ? (track.label || 'Unsigned') : '****'}
                        </p>
                      </div>
                      <p style={{ color: themeColors.textSecondary }} className="text-xs mt-1">
                        {track.likes} likes
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArtistPublicView;