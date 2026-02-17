"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Calendar } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFacilityStore } from "@/stores/facility-store";
import {
  getOccupancyData,
  getAvailabilityProjection,
  type OccupancyZone,
  type AvailabilityItem,
} from "@/lib/actions/occupancy";
import type { FacilityItem } from "@/lib/actions/areas";
import { GanttChart } from "./gantt-chart";

type Props = {
  facilities: FacilityItem[];
};

export function OccupancyView({ facilities }: Props) {
  const { selectedFacilityId, setSelectedFacilityId } = useFacilityStore();
  const [zones, setZones] = useState<OccupancyZone[] | null>(null);
  const [availability, setAvailability] = useState<AvailabilityItem[]>([]);
  const [weeks, setWeeks] = useState(8);
  const loadedRef = useRef(false);

  const activeFacilities = facilities.filter((f) => f.isActive);
  const currentId = selectedFacilityId ?? activeFacilities[0]?.id ?? null;

  useEffect(() => {
    if (!currentId) return;
    if (loadedRef.current && currentId === selectedFacilityId) return;
    loadedRef.current = true;

    Promise.all([
      getOccupancyData(currentId),
      getAvailabilityProjection(currentId),
    ]).then(([z, a]) => {
      setZones(z);
      setAvailability(a);
    });
  }, [currentId, selectedFacilityId]);

  const handleFacilityChange = (id: string) => {
    setSelectedFacilityId(id);
    setZones(null);
    loadedRef.current = false;
  };

  if (activeFacilities.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="Sin facilities"
        description="No hay facilities configuradas."
      />
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-sans text-xl font-bold text-text-primary">
          Ocupacion Planificada
        </h1>
        <div className="flex gap-3">
          {activeFacilities.length > 1 && (
            <select
              value={currentId ?? ""}
              onChange={(e) => handleFacilityChange(e.target.value)}
              className="h-10 rounded-input border border-border bg-surface-card px-3 text-sm text-text-primary"
            >
              {activeFacilities.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          )}
          <select
            value={weeks}
            onChange={(e) => setWeeks(parseInt(e.target.value))}
            className="h-10 rounded-input border border-border bg-surface-card px-3 text-sm text-text-primary"
          >
            <option value={4}>4 semanas</option>
            <option value={8}>8 semanas</option>
            <option value={12}>12 semanas</option>
          </select>
        </div>
      </div>

      {zones === null ? (
        <div className="flex items-center justify-center py-12">
          <div className="size-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
      ) : (
        <>
          <GanttChart zones={zones} weeks={weeks} />

          {/* Availability table */}
          <h2 className="mb-3 mt-6 text-sm font-bold uppercase text-text-secondary tracking-wider">
            Disponibilidad
          </h2>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-left text-xs font-bold text-text-secondary">
                  <th className="px-4 py-3">Zona</th>
                  <th className="px-4 py-3 text-right">Area</th>
                  <th className="px-4 py-3 text-right">Capacidad</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {availability.map((a) => (
                  <tr key={a.zoneId} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-text-primary">{a.zoneName}</td>
                    <td className="px-4 py-3 text-right font-mono text-text-secondary">
                      {a.areaM2} m²
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-text-secondary">
                      {a.plantCapacity}
                    </td>
                    <td className="px-4 py-3">
                      {a.isAvailable ? (
                        <Badge variant="success">Disponible</Badge>
                      ) : (
                        <Badge variant="outlined">Ocupada</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </>
  );
}
