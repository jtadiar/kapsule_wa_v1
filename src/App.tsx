import React, { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { usePlayerStore } from './store/playerStore';
import { supabase } from './lib/supabase';
import { checkDailyLogin } from './lib/xp';
import ThemeProvider from './components/ThemeProvider';
import MiniPlayer from './components/MiniPlayer';
import PageTransition from './components/PageTransition';
import { AnimatePresence } from 'framer-motion';

// Lazy load pages for better performance
const Welcome = lazy(() => import('./pages/Welcome'));
const About = lazy(() => import('./pages/About'));
const HowItWorks = lazy(() => import('./pages/HowItWorks'));
const OurStory = lazy(() => import('./pages/OurStory'));
const Terms = lazy(() => import('./pages/Terms'));
const RegisterInterest = lazy(() => import('./pages/RegisterInterest'));
const AccountType = lazy(() => import('./pages/AccountType'));
const ListenerSignup = lazy(() => import('./pages/ListenerSignup'));
const ArtistSubscription = lazy(() => import('./pages/ArtistSubscription'));
const ArtistSignup = lazy(() => import('./pages/ArtistSignup'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PlayerView = lazy(() => import('./pages/PlayerView'));
const ChartView = lazy(() => import('./pages/ChartView'));
const LibraryView = lazy(() => import('./pages/LibraryView'));
const ListenerProfileView = lazy(() => import('./pages/ListenerProfileView'));
const ArtistProfileView = lazy(() => import('./pages/ArtistProfileView'));
// Import ArtistPublicView directly instead of lazy loading
import ArtistPublicView from './pages/ArtistPublicView';
const CreatorToolsView = lazy(() => import('./pages/CreatorToolsView'));
const SoundLab = lazy(() => import('./components/SoundLab'));
const VocalLab = lazy(() => import('./components/VocalLab'));
const TutorLab = lazy(() => import('./components/TutorLab'));

// Loading component
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
  </div>
);

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { user } = useAuthStore();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const AppContent = () => {
  const location = useLocation();
  const { user } = useAuthStore();
  const { 
    currentTrack, 
    isPlaying, 
    togglePlayPause, 
    initAudio, 
    audioElement, 
    reset,
    currentTime,
    duration,
    trackOrigin,
    updateTime,
    updateDuration
  } = usePlayerStore();
  const [likedTracks, setLikedTracks] = useState<string[]>([]);
  const [userRole, setUserRole] = useState<'artist' | 'listener' | null>(null);
  const [isLoadingRole, setIsLoadingRole] = useState(true);
  
  useEffect(() => {
    initAudio();

    if (audioElement) {
      const handleTimeUpdate = () => {
        updateTime(audioElement.currentTime);
      };

      const handleDurationChange = () => {
        updateDuration(audioElement.duration);
      };

      const handleEnded = () => {
        // If track was from player view, auto-load next track
        if (trackOrigin === 'player') {
          // Navigate to player to get next track
          window.location.href = '/player';
        }
      };

      audioElement.addEventListener('timeupdate', handleTimeUpdate);
      audioElement.addEventListener('durationchange', handleDurationChange);
      audioElement.addEventListener('ended', handleEnded);
      
      return () => {
        audioElement.removeEventListener('timeupdate', handleTimeUpdate);
        audioElement.removeEventListener('durationchange', handleDurationChange);
        audioElement.removeEventListener('ended', handleEnded);
      };
    }
  }, [initAudio, audioElement, updateTime, updateDuration, trackOrigin]);

  useEffect(() => {
    // Reset player when navigating to player view
    if (location.pathname === '/player' && trackOrigin !== 'player') {
      reset();
    }
  }, [location.pathname, reset, trackOrigin]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setIsLoadingRole(false);
        return;
      }

      try {
        // Check for daily login XP
        await checkDailyLogin(user.id);
        
        // First check if user has an artist profile
        const { data: artistProfile, error: artistError } = await supabase
          .from('artist_profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (artistError && artistError.code !== 'PGRST116') {
          console.error('Error checking artist profile:', artistError);
        }

        // If artist profile exists, user is an artist
        if (artistProfile) {
          setUserRole('artist');
        } else {
          // Check if user has a listener profile
          const { data: listenerProfile, error: listenerError } = await supabase
            .from('listener_profiles')
            .select('id')
            .eq('id', user.id)
            .maybeSingle();

          if (listenerError && listenerError.code !== 'PGRST116') {
            console.error('Error checking listener profile:', listenerError);
          }

          if (listenerProfile) {
            setUserRole('listener');
          } else {
            // Fallback: check the profiles table
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', user.id)
              .maybeSingle();

            if (profileError) {
              console.error('Error checking profile role:', profileError);
            }

            setUserRole(profile?.role as 'artist' | 'listener' || 'listener');
          }
        }

        // Fetch liked tracks
        const { data: likes } = await supabase
          .from('track_interactions')
          .select('track_id')
          .eq('user_id', user.id)
          .eq('interaction_type', 'like');

        if (likes) {
          setLikedTracks(likes.map(item => item.track_id));
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoadingRole(false);
      }
    };

    fetchUserData();
  }, [user]);
  
  // Determine when to show mini player
  const showMiniPlayer = currentTrack && 
    location.pathname !== '/player' &&
    (location.pathname === '/charts' || 
     location.pathname === '/library' || 
     location.pathname === '/profile' ||
     location.pathname.startsWith('/artist/'));

  const isTrackLiked = currentTrack ? likedTracks.includes(currentTrack.id) : false;

  // Show loading while determining user role
  if (user && isLoadingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={
            <Suspense fallback={<LoadingScreen />}>
              <PageTransition><Welcome /></PageTransition>
            </Suspense>
          } />
          <Route path="/about" element={
            <Suspense fallback={<LoadingScreen />}>
              <PageTransition><About /></PageTransition>
            </Suspense>
          } />
          <Route path="/how-it-works" element={
            <Suspense fallback={<LoadingScreen />}>
              <PageTransition><HowItWorks /></PageTransition>
            </Suspense>
          } />
          <Route path="/our-story" element={
            <Suspense fallback={<LoadingScreen />}>
              <PageTransition><OurStory /></PageTransition>
            </Suspense>
          } />
          <Route path="/terms" element={
            <Suspense fallback={<LoadingScreen />}>
              <PageTransition><Terms /></PageTransition>
            </Suspense>
          } />
          <Route path="/register-interest" element={
            <Suspense fallback={<LoadingScreen />}>
              <PageTransition><RegisterInterest /></PageTransition>
            </Suspense>
          } />
          <Route path="/account-type" element={
            <Suspense fallback={<LoadingScreen />}>
              <PageTransition><AccountType /></PageTransition>
            </Suspense>
          } />
          <Route path="/signup/listener" element={
            <Suspense fallback={<LoadingScreen />}>
              <PageTransition><ListenerSignup /></PageTransition>
            </Suspense>
          } />
          <Route path="/artist-subscription" element={
            <Suspense fallback={<LoadingScreen />}>
              <PageTransition><ArtistSubscription /></PageTransition>
            </Suspense>
          } />
          <Route path="/signup/artist" element={
            <Suspense fallback={<LoadingScreen />}>
              <PageTransition><ArtistSignup /></PageTransition>
            </Suspense>
          } />
          <Route path="/login" element={
            <Suspense fallback={<LoadingScreen />}>
              <PageTransition><Login /></PageTransition>
            </Suspense>
          } />
          <Route path="/dashboard" element={
            <PrivateRoute>
              <Suspense fallback={<LoadingScreen />}>
                <PageTransition><Dashboard /></PageTransition>
              </Suspense>
            </PrivateRoute>
          } />
          <Route path="/player" element={
            <PrivateRoute>
              <Suspense fallback={<LoadingScreen />}>
                <PageTransition><PlayerView /></PageTransition>
              </Suspense>
            </PrivateRoute>
          } />
          <Route path="/charts" element={
            <PrivateRoute>
              <Suspense fallback={<LoadingScreen />}>
                <PageTransition><ChartView /></PageTransition>
              </Suspense>
            </PrivateRoute>
          } />
          <Route path="/library" element={
            <PrivateRoute>
              <Suspense fallback={<LoadingScreen />}>
                <PageTransition><LibraryView /></PageTransition>
              </Suspense>
            </PrivateRoute>
          } />
          <Route path="/creator-tools" element={
            <PrivateRoute>
              <Suspense fallback={<LoadingScreen />}>
                <PageTransition><CreatorToolsView /></PageTransition>
              </Suspense>
            </PrivateRoute>
          } />
          <>
            <Route path="/creator-tools/soundlab" element={
              <PrivateRoute>
                <Suspense fallback={<LoadingScreen />}>
                  <PageTransition><SoundLab /></PageTransition>
                </Suspense>
              </PrivateRoute>
            } />
            <Route path="/creator-tools/vocallab" element={
              <PrivateRoute>
                <Suspense fallback={<LoadingScreen />}>
                  <PageTransition><VocalLab /></PageTransition>
                </Suspense>
              </PrivateRoute>
            } />
            <Route path="/creator-tools/tutorlab" element={
              <PrivateRoute>
                <Suspense fallback={<LoadingScreen />}>
                  <PageTransition><TutorLab /></PageTransition>
                </Suspense>
              </PrivateRoute>
            } />
          </>
          <Route path="/artist/:artistId" element={
            <PrivateRoute>
              {/* Use direct import instead of lazy loading */}
              <PageTransition><ArtistPublicView /></PageTransition>
            </PrivateRoute>
          } />
          <Route 
            path="/profile" 
            element={
              <PrivateRoute>
                <Suspense fallback={<LoadingScreen />}>
                  <PageTransition>
                    {userRole === 'artist' ? <ArtistProfileView /> : <ListenerProfileView />}
                  </PageTransition>
                </Suspense>
              </PrivateRoute>
            } 
          />
        </Routes>
      </AnimatePresence>

      {showMiniPlayer && (
        <MiniPlayer
          title={currentTrack.title}
          artist={currentTrack.artist}
          isPlaying={isPlaying}
          onPlayPause={togglePlayPause}
          currentTime={currentTime}
          duration={duration}
          isLiked={isTrackLiked}
        />
      )}
    </>
  );
};

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}

export default App;