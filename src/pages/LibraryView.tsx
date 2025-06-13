import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Play, BarChart3, Music2, UserIcon, Pause } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { usePlayerStore } from '../store/playerStore';
import { useThemeStore, getThemeColors } from '../store/themeStore';

interface Track {
  id: string;
  title: string;
  artist: string;
  audiosrc: string;
  cover_art_url: string | null;
  artist_id: string | null;
}

interface ArtistVerification {
  [artistId: string]: boolean;
}

const LibraryView: React.FC = () => {
  const { user } = useAuthStore();
  const { currentTrack, playTrack, isPlaying, togglePlayPause } = usePlayerStore();
  const { theme } = useThemeStore();
  const themeColors = getThemeColors(theme);
  const navigate = useNavigate();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [artistVerifications, setArtistVerifications] = useState<ArtistVerification>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchLibraryTracks();
  }, [user, navigate]);

  const fetchLibraryTracks = async () => {
    try {
      const { data, error } = await supabase
        .from('track_interactions')
        .select(`
          track_id,
          tracks (
            id,
            title,
            artist,
            audiosrc,
            cover_art_url,
            artist_id
          )
        `)
        .eq('user_id', user?.id)
        .eq('added_to_library', true)
        .eq('interaction_type', 'like');

      if (error) throw error;

      const libraryTracks = data
        .map(item => item.tracks)
        .filter(track => track !== null) as Track[];

      setTracks(libraryTracks);
      
      // Fetch verification status for all artists
      await fetchArtistVerifications(libraryTracks);
    } catch (error) {
      console.error('Error fetching library tracks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchArtistVerifications = async (tracks: Track[]) => {
    try {
      // Get unique artist IDs
      const artistIds = [...new Set(tracks.map(track => track.artist_id).filter(Boolean))];
      
      if (artistIds.length === 0) return;

      const { data, error } = await supabase
        .from('artist_profiles')
        .select('id, gold_badge_applied')
        .in('id', artistIds);

      if (error) throw error;

      const verifications: ArtistVerification = {};
      data?.forEach(artist => {
        verifications[artist.id] = artist.gold_badge_applied || false;
      });

      setArtistVerifications(verifications);
    } catch (error) {
      console.error('Error fetching artist verifications:', error);
    }
  };

  const handleRemoveFromLibrary = async (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('track_interactions')
        .update({ added_to_library: false })
        .eq('user_id', user?.id)
        .eq('track_id', trackId);

      if (error) throw error;

      setTracks(tracks.filter(track => track.id !== trackId));
    } catch (error) {
      console.error('Error removing track from library:', error);
    }
  };

  const handleTrackClick = (track: Track) => {
    // If the track is already playing, toggle play/pause
    if (currentTrack?.id === track.id) {
      togglePlayPause();
    } else {
      // Otherwise play the new track with 'library' origin
      playTrack(track, 'library');
    }
  };

  const handleArtistClick = (track: Track, e: React.MouseEvent) => {
    e.stopPropagation();
    if (track.artist_id) {
      navigate(`/artist/${track.artist_id}`);
    }
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: themeColors.background }}>
      <div className="flex-1 pb-44">
        <div className="px-6 pt-14 pb-4">
          <h1 style={{ color: themeColors.text }} className="text-4xl font-bold mb-6 text-center">Library</h1>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div 
                className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2"
                style={{ borderColor: themeColors.primary }}
              />
            </div>
          ) : tracks.length === 0 ? (
            <div className="text-center py-12">
              <p style={{ color: themeColors.textSecondary }} className="text-lg">
                You haven't added any tracks to your library yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {tracks.map((track) => {
                const isVerified = track.artist_id ? artistVerifications[track.artist_id] : false;
                const isCurrentlyPlaying = currentTrack?.id === track.id && isPlaying;
                
                return (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex items-center gap-4 p-4 rounded-lg hover:opacity-80 transition-opacity cursor-pointer"
                    style={{ backgroundColor: themeColors.cardBackground }}
                    onClick={() => handleTrackClick(track)}
                  >
                    <div 
                      className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center"
                      style={{ backgroundColor: themeColors.inputBackground }}
                    >
                      {track.cover_art_url ? (
                        <img 
                          src={track.cover_art_url} 
                          alt={track.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        isCurrentlyPlaying ? (
                          <Pause size={20} style={{ color: themeColors.primary }} />
                        ) : (
                          <Play size={20} style={{ color: themeColors.textSecondary }} />
                        )
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 
                        className={`font-medium truncate ${isCurrentlyPlaying ? '' : ''}`} 
                        style={{ color: isCurrentlyPlaying ? themeColors.primary : themeColors.text }}
                      >
                        {track.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        <p 
                          onClick={(e) => handleArtistClick(track, e)}
                          className="truncate cursor-pointer hover:opacity-80" 
                          style={{ color: themeColors.textSecondary }}
                        >
                          {track.artist}
                        </p>
                        {isVerified && (
                          <img
                            src="https://fihjahpokzdqomytswpy.supabase.co/storage/v1/object/sign/assets/Vector%20(4).svg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82MmU3MzViMy00NTE1LTRlZDctODY0My0wMWY2NWQxZjk2ZWIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhc3NldHMvVmVjdG9yICg0KS5zdmciLCJpYXQiOjE3NDg5MzUxMzksImV4cCI6MjA2NDI5NTEzOX0.IWBy-InoQwnwl5Q77PFrw2zWNw3UxlJGLWa778U4a8c"
                            alt="Verified"
                            className="w-3 h-3 flex-shrink-0"
                          />
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => handleRemoveFromLibrary(track.id, e)}
                      className="hover:opacity-80 transition-opacity p-2"
                      style={{ color: themeColors.textSecondary }}
                    >
                      <Trash2 size={20} />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

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
          <button className="flex flex-col items-center" style={{ color: themeColors.navSelected }}>
            <Music2 size={24} />
            <span className="text-xs mt-1">Library</span>
          </button>
          <button 
            onClick={() => navigate('/profile')}
            className="flex flex-col items-center opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: themeColors.navUnselected }}
          >
            <UserIcon size={24} />
            <span className="text-xs mt-1">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default LibraryView;