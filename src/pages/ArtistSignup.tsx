import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import BackButton from '../components/BackButton';
import TextInput from '../components/TextInput';
import Button from '../components/Button';

const ArtistSignup: React.FC = () => {
  const navigate = useNavigate();
  const { signUp, error, isLoading, clearError, user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const checkoutStatus = searchParams.get('checkout');
  const sessionId = searchParams.get('session_id');
  
  const [formData, setFormData] = useState({
    username: '',
    artistName: '',
    bio: '',
    instagram: '',
    website: '',
    email: '',
    password: '',
  });
  
  const [formErrors, setFormErrors] = useState({
    username: '',
    artistName: '',
    bio: '',
    email: '',
    password: '',
  });

  const [isLinkingPayment, setIsLinkingPayment] = useState(false);
  const [linkingError, setLinkingError] = useState('');
  const [linkingSuccess, setLinkingSuccess] = useState(false);

  // Show success message if coming from successful checkout
  useEffect(() => {
    if (checkoutStatus === 'success' && sessionId) {
      console.log('Payment successful! Session ID:', sessionId);
      console.log('Please complete your artist profile below to link your payment.');
    }
  }, [checkoutStatus, sessionId]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors({ ...formErrors, [name]: '' });
    }
    if (error) clearError();
  };
  
  const validateForm = () => {
    let valid = true;
    const newErrors = { ...formErrors };
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
      valid = false;
    }
    
    if (!formData.artistName.trim()) {
      newErrors.artistName = 'Artist name is required';
      valid = false;
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
      valid = false;
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
      valid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      valid = false;
    }
    
    setFormErrors(newErrors);
    return valid;
  };

  const linkStripeToRevenueCat = async (userId: string) => {
    if (!sessionId) {
      console.warn('No session ID available for linking');
      return;
    }

    try {
      setIsLinkingPayment(true);
      setLinkingError('');

      console.log('Linking payment to user account...', { sessionId, userId });

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/link-stripe-revenuecat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          session_id: sessionId,
          user_id: userId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to link payment');
      }

      const result = await response.json();
      console.log('Successfully linked payment to user account:', result);
      setLinkingSuccess(true);
    } catch (error) {
      console.error('Error linking payment:', error);
      setLinkingError('Payment linking failed, but your account was created successfully. Please contact support if needed.');
      // Don't throw - account creation was successful
    } finally {
      setIsLinkingPayment(false);
    }
  };

  const updateTemporaryUser = async (tempUserId: string) => {
    try {
      console.log('🔄 Updating temporary user with real profile data...');
      
      // Use the new Edge Function to update user metadata
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          userId: tempUserId,
          userMetadata: {
            username: formData.username,
            artist_name: formData.artistName,
            role: 'artist',
            bio: formData.bio,
            instagram: formData.instagram,
            website: formData.website,
            checkout_status: checkoutStatus,
            is_temporary: false // Mark as no longer temporary
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user profile');
      }

      console.log('✅ Successfully updated temporary user');
      return tempUserId;
    } catch (error) {
      console.error('Error updating temporary user:', error);
      throw error;
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      let finalUserId: string;

      // Check if there's a temporary user from the checkout process
      if (user?.user_metadata?.is_temporary) {
        console.log('🔄 Found temporary user, updating with real profile data...');
        finalUserId = await updateTemporaryUser(user.id);
      } else {
        // Create a new user normally
        const { data, error: signUpError } = await signUp(formData.email, formData.password, {
          username: formData.username,
          artist_name: formData.artistName,
          role: 'artist',
          bio: formData.bio,
          instagram: formData.instagram,
          website: formData.website,
          checkout_status: checkoutStatus,
        });
        
        if (signUpError) {
          if (signUpError.message === 'User already registered') {
            setFormErrors({
              ...formErrors,
              email: 'This email is already registered. Please use a different email or log in.',
            });
          } else {
            setFormErrors({
              ...formErrors,
              email: signUpError.message,
            });
          }
          return;
        }
        
        finalUserId = data?.user?.id;
      }
      
      if (finalUserId) {
        // If we have a session ID from successful payment, link it to the user
        if (sessionId && checkoutStatus === 'success') {
          await linkStripeToRevenueCat(finalUserId);
        }
        
        // Redirect to player view after successful signup
        navigate('/player');
      }
    } catch (err: any) {
      console.error('Error during signup:', err);
      setFormErrors({
        ...formErrors,
        email: err.message || 'An error occurred during signup',
      });
    }
  };
  
  return (
    <div className="p-6 max-w-md mx-auto">
      <BackButton className="mb-8" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {checkoutStatus === 'success' && (
          <div className="bg-green-800 text-white p-4 rounded-lg mb-6">
            <p className="font-medium">🎉 Payment Successful!</p>
            <p className="text-sm mt-1">Complete your artist profile below to activate your account.</p>
            {sessionId && (
              <p className="text-xs mt-2 opacity-75">Session: {sessionId.slice(-8)}</p>
            )}
          </div>
        )}

        {checkoutStatus === 'cancelled' && (
          <div className="bg-red-800 text-white p-4 rounded-lg mb-6">
            <p className="font-medium">❌ Payment Cancelled</p>
            <p className="text-sm mt-1">Your payment was cancelled. You can try again by going back to account selection.</p>
            <button
              onClick={() => navigate('/account-type')}
              className="mt-2 text-sm underline hover:no-underline"
            >
              Back to Account Selection
            </button>
          </div>
        )}

        {linkingSuccess && (
          <div className="bg-blue-800 text-white p-4 rounded-lg mb-6">
            <p className="font-medium">✅ Payment Successfully Linked!</p>
            <p className="text-sm mt-1">Your subscription is now active.</p>
          </div>
        )}

        {linkingError && (
          <div className="bg-yellow-800 text-white p-4 rounded-lg mb-6">
            <p className="font-medium">⚠️ Account Created Successfully</p>
            <p className="text-sm mt-1">{linkingError}</p>
          </div>
        )}

        <h1 className="text-3xl font-bold mb-8">
          {user?.user_metadata?.is_temporary ? 'Complete Your Artist Profile' : 'Create Your Artist Profile'}
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-1">
          <TextInput
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            error={formErrors.username}
            hint="Username must be one word (no spaces)"
          />
          
          <TextInput
            name="artistName"
            placeholder="Artist Name"
            value={formData.artistName}
            onChange={handleChange}
            error={formErrors.artistName}
          />
          
          <TextInput
            name="bio"
            placeholder="Bio"
            value={formData.bio}
            onChange={handleChange}
            error={formErrors.bio}
          />
          
          <TextInput
            name="instagram"
            placeholder="Instagram Handle (optional)"
            value={formData.instagram}
            onChange={handleChange}
          />
          
          <TextInput
            name="website"
            placeholder="Website (optional)"
            value={formData.website}
            onChange={handleChange}
          />
          
          <TextInput
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            error={formErrors.email}
          />
          
          <TextInput
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            error={formErrors.password}
          />
          
          {error && (
            <p className="text-primary text-sm my-4">{error}</p>
          )}
          
          <div className="mt-8 flex justify-center">
            <Button type="submit" disabled={isLoading || isLinkingPayment}>
              {isLoading ? 'Creating profile...' : 
               isLinkingPayment ? 'Linking payment...' : 
               checkoutStatus === 'success' ? 'Complete Setup & Activate' :
               'Create Profile'}
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-300 text-sm">
            Already have an account?{' '}
            <button 
              onClick={() => navigate('/login')}
              className="text-primary hover:text-primary-hover underline"
            >
              Log in
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ArtistSignup;