import { 
  recordPurchaseInRevenueCat, 
  updateRevenueCatSubscriber, 
  updateLocalDatabase,
  getUserEmail,
  getUserDisplayName
} from '../_shared/stripe_rc_utils.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { session_id, user_id } = await req.json();
    
    if (!session_id || !user_id) {
      return new Response(
        JSON.stringify({ error: 'session_id and user_id are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const revenueCatApiKey = Deno.env.get('REVENUECAT_API_KEY');
    const revenueCatProductId = Deno.env.get('REVENUECAT_PRODUCT_ID') || 'prodf80630b359'; // Use env var or fallback
    
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Stripe secret key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('🔗 Linking Stripe session to user:', { session_id, user_id });

    // Retrieve the checkout session from Stripe
    const sessionResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${session_id}`, {
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
      },
    });

    if (!sessionResponse.ok) {
      const error = await sessionResponse.text();
      console.error('Failed to retrieve Stripe session:', error);
      throw new Error('Failed to retrieve checkout session');
    }

    const session = await sessionResponse.json();
    console.log('📋 Retrieved Stripe session:', session.id, 'for customer:', session.customer);

    // Update local database to link user_id with customer_id
    await updateLocalDatabase(user_id, session.customer, session);

    // If RevenueCat is configured, record the purchase
    if (revenueCatApiKey) {
      try {
        console.log('🎯 Setting up RevenueCat integration...');
        console.log('🆔 Using RevenueCat product ID:', revenueCatProductId);
        
        // Record the purchase in RevenueCat using the correct RevenueCat product ID
        // This will implicitly create the subscriber if they don't exist
        await recordPurchaseInRevenueCat({
          app_user_id: user_id,
          fetch_token: session.id,
          product_id: revenueCatProductId, // Use the correct RevenueCat product ID
          price: session.amount_total / 100, // Convert from cents
          currency: session.currency,
          is_restore: false,
          presented_offering_identifier: 'default'
        }, revenueCatApiKey);

        // Update subscriber attributes in RevenueCat
        await updateRevenueCatSubscriber(user_id, {
          $email: await getUserEmail(user_id),
          $displayName: await getUserDisplayName(user_id),
          subscription_status: 'active',
          stripe_customer_id: session.customer,
          source: 'web_signup'
        }, revenueCatApiKey);

        console.log('✅ Successfully linked Stripe payment to RevenueCat for user:', user_id);
      } catch (revenueCatError) {
        console.error('❌ RevenueCat integration failed:', revenueCatError);
        // Don't fail the entire operation if RevenueCat fails
        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'Stripe payment linked to user account, but RevenueCat integration failed',
            customer_id: session.customer,
            warning: 'RevenueCat integration failed - you may need to manually sync your subscription',
            error_details: revenueCatError.message
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    } else {
      console.warn('⚠️ RevenueCat API key not configured, skipping RevenueCat integration');
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Successfully linked Stripe payment to user account and RevenueCat',
        customer_id: session.customer
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Error linking Stripe to RevenueCat:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to link payment to user account',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});