import { create } from "zustand";

type ConnectionState = "connected" | "disconnected" | "reconnecting";

interface RealtimeState {
  connectionState: ConnectionState;
  unreadAlertCount: number;
  setConnectionState: (state: ConnectionState) => void;
  incrementAlertCount: () => void;
  resetAlertCount: () => void;
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  connectionState: "disconnected",
  unreadAlertCount: 0,
  setConnectionState: (connectionState) => set({ connectionState }),
  incrementAlertCount: () =>
    set((s) => ({ unreadAlertCount: s.unreadAlertCount + 1 })),
  resetAlertCount: () => set({ unreadAlertCount: 0 }),
}));
