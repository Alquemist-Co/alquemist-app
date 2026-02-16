import { create } from "zustand";

export type ToastType = "success" | "error" | "warning" | "info";

export type ToastItem = {
  id: string;
  type: ToastType;
  message: string;
};

type ToastState = {
  toasts: ToastItem[];
  add: (type: ToastType, message: string) => void;
  remove: (id: string) => void;
};

let counter = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  add: (type, message) => {
    const id = `toast-${++counter}`;
    set((state) => ({
      toasts: [{ id, type, message }, ...state.toasts],
    }));

    // Auto-dismiss for non-error toasts
    if (type !== "error") {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, 4000);
    }
  },

  remove: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

export const toast = {
  success: (message: string) => useToastStore.getState().add("success", message),
  error: (message: string) => useToastStore.getState().add("error", message),
  warning: (message: string) => useToastStore.getState().add("warning", message),
  info: (message: string) => useToastStore.getState().add("info", message),
};
