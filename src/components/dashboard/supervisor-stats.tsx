"use client";

import { StatCard } from "@/components/data/stat-card";

export type SupervisorFilter = "all" | "pending" | "completed" | "overdue";

type SupervisorStatsProps = {
  activeBatches: number;
  todayTotal: number;
  completed: number;
  overdue: number;
  activeFilter: SupervisorFilter;
  onFilterChange: (filter: SupervisorFilter) => void;
};

export function SupervisorStats({
  activeBatches,
  todayTotal,
  completed,
  overdue,
  activeFilter,
  onFilterChange,
}: SupervisorStatsProps) {
  return (
    <div className="mb-5 flex gap-3 overflow-x-auto pb-1">
      <StatCard
        value={activeBatches}
        label="Batches activos"
        color="brand"
        className="min-w-[120px] flex-1"
      />
      <StatCard
        value={todayTotal}
        label="Hoy"
        color="info"
        onClick={() =>
          onFilterChange(activeFilter === "all" ? "all" : "all")
        }
        selected={activeFilter === "all" && todayTotal > 0}
        className="min-w-[120px] flex-1"
      />
      <StatCard
        value={completed}
        label="Completadas"
        color="success"
        onClick={() =>
          onFilterChange(activeFilter === "completed" ? "all" : "completed")
        }
        selected={activeFilter === "completed"}
        className="min-w-[120px] flex-1"
      />
      <StatCard
        value={overdue}
        label="Vencidas"
        color={overdue === 0 ? "success" : "error"}
        onClick={() =>
          onFilterChange(activeFilter === "overdue" ? "all" : "overdue")
        }
        selected={activeFilter === "overdue"}
        className="min-w-[120px] flex-1"
      />
    </div>
  );
}
