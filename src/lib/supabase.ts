import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client using environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing');
  throw new Error('Supabase configuration missing. Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.');
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  throw new Error(`Invalid Supabase URL format: ${supabaseUrl}`);
}

console.log('Initializing Supabase client with URL:', supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type definitions for profiles
export type Role = 'artist' | 'listener';

export interface Profile {
  id: string;
  username: string;
  artist_name?: string;
  role: Role;
  bio?: string;
  created_at?: string;
}

export interface ListenerProfile {
  id: string;
  username: string;
  bio?: string;
  library_tracks?: any;
  subscription_tier?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ArtistProfile {
  id: string;
  username: string;
  artist_name: string;
  bio?: string;
  instagram?: string;
  website?: string;
  email: string;
  created_at?: string;
  subscription_tier?: string;
  gold_badge_applied?: boolean;
  followers?: number;
  verification_status?: string;
  profile_image_url?: string;
}

// Auth functions
export async function signUp(email: string, password: string, userData: any) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        email,
        ...userData,
      },
    },
  });
  
  return { data, error };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

// Database functions
export async function createProfile(profile: Partial<Profile>) {
  const { data, error } = await supabase
    .from('profiles')
    .insert([{
      ...profile,
      created_at: new Date().toISOString(),
    }])
    .select();
  
  return { data, error };
}

export async function createListenerProfile(profile: Partial<ListenerProfile>) {
  const { data, error } = await supabase
    .from('listener_profiles')
    .insert([{
      ...profile,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }])
    .select();
  
  return { data, error };
}

export async function createArtistProfile(profile: Partial<ArtistProfile>) {
  const { data, error } = await supabase
    .from('artist_profiles')
    .insert([{
      ...profile,
      created_at: new Date().toISOString(),
      subscription_tier: profile.subscription_tier || 'basic',
      verification_status: 'none',
      followers: 0,
      gold_badge_applied: false,
    }])
    .select();
  
  return { data, error };
}