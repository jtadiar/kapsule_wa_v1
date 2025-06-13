import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Play, Pause, UserPlus, Plus, SkipForward } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Track {
  id: string;
  title: string;
  artist: string;
  audiosrc: string;
}

const DemoPlayer: React.FC = () => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showLikeCard, setShowLikeCard] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);

  const fetchRandomTrack = async (autoPlay = false) => {
    try {
      setIsLoading(true);
      
      // Get all tracks except the current one
      const { data: tracks, error } = await supabase
        .from('tracks')
        .select('id, title, artist, audiosrc')
        .eq('is_deleted', false)
        .not('id', 'eq', currentTrack?.id) // Exclude current track
        .limit(50); // Get multiple tracks to choose from

      if (error) throw error;
      
      if (!tracks || tracks.length === 0) {
        setCurrentTrack(null);
        setIsLoading(false);
        return;
      }

      // Select a random track from the results
      const randomIndex = Math.floor(Math.random() * tracks.length);
      const selectedTrack = tracks[randomIndex];
      
      // Reset audio and update state
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      
      setCurrentTrack(selectedTrack);
      setIsPlaying(autoPlay);
    } catch (error) {
      console.error('Error fetching track:', error);
      setCurrentTrack(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRandomTrack();
  }, []);

  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;

    const handleCanPlay = () => {
      setIsLoading(false);
      if (isPlaying) {
        audioRef.current?.play().catch(console.error);
      }
    };

    audioRef.current.addEventListener('canplay', handleCanPlay);
    return () => {
      audioRef.current?.removeEventListener('canplay', handleCanPlay);
    };
  }, [currentTrack, isPlaying]);

  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;

    if (isPlaying) {
      audioRef.current.play().catch(error => {
        console.error('Error playing audio:', error);
        setIsPlaying(false);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTrack]);

  const handlePlayPause = () => {
    if (isLoading || !currentTrack) return;
    setIsPlaying(!isPlaying);
  };

  const handleLike = () => {
    if (!currentTrack || isLoading) return;
    setShowLikeCard(true);
  };

  const handleDislike = () => {
    if (!currentTrack || isLoading) return;
    setShowLikeCard(false);
    fetchRandomTrack(true);
  };

  const handleNextTrack = () => {
    if (!currentTrack || isLoading) return;
    setShowLikeCard(false);
    fetchRandomTrack(true);
  };

  return (
    <div className="relative aspect-square bg-black rounded-3xl overflow-hidden">
      <audio
        ref={audioRef}
        src={currentTrack?.audiosrc}
        preload="auto"
      />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex items-center gap-8">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleDislike}
            disabled={isLoading}
            className="w-16 h-16 bg-[#ff383a] rounded-full flex items-center justify-center disabled:cursor-not-allowed"
          >
            <X size={24} color="white" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handlePlayPause}
            disabled={isLoading}
            className="w-24 h-24 bg-[#ff383a] rounded-full flex items-center justify-center disabled:cursor-not-allowed"
          >
            {isPlaying ? (
              <Pause size={36} color="white" />
            ) : (
              <Play size={36} color="white" />
            )}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleLike}
            disabled={isLoading}
            className="w-16 h-16 bg-[#ff383a] rounded-full flex items-center justify-center disabled:cursor-not-allowed"
          >
            <Heart size={24} color="white" />
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {showLikeCard && currentTrack && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-90"
          >
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-gray-800 rounded-full mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-1 text-white">{currentTrack.title}</h3>
              <p className="text-gray-400 mb-6">by {currentTrack.artist}</p>
              
              <button className="w-full bg-[#ff383a] text-white py-3 px-6 rounded-full mb-4 font-medium flex items-center justify-center gap-2">
                <UserPlus size={20} />
                Follow Artist
              </button>
              
              <div className="flex gap-4">
                <button className="flex-1 bg-[#ff383a] text-white py-3 px-6 rounded-full font-medium flex items-center justify-center gap-2">
                  <Plus size={20} />
                  Add
                </button>
                <button 
                  onClick={handleNextTrack}
                  className="flex-1 bg-[#ff383a] text-white py-3 px-6 rounded-full font-medium flex items-center justify-center gap-2"
                >
                  <SkipForward size={20} />
                  Next
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DemoPlayer;