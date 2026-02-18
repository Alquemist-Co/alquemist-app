"use client";

import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import type { ZoneWithStats } from "@/lib/actions/areas";
import type { ZoneCondition } from "@/lib/actions/environmental";
import type { ZoneAlertCount } from "@/lib/actions/dashboard";

type ZoneGridProps = {
  zones: ZoneWithStats[];
  conditions: ZoneCondition[];
  alertCounts: ZoneAlertCount[];
};

function getHealthColor(
  zoneId: string,
  alertCounts: ZoneAlertCount[],
  hasReadings: boolean,
): { bg: string; label: string } {
  const alert = alertCounts.find((a) => a.entityId === zoneId);

  if (!hasReadings && !alert) {
    return { bg: "bg-gray-300", label: "Sin datos" };
  }
  if (!alert || alert.count === 0) {
    return { bg: "bg-success", label: "Normal" };
  }
  if (alert.maxSeverity === "critical") {
    return { bg: "bg-error", label: "Critico" };
  }
  return { bg: "bg-warning", label: "Alerta" };
}

function getEnvSummary(
  zoneId: string,
  conditions: ZoneCondition[],
): string | null {
  const condition = conditions.find((c) => c.zoneId === zoneId);
  if (!condition || condition.readings.length === 0) return null;

  const temp = condition.readings.find(
    (r) => r.parameter.toLowerCase() === "temperature",
  );
  const humidity = condition.readings.find(
    (r) => r.parameter.toLowerCase() === "humidity",
  );

  const parts: string[] = [];
  if (temp) parts.push(`${temp.value.toFixed(1)}°C`);
  if (humidity) parts.push(`${humidity.value.toFixed(0)}% HR`);

  return parts.length > 0 ? parts.join(" / ") : null;
}

export function ZoneGrid({ zones, conditions, alertCounts }: ZoneGridProps) {
  if (zones.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-3 text-base font-bold text-text-primary">Zonas</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {zones.map((zone) => {
          const hasReadings = conditions.some(
            (c) => c.zoneId === zone.id && c.readings.length > 0,
          );
          const health = getHealthColor(zone.id, alertCounts, hasReadings);
          const envSummary = getEnvSummary(zone.id, conditions);

          return (
            <Link
              key={zone.id}
              href={`/areas/${zone.id}`}
              className="relative rounded-card border border-border bg-surface-card p-4 transition-colors hover:border-brand"
            >
              {/* Health indicator */}
              <div
                className={cn(
                  "absolute right-3 top-3 size-3 rounded-full",
                  health.bg,
                )}
                title={health.label}
              />

              <h3 className="pr-6 text-sm font-bold text-text-primary">
                {zone.name}
              </h3>

              <p className="mt-1 text-xs text-text-secondary">
                {zone.environment}
              </p>

              {/* Env readings */}
              {envSummary && (
                <p className="mt-2 font-mono text-xs text-text-secondary">
                  {envSummary}
                </p>
              )}

              {/* Stats row */}
              <div className="mt-3 flex items-center gap-3 text-xs text-text-secondary">
                <span>
                  {zone.batchCount} batch{zone.batchCount !== 1 ? "es" : ""}
                </span>
                <span className="font-mono">{zone.occupancyPct}% ocup.</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
