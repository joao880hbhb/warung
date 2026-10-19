import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import type { UserRole } from "@/lib/database";

type AuthUser = {
  id: number;
  name: string;
  username: string;
  role: UserRole;
};

type AuthState = {
  user: AuthUser | null;
  hydrated: boolean;
  hydrateError: boolean;
  setUser: (user: AuthUser) => void;
  logout: () => void;
  hydrate: () => Promise<void>;
};

const SESSION_KEY = "kasirkita.auth.session";

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  hydrated: false,
  hydrateError: false,

  setUser: async (user) => {
    set({ user });
    try {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } catch (e) {
      console.error("Failed to save session:", e);
    }
  },

  logout: async () => {
    set({ user: null });
    try {
      await AsyncStorage.removeItem(SESSION_KEY);
    } catch (e) {
      console.error("Failed to remove session:", e);
    }
  },

  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(SESSION_KEY);
      if (stored) {
        const user = JSON.parse(stored) as AuthUser;
        set({ user, hydrated: true, hydrateError: false });
      } else {
        set({ user: null, hydrated: true, hydrateError: false });
      }
    } catch (e) {
      console.error("Failed to hydrate session:", e);
      set({ user: null, hydrated: true, hydrateError: true });
    }
  },
}));
