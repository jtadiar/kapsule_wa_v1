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
    
    if (!revenueCatApiKey) {
      console.warn('RevenueCat API key not configured - returning default entitlements');
      return new Response(
        JSON.stringify({ 
          hasArtistEntitlement: false,
          entitlements: {},
          subscriber: null,
          expiresDate: null,
          warning: 'RevenueCat integration not configured'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Checking RevenueCat entitlements for user:', user_id);
    console.log('Using API key (first 10 chars):', revenueCatApiKey.substring(0, 10) + '...');

    // Check subscriber info from RevenueCat using Bearer authentication for secret keys
    const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${user_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${revenueCatApiKey}`,
        'Content-Type': 'application/json',
        'X-Platform': 'web'
      }
    });

    console.log('RevenueCat API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('RevenueCat API error details:', errorText);
      
      if (response.status === 404) {
        console.log('User not found in RevenueCat, returning no entitlements');
        return new Response(
          JSON.stringify({ 
            hasArtistEntitlement: false,
            entitlements: {},
            subscriber: null,
            expiresDate: null
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      // Return graceful fallback instead of throwing
      return new Response(
        JSON.stringify({ 
          hasArtistEntitlement: false,
          entitlements: {},
          subscriber: null,
          expiresDate: null,
          error: `RevenueCat API error: ${response.status} - ${errorText}`
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const subscriberData = await response.json();
    console.log('RevenueCat subscriber data:', JSON.stringify(subscriberData, null, 2));
    
    // Check for any active entitlements (more flexible approach)
    const entitlements = subscriberData.subscriber?.entitlements || {};
    
    // Look for any active entitlement that might indicate artist access
    let hasArtistEntitlement = false;
    let expiresDate = null;
    
    for (const [entitlementId, entitlement] of Object.entries(entitlements)) {
      const ent = entitlement as any;
      if (ent.expires_date && new Date(ent.expires_date) > new Date()) {
        hasArtistEntitlement = true;
        expiresDate = ent.expires_date;
        console.log(`Found active entitlement: ${entitlementId}, expires: ${ent.expires_date}`);
        break;
      }
    }

    const result = {
      hasArtistEntitlement,
      entitlements,
      subscriber: subscriberData.subscriber,
      expiresDate
    };

    console.log('Returning entitlements result:', result);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error checking entitlements:', error);
    return new Response(
      JSON.stringify({ 
        hasArtistEntitlement: false,
        entitlements: {},
        subscriber: null,
        expiresDate: null,
        error: 'Failed to check entitlements',
        details: error.message 
      }),
      { 
        status: 200, // Return 200 with error details instead of 500 to prevent frontend crashes
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});