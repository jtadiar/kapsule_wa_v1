import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Play, Pause } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useThemeStore, getThemeColors } from '../store/themeStore';
import { usePlayerStore } from '../store/playerStore';

interface MiniPlayerProps {
  title: string;
  artist: string;
  isPlaying: boolean;
  onPlayPause: () => void;
  currentTime: number;
  duration: number;
  isLiked: boolean;
}

const MiniPlayer: React.FC<MiniPlayerProps> = ({
  title,
  artist,
  isPlaying,
  onPlayPause,
  currentTime,
  duration,
  isLiked
}) => {
  const { theme } = useThemeStore();
  const themeColors = getThemeColors(theme);
  const navigate = useNavigate();
  const progressContainerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const { audioElement, updateTime } = usePlayerStore();
  const progressBarRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();

  // Memoize the progress update function to prevent unnecessary re-renders
  const updateProgressBar = useCallback(() => {
    if (duration > 0 && !isDragging) {
      const progressPercent = (currentTime / duration) * 100;
      setProgress(progressPercent);
    }
  }, [currentTime, duration, isDragging]);

  // Use requestAnimationFrame for smoother progress updates
  useEffect(() => {
    if (!isDragging) {
      updateProgressBar();
    }
  }, [currentTime, duration, isDragging, updateProgressBar]);

  const handleClick = () => {
    navigate('/player');
  };

  const handleProgressClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!progressContainerRef.current || !audioElement || duration <= 0) return;

    const rect = progressContainerRef.current.getBoundingClientRect();
    const clickPosition = e.clientX - rect.left;
    const containerWidth = rect.width;
    const percentage = (clickPosition / containerWidth) * 100;
    const newTime = (percentage / 100) * duration;

    // Update audio element time
    audioElement.currentTime = newTime;
    updateTime(newTime);
    setProgress(percentage);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    handleProgressClick(e);
    
    // Add the no-select class to prevent text selection during dragging
    document.body.classList.add('no-select');
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    
    if (!progressContainerRef.current || !audioElement || duration <= 0) return;
    
    const rect = progressContainerRef.current.getBoundingClientRect();
    const touchPosition = e.touches[0].clientX - rect.left;
    const containerWidth = rect.width;
    const percentage = Math.max(0, Math.min(100, (touchPosition / containerWidth) * 100));
    const newTime = (percentage / 100) * duration;
    
    // Update audio element time
    audioElement.currentTime = newTime;
    updateTime(newTime);
    setProgress(percentage);
    
    // Add the no-select class to prevent text selection during dragging
    document.body.classList.add('no-select');
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !progressContainerRef.current || !audioElement || duration <= 0) return;

    const rect = progressContainerRef.current.getBoundingClientRect();
    const movePosition = e.clientX - rect.left;
    const containerWidth = rect.width;
    const percentage = Math.max(0, Math.min(100, (movePosition / containerWidth) * 100));
    
    // Only update the visual progress during dragging
    setProgress(percentage);
    
    // Throttle the actual audio updates for better performance
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    
    requestRef.current = requestAnimationFrame(() => {
      const newTime = (percentage / 100) * duration;
      audioElement.currentTime = newTime;
      updateTime(newTime);
    });
  }, [isDragging, audioElement, duration, updateTime]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !progressContainerRef.current || !audioElement || duration <= 0) return;

    const rect = progressContainerRef.current.getBoundingClientRect();
    const touchPosition = e.touches[0].clientX - rect.left;
    const containerWidth = rect.width;
    const percentage = Math.max(0, Math.min(100, (touchPosition / containerWidth) * 100));
    
    // Only update the visual progress during dragging
    setProgress(percentage);
    
    // Throttle the actual audio updates for better performance
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    
    requestRef.current = requestAnimationFrame(() => {
      const newTime = (percentage / 100) * duration;
      audioElement.currentTime = newTime;
      updateTime(newTime);
    });
  }, [isDragging, audioElement, duration, updateTime]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      
      // Remove the no-select class
      document.body.classList.remove('no-select');
      
      // Cancel any pending animation frame
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = undefined;
      }
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      
      // Remove the no-select class
      document.body.classList.remove('no-select');
      
      // Cancel any pending animation frame
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = undefined;
      }
    }
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove, { passive: true });
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: true });
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Clean up any animation frames on unmount
  useEffect(() => {
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  return (
    <div 
      className="fixed bottom-[84px] left-4 right-4 rounded-xl shadow-lg z-50 overflow-hidden hardware-accelerated"
      style={{ backgroundColor: themeColors.primary }}
    >
      {/* Progress bar container with proper padding to respect rounded corners */}
      <div className="px-2 pt-2">
        <div 
          ref={progressContainerRef}
          className="relative w-full h-2 bg-black bg-opacity-20 cursor-pointer rounded-full overflow-hidden"
          onClick={handleProgressClick}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div 
            ref={progressBarRef}
            className="absolute top-0 left-0 h-full rounded-full transition-[width] duration-100 ease-linear"
            style={{ 
              width: `${progress}%`,
              backgroundColor: 'rgba(255, 255, 255, 0.5)',
              transition: isDragging ? 'none' : 'width 0.1s linear'
            }}
          />
        </div>
      </div>
      
      <div className="py-4 px-6 flex items-center justify-between cursor-pointer" onClick={handleClick}>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-medium truncate">
            {isLiked ? title : '****'}
          </h3>
          <p className="text-gray-200 text-sm truncate">
            {isLiked ? artist : '****'}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlayPause();
          }}
          className="text-white ml-4 flex-shrink-0 hover:opacity-80 transition-opacity"
        >
          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </button>
      </div>
    </div>
  );
};

export default React.memo(MiniPlayer);