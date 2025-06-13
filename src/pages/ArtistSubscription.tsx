import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileUp, Play, Download, User, BarChart, Music, ChevronLeft, BadgeCheck, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import Button from '../components/Button';
import SubscriptionFeature from '../components/SubscriptionFeature';
import { products } from '../stripe-config';

const ArtistSubscription: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checkoutStatus = searchParams.get('checkout');

  const handleJoinAsArtist = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      let userId = user?.id;
      
      // If user is not logged in, create an anonymous user for RevenueCat tracking
      if (!userId) {
        console.log('🆕 Creating anonymous user for RevenueCat tracking...');
        
        // Generate a temporary email and password
        const tempEmail = `temp_${Date.now()}@kapsule.temp`;
        const tempPassword = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: tempEmail,
          password: tempPassword,
          options: {
            data: {
              is_temporary: true,
              created_for_checkout: true
            }
          }
        });
        
        if (signUpError) {
          console.error('Failed to create temporary user:', signUpError);
          throw new Error('Failed to prepare checkout. Please try again.');
        }
        
        userId = signUpData.user?.id;
        console.log('✅ Created temporary user:', userId);
      }
      
      if (!userId) {
        throw new Error('Unable to prepare user for checkout');
      }
      
      // Create checkout session with user ID for RevenueCat tracking
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          price_id: products.artistSubscription.priceId,
          success_url: `${window.location.origin}/signup/artist?checkout=success`,
          cancel_url: `${window.location.origin}/artist-subscription?checkout=cancelled`,
          mode: products.artistSubscription.mode,
          user_id: userId, // Pass user ID for RevenueCat tracking
          metadata: {
            product_id: 'artist_subscription',
            user_id: userId
          }
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('Checkout creation failed:', responseData);
        throw new Error(responseData.details || responseData.error || 'Failed to create checkout session');
      }

      if (!responseData.url) {
        throw new Error('No checkout URL received from server');
      }

      // Redirect to Stripe checkout
      window.location.href = responseData.url;
    } catch (error) {
      console.error('Error during checkout:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="p-6">
        <button
          onClick={() => navigate('/account-type')}
          className="text-primary hover:text-primary-hover transition-colors flex items-center gap-1"
        >
          <ChevronLeft size={24} />
          <span>Back</span>
        </button>
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md px-6"
        >
          <h1 className="text-3xl font-bold mb-4 text-center">Artist Subscription</h1>
          <p className="text-4xl font-bold text-primary mb-6 text-center">
            £10.99 <span className="text-gray-300 text-lg font-normal">/month</span>
          </p>

          {checkoutStatus === 'cancelled' && (
            <div className="bg-red-800 text-white p-4 rounded-lg mb-6">
              <p>Payment was cancelled. Please try again to subscribe.</p>
            </div>
          )}

          {checkoutStatus === 'success' && (
            <div className="bg-green-800 text-white p-4 rounded-lg mb-6">
              <p>Payment successful! Please complete your account setup below.</p>
            </div>
          )}

          {error && (
            <div className="bg-red-800 text-white p-4 rounded-lg mb-6">
              <p className="font-semibold">Error:</p>
              <p className="text-sm">{error}</p>
              <p className="text-xs mt-2 opacity-75">
                If this error persists, please contact support or try again later.
              </p>
            </div>
          )}
          
          <div className="bg-gray-800 rounded-xl p-5 mb-8 border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <BadgeCheck className="text-[#FFD700]" size={20} />
              <span className="text-white">Gold Badge Eligible</span>
            </div>
            <SubscriptionFeature icon={<FileUp />} text="Upload 10 tracks" />
            <SubscriptionFeature icon={<Play />} text="Add 3 tracks to Player" />
            <SubscriptionFeature icon={<Download />} text="Download 25 tracks per month" />
            <SubscriptionFeature icon={<User />} text="Artist Profile" />
            <SubscriptionFeature icon={<BarChart />} text="Analytics dashboard" />
            <SubscriptionFeature icon={<Music />} text="Access music catalogue" />
          </div>
          
          <div className="flex justify-center">
            <Button 
              onClick={handleJoinAsArtist} 
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Processing...</span>
                </>
              ) : (
                'Join as Artist'
              )}
            </Button>
          </div>

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
    </div>
  );
};

export default ArtistSubscription;