"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/lib/utils/cn";
import type { ZoneWithStats } from "@/lib/actions/areas";

type Props = {
  zone: ZoneWithStats;
};

const PURPOSE_COLORS: Record<string, string> = {
  propagation: "border-l-purple-500",
  vegetation: "border-l-green-500",
  flowering: "border-l-yellow-500",
  drying: "border-l-orange-500",
  processing: "border-l-blue-500",
  storage: "border-l-gray-400",
  multipurpose: "border-l-brand",
};

const PURPOSE_LABELS: Record<string, string> = {
  propagation: "Propagacion",
  vegetation: "Vegetacion",
  flowering: "Floracion",
  drying: "Secado",
  processing: "Proceso",
  storage: "Almacen",
  multipurpose: "Multi",
};

const STATUS_BADGES: Record<string, { variant: "success" | "warning" | "error"; label: string }> = {
  active: { variant: "success", label: "Activa" },
  maintenance: { variant: "warning", label: "Mantenimiento" },
  inactive: { variant: "error", label: "Inactiva" },
};

export function ZoneCard({ zone }: Props) {
  const statusBadge = STATUS_BADGES[zone.status] ?? STATUS_BADGES.active;

  return (
    <Link href={`/areas/${zone.id}`}>
      <Card
        className={cn(
          "border-l-4 p-4 transition-colors hover:bg-surface",
          PURPOSE_COLORS[zone.purpose] ?? "border-l-brand",
        )}
      >
        <div className="flex items-start justify-between">
          <p className="text-sm font-bold text-text-primary">{zone.name}</p>
          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
        </div>

        <p className="mt-1 text-xs text-text-secondary">
          {PURPOSE_LABELS[zone.purpose] ?? zone.purpose} · {zone.areaM2} m²
        </p>

        <div className="mt-3 flex items-center gap-3 text-xs text-text-secondary">
          <span>
            <span className="font-mono font-bold text-text-primary">
              {zone.batchCount}
            </span>{" "}
            batches
          </span>
          <span>
            <span className="font-mono font-bold text-text-primary">
              {zone.activePlants}
            </span>{" "}
            / {zone.plantCapacity}
          </span>
        </div>

        <div className="mt-2">
          <ProgressBar
            value={zone.occupancyPct}
            label="Ocupacion"
          />
        </div>
      </Card>
    </Link>
  );
}
