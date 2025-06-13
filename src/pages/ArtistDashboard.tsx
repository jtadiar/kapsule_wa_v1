import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  RefreshCw, 
  Music, 
  Heart, 
  ThumbsDown, 
  Users, 
  Play, 
  Plus,
  TrendingUp,
  Award,
  Target,
  Zap,
  Star,
  CheckCircle,
  Lock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useThemeStore, getThemeColors } from '../store/themeStore';

interface ArtistStats {
  totalTracks: number;
  totalLikes: number;
  totalDislikes: number;
  totalLibraryAdds: number;
  totalPlays: number;
  followerCount: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  threshold: number;
  unlocked: boolean;
  category: 'likes' | 'tracks' | 'followers' | 'plays';
}

interface ArtistDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

const ArtistDashboard: React.FC<ArtistDashboardProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  const themeColors = getThemeColors(theme);
  
  const [stats, setStats] = useState<ArtistStats>({
    totalTracks: 0,
    totalLikes: 0,
    totalDislikes: 0,
    totalLibraryAdds: 0,
    totalPlays: 0,
    followerCount: 0
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Achievement definitions
  const achievements: Achievement[] = [
    {
      id: 'first_track',
      title: 'First Upload',
      description: 'Upload your first track',
      icon: Music,
      threshold: 1,
      unlocked: false,
      category: 'tracks'
    },
    {
      id: 'ten_tracks',
      title: '10 Tracks',
      description: 'Upload 10 tracks',
      icon: Target,
      threshold: 10,
      unlocked: false,
      category: 'tracks'
    },
    {
      id: 'hundred_likes',
      title: '100 Likes',
      description: 'Reach 100 total likes',
      icon: Heart,
      threshold: 100,
      unlocked: false,
      category: 'likes'
    },
    {
      id: 'thousand_likes',
      title: '1K Likes',
      description: 'Reach 1,000 total likes',
      icon: Star,
      threshold: 1000,
      unlocked: false,
      category: 'likes'
    },
    {
      id: 'hundred_followers',
      title: '100 Followers',
      description: 'Gain 100 followers',
      icon: Users,
      threshold: 100,
      unlocked: false,
      category: 'followers'
    },
    {
      id: 'thousand_plays',
      title: '1K Plays',
      description: 'Reach 1,000 total plays',
      icon: Play,
      threshold: 1000,
      unlocked: false,
      category: 'plays'
    }
  ];

  const fetchStats = async () => {
    if (!user) return;

    try {
      setError(null);
      
      // Fetch tracks data
      const { data: tracks, error: tracksError } = await supabase
        .from('tracks')
        .select('likes, dislikes, added_to_library, play_count')
        .eq('artist_id', user.id)
        .eq('is_deleted', false);

      if (tracksError) throw tracksError;

      // Calculate totals
      const totalTracks = tracks?.length || 0;
      const totalLikes = tracks?.reduce((sum, track) => sum + (track.likes || 0), 0) || 0;
      const totalDislikes = tracks?.reduce((sum, track) => sum + (track.dislikes || 0), 0) || 0;
      const totalLibraryAdds = tracks?.reduce((sum, track) => sum + (track.added_to_library || 0), 0) || 0;
      const totalPlays = tracks?.reduce((sum, track) => sum + (track.play_count || 0), 0) || 0;

      // Fetch follower count
      const { data: artistProfile } = await supabase
        .from('artist_profiles')
        .select('followers')
        .eq('id', user.id)
        .single();

      const followerCount = artistProfile?.followers || 0;

      setStats({
        totalTracks,
        totalLikes,
        totalDislikes,
        totalLibraryAdds,
        totalPlays,
        followerCount
      });

    } catch (error) {
      console.error('Error fetching stats:', error);
      setError('Unable to load stats. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      fetchStats();
    }
  }, [isOpen, user]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchStats();
  };

  // Calculate metrics
  const likeRatio = stats.totalLikes + stats.totalDislikes > 0 
    ? (stats.totalLikes / (stats.totalLikes + stats.totalDislikes)) * 100 
    : 0;

  const engagementRate = stats.totalPlays > 0 
    ? ((stats.totalLikes + stats.totalDislikes + stats.totalLibraryAdds) / stats.totalPlays) * 100 
    : 0;

  // Format numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // Check achievement unlocks
  const getUnlockedAchievements = (): Achievement[] => {
    return achievements.map(achievement => ({
      ...achievement,
      unlocked: (() => {
        switch (achievement.category) {
          case 'tracks': return stats.totalTracks >= achievement.threshold;
          case 'likes': return stats.totalLikes >= achievement.threshold;
          case 'followers': return stats.followerCount >= achievement.threshold;
          case 'plays': return stats.totalPlays >= achievement.threshold;
          default: return false;
        }
      })()
    }));
  };

  const unlockedAchievements = getUnlockedAchievements();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[60]"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="rounded-2xl w-full max-w-7xl h-[90vh] overflow-hidden"
          style={{ backgroundColor: themeColors.background }}
        >
          {/* Header */}
          <div 
            className="flex items-center justify-between p-6 border-b"
            style={{ borderColor: themeColors.cardBackground }}
          >
            <button
              onClick={onClose}
              style={{ color: themeColors.primary }}
              className="hover:opacity-80 transition-opacity"
            >
              <X size={24} />
            </button>
            
            <div className="text-center">
              <h1 style={{ color: themeColors.text }} className="text-2xl font-bold">Your Dashboard</h1>
              <p style={{ color: themeColors.textSecondary }} className="text-sm">Track your music journey</p>
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              style={{ color: themeColors.primary }}
              className="hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              <RefreshCw size={24} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="flex h-[calc(90vh-80px)]">
            {/* Left Column */}
            <div className="w-1/2 p-6 overflow-y-auto border-r" style={{ borderColor: themeColors.cardBackground }}>
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div 
                      className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 mx-auto mb-4"
                      style={{ borderColor: themeColors.primary }}
                    />
                    <p style={{ color: themeColors.textSecondary }}>Loading your stats...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                      style={{ backgroundColor: themeColors.cardBackground }}
                    >
                      <TrendingUp size={24} style={{ color: '#f59e0b' }} />
                    </div>
                    <h3 style={{ color: themeColors.text }} className="font-medium mb-2">Unable to load stats</h3>
                    <p style={{ color: themeColors.textSecondary }} className="text-sm mb-4">{error}</p>
                    <button
                      onClick={handleRefresh}
                      className="text-white px-4 py-2 rounded-lg font-medium"
                      style={{ backgroundColor: themeColors.primary }}
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Main Stats Grid */}
                  <div>
                    <h2 style={{ color: themeColors.text }} className="text-xl font-bold mb-4">Overview</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="rounded-xl p-6"
                        style={{ backgroundColor: themeColors.cardBackground }}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Music size={24} style={{ color: themeColors.primary }} />
                          <h3 style={{ color: themeColors.text }} className="font-medium">Tracks Uploaded</h3>
                        </div>
                        <p style={{ color: themeColors.text }} className="text-3xl font-bold mb-1">
                          {stats.totalTracks}
                        </p>
                        <p style={{ color: themeColors.textSecondary }} className="text-sm">
                          {stats.totalTracks === 1 ? 'track' : 'tracks'}
                        </p>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="rounded-xl p-6"
                        style={{ backgroundColor: themeColors.cardBackground }}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Heart size={24} style={{ color: '#ef4444' }} />
                          <h3 style={{ color: themeColors.text }} className="font-medium">Total Likes</h3>
                        </div>
                        <p style={{ color: themeColors.text }} className="text-3xl font-bold mb-1">
                          {formatNumber(stats.totalLikes)}
                        </p>
                        <p style={{ color: themeColors.textSecondary }} className="text-sm">
                          across all tracks
                        </p>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="rounded-xl p-6"
                        style={{ backgroundColor: themeColors.cardBackground }}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <ThumbsDown size={24} style={{ color: '#6b7280' }} />
                          <h3 style={{ color: themeColors.text }} className="font-medium">Total Dislikes</h3>
                        </div>
                        <p style={{ color: themeColors.text }} className="text-3xl font-bold mb-1">
                          {formatNumber(stats.totalDislikes)}
                        </p>
                        <p style={{ color: themeColors.textSecondary }} className="text-sm">
                          across all tracks
                        </p>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="rounded-xl p-6"
                        style={{ backgroundColor: themeColors.cardBackground }}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Users size={24} style={{ color: '#8b5cf6' }} />
                          <h3 style={{ color: themeColors.text }} className="font-medium">Followers</h3>
                        </div>
                        <p style={{ color: themeColors.text }} className="text-3xl font-bold mb-1">
                          {formatNumber(stats.followerCount)}
                        </p>
                        <p style={{ color: themeColors.textSecondary }} className="text-sm">
                          following you
                        </p>
                      </motion.div>
                    </div>
                  </div>

                  {/* Additional Stats */}
                  <div>
                    <h2 style={{ color: themeColors.text }} className="text-xl font-bold mb-4">Additional Stats</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="rounded-xl p-4 flex items-center gap-4"
                        style={{ backgroundColor: themeColors.cardBackground }}
                      >
                        <Play size={20} style={{ color: themeColors.primary }} />
                        <div>
                          <p style={{ color: themeColors.text }} className="font-medium">
                            {formatNumber(stats.totalPlays)}
                          </p>
                          <p style={{ color: themeColors.textSecondary }} className="text-sm">Total Plays</p>
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="rounded-xl p-4 flex items-center gap-4"
                        style={{ backgroundColor: themeColors.cardBackground }}
                      >
                        <Plus size={20} style={{ color: '#10b981' }} />
                        <div>
                          <p style={{ color: themeColors.text }} className="font-medium">
                            {formatNumber(stats.totalLibraryAdds)}
                          </p>
                          <p style={{ color: themeColors.textSecondary }} className="text-sm">Library Adds</p>
                        </div>
                      </motion.div>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div>
                    <h2 style={{ color: themeColors.text }} className="text-xl font-bold mb-4">Performance</h2>
                    <div className="space-y-4">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className="rounded-xl p-4"
                        style={{ backgroundColor: themeColors.cardBackground }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span style={{ color: themeColors.text }} className="font-medium">Like Ratio</span>
                          <span style={{ color: themeColors.primary }} className="font-bold">
                            {likeRatio.toFixed(1)}%
                          </span>
                        </div>
                        <div 
                          className="w-full h-2 rounded-full overflow-hidden"
                          style={{ backgroundColor: themeColors.inputBackground }}
                        >
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${likeRatio}%` }}
                            transition={{ delay: 0.8, duration: 1 }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: themeColors.primary }}
                          />
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        className="rounded-xl p-4"
                        style={{ backgroundColor: themeColors.cardBackground }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span style={{ color: themeColors.text }} className="font-medium">Engagement Rate</span>
                          <span style={{ color: themeColors.primary }} className="font-bold">
                            {engagementRate.toFixed(1)}%
                          </span>
                        </div>
                        <div 
                          className="w-full h-2 rounded-full overflow-hidden"
                          style={{ backgroundColor: themeColors.inputBackground }}
                        >
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(engagementRate, 20) * 5}%` }}
                            transition={{ delay: 0.9, duration: 1 }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: '#10b981' }}
                          />
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Achievements */}
            <div className="w-1/2 p-6 overflow-y-auto">
              <div>
                <h2 style={{ color: themeColors.text }} className="text-xl font-bold mb-4">Achievements</h2>
                <div className="grid grid-cols-2 gap-4">
                  {unlockedAchievements.map((achievement, index) => (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1 + index * 0.1 }}
                      className={`rounded-xl p-4 text-center ${
                        achievement.unlocked ? 'ring-2' : ''
                      }`}
                      style={{ 
                        backgroundColor: themeColors.cardBackground,
                        ringColor: achievement.unlocked ? themeColors.primary : 'transparent'
                      }}
                    >
                      <div className="flex justify-center mb-3">
                        {achievement.unlocked ? (
                          <div 
                            className="w-12 h-12 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: themeColors.primary }}
                          >
                            <achievement.icon size={20} className="text-white" />
                          </div>
                        ) : (
                          <div 
                            className="w-12 h-12 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: themeColors.inputBackground }}
                          >
                            <Lock size={20} style={{ color: themeColors.textSecondary }} />
                          </div>
                        )}
                      </div>
                      <h3 
                        style={{ color: achievement.unlocked ? themeColors.text : themeColors.textSecondary }} 
                        className="font-medium text-sm mb-1"
                      >
                        {achievement.title}
                      </h3>
                      <p 
                        style={{ color: themeColors.textSecondary }} 
                        className="text-xs"
                      >
                        {achievement.description}
                      </p>
                      {achievement.unlocked && (
                        <div className="mt-2">
                          <CheckCircle size={16} style={{ color: '#10b981' }} className="mx-auto" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ArtistDashboard;