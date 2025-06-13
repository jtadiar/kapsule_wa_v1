// Shared utility functions for Stripe and RevenueCat integration

export interface PurchaseData {
  app_user_id: string;
  fetch_token: string;
  product_id: string;
  price: number;
  currency: string;
  is_restore: boolean;
  presented_offering_identifier: string;
}

export interface SubscriberAttributes {
  $email?: string;
  $displayName?: string;
  subscription_status?: string;
  current_period_end?: number;
  canceled_at?: number;
  [key: string]: any;
}

export async function recordPurchaseInRevenueCat(purchaseData: PurchaseData, apiKey: string) {
  try {
    console.log('Recording purchase in RevenueCat for user:', purchaseData.app_user_id);
    console.log('Using product ID:', purchaseData.product_id);
    console.log('Using API key (first 10 chars):', apiKey.substring(0, 10) + '...');
    
    const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${purchaseData.app_user_id}/receipts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Platform': 'stripe'
      },
      body: JSON.stringify({
        fetch_token: purchaseData.fetch_token,
        product_id: purchaseData.product_id,
        price: purchaseData.price,
        currency: purchaseData.currency,
        is_restore: purchaseData.is_restore,
        presented_offering_identifier: purchaseData.presented_offering_identifier,
        attributes: {
          source: 'web'
        }
      })
    });

    console.log('RevenueCat purchase API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('RevenueCat API error:', response.status, errorText);
      throw new Error(`RevenueCat API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Successfully recorded purchase in RevenueCat:', result);
    return result;
    
  } catch (error) {
    console.error('Error recording purchase in RevenueCat:', error);
    throw error;
  }
}

export async function updateRevenueCatSubscriber(userId: string, attributes: SubscriberAttributes, apiKey: string) {
  try {
    console.log('Updating RevenueCat subscriber:', userId);
    console.log('Using API key (first 10 chars):', apiKey.substring(0, 10) + '...');
    
    const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${userId}/attributes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        attributes
      })
    });

    console.log('RevenueCat subscriber update response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('RevenueCat subscriber update error:', response.status, errorText);
      throw new Error(`RevenueCat API error: ${response.status} - ${errorText}`);
    }

    console.log('Successfully updated RevenueCat subscriber');
    return await response.json();
    
  } catch (error) {
    console.error('Error updating RevenueCat subscriber:', error);
    throw error;
  }
}

export async function getSupabaseClient() {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function getUserIdFromCustomerId(customerId: string): Promise<string | null> {
  try {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .single();

    if (error) {
      console.error('Error fetching user_id:', error);
      return null;
    }

    return data?.user_id || null;
    
  } catch (error) {
    console.error('Error in getUserIdFromCustomerId:', error);
    return null;
  }
}

export async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase.auth.admin.getUserById(userId);

    if (error) {
      console.error('Error fetching user email:', error);
      return null;
    }

    return data?.user?.email || null;
    
  } catch (error) {
    console.error('Error in getUserEmail:', error);
    return null;
  }
}

export async function getUserDisplayName(userId: string): Promise<string | null> {
  try {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from('profiles')
      .select('username, artist_name')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user display name:', error);
      return null;
    }

    return data?.artist_name || data?.username || null;
    
  } catch (error) {
    console.error('Error in getUserDisplayName:', error);
    return null;
  }
}

export async function updateLocalDatabase(userId: string | null, customerId: string, session: any) {
  try {
    const supabase = await getSupabaseClient();

    // Update or insert customer record
    const customerData: any = {
      customer_id: customerId,
      updated_at: new Date().toISOString()
    };

    // Only set user_id if provided
    if (userId) {
      customerData.user_id = userId;
    }

    const { error: customerError } = await supabase
      .from('stripe_customers')
      .upsert(customerData);

    if (customerError) {
      console.error('Error updating customer record:', customerError);
    }

    // If this is a subscription, update subscription record
    if (session.subscription) {
      const { error: subscriptionError } = await supabase
        .from('stripe_subscriptions')
        .upsert({
          customer_id: customerId,
          subscription_id: session.subscription,
          status: 'active',
          updated_at: new Date().toISOString()
        });

      if (subscriptionError) {
        console.error('Error updating subscription record:', subscriptionError);
      }
    }

    console.log('Successfully updated local database');
    
  } catch (error) {
    console.error('Error updating local database:', error);
  }
}