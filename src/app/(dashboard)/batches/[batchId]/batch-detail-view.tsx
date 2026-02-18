"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { BatchDetail } from "@/lib/actions/batches";
import { useAuthStore } from "@/stores/auth-store";
import { hasPermission } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils/cn";
import {
  ArrowLeft,
  ExternalLink,
  Clock,
  ClipboardList,
  Package,
  DollarSign,
  Shield,
  Check,
  ChevronRight,
  Scissors,
  ArrowRightLeft,
  GitBranch,
  Pause,
  Play,
  XCircle,
  MapPin,
} from "lucide-react";
import { AdvancePhaseDialog } from "./advance-phase-dialog";
import { ActivitiesTab } from "./activities-tab";
import { TransformDialog } from "./transform-dialog";
import { BatchInventoryTab } from "./batch-inventory-tab";
import { BatchQualityTab } from "./batch-quality-tab";
import { BatchCostsTab } from "./batch-costs-tab";
import { BatchActionsDialogs } from "./batch-actions-dialogs";

type Props = {
  batch: BatchDetail;
  zones: { id: string; name: string }[];
};

const STATUS_LABELS: Record<string, string> = {
  active: "Activo",
  phase_transition: "En transicion",
  completed: "Completado",
  cancelled: "Cancelado",
  on_hold: "En pausa",
};

const STATUS_VARIANTS: Record<string, "success" | "warning" | "info" | "error" | "outlined"> = {
  active: "success",
  phase_transition: "warning",
  completed: "info",
  cancelled: "error",
  on_hold: "outlined",
};

const PHASE_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  ready: "Lista",
  in_progress: "En progreso",
  completed: "Completada",
  skipped: "Omitida",
};

type TabKey = "timeline" | "activities" | "inventory" | "costs" | "quality";

const TABS: { key: TabKey; label: string; icon: typeof Clock }[] = [
  { key: "timeline", label: "Timeline", icon: Clock },
  { key: "activities", label: "Actividades", icon: ClipboardList },
  { key: "inventory", label: "Inventario", icon: Package },
  { key: "costs", label: "Costos", icon: DollarSign },
  { key: "quality", label: "Calidad", icon: Shield },
];

export function BatchDetailView({ batch, zones }: Props) {
  const router = useRouter();
  const role = useAuthStore((s) => s.role);
  const canAdvance = role ? hasPermission(role, "advance_phase") : false;
  const canSplit = role ? hasPermission(role, "split_batch") : false;
  const canTransform = role ? hasPermission(role, "create_inventory_transaction") : false;
  const canManageBatch = role ? hasPermission(role, "advance_phase") : false;
  const [activeTab, setActiveTab] = useState<TabKey>("timeline");
  const [advanceDialogOpen, setAdvanceDialogOpen] = useState(false);
  const [transformDialogOpen, setTransformDialogOpen] = useState(false);
  const [batchActionDialog, setBatchActionDialog] = useState<
    "hold" | "resume" | "cancel" | "zone-change" | null
  >(null);

  const isActive = batch.status === "active";
  const isOnHold = batch.status === "on_hold";

  // Determine if batch is at exit phase (last non-skipped phase)
  const lastNonSkipped = [...batch.phases]
    .reverse()
    .find((p) => p.status !== "skipped");
  const isExitPhase =
    lastNonSkipped && lastNonSkipped.phaseId === batch.currentPhaseId;

  // Calculate phase progress
  const totalPhases = batch.phases.filter((p) => p.status !== "skipped").length;
  const completedPhases = batch.phases.filter(
    (p) => p.status === "completed",
  ).length;
  const progressPct = totalPhases > 0 ? (completedPhases / totalPhases) * 100 : 0;

  return (
    <>
      {/* Hero header */}
      <div className="border-b border-border bg-surface px-4 py-4 lg:px-6">
        <div className="mb-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/batches")}
            className="text-secondary hover:text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-xl font-bold text-primary">
                {batch.code}
              </h1>
              <Badge variant={STATUS_VARIANTS[batch.status] ?? "outlined"}>
                {STATUS_LABELS[batch.status] ?? batch.status}
              </Badge>
            </div>
            <p className="text-sm text-secondary">
              {batch.cultivarName} — {batch.cropTypeName}
            </p>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricBox label="Fase actual" value={batch.currentPhaseName} />
          <MetricBox label="Zona" value={batch.zoneName} />
          <MetricBox
            label="Plantas"
            value={batch.plantCount.toLocaleString("es-CO")}
            mono
          />
          <MetricBox label="Inicio" value={batch.startDate} mono />
        </div>

        {/* Actions row */}
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          {batch.orderCode && batch.orderId && (
            <Link
              href={`/orders/${batch.orderId}`}
              className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
            >
              Orden: {batch.orderCode}
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
          <Link
            href={`/batches/${batch.id}/genealogy`}
            className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
          >
            <GitBranch className="h-3 w-3" />
            Genealogia
          </Link>
          <div className="ml-auto flex items-center gap-2">
            {canManageBatch && isActive && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setBatchActionDialog("hold")}
                icon={Pause}
              >
                Pausar
              </Button>
            )}
            {canManageBatch && isOnHold && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setBatchActionDialog("resume")}
                icon={Play}
              >
                Reanudar
              </Button>
            )}
            {canManageBatch && isActive && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setBatchActionDialog("zone-change")}
                icon={MapPin}
              >
                Zona
              </Button>
            )}
            {canTransform && isActive && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setTransformDialogOpen(true)}
                icon={ArrowRightLeft}
              >
                Transformar
              </Button>
            )}
            {canSplit && isActive && (
              <Link href={`/batches/${batch.id}/split`}>
                <Button size="sm" variant="ghost" icon={Scissors}>
                  Dividir
                </Button>
              </Link>
            )}
            {canManageBatch && (isActive || isOnHold) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setBatchActionDialog("cancel")}
                icon={XCircle}
                className="text-error"
              >
                Cancelar
              </Button>
            )}
            {canAdvance && isActive && (
              <Button
                size="sm"
                onClick={() => setAdvanceDialogOpen(true)}
                icon={isExitPhase ? Check : ChevronRight}
              >
                {isExitPhase ? "Completar batch" : "Avanzar fase"}
              </Button>
            )}
          </div>
        </div>

        {/* Phase stepper */}
        {batch.phases.length > 0 && (
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs text-tertiary">
                Progreso: {completedPhases}/{totalPhases} fases
              </span>
              <span className="font-mono text-xs text-primary">
                {Math.round(progressPct)}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-border">
              <div
                className="h-1.5 rounded-full bg-brand transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="mt-3 flex gap-1 overflow-x-auto">
              {batch.phases
                .filter((p) => p.status !== "skipped")
                .map((phase) => {
                  const isCurrent = phase.phaseId === batch.currentPhaseId;
                  const isCompleted = phase.status === "completed";

                  return (
                    <div
                      key={phase.id}
                      className={cn(
                        "flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                        isCompleted && "bg-success/10 text-success",
                        isCurrent && "bg-brand/10 text-brand",
                        !isCompleted &&
                          !isCurrent &&
                          "bg-surface-secondary text-tertiary",
                      )}
                    >
                      {isCompleted && <Check className="h-3 w-3" />}
                      {isCurrent && (
                        <span className="h-2 w-2 animate-pulse rounded-full bg-brand" />
                      )}
                      {phase.phaseName}
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-border bg-surface">
        <nav className="flex gap-0 overflow-x-auto px-4 lg:px-6">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors",
                  isActive
                    ? "border-brand text-brand"
                    : "border-transparent text-secondary hover:text-primary",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        {activeTab === "timeline" && <TimelineTab batch={batch} />}
        {activeTab === "activities" && (
          <ActivitiesTab batchId={batch.id} />
        )}
        {activeTab === "inventory" && (
          <BatchInventoryTab batchId={batch.id} />
        )}
        {activeTab === "costs" && (
          <BatchCostsTab batchId={batch.id} />
        )}
        {activeTab === "quality" && (
          <BatchQualityTab batchId={batch.id} />
        )}
      </div>

      {/* Advance phase dialog */}
      <AdvancePhaseDialog
        batchId={batch.id}
        open={advanceDialogOpen}
        onClose={() => setAdvanceDialogOpen(false)}
      />

      {/* Transform dialog */}
      <TransformDialog
        batchId={batch.id}
        open={transformDialogOpen}
        onClose={() => setTransformDialogOpen(false)}
      />

      {/* Batch lifecycle dialogs */}
      <BatchActionsDialogs
        batchId={batch.id}
        batchStatus={batch.status}
        currentZoneId={batch.zoneId}
        zones={zones.map((z) => ({ ...z, plantCapacity: 0, currentOccupancy: 0 }))}
        dialog={batchActionDialog}
        onClose={() => setBatchActionDialog(null)}
      />
    </>
  );
}

function MetricBox({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg bg-surface-secondary px-3 py-2">
      <span className="block text-xs text-tertiary">{label}</span>
      <span
        className={cn("text-sm font-bold text-primary", mono && "font-mono")}
      >
        {value}
      </span>
    </div>
  );
}

function TimelineTab({ batch }: { batch: BatchDetail }) {
  if (batch.phases.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="Sin fases"
        description="Este batch no tiene fases de orden asociadas."
      />
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-primary">Cronologia de fases</h3>
      <div className="space-y-2">
        {batch.phases.map((phase) => {
          const isCurrent = phase.phaseId === batch.currentPhaseId;
          const isCompleted = phase.status === "completed";

          return (
            <div
              key={phase.id}
              className={cn(
                "rounded-lg border p-3",
                isCurrent
                  ? "border-brand/30 bg-brand/5"
                  : isCompleted
                    ? "border-success/30 bg-success/5"
                    : "border-border bg-surface-card",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                      isCompleted && "bg-success text-white",
                      isCurrent && "bg-brand text-white",
                      !isCompleted &&
                        !isCurrent &&
                        "bg-border text-tertiary",
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      phase.sortOrder
                    )}
                  </span>
                  <span className="text-sm font-medium text-primary">
                    {phase.phaseName}
                  </span>
                </div>
                <Badge
                  variant={
                    isCompleted
                      ? "success"
                      : isCurrent
                        ? "warning"
                        : phase.status === "skipped"
                          ? "error"
                          : "outlined"
                  }
                >
                  {PHASE_STATUS_LABELS[phase.status] ?? phase.status}
                </Badge>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
                {phase.zoneName && (
                  <div>
                    <span className="text-tertiary">Zona: </span>
                    <span className="text-primary">{phase.zoneName}</span>
                  </div>
                )}
                {phase.plannedStartDate && (
                  <div>
                    <span className="text-tertiary">Plan inicio: </span>
                    <span className="font-mono text-primary">
                      {phase.plannedStartDate}
                    </span>
                  </div>
                )}
                {phase.plannedEndDate && (
                  <div>
                    <span className="text-tertiary">Plan fin: </span>
                    <span className="font-mono text-primary">
                      {phase.plannedEndDate}
                    </span>
                  </div>
                )}
                {phase.actualStartDate && (
                  <div>
                    <span className="text-tertiary">Real inicio: </span>
                    <span className="font-mono text-brand">
                      {phase.actualStartDate}
                    </span>
                  </div>
                )}
                {phase.yieldPct && (
                  <div>
                    <span className="text-tertiary">Yield: </span>
                    <span className="font-mono text-primary">
                      {phase.yieldPct}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
