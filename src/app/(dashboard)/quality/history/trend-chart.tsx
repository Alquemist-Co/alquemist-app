"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { TrendDataPoint } from "@/lib/actions/quality";

type Props = {
  data: TrendDataPoint[];
  parameter: string;
};

export function TrendChart({ data, parameter }: Props) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "var(--color-text-secondary)" }}
          />
          <YAxis tick={{ fontSize: 10, fill: "var(--color-text-secondary)" }} />
          <Tooltip
            contentStyle={{
              background: "var(--color-surface-card)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line
            type="monotone"
            dataKey="value"
            name={parameter}
            stroke="#005E42"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="sma"
            name="SMA (3)"
            stroke="#ECF7A3"
            strokeWidth={1.5}
            strokeDasharray="5 5"
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
