"use client";

import { cn } from "@/lib/utils/cn";

type DialGaugeProps = {
  value: number | null;
  unit: string;
  label: string;
  min: number;
  max: number;
  optimalMin?: number;
  optimalMax?: number;
  size?: "sm" | "md";
};

const ARC_ANGLE = 270; // degrees
const START_ANGLE = 135; // degrees (bottom-left start)

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polarToCartesian(cx, cy, r, endDeg);
  const end = polarToCartesian(cx, cy, r, startDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function getStatus(
  value: number | null,
  min: number,
  max: number,
  optimalMin?: number,
  optimalMax?: number,
): "ok" | "warning" | "critical" | "stale" {
  if (value === null) return "stale";
  const oMin = optimalMin ?? min;
  const oMax = optimalMax ?? max;
  const range = oMax - oMin;

  if (value >= oMin && value <= oMax) return "ok";

  const deviation = value < oMin ? oMin - value : value - oMax;
  const pct = range > 0 ? deviation / range : 1;

  return pct > 0.15 ? "critical" : "warning";
}

const STATUS_COLORS = {
  ok: "var(--color-success)",
  warning: "var(--color-warning)",
  critical: "var(--color-error)",
  stale: "var(--color-text-tertiary)",
};

function DialGauge({
  value,
  unit,
  label,
  min,
  max,
  optimalMin,
  optimalMax,
  size = "md",
}: DialGaugeProps) {
  const svgSize = size === "sm" ? 100 : 140;
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const radius = svgSize / 2 - 12;
  const strokeWidth = size === "sm" ? 6 : 8;

  const status = getStatus(value, min, max, optimalMin, optimalMax);
  const needleColor = STATUS_COLORS[status];

  // Normalize value to 0-1 range within min-max
  const normalizedValue =
    value !== null ? Math.max(0, Math.min(1, (value - min) / (max - min))) : 0;

  // Value angle
  const valueAngle = START_ANGLE + normalizedValue * ARC_ANGLE;

  // Optimal range arc (if provided)
  const oMin = optimalMin ?? min;
  const oMax = optimalMax ?? max;
  const optStartNorm = Math.max(0, (oMin - min) / (max - min));
  const optEndNorm = Math.min(1, (oMax - min) / (max - min));
  const optStartAngle = START_ANGLE + optStartNorm * ARC_ANGLE;
  const optEndAngle = START_ANGLE + optEndNorm * ARC_ANGLE;

  // Needle endpoint
  const needleLen = radius - strokeWidth;
  const needleTip = polarToCartesian(cx, cy, needleLen, valueAngle);

  const fontSize = size === "sm" ? "text-base" : "text-xl";
  const labelSize = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <div className="flex flex-col items-center">
      <svg
        width={svgSize}
        height={svgSize * 0.75}
        viewBox={`0 0 ${svgSize} ${svgSize * 0.85}`}
        aria-label={`${label}: ${value !== null ? `${value} ${unit}` : "Sin datos"}`}
      >
        {/* Background arc */}
        <path
          d={describeArc(cx, cy, radius, START_ANGLE, START_ANGLE + ARC_ANGLE)}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Optimal range band */}
        {(optimalMin !== undefined || optimalMax !== undefined) && (
          <path
            d={describeArc(cx, cy, radius, optStartAngle, optEndAngle)}
            fill="none"
            stroke="var(--color-success)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            opacity={0.25}
          />
        )}

        {/* Needle */}
        {value !== null && (
          <line
            x1={cx}
            y1={cy}
            x2={needleTip.x}
            y2={needleTip.y}
            stroke={needleColor}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        )}

        {/* Center dot */}
        <circle cx={cx} cy={cy} r={4} fill={needleColor} />

        {/* Value text */}
        <text
          x={cx}
          y={cy + (size === "sm" ? 20 : 28)}
          textAnchor="middle"
          className={cn("fill-text-primary font-mono font-bold", fontSize)}
        >
          {value !== null ? `${value}` : "—"}
        </text>

        {/* Unit text */}
        <text
          x={cx}
          y={cy + (size === "sm" ? 32 : 42)}
          textAnchor="middle"
          className="fill-text-secondary text-[10px] font-sans"
        >
          {unit}
        </text>
      </svg>
      <span className={cn("text-text-secondary font-sans", labelSize)}>
        {label}
      </span>
    </div>
  );
}

export { DialGauge, type DialGaugeProps };
