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
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  role: null,
  username: null,
  loading: true,

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
    set({ loading: true });
    
    supabase.auth.onAuthStateChange(async (event, session) => {
      const user = session?.user ?? null;
      set({ user });
      if (user) {
        // Use setTimeout to avoid Supabase auth deadlock
        setTimeout(() => get().fetchProfile(), 0);
      } else {
        set({ role: null, username: null });
      }
      set({ loading: false });
    });

    const { data: { session } } = await supabase.auth.getSession();
    set({ user: session?.user ?? null });
    if (session?.user) {
      await get().fetchProfile();
    }
    set({ loading: false });
  },
}));
