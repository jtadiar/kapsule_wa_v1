import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import Button from '../components/Button';

const About: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Header with Logo */}
      <div className="p-6">
        <img 
          src="https://fihjahpokzdqomytswpy.supabase.co/storage/v1/object/sign/assets/logo.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InN0b3JhZ2UtdXJsLXNpZ25pbmcta2V5XzYyZTczNWIzLTQ1MTUtNGVkNy04NjQzLTAxZjY1ZDFmOTZlYiJ9.eyJ1cmwiOiJhc3NldHMvbG9nby5wbmciLCJpYXQiOjE3NDg4MDA2NDEsImV4cCI6MjA2NDE2MDY0MX0.wNFNgarx6vPYOYs4sZiOAORnHU3qJCxZTRwEGIoA3MY" 
          alt="Kapsule" 
          className="h-8 cursor-pointer" 
          onClick={() => navigate('/')}
        />
      </div>

      <div className="container mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-12 text-center">About</h1>
          
          <div className="space-y-6 text-lg text-[#868686] text-center">
            <p>
              Kapsule has created a level playing field for both emerging and established artists.
            </p>
            
            <p>
              No hype. No big budgets. No viral reels. No orchestrated traffic. Just sound.
            </p>
            
            <p>
              In a world dominated by algorithms, major label marketing, and social clout, music discovery has lost its purity. The white label era is dead. But we're here to change that.
            </p>
            
            <p>
              On Kapsule, artist names stay hidden until you like a track. No sponsored ads. No orchestrated traffic or viral content. Just music in its rawest form.
            </p>
            
            <p>
              When you like a song, you find out who made it and the artist gets rewarded. It's that simple.
            </p>
            
            <p>
              For artists, it means being judged solely on your sound. For listeners, it's discovering music without the noise.
            </p>
            
            <p>
              We're bringing the focus back to what matters most; the music.
            </p>
            
            <p>
              Whether you're here to be heard or to find something real, Kapsule is your home for true musical connection.
            </p>

            <div className="pt-12">
              <Button onClick={() => navigate('/account-type')}>
                Get Started
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default About;