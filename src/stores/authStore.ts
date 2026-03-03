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
    // 1. Singleton Initialization
    if (get().isInitialized) return;
    set({ isInitialized: true, loading: true });

    // 2. Initial Session Check (Immediate)
    const { data: { session } } = await supabase.auth.getSession();
    const currentUser = session?.user ?? null;

    set({ user: currentUser });
    if (currentUser) {
      await get().fetchProfile();
    }
    set({ loading: false });

    // 3. Set up Auth Listener (for future changes)
    supabase.auth.onAuthStateChange(async (event, session) => {
      const newUser = session?.user ?? null;
      const currentUserState = get().user;

      // Only update if the user has actually changed (prevents 429 loops)
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
  },
}));
