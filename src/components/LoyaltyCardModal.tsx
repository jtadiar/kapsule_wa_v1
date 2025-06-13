import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, QrCode, TrendingUp, Clock, Heart, Plus, Zap } from 'lucide-react';
import { useThemeStore, getThemeColors } from '../store/themeStore';
import { getUserXP, UserXP, getTierGradient, getTierColor, getTierDisplayName } from '../lib/xp';

interface LoyaltyCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  username: string;
}

const LoyaltyCardModal: React.FC<LoyaltyCardModalProps> = ({
  isOpen,
  onClose,
  userId,
  username
}) => {
  const { theme } = useThemeStore();
  const themeColors = getThemeColors(theme);
  const [userXP, setUserXP] = useState<UserXP | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Prefetch XP data when component mounts, not just when modal opens
  useEffect(() => {
    if (userId) {
      fetchUserXP();
    }
  }, [userId]);

  const fetchUserXP = async () => {
    try {
      setIsLoading(true);
      const xpData = await getUserXP(userId);
      setUserXP(xpData);
    } catch (error) {
      console.error('Error fetching user XP:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const nextTierInfo = useMemo(() => {
    if (!userXP) return null;
    
    const tiers = [
      { name: 'Red', points: 0, displayName: 'Community' },
      { name: 'Purple', points: 5000, displayName: 'Pro' },
      { name: 'Silver', points: 40000, displayName: 'Elite' },
      { name: 'Gold', points: 100000, displayName: 'VIP' }
    ];

    const currentTierIndex = tiers.findIndex(tier => tier.name.toLowerCase() === userXP.tier.toLowerCase());
    
    // Handle case where current tier is not found in the tiers array
    if (currentTierIndex === -1) {
      return { name: 'Max Level', displayName: 'VIP', pointsNeeded: 0, progress: 100 };
    }
    
    const nextTier = tiers[currentTierIndex + 1];

    if (!nextTier) {
      return { name: 'Max Level', displayName: 'VIP', pointsNeeded: 0, progress: 100 };
    }

    const pointsNeeded = nextTier.points - userXP.total_points;
    const currentTierPoints = tiers[currentTierIndex].points;
    const progress = ((userXP.total_points - currentTierPoints) / (nextTier.points - currentTierPoints)) * 100;

    return { 
      name: nextTier.name, 
      displayName: nextTier.displayName,
      pointsNeeded, 
      progress: Math.max(0, Math.min(100, progress)) 
    };
  }, [userXP]);

  const getTierTextColor = (tier: string): string => {
    switch (tier.toLowerCase()) {
      case 'black':
        return '#FFD700'; // Gold text for Black tier
      default:
        return 'white'; // White text for other tiers
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[200]"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="rounded-2xl w-full max-w-md overflow-hidden"
          style={{ backgroundColor: themeColors.background }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: themeColors.cardBackground }}>
            <h2 style={{ color: themeColors.text }} className="text-xl font-bold">Loyalty Card</h2>
            <button
              onClick={onClose}
              style={{ color: themeColors.textSecondary }}
              className="hover:opacity-80 transition-opacity"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div 
                  className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2"
                  style={{ borderColor: themeColors.primary }}
                />
              </div>
            ) : userXP ? (
              <div className="space-y-6">
                {/* Loyalty Card */}
                <div 
                  className="relative rounded-2xl p-6 shadow-2xl overflow-hidden"
                  style={{ 
                    background: getTierGradient(userXP.tier),
                    minHeight: '200px'
                  }}
                >
                  {/* Logo in top right */}
                  <div className="absolute top-4 right-4 w-12 h-12">
                    <img 
                      src="https://fihjahpokzdqomytswpy.supabase.co/storage/v1/object/sign/assets/Website%20Images/Logomark%20(white).png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82MmU3MzViMy00NTE1LTRlZDctODY0My0wMWY2NWQxZjk2ZWIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhc3NldHMvV2Vic2l0ZSBJbWFnZXMvTG9nb21hcmsgKHdoaXRlKS5wbmciLCJpYXQiOjE3NDk2Mzg1ODMsImV4cCI6MjA2NDk5ODU4M30.aEDBPnP1SPJVlgOm5DVMgQ-tmgkjo7hUyOx0y44FRt4" 
                      alt="Kapsule Logo" 
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Card Content */}
                  <div className="relative z-10">
                    {/* Top Row */}
                    <div className="flex items-start justify-between mb-8">
                      <div>
                        <h3 
                          className="text-xl font-bold tracking-wide"
                          style={{ color: getTierTextColor(userXP.tier) }}
                        >
                          {userXP.tier.toUpperCase()}
                        </h3>
                        <p 
                          className="text-sm opacity-80"
                          style={{ color: getTierTextColor(userXP.tier) }}
                        >
                          {getTierDisplayName(userXP.tier)}
                        </p>
                      </div>
                    </div>

                    {/* Middle - Points */}
                    <div className="text-center mb-8">
                      <div 
                        className="text-3xl font-bold mb-1"
                        style={{ color: getTierTextColor(userXP.tier) }}
                      >
                        {userXP.total_points.toLocaleString()}
                      </div>
                      <div 
                        className="text-sm tracking-wider opacity-80"
                        style={{ color: getTierTextColor(userXP.tier) }}
                      >
                        POINTS
                      </div>
                    </div>

                    {/* Bottom Row */}
                    <div className="flex items-end justify-between">
                      <div>
                        <p 
                          className="text-xs mb-1 opacity-80"
                          style={{ color: getTierTextColor(userXP.tier) }}
                        >
                          MEMBER
                        </p>
                        <p 
                          className="font-semibold text-lg"
                          style={{ color: getTierTextColor(userXP.tier) }}
                        >
                          {username}
                        </p>
                      </div>
                      <div style={{ color: getTierTextColor(userXP.tier), opacity: 0.8 }}>
                        <QrCode size={32} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress to Next Tier */}
                {nextTierInfo && (
                  nextTierInfo.name !== 'Max Level' ? (
                    <div className="rounded-xl p-4" style={{ backgroundColor: themeColors.cardBackground }}>
                      <div className="flex items-center justify-between mb-2">
                        <span style={{ color: themeColors.text }} className="text-sm font-medium">
                          Progress to {nextTierInfo.displayName}
                        </span>
                        <span style={{ color: themeColors.primary }} className="text-sm font-bold">
                          {nextTierInfo.pointsNeeded.toLocaleString()} points needed
                        </span>
                      </div>
                      <div 
                        className="w-full h-2 rounded-full overflow-hidden"
                        style={{ backgroundColor: themeColors.inputBackground }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${nextTierInfo.progress}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: getTierColor(nextTierInfo.name) }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl p-4 text-center" style={{ backgroundColor: themeColors.cardBackground }}>
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <span style={{ color: themeColors.text }} className="font-bold">
                          Maximum Level Reached!
                        </span>
                      </div>
                      <p style={{ color: themeColors.textSecondary }} className="text-sm">
                        You've achieved the highest tier available
                      </p>
                    </div>
                  )
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl p-4 text-center" style={{ backgroundColor: themeColors.cardBackground }}>
                    <div className="flex items-center justify-center mb-2">
                      <Heart size={20} style={{ color: themeColors.primary }} />
                    </div>
                    <div style={{ color: themeColors.text }} className="text-lg font-bold">
                      {userXP.swipes.toLocaleString()}
                    </div>
                    <div style={{ color: themeColors.textSecondary }} className="text-xs">
                      Total Swipes
                    </div>
                  </div>

                  <div className="rounded-xl p-4 text-center" style={{ backgroundColor: themeColors.cardBackground }}>
                    <div className="flex items-center justify-center mb-2">
                      <Plus size={20} style={{ color: '#10b981' }} />
                    </div>
                    <div style={{ color: themeColors.text }} className="text-lg font-bold">
                      {userXP.added_to_library.toLocaleString()}
                    </div>
                    <div style={{ color: themeColors.textSecondary }} className="text-xs">
                      Library Adds
                    </div>
                  </div>

                  <div className="rounded-xl p-4 text-center" style={{ backgroundColor: themeColors.cardBackground }}>
                    <div className="flex items-center justify-center mb-2">
                      <Clock size={20} style={{ color: '#8b5cf6' }} />
                    </div>
                    <div style={{ color: themeColors.text }} className="text-lg font-bold">
                      {Math.floor(userXP.listening_time / 60)}h {userXP.listening_time % 60}m
                    </div>
                    <div style={{ color: themeColors.textSecondary }} className="text-xs">
                      Listening Time
                    </div>
                  </div>

                  <div className="rounded-xl p-4 text-center" style={{ backgroundColor: themeColors.cardBackground }}>
                    <div className="flex items-center justify-center mb-2">
                      <Zap size={20} style={{ color: '#f59e0b' }} />
                    </div>
                    <div style={{ color: themeColors.text }} className="text-lg font-bold">
                      {userXP.daily_logins.toLocaleString()}
                    </div>
                    <div style={{ color: themeColors.textSecondary }} className="text-xs">
                      Daily Logins
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p style={{ color: themeColors.textSecondary }}>
                  Unable to load loyalty card data
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LoyaltyCardModal;