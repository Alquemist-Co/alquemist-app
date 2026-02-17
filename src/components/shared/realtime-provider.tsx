"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { unsubscribeAll } from "@/lib/realtime/channel-manager";
import { useRealtimeStore } from "@/stores/realtime-store";
import { useAuthStore } from "@/stores/auth-store";
import { useRealtimeAlerts } from "@/hooks/use-realtime-alerts";
import { useRealtimeBatches } from "@/hooks/use-realtime-batches";
import { useRealtimeActivities } from "@/hooks/use-realtime-activities";

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const companyId = useAuthStore((s) => s.companyId);
  const role = useAuthStore((s) => s.role);
  const setConnectionState = useRealtimeStore((s) => s.setConnectionState);
  const connRef = useRef(false);

  // Global channels (managed by provider)
  useRealtimeAlerts(role !== "viewer" ? companyId : null);
  useRealtimeBatches(companyId);
  useRealtimeActivities(
    role === "operator" || role === "supervisor" ? companyId : null,
  );

  // Connection state monitoring
  useEffect(() => {
    if (connRef.current) return;
    connRef.current = true;

    const handleOnline = () => setConnectionState("connected");
    const handleOffline = () => setConnectionState("disconnected");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    setConnectionState(navigator.onLine ? "connected" : "disconnected");

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      connRef.current = false;
    };
  }, [setConnectionState]);

  // Cleanup on logout
  useEffect(() => {
    if (!companyId) {
      const supabase = createClient();
      unsubscribeAll(supabase);
    }
  }, [companyId]);

  return <>{children}</>;
}
