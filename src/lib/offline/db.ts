import Dexie, { type EntityTable } from "dexie";
import type { SyncQueueItem, OfflinePhoto, MetaEntry } from "./types";

// Cached tables (read-only mirrors of server data)
type CachedScheduledActivity = {
  id: string;
  batchId: string;
  plannedDate: string;
  status: string;
  templateSnapshot: Record<string, unknown>;
};

type CachedBatch = {
  id: string;
  code: string;
  zoneId: string;
  status: string;
  cultivarName: string;
  phaseName: string;
  plantCount: number;
};

type CachedActivityTemplate = {
  id: string;
  cropTypeId: string;
  name: string;
  activityType: string;
};

type CachedProduct = {
  id: string;
  categoryId: string;
  name: string;
  sku: string;
  isActive: boolean;
};

type CachedInventoryItem = {
  id: string;
  productId: string;
  zoneId: string;
  lotCode: string | null;
  availableQuantity: number;
};

type CachedZone = {
  id: string;
  facilityId: string;
  name: string;
  purpose: string;
};

type CachedCultivar = {
  id: string;
  cropTypeId: string;
  name: string;
};

type CachedProductionPhase = {
  id: string;
  cropTypeId: string;
  name: string;
  sortOrder: number;
};

class AlquemistDB extends Dexie {
  // Cached tables
  scheduledActivities!: EntityTable<CachedScheduledActivity, "id">;
  batches!: EntityTable<CachedBatch, "id">;
  activityTemplates!: EntityTable<CachedActivityTemplate, "id">;
  products!: EntityTable<CachedProduct, "id">;
  inventoryItems!: EntityTable<CachedInventoryItem, "id">;
  zones!: EntityTable<CachedZone, "id">;
  cultivars!: EntityTable<CachedCultivar, "id">;
  productionPhases!: EntityTable<CachedProductionPhase, "id">;

  // Sync tables
  syncQueue!: EntityTable<SyncQueueItem, "localId">;
  offlinePhotos!: EntityTable<OfflinePhoto, "id">;
  meta!: EntityTable<MetaEntry, "key">;

  constructor() {
    super("alquemist-offline");

    this.version(1).stores({
      // Cached (read-only mirrors)
      scheduledActivities: "id, batchId, plannedDate, status",
      batches: "id, code, zoneId, status",
      activityTemplates: "id, cropTypeId",
      products: "id, categoryId, isActive",
      inventoryItems: "id, productId, zoneId",
      zones: "id, facilityId",
      cultivars: "id, cropTypeId",
      productionPhases: "id, cropTypeId, sortOrder",
      // Sync
      syncQueue: "++localId, timestamp, status, entityType",
      offlinePhotos: "++id, syncQueueId",
      meta: "key",
    });
  }
}

export const offlineDb = new AlquemistDB();

export type {
  CachedScheduledActivity,
  CachedBatch,
  CachedActivityTemplate,
  CachedProduct,
  CachedInventoryItem,
  CachedZone,
  CachedCultivar,
  CachedProductionPhase,
};
