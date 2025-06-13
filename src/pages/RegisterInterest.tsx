import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Info, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

type UserRole = 'listener' | 'artist';

interface FormData {
  role: UserRole;
  name: string;
  artistName: string;
  genre: string;
  email: string;
  username: string;
  marketingOptIn: boolean;
  iosBeta: string;
}

const GENRES = [
  'Drum & Bass',
  'Garage',
  'House / Tech house',
  'Minimal / Deep Tech',
  'Techno'
];

const RegisterInterest: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    role: 'listener',
    name: '',
    artistName: '',
    genre: '',
    email: '',
    username: '',
    marketingOptIn: false,
    iosBeta: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState('');
  const [showUsernameTooltip, setShowUsernameTooltip] = useState(false);

  const handleRoleToggle = (role: UserRole) => {
    setFormData(prev => ({ ...prev, role }));
    setError('');
  };

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }

    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }

    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (formData.role === 'artist' && !formData.artistName.trim()) {
      setError('Artist name is required');
      return false;
    }

    if (formData.role === 'artist' && !formData.genre) {
      setError('Genre is required for artists');
      return false;
    }

    if (!formData.iosBeta) {
      setError('Please select your iOS Beta interest');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      setError('');

      const { error: insertError } = await supabase
        .from('subscribers')
        .insert({
          role: formData.role,
          name: formData.name.trim(),
          artist_name: formData.role === 'artist' ? formData.artistName.trim() : null,
          email: formData.email.trim().toLowerCase(),
          username: formData.username.trim() || null,
          marketing_opt_in: formData.marketingOptIn,
          genre: formData.role === 'artist' ? formData.genre : null,
          ios_beta_interest: formData.iosBeta
        });

      if (insertError) {
        if (insertError.code === '23505') { // Unique constraint violation
          setError('This email is already registered. Please use a different email address.');
        } else {
          setError('An error occurred while registering your interest. Please try again.');
        }
        return;
      }

      setShowConfirmation(true);
    } catch (error) {
      console.error('Error submitting registration:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseConfirmation = () => {
    setShowConfirmation(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="p-6 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="text-primary hover:text-primary-hover transition-colors flex items-center gap-1"
        >
          <ChevronLeft size={24} />
          <span>Back</span>
        </button>
        <img 
          src="https://fihjahpokzdqomytswpy.supabase.co/storage/v1/object/sign/assets/logo.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InN0b3JhZ2UtdXJsLXNpZ25pbmcta2V5XzYyZTczNWIzLTQ1MTUtNGVkNy04NjQzLTAxZjY1ZDFmOTZlYiJ9.eyJ1cmwiOiJhc3NldHMvbG9nby5wbmciLCJpYXQiOjE3NDg4MDA2NDEsImV4cCI6MjA2NDE2MDY0MX0.wNFNgarx6vPYOYs4sZiOAORnHU3qJCxZTRwEGIoA3MY" 
          alt="Kapsule" 
          className="h-8"
        />
        <div className="w-16" /> {/* Spacer for centering */}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Register Your Interest</h1>
            <p className="text-gray-600">
              Be the first to know when Kapsule launches and secure your spot in the future of music discovery.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Toggle */}
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-3">
                I am registering as:
              </label>
              <div className="flex bg-gray-100 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => handleRoleToggle('listener')}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                    formData.role === 'listener'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Listener
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleToggle('artist')}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                    formData.role === 'artist'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Artist
                </button>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-700"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              {/* Artist Name (only for artists) */}
              <AnimatePresence>
                {formData.role === 'artist' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Artist Name *
                    </label>
                    <input
                      type="text"
                      value={formData.artistName}
                      onChange={(e) => handleInputChange('artistName', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-700"
                      placeholder="Enter your artist name"
                      required={formData.role === 'artist'}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Genre (only for artists) */}
              <AnimatePresence>
                {formData.role === 'artist' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Genre *
                    </label>
                    <select
                      value={formData.genre}
                      onChange={(e) => handleInputChange('genre', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-700 bg-white"
                      required={formData.role === 'artist'}
                    >
                      <option value="">Select your primary genre</option>
                      {GENRES.map((genre) => (
                        <option key={genre} value={genre}>
                          {genre}
                        </option>
                      ))}
                    </select>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email */}
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-700"
                  placeholder="Enter your email address"
                  required
                />
              </div>

              {/* Username */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-gray-700 text-sm font-medium">
                    Username
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onMouseEnter={() => setShowUsernameTooltip(true)}
                      onMouseLeave={() => setShowUsernameTooltip(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Info size={16} />
                    </button>
                    <AnimatePresence>
                      {showUsernameTooltip && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap z-10"
                        >
                          Reserve your username now. Usernames are not guaranteed
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-700"
                  placeholder="Choose a username (optional)"
                />
              </div>

              {/* iOS Beta Interest */}
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Are you interested in joining iOS Beta? *
                </label>
                <select
                  value={formData.iosBeta}
                  onChange={(e) => handleInputChange('iosBeta', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-700 bg-white"
                  required
                >
                  <option value="">Select an option</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
            </div>

            {/* Marketing Opt-in Checkbox */}
            <div className="flex items-start gap-3">
              <div className="flex items-center h-6">
                <input
                  type="checkbox"
                  id="marketingOptIn"
                  checked={formData.marketingOptIn}
                  onChange={(e) => handleInputChange('marketingOptIn', e.target.checked)}
                  className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
                />
              </div>
              <label htmlFor="marketingOptIn" className="text-sm text-gray-700 leading-6">
                I'd like to receive early access and community news from Kapsule. Unsubscribe anytime.
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 rounded-xl p-4"
              >
                <p className="text-red-700 text-sm">{error}</p>
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Registering...</span>
                </>
              ) : (
                'Register Interest'
              )}
            </button>
          </form>
        </motion.div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 max-w-md w-full text-center"
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check size={32} className="text-green-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Thank You!
              </h2>
              
              <p className="text-gray-600 mb-6">
                Your interest has been registered successfully. We'll notify you as soon as Kapsule launches!
              </p>
              
              <button
                onClick={handleCloseConfirmation}
                className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-3 rounded-xl transition-colors"
              >
                Continue
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RegisterInterest;