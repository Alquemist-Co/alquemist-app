"use client";

import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useSyncStatus } from "@/hooks/use-sync-status";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const { pendingCount, isSyncing } = useSyncStatus();

  const label = (() => {
    if (isSyncing) return "Sincronizando…";
    if (!isOnline && pendingCount > 0)
      return `Sin conexión — ${pendingCount} pendiente${pendingCount !== 1 ? "s" : ""}`;
    if (!isOnline) return "Sin conexión";
    if (pendingCount > 0)
      return `Conectado — ${pendingCount} pendiente${pendingCount !== 1 ? "s" : ""}`;
    return "Conectado";
  })();

  const Icon = isSyncing ? RefreshCw : isOnline ? Wifi : WifiOff;
  const bg = isSyncing
    ? "bg-primary text-white"
    : isOnline
      ? "bg-success text-white"
      : "bg-warning text-white";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex h-7 items-center justify-center gap-1.5 text-xs font-medium transition-colors duration-200 ${bg}`}
    >
      <Icon className={`size-3.5 ${isSyncing ? "animate-spin" : ""}`} />
      <span>{label}</span>
    </div>
  );
}
