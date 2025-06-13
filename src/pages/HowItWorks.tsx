import React from 'react';
import { motion } from 'framer-motion';
import { Music, User, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import Button from '../components/Button';

const HowItWorks: React.FC = () => {
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

      <div className="container mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-6xl mx-auto"
        >
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">How It Works</h1>
            <p className="text-xl text-[#868686] max-w-2xl mx-auto">
              Discover music in its purest form, where the only thing that matters is how it sounds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
            {/* Step 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 min-h-[300px] flex flex-col"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                  <User className="text-white" size={24} />
                </div>
                <span className="text-6xl font-bold text-gray-200">1</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Create an account</h3>
              <p className="text-[#868686] flex-grow">
                Join as an artist in seconds. No complicated setup, just fill in your details to get started. Our streamlined process gets you sharing music, getting feedback and building a fanbase quickly.
              </p>
            </motion.div>

            {/* Step 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 min-h-[300px] flex flex-col"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                  <Music className="text-white" size={24} />
                </div>
                <span className="text-6xl font-bold text-gray-200">2</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Share your music</h3>
              <p className="text-[#868686] flex-grow">
                Upload your tracks and let the sound do the talking. No need for fancy visuals or social media posts. Your music speaks for itself on our platform, reaching listeners who truly appreciate your tunes.
              </p>
            </motion.div>

            {/* Step 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 min-h-[300px] flex flex-col"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                  <Trophy className="text-white" size={24} />
                </div>
                <span className="text-6xl font-bold text-gray-200">3</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Get recognised</h3>
              <p className="text-[#868686] flex-grow">
                Climb the charts based purely on listener engagement. Your talent and music quality determine your success. Build a genuine following and catch the attention of industry professionals organically.
              </p>
            </motion.div>
          </div>

          {/* Additional content and Get Started button */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Ready to transform how you discover music?</h2>
            <p className="text-xl text-[#868686] mb-8">
              Join Kapsule today and be part of a community that values music for what it truly is – pure sound.
            </p>
            <Button onClick={() => navigate('/account-type')}>
              Get Started
            </Button>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default HowItWorks;