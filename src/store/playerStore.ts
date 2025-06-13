import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { updateUserXP } from '../lib/xp';
import { useAuthStore } from './authStore';

interface Track {
  id: string;
  title: string;
  artist: string;
  audiosrc: string;
}

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  audioElement: HTMLAudioElement | null;
  currentTime: number;
  duration: number;
  wasPlayingBeforePause: boolean; // Track if audio was playing before manual pause
  listeningTimeoutId: NodeJS.Timeout | null; // Track the timeout ID for listening time updates
  lastListeningUpdate: number | null; // Track when we last updated listening time
  accumulatedListeningTime: number; // Track accumulated listening time in seconds
  trackOrigin: 'player' | 'library' | 'charts' | null; // Track where the track was played from
  setTrack: (track: Track) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  initAudio: () => void;
  playTrack: (track: Track, origin: 'player' | 'library' | 'charts') => void;
  togglePlayPause: () => void;
  pauseForNavigation: () => void; // Pause for navigation without affecting resume state
  resumeFromNavigation: () => void; // Resume if was playing before navigation
  reset: () => void;
  updateTime: (time: number) => void;
  updateDuration: (duration: number) => void;
  updateListeningTime: () => void; // Function to update listening time
  clearListeningTimeout: () => void; // Function to clear listening timeout
}

// Create a single audio element instance
const audioElement = typeof Audio !== 'undefined' ? new Audio() : null;
if (audioElement) {
  audioElement.preload = 'auto';
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentTrack: null,
      isPlaying: false,
      audioElement,
      currentTime: 0,
      duration: 0,
      wasPlayingBeforePause: false,
      listeningTimeoutId: null,
      lastListeningUpdate: null,
      accumulatedListeningTime: 0,
      trackOrigin: null,

      initAudio: () => {
        const { currentTrack, currentTime, isPlaying } = get();
        const audio = get().audioElement;
        
        if (!audio || !currentTrack) return;

        // Only set src if it's different from current track
        if (audio.src !== currentTrack.audiosrc) {
          audio.src = currentTrack.audiosrc;
          audio.currentTime = currentTime;
        }

        // Sync playback state with store
        if (isPlaying && audio.paused) {
          audio.play().catch(console.error);
        } else if (!isPlaying && !audio.paused) {
          audio.pause();
        }
      },

      setTrack: (track) => set({ currentTrack: track }),
      
      setIsPlaying: (isPlaying) => {
        const audio = get().audioElement;
        if (!audio) return;

        if (isPlaying && audio.paused) {
          audio.play().catch(console.error);
          // Start tracking listening time when playing
          get().updateListeningTime();
        } else if (!isPlaying && !audio.paused) {
          audio.pause();
          // Clear listening timeout when paused
          get().clearListeningTimeout();
        }
        set({ isPlaying });
      },
      
      playTrack: (track, origin) => {
        const { currentTrack, clearListeningTimeout, trackOrigin } = get();
        const audio = get().audioElement;
        if (!audio) return;

        // Clear any existing listening timeout
        clearListeningTimeout();

        // If same track is already playing, just toggle play/pause
        if (currentTrack?.id === track.id && trackOrigin === origin) {
          get().togglePlayPause();
          return;
        }

        // Play new track - reset accumulated listening time for new track
        audio.src = track.audiosrc;
        audio.play().catch(console.error);
        set({ 
          currentTrack: track, 
          isPlaying: true, 
          currentTime: 0, 
          wasPlayingBeforePause: false,
          lastListeningUpdate: Date.now(),
          accumulatedListeningTime: 0,
          trackOrigin: origin
        });
        
        // Start tracking listening time for the new track
        get().updateListeningTime();
      },

      togglePlayPause: () => {
        const audio = get().audioElement;
        if (!audio) return;

        if (audio.paused) {
          audio.play().catch(console.error);
          set({ isPlaying: true, wasPlayingBeforePause: false });
          // Start tracking listening time when playing
          get().updateListeningTime();
        } else {
          audio.pause();
          set({ isPlaying: false, wasPlayingBeforePause: false });
          // Clear listening timeout when paused
          get().clearListeningTimeout();
        }
      },

      pauseForNavigation: () => {
        const { isPlaying } = get();
        const audio = get().audioElement;
        
        if (audio && isPlaying) {
          audio.pause();
          set({ isPlaying: false, wasPlayingBeforePause: true });
          // Clear listening timeout when paused for navigation
          get().clearListeningTimeout();
        }
      },

      resumeFromNavigation: () => {
        const { wasPlayingBeforePause, currentTrack } = get();
        const audio = get().audioElement;
        
        if (audio && wasPlayingBeforePause && currentTrack) {
          audio.play().catch(console.error);
          set({ isPlaying: true, wasPlayingBeforePause: false });
          // Resume tracking listening time
          get().updateListeningTime();
        }
      },

      updateTime: (time) => set({ currentTime: time }),
      
      updateDuration: (duration) => set({ duration }),

      // Function to update listening time
      updateListeningTime: () => {
        const { listeningTimeoutId, clearListeningTimeout, trackOrigin } = get();
        
        // Clear any existing timeout
        if (listeningTimeoutId) {
          clearListeningTimeout();
        }

        // Set the last update time if it's not set
        if (!get().lastListeningUpdate) {
          set({ lastListeningUpdate: Date.now() });
        }

        // Set a new timeout to update listening time every 30 seconds
        const timeoutId = setTimeout(() => {
          const { isPlaying, audioElement, lastListeningUpdate, accumulatedListeningTime, trackOrigin } = get();
          
          // Only update if still playing and we have a user
          if (isPlaying && audioElement && !audioElement.paused) {
            const user = useAuthStore.getState().user;
            
            if (user) {
              // Add 30 seconds to accumulated time
              const newAccumulatedTime = accumulatedListeningTime + 30;
              
              // Only award XP for tracks from charts or library (not player view)
              if (trackOrigin === 'charts' || trackOrigin === 'library') {
                // Check if we've accumulated a full minute (60 seconds)
                if (newAccumulatedTime >= 60) {
                  // Award 1 point for each full minute
                  const minutesToAward = Math.floor(newAccumulatedTime / 60);
                  updateUserXP(user.id, 'listening', minutesToAward);
                  console.log(`Updated listening time XP: +${minutesToAward} minutes`);
                  
                  // Keep the remainder seconds
                  set({ accumulatedListeningTime: newAccumulatedTime % 60 });
                } else {
                  // Just update accumulated time
                  set({ accumulatedListeningTime: newAccumulatedTime });
                }
              }
              
              // Update last listening update time
              set({ lastListeningUpdate: Date.now() });
              
              // Continue tracking if still playing
              get().updateListeningTime();
            }
          }
        }, 30000); // 30 seconds
        
        set({ listeningTimeoutId: timeoutId });
      },

      // Function to clear listening timeout
      clearListeningTimeout: () => {
        const { listeningTimeoutId } = get();
        if (listeningTimeoutId) {
          clearTimeout(listeningTimeoutId);
          set({ listeningTimeoutId: null });
        }
      },

      reset: () => {
        const audio = get().audioElement;
        const { clearListeningTimeout } = get();
        
        if (audio) {
          audio.pause();
          audio.src = '';
        }
        
        // Clear any listening timeout
        clearListeningTimeout();
        
        set({ 
          currentTrack: null, 
          isPlaying: false, 
          currentTime: 0,
          duration: 0,
          wasPlayingBeforePause: false,
          lastListeningUpdate: null,
          accumulatedListeningTime: 0,
          trackOrigin: null
        });
      },
    }),
    {
      name: 'player-storage',
      partialize: (state) => ({ 
        currentTrack: state.currentTrack,
        currentTime: state.currentTime,
        wasPlayingBeforePause: state.wasPlayingBeforePause,
        trackOrigin: state.trackOrigin
      }),
    }
  )
);