import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Plus, Check, BarChart3, Music2, UserIcon, Pause } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { usePlayerStore } from '../store/playerStore';
import { useThemeStore, getThemeColors } from '../store/themeStore';

interface Track {
  id: string;
  title: string;
  artist: string;
  audiosrc: string;
  likes: number;
  added_to_library: boolean;
  uploaded_at: string;
  cover_art_url: string | null;
  genre: string | null;
  label: string | null;
  artist_id: string | null;
}

interface ArtistVerification {
  [artistId: string]: boolean;
}

const ChartView: React.FC = () => {
  const { user } = useAuthStore();
  const { currentTrack, playTrack, isPlaying, togglePlayPause } = usePlayerStore();
  const { theme } = useThemeStore();
  const themeColors = getThemeColors(theme);
  const navigate = useNavigate();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [likedTracks, setLikedTracks] = useState<string[]>([]);
  const [libraryTracks, setLibraryTracks] = useState<string[]>([]);
  const [artistVerifications, setArtistVerifications] = useState<ArtistVerification>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchTracks();
    fetchLikedTracks();
    fetchLibraryTracks();
  }, [user, navigate]);

  const fetchTracks = async () => {
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select('id, title, artist, audiosrc, likes, cover_art_url, genre, label, artist_id')
        .eq('is_deleted', false)
        .order('likes', { ascending: false })
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      
      const tracksData = data || [];
      setTracks(tracksData);
      
      // Fetch verification status for all artists
      await fetchArtistVerifications(tracksData);
    } catch (error) {
      console.error('Error fetching tracks:', error);
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

  const fetchLikedTracks = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('track_interactions')
        .select('track_id')
        .eq('user_id', user.id)
        .eq('interaction_type', 'like');

      if (error) throw error;
      setLikedTracks((data || []).map(item => item.track_id));
    } catch (error) {
      console.error('Error fetching liked tracks:', error);
    }
  };

  const fetchLibraryTracks = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('track_interactions')
        .select('track_id')
        .eq('user_id', user.id)
        .eq('added_to_library', true);

      if (error) throw error;
      setLibraryTracks((data || []).map(item => item.track_id));
    } catch (error) {
      console.error('Error fetching library tracks:', error);
    }
  };

  const handleAddToLibrary = async (trackId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('track_interactions')
        .upsert(
          {
            user_id: user.id,
            track_id: trackId,
            added_to_library: true,
            interaction_type: 'like'
          },
          {
            onConflict: 'user_id,track_id',
            ignoreDuplicates: false
          }
        );

      if (error) throw error;
      
      if (!libraryTracks.includes(trackId)) {
        setLibraryTracks(prev => [...prev, trackId]);
      }
    } catch (error) {
      console.error('Error adding track to library:', error);
    }
  };

  const handleArtistClick = (track: Track) => {
    if (track.artist_id && isTrackRevealed(track.id)) {
      navigate(`/artist/${track.artist_id}`);
    }
  };

  const isTrackRevealed = (trackId: string): boolean => {
    return likedTracks.includes(trackId);
  };

  const handleTrackClick = (track: Track) => {
    // If the track is already playing, toggle play/pause
    if (currentTrack?.id === track.id) {
      togglePlayPause();
    } else {
      // Otherwise play the new track with 'charts' origin
      playTrack(track, 'charts');
    }
  };

  const renderTrackInfo = (track: Track, index: number) => {
    const isRevealed = isTrackRevealed(track.id);
    const isInLibrary = libraryTracks.includes(track.id);
    const isCurrentlyPlaying = currentTrack?.id === track.id && isPlaying;
    const isVerified = track.artist_id ? artistVerifications[track.artist_id] : false;

    return (
      <div 
        key={track.id}
        className="rounded-xl px-4 py-3 mb-3 hover:opacity-80 transition-opacity cursor-pointer"
        style={{ backgroundColor: themeColors.cardBackground }}
        onClick={() => handleTrackClick(track)}
      >
        <div className="flex items-center">
          {/* Artwork */}
          <div 
            className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden mr-3 flex items-center justify-center"
            style={{ backgroundColor: themeColors.inputBackground }}
          >
            {isRevealed && track.cover_art_url ? (
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
          
          {/* Position - Smaller on mobile */}
          <div className="w-6 md:w-12 font-medium text-center mr-2 md:mr-4 flex-shrink-0" style={{ color: themeColors.primary }}>
            {index + 1}
          </div>
          
          {/* Track Info - More space on mobile */}
          <div className="flex-1 min-w-0 mr-2 md:mr-4">
            <h3 
              className={`font-medium truncate text-sm md:text-base ${isCurrentlyPlaying ? '' : ''}`} 
              style={{ color: isCurrentlyPlaying ? themeColors.primary : themeColors.text }}
            >
              {isRevealed ? track.title : '****'}
            </h3>
            <div className="flex items-center gap-2">
              <p 
                onClick={(e) => {
                  e.stopPropagation();
                  handleArtistClick(track);
                }}
                className={`text-xs md:text-sm truncate ${isRevealed && track.artist_id ? 'cursor-pointer hover:opacity-80' : ''}`} 
                style={{ color: themeColors.textSecondary }}
              >
                {isRevealed ? track.artist : '****'}
              </p>
              {isRevealed && isVerified && (
                <img
                  src="https://fihjahpokzdqomytswpy.supabase.co/storage/v1/object/sign/assets/Vector%20(4).svg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82MmU3MzViMy00NTE1LTRlZDctODY0My0wMWY2NWQxZjk2ZWIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhc3NldHMvVmVjdG9yICg0KS5zdmciLCJpYXQiOjE3NDg5MzUxMzksImV4cCI6MjA2NDI5NTEzOX0.IWBy-InoQwnwl5Q77PFrw2zWNw3UxlJGLWa778U4a8c"
                  alt="Verified"
                  className="w-3 h-3 flex-shrink-0"
                />
              )}
            </div>
          </div>
          
          {/* Genre - Hidden on mobile */}
          <div className="w-32 mr-4 hidden md:block">
            <p className="text-sm truncate" style={{ color: themeColors.text }}>
              {isRevealed ? (track.genre || 'No genre') : '****'}
            </p>
          </div>
          
          {/* Label - Hidden on mobile */}
          <div className="w-32 mr-4 hidden md:block">
            <p className="text-sm truncate" style={{ color: themeColors.text }}>
              {isRevealed ? (track.label || 'Unsigned') : '****'}
            </p>
          </div>
          
          {/* Score - Smaller on mobile */}
          <div className="w-8 md:w-16 text-center mr-2 md:mr-4 flex-shrink-0">
            <span className="font-medium text-xs md:text-sm" style={{ color: themeColors.primary }}>{track.likes}</span>
          </div>
          
          {/* Add to Library - Smaller on mobile */}
          <div className="w-6 md:w-8 flex justify-center flex-shrink-0">
            {isRevealed && !isInLibrary && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToLibrary(track.id);
                }}
                className="hover:opacity-80 transition-opacity"
                style={{ color: themeColors.primary }}
              >
                <Plus size={14} className="md:hidden" />
                <Plus size={16} className="hidden md:block" />
              </button>
            )}
            {isRevealed && isInLibrary && (
              <span style={{ color: themeColors.primary }}>
                <Check size={14} className="md:hidden" />
                <Check size={16} className="hidden md:block" />
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: themeColors.background }}>
      <div className="flex-1 pb-44">
        <div className="px-6 pt-14 pb-4">
          <h1 style={{ color: themeColors.text }} className="text-4xl font-bold mb-6 text-center">Charts</h1>
          
          {/* Header with proper alignment - responsive */}
          <div 
            className="flex items-center text-sm font-medium mb-4 px-4 py-2 rounded-lg"
            style={{ 
              color: themeColors.text,
              backgroundColor: themeColors.cardBackground
            }}
          >
            {/* No header for artwork */}
            <div className="w-12 mr-3"></div>
            {/* # header - Smaller on mobile */}
            <div className="w-6 md:w-12 text-center mr-2 md:mr-4">#</div>
            {/* Track header */}
            <div className="flex-1 min-w-0 mr-2 md:mr-4">Track</div>
            {/* Genre header - Hidden on mobile */}
            <div className="w-32 mr-4 hidden md:block">Genre</div>
            {/* Label header - Hidden on mobile */}
            <div className="w-32 mr-4 hidden md:block">Label</div>
            {/* Score header - Smaller on mobile */}
            <div className="w-8 md:w-16 text-center mr-2 md:mr-4">Score</div>
            {/* No header for add button */}
            <div className="w-6 md:w-8"></div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div 
                className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2"
                style={{ borderColor: themeColors.primary }}
              />
            </div>
          ) : tracks.length === 0 ? (
            <div className="text-center py-8">
              <p style={{ color: themeColors.textSecondary }} className="text-lg">No tracks available in the charts yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tracks.map((track, index) => renderTrackInfo(track, index))}
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
          <button className="flex flex-col items-center" style={{ color: themeColors.navSelected }}>
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

export default ChartView;