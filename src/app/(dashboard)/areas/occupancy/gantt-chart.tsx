"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import type { OccupancyZone } from "@/lib/actions/occupancy";

type Props = {
  zones: OccupancyZone[];
  weeks: number;
};

const ROW_HEIGHT = 40;
const LABEL_WIDTH = 140;
const WEEK_WIDTH = 80;
const HEADER_HEIGHT = 30;
const BAR_HEIGHT = 24;
const BAR_PADDING = (ROW_HEIGHT - BAR_HEIGHT) / 2;

const PHASE_COLORS: Record<string, string> = {
  propagation: "#9333ea",
  vegetacion: "#16a34a",
  flowering: "#eab308",
  drying: "#ea580c",
  processing: "#2563eb",
  default: "#059669",
};

function getPhaseColor(phaseName: string): string {
  const key = phaseName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const [k, v] of Object.entries(PHASE_COLORS)) {
    if (key.includes(k)) return v;
  }
  return PHASE_COLORS.default;
}

export function GanttChart({ zones, weeks }: Props) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);

  const now = useMemo(() => new Date(), []);
  const startDate = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay()); // Start of current week
    d.setHours(0, 0, 0, 0);
    return d;
  }, [now]);

  const endDate = useMemo(() => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + weeks * 7);
    return d;
  }, [startDate, weeks]);

  const totalMs = endDate.getTime() - startDate.getTime();
  const chartWidth = weeks * WEEK_WIDTH;
  const svgWidth = LABEL_WIDTH + chartWidth;
  const svgHeight = HEADER_HEIGHT + zones.length * ROW_HEIGHT;

  // Week labels
  const weekLabels = useMemo(() => {
    const labels: { x: number; label: string }[] = [];
    for (let i = 0; i < weeks; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i * 7);
      labels.push({
        x: LABEL_WIDTH + i * WEEK_WIDTH,
        label: `${d.getDate()}/${d.getMonth() + 1}`,
      });
    }
    return labels;
  }, [startDate, weeks]);

  // Today line position
  const todayX = LABEL_WIDTH + ((now.getTime() - startDate.getTime()) / totalMs) * chartWidth;

  return (
    <Card className="overflow-x-auto p-0">
      <svg
        width={svgWidth}
        height={svgHeight}
        className="min-w-full"
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Header background */}
        <rect x={0} y={0} width={svgWidth} height={HEADER_HEIGHT} fill="var(--color-surface)" />

        {/* Week column lines and labels */}
        {weekLabels.map((w, i) => (
          <g key={i}>
            <line
              x1={w.x}
              y1={HEADER_HEIGHT}
              x2={w.x}
              y2={svgHeight}
              stroke="var(--color-border)"
              strokeWidth={0.5}
            />
            <text
              x={w.x + WEEK_WIDTH / 2}
              y={HEADER_HEIGHT - 8}
              textAnchor="middle"
              className="fill-text-secondary text-[10px] font-sans"
            >
              {w.label}
            </text>
          </g>
        ))}

        {/* Zone rows */}
        {zones.map((zone, i) => {
          const y = HEADER_HEIGHT + i * ROW_HEIGHT;
          return (
            <g key={zone.zoneId}>
              {/* Row background */}
              {i % 2 === 1 && (
                <rect
                  x={0}
                  y={y}
                  width={svgWidth}
                  height={ROW_HEIGHT}
                  fill="var(--color-surface)"
                  opacity={0.3}
                />
              )}

              {/* Zone label */}
              <text
                x={8}
                y={y + ROW_HEIGHT / 2 + 4}
                className="fill-text-primary text-[11px] font-sans font-bold"
              >
                {zone.zoneName.length > 16
                  ? zone.zoneName.slice(0, 16) + "..."
                  : zone.zoneName}
              </text>

              {/* Batch bars */}
              {zone.batches.map((batch) => {
                const batchStart = new Date(batch.startDate).getTime();
                const batchEnd = batch.endDate
                  ? new Date(batch.endDate).getTime()
                  : now.getTime();

                // Clamp to chart range
                const clampedStart = Math.max(batchStart, startDate.getTime());
                const clampedEnd = Math.min(batchEnd, endDate.getTime());

                if (clampedStart >= endDate.getTime() || clampedEnd <= startDate.getTime()) {
                  return null; // Out of visible range
                }

                const barX = LABEL_WIDTH + ((clampedStart - startDate.getTime()) / totalMs) * chartWidth;
                const barWidth = Math.max(
                  4,
                  ((clampedEnd - clampedStart) / totalMs) * chartWidth,
                );
                const barY = y + BAR_PADDING;

                const color = getPhaseColor(batch.phaseName);

                return (
                  <rect
                    key={batch.id}
                    x={barX}
                    y={barY}
                    width={barWidth}
                    height={BAR_HEIGHT}
                    rx={4}
                    fill={color}
                    opacity={0.85}
                    className="cursor-pointer"
                    onMouseEnter={(e) => {
                      setTooltip({
                        x: e.clientX,
                        y: e.clientY,
                        text: `${batch.code} · ${batch.cultivarName} · ${batch.phaseName} · ${batch.plantCount} pl`,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
            </g>
          );
        })}

        {/* Today line */}
        <line
          x1={todayX}
          y1={HEADER_HEIGHT}
          x2={todayX}
          y2={svgHeight}
          stroke="var(--color-error)"
          strokeWidth={1.5}
          strokeDasharray="4 2"
        />
        <text
          x={todayX}
          y={HEADER_HEIGHT - 2}
          textAnchor="middle"
          className="fill-error text-[9px] font-sans font-bold"
        >
          Hoy
        </text>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-md bg-text-primary px-3 py-1.5 text-xs text-white shadow-lg"
          style={{ left: tooltip.x + 10, top: tooltip.y - 30 }}
        >
          {tooltip.text}
        </div>
      )}
    </Card>
  );
}
