import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import Button from '../components/Button';
import TypewriterText from '../components/TypewriterText';
import DemoPlayer from '../components/DemoPlayer';
import Footer from '../components/Footer';

const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="min-h-screen bg-[#f0f0f0] md:bg-[#0f0f0f]">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {!isMobile && (
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover z-0"
          >
            <source
              src="https://fihjahpokzdqomytswpy.supabase.co/storage/v1/object/sign/assets/bg%20new.mp4?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InN0b3JhZ2UtdXJsLXNpZ25pbmcta2V5XzYyZTczNWIzLTQ1MTUtNGVkNy04NjQzLTAxZjY1ZDFmOTZlYiJ9.eyJ1cmwiOiJhc3NldHMvYmcgbmV3Lm1wNCIsImlhdCI6MTc0ODcyODA1NywiZXhwIjoyMDY0MDg4MDU3fQ.F1XadCYg_Tw8v-TZtaIylpxH-5RTpnSbeqVubPENzqI"
              type="video/mp4"
            />
          </video>
        )}

        <div className="relative z-10 min-h-screen flex flex-col justify-between items-center p-6 pb-10">
          <motion.a 
            href="https://bolt.new" 
            className="self-start"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <img 
              src="https://fihjahpokzdqomytswpy.supabase.co/storage/v1/object/sign/assets/Bolt%20Logo.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InN0b3JhZ2UtdXJsLXNpZ25pbmcta2V5XzYyZTczNWIzLTQ1MTUtNGVkNy04NjQzLTAxZjY1ZDFmOTZlYiJ9.eyJ1cmwiOiJhc3NldHMvQm9sdCBMb2dvLnBuZyIsImlhdCI6MTc0ODc5MjIzNiwiZXhwIjoyMDY0MTUyMjM2fQ.dvYDqOY9dxdy4UYliBEPF5yw33ISNZVG72GWxbN1-sk" 
              alt="Bolt" 
              className="h-28 w-28" 
            />
          </motion.a>
          
          <div className="text-center flex flex-col items-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="mb-4"
            >
              <img 
                src="https://fihjahpokzdqomytswpy.supabase.co/storage/v1/object/sign/assets/kapsule%20logo.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InN0b3JhZ2UtdXJsLXNpZ25pbmcta2V5XzYyZTczNWIzLTQ1MTUtNGVkNy04NjQzLTAxZjY1ZDFmOTZlYiJ9.eyJ1cmwiOiJhc3NldHMva2Fwc3VsZSBsb2dvLnBuZyIsImlhdCI6MTc0ODc5MzQ2OCwiZXhwIjoyMDY0MTUzNDY4fQ.ZGlbV2HKwlL1bqrPQJP5tj85nATiT59OA_XpuYHhebE"
                alt="Kapsule" 
                className="w-48 md:w-64"
              />
            </motion.div>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="h-6"
            >
              <TypewriterText 
                text="Your gateway to undiscovered music" 
                className="text-gray-300 text-lg md:text-xl whitespace-nowrap"
                speed={50}
                onComplete={() => setIsTypingComplete(true)}
              />
            </motion.div>
          </div>
          
          <div className="flex flex-col w-full max-w-md">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: isTypingComplete ? 1 : 0 }}
              transition={{ duration: 0.5 }}
            >
              <button
                onClick={() => navigate('/register-interest')}
                className="w-full py-4 px-6 bg-primary hover:bg-primary-hover transition-colors duration-200 text-white font-medium rounded-full text-lg"
              >
                Register Interest
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="h-[10px] bg-white w-full" />

      {/* Listen on your terms Section */}
      <div className="bg-[#f0f0f0]">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="w-full md:w-3/5 order-2 md:order-1"
            >
              <div className="relative">
                <img
                  src={isMobile 
                    ? "https://fihjahpokzdqomytswpy.supabase.co/storage/v1/object/sign/assets/Website%20Images/Blind%20listening%20mobile.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InN0b3JhZ2UtdXJsLXNpZ25pbmcta2V5XzYyZTczNWIzLTQ1MTUtNGVkNy04NjQzLTAxZjY1ZDFmOTZlYiJ9.eyJ1cmwiOiJhc3NldHMvV2Vic2l0ZSBJbWFnZXMvQmxpbmQgbGlzdGVuaW5nIG1vYmlsZS5wbmciLCJpYXQiOjE3NDg4MDY3MDEsImV4cCI6MjA2NDE2NjcwMX0.CA8aWi8_oux9aG4yPXvgn_3PJ9TKF_dSMOhag0hckPk"
                    : "https://fihjahpokzdqomytswpy.supabase.co/storage/v1/object/sign/assets/Website%20Images/Blind%20Listening%20new.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InN0b3JhZ2UtdXJsLXNpZ25pbmcta2V5XzYyZTczNWIzLTQ1MTUtNGVkNy04NjQzLTAxZjY1ZDFmOTZlYiJ9.eyJ1cmwiOiJhc3NldHMvV2Vic2l0ZSBJbWFnZXMvQmxpbmQgTGlzdGVuaW5nIG5ldy5wbmciLCJpYXQiOjE3NDg3NTY1NTksImV4cCI6MjA2NDExNjU1OX0.MR5-M2xvAA2zy628UeM88Y0vHgyEiFmogbJ6F86dQlI"
                  }
                  alt="Listen on your terms"
                  className="w-full h-auto"
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="w-full md:w-2/5 order-1 md:order-2 text-center md:text-left px-4 md:px-0 md:-ml-20 mb-6 md:mb-0 pt-8 md:pt-0"
            >
              <div className="max-w-[500px] mx-auto md:mx-0">
                <h1 className="text-[30px] md:text-[40px] font-bold text-gray-900 mb-2 tracking-tight">
                  Listen on your terms
                </h1>
                <p className="text-[#868686] text-[18px] leading-relaxed tracking-tight">
                  Kapsule takes the 'who' out of music with a revolutionary listening experience that lets you discover artists based solely on their sound.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
        <div className="h-[10px] bg-white w-full" />
      </div>

      {/* All about the music Section */}
      <div className="bg-gradient-to-r from-[#ffffff] to-[#f0f0f0]">
        <div className="container mx-auto px-6 py-12 md:py-12">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="w-full md:w-1/2 text-center md:text-left pt-8 md:-mt-8"
            >
              <h2 className="text-[30px] md:text-[40px] font-bold text-gray-900 mb-6">
                All about the music
              </h2>
              <p className="text-[#868686] text-lg leading-relaxed mb-8">
                A clean, distraction-free interface encourages deeper listening helping you to truly connect with the music. Swipe through tracks with intention and artist names stay hidden until you hit like, making every discovery authentic and driven by sound, not social clout.
              </p>
              <Button onClick={() => navigate('/register-interest')}>
                Register Interest
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="w-full md:w-1/2"
            >
              <div className="w-full aspect-square max-w-[600px] mx-auto">
                <DemoPlayer />
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="h-[10px] bg-white w-full" />

      {/* KapsuleKit Section - HIDDEN */}
      {/* 
      <div className="bg-[#f7f7f7] py-16" style={{ display: 'none' }}>
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="mb-8">
              <img 
                src="https://fihjahpokzdqomytswpy.supabase.co/storage/v1/object/sign/assets/Website%20Images/Lab%20Logos%20Red/Kapsule%20Kit%20Logo.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82MmU3MzViMy00NTE1LTRlZDctODY0My0wMWY2NWQxZjk2ZWIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhc3NldHMvV2Vic2l0ZSBJbWFnZXMvTGFiIExvZ29zIFJlZC9LYXBzdWxlIEtpdCBMb2dvLnBuZyIsImlhdCI6MTc0OTI5MjMzMSwiZXhwIjoyMDY0NjUyMzMxfQ.cWHegcF0zBlv_8tMc1d0P9h2ySAjevzBnJpH3oEnbZA" 
                alt="KapsuleKit" 
                className="h-12 mx-auto"
              />
            </div>

            <div className="max-w-4xl mx-auto mb-12">
              <p className="text-[#868686] text-lg leading-relaxed">
                <span className="font-bold">KapsuleKit</span> is an AI powered toolkit built for artists. Generate custom samples or vocals with simple prompts, or get music production tips and track recommendations from Abel, Kapsule's custom conversational AI model.
              </p>
            </div>

            <div className="max-w-5xl mx-auto">
              <img 
                src="https://fihjahpokzdqomytswpy.supabase.co/storage/v1/object/sign/assets/Website%20Images/Kapsule%20Kit%20Image.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82MmU3MzViMy00NTE1LTRlZDctODY0My0wMWY2NWQxZjk2ZWIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhc3NldHMvV2Vic2l0ZSBJbWFnZXMvS2Fwc3VsZSBLaXQgSW1hZ2UucG5nIiwiaWF0IjoxNzQ5MjkyNDAyLCJleHAiOjIwNjQ2NTI0MDJ9.7oGG3l0bwWXaXiEmMe4EEXBpQC6PGDJn5i7pkb2lPjU" 
                alt="KapsuleKit Interface" 
                className="w-full h-auto"
              />
            </div>
          </motion.div>
        </div>
      </div>

      <div className="h-[10px] bg-white w-full" />
      */}

      {/* Built for artists Section */}
      <div id="artists-section" className="bg-gradient-to-r from-[#ffffff] to-[#f0f0f0] py-16">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="w-full md:w-1/2"
            >
              <div className="w-full aspect-square max-w-[600px] mx-auto relative rounded-3xl overflow-hidden">
                <img
                  src="https://fihjahpokzdqomytswpy.supabase.co/storage/v1/object/sign/assets/Website%20Images/Artist%20Splash_.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InN0b3JhZ2UtdXJsLXNpZ25pbmcta2V5XzYyZTczNWIzLTQ1MTUtNGVkNy04NjQzLTAxZjY1ZDFmOTZlYiJ9.eyJ1cmwiOiJhc3NldHMvV2Vic2l0ZSBJbWFnZXMvQXJ0aXN0IFNwbGFzaF8ucG5nIiwiaWF0IjoxNzQ4ODQzNzg2LCJleHAiOjIwNjQyMDM3ODZ9.7WSS7fMyY9RLrCv70iIiyScCiYcyElM4nooUWWM-iIY"
                  alt="Artist showcase"
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="w-full md:w-1/2"
            >
              <h2 className="text-[30px] md:text-[40px] font-bold text-gray-900 mb-8">
                Built for artists
              </h2>
              
              <div className="space-y-6 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#FF3C3C] flex items-center justify-center flex-shrink-0 mt-1">
                    <Check size={14} color="white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1 text-gray-900">Fair discovery for all</h3>
                    <p className="text-[#868686]">Your place in the charts is based on one thing — your sound.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#FF3C3C] flex items-center justify-center flex-shrink-0 mt-1">
                    <Check size={14} color="white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1 text-gray-900">Refine your craft with real-time data</h3>
                    <p className="text-[#868686]">Your dashboard shows what hits so you can double down on what fans love.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#FF3C3C] flex items-center justify-center flex-shrink-0 mt-1">
                    <Check size={14} color="white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1 text-gray-900">Grow a genuine fanbase</h3>
                    <p className="text-[#868686]">Attract listeners who connect with your music, not your content.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#FF3C3C] flex items-center justify-center flex-shrink-0 mt-1">
                    <Check size={14} color="white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1 text-gray-900">Get noticed by the right people</h3>
                    <p className="text-[#868686]">Grab the spotlight, catch label attention, and unlock bookings, signings, and growth.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#FF3C3C] flex items-center justify-center flex-shrink-0 mt-1">
                    <Check size={14} color="white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1 text-gray-900">No clout required</h3>
                    <p className="text-[#868686]">No budget. No followers. No videos. Just music that speaks for itself.</p>
                  </div>
                </div>
              </div>

              <Button onClick={() => navigate('/register-interest')}>
                Register Interest
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Designed for listeners Section */}
      <div id="listeners-section" className="bg-gradient-to-b from-[#f0f0f0] to-[#ffffff]">
        <div className="container mx-auto px-6 py-12 md:py-16">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="w-full md:w-1/2"
            >
              <h2 className="text-[30px] md:text-[40px] font-bold text-gray-900 mb-8">
                Designed for listeners
              </h2>
              
              <div className="space-y-6 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1">
                    <Check size={14} color="white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">Discover emerging artists</h3>
                    <p className="text-[#868686]">No names until you like the track. No bias. Just pure sound.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1">
                    <Check size={14} color="white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">Uncover hidden gems</h3>
                    <p className="text-[#868686]">Fresh music from artists no one's talking about—yet.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1">
                    <Check size={14} color="white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">Curate your own library</h3>
                    <p className="text-[#868686]">Every like builds your personal playlist of favorites.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1">
                    <Check size={14} color="white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">Distraction-free listening</h3>
                    <p className="text-[#868686]">No ads. No algorithms. Just you and the music.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1">
                    <Check size={14} color="white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">Authentic music discovery</h3>
                    <p className="text-[#868686]">That feeling when you like a track and the artist is completely unknown? Addictive.</p>
                  </div>
                </div>
              </div>

              <Button onClick={() => navigate('/register-interest')}>
                Register Interest
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="w-full md:w-1/2"
            >
              <div className="w-full aspect-square max-w-[600px] mx-auto">
                <div className="w-full aspect-square bg-black rounded-3xl overflow-hidden">
                  <img
                    src="https://fihjahpokzdqomytswpy.supabase.co/storage/v1/object/sign/assets/listener.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InN0b3JhZ2UtdXJsLXNpZ25pbmcta2V5XzYyZTczNWIzLTQ1MTUtNGVkNy04NjQzLTAxZjY1ZDFmOTZlYiJ9.eyJ1cmwiOiJhc3NldHMvbGlzdGVuZXIucG5nIiwiaWF0IjoxNzQ4NzgwMTEwLCJleHAiOjIwNjQxNDAxMTB9.t6QOfdR3ESd_k-9lufIPeRLlJDr5YPZkC9i1DFXj27E"
                    alt="Listener with headphones"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Welcome;