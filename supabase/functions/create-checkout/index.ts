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
    const { price_id, success_url, cancel_url, mode, metadata, user_id } = await req.json();
    
    // Validate required parameters
    if (!price_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: price_id' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!success_url || !cancel_url) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: success_url and cancel_url' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    
    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY environment variable not found');
      return new Response(
        JSON.stringify({ error: 'Stripe configuration missing. Please contact support.' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Creating checkout session with price_id:', price_id);
    console.log('Mode:', mode);
    console.log('User ID for RevenueCat:', user_id);

    // Create Stripe checkout session
    const stripeBody = new URLSearchParams({
      'payment_method_types[]': 'card',
      'line_items[0][price]': price_id,
      'line_items[0][quantity]': '1',
      'mode': mode || 'subscription',
      'success_url': `${success_url}&session_id={CHECKOUT_SESSION_ID}`,
      'cancel_url': cancel_url,
    });

    // Add metadata for RevenueCat integration
    if (metadata?.product_id) {
      stripeBody.append('metadata[product_id]', metadata.product_id);
    }
    stripeBody.append('metadata[source]', 'web_signup');
    
    // ✅ CRITICAL: Add RevenueCat user ID metadata with the EXACT key RevenueCat expects
    if (user_id) {
      stripeBody.append('metadata[revenuecat_app_user_id]', user_id);
      // Also add as $RCAnonymousID for RevenueCat's automatic detection
      stripeBody.append('metadata[$RCAnonymousID]', user_id);
      console.log('✅ Added RevenueCat user ID to metadata:', user_id);
    } else {
      console.warn('⚠️ No user_id provided - RevenueCat tracking may not work properly');
    }

    console.log('Sending request to Stripe API...');

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: stripeBody,
    });

    const responseText = await response.text();
    console.log('Stripe API response status:', response.status);

    if (!response.ok) {
      console.error('Stripe API error:', responseText);
      
      let errorMessage = 'Failed to create checkout session';
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }
      } catch (e) {
        console.error('Failed to parse Stripe error response:', e);
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Stripe checkout failed',
          details: errorMessage,
          stripe_error: responseText
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const session = JSON.parse(responseText);
    console.log('✅ Checkout session created successfully:', session.id);
    console.log('✅ Session metadata:', session.metadata);
    
    return new Response(
      JSON.stringify({ url: session.url }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});