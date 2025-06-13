import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';

const OurStory: React.FC = () => {
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

      <div className="container mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-12 text-center">Our Story</h1>
          
          <div className="prose prose-lg mx-auto text-[#868686]">
            <p className="mb-8">
              Kapsule was born out of frustration—with an industry that too often rewards popularity over talent, algorithms over authenticity, and marketing over music.
            </p>
            
            <p className="mb-8">
              Kapsule founder & CEO, Joey Tadiar, didn't come from the boardrooms of major labels. He came from the dance floor. A die-hard raver. And as the creator of the viral meme page Ketflix & Pills, Joey built a global community of over 1.3 million rave and festival lovers who cared deeply about music. He spent years in the trenches of music and event marketing, helping artists launch new releases and sell out shows. But behind the scenes, he saw how the system really worked.
            </p>
            
            <p className="mb-8">
              The harsh truth? Streams, sales, and chart positions weren't about how good a track was—they were about how big your following was, how much budget you had, and how well you could game the system. The same names topped the charts not because their music was better, but because they could afford to stay there.
            </p>
            
            <p className="mb-8">
              That didn't sit right.
            </p>
            
            <p className="mb-8">
              So Joey set out to build something different. Something fair. Something authentic.
            </p>
            
            <h2 className="text-3xl font-bold text-gray-900 my-8 text-center">Introducing Kapsule</h2>
            
            <p className="mb-4 text-center">
              A music discovery platform where sound speaks louder than stats.
            </p>
            <p className="mb-4 text-center">
              Where artist names stay hidden until you like a track.
            </p>
            <p className="mb-8 text-center">
              Where listeners decide what's hot and what's not.
            </p>
            
            <p className="mb-8">
              Kapsule strips away the noise. No hype, no social clout, no influencer campaigns. Just music in its rawest form. For the first time, artists are judged solely on their sound, and every like and stream is earned—not bought.
            </p>
            
            <p className="mb-8">
              Whether you're an underground producer with no followers or an established name testing new waters, everyone gets the same shot.
            </p>
            
            <p className="mb-8">
              This isn't just a platform. It's a rebellion. A revolution for the unheard.
            </p>
            
            <p className="mb-8">
              Welcome to Kapsule. Where the music does the talking.
            </p>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default OurStory;