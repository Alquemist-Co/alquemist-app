"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/shared/skeleton";
import { toast } from "@/lib/utils/toast-store";
import { useAuthStore } from "@/stores/auth-store";
import { hasPermission } from "@/lib/auth/permissions";
import {
  getBatchScheduledActivities,
  rescheduleActivity,
  cancelScheduledActivity,
} from "@/lib/actions/scheduled-activities";
import type { ScheduledActivityItem } from "@/lib/actions/scheduled-activities";
import { ClipboardList, Calendar, XCircle } from "lucide-react";

type Props = {
  batchId: string;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  completed: "Completada",
  skipped: "Cancelada",
  overdue: "Vencida",
};

const STATUS_VARIANTS: Record<
  string,
  "success" | "warning" | "info" | "error" | "outlined"
> = {
  pending: "outlined",
  completed: "success",
  skipped: "error",
  overdue: "warning",
};

export function ActivitiesTab({ batchId }: Props) {
  const router = useRouter();
  const role = useAuthStore((s) => s.role);
  const canManage = role
    ? hasPermission(role, "advance_phase")
    : false;

  const [activities, setActivities] = useState<ScheduledActivityItem[] | null>(
    null,
  );
  const fetchedRef = useRef(false);

  // Reschedule state
  const [rescheduleTarget, setRescheduleTarget] =
    useState<ScheduledActivityItem | null>(null);
  const [newDate, setNewDate] = useState("");
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  // Cancel state
  const [cancelTarget, setCancelTarget] =
    useState<ScheduledActivityItem | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  // Initial load — ref guard for StrictMode
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    getBatchScheduledActivities(batchId).then(setActivities);
  }, [batchId]);

  function reloadActivities() {
    setActivities(null);
    getBatchScheduledActivities(batchId).then(setActivities);
  }

  const loading = activities === null;

  // ── Reschedule handler ──
  async function handleReschedule() {
    if (!rescheduleTarget || !newDate) return;
    setRescheduleLoading(true);
    const result = await rescheduleActivity(rescheduleTarget.id, newDate);
    setRescheduleLoading(false);

    if (result.success) {
      toast.success("Actividad reprogramada.");
      setRescheduleTarget(null);
      setNewDate("");
      reloadActivities();
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  // ── Cancel handler ──
  async function handleCancel() {
    if (!cancelTarget || cancelReason.trim().length < 5) return;
    setCancelLoading(true);
    const result = await cancelScheduledActivity(
      cancelTarget.id,
      cancelReason.trim(),
    );
    setCancelLoading(false);

    if (result.success) {
      toast.success("Actividad cancelada.");
      setCancelTarget(null);
      setCancelReason("");
      reloadActivities();
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Sin actividades programadas"
        description="Las actividades se generan automaticamente al avanzar de fase o al aprobar la orden."
      />
    );
  }

  // Group by phase
  const grouped = new Map<string, ScheduledActivityItem[]>();
  for (const act of activities) {
    const list = grouped.get(act.phaseName) ?? [];
    list.push(act);
    grouped.set(act.phaseName, list);
  }

  return (
    <>
      <div className="space-y-6">
        {Array.from(grouped.entries()).map(([phaseName, items]) => (
          <div key={phaseName}>
            <h3 className="mb-2 text-sm font-bold text-primary">
              {phaseName}
            </h3>
            <div className="space-y-2">
              {items.map((act) => {
                const canAction =
                  canManage &&
                  (act.status === "pending" || act.status === "overdue");
                return (
                  <div
                    key={act.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-surface-card p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-primary truncate">
                          {act.templateName}
                        </span>
                        <span className="font-mono text-[10px] text-tertiary">
                          {act.templateCode}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-secondary">
                        <span className="font-mono">{act.plannedDate}</span>
                        <span>Dia {act.cropDay}</span>
                      </div>
                    </div>

                    <Badge variant={STATUS_VARIANTS[act.status] ?? "outlined"}>
                      {STATUS_LABELS[act.status] ?? act.status}
                    </Badge>

                    {canAction && (
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setRescheduleTarget(act);
                            setNewDate(act.plannedDate);
                          }}
                          className="rounded p-1 text-secondary hover:bg-surface-secondary hover:text-primary"
                          title="Reprogramar"
                        >
                          <Calendar className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCancelTarget(act);
                            setCancelReason("");
                          }}
                          className="rounded p-1 text-secondary hover:bg-error/10 hover:text-error"
                          title="Cancelar"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Reschedule dialog */}
      <Dialog
        open={!!rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        title="Reprogramar actividad"
        footer={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setRescheduleTarget(null)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleReschedule}
              loading={rescheduleLoading}
              disabled={!newDate}
            >
              Reprogramar
            </Button>
          </div>
        }
      >
        {rescheduleTarget && (
          <div className="space-y-4">
            <p className="text-sm text-secondary">
              {rescheduleTarget.templateName} — Dia {rescheduleTarget.cropDay}
            </p>
            <Input
              label="Nueva fecha"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
          </div>
        )}
      </Dialog>

      {/* Cancel dialog */}
      <Dialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="Cancelar actividad"
        footer={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setCancelTarget(null)}
            >
              Volver
            </Button>
            <Button
              onClick={handleCancel}
              loading={cancelLoading}
              disabled={cancelReason.trim().length < 5}
            >
              Confirmar cancelacion
            </Button>
          </div>
        }
      >
        {cancelTarget && (
          <div className="space-y-4">
            <p className="text-sm text-secondary">
              {cancelTarget.templateName} — {cancelTarget.plannedDate}
            </p>
            <Input
              label="Razon de cancelacion"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Minimo 5 caracteres"
            />
          </div>
        )}
      </Dialog>
    </>
  );
}
