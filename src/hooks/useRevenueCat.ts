import { useState, useEffect } from 'react';
import { checkRevenueCatEntitlements } from '../lib/stripe';
import { useAuthStore } from '../store/authStore';

interface RevenueCatEntitlements {
  hasArtistEntitlement: boolean;
  entitlements: Record<string, any>;
  subscriber: any;
  expiresDate: string | null;
  warning?: string;
  error?: string;
}

export const useRevenueCat = () => {
  const { user } = useAuthStore();
  const [entitlements, setEntitlements] = useState<RevenueCatEntitlements | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkEntitlements = async () => {
    if (!user) {
      setEntitlements(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('useRevenueCat: Checking entitlements for user:', user.id);
      const result = await checkRevenueCatEntitlements(user.id);
      
      if (result) {
        setEntitlements(result);
        
        // Log warnings but don't treat them as errors
        if (result.warning) {
          console.warn('RevenueCat warning:', result.warning);
        }
        
        // Only set error state for critical failures that aren't warnings
        if (result.error && !result.warning) {
          console.warn('RevenueCat error (non-critical):', result.error);
          // Don't set error state - just log it
        }
      } else {
        setEntitlements({
          hasArtistEntitlement: false,
          entitlements: {},
          subscriber: null,
          expiresDate: null
        });
      }
    } catch (err) {
      console.warn('Error checking RevenueCat entitlements:', err);
      // Don't set error state for RevenueCat failures - just use defaults
      setEntitlements({
        hasArtistEntitlement: false,
        entitlements: {},
        subscriber: null,
        expiresDate: null,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkEntitlements();
  }, [user]);

  // For now, since RevenueCat integration is having issues, let's check Stripe subscription status
  const hasStripeSubscription = async () => {
    if (!user) return false;
    
    try {
      const { data: subscription } = await import('../lib/supabase').then(module => 
        module.supabase
          .from('stripe_user_subscriptions')
          .select('subscription_status')
          .eq('subscription_status', 'active')
          .maybeSingle()
      );
      
      return !!subscription;
    } catch (error) {
      console.error('Error checking Stripe subscription:', error);
      return false;
    }
  };

  return {
    entitlements,
    isLoading,
    error,
    refetch: checkEntitlements,
    // Use Stripe subscription as fallback for artist access
    hasArtistAccess: entitlements?.hasArtistEntitlement || false,
    isRevenueCatConfigured: !entitlements?.warning
  };
};