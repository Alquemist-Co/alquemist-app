"use client";

import { useEffect, useRef } from "react";
import { useOfflineStore } from "@/stores/offline-store";
import { getSyncQueueCounts } from "@/lib/offline/sync-queue";

const POLL_INTERVAL = 10_000; // 10s

export function useSyncStatus() {
  const { pendingCount, isSyncing, lastSyncAt } = useOfflineStore();
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  useEffect(() => {
    const update = async () => {
      try {
        const counts = await getSyncQueueCounts();
        useOfflineStore.getState().setPendingCount(counts.total);
      } catch {
        // IndexedDB might not be available (SSR)
      }
    };

    update();
    intervalRef.current = setInterval(update, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { pendingCount, isSyncing, lastSyncAt };
}
