"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import type { UserRole } from "@/lib/auth/types";

const VALID_ROLES: UserRole[] = [
  "operator",
  "supervisor",
  "manager",
  "admin",
  "viewer",
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initRef = useRef(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const supabase = createClient();

    // Initial hydration
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const rawRole = user.app_metadata?.role as string | undefined;
        const role =
          rawRole && VALID_ROLES.includes(rawRole as UserRole)
            ? (rawRole as UserRole)
            : "viewer";

        setAuth({
          userId: user.id,
          email: user.email ?? "",
          fullName: (user.user_metadata?.full_name as string) ?? "",
          role,
          companyId: (user.app_metadata?.company_id as string) ?? "",
          facilityId:
            (user.app_metadata?.facility_id as string) ?? null,
        });
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const user = session.user;
        const rawRole = user.app_metadata?.role as string | undefined;
        const role =
          rawRole && VALID_ROLES.includes(rawRole as UserRole)
            ? (rawRole as UserRole)
            : "viewer";

        setAuth({
          userId: user.id,
          email: user.email ?? "",
          fullName: (user.user_metadata?.full_name as string) ?? "",
          role,
          companyId: (user.app_metadata?.company_id as string) ?? "",
          facilityId:
            (user.app_metadata?.facility_id as string) ?? null,
        });
      } else {
        clearAuth();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setAuth, clearAuth]);

  return <>{children}</>;
}
