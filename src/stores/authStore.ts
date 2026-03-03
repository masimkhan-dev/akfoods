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
  _subscription: any | null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  role: null,
  username: null,
  loading: true,
  isInitialized: false,
  _subscription: null,

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
    get()._subscription?.unsubscribe();
    await supabase.auth.signOut();
    set({ user: null, role: null, username: null, _subscription: null });
  },

  initialize: async () => {
    if (get().isInitialized) return;
    set({ isInitialized: true, loading: true });

    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Session retrieve error:", error.message);
      }

      const currentUser = session?.user ?? null;
      if (currentUser?.id !== get().user?.id) {
        set({ user: currentUser });
        if (currentUser) {
          await get().fetchProfile();
        }
      }
    } catch (e) {
      console.error("Auth initialization error:", e);
      set({ user: null });
    } finally {
      set({ loading: false });
    }

    // 3. Set up Auth Listener (for future changes)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const newUser = session?.user ?? null;
      const currentUserState = get().user;

      console.log(`Auth Event: ${event}`, { userId: newUser?.id });

      if (newUser?.id !== currentUserState?.id) {
        set({ user: newUser });

        if (newUser) {
          set({ loading: true });
          await get().fetchProfile();
          set({ loading: false });
        } else {
          set({ role: null, username: null });
        }
      }
    });

    set({ _subscription: subscription });
    console.log("Auth store: Listener registered");

    // Optional: Auto-check for clock drift to help client diagnose
    fetch('https://worldtimeapi.org/api/timezone/Etc/UTC')
      .then(res => res.json())
      .then(data => {
        const drift = Math.abs(new Date(data.datetime).getTime() - Date.now()) / 1000;
        if (drift > 60) console.error(`CRITICAL CLOCK DRIFT: ${drift}s. Supabase WILL fail.`);
        else console.log(`Clock sync: OK (${drift}s drift)`);
      }).catch(() => { });
  },
}));
