"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { subscribeChannel, unsubscribeChannel } from "@/lib/realtime/channel-manager";
import { handleEnvReadingInsert } from "@/lib/realtime/handlers";

export function useRealtimeEnv(zoneId: string | null, onUpdate?: () => void) {
  const initRef = useRef(false);
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!zoneId || initRef.current) return;
    initRef.current = true;

    const supabase = createClient();
    const channelName = `env:${zoneId}`;

    subscribeChannel(supabase, channelName, {
      table: "environmental_readings",
      event: "INSERT",
      filter: `zone_id=eq.${zoneId}`,
      callback: (record) => handleEnvReadingInsert(record, onUpdateRef.current),
    });

    return () => {
      unsubscribeChannel(supabase, channelName);
      initRef.current = false;
    };
  }, [zoneId]);
}
