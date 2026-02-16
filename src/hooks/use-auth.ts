"use client";

import { useAuthStore } from "@/stores/auth-store";
import {
  hasPermission as checkPermission,
  canAccessModule as checkModule,
} from "@/lib/auth/permissions";

export function useAuth() {
  const { userId, email, role, companyId, facilityId, isHydrated } =
    useAuthStore();

  return {
    userId,
    email,
    role,
    companyId,
    facilityId,
    isHydrated,
    isAuthenticated: !!userId,

    hasPermission(action: string): boolean {
      if (!role) return false;
      return checkPermission(role, action);
    },

    canAccessModule(module: string): boolean {
      if (!role) return false;
      return checkModule(role, module);
    },
  };
}
