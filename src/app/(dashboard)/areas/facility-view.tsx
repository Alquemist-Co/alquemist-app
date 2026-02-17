"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin } from "lucide-react";
import { StatCard } from "@/components/data/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { useFacilityStore } from "@/stores/facility-store";
import {
  getZonesWithStats,
  getFacilityStats,
  type FacilityItem,
  type ZoneWithStats,
  type FacilityStats,
} from "@/lib/actions/areas";
import { ZoneCard } from "./zone-card";

type Props = {
  facilities: FacilityItem[];
};

export function FacilityView({ facilities }: Props) {
  const { selectedFacilityId, setSelectedFacilityId } = useFacilityStore();
  const [zones, setZones] = useState<ZoneWithStats[] | null>(null);
  const [stats, setStats] = useState<FacilityStats | null>(null);
  const loadedRef = useRef(false);

  // Auto-select first facility if none selected
  const activeFacilities = facilities.filter((f) => f.isActive);
  const currentId = selectedFacilityId ?? activeFacilities[0]?.id ?? null;

  useEffect(() => {
    if (!currentId) return;
    if (loadedRef.current && currentId === selectedFacilityId) return;
    loadedRef.current = true;

    Promise.all([
      getZonesWithStats(currentId),
      getFacilityStats(currentId),
    ]).then(([z, s]) => {
      setZones(z);
      setStats(s);
    });
  }, [currentId, selectedFacilityId]);

  const handleFacilityChange = (id: string) => {
    setSelectedFacilityId(id);
    setZones(null);
    setStats(null);
    loadedRef.current = false;
  };

  if (activeFacilities.length === 0) {
    return (
      <EmptyState
        icon={MapPin}
        title="Sin facilities"
        description="No hay facilities configuradas en tu empresa."
      />
    );
  }

  return (
    <>
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-sans text-xl font-bold text-text-primary">
          Areas
        </h1>
        {activeFacilities.length > 1 && (
          <select
            value={currentId ?? ""}
            onChange={(e) => handleFacilityChange(e.target.value)}
            className="h-10 rounded-input border border-border bg-surface-card px-3 text-sm text-text-primary sm:w-auto"
          >
            {activeFacilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            value={`${stats.totalArea.toLocaleString()} m²`}
            label="Area total"
            color="brand"
          />
          <StatCard
            value={stats.totalCapacity.toLocaleString()}
            label="Capacidad"
            color="info"
          />
          <StatCard
            value={stats.activePlants.toLocaleString()}
            label="Plantas activas"
            color="success"
          />
          <StatCard
            value={`${stats.occupancyPct}%`}
            label="Ocupacion"
            color={stats.occupancyPct > 85 ? "warning" : "brand"}
          />
        </div>
      )}

      {/* Zone grid */}
      {zones === null ? (
        <div className="flex items-center justify-center py-12">
          <div className="size-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
      ) : zones.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Sin zonas"
          description="Esta facility no tiene zonas configuradas."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {zones.map((zone) => (
            <ZoneCard key={zone.id} zone={zone} />
          ))}
        </div>
      )}
    </>
  );
}
