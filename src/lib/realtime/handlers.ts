"use client";

import { toast } from "@/lib/utils/toast-store";
import { useRealtimeStore } from "@/stores/realtime-store";

const SEVERITY_TOAST: Record<string, "error" | "warning" | "info"> = {
  critical: "error",
  warning: "warning",
  info: "info",
};

export function handleAlertInsert(record: Record<string, unknown>): void {
  const severity = (record.severity as string) ?? "info";
  const title = (record.title as string) ?? "Nueva alerta";
  const message = (record.message as string) ?? "";

  const toastType = SEVERITY_TOAST[severity] ?? "info";
  toast[toastType](`${title}${message ? `: ${message}` : ""}`);

  useRealtimeStore.getState().incrementAlertCount();
}

export function handleBatchUpdate(record: Record<string, unknown>): void {
  const code = (record.code as string) ?? "Batch";
  const status = (record.status as string) ?? "";
  toast.info(`${code} actualizado${status ? ` — ${status}` : ""}`);
}

export function handleActivityInsert(record: Record<string, unknown>): void {
  const status = (record.status as string) ?? "";
  if (status === "pending" || status === "overdue") {
    toast.info("Nueva actividad programada");
  }
}

export function handleActivityUpdate(record: Record<string, unknown>): void {
  const status = (record.status as string) ?? "";
  if (status === "completed" || status === "skipped") {
    toast.success("Actividad actualizada");
  }
}

export function handleEnvReadingInsert(
  _record: Record<string, unknown>,
  onUpdate?: () => void,
): void {
  // Trigger re-fetch of zone conditions (no toast — too frequent)
  onUpdate?.();
}
