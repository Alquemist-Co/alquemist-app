export type SyncStatus = "pending" | "syncing" | "synced" | "conflict" | "failed";

export type SyncQueueItem = {
  localId?: number;
  entityType: string;
  entityId: string;
  action: "create" | "update" | "delete";
  payload: Record<string, unknown>;
  timestamp: number;
  status: SyncStatus;
  retryCount: number;
  lastError?: string;
};

export type OfflinePhoto = {
  id?: number;
  syncQueueId: number;
  blob: Blob;
  mimeType: string;
  fileName: string;
  width: number;
  height: number;
};

export type MetaEntry = {
  key: string;
  value: string | number | boolean;
};
