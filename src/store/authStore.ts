import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, signIn, signUp, signOut, Profile } from '../lib/supabase';

interface AuthState {
  user: any | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  signUp: (email: string, password: string, userData: any) => Promise<{ data: any; error: any }>;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      profile: null,
      isLoading: false,
      error: null,
      
      signUp: async (email, password, userData) => {
        set({ isLoading: true, error: null });
        try {
          const result = await signUp(email, password, userData);
          
          if (result.error) {
            set({ error: result.error.message, isLoading: false });
            return { data: null, error: result.error };
          }
          
          set({ user: result.data.user, isLoading: false });
          return { data: result.data, error: null };
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          return { data: null, error: err };
        }
      },
      
      signIn: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (error) {
            set({ error: error.message, isLoading: false });
            return { data: null, error };
          }
          
          if (data?.user) {
            set({ user: data.user, isLoading: false });
            return { data, error: null };
          } else {
            set({ error: 'Invalid login credentials', isLoading: false });
            return { data: null, error: { message: 'Invalid login credentials' } };
          }
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          return { data: null, error: err };
        }
      },
      
      signOut: async () => {
        set({ isLoading: true });
        try {
          // Always clear local state first, regardless of API call result
          set({ user: null, profile: null, isLoading: false });
          
          // Check if there's an active session before attempting to sign out
          const { data: { session } } = await supabase.auth.getSession();
          
          // Only attempt to sign out if there's an active session
          if (session) {
            await signOut();
          }
        } catch (err: any) {
          // Even if signOut fails (e.g., session already invalid), 
          // we've already cleared the local state above
          console.warn('Sign out API call failed, but local state cleared:', err.message);
        }
      },
      
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user,
        profile: state.profile
      }),
    }
  )
);

// Initialize auth state from session
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    useAuthStore.setState({ user: session.user });
  }
});

// Setup auth state listener
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    useAuthStore.setState({ user: session.user });
  } else if (event === 'SIGNED_OUT') {
    useAuthStore.setState({ user: null, profile: null });
  }
});