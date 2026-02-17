import { offlineDb } from "./db";

/**
 * Preloads essential data into IndexedDB for offline access.
 * Called after authentication is confirmed.
 */

type PreloadResult = {
  tables: number;
  rows: number;
  durationMs: number;
};

export async function preloadEssentialData(): Promise<PreloadResult> {
  const start = Date.now();
  let totalRows = 0;

  try {
    // Fetch all essential data in parallel from server actions
    // These are dynamically imported to keep this module lightweight
    const [
      { getTodayActivities },
      { getProducts },
    ] = await Promise.all([
      import("@/lib/actions/scheduled-activities"),
      import("@/lib/actions/inventory"),
    ]);

    const [activities, products] = await Promise.all([
      getTodayActivities().catch(() => []),
      getProducts().catch(() => []),
    ]);

    // Populate IndexedDB tables
    await offlineDb.transaction("rw", [
      offlineDb.scheduledActivities,
      offlineDb.products,
      offlineDb.meta,
    ], async () => {
      // Clear stale data
      await offlineDb.scheduledActivities.clear();
      await offlineDb.products.clear();

      // Activities
      if (Array.isArray(activities) && activities.length > 0) {
        await offlineDb.scheduledActivities.bulkPut(
          activities.map((a: Record<string, unknown>) => ({
            id: a.id as string,
            batchId: a.batchId as string,
            plannedDate: a.plannedDate as string,
            status: a.status as string,
            templateSnapshot: (a.templateSnapshot as Record<string, unknown>) ?? {},
          })),
        );
        totalRows += activities.length;
      }

      // Products
      if (Array.isArray(products) && products.length > 0) {
        await offlineDb.products.bulkPut(
          products.map((p: Record<string, unknown>) => ({
            id: p.id as string,
            categoryId: p.categoryId as string,
            name: p.name as string,
            sku: p.sku as string,
            isActive: p.isActive as boolean,
          })),
        );
        totalRows += products.length;
      }

      // Update last sync timestamp
      await offlineDb.meta.put({
        key: "lastPreload",
        value: Date.now(),
      });
    });
  } catch (error) {
    console.error("[Offline] Preload failed:", error);
  }

  return {
    tables: 2,
    rows: totalRows,
    durationMs: Date.now() - start,
  };
}

export async function getLastPreloadTime(): Promise<number | null> {
  const entry = await offlineDb.meta.get("lastPreload");
  return entry ? (entry.value as number) : null;
}
