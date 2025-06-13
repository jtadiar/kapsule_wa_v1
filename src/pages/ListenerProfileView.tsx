import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, User, ChevronRight, Play, Check, X, BarChart3, Music2, UserIcon, Settings, Award } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { usePlayerStore } from '../store/playerStore';
import { useThemeStore, getThemeColors } from '../store/themeStore';
import AccountSettingsModal from '../components/AccountSettingsModal';
import LoyaltyCardModal from '../components/LoyaltyCardModal';

interface Artist {
  follower_id: string;
  artist_name: string;
  followed_at: string;
  artist_id: string | null;
  profile_image_url?: string | null;
  gold_badge_applied?: boolean;
}

const ListenerProfileView: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const { reset: resetPlayer } = usePlayerStore();
  const { theme } = useThemeStore();
  const themeColors = getThemeColors(theme);
  const [username, setUsername] = useState('');
  const [followedArtists, setFollowedArtists] = useState<Artist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showLoyaltyCard, setShowLoyaltyCard] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchUserProfile();
    fetchFollowedArtists();
  }, [user, navigate]);

  const fetchUserProfile = async () => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      if (profile) {
        setUsername(profile.username || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchFollowedArtists = async () => {
    try {
      // First get the basic follow information
      const { data: follows, error } = await supabase
        .from('follows')
        .select('follower_id, artist_name, followed_at, artist_id')
        .eq('follower_id', user?.id)
        .order('followed_at', { ascending: false });

      if (error) throw error;
      
      // If there are followed artists, fetch their profile details
      if (follows && follows.length > 0) {
        const artistIds = follows
          .filter(follow => follow.artist_id)
          .map(follow => follow.artist_id);
        
        if (artistIds.length > 0) {
          const { data: artistProfiles, error: profilesError } = await supabase
            .from('artist_profiles')
            .select('id, profile_image_url, gold_badge_applied')
            .in('id', artistIds);
          
          if (profilesError) throw profilesError;
          
          // Create a map of artist profiles for easy lookup
          const profileMap = new Map();
          artistProfiles?.forEach(profile => {
            if (profile.id) {
              profileMap.set(profile.id, {
                profile_image_url: profile.profile_image_url,
                gold_badge_applied: profile.gold_badge_applied
              });
            }
          });
          
          // Merge the profile data with the follows data
          const enrichedFollows = follows.map(follow => {
            const profileData = follow.artist_id ? profileMap.get(follow.artist_id) : null;
            return {
              ...follow,
              profile_image_url: profileData?.profile_image_url || null,
              gold_badge_applied: profileData?.gold_badge_applied || false
            };
          });
          
          setFollowedArtists(enrichedFollows);
        } else {
          setFollowedArtists(follows);
        }
      } else {
        setFollowedArtists([]);
      }
    } catch (error) {
      console.error('Error fetching followed artists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleArtistClick = (artist: Artist) => {
    if (artist.artist_id && typeof artist.artist_id === 'string') {
      navigate(`/artist/${artist.artist_id}`);
    }
  };

  const handleSignOut = async () => {
    try {
      resetPlayer();
      await signOut();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Create a mock profile object for the AccountSettingsModal
  const mockProfile = {
    id: user?.id || '',
    username: username || '',
    artist_name: '', // Not applicable for listeners
    bio: '', // Not applicable for listeners
    profile_image_url: null,
    verification_status: 'none',
    gold_badge_applied: false
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: themeColors.background }}>
      <div className="flex justify-end px-6 pt-6">
        <button
          onClick={() => setShowAccountSettings(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl hover:opacity-80 transition-opacity"
          style={{ 
            backgroundColor: themeColors.cardBackground,
            color: themeColors.text
          }}
        >
          <Settings size={20} />
          <span>Account</span>
        </button>
      </div>

      <div className="flex-1 pb-32">
        <div className="px-6 pt-8">
          <h1 style={{ color: themeColors.text }} className="text-4xl font-bold mb-8 text-center">Profile</h1>

          <div className="flex justify-center mb-8">
            <button 
              onClick={() => setShowLoyaltyCard(true)} 
              className="py-3 px-6 font-medium rounded-xl flex items-center justify-center gap-2 hover:opacity-80 transition-opacity"
              style={{ 
                backgroundColor: themeColors.cardBackground,
                color: themeColors.text
              }}
            >
              <Award style={{ color: themeColors.primary }} size={20} />
              View Loyalty Card
            </button>
          </div>

          <div className="space-y-8">
            {/* Artists you follow Section */}
            <div className="rounded-xl p-4" style={{ backgroundColor: themeColors.cardBackground }}>
              <h2 style={{ color: themeColors.text }} className="font-medium mb-4">Artists you follow</h2>
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <div 
                    className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2"
                    style={{ borderColor: themeColors.primary }}
                  />
                </div>
              ) : followedArtists.length === 0 ? (
                <p style={{ color: themeColors.primary }} className="text-center py-4">You're not following any artists yet</p>
              ) : (
                <div className="space-y-3">
                  {followedArtists.map((artist, index) => (
                    <div 
                      key={typeof artist.artist_id === 'string' ? artist.artist_id : `artist-${index}`}
                      onClick={() => handleArtistClick(artist)}
                      className={`flex items-center py-2 ${
                        artist.artist_id ? 'cursor-pointer hover:opacity-80' : ''
                      }`}
                    >
                      <div className="relative w-10 h-10 mr-3 flex-shrink-0">
                        {artist.profile_image_url && typeof artist.profile_image_url === 'string' ? (
                          <img 
                            src={artist.profile_image_url} 
                            alt={typeof artist.artist_name === 'string' ? artist.artist_name : 'Artist'}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <div 
                            className="w-full h-full rounded-full flex items-center justify-center"
                            style={{ backgroundColor: themeColors.inputBackground }}
                          >
                            <User size={16} style={{ color: themeColors.textSecondary }} />
                          </div>
                        )}
                        {artist.gold_badge_applied && (
                          <img
                            src="https://fihjahpokzdqomytswpy.supabase.co/storage/v1/object/sign/assets/Vector%20(4).svg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82MmU3MzViMy00NTE1LTRlZDctODY0My0wMWY2NWQxZjk2ZWIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhc3NldHMvVmVjdG9yICg0KS5zdmciLCJpYXQiOjE3NDg5MzUxMzksImV4cCI6MjA2NDI5NTEzOX0.IWBy-InoQwnwl5Q77PFrw2zWNw3UxlJGLWa778U4a8c"
                            alt="Verified"
                            className="absolute bottom-0 right-0 w-3 h-3 bg-black rounded-full p-0.5"
                          />
                        )}
                      </div>
                      
                      <span style={{ color: themeColors.text }} className="flex-1">
                        {typeof artist.artist_name === 'string' ? artist.artist_name : 'Unknown Artist'}
                      </span>
                      
                      {artist.artist_id && (
                        <ChevronRight size={16} style={{ color: themeColors.textSecondary }} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <nav 
        className="fixed bottom-0 left-0 right-0 bg-opacity-70 backdrop-blur-lg border-t"
        style={{ 
          backgroundColor: themeColors.background,
          borderColor: themeColors.cardBackground
        }}
      >
        <div className="flex justify-around py-4">
          <button
            onClick={() => navigate('/player')}
            className="flex flex-col items-center opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: themeColors.navUnselected }}
          >
            <Play size={24} />
            <span className="text-xs mt-1">Discover</span>
          </button>
          <button
            onClick={() => navigate('/charts')}
            className="flex flex-col items-center opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: themeColors.navUnselected }}
          >
            <BarChart3 size={24} />
            <span className="text-xs mt-1">Charts</span>
          </button>
          <button
            onClick={() => navigate('/library')}
            className="flex flex-col items-center opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: themeColors.navUnselected }}
          >
            <Music2 size={24} />
            <span className="text-xs mt-1">Library</span>
          </button>
          <button className="flex flex-col items-center" style={{ color: themeColors.navSelected }}>
            <UserIcon size={24} />
            <span className="text-xs mt-1">Profile</span>
          </button>
        </div>
      </nav>

      {/* Account Settings Modal */}
      <AccountSettingsModal
        isOpen={showAccountSettings}
        onClose={() => setShowAccountSettings(false)}
        profile={mockProfile}
        onUpdate={fetchUserProfile}
        onSignOut={handleSignOut}
        isListener={true}
      />

      {/* Loyalty Card Modal */}
      {user && (
        <LoyaltyCardModal
          isOpen={showLoyaltyCard}
          onClose={() => setShowLoyaltyCard(false)}
          userId={user.id}
          username={username}
        />
      )}
    </div>
  );
};

export default ListenerProfileView;