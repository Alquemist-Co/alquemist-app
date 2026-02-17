"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Activity } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { getAllZoneConditions, type ZoneCondition } from "@/lib/actions/environmental";
import { ZoneEnvCard } from "./zone-env-card";

type Props = {
  initialData: ZoneCondition[];
};

const POLL_INTERVAL = 30_000; // 30 seconds

export function EnvDashboard({ initialData }: Props) {
  const [zones, setZones] = useState<ZoneCondition[]>(initialData);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);
  const lastRefreshRef = useRef(0);

  // Initialize lastRefresh ref on mount
  useEffect(() => {
    lastRefreshRef.current = Date.now();
  }, []);

  // Poll for updates
  const refresh = useCallback(async () => {
    try {
      const data = await getAllZoneConditions();
      setZones(data);
      lastRefreshRef.current = Date.now();
      setSecondsAgo(0);
    } catch {
      // Silently fail on polling errors
    }
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(refresh, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

  // Seconds ago counter
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (lastRefreshRef.current > 0) {
        setSecondsAgo(Math.floor((Date.now() - lastRefreshRef.current) / 1000));
      }
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (zones.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="Sin datos ambientales"
        description="Configura sensores en tus zonas para comenzar el monitoreo."
        action={{ label: "Ir a Sensores", href: "/operations/sensors" }}
      />
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-sans text-xl font-bold text-text-primary">
          Monitoreo Ambiental
        </h1>
        <span className="text-xs text-text-tertiary">
          Actualizado hace {secondsAgo}s
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {zones.map((zone) => (
          <ZoneEnvCard key={zone.zoneId} zone={zone} />
        ))}
      </div>
    </>
  );
}
