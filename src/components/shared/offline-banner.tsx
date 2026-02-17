"use client";

import { Wifi, WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex h-7 items-center justify-center gap-1.5 text-xs font-medium transition-colors duration-200 ${
        isOnline
          ? "bg-success text-white"
          : "bg-warning text-white"
      }`}
    >
      {isOnline ? (
        <>
          <Wifi className="size-3.5" />
          <span>Conectado</span>
        </>
      ) : (
        <>
          <WifiOff className="size-3.5" />
          <span>Sin conexión</span>
        </>
      )}
    </div>
  );
}
