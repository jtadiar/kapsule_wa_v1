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
    console.log('🎯 RevenueCat webhook received');
    console.log('📋 Request method:', req.method);
    console.log('📋 Request headers:', Object.fromEntries(req.headers.entries()));
    
    // Get the webhook secret for verification
    const webhookSecret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('❌ REVENUECAT_WEBHOOK_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }), 
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('🔑 Expected webhook secret (first 20 chars):', webhookSecret.substring(0, 20) + '...');

    // Verify the Authorization header
    const authHeader = req.headers.get('authorization');
    console.log('🔐 Received full auth:', authHeader ? authHeader.substring(0, 20) + '...' : 'None');
    console.log('🔐 Expected full auth:', webhookSecret.substring(0, 20) + '...');
    
    if (!authHeader) {
      console.error('❌ Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }), 
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // ✅ FIXED: Compare the full Authorization header with the webhook secret
    // The REVENUECAT_WEBHOOK_SECRET already includes the full "Bearer kapsule_rc_sk_..." value
    if (authHeader !== webhookSecret) {
      console.error('❌ Invalid webhook token');
      console.error('Expected full auth:', webhookSecret.substring(0, 20) + '...');
      console.error('Received full auth:', authHeader.substring(0, 20) + '...');
      return new Response(JSON.stringify({ error: 'Invalid webhook token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Webhook token validated successfully');

    // Parse the request body
    const body = await req.json();
    console.log('📦 RevenueCat webhook payload received:');
    console.log(JSON.stringify(body, null, 2));

    const event = body.event;
    if (!event) {
      console.error('❌ No event data in webhook payload');
      return new Response(
        JSON.stringify({ error: 'No event data found in payload' }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('🎪 Processing RevenueCat event type:', event.type);
    console.log('👤 App user ID:', event.app_user_id);
    console.log('📦 Product ID:', event.product_id);

    // Import Supabase client
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle different RevenueCat events
    switch (event.type) {
      case 'INITIAL_PURCHASE':
        console.log('🎉 Processing INITIAL_PURCHASE');
        await handleInitialPurchase(event, supabase);
        break;
      
      case 'RENEWAL':
        console.log('🔄 Processing RENEWAL');
        await handleRenewal(event, supabase);
        break;
      
      case 'CANCELLATION':
        console.log('❌ Processing CANCELLATION');
        await handleCancellation(event, supabase);
        break;
      
      case 'EXPIRATION':
        console.log('⏰ Processing EXPIRATION');
        await handleExpiration(event, supabase);
        break;
      
      case 'BILLING_ISSUE':
        console.log('💳 Processing BILLING_ISSUE');
        await handleBillingIssue(event, supabase);
        break;
      
      case 'PRODUCT_CHANGE':
        console.log('🔄 Processing PRODUCT_CHANGE');
        await handleProductChange(event, supabase);
        break;
      
      case 'SUBSCRIBER_ALIAS':
        console.log('👥 Processing SUBSCRIBER_ALIAS');
        await handleSubscriberAlias(event, supabase);
        break;
      
      default:
        console.log(`❓ Unhandled RevenueCat event type: ${event.type}`);
        console.log('📋 Full event data:', JSON.stringify(event, null, 2));
    }

    console.log('✅ RevenueCat webhook processed successfully');
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook processed successfully',
        event_type: event.type,
        app_user_id: event.app_user_id
      }), 
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('💥 Error processing RevenueCat webhook:', error);
    console.error('Stack trace:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: 'Webhook processing failed',
        details: error.message,
        stack: error.stack
      }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function handleInitialPurchase(event: any, supabase: any) {
  console.log('🎯 Processing INITIAL_PURCHASE for user:', event.app_user_id);
  
  const userId = event.app_user_id;
  const productId = event.product_id;
  const entitlements = event.entitlements || {};
  
  if (!userId) {
    console.error('❌ No app_user_id found in event');
    return;
  }

  console.log('🔍 Checking entitlements:', Object.keys(entitlements));
  console.log('📦 Product purchased:', productId);

  // Check if user has artist entitlement using the correct entitlement ID
  const hasArtistEntitlement = Object.values(entitlements).some((entitlement: any) => {
    const isActive = entitlement.expires_date && new Date(entitlement.expires_date) > new Date();
    const isArtistProduct = entitlement.product_identifier === 'prodf80630b359'; // Use the correct RevenueCat entitlement ID
    console.log(`📋 Entitlement ${entitlement.product_identifier}: active=${isActive}, expires=${entitlement.expires_date}, isArtistProduct=${isArtistProduct}`);
    return isActive && isArtistProduct;
  });

  console.log(`🎨 User ${userId} has artist entitlement: ${hasArtistEntitlement}`);

  if (hasArtistEntitlement) {
    // Update user's subscription status in your database
    await updateUserSubscriptionStatus(userId, 'active', supabase);
    
    // Create artist profile if it doesn't exist
    await ensureArtistProfile(userId, supabase);
    
    console.log('✅ Successfully processed initial purchase for user:', userId);
  }
}

async function handleRenewal(event: any, supabase: any) {
  console.log('🔄 Processing RENEWAL for user:', event.app_user_id);
  
  const userId = event.app_user_id;
  const entitlements = event.entitlements || {};
  
  // Check if artist entitlement is still active using the correct entitlement ID
  const hasArtistEntitlement = Object.values(entitlements).some((entitlement: any) => 
    entitlement.product_identifier === 'prodf80630b359' && 
    entitlement.expires_date && new Date(entitlement.expires_date) > new Date()
  );

  if (hasArtistEntitlement) {
    await updateUserSubscriptionStatus(userId, 'active', supabase);
    console.log('✅ Successfully processed renewal for user:', userId);
  }
}

async function handleCancellation(event: any, supabase: any) {
  console.log('❌ Processing CANCELLATION for user:', event.app_user_id);
  
  const userId = event.app_user_id;
  
  // Update subscription status to cancelled
  await updateUserSubscriptionStatus(userId, 'cancelled', supabase);
  console.log('✅ Successfully processed cancellation for user:', userId);
}

async function handleExpiration(event: any, supabase: any) {
  console.log('⏰ Processing EXPIRATION for user:', event.app_user_id);
  
  const userId = event.app_user_id;
  
  // Update subscription status to expired
  await updateUserSubscriptionStatus(userId, 'expired', supabase);
  console.log('✅ Successfully processed expiration for user:', userId);
}

async function handleBillingIssue(event: any, supabase: any) {
  console.log('💳 Processing BILLING_ISSUE for user:', event.app_user_id);
  
  const userId = event.app_user_id;
  
  // Update subscription status to indicate billing issue
  await updateUserSubscriptionStatus(userId, 'billing_issue', supabase);
  console.log('✅ Successfully processed billing issue for user:', userId);
}

async function handleProductChange(event: any, supabase: any) {
  console.log('🔄 Processing PRODUCT_CHANGE for user:', event.app_user_id);
  
  const userId = event.app_user_id;
  const entitlements = event.entitlements || {};
  
  // Check if user still has artist entitlement after product change using the correct entitlement ID
  const hasArtistEntitlement = Object.values(entitlements).some((entitlement: any) => 
    entitlement.product_identifier === 'prodf80630b359' && 
    entitlement.expires_date && new Date(entitlement.expires_date) > new Date()
  );

  const status = hasArtistEntitlement ? 'active' : 'basic';
  await updateUserSubscriptionStatus(userId, status, supabase);
  console.log('✅ Successfully processed product change for user:', userId);
}

async function handleSubscriberAlias(event: any, supabase: any) {
  console.log('👥 Processing SUBSCRIBER_ALIAS for user:', event.app_user_id);
  
  // This event is fired when a subscriber is aliased to another subscriber
  // Usually happens when anonymous users sign up
  // For now, just log it - you might want to handle user merging logic here
  
  console.log('📋 Alias event details:', {
    app_user_id: event.app_user_id,
    original_app_user_id: event.original_app_user_id
  });
  
  console.log('✅ Successfully logged subscriber alias event');
}

async function updateUserSubscriptionStatus(userId: string, status: string, supabase: any) {
  try {
    console.log(`📝 Updating subscription status for user ${userId} to ${status}`);
    
    // Update artist profile subscription status
    const { error: artistError } = await supabase
      .from('artist_profiles')
      .update({ 
        subscription_tier: status === 'active' ? 'pro' : 'basic',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (artistError) {
      console.error('❌ Error updating artist profile:', artistError);
    } else {
      console.log('✅ Successfully updated artist profile subscription status');
    }

    console.log(`✅ Updated subscription status for user ${userId} to ${status}`);
    
  } catch (error) {
    console.error('❌ Error updating user subscription status:', error);
  }
}

async function ensureArtistProfile(userId: string, supabase: any) {
  try {
    console.log(`🎨 Ensuring artist profile exists for user: ${userId}`);
    
    // Check if artist profile already exists
    const { data: existingProfile } = await supabase
      .from('artist_profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingProfile) {
      console.log('🆕 Creating new artist profile');
      
      // Get user data from auth
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      
      if (userData?.user) {
        const userMetadata = userData.user.user_metadata || {};
        
        // Create artist profile
        const { error: profileError } = await supabase
          .from('artist_profiles')
          .insert({
            id: userId,
            username: userMetadata.username || '',
            artist_name: userMetadata.artist_name || '',
            email: userData.user.email,
            subscription_tier: 'pro',
            verification_status: 'none',
            followers: 0,
            gold_badge_applied: false
          });

        if (profileError) {
          console.error('❌ Error creating artist profile:', profileError);
        } else {
          console.log('✅ Created artist profile for user:', userId);
        }
      }
    } else {
      console.log('✅ Artist profile already exists for user:', userId);
    }
    
  } catch (error) {
    console.error('❌ Error ensuring artist profile:', error);
  }
}