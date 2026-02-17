"use client";

import { StatCard } from "@/components/data/stat-card";
import type { DashboardFilter } from "./operator-dashboard";

type DashboardStatsProps = {
  pending: number;
  completed: number;
  alerts: number;
  activeFilter: DashboardFilter;
  onFilterChange: (filter: DashboardFilter) => void;
};

export function DashboardStats({
  pending,
  completed,
  alerts,
  activeFilter,
  onFilterChange,
}: DashboardStatsProps) {
  return (
    <div className="mb-5 flex gap-3 overflow-x-auto pb-1">
      <StatCard
        value={pending}
        label="Pendientes"
        color="warning"
        onClick={() => onFilterChange(activeFilter === "pending" ? "all" : "pending")}
        selected={activeFilter === "pending"}
        className="min-w-[140px] flex-1"
      />
      <StatCard
        value={completed}
        label="Completadas"
        color="success"
        onClick={() => onFilterChange(activeFilter === "completed" ? "all" : "completed")}
        selected={activeFilter === "completed"}
        className="min-w-[140px] flex-1"
      />
      <StatCard
        value={alerts}
        label="Alertas"
        color="error"
        onClick={() => onFilterChange(activeFilter === "alerts" ? "all" : "alerts")}
        selected={activeFilter === "alerts"}
        className="min-w-[140px] flex-1"
      />
    </div>
  );
}
