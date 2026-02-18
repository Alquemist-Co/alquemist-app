"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils/cn";
import {
  ClipboardList,
  ChevronRight,
  AlertTriangle,
  Clock,
} from "lucide-react";
import type { TodayActivityItem } from "@/lib/actions/scheduled-activities";
import type { SupervisorFilter } from "./supervisor-stats";

// ── Type colors ──────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  fertirrigacion: "border-l-emerald-500",
  riego: "border-l-blue-500",
  poda: "border-l-amber-500",
  cosecha: "border-l-red-500",
  trasplante: "border-l-sky-500",
  inspeccion: "border-l-cyan-500",
  fumigacion: "border-l-purple-500",
  limpieza: "border-l-gray-400",
};

function getTypeColor(typeName: string): string {
  const key = typeName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return TYPE_COLORS[key] ?? "border-l-brand";
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  completed: "Completada",
  skipped: "Cancelada",
  overdue: "Vencida",
};

const STATUS_VARIANTS: Record<
  string,
  "success" | "warning" | "error" | "outlined"
> = {
  pending: "outlined",
  completed: "success",
  skipped: "error",
  overdue: "warning",
};

// ── Main component ───────────────────────────────────────────────

type ActivitySummaryProps = {
  activities: TodayActivityItem[];
  filter: SupervisorFilter;
};

export function ActivitySummary({ activities, filter }: ActivitySummaryProps) {
  const overdue = activities.filter((a) => a.status === "overdue");
  const pending = activities.filter((a) => a.status === "pending");
  const completed = activities.filter((a) => a.status === "completed");

  const filtered =
    filter === "pending"
      ? [...overdue, ...pending]
      : filter === "completed"
        ? completed
        : filter === "overdue"
          ? overdue
          : activities;

  return (
    <section className="mb-6">
      <h2 className="mb-3 text-base font-bold text-text-primary">
        Actividades de hoy
      </h2>

      {/* Overdue section */}
      {filter !== "completed" && overdue.length > 0 && (
        <div className="mb-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="text-sm font-bold text-warning">
              {overdue.length} actividad{overdue.length !== 1 ? "es" : ""}{" "}
              vencida{overdue.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="mt-2 space-y-1.5">
            {overdue.slice(0, 3).map((act) => (
              <OverdueCard key={act.id} activity={act} />
            ))}
            {overdue.length > 3 && (
              <p className="text-xs text-warning">
                +{overdue.length - 3} mas
              </p>
            )}
          </div>
        </div>
      )}

      {/* Activity list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No hay actividades para hoy"
          description="No hay actividades programadas."
          action={{ label: "Ver todas", href: "/activities" }}
        />
      ) : (
        <div className="space-y-2">
          {filtered
            .filter((a) => filter !== "overdue" || a.status === "overdue")
            .filter(
              (a) =>
                filter !== "pending" ||
                a.status === "pending" ||
                a.status === "overdue",
            )
            .map((act) => (
              <ActivityCard key={act.id} activity={act} />
            ))}
        </div>
      )}
    </section>
  );
}

// ── Sub-components ───────────────────────────────────────────────

function ActivityCard({ activity }: { activity: TodayActivityItem }) {
  const isCompleted = activity.status === "completed";
  const colorClass = getTypeColor(activity.activityTypeName);

  return (
    <Link
      href={`/activities/${activity.id}`}
      className={cn(
        "flex items-center gap-3 rounded-lg border-l-4 border border-border bg-surface-card p-3 transition-colors hover:bg-surface-secondary",
        colorClass,
        isCompleted && "opacity-60",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "truncate text-sm font-semibold",
              isCompleted ? "text-secondary" : "text-primary",
            )}
          >
            {activity.templateName}
          </span>
          <span className="shrink-0 font-mono text-[10px] text-tertiary">
            {activity.batchCode}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-secondary">
          <span>{activity.zoneName}</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {activity.estimatedDurationMin} min
          </span>
          <span>Dia {activity.cropDay}</span>
        </div>
      </div>

      <Badge variant={STATUS_VARIANTS[activity.status] ?? "outlined"}>
        {STATUS_LABELS[activity.status] ?? activity.status}
      </Badge>

      {!isCompleted && (
        <ChevronRight className="h-4 w-4 shrink-0 text-tertiary" />
      )}
    </Link>
  );
}

function OverdueCard({ activity }: { activity: TodayActivityItem }) {
  return (
    <Link
      href={`/activities/${activity.id}`}
      className="flex items-center gap-2 rounded border border-warning/20 bg-surface px-3 py-2 text-sm hover:bg-surface-secondary"
    >
      <span className="flex-1 truncate font-medium text-primary">
        {activity.templateName} — {activity.batchCode}
      </span>
      <span className="font-mono text-xs text-warning">
        {activity.plannedDate}
      </span>
      <ChevronRight className="h-3.5 w-3.5 text-warning" />
    </Link>
  );
}
