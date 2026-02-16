"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";

export function useLogout() {
  const router = useRouter();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearAuth();
    router.push("/login");
    router.refresh();
  }

  return { logout };
}
