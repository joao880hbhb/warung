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
  setUser: (user: AuthUser) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
}));
