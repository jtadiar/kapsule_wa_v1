const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 Starting tutor-response function');
    
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('📝 Request body parsed successfully');
    } catch (error) {
      console.error('❌ Failed to parse request body:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { prompt, conversationHistory = [], user_id } = requestBody;

    if (!prompt) {
      console.error('❌ No prompt provided');
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Prompt received:', prompt.substring(0, 100) + '...');
    console.log('👤 User ID:', user_id || 'anonymous');

    // Check for required environment variables
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const elevenlabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    const spotifyClientId = Deno.env.get('SPOTIFY_CLIENT_ID');
    const spotifyClientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');

    console.log('🔑 Environment variables check:');
    console.log('- OPENAI_API_KEY:', openaiApiKey ? '✅ Present' : '❌ Missing');
    console.log('- ELEVENLABS_API_KEY:', elevenlabsApiKey ? '✅ Present' : '❌ Missing');
    console.log('- SPOTIFY_CLIENT_ID:', spotifyClientId ? '✅ Present' : '❌ Missing');
    console.log('- SPOTIFY_CLIENT_SECRET:', spotifyClientSecret ? '✅ Present' : '❌ Missing');

    if (!openaiApiKey) {
      console.error('❌ OPENAI_API_KEY environment variable is missing');
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API key not configured. Please set the OPENAI_API_KEY environment variable in your Supabase project settings.',
          details: 'Missing OPENAI_API_KEY'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!elevenlabsApiKey) {
      console.error('❌ ELEVENLABS_API_KEY environment variable is missing');
      return new Response(
        JSON.stringify({ 
          error: 'ElevenLabs API key not configured. Please set the ELEVENLABS_API_KEY environment variable in your Supabase project settings.',
          details: 'Missing ELEVENLABS_API_KEY'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client for user genre memory
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Load comprehensive music knowledge from master tracks and genres
    let masterTracks = [];
    let genresList = [];

    try {
      console.log('📚 Loading master tracks database...');
      
      // Load master tracks from the correct URL
      const masterTracksResponse = await fetch('https://fihjahpokzdqomytswpy.supabase.co/storage/v1/object/sign/assets/Model%20Files/master_tracks.json?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82MmU3MzViMy00NTE1LTRlZDctODY0My0wMWY2NWQxZjk2ZWIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhc3NldHMvTW9kZWwgRmlsZXMvbWFzdGVyX3RyYWNrcy5qc29uIiwiaWF0IjoxNzQ5NDc1NzY1LCJleHAiOjIwNjQ4MzU3NjV9.YMf1F2uzH1pN88BwIQyvS1cA7dHeSjlG7LgUmebKQlQ');
      if (masterTracksResponse.ok) {
        const masterTracksData = await masterTracksResponse.json();
        if (Array.isArray(masterTracksData)) {
          masterTracks = masterTracksData;
        } else if (masterTracksData.tracks && Array.isArray(masterTracksData.tracks)) {
          masterTracks = masterTracksData.tracks;
        }
        console.log('✅ Loaded master tracks database with', masterTracks.length, 'tracks');
      } else {
        console.warn('⚠️ Could not load master tracks database');
      }

      // Load Discogs genres master list
      const genresResponse = await fetch('https://fihjahpokzdqomytswpy.supabase.co/storage/v1/object/public/assets/model%20files/discogs_genres_master_list.json');
      if (genresResponse.ok) {
        const genresData = await genresResponse.json();
        if (Array.isArray(genresData)) {
          genresList = genresData;
        } else if (typeof genresData === 'object') {
          genresList = Object.keys(genresData);
        }
        console.log('✅ Loaded Discogs genres master list with', genresList.length, 'genres');
      } else {
        console.warn('⚠️ Could not load Discogs genres master list');
      }
      
    } catch (error) {
      console.warn('⚠️ Could not load complete music knowledge:', error);
    }

    // Define the known genres from the discogs master list
    const knownGenres = [
      "House",
      "Techno", 
      "Ambient",
      "Electro",
      "Trance",
      "Disco",
      "Tech House",
      "Deep House",
      "Drum n Bass",
      "Progressive House",
      "Minimal",
      "Breakbeat",
      "Breaks",
      "Electro House",
      "Acid",
      "Dubstep",
      "Dub",
      "Funk",
      "Trip Hop",
      "Jungle",
      "Garage House",
      "UK Garage",
      "Garage"
    ];

    // ✅ ENHANCED: Improved genre detection with priority for current prompt
    const detectGenre = (text: string): string => {
      const lowerText = text.toLowerCase();
      
      // Check against known genres first - prioritize exact matches
      for (const genre of knownGenres) {
        const genreLower = genre.toLowerCase();
        // Look for exact word matches to avoid false positives
        const genreRegex = new RegExp(`\\b${genreLower.replace(/\s+/g, '\\s+')}\\b`, 'i');
        if (genreRegex.test(lowerText)) {
          console.log('🎵 Detected genre from known list:', genre);
          return genreLower;
        }
      }
      
      // Check against loaded genres list if available
      if (genresList.length > 0) {
        for (const genre of genresList) {
          const genreLower = genre.toLowerCase();
          const genreRegex = new RegExp(`\\b${genreLower.replace(/\s+/g, '\\s+')}\\b`, 'i');
          if (genreRegex.test(lowerText)) {
            console.log('🎵 Detected genre from Discogs list:', genre);
            return genreLower;
          }
        }
      }
      
      return 'electronic'; // Default fallback
    };

    // ✅ FIXED: Prioritize current prompt for genre detection, then check conversation history
    let conversationGenre = 'electronic';
    
    // First, check the current prompt for genre mentions (highest priority)
    const currentPromptGenre = detectGenre(prompt);
    if (currentPromptGenre !== 'electronic') {
      conversationGenre = currentPromptGenre;
      console.log('🎯 Detected genre from CURRENT PROMPT:', conversationGenre);
    } else {
      // Only check conversation history if no genre found in current prompt
      const recentMessages = conversationHistory.slice(-3); // Only check last 3 messages
      const recentConversation = recentMessages.map((msg: any) => msg.content).join(' ');
      const historyGenre = detectGenre(recentConversation);
      if (historyGenre !== 'electronic') {
        conversationGenre = historyGenre;
        console.log('🎯 Detected genre from CONVERSATION HISTORY:', conversationGenre);
      } else {
        // Check user's stored genre preference if available
        if (user_id) {
          try {
            const { data: userGenre } = await supabase
              .from('user_genre_memory')
              .select('genre')
              .eq('user_id', user_id)
              .single();
            
            if (userGenre?.genre) {
              conversationGenre = userGenre.genre;
              console.log('🎯 Using stored user genre preference:', conversationGenre);
            }
          } catch (error) {
            console.log('ℹ️ No stored genre preference found for user');
          }
        }
        
        if (conversationGenre === 'electronic') {
          console.log('🎯 No specific genre detected, using default: electronic');
        }
      }
    }

    // Store the detected genre for this user if we have a user_id
    if (user_id && conversationGenre !== 'electronic') {
      try {
        await supabase
          .from('user_genre_memory')
          .upsert({ 
            user_id: user_id, 
            genre: conversationGenre 
          });
        console.log('💾 Stored genre preference for user:', conversationGenre);
      } catch (error) {
        console.log('⚠️ Could not store genre preference:', error);
      }
    }

    // ✅ ENHANCED: Track filtering function - ONLY checks genre and style fields
    const filterTracksByGenre = (tracks: any[], targetGenre: string): any[] => {
      if (targetGenre === 'electronic') return tracks; // Include all for general electronic
      
      console.log(`🔍 Filtering tracks for genre: ${targetGenre}`);
      
      const filtered = tracks.filter((track: any) => {
        const trackGenre = track.genre?.toLowerCase() || '';
        const trackStyle = track.style?.toLowerCase() || '';
        
        // Create regex for exact word matching
        const genreRegex = new RegExp(`\\b${targetGenre.replace(/\s+/g, '\\s+')}\\b`, 'i');
        
        // ✅ FIXED: Only check genre and style fields, NOT title or artist
        const matchesGenre = genreRegex.test(trackGenre);
        const matchesStyle = genreRegex.test(trackStyle);
        
        const isMatch = matchesGenre || matchesStyle;
        
        if (isMatch) {
          console.log(`✅ Found ${targetGenre} track: ${track.artist} - ${track.title} (genre: ${trackGenre}, style: ${trackStyle})`);
        }
        
        return isMatch;
      });
      
      console.log(`🎯 Filtered ${filtered.length} tracks for genre: ${targetGenre}`);
      return filtered;
    };

    // ✅ ENHANCED: Advanced session-based track rotation with temporal and contextual variety
    const selectDiverseTracks = (tracks: any[], count: number = 40, sessionContext: any): any[] => {
      if (tracks.length <= count) return tracks;
      
      console.log(`🎲 Selecting ${count} diverse tracks from ${tracks.length} available tracks`);
      console.log('📊 Session context:', sessionContext);
      
      // ✅ NEW: Create multiple rotation seeds for maximum variety
      const timeBasedSeed = Math.floor(Date.now() / (1000 * 60 * 15)); // Changes every 15 minutes
      const promptBasedSeed = sessionContext.promptHash % 1000;
      const conversationBasedSeed = sessionContext.conversationLength * 17; // Prime number for better distribution
      const genreBasedSeed = sessionContext.genre.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      
      // Combine seeds for unique session fingerprint
      const masterSeed = (timeBasedSeed + promptBasedSeed + conversationBasedSeed + genreBasedSeed) % 10000;
      
      console.log('🎯 Rotation seeds:', {
        timeBasedSeed,
        promptBasedSeed,
        conversationBasedSeed,
        genreBasedSeed,
        masterSeed
      });

      // ✅ ENHANCED: Multi-dimensional track categorization for maximum diversity
      const tracksByArtist = new Map<string, any[]>();
      const tracksByDecade = new Map<string, any[]>();
      const tracksByLabel = new Map<string, any[]>();
      const tracksBySubgenre = new Map<string, any[]>();
      const tracksByLength = new Map<string, any[]>(); // Short/Medium/Long tracks
      
      // Categorize all tracks
      tracks.forEach(track => {
        // Group by artist (normalized)
        const artist = track.artist?.toLowerCase().trim() || 'unknown';
        if (!tracksByArtist.has(artist)) tracksByArtist.set(artist, []);
        tracksByArtist.get(artist)!.push(track);
        
        // Group by decade
        const decade = track.year ? Math.floor(track.year / 10) * 10 : 'unknown';
        const decadeKey = decade.toString();
        if (!tracksByDecade.has(decadeKey)) tracksByDecade.set(decadeKey, []);
        tracksByDecade.get(decadeKey)!.push(track);
        
        // Group by label (normalized)
        const label = track.label?.toLowerCase().trim() || 'unknown';
        if (!tracksByLabel.has(label)) tracksByLabel.set(label, []);
        tracksByLabel.get(label)!.push(track);
        
        // Group by subgenre/style
        const subgenre = track.style?.toLowerCase().trim() || track.genre?.toLowerCase().trim() || 'unknown';
        if (!tracksBySubgenre.has(subgenre)) tracksBySubgenre.set(subgenre, []);
        tracksBySubgenre.get(subgenre)!.push(track);
        
        // Group by track length (if available)
        const duration = track.duration || 0;
        let lengthCategory = 'unknown';
        if (duration > 0) {
          if (duration < 180) lengthCategory = 'short'; // < 3 minutes
          else if (duration < 360) lengthCategory = 'medium'; // 3-6 minutes
          else lengthCategory = 'long'; // > 6 minutes
        }
        if (!tracksByLength.has(lengthCategory)) tracksByLength.set(lengthCategory, []);
        tracksByLength.get(lengthCategory)!.push(track);
      });

      console.log('📊 Track diversity analysis:', {
        totalTracks: tracks.length,
        uniqueArtists: tracksByArtist.size,
        uniqueDecades: tracksByDecade.size,
        uniqueLabels: tracksByLabel.size,
        uniqueSubgenres: tracksBySubgenre.size,
        lengthCategories: tracksByLength.size
      });

      // ✅ ENHANCED: Deterministic but session-specific shuffle using master seed
      const shuffledTracks = [...tracks].sort((a, b) => {
        const aHash = (a.artist + a.title + (a.year || '')).split('').reduce((acc, char) => acc + char.charCodeAt(0), masterSeed);
        const bHash = (b.artist + b.title + (b.year || '')).split('').reduce((acc, char) => acc + char.charCodeAt(0), masterSeed);
        return (aHash % 10000) - (bHash % 10000);
      });

      // ✅ ENHANCED: Multi-pass selection algorithm for maximum diversity
      const selectedTracks = new Set<any>();
      const usedArtists = new Set<string>();
      const usedLabels = new Set<string>();
      const usedDecades = new Set<string>();
      const usedSubgenres = new Set<string>();
      const usedLengthCategories = new Set<string>();

      // Pass 1: Maximum diversity - no duplicates across all dimensions
      console.log('🎯 Pass 1: Maximum diversity selection');
      for (const track of shuffledTracks) {
        if (selectedTracks.size >= Math.floor(count * 0.4)) break; // 40% of tracks with max diversity
        
        const artist = track.artist?.toLowerCase().trim() || 'unknown';
        const label = track.label?.toLowerCase().trim() || 'unknown';
        const decade = track.year ? Math.floor(track.year / 10) * 10 : 'unknown';
        const decadeKey = decade.toString();
        const subgenre = track.style?.toLowerCase().trim() || track.genre?.toLowerCase().trim() || 'unknown';
        const duration = track.duration || 0;
        let lengthCategory = 'unknown';
        if (duration > 0) {
          if (duration < 180) lengthCategory = 'short';
          else if (duration < 360) lengthCategory = 'medium';
          else lengthCategory = 'long';
        }
        
        // Only select if ALL dimensions are unique
        if (!usedArtists.has(artist) && 
            !usedLabels.has(label) && 
            !usedDecades.has(decadeKey) && 
            !usedSubgenres.has(subgenre) &&
            !usedLengthCategories.has(lengthCategory)) {
          
          selectedTracks.add(track);
          usedArtists.add(artist);
          usedLabels.add(label);
          usedDecades.add(decadeKey);
          usedSubgenres.add(subgenre);
          usedLengthCategories.add(lengthCategory);
          
          console.log(`🎵 Max diversity: ${track.artist} - ${track.title} [${track.year || 'unknown'}] (${subgenre}) [${label}]`);
        }
      }

      // Pass 2: High diversity - avoid artist and label duplicates
      console.log('🎯 Pass 2: High diversity selection');
      for (const track of shuffledTracks) {
        if (selectedTracks.size >= Math.floor(count * 0.7)) break; // 70% of tracks with high diversity
        
        const artist = track.artist?.toLowerCase().trim() || 'unknown';
        const label = track.label?.toLowerCase().trim() || 'unknown';
        
        if (!selectedTracks.has(track) && !usedArtists.has(artist) && !usedLabels.has(label)) {
          selectedTracks.add(track);
          usedArtists.add(artist);
          usedLabels.add(label);
          console.log(`🎵 High diversity: ${track.artist} - ${track.title} [${label}]`);
        }
      }

      // Pass 3: Medium diversity - avoid only artist duplicates
      console.log('🎯 Pass 3: Medium diversity selection');
      for (const track of shuffledTracks) {
        if (selectedTracks.size >= Math.floor(count * 0.9)) break; // 90% of tracks with medium diversity
        
        const artist = track.artist?.toLowerCase().trim() || 'unknown';
        
        if (!selectedTracks.has(track) && !usedArtists.has(artist)) {
          selectedTracks.add(track);
          usedArtists.add(artist);
          console.log(`🎵 Medium diversity: ${track.artist} - ${track.title}`);
        }
      }

      // Pass 4: Fill remaining slots with any tracks (ensuring we hit the target count)
      console.log('🎯 Pass 4: Fill remaining slots');
      for (const track of shuffledTracks) {
        if (selectedTracks.size >= count) break;
        
        if (!selectedTracks.has(track)) {
          selectedTracks.add(track);
          console.log(`🎵 Fill slot: ${track.artist} - ${track.title}`);
        }
      }

      const result = Array.from(selectedTracks);
      
      // ✅ ENHANCED: Final diversity verification
      const finalArtists = new Set(result.map(t => t.artist?.toLowerCase().trim()));
      const finalLabels = new Set(result.map(t => t.label?.toLowerCase().trim()));
      const finalDecades = new Set(result.map(t => t.year ? Math.floor(t.year / 10) * 10 : 'unknown'));
      
      console.log('✅ Final selection diversity stats:', {
        selectedTracks: result.length,
        uniqueArtists: finalArtists.size,
        uniqueLabels: finalLabels.size,
        uniqueDecades: finalDecades.size,
        diversityRatio: (finalArtists.size / result.length * 100).toFixed(1) + '%'
      });
      
      return result;
    };

    // ✅ ENHANCED: Generate comprehensive session context for track selection
    const generateSessionContext = (prompt: string, conversationHistory: any[], genre: string): any => {
      // Create a comprehensive hash from the prompt (more granular than before)
      const promptWords = prompt.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
      const promptHash = promptWords.reduce((acc, word) => {
        return acc + word.split('').reduce((wordAcc, char) => wordAcc + char.charCodeAt(0), 0);
      }, 0);
      
      // Factor in conversation length and recent message content
      const conversationLength = conversationHistory.length;
      const recentContent = conversationHistory.slice(-2).map(msg => msg.content).join(' ').toLowerCase();
      const contentHash = recentContent.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      
      // Time-based component that changes more frequently for variety
      const timeComponent = Math.floor(Date.now() / (1000 * 60 * 10)); // Changes every 10 minutes
      
      // Create unique session fingerprint
      const sessionFingerprint = `${genre}_${promptHash}_${conversationLength}_${contentHash}_${timeComponent}`;
      
      const context = {
        genre,
        promptHash,
        conversationLength,
        contentHash,
        timeComponent,
        sessionFingerprint,
        promptWords: promptWords.slice(0, 5), // First 5 meaningful words
        hasQuestionWords: /\b(what|how|which|recommend|suggest|example|like|similar)\b/i.test(prompt)
      };
      
      console.log('🆔 Generated session context:', context);
      return context;
    };

    // Build enhanced knowledge context for the AI using master tracks
    let knowledgeContext = '';
    let recommendedTracks = [];
    
    if (masterTracks.length > 0) {
      // Filter tracks by detected genre with improved filtering
      const genreFilteredTracks = filterTracksByGenre(masterTracks, conversationGenre);

      if (genreFilteredTracks.length > 0) {
        // ✅ ENHANCED: Use advanced session-based track selection for maximum variety
        const sessionContext = generateSessionContext(prompt, conversationHistory, conversationGenre);
        const diverseTracks = selectDiverseTracks(genreFilteredTracks, 45, sessionContext); // Increased to 45 for more variety
        recommendedTracks = diverseTracks;
        
        knowledgeContext += `\n\nRELEVANT ${conversationGenre.toUpperCase()} TRACKS IN DATABASE:\n`;
        diverseTracks.forEach((track: any) => {
          knowledgeContext += `- ${track.artist} - ${track.title}`;
          if (track.year) knowledgeContext += ` (${track.year})`;
          if (track.label) knowledgeContext += ` [${track.label}]`;
          if (track.genre && track.style) knowledgeContext += ` {${track.genre}/${track.style}}`;
          else if (track.genre) knowledgeContext += ` {${track.genre}}`;
          knowledgeContext += '\n';
        });
        console.log(`📚 Added ${diverseTracks.length} highly diverse ${conversationGenre} tracks to knowledge context`);
      } else {
        console.log(`⚠️ No tracks found for genre: ${conversationGenre}, using general electronic tracks`);
        // Fallback to general electronic tracks with advanced diversity
        const sessionContext = generateSessionContext(prompt, conversationHistory, 'electronic');
        const fallbackTracks = selectDiverseTracks(masterTracks, 45, sessionContext);
        recommendedTracks = fallbackTracks;
        knowledgeContext += `\n\nRELEVANT ELECTRONIC TRACKS IN DATABASE:\n`;
        fallbackTracks.forEach((track: any) => {
          knowledgeContext += `- ${track.artist} - ${track.title}`;
          if (track.year) knowledgeContext += ` (${track.year})`;
          if (track.label) knowledgeContext += ` [${track.label}]`;
          if (track.genre) knowledgeContext += ` {${track.genre}}`;
          knowledgeContext += '\n';
        });
      }
    }

    // Add genre information
    if (conversationGenre !== 'electronic') {
      knowledgeContext += `\n\nGENRE INFORMATION:\nYou have comprehensive knowledge of ${conversationGenre} and related electronic music genres including subgenres and production techniques.`;
    }

    // ✅ ENHANCED: Build conversation transcript with genre context awareness
    let conversationTranscript = '';
    if (conversationHistory.length > 0) {
      conversationTranscript = '\n\nRECENT CONVERSATION TRANSCRIPT:\n';
      conversationHistory.slice(-6).forEach((msg: any) => {
        const speaker = msg.type === 'user' ? 'User' : 'Abel';
        conversationTranscript += `${speaker}: ${msg.content}\n`;
      });
      conversationTranscript += `User: ${prompt}\n`;
    }

    // ✅ ENHANCED: System prompt with stronger emphasis on track variety and rotation
    const systemPrompt = `You are Abel, a friendly AI music tutor specializing in electronic music production. Your role is to provide practical, actionable advice to help producers improve their craft.

IMPORTANT GUIDELINES:
- Keep responses SHORT and engaging (2-3 sentences max unless asked for detail)
- Be charismatic and expressive like a real producer friend
- ALWAYS mention specific tracks when giving examples or recommendations
- When referencing tracks, format EXACTLY like: "Artist - Track Title" (use this exact format)
- ONLY recommend tracks from your knowledge database - these are real tracks that exist
- ADAPT TO THE USER'S CURRENT GENRE REQUEST - if they ask about a new genre, switch focus immediately
- Stay focused on the user's current genre unless they ask to explore others
- Be conversational and practical, like a producer friend giving tips
- Ask about their current projects to provide targeted advice

CRITICAL TRACK VARIETY AND ROTATION:
- You have access to ${recommendedTracks.length} carefully curated ${conversationGenre} tracks from diverse artists, eras, and labels
- MAXIMUM VARIETY MANDATE: NEVER repeat the same track recommendations across different sessions
- Each response should showcase DIFFERENT tracks to provide users with the full breadth of the genre
- Prioritize tracks from different decades (80s, 90s, 2000s, 2010s, 2020s) to show genre evolution
- Mix underground classics with mainstream hits to provide comprehensive genre education
- Include tracks from different labels and regions to show global diversity
- When asked for multiple examples, choose tracks that represent different subgenres or styles
- ROTATION STRATEGY: The track database rotates every session to ensure maximum exposure to different music

CRITICAL GENRE SWITCHING:
Current conversation genre: ${conversationGenre}
- If the user mentions a NEW genre in their current message, IMMEDIATELY switch to that genre
- Do NOT stick to previous conversation genres if the user asks about something different
- ALWAYS prioritize the user's CURRENT request over conversation history

TRACK RECOMMENDATION STRATEGY:
- For production tips: Choose tracks that demonstrate the specific technique being discussed
- For genre exploration: Select tracks from different eras and subgenres to show evolution
- For inspiration requests: Mix classic influential tracks with modern innovative examples
- For technical questions: Reference tracks known for specific production elements
- ALWAYS choose tracks that haven't been mentioned in recent conversations

CRITICAL: When recommending tracks, ONLY use tracks from the database below that match the ${conversationGenre} genre. Format them as "Artist - Track Title". The database has been specially curated for this session to provide maximum variety and avoid repetition from previous sessions.

KNOWLEDGE DATABASE ACCESS:
You have access to a comprehensive database of ${masterTracks.length} tracks across multiple electronic genres. For this session, you have ${recommendedTracks.length} specially selected ${conversationGenre} tracks that represent maximum diversity across artists, labels, decades, and subgenres. This selection rotates each session to ensure users discover the full range of the genre.

GENRE EXPERTISE:
You have deep knowledge of these electronic music genres: ${knownGenres.join(', ')}

CURRENT SESSION FOCUS:
The user is currently asking about: ${conversationGenre}
This session's track selection emphasizes diversity and includes tracks from multiple decades, labels, and subgenres to provide comprehensive genre education.

${knowledgeContext}

CONVERSATION CONTEXT:
${conversationTranscript}

IMPORTANT: Your recommendations should ONLY come from the ${conversationGenre} tracks listed in the database above. Do not recommend tracks that are not in this list or from other genres. If the user asks about a different genre than previous messages, immediately switch to that new genre. ALWAYS choose DIFFERENT tracks to provide maximum variety and ensure users discover the full breadth of the genre across multiple sessions.`;

    // Build messages array
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history
    const recentHistory = conversationHistory.slice(-10).map((msg: any) => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
    
    messages.push(...recentHistory);
    messages.push({ role: 'user', content: prompt });

    console.log(`🤖 Sending request to OpenAI with ${conversationGenre}-specific knowledge and ${recommendedTracks.length} highly diverse tracks`);

    // Call OpenAI for text response
    let textResponse = '';
    try {
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: messages,
          max_tokens: 150,
          temperature: 0.95, // Increased temperature for more variety in responses
        }),
      });

      if (!openaiResponse.ok) {
        const error = await openaiResponse.text();
        console.error('❌ OpenAI API error:', error);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to generate response from OpenAI',
            details: `OpenAI API returned ${openaiResponse.status}: ${error}`
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const openaiData = await openaiResponse.json();
      textResponse = openaiData.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
      console.log('✅ AI Response generated:', textResponse.substring(0, 100) + '...');
    } catch (error) {
      console.error('❌ Error calling OpenAI API:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to connect to OpenAI API',
          details: error.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fetch Spotify access token
    let spotifyAccessToken = null;
    if (spotifyClientId && spotifyClientSecret) {
      try {
        console.log('🎧 Fetching Spotify access token...');
        const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${btoa(spotifyClientId + ":" + spotifyClientSecret)}`
          },
          body: "grant_type=client_credentials"
        });
        
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          spotifyAccessToken = tokenData.access_token;
          console.log('✅ Successfully obtained Spotify access token');
        } else {
          const errorText = await tokenRes.text();
          console.error('❌ Failed to get Spotify access token:', tokenRes.status, errorText);
        }
      } catch (error) {
        console.error('❌ Error fetching Spotify access token:', error);
      }
    }

    // ✅ ENHANCED: Improved track extraction and Spotify search with exact matching
    let spotifyUrls: string[] = [];
    let tracksWereRecommended = false;
    
    if (spotifyAccessToken) {
      try {
        console.log('🔍 Starting enhanced track extraction from response...');
        console.log('📝 Full AI response for track extraction:', textResponse);
        
        // First, check if the response contains recommendation language
        const recommendationPhrases = [
          'check out', 'listen to', 'try', 'recommend', 'example', 'like', 'track', 'song'
        ];
        
        const hasRecommendationLanguage = recommendationPhrases.some(phrase => 
          textResponse.toLowerCase().includes(phrase)
        );
        
        console.log('🎯 Has recommendation language:', hasRecommendationLanguage);

        // Enhanced track extraction - prioritize exact database matches
        const extractedTracks = new Set<{artist: string, title: string, spotifyQuery: string, isFromDatabase: boolean}>();
        
        // Method 1: Direct database matching - look for tracks mentioned in the response from genre-filtered tracks
        if (recommendedTracks.length > 0) {
          console.log(`🔍 Searching for exact ${conversationGenre} database matches in response...`);
          
          for (const track of recommendedTracks) {
            const trackTitle = track.title?.toLowerCase() || '';
            const artistName = track.artist?.toLowerCase() || '';
            const responseText = textResponse.toLowerCase();
            
            // Check for exact "Artist - Track" format mentions
            const exactFormat = `${artistName} - ${trackTitle}`;
            if (responseText.includes(exactFormat)) {
              extractedTracks.add({
                artist: track.artist,
                title: track.title,
                spotifyQuery: `${track.artist} ${track.title}`,
                isFromDatabase: true
              });
              tracksWereRecommended = true;
              console.log(`🎵 Found exact ${conversationGenre} database match:`, exactFormat);
              continue;
            }
            
            // Check for individual artist and track mentions
            if (artistName.length > 3 && responseText.includes(artistName) && 
                trackTitle.length > 3 && responseText.includes(trackTitle)) {
              extractedTracks.add({
                artist: track.artist,
                title: track.title,
                spotifyQuery: `${track.artist} ${track.title}`,
                isFromDatabase: true
              });
              tracksWereRecommended = true;
              console.log(`🎵 Found ${conversationGenre} database track mention:`, `${track.artist} - ${track.title}`);
            }
          }
        }

        // Method 2: Regex extraction for "Artist - Track" format (only if no database matches found)
        if (extractedTracks.size === 0) {
          console.log('🔍 Using regex extraction as fallback...');
          
          const trackPatterns = [
            // Pattern 1: "Artist - Track" format
            /([A-Z][A-Za-z0-9\s&.,']{2,30})\s*[-–]\s*([A-Z][A-Za-z0-9\s&.(),']{2,40})/g,
            // Pattern 2: "Check out Artist - Track" or "Listen to Artist - Track"
            /(?:check out|listen to|try)\s+([A-Za-z0-9\s&.,']+?)\s*[-–]\s*([A-Za-z0-9\s&.(),']+?)(?:\s*[.,!?]|\s*$)/gi,
          ];

          for (const pattern of trackPatterns) {
            let match;
            while ((match = pattern.exec(textResponse)) !== null) {
              const artist = match[1]?.trim().replace(/[.,!?]+$/, '');
              const track = match[2]?.trim().replace(/[.,!?]+$/, '');
              
              if (artist && track && artist.length > 2 && track.length > 2) {
                extractedTracks.add({
                  artist,
                  title: track,
                  spotifyQuery: `${artist} ${track}`,
                  isFromDatabase: false
                });
                tracksWereRecommended = true;
                console.log('🎵 Extracted track via regex:', `${artist} - ${track}`);
              }
            }
          }
        }

        console.log('📋 Total extracted tracks for Spotify search:', extractedTracks.size);
        console.log('🎯 Tracks were recommended:', tracksWereRecommended);

        // ✅ ENHANCED: Search for each extracted track on Spotify with stricter matching
        const successfulMatches = [];
        
        for (const trackInfo of extractedTracks) {
          try {
            console.log(`🔍 Searching Spotify for: "${trackInfo.artist} - ${trackInfo.title}" (from database: ${trackInfo.isFromDatabase})`);
            
            // Try multiple search strategies
            const searchQueries = [
              `artist:"${trackInfo.artist}" track:"${trackInfo.title}"`, // Exact match
              `${trackInfo.artist} ${trackInfo.title}`, // Simple search
              `${trackInfo.title} ${trackInfo.artist}`, // Reversed order
            ];

            let bestMatch = null;
            let bestScore = 0;

            for (const query of searchQueries) {
              const enhancedQuery = encodeURIComponent(query);
              console.log(`🔍 Trying Spotify search query: "${query}"`);
              
              const spotifyRes = await fetch(`https://api.spotify.com/v1/search?q=${enhancedQuery}&type=track&limit=10`, {
                headers: {
                  Authorization: `Bearer ${spotifyAccessToken}`
                }
              });

              if (spotifyRes.ok) {
                const spotifyData = await spotifyRes.json();
                const tracks = spotifyData.tracks?.items || [];
                
                for (const track of tracks) {
                  const trackName = track.name.toLowerCase();
                  const artistName = track.artists[0]?.name.toLowerCase() || '';
                  const searchArtist = trackInfo.artist.toLowerCase();
                  const searchTrack = trackInfo.title.toLowerCase();
                  
                  let score = 0;
                  
                  // ✅ ENHANCED: Much stricter scoring for exact matches
                  // Exact matches get highest score
                  if (trackName === searchTrack) score += 20;
                  if (artistName === searchArtist) score += 20;
                  
                  // Very close matches
                  if (trackName.includes(searchTrack) && searchTrack.includes(trackName.split(' ')[0])) score += 15;
                  if (artistName.includes(searchArtist) && searchArtist.includes(artistName.split(' ')[0])) score += 15;
                  
                  // Partial matches (lower score)
                  if (trackName.includes(searchTrack) || searchTrack.includes(trackName)) score += 5;
                  if (artistName.includes(searchArtist) || searchArtist.includes(artistName)) score += 5;
                  
                  // Word matches (even lower score)
                  const trackWords = searchTrack.split(' ').filter(word => word.length > 2);
                  const artistWords = searchArtist.split(' ').filter(word => word.length > 2);
                  
                  trackWords.forEach(word => {
                    if (trackName.includes(word)) score += 1;
                  });
                  
                  artistWords.forEach(word => {
                    if (artistName.includes(word)) score += 2;
                  });
                  
                  if (score > bestScore) {
                    bestScore = score;
                    bestMatch = track;
                  }
                }
                
                if (bestMatch && bestScore >= 15) break; // Higher threshold for good matches
              }
            }
            
            // ✅ ENHANCED: Only include Spotify links for high-confidence matches
            const minimumScore = trackInfo.isFromDatabase ? 15 : 25; // Higher threshold for non-database tracks
            
            if (bestMatch && bestScore >= minimumScore) {
              const spotifyUrl = bestMatch.external_urls?.spotify;
              if (spotifyUrl) {
                console.log(`✅ Found high-confidence Spotify match: ${bestMatch.artists[0]?.name} - ${bestMatch.name} (Score: ${bestScore}) -> ${spotifyUrl}`);
                spotifyUrls.push(spotifyUrl);
                successfulMatches.push({
                  original: `${trackInfo.artist} - ${trackInfo.title}`,
                  found: `${bestMatch.artists[0]?.name} - ${bestMatch.name}`,
                  score: bestScore,
                  url: spotifyUrl
                });
              }
            } else {
              console.log(`❌ No high-confidence match found for: ${trackInfo.artist} - ${trackInfo.title} (best score: ${bestScore}, required: ${minimumScore})`);
            }
          } catch (error) {
            console.error(`❌ Error searching for track "${trackInfo.artist} - ${trackInfo.title}":`, error);
          }
        }

        // ✅ ENHANCED: Only add Spotify notification if we found exact matches for recommended tracks
        if (spotifyUrls.length > 0 && tracksWereRecommended && successfulMatches.length > 0) {
          // Check if the response doesn't already contain the notification
          if (!textResponse.includes("I've provided links to these tracks in our conversation")) {
            textResponse += " I've provided links to these tracks in our conversation.";
            console.log('✅ Added Spotify notification to response');
            console.log('🎵 Successful matches:', successfulMatches.map(m => `${m.original} -> ${m.found} (${m.score})`));
          }
        } else {
          console.log('ℹ️ No Spotify notification added:', {
            spotifyUrlsFound: spotifyUrls.length,
            tracksWereRecommended,
            extractedTracksCount: extractedTracks.size,
            successfulMatchesCount: successfulMatches.length
          });
        }

      } catch (error) {
        console.error('❌ Error during track extraction and Spotify search:', error);
      }
    } else {
      console.log('⚠️ Skipping Spotify search - no access token available');
    }

    // Generate audio using ElevenLabs
    let audioBase64 = '';
    try {
      console.log('🎤 Generating audio with ElevenLabs...');
      const elevenLabsResponse = await fetch('https://api.elevenlabs.io/v1/text-to-speech/Z8tzrdqI5NOZ2xEVSdlK', {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': elevenlabsApiKey,
        },
        body: JSON.stringify({
          text: textResponse,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.8,
            style: 0.2,
            use_speaker_boost: true
          }
        }),
      });

      if (elevenLabsResponse.ok) {
        const audioBuffer = await elevenLabsResponse.arrayBuffer();
        const audioArray = new Uint8Array(audioBuffer);
        
        let binaryString = '';
        const chunkSize = 8192;
        
        for (let i = 0; i < audioArray.length; i += chunkSize) {
          const chunk = audioArray.slice(i, i + chunkSize);
          binaryString += String.fromCharCode.apply(null, Array.from(chunk));
        }
        
        audioBase64 = btoa(binaryString);
        console.log('✅ Successfully generated audio');
      } else {
        const errorText = await elevenLabsResponse.text();
        console.error('❌ ElevenLabs API error:', errorText);
      }
    } catch (error) {
      console.error('❌ Error generating audio:', error);
    }

    // Build response object with conversation transcript
    const responseObj: any = {
      content: textResponse,
      audio: audioBase64,
      transcript: {
        user: prompt,
        assistant: textResponse,
        timestamp: new Date().toISOString()
      }
    };

    if (spotifyUrls.length > 0) {
      responseObj.spotifyUrls = spotifyUrls;
      console.log(`✅ Returning ${spotifyUrls.length} high-confidence Spotify URL(s):`, spotifyUrls);
    } else {
      console.log('ℹ️ No high-confidence Spotify URLs found to return');
    }

    console.log(`📦 Final response with ${conversationGenre}-specific knowledge context and ${recommendedTracks.length} highly diverse tracks`);
    console.log('✅ Function completed successfully');

    return new Response(
      JSON.stringify(responseObj),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('💥 Critical error in tutor-response function:', error);
    console.error('Stack trace:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
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