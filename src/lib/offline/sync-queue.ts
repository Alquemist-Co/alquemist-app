import { offlineDb } from "./db";
import type { SyncStatus } from "./types";

const MAX_RETRIES = 3;
const BACKOFF_BASE = 1000; // 1s, 4s, 16s

type ActionHandler = (
  entityType: string,
  entityId: string,
  action: string,
  payload: Record<string, unknown>,
) => Promise<{ success: boolean; error?: string }>;

let processing = false;

export async function addToSyncQueue(
  entityType: string,
  entityId: string,
  action: "create" | "update" | "delete",
  payload: Record<string, unknown>,
): Promise<number | undefined> {
  return offlineDb.syncQueue.add({
    entityType,
    entityId,
    action,
    payload,
    timestamp: Date.now(),
    status: "pending",
    retryCount: 0,
  });
}

export async function processSyncQueue(
  handler: ActionHandler,
  onProgress?: (synced: number, total: number) => void,
): Promise<{ synced: number; failed: number; conflicts: number }> {
  if (processing) return { synced: 0, failed: 0, conflicts: 0 };
  processing = true;

  let synced = 0;
  let failed = 0;
  const conflicts = 0;

  try {
    const pendingItems = await offlineDb.syncQueue
      .where("status")
      .anyOf(["pending", "failed"])
      .filter((item) => item.retryCount < MAX_RETRIES)
      .sortBy("timestamp");

    const total = pendingItems.length;

    for (const item of pendingItems) {
      if (!item.localId) continue;

      // Mark as syncing
      await offlineDb.syncQueue.update(item.localId, { status: "syncing" as SyncStatus });

      try {
        const result = await handler(
          item.entityType,
          item.entityId,
          item.action,
          item.payload,
        );

        if (result.success) {
          await offlineDb.syncQueue.update(item.localId, {
            status: "synced" as SyncStatus,
          });
          synced++;
        } else {
          const newRetry = (item.retryCount || 0) + 1;
          await offlineDb.syncQueue.update(item.localId, {
            status: newRetry >= MAX_RETRIES ? ("failed" as SyncStatus) : ("pending" as SyncStatus),
            retryCount: newRetry,
            lastError: result.error,
          });

          if (newRetry >= MAX_RETRIES) failed++;
        }
      } catch (err) {
        const newRetry = (item.retryCount || 0) + 1;
        await offlineDb.syncQueue.update(item.localId, {
          status: newRetry >= MAX_RETRIES ? ("failed" as SyncStatus) : ("pending" as SyncStatus),
          retryCount: newRetry,
          lastError: err instanceof Error ? err.message : "Unknown error",
        });

        if (newRetry >= MAX_RETRIES) failed++;

        // Exponential backoff
        const delay = BACKOFF_BASE * Math.pow(4, newRetry - 1);
        await new Promise((r) => setTimeout(r, delay));
      }

      onProgress?.(synced, total);
    }
  } finally {
    processing = false;
  }

  return { synced, failed, conflicts };
}

export async function getSyncQueueCounts(): Promise<{
  pending: number;
  syncing: number;
  failed: number;
  total: number;
}> {
  const all = await offlineDb.syncQueue.toArray();
  return {
    pending: all.filter((i) => i.status === "pending").length,
    syncing: all.filter((i) => i.status === "syncing").length,
    failed: all.filter((i) => i.status === "failed").length,
    total: all.filter((i) => i.status !== "synced").length,
  };
}

export async function cleanupSyncedItems(olderThanDays: number = 7): Promise<number> {
  const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

  const toDelete = await offlineDb.syncQueue
    .where("status")
    .equals("synced")
    .filter((item) => item.timestamp < cutoff)
    .primaryKeys();

  await offlineDb.syncQueue.bulkDelete(toDelete as number[]);
  return toDelete.length;
}
