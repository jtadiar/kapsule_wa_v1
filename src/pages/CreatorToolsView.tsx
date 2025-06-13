import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { useThemeStore, getThemeColors } from '../store/themeStore';
import { usePlayerStore } from '../store/playerStore';

interface Lab {
  id: string;
  logo: string;
  description: string;
  isComingSoon?: boolean;
  isDesktopOnly?: boolean;
}

const labs: Lab[] = [
  {
    id: 'soundlab',
    logo: 'https://fihjahpokzdqomytswpy.supabase.co/storage/v1/object/sign/assets/Website%20Images/SoundlLab.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82MmU3MzViMy00NTE1LTRlZDctODY0My0wMWY2NWQxZjk2ZWIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhc3NldHMvV2Vic2l0ZSBJbWFnZXMvU291bmRsTGFiLnBuZyIsImlhdCI6MTc0OTE3MjU2MiwiZXhwIjoyMDY0NTMyNTYyfQ.zlKcQrNjbcDn9vqp-xJQTu63wuRrRQeStzXi33zS2-Y',
    description: 'Generate your own soundboard presets using text-to-sfx prompts',
    isDesktopOnly: true
  },
  {
    id: 'vocallab',
    logo: 'https://fihjahpokzdqomytswpy.supabase.co/storage/v1/object/sign/assets/Website%20Images/Labs-Logos_0003_Vector.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82MmU3MzViMy00NTE1LTRlZDctODY0My0wMWY2NWQxZjk2ZWIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhc3NldHMvV2Vic2l0ZSBJbWFnZXMvTGFicy1Mb2dvc18wMDAzX1ZlY3Rvci5wbmciLCJpYXQiOjE3NDkxNzI1OTcsImV4cCI6MjA2NDUzMjU5N30.jn9j3eo97aTKrG6DdSJreqLZWQdXPcm1b-LwGEtbgyM',
    description: 'Generate vocals for your next track using text-to-vocal prompts',
    isDesktopOnly: true
  },
  {
    id: 'tutorlab',
    logo: 'https://fihjahpokzdqomytswpy.supabase.co/storage/v1/object/sign/assets/Website%20Images/TutorLab1.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82MmU3MzViMy00NTE1LTRlZDctODY0My0wMWY2NWQxZjk2ZWIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhc3NldHMvV2Vic2l0ZSBJbWFnZXMvVHV0b3JMYWIxLnBuZyIsImlhdCI6MTc0OTI0NTE2OCwiZXhwIjoyMDY0NjA1MTY4fQ.P-BrCTWBpuW0Q1Sncqgi_ua6y_Dit0O6xEbW2TF_z58',
    description: 'Your AI music tutor with deep knowledge of electronic genres offering tips, techniques, and track recommendations.'
  },
  {
    id: 'masterlab',
    logo: 'https://fihjahpokzdqomytswpy.supabase.co/storage/v1/object/sign/assets/Website%20Images/MasterLab.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82MmU3MzViMy00NTE1LTRlZDctODY0My0wMWY2NWQxZjk2ZWIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhc3NldHMvV2Vic2l0ZSBJbWFnZXMvTWFzdGVyTGFiLnBuZyIsImlhdCI6MTc0OTE3MjYyMCwiZXhwIjoyMDY0NTMyNjIwfQ.4xvaPTn_a69GDEKgmMhdlSQv49SP8cGdxPqExqb6hwo',
    description: 'Coming soon',
    isComingSoon: true
  }
];

const CreatorToolsView: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useThemeStore();
  const themeColors = getThemeColors(theme);
  const { pauseForNavigation, resumeFromNavigation } = usePlayerStore();
  const [selectedLab, setSelectedLab] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Pause audio when entering creator tools
  useEffect(() => {
    pauseForNavigation();
    
    // Resume audio when leaving creator tools
    return () => {
      resumeFromNavigation();
    };
  }, [pauseForNavigation, resumeFromNavigation]);

  const handleLabClick = (labId: string, isDesktopOnly?: boolean) => {
    // Prevent navigation if it's a desktop-only lab and user is on mobile
    if (isDesktopOnly && isMobile) {
      return;
    }
    
    if (labId === 'masterlab') return;
    
    setSelectedLab(labId);
    navigate(`/creator-tools/${labId}`);
  };

  const isLabDisabled = (lab: Lab) => {
    return lab.isComingSoon || (lab.isDesktopOnly && isMobile);
  };

  const getLabDescription = (lab: Lab) => {
    if (lab.isDesktopOnly && isMobile) {
      return `${lab.description} (desktop only)`;
    }
    return lab.description;
  };

  return (
    <div className="min-h-screen flex flex-col p-6" style={{ backgroundColor: themeColors.background }}>
      <button
        onClick={() => navigate('/profile')}
        className="flex items-center gap-1 mb-8 hover:opacity-80 transition-opacity"
        style={{ color: themeColors.primary }}
      >
        <ChevronLeft size={24} />
        <span>Back</span>
      </button>

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-[800px]">
          <div className="text-center mb-12">
            <img 
              src="https://fihjahpokzdqomytswpy.supabase.co/storage/v1/object/sign/assets/Website%20Images/Lab%20Logos%20Red/Kapsule%20Kit%20Logo.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82MmU3MzViMy00NTE1LTRlZDctODY0My0wMWY2NWQxZjk2ZWIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhc3NldHMvV2Vic2l0ZSBJbWFnZXMvTGFiIExvZ29zIFJlZC9LYXBzdWxlIEtpdCBMb2dvLnBuZyIsImlhdCI6MTc0OTQ4MjM2NCwiZXhwIjoyMDY0ODQyMzY0fQ.D1sIJ-lqqT7Mh9lAP5qL_1xu6DABnMKoTO8--qXjiIE" 
              alt="Kapsule Kit" 
              className="h-16 mx-auto"
            />
          </div>
          
          <div className="space-y-4">
            {labs.map((lab) => {
              const isDisabled = isLabDisabled(lab);
              
              return (
                <motion.div
                  key={lab.id}
                  whileHover={!isDisabled ? { scale: 1.02 } : {}}
                  className={`rounded-xl py-4 px-6 flex items-center gap-8 transition-all ${
                    !isDisabled ? 'cursor-pointer hover:opacity-80' : 'opacity-50 cursor-not-allowed'
                  }`}
                  style={{ backgroundColor: themeColors.cardBackground }}
                  onClick={() => !isDisabled && handleLabClick(lab.id, lab.isDesktopOnly)}
                >
                  <div className="w-32 h-32 flex-shrink-0 flex items-center justify-center">
                    <img 
                      src={lab.logo} 
                      alt={lab.id} 
                      className={`w-full h-full object-contain ${isDisabled ? 'grayscale' : ''}`}
                    />
                  </div>
                  <p className={`text-base flex-1`} style={{ color: isDisabled ? themeColors.textSecondary : themeColors.text }}>
                    {getLabDescription(lab)}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatorToolsView;