"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { subscribeChannel, unsubscribeChannel } from "@/lib/realtime/channel-manager";
import { handleBatchUpdate } from "@/lib/realtime/handlers";

export function useRealtimeBatches(companyId: string | null) {
  const initRef = useRef(false);

  useEffect(() => {
    if (!companyId || initRef.current) return;
    initRef.current = true;

    const supabase = createClient();
    const channelName = `batches:${companyId}`;

    subscribeChannel(supabase, channelName, {
      table: "batches",
      event: "UPDATE",
      filter: `company_id=eq.${companyId}`,
      callback: handleBatchUpdate,
    });

    return () => {
      unsubscribeChannel(supabase, channelName);
      initRef.current = false;
    };
  }, [companyId]);
}
