import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useRevenueCat } from '../hooks/useRevenueCat';
import { getActiveSubscription } from '../lib/stripe';
import { supabase } from '../lib/supabase';
import { useThemeStore, getThemeColors } from '../store/themeStore';
import Button from '../components/Button';

const Dashboard: React.FC = () => {
  const { user, signOut } = useAuthStore();
  const { theme } = useThemeStore();
  const themeColors = getThemeColors(theme);
  const [searchParams] = useSearchParams();
  const [subscription, setSubscription] = useState<any>(null);
  const [stripeSubscription, setStripeSubscription] = useState<any>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isDebugging, setIsDebugging] = useState(false);
  const { entitlements, isLoading: rcLoading, hasArtistAccess } = useRevenueCat();
  const checkoutStatus = searchParams.get('checkout');
  
  useEffect(() => {
    const loadSubscription = async () => {
      const sub = await getActiveSubscription();
      setSubscription(sub);
    };
    
    const loadStripeSubscription = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('stripe_user_subscriptions')
          .select('*')
          .maybeSingle();
        
        if (!error && data) {
          setStripeSubscription(data);
        }
      } catch (error) {
        console.error('Error loading Stripe subscription:', error);
      }
    };
    
    loadSubscription();
    loadStripeSubscription();
  }, [user]);

  const handleDebugPurchase = async () => {
    if (!user) return;
    
    setIsDebugging(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/debug-purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ user_id: user.id }),
      });

      if (response.ok) {
        const data = await response.json();
        setDebugInfo(data);
        console.log('Debug info:', data);
        
        // Refresh entitlements after debug
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        const error = await response.json();
        console.error('Debug failed:', error);
      }
    } catch (error) {
      console.error('Debug request failed:', error);
    } finally {
      setIsDebugging(false);
    }
  };

  // Determine artist access based on Stripe subscription
  const hasStripeArtistAccess = stripeSubscription?.subscription_status === 'active';
  const actualArtistAccess = hasArtistAccess || hasStripeArtistAccess;
  
  return (
    <div className="p-6 max-w-md mx-auto" style={{ backgroundColor: themeColors.background, minHeight: '100vh' }}>
      <h1 style={{ color: themeColors.text }} className="text-3xl font-bold mb-6">Welcome to Kapsule</h1>
      
      {checkoutStatus === 'success' && (
        <div className="bg-green-800 text-white p-4 rounded-lg mb-6">
          <p className="font-medium">🎉 Setup Complete!</p>
          <p className="text-sm mt-1">Your artist account is now active and ready to use.</p>
        </div>
      )}
      
      <div className="rounded-xl p-5 mb-6" style={{ backgroundColor: themeColors.cardBackground }}>
        <p style={{ color: themeColors.textSecondary }} className="mb-2">Signed in as:</p>
        <p style={{ color: themeColors.text }} className="font-medium">{user?.email}</p>
        
        {/* Stripe Subscription Info */}
        {stripeSubscription && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: themeColors.inputBackground }}>
            <p style={{ color: themeColors.textSecondary }} className="mb-2">Stripe Subscription:</p>
            <p style={{ color: themeColors.text }} className="font-medium capitalize">{stripeSubscription.subscription_status}</p>
            {stripeSubscription.current_period_end && (
              <p style={{ color: themeColors.textSecondary }} className="text-sm mt-1">
                Next billing: {new Date(stripeSubscription.current_period_end * 1000).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {/* Artist Access Status */}
        <div className="mt-4 pt-4 border-t" style={{ borderColor: themeColors.inputBackground }}>
          <p style={{ color: themeColors.textSecondary }} className="mb-2">Artist Access:</p>
          {actualArtistAccess ? (
            <div>
              <p className="text-green-400 font-medium">✅ Active</p>
              {stripeSubscription?.current_period_end && (
                <p style={{ color: themeColors.textSecondary }} className="text-sm mt-1">
                  Expires: {new Date(stripeSubscription.current_period_end * 1000).toLocaleDateString()}
                </p>
              )}
            </div>
          ) : (
            <p className="text-red-400 font-medium">❌ Not Active</p>
          )}
        </div>

        {/* RevenueCat Entitlements Info */}
        <div className="mt-4 pt-4 border-t" style={{ borderColor: themeColors.inputBackground }}>
          <p style={{ color: themeColors.textSecondary }} className="mb-2">RevenueCat Status:</p>
          {rcLoading ? (
            <p className="text-yellow-400">Checking entitlements...</p>
          ) : entitlements?.hasArtistEntitlement ? (
            <div>
              <p className="text-green-400 font-medium">✅ Active</p>
              {entitlements?.expiresDate && (
                <p style={{ color: themeColors.textSecondary }} className="text-sm mt-1">
                  Expires: {new Date(entitlements.expiresDate).toLocaleDateString()}
                </p>
              )}
            </div>
          ) : (
            <p className="text-red-400 font-medium">❌ Not Active</p>
          )}
          
          {entitlements?.warning && (
            <p className="text-yellow-400 text-xs mt-1">
              Note: {entitlements.warning}
            </p>
          )}
          
          {entitlements?.error && (
            <p className="text-red-400 text-xs mt-1">
              Error: {entitlements.error}
            </p>
          )}
        </div>
      </div>

      {/* Debug Purchase Flow Button */}
      {stripeSubscription?.subscription_status === 'active' && !hasArtistAccess && (
        <div className="bg-yellow-800 rounded-xl p-5 mb-6">
          <h3 className="text-white font-medium mb-3">🔧 Debug Purchase Flow</h3>
          <p className="text-yellow-200 text-sm mb-4">
            You have an active Stripe subscription but RevenueCat isn't recognizing it. 
            Click below to manually sync your purchase.
          </p>
          <button
            onClick={handleDebugPurchase}
            disabled={isDebugging}
            className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium"
          >
            {isDebugging ? 'Syncing...' : 'Sync Purchase with RevenueCat'}
          </button>
        </div>
      )}

      {/* Debug Info Display */}
      {debugInfo && (
        <div className="bg-blue-800 rounded-xl p-5 mb-6">
          <h3 className="text-white font-medium mb-3">🔍 Debug Results</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-blue-200">Stripe Customer:</span>
              <span className="text-white ml-2">{debugInfo.debug_info.has_stripe_customer ? '✅' : '❌'}</span>
            </div>
            <div>
              <span className="text-blue-200">Stripe Subscription:</span>
              <span className="text-white ml-2">{debugInfo.debug_info.stripe_subscription_active ? '✅ Active' : '❌ Inactive'}</span>
            </div>
            <div>
              <span className="text-blue-200">RevenueCat Subscriber:</span>
              <span className="text-white ml-2">{debugInfo.debug_info.has_revenuecat_subscriber ? '✅' : '❌'}</span>
            </div>
            <div>
              <span className="text-blue-200">RevenueCat Entitlements:</span>
              <span className="text-white ml-2">{Object.keys(debugInfo.debug_info.revenuecat_entitlements).length}</span>
            </div>
          </div>
          <p className="text-blue-200 text-xs mt-3">
            Page will refresh in 2 seconds to show updated status...
          </p>
        </div>
      )}
      
      <div className="rounded-xl p-5 mb-6" style={{ backgroundColor: themeColors.cardBackground }}>
        <h3 style={{ color: themeColors.text }} className="font-medium mb-3">Debug Information</h3>
        <div className="space-y-2 text-sm">
          <div>
            <span style={{ color: themeColors.textSecondary }}>User ID:</span>
            <span style={{ color: themeColors.text }} className="ml-2">{user?.id}</span>
          </div>
          <div>
            <span style={{ color: themeColors.textSecondary }}>Has Artist Access:</span>
            <span style={{ color: themeColors.text }} className="ml-2">{actualArtistAccess ? 'Yes' : 'No'}</span>
          </div>
          <div>
            <span style={{ color: themeColors.textSecondary }}>Stripe Subscription:</span>
            <span style={{ color: themeColors.text }} className="ml-2">{stripeSubscription?.subscription_status || 'None'}</span>
          </div>
          <div>
            <span style={{ color: themeColors.textSecondary }}>RevenueCat Loading:</span>
            <span style={{ color: themeColors.text }} className="ml-2">{rcLoading ? 'Yes' : 'No'}</span>
          </div>
          <div>
            <span style={{ color: themeColors.textSecondary }}>RevenueCat Access:</span>
            <span style={{ color: themeColors.text }} className="ml-2">{entitlements?.hasArtistEntitlement ? 'Yes' : 'No'}</span>
          </div>
          {entitlements?.error && (
            <div>
              <span style={{ color: themeColors.textSecondary }}>RevenueCat Error:</span>
              <span className="text-red-400 ml-2">{entitlements.error}</span>
            </div>
          )}
        </div>
      </div>
      
      <p style={{ color: themeColors.text }} className="mb-8">
        This dashboard shows your subscription status. Your payment has been processed by Stripe{actualArtistAccess ? ' and your artist access is active' : ', and we\'re working on linking it to RevenueCat for full feature access'}.
      </p>
      
      <Button onClick={signOut}>Sign Out</Button>
    </div>
  );
};

export default Dashboard;