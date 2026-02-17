"use client";

import { useState, useRef, useCallback, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { toast } from "@/lib/utils/toast-store";
import { cn } from "@/lib/utils/cn";

const PULL_THRESHOLD = 80;

type PullToRefreshProps = {
  onRefresh: () => Promise<void>;
  children: ReactNode;
};

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const isOnline = useOnlineStatus();
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const doRefresh = useCallback(async () => {
    if (refreshing) return;

    if (!isOnline) {
      toast.warning("Sin conexion. Los datos se actualizaran al reconectar.");
      return;
    }

    setRefreshing(true);
    try {
      await onRefresh();
      const now = new Date();
      setLastUpdated(
        now.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
      );
    } finally {
      setRefreshing(false);
    }
  }, [isOnline, onRefresh, refreshing]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (refreshing) return;
      const scrollTop = containerRef.current?.scrollTop ?? 0;
      if (scrollTop === 0) {
        touchStartY.current = e.touches[0].clientY;
      } else {
        touchStartY.current = 0;
      }
    },
    [refreshing],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartY.current || refreshing) return;
      const delta = e.touches[0].clientY - touchStartY.current;
      if (delta > 0) {
        setPullDistance(Math.min(delta, PULL_THRESHOLD * 1.5));
      }
    },
    [refreshing],
  );

  const handleTouchEnd = useCallback(() => {
    if (pullDistance >= PULL_THRESHOLD) {
      doRefresh();
    }
    setPullDistance(0);
    touchStartY.current = 0;
  }, [pullDistance, doRefresh]);

  const pullProgress = Math.min(pullDistance / PULL_THRESHOLD, 1);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ overscrollBehaviorY: "none" }}
    >
      {/* Pull indicator */}
      {pullDistance > 0 && (
        <div
          className="flex items-center justify-center overflow-hidden transition-[height] duration-100"
          style={{ height: pullDistance * 0.5 }}
        >
          <RefreshCw
            className={cn(
              "h-5 w-5 text-brand transition-transform",
              pullProgress >= 1 && "text-success",
            )}
            style={{ transform: `rotate(${pullProgress * 360}deg)` }}
          />
        </div>
      )}

      {/* Refresh button + timestamp */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={doRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs font-medium text-brand hover:underline disabled:opacity-50"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", refreshing && "animate-spin")}
          />
          Actualizar
        </button>
        {lastUpdated && (
          <span className="text-[11px] text-text-secondary">
            Actualizado: {lastUpdated}
          </span>
        )}
      </div>

      {children}
    </div>
  );
}
