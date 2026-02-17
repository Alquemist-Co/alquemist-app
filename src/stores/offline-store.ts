import { create } from "zustand";

interface OfflineState {
  pendingCount: number;
  syncingCount: number;
  isSyncing: boolean;
  lastSyncAt: number | null;
  setPendingCount: (count: number) => void;
  setSyncing: (syncing: boolean, count?: number) => void;
  setLastSyncAt: (ts: number) => void;
}

export const useOfflineStore = create<OfflineState>((set) => ({
  pendingCount: 0,
  syncingCount: 0,
  isSyncing: false,
  lastSyncAt: null,
  setPendingCount: (count) => set({ pendingCount: count }),
  setSyncing: (syncing, count) =>
    set({ isSyncing: syncing, syncingCount: count ?? 0 }),
  setLastSyncAt: (ts) => set({ lastSyncAt: ts }),
}));
