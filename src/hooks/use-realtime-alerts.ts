"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { subscribeChannel, unsubscribeChannel } from "@/lib/realtime/channel-manager";
import { handleAlertInsert } from "@/lib/realtime/handlers";

export function useRealtimeAlerts(companyId: string | null) {
  const initRef = useRef(false);

  useEffect(() => {
    if (!companyId || initRef.current) return;
    initRef.current = true;

    const supabase = createClient();
    const channelName = `alerts:${companyId}`;

    subscribeChannel(supabase, channelName, {
      table: "alerts",
      event: "INSERT",
      filter: `company_id=eq.${companyId}`,
      callback: handleAlertInsert,
    });

    return () => {
      unsubscribeChannel(supabase, channelName);
      initRef.current = false;
    };
  }, [companyId]);
}
