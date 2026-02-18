"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { YieldComparison } from "@/lib/actions/dashboard";

type YieldChartProps = {
  data: YieldComparison[];
};

export default function YieldChart({ data }: YieldChartProps) {
  const chartData = data.map((d) => ({
    name: d.orderCode,
    cultivar: d.cultivarName,
    real: d.yieldReal != null ? Math.round(d.yieldReal * 10) / 10 : 0,
    esperado:
      d.yieldExpected != null ? Math.round(d.yieldExpected * 10) / 10 : 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} barGap={2}>
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fontFamily: "DM Mono" }}
          stroke="#D4DDD6"
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fontFamily: "DM Mono" }}
          stroke="#D4DDD6"
          tickLine={false}
          unit="%"
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as (typeof chartData)[number];
            return (
              <div className="rounded-lg border border-border bg-surface-card p-2 shadow-md">
                <p className="font-mono text-xs font-bold">{d.name}</p>
                <p className="text-[10px] text-text-secondary">{d.cultivar}</p>
                <p className="mt-1 text-xs">
                  Real:{" "}
                  <span className="font-mono font-bold text-brand">
                    {d.real}%
                  </span>
                </p>
                <p className="text-xs">
                  Esperado:{" "}
                  <span className="font-mono font-bold text-text-secondary">
                    {d.esperado}%
                  </span>
                </p>
              </div>
            );
          }}
        />
        <Bar dataKey="real" fill="#005E42" radius={[2, 2, 0, 0]} />
        <Bar dataKey="esperado" fill="#ECF7A3" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
