import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Headphones, Music } from 'lucide-react';
import AccountTypeCard from '../components/AccountTypeCard';

const AccountType: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <div className="p-6">
        <img 
          src="/logo copy.png" 
          alt="Kapsule" 
          className="h-8 cursor-pointer" 
          onClick={() => navigate('/')}
        />
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md px-6"
        >
          <h1 className="text-3xl font-bold mb-8 text-center">Choose Account Type</h1>
          
          <AccountTypeCard 
            title="Listener"
            description="Discover and enjoy music"
            icon={<Headphones />}
            onClick={() => navigate('/signup/listener')}
          />
          
          <AccountTypeCard 
            title="Artist"
            description="Share your music with the world"
            icon={<Music />}
            onClick={() => navigate('/artist-subscription')}
          />
          
          <div className="mt-10 text-center">
            <p className="text-gray-300">
              Already have an account?{' '}
              <span 
                className="text-primary cursor-pointer"
                onClick={() => navigate('/login')}
              >
                Log in
              </span>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AccountType;