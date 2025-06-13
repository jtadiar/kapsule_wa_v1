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
    const { user_id } = await req.json();
    
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const revenueCatApiKey = Deno.env.get('REVENUECAT_API_KEY');
    const revenueCatProductId = Deno.env.get('REVENUECAT_PRODUCT_ID') || 'prodf80630b359'; // Use env var or fallback
    
    if (!revenueCatApiKey) {
      return new Response(
        JSON.stringify({ error: 'RevenueCat API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('🔍 Debugging purchase flow for user:', user_id);
    console.log('🆔 Using RevenueCat product ID:', revenueCatProductId);

    // Check Supabase for Stripe data
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Stripe customer data
    const { data: customerData, error: customerError } = await supabase
      .from('stripe_customers')
      .select('*')
      .eq('user_id', user_id)
      .single();

    console.log('💳 Stripe customer data:', customerData);

    // Get Stripe subscription data
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('stripe_user_subscriptions')
      .select('*')
      .single();

    console.log('📋 Stripe subscription data:', subscriptionData);

    // Check RevenueCat subscriber
    const rcResponse = await fetch(`https://api.revenuecat.com/v1/subscribers/${user_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${revenueCatApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    let revenueCatData = null;
    if (rcResponse.ok) {
      revenueCatData = await rcResponse.json();
      console.log('🎯 RevenueCat subscriber data:', JSON.stringify(revenueCatData, null, 2));
    } else {
      console.log('❌ RevenueCat subscriber not found:', rcResponse.status);
    }

    // If user has Stripe subscription but no RevenueCat data, create it
    if (subscriptionData?.subscription_status === 'active' && !revenueCatData) {
      console.log('🔧 Creating RevenueCat subscriber and recording purchase...');
      
      try {
        // Create subscriber
        const createResponse = await fetch(`https://api.revenuecat.com/v1/subscribers/${user_id}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${revenueCatApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            app_user_id: user_id,
            attributes: {
              source: 'stripe_web_manual'
            }
          })
        });

        if (createResponse.ok) {
          console.log('✅ Created RevenueCat subscriber');
          
          // Record the purchase using the correct RevenueCat product ID
          const purchaseResponse = await fetch(`https://api.revenuecat.com/v1/subscribers/${user_id}/receipts`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${revenueCatApiKey}`,
              'Content-Type': 'application/json',
              'X-Platform': 'stripe'
            },
            body: JSON.stringify({
              fetch_token: subscriptionData.subscription_id || 'manual_' + Date.now(),
              product_id: revenueCatProductId, // Use the correct RevenueCat product ID
              price: 10.99,
              currency: 'GBP',
              is_restore: false,
              presented_offering_identifier: 'default'
            })
          });

          if (purchaseResponse.ok) {
            console.log('✅ Recorded purchase in RevenueCat');
            
            // Get updated subscriber data
            const updatedResponse = await fetch(`https://api.revenuecat.com/v1/subscribers/${user_id}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${revenueCatApiKey}`,
                'Content-Type': 'application/json'
              }
            });

            if (updatedResponse.ok) {
              revenueCatData = await updatedResponse.json();
            }
          } else {
            const purchaseError = await purchaseResponse.text();
            console.error('❌ Failed to record purchase:', purchaseError);
          }
        } else {
          const createError = await createResponse.text();
          console.error('❌ Failed to create subscriber:', createError);
        }
      } catch (error) {
        console.error('❌ Error in manual RevenueCat setup:', error);
      }
    }

    return new Response(
      JSON.stringify({
        user_id,
        stripe_customer: customerData,
        stripe_subscription: subscriptionData,
        revenuecat_subscriber: revenueCatData,
        debug_info: {
          has_stripe_customer: !!customerData,
          has_stripe_subscription: !!subscriptionData,
          stripe_subscription_active: subscriptionData?.subscription_status === 'active',
          has_revenuecat_subscriber: !!revenueCatData,
          revenuecat_entitlements: revenueCatData?.subscriber?.entitlements || {},
          revenuecat_product_id_used: revenueCatProductId
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in debug function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Debug function failed',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});