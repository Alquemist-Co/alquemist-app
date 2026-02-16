import { create } from "zustand";
import type { UserRole } from "@/lib/auth/types";

interface AuthState {
  userId: string | null;
  email: string | null;
  fullName: string | null;
  role: UserRole | null;
  companyId: string | null;
  facilityId: string | null;
  isHydrated: boolean;
}

interface AuthActions {
  setAuth: (auth: {
    userId: string;
    email: string;
    fullName: string;
    role: UserRole;
    companyId: string;
    facilityId: string | null;
  }) => void;
  clearAuth: () => void;
}

const initialState: AuthState = {
  userId: null,
  email: null,
  fullName: null,
  role: null,
  companyId: null,
  facilityId: null,
  isHydrated: false,
};

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  ...initialState,
  setAuth: (auth) =>
    set({
      userId: auth.userId,
      email: auth.email,
      fullName: auth.fullName,
      role: auth.role,
      companyId: auth.companyId,
      facilityId: auth.facilityId,
      isHydrated: true,
    }),
  clearAuth: () => set({ ...initialState }),
}));
