import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  role: 'admin' | 'cashier' | null;
  username: string | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  fetchProfile: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  isInitialized: boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  role: null,
  username: null,
  loading: true,
  isInitialized: false,

  setUser: (user) => set({ user }),

  fetchProfile: async () => {
    const { user } = get();
    if (!user) { set({ role: null, username: null }); return; }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle();

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = roles?.some((r) => r.role === 'admin') ?? false;
    set({
      username: profile?.username ?? null,
      role: isAdmin ? 'admin' : 'cashier',
    });
  },

  login: async (username, password) => {
    const email = `${username}@akfburgers.local`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, role: null, username: null });
  },

  initialize: async () => {
    if (get().isInitialized) return;
    set({ isInitialized: true, loading: true });

    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      // If the browser returns a 429 during the very first check, 
      // the local session is corrupted. Clear it.
      if (error?.status === 429) {
        console.warn("Rate limit hit during init. Clearing local session...");
        localStorage.clear();
        window.location.reload();
        return;
      }

      const currentUser = session?.user ?? null;
      set({ user: currentUser });
      if (currentUser) {
        await get().fetchProfile();
      }
      set({ loading: false });

      supabase.auth.onAuthStateChange(async (event, session) => {
        // Stop the loop if refresh fails repeatedly
        if ((event as string) === 'TOKEN_REFRESH_FAILED') {
          console.error("Token refresh failed. Logging out to prevent loop.");
          get().logout();
          return;
        }

        const newUser = session?.user ?? null;
        const currentUserState = get().user;

        // Only update if the user has actually changed
        if (newUser?.id !== currentUserState?.id) {
          set({ user: newUser, loading: true });

          if (newUser) {
            await get().fetchProfile();
          } else {
            set({ role: null, username: null });
          }
          set({ loading: false });
        }
      });
    } catch (e) {
      console.error("Auth initialization error:", e);
      set({ loading: false });
    }
  },
}));
