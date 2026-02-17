"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { DialGauge } from "@/components/data/dial-gauge";
import { PARAMETER_CONFIG } from "@/lib/schemas/environmental";
import type { ZoneCondition } from "@/lib/actions/environmental";

type Props = {
  zone: ZoneCondition;
};

function timeAgo(ts: string | null): string {
  if (!ts) return "Sin datos";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Hace <1m";
  if (mins < 60) return `Hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  return `Hace ${Math.floor(hours / 24)}d`;
}

// Show up to 4 main parameters
const MAIN_PARAMS = ["temperature", "humidity", "co2", "vpd"];

export function ZoneEnvCard({ zone }: Props) {
  const mainReadings = MAIN_PARAMS.map((param) => {
    const reading = zone.readings.find((r) => r.parameter === param);
    const config = PARAMETER_CONFIG[param];
    return { param, reading, config };
  }).filter((r) => r.config);

  return (
    <Link href={`/areas/${zone.zoneId}`}>
      <Card className="p-4 transition-colors hover:bg-surface">
        <div className="mb-3 flex items-center justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-text-primary">
              {zone.zoneName}
            </p>
            <p className="text-xs text-text-secondary">{zone.facilityName}</p>
          </div>
          <span className="shrink-0 text-[10px] text-text-tertiary">
            {timeAgo(zone.lastUpdated)}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {mainReadings.map(({ param, reading, config }) => (
            <DialGauge
              key={param}
              value={reading ? reading.value : null}
              unit={config.unit}
              label={config.label}
              min={config.min}
              max={config.max}
              optimalMin={config.optimalMin}
              optimalMax={config.optimalMax}
              size="sm"
            />
          ))}
        </div>
      </Card>
    </Link>
  );
}
