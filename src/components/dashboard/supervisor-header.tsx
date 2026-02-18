"use client";

import type { FacilityItem } from "@/lib/actions/areas";

type SupervisorHeaderProps = {
  zoneCount: number;
  batchCount: number;
  facilities: FacilityItem[];
  selectedFacilityId: string | undefined;
  onFacilityChange: (facilityId: string | undefined) => void;
};

export function SupervisorHeader({
  zoneCount,
  batchCount,
  facilities,
  selectedFacilityId,
  onFacilityChange,
}: SupervisorHeaderProps) {
  return (
    <header className="mb-5">
      <h1 className="text-[28px] font-extrabold leading-tight text-text-primary">
        Supervision
      </h1>
      <p className="mt-1 text-sm text-text-secondary">
        {zoneCount} zona{zoneCount !== 1 ? "s" : ""} activa
        {zoneCount !== 1 ? "s" : ""} — {batchCount} batch
        {batchCount !== 1 ? "es" : ""}
      </p>

      {facilities.length > 1 && (
        <select
          value={selectedFacilityId ?? ""}
          onChange={(e) =>
            onFacilityChange(e.target.value || undefined)
          }
          className="mt-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        >
          <option value="">Todas las facilities</option>
          {facilities.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      )}
    </header>
  );
}
