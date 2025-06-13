import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Play, Pause, UserPlus, UserCheck, Plus, SkipForward, LogOut, User, BarChart3, Music2, UserIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useThemeStore, getThemeColors } from '../store/themeStore';
import { updateUserXP } from '../lib/xp';
import { usePlayerStore } from '../store/playerStore';

interface Track {
  id: string;
  title: string;
  artist: string;
  audiosrc: string;
  artist_id: string | null;
}

interface ArtistProfile {
  profile_image_url: string | null;
  followers: number;
  gold_badge_applied: boolean;
}

const PlayerView: React.FC = () => {
  const { user, signOut } = useAuthStore();
  const { theme } = useThemeStore();
  const themeColors = getThemeColors(theme);
  const navigate = useNavigate();
  
  // Use the global player store
  const { 
    currentTrack, 
    isPlaying, 
    playTrack, 
    togglePlayPause, 
    currentTime, 
    duration, 
    updateTime,
    updateDuration,
    trackOrigin
  } = usePlayerStore();
  
  const [localTrack, setLocalTrack] = useState<Track | null>(null);
  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null);
  const [userProfile, setUserProfile] = useState<{ profile_image_url: string | null } | null>(null);
  const [progress, setProgress] = useState(0);
  const [showLikeCard, setShowLikeCard] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isDisliking, setIsDisliking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [allTracksLiked, setAllTracksLiked] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const circleRef = useRef<SVGSVGElement>(null);
  const playStartTimeRef = useRef<number | null>(null);
  const likeTimeoutRef = useRef<number | null>(null);
  const requestRef = useRef<number | null>(null);
  const lastAngleRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    // Only fetch a random track if we're not already playing a track from player view
    if (!currentTrack || trackOrigin !== 'player') {
      fetchRandomTrack();
    } else {
      // Use the current track from the store
      setLocalTrack(currentTrack);
      setIsLoading(false);
    }
    
    fetchUserProfile();

    return () => {
      if (likeTimeoutRef.current) {
        clearTimeout(likeTimeoutRef.current);
      }
      
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    };
  }, [user, navigate, currentTrack, trackOrigin]);

  // Update progress based on currentTime and duration
  useEffect(() => {
    if (!isDragging && duration > 0) {
      const progressPercent = (currentTime / duration) * 100;
      setProgress(progressPercent);
    }
  }, [currentTime, duration, isDragging]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      if (profile.role === 'artist') {
        const { data: artistProfile } = await supabase
          .from('artist_profiles')
          .select('profile_image_url')
          .eq('id', user.id)
          .single();

        setUserProfile({ profile_image_url: artistProfile?.profile_image_url || null });
      } else if (profile.role === 'listener') {
        setUserProfile({ profile_image_url: null });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUserProfile({ profile_image_url: null });
    }
  };

  const fetchArtistProfile = async (artistId: string | null) => {
    if (!artistId) {
      setArtistProfile({
        profile_image_url: null,
        followers: 0,
        gold_badge_applied: false
      });
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('artist_profiles')
        .select('profile_image_url, followers, gold_badge_applied')
        .eq('id', artistId)
        .single();

      if (profile) {
        setArtistProfile(profile);
      } else {
        setArtistProfile({
          profile_image_url: null,
          followers: 0,
          gold_badge_applied: false
        });
      }
    } catch (error) {
      console.error('Error fetching artist profile:', error);
      setArtistProfile({
        profile_image_url: null,
        followers: 0,
        gold_badge_applied: false
      });
    }
  };

  const checkFollowStatus = async (artistName: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('artist_name', artistName)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setIsFollowing(!!data);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  const fetchRandomTrack = async (autoPlay = false) => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      setIsLoading(true);
      
      // First, get all tracks
      const { data: allTracks, error: allTracksError } = await supabase
        .from('tracks')
        .select('id, title, artist, audiosrc, artist_id')
        .eq('is_deleted', false);

      if (allTracksError) {
        console.error('Error fetching all tracks:', allTracksError);
        setLocalTrack(null);
        setIsLoading(false);
        return;
      }

      if (!allTracks || allTracks.length === 0) {
        setLocalTrack(null);
        setIsLoading(false);
        return;
      }

      // Get user's liked tracks
      const { data: likedTracks } = await supabase
        .from('track_interactions')
        .select('track_id')
        .eq('user_id', user.id)
        .eq('interaction_type', 'like');

      const likedTrackIds = (likedTracks || []).map(track => track.track_id);
      
      // Filter out liked tracks and current track
      let availableTracks = allTracks.filter(track => 
        !likedTrackIds.includes(track.id) && 
        track.id !== localTrack?.id
      );

      // If no tracks available (all liked), show completion message
      if (availableTracks.length === 0) {
        setAllTracksLiked(true);
        setLocalTrack(null);
        setIsLoading(false);
        return;
      }

      // Select random track from available tracks
      const randomIndex = Math.floor(Math.random() * availableTracks.length);
      const selectedTrack = availableTracks[randomIndex];
      
      setLocalTrack(selectedTrack);
      setShowLikeCard(false);
      setAllTracksLiked(false);
      
      // Play the track using the global player store
      if (autoPlay) {
        playTrack(selectedTrack, 'player');
      }
      
      playStartTimeRef.current = null;
      setProgress(0);
    } catch (error) {
      console.error('Error in fetchRandomTrack:', error);
      setLocalTrack(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayPause = () => {
    if (isLoading || !localTrack) return;
    
    // If we have a track but it's not in the global player, play it
    if (currentTrack?.id !== localTrack.id || trackOrigin !== 'player') {
      playTrack(localTrack, 'player');
    } else {
      togglePlayPause();
    }
  };

  const handleLike = async () => {
    if (!localTrack || !user || isLiking) return;

    try {
      setIsLiking(true);

      const { data: existingLike } = await supabase
        .from('track_interactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('track_id', localTrack.id)
        .eq('interaction_type', 'like')
        .maybeSingle();

      if (existingLike) {
        await fetchArtistProfile(localTrack.artist_id);
        if (localTrack.artist) {
          await checkFollowStatus(localTrack.artist);
        }
        setShowLikeCard(true);
        return;
      }

      await supabase
        .from('track_interactions')
        .delete()
        .match({
          user_id: user.id,
          track_id: localTrack.id,
          interaction_type: 'dislike'
        });

      const { error } = await supabase
        .from('track_interactions')
        .insert({
          user_id: user.id,
          track_id: localTrack.id,
          interaction_type: 'like'
        });

      if (error) throw error;
      
      // Update XP for liking a track
      await updateUserXP(user.id, 'like');
      
      await fetchArtistProfile(localTrack.artist_id);
      if (localTrack.artist) {
        await checkFollowStatus(localTrack.artist);
      }
      setShowLikeCard(true);
    } catch (error) {
      console.error('Error liking track:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDislike = async () => {
    if (!localTrack || !user || isDisliking) return;

    try {
      setIsDisliking(true);
      setShowLikeCard(false);

      await supabase
        .from('track_interactions')
        .delete()
        .match({
          user_id: user.id,
          track_id: localTrack.id,
          interaction_type: 'like'
        });

      const { error } = await supabase
        .from('track_interactions')
        .upsert({
          user_id: user.id,
          track_id: localTrack.id,
          interaction_type: 'dislike'
        }, {
          onConflict: 'user_id,track_id,interaction_type'
        });

      if (error) throw error;

      // Update XP for disliking a track
      await updateUserXP(user.id, 'dislike');

      await incrementPlayCount();
      await fetchRandomTrack(true);
    } catch (error) {
      console.error('Error disliking track:', error);
    } finally {
      setIsDisliking(false);
    }
  };

  const getAngleFromEvent = (e: MouseEvent | React.MouseEvent | TouchEvent | React.TouchEvent): number => {
    if (!circleRef.current) return 0;
    
    const rect = circleRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Get coordinates based on event type
    let clientX, clientY;
    
    if ('touches' in e) {
      // Touch event
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      // Mouse event
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = clientX - centerX;
    const y = clientY - centerY;
    
    // Calculate angle from top (12 o'clock position)
    let angle = Math.atan2(x, -y);
    if (angle < 0) angle += 2 * Math.PI;
    
    return angle;
  };

  const seekToAngle = (angle: number) => {
    if (!duration) return;
    
    // Convert angle to progress (0-1)
    const progressRatio = angle / (2 * Math.PI);
    const newTime = progressRatio * duration;
    
    // Update the global player's current time
    if (currentTrack?.id === localTrack?.id) {
      const audio = usePlayerStore.getState().audioElement;
      if (audio) {
        audio.currentTime = newTime;
        updateTime(newTime);
      }
    }
    
    setProgress(progressRatio * 100);
    lastAngleRef.current = angle;
  };

  const handleCircleMouseDown = (e: React.MouseEvent<SVGElement> | React.TouchEvent<SVGElement>) => {
    e.preventDefault();
    setIsDragging(true);
    
    const angle = getAngleFromEvent(e);
    lastAngleRef.current = angle;
    seekToAngle(angle);
    
    // Add the no-select class to prevent text selection during dragging
    document.body.classList.add('no-select');
  };

  const handleCircleTouchStart = (e: React.TouchEvent<SVGElement>) => {
    e.preventDefault();
    setIsDragging(true);
    
    const angle = getAngleFromEvent(e);
    lastAngleRef.current = angle;
    seekToAngle(angle);
    
    // Add the no-select class to prevent text selection during dragging
    document.body.classList.add('no-select');
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    // Use requestAnimationFrame for smoother updates
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    
    requestRef.current = requestAnimationFrame(() => {
      const angle = getAngleFromEvent(e);
      if (lastAngleRef.current !== angle) {
        seekToAngle(angle);
      }
    });
  }, [isDragging, duration]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    
    // Prevent scrolling while dragging
    e.preventDefault();
    
    // Use requestAnimationFrame for smoother updates
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    
    requestRef.current = requestAnimationFrame(() => {
      const angle = getAngleFromEvent(e);
      if (lastAngleRef.current !== angle) {
        seekToAngle(angle);
      }
    });
  }, [isDragging, duration]);

  const handleDragEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      
      // Remove the no-select class
      document.body.classList.remove('no-select');
      
      // Cancel any pending animation frame
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      
      lastAngleRef.current = null;
    }
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove, { passive: true });
      document.addEventListener('mouseup', handleDragEnd);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleDragEnd);
      document.addEventListener('touchcancel', handleDragEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleDragEnd);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleDragEnd);
        document.removeEventListener('touchcancel', handleDragEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleDragEnd, handleTouchMove]);

  const incrementPlayCount = async () => {
    if (!localTrack || !playStartTimeRef.current || !user) return;
    
    const playDuration = Date.now() - playStartTimeRef.current;
    if (playDuration >= 30000) {
      try {
        const { error } = await supabase.from('track_interactions').upsert({
          user_id: user.id,
          track_id: localTrack.id,
          interaction_type: 'view',
          views: 1
        }, {
          onConflict: 'user_id,track_id,interaction_type'
        });
        
        if (error) throw error;
      } catch (error) {
        console.error('Error incrementing play count:', error);
      }
    }
    playStartTimeRef.current = null;
  };

  const handleFollowArtist = async () => {
    if (!localTrack || !user || !artistProfile || isFollowLoading) return;

    try {
      setIsFollowLoading(true);

      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('artist_name', localTrack.artist);

        if (error) throw error;

        setIsFollowing(false);
        
        // Refresh artist profile to get updated follower count
        if (localTrack.artist_id) {
          const { data } = await supabase
            .from('artist_profiles')
            .select('followers')
            .eq('id', localTrack.artist_id)
            .single();
            
          if (data) {
            setArtistProfile(prev => prev ? { ...prev, followers: data.followers } : null);
          }
        }
      } else {
        // Follow - use upsert to handle potential duplicates
        const { error } = await supabase
          .from('follows')
          .upsert({
            follower_id: user.id,
            artist_name: localTrack.artist,
            artist_id: localTrack.artist_id
          }, {
            onConflict: 'follower_id,artist_name'
          });

        if (error) throw error;

        setIsFollowing(true);
        
        // Refresh artist profile to get updated follower count
        if (localTrack.artist_id) {
          const { data } = await supabase
            .from('artist_profiles')
            .select('followers')
            .eq('id', localTrack.artist_id)
            .single();
            
          if (data) {
            setArtistProfile(prev => prev ? { ...prev, followers: data.followers } : null);
          }
        }
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleArtistClick = () => {
    if (localTrack?.artist_id) {
      navigate(`/artist/${localTrack.artist_id}`);
    }
  };

  const handleNextTrack = async () => {
    setShowLikeCard(false);
    await fetchRandomTrack(true);
  };

  const handleAddToLibrary = async () => {
    if (!localTrack || !user) return;

    try {
      const { error } = await supabase
        .from('track_interactions')
        .upsert(
          {
            user_id: user.id,
            track_id: localTrack.id,
            added_to_library: true,
            interaction_type: 'like'
          },
          {
            onConflict: 'user_id,track_id',
            ignoreDuplicates: false
          }
        );

      if (error) throw error;
      
      // Update XP for adding to library
      await updateUserXP(user.id, 'add_to_library');
      
      setShowLikeCard(false);
      await fetchRandomTrack(true);
    } catch (error) {
      console.error('Error adding track to library:', error);
    }
  };

  // Calculate stroke dash array for circular progress
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Use either the local track or the current track from the store if it's from player view
  const displayTrack = (trackOrigin === 'player' && currentTrack) ? currentTrack : localTrack;

  return (
    <div className="flex flex-col h-screen hardware-accelerated" style={{ backgroundColor: themeColors.background }}>
      <div className="flex justify-between items-center px-6 pt-6 pb-4">
        <div className="w-8" />
        <img 
          src="https://fihjahpokzdqomytswpy.supabase.co/storage/v1/object/sign/assets/logo.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InN0b3JhZ2UtdXJsLXNpZ25pbmcta2V5XzYyZTczNWIzLTQ1MTUtNGVkNy04NjQzLTAxZjY1ZDFmOTZlYiJ9.eyJ1cmwiOiJhc3NldHMvbG9nby5wbmciLCJpYXQiOjE3NDg4MDA2NDEsImV4cCI6MjA2NDE2MDY0MX0.wNFNgarx6vPYOYs4sZiOAORnHU3qJCxZTRwEGIoA3MY" 
          alt="Kapsule" 
          className="h-8 cursor-pointer" 
          onClick={() => navigate('/')}
        />
        <button
          onClick={handleSignOut}
          className="hover:opacity-80 transition-opacity"
          style={{ color: themeColors.text }}
        >
          <LogOut size={24} />
        </button>
      </div>

      {/* Hidden audio element for local playback control */}
      <audio
        ref={audioRef}
        src={displayTrack?.audiosrc}
      />

      <div className="flex-1 flex flex-col items-center justify-center px-4">
        {allTracksLiked && (
          <div className="text-center">
            <h2 style={{ color: themeColors.text }} className="text-2xl font-bold mb-4">🎉 You've discovered everything!</h2>
            <p style={{ color: themeColors.textSecondary }} className="mb-6">
              You've liked all available tracks. Check out your library or explore the charts to revisit your discoveries.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => navigate('/library')}
                className="text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
                style={{ backgroundColor: themeColors.primary }}
              >
                View Library
              </button>
              <button
                onClick={() => navigate('/charts')}
                className="text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
                style={{ backgroundColor: themeColors.primary }}
              >
                View Charts
              </button>
            </div>
          </div>
        )}

        {!allTracksLiked && !displayTrack && !isLoading && (
          <div className="text-center">
            <h2 style={{ color: themeColors.text }} className="text-2xl font-bold mb-4">No tracks available</h2>
            <p style={{ color: themeColors.textSecondary }}>There are no tracks to discover right now.</p>
          </div>
        )}

        {displayTrack && !allTracksLiked && (
          <>
            {/* Circular Progress Indicator */}
            <div className="relative mb-8 hardware-accelerated">
              <svg
                ref={circleRef}
                width="280"
                height="280"
                className="transform -rotate-90 cursor-pointer select-none"
                onMouseDown={handleCircleMouseDown}
                onTouchStart={handleCircleTouchStart}
                style={{ touchAction: 'none' }}
              >
                {/* Background circle */}
                <circle
                  cx="140"
                  cy="140"
                  r={radius}
                  stroke={themeColors.cardBackground}
                  strokeWidth="8"
                  fill="none"
                />
                {/* Progress circle */}
                <circle
                  cx="140"
                  cy="140"
                  r={radius}
                  stroke={themeColors.primary}
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{
                    transition: isDragging ? 'none' : 'stroke-dashoffset 0.1s linear'
                  }}
                />
                {/* Center circle - matches background color */}
                <circle
                  cx="140"
                  cy="140"
                  r="100"
                  fill={themeColors.background}
                />
              </svg>
              
              {/* Playhead indicator */}
              <div 
                className="absolute w-4 h-4 bg-white rounded-full border-2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none hardware-accelerated"
                style={{ 
                  borderColor: themeColors.primary,
                  left: '50%',
                  top: '50%',
                  transform: `translate(-50%, -50%) rotate(${(progress / 100) * 360}deg) translateY(-${radius}px)`,
                  transition: isDragging ? 'none' : 'transform 0.1s linear'
                }}
              />
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-center space-x-8">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleDislike}
                disabled={isDisliking || isLoading}
                className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  (isDisliking || isLoading) ? 'opacity-50' : ''
                } hardware-accelerated`}
                style={{ backgroundColor: themeColors.primary }}
              >
                <X size={24} color="white" />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handlePlayPause}
                disabled={isLoading}
                className={`w-20 h-20 rounded-full flex items-center justify-center ${
                  isLoading ? 'opacity-50' : ''
                } hardware-accelerated`}
                style={{ backgroundColor: themeColors.primary }}
              >
                {isPlaying && currentTrack?.id === displayTrack?.id ? (
                  <Pause size={32} color="white" />
                ) : (
                  <Play size={32} color="white" />
                )}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleLike}
                disabled={isLiking || isLoading}
                className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  (isLiking || isLoading) ? 'opacity-50' : ''
                } hardware-accelerated`}
                style={{ backgroundColor: themeColors.primary }}
              >
                <Heart size={24} color="white" />
              </motion.button>
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {showLikeCard && displayTrack && artistProfile && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-90 z-50 hardware-accelerated"
          >
            <div className="p-8 rounded-2xl text-center w-[90%] max-w-sm" style={{ backgroundColor: themeColors.background }}>
              <div className="relative w-20 h-20 mx-auto mb-4">
                <div 
                  className="w-full h-full rounded-full overflow-hidden"
                  style={{ backgroundColor: themeColors.cardBackground }}
                >
                  {artistProfile.profile_image_url ? (
                    <img
                      src={artistProfile.profile_image_url}
                      alt={displayTrack.artist}
                      className="w-full h-full object-cover"
                      loading="eager"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User size={32} style={{ color: themeColors.textSecondary }} />
                    </div>
                  )}
                </div>
                {artistProfile.gold_badge_applied && (
                  <img
                    src="https://fihjahpokzdqomytswpy.supabase.co/storage/v1/object/sign/assets/Vector%20(4).svg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82MmU3MzViMy00NTE1LTRlZDctODY0My0wMWY2NWQxZjk2ZWIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhc3NldHMvVmVjdG9yICg0KS5zdmciLCJpYXQiOjE3NDg5MzUxMzksImV4cCI6MjA2NDI5NTEzOX0.IWBy-InoQwnwl5Q77PFrw2zWNw3UxlJGLWa778U4a8c"
                    alt="Verified"
                    className="absolute bottom-0 right-0 w-6 h-6 bg-black rounded-full p-1"
                    loading="eager"
                  />
                )}
              </div>
              <h2 style={{ color: themeColors.text }} className="text-2xl font-bold mb-2">{displayTrack.title}</h2>
              <p 
                onClick={handleArtistClick}
                style={{ color: themeColors.text }} 
                className="mb-4 cursor-pointer hover:opacity-80"
              >
                by {displayTrack.artist}
              </p>
              <p style={{ color: themeColors.text }} className="mb-6">{artistProfile.followers} followers</p>
              
              {displayTrack.artist_id && (
                <button 
                  onClick={handleFollowArtist}
                  disabled={isFollowLoading}
                  className={`w-full text-white py-3 px-6 rounded-full mb-4 font-medium flex items-center justify-center gap-2 ${
                    isFollowing ? 'bg-opacity-80' : ''
                  } disabled:opacity-50`}
                  style={{ backgroundColor: themeColors.primary }}
                >
                  {isFollowLoading ? (
                    <div 
                      className="animate-optimized-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"
                    />
                  ) : isFollowing ? (
                    <>
                      <UserCheck size={20} />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus size={20} />
                      Follow Artist
                    </>
                  )}
                </button>
              )}
              
              <div className="flex gap-4">
                <button 
                  onClick={handleAddToLibrary}
                  className="flex-1 text-white py-3 px-6 rounded-full font-medium flex items-center justify-center gap-2"
                  style={{ backgroundColor: themeColors.primary }}
                >
                  <Plus size={20} />
                  Add
                </button>
                <button 
                  onClick={handleNextTrack}
                  className="flex-1 text-white py-3 px-6 rounded-full font-medium flex items-center justify-center gap-2"
                  style={{ backgroundColor: themeColors.primary }}
                >
                  <SkipForward size={20} />
                  Next
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav 
        className="fixed bottom-0 left-0 right-0 bg-opacity-70 backdrop-blur-lg border-t hardware-accelerated"
        style={{ 
          backgroundColor: themeColors.background,
          borderColor: themeColors.cardBackground
        }}
      >
        <div className="flex justify-around py-4">
          <button className="flex flex-col items-center" style={{ color: themeColors.navSelected }}>
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

export default PlayerView;