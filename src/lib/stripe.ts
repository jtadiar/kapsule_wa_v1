import { supabase } from './supabase';
import { products } from '../stripe-config';

export async function createCheckoutSession(priceId: string, mode: 'payment' | 'subscription', successUrl?: string, cancelUrl?: string) {
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      price_id: priceId,
      success_url: successUrl || `${window.location.origin}/signup/artist?checkout=success`,
      cancel_url: cancelUrl || `${window.location.origin}/artist-subscription?checkout=cancelled`,
      mode,
      metadata: {
        product_id: 'artist_subscription'
      }
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create checkout session');
  }

  const { url } = await response.json();
  return url;
}

export async function redirectToCheckout(productId: keyof typeof products) {
  const product = products[productId];
  const checkoutUrl = await createCheckoutSession(product.priceId, product.mode);
  window.location.href = checkoutUrl;
}

export async function getActiveSubscription() {
  const { data: subscription, error } = await supabase
    .from('stripe_user_subscriptions')
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }

  return subscription;
}

// Enhanced function to check RevenueCat entitlements with better error handling
export async function checkRevenueCatEntitlements(userId: string) {
  try {
    console.log('Checking RevenueCat entitlements for user:', userId);
    
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-entitlements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        user_id: userId
      }),
    });

    if (!response.ok) {
      console.warn('RevenueCat entitlements check failed:', response.status);
      // Return default entitlements instead of throwing
      return {
        hasArtistEntitlement: false,
        entitlements: {},
        subscriber: null,
        expiresDate: null,
        error: `HTTP ${response.status}`
      };
    }

    const data = await response.json();
    console.log('RevenueCat entitlements response:', data);
    
    // Handle case where RevenueCat is not configured
    if (data.warning) {
      console.warn('RevenueCat integration warning:', data.warning);
    }
    
    return data;
  } catch (error) {
    console.warn('Error checking RevenueCat entitlements:', error);
    // Return default entitlements instead of throwing to prevent app crashes
    return {
      hasArtistEntitlement: false,
      entitlements: {},
      subscriber: null,
      expiresDate: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}