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
    const signature = req.headers.get('stripe-signature');
    
    if (!signature) {
      console.error('No Stripe signature found in request headers');
      return new Response(
        JSON.stringify({ error: 'No signature provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const body = await req.text();
    
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    
    if (!stripeWebhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verifying Stripe webhook signature...');
    console.log('Signature from headers:', signature);
    
    // Verify Stripe webhook signature using the Stripe library
    let event;
    try {
      // Import Stripe library
      const { Stripe } = await import('npm:stripe@14.21.0');
      const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;
      const stripe = new Stripe(stripeSecretKey);
      
      // Use Stripe's ASYNC webhook construction to verify signature
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
      console.log('✅ Signature verification successful');
    } catch (err) {
      console.error(`⚠️ Webhook signature verification failed:`, err);
      return new Response(
        JSON.stringify({ error: 'Invalid signature', details: err.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing Stripe event:', event.type);

    // Import Supabase client
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle different Stripe events
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object, supabase);
        break;
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object, supabase);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object, supabase);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object, supabase);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleCheckoutCompleted(session: any, supabase: any) {
  console.log('🎉 Processing checkout.session.completed');
  console.log('📋 Session metadata:', session.metadata);
  
  const customerId = session.customer;
  const userId = session.metadata?.user_id;
  
  // Update local database for checkout completion
  try {
    // Store customer data
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

    // If user ID is provided, update artist profile subscription tier
    if (userId) {
      const { error: artistError } = await supabase
        .from('artist_profiles')
        .update({ 
          subscription_tier: 'pro',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (artistError) {
        console.error('Error updating artist profile:', artistError);
      } else {
        console.log('✅ Successfully updated artist profile subscription status');
      }
    }

    console.log('✅ Successfully updated local database');
  } catch (error) {
    console.error('Error updating local database:', error);
  }
  
  console.log('✅ Checkout completed for customer:', customerId);
}

async function handleInvoicePaymentSucceeded(invoice: any, supabase: any) {
  console.log('💳 Processing invoice.payment_succeeded');
  
  // This handles recurring subscription payments for existing users
  const customerId = invoice.customer;
  const subscriptionId = invoice.subscription;
  
  try {
    // Get user_id from your database using customer_id
    const { data: customerData, error: customerError } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .single();

    if (customerError) {
      console.error('Error fetching customer data:', customerError);
      return;
    }

    const userId = customerData?.user_id;
    
    if (!userId) {
      console.error('No user found for customer:', customerId);
      return;
    }

    // Update subscription status
    const { error: subscriptionError } = await supabase
      .from('stripe_subscriptions')
      .upsert({
        customer_id: customerId,
        subscription_id: subscriptionId,
        status: 'active',
        updated_at: new Date().toISOString()
      });

    if (subscriptionError) {
      console.error('Error updating subscription record:', subscriptionError);
    }

    // Update artist profile subscription tier
    const { error: artistError } = await supabase
      .from('artist_profiles')
      .update({ 
        subscription_tier: 'pro',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (artistError) {
      console.error('Error updating artist profile:', artistError);
    } else {
      console.log('✅ Successfully updated artist profile subscription status');
    }

    console.log('✅ Successfully processed invoice payment');
  } catch (error) {
    console.error('Error processing invoice payment:', error);
  }
}

async function handleSubscriptionUpdated(subscription: any, supabase: any) {
  console.log('🔄 Processing customer.subscription.updated');
  
  const customerId = subscription.customer;
  const status = subscription.status;
  
  try {
    // Get user_id from your database using customer_id
    const { data: customerData, error: customerError } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .single();

    if (customerError) {
      console.error('Error fetching customer data:', customerError);
      return;
    }

    const userId = customerData?.user_id;
    
    if (!userId) {
      console.error('No user found for customer:', customerId);
      return;
    }

    // Update subscription status
    const { error: subscriptionError } = await supabase
      .from('stripe_subscriptions')
      .upsert({
        customer_id: customerId,
        subscription_id: subscription.id,
        status: status,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString()
      });

    if (subscriptionError) {
      console.error('Error updating subscription record:', subscriptionError);
    }

    // Update artist profile subscription tier based on subscription status
    const artistTier = status === 'active' ? 'pro' : 'basic';
    const { error: artistError } = await supabase
      .from('artist_profiles')
      .update({ 
        subscription_tier: artistTier,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (artistError) {
      console.error('Error updating artist profile:', artistError);
    } else {
      console.log(`✅ Successfully updated artist profile subscription status to ${artistTier}`);
    }

    console.log('✅ Successfully processed subscription update');
  } catch (error) {
    console.error('Error processing subscription update:', error);
  }
}

async function handleSubscriptionDeleted(subscription: any, supabase: any) {
  console.log('❌ Processing customer.subscription.deleted');
  
  const customerId = subscription.customer;
  
  try {
    // Get user_id from your database using customer_id
    const { data: customerData, error: customerError } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .single();

    if (customerError) {
      console.error('Error fetching customer data:', customerError);
      return;
    }

    const userId = customerData?.user_id;
    
    if (!userId) {
      console.error('No user found for customer:', customerId);
      return;
    }

    // Update subscription status
    const { error: subscriptionError } = await supabase
      .from('stripe_subscriptions')
      .upsert({
        customer_id: customerId,
        subscription_id: subscription.id,
        status: 'canceled',
        updated_at: new Date().toISOString()
      });

    if (subscriptionError) {
      console.error('Error updating subscription record:', subscriptionError);
    }

    // Update artist profile subscription tier to basic
    const { error: artistError } = await supabase
      .from('artist_profiles')
      .update({ 
        subscription_tier: 'basic',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (artistError) {
      console.error('Error updating artist profile:', artistError);
    } else {
      console.log('✅ Successfully downgraded artist profile to basic tier');
    }

    console.log('✅ Successfully processed subscription deletion');
  } catch (error) {
    console.error('Error processing subscription deletion:', error);
  }
}