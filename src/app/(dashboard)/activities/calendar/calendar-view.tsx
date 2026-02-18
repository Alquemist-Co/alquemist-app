"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import {
  getCalendarActivities,
  rescheduleActivity,
  type CalendarActivityItem,
} from "@/lib/actions/scheduled-activities";
import { toast } from "@/lib/utils/toast-store";

type ViewMode = "week" | "month";

const DAY_NAMES = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-brand/10 border-brand/30 text-brand",
  overdue: "bg-error/10 border-error/30 text-error",
  completed: "bg-success/10 border-success/30 text-success",
};

type Props = {
  initialActivities: CalendarActivityItem[];
  initialStart: string;
};

export function CalendarView({ initialActivities, initialStart }: Props) {
  const [activities, setActivities] = useState(initialActivities);
  const [weekStart, setWeekStart] = useState(initialStart);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [loading, setLoading] = useState(false);
  const loadedRef = useRef(false);

  const weekEnd = getEndDate(weekStart, viewMode);

  // Refetch when week changes (skip initial)
  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      return;
    }
    let cancelled = false;
    const end = getEndDate(weekStart, viewMode);
    getCalendarActivities(weekStart, end).then((data) => {
      if (!cancelled) {
        setActivities(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [weekStart, viewMode]);

  function navigate(direction: -1 | 1) {
    const current = new Date(weekStart);
    const days = viewMode === "week" ? 7 : 28;
    current.setDate(current.getDate() + days * direction);
    setWeekStart(current.toISOString().split("T")[0]);
  }

  function goToToday() {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day + 6) % 7));
    setWeekStart(monday.toISOString().split("T")[0]);
  }

  async function handleReschedule(activityId: string, newDate: string) {
    const result = await rescheduleActivity(activityId, newDate);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Actividad reprogramada");
    // Refetch by triggering the effect — toggle loading to force refetch
    const end = getEndDate(weekStart, viewMode);
    getCalendarActivities(weekStart, end).then(setActivities);
  }

  // Build days array
  const days = getDays(weekStart, viewMode);
  const today = new Date().toISOString().split("T")[0];

  // Group activities by date
  const byDate = new Map<string, CalendarActivityItem[]>();
  for (const act of activities) {
    const list = byDate.get(act.plannedDate) ?? [];
    list.push(act);
    byDate.set(act.plannedDate, list);
  }

  const headerLabel = viewMode === "week"
    ? `${formatShort(weekStart)} — ${formatShort(weekEnd)}`
    : formatMonth(weekStart);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6 lg:py-8">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-bold text-text-primary">Calendario</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={goToToday}>
            Hoy
          </Button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded p-1 text-text-secondary hover:bg-surface-secondary"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[140px] text-center text-sm font-medium text-text-primary">
              {headerLabel}
            </span>
            <button
              type="button"
              onClick={() => navigate(1)}
              className="rounded p-1 text-text-secondary hover:bg-surface-secondary"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={cn(
                "px-3 py-1 text-xs font-medium transition-colors",
                viewMode === "week"
                  ? "bg-brand text-white"
                  : "text-text-secondary hover:text-text-primary",
              )}
            >
              Semana
            </button>
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={cn(
                "px-3 py-1 text-xs font-medium transition-colors",
                viewMode === "month"
                  ? "bg-brand text-white"
                  : "text-text-secondary hover:text-text-primary",
              )}
            >
              Mes
            </button>
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div
        className={cn(
          "grid gap-px rounded-lg border border-border bg-border overflow-hidden",
          viewMode === "week" ? "grid-cols-7" : "grid-cols-7",
        )}
      >
        {/* Day headers */}
        {DAY_NAMES.map((name) => (
          <div
            key={name}
            className="bg-surface-secondary px-2 py-1.5 text-center text-xs font-bold text-text-secondary"
          >
            {name}
          </div>
        ))}

        {/* Day cells */}
        {days.map((date) => {
          const dateStr = date.toISOString().split("T")[0];
          const dayActivities = byDate.get(dateStr) ?? [];
          const isToday = dateStr === today;
          const isCurrentMonth = viewMode === "month"
            ? date.getMonth() === new Date(weekStart).getMonth()
            : true;

          return (
            <div
              key={dateStr}
              className={cn(
                "bg-surface-card p-1.5",
                viewMode === "week" ? "min-h-[120px]" : "min-h-[80px]",
                !isCurrentMonth && "opacity-40",
              )}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const actId = e.dataTransfer.getData("text/plain");
                if (actId) handleReschedule(actId, dateStr);
              }}
            >
              <div
                className={cn(
                  "mb-1 text-xs font-mono",
                  isToday
                    ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white"
                    : "text-text-secondary",
                )}
              >
                {date.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayActivities.slice(0, viewMode === "week" ? 5 : 3).map((act) => (
                  <div
                    key={act.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", act.id);
                    }}
                    className={cn(
                      "cursor-grab rounded border px-1 py-0.5 text-[10px] leading-tight truncate",
                      STATUS_COLORS[act.status] ?? "bg-surface-secondary text-text-secondary",
                    )}
                    title={`${act.templateName} — ${act.batchCode} (${act.zoneName})`}
                  >
                    {act.templateName}
                  </div>
                ))}
                {dayActivities.length > (viewMode === "week" ? 5 : 3) && (
                  <span className="text-[10px] text-text-tertiary">
                    +{dayActivities.length - (viewMode === "week" ? 5 : 3)} mas
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {loading && (
        <div className="mt-4 text-center text-sm text-text-secondary">
          Cargando...
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────

function getEndDate(start: string, mode: ViewMode): string {
  const d = new Date(start);
  d.setDate(d.getDate() + (mode === "week" ? 6 : 34));
  return d.toISOString().split("T")[0];
}

function getDays(start: string, mode: ViewMode): Date[] {
  const days: Date[] = [];
  const startDate = new Date(start);

  if (mode === "week") {
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      days.push(d);
    }
  } else {
    // Month view: start from Monday of the week containing the 1st
    const first = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const dayOfWeek = (first.getDay() + 6) % 7; // Monday = 0
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - dayOfWeek);

    for (let i = 0; i < 35; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      days.push(d);
    }
  }

  return days;
}

function formatShort(date: string): string {
  return new Date(date).toLocaleDateString("es-CO", {
    month: "short",
    day: "numeric",
  });
}

function formatMonth(date: string): string {
  return new Date(date).toLocaleDateString("es-CO", {
    month: "long",
    year: "numeric",
  });
}
