"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { subscribeChannel, unsubscribeChannel } from "@/lib/realtime/channel-manager";
import { handleActivityInsert, handleActivityUpdate } from "@/lib/realtime/handlers";

export function useRealtimeActivities(companyId: string | null) {
  const initRef = useRef(false);

  useEffect(() => {
    if (!companyId || initRef.current) return;
    initRef.current = true;

    const supabase = createClient();
    const insertChannel = `activities-insert:${companyId}`;
    const updateChannel = `activities-update:${companyId}`;

    subscribeChannel(supabase, insertChannel, {
      table: "scheduled_activities",
      event: "INSERT",
      filter: `company_id=eq.${companyId}`,
      callback: handleActivityInsert,
    });

    subscribeChannel(supabase, updateChannel, {
      table: "scheduled_activities",
      event: "UPDATE",
      filter: `company_id=eq.${companyId}`,
      callback: handleActivityUpdate,
    });

    return () => {
      unsubscribeChannel(supabase, insertChannel);
      unsubscribeChannel(supabase, updateChannel);
      initRef.current = false;
    };
  }, [companyId]);
}
