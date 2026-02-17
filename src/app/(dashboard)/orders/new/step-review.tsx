"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type {
  OrderWizardData,
  WizardCultivar,
  WizardPhase,
} from "@/lib/actions/orders";
import { createOrder } from "@/lib/actions/orders";
import type { WizardPhaseConfig } from "@/stores/order-wizard-store";
import { useOrderWizardStore } from "@/stores/order-wizard-store";
import {
  calculateYieldCascade,
  type PhaseFlowInfo,
} from "@/lib/utils/yield-cascade";
import { hasPermission } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/utils/toast-store";
import { cn } from "@/lib/utils/cn";
import {
  Pencil,
  Save,
  CheckCircle,
  ArrowDown,
} from "lucide-react";

type StoreState = {
  cultivarId: string;
  cropTypeId: string;
  entryPhaseId: string;
  exitPhaseId: string;
  initialQuantity: number;
  initialUnitId: string;
  initialProductId: string;
  plannedStartDate: string;
  priority: "low" | "normal" | "high" | "urgent";
  assignedTo: string;
  phaseConfig: WizardPhaseConfig[];
  notes: string;
};

type Props = {
  data: OrderWizardData;
  cultivar: WizardCultivar | null;
  phases: WizardPhase[];
  store: StoreState;
  role: UserRole | null;
  onGoToStep: (step: number) => void;
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baja",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

const PRIORITY_VARIANTS: Record<string, "outlined" | "info" | "warning" | "error"> = {
  low: "outlined",
  normal: "info",
  high: "warning",
  urgent: "error",
};

export function StepReview({
  data,
  cultivar,
  phases,
  store,
  role,
  onGoToStep,
}: Props) {
  const router = useRouter();
  const resetWizard = useOrderWizardStore((s) => s.resetWizard);
  const setNotes = useOrderWizardStore((s) => s.setNotes);
  const [saving, setSaving] = useState(false);

  const entryPhase = phases.find((p) => p.id === store.entryPhaseId);
  const exitPhase = phases.find((p) => p.id === store.exitPhaseId);

  const unit = data.units.find((u) => u.id === store.initialUnitId);
  const assignee = data.users.find((u) => u.id === store.assignedTo);

  const canApprove = role ? hasPermission(role, "approve_order") : false;

  // Active phases (not skipped)
  const activeConfig = store.phaseConfig.filter((pc) => !pc.skipped);

  // Yield cascade
  const cascade = useMemo(() => {
    const infos: PhaseFlowInfo[] = activeConfig.map((pc) => {
      const phase = phases.find((p) => p.id === pc.phaseId);
      const flow = data.phaseFlows.find(
        (f) =>
          f.phaseId === pc.phaseId &&
          f.direction === "output" &&
          f.productRole === "primary",
      );
      return {
        phaseId: pc.phaseId,
        phaseName: phase?.name ?? "?",
        phaseCode: phase?.code ?? "?",
        primaryOutputYieldPct: flow?.expectedYieldPct
          ? parseFloat(flow.expectedYieldPct)
          : null,
      };
    });
    return calculateYieldCascade(infos, store.initialQuantity);
  }, [activeConfig, phases, data.phaseFlows, store.initialQuantity]);

  const finalOutput = cascade.length > 0 ? cascade[cascade.length - 1].outputQty : 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await createOrder({
        cultivarId: store.cultivarId,
        entryPhaseId: store.entryPhaseId,
        exitPhaseId: store.exitPhaseId,
        initialQuantity: store.initialQuantity,
        initialUnitId: store.initialUnitId,
        initialProductId: store.initialProductId || "",
        plannedStartDate: store.plannedStartDate,
        priority: store.priority,
        assignedTo: store.assignedTo || "",
        notes: store.notes || "",
        phaseConfig: store.phaseConfig,
      });

      if (result.success) {
        toast.success(`Orden ${result.data.code} creada como borrador`);
        resetWizard();
        router.push("/orders");
      } else {
        toast.error(result.error);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-primary">
          Revision de la orden
        </h2>
        <p className="mt-1 text-sm text-secondary">
          Verifica los datos antes de guardar.
        </p>
      </div>

      {/* Section: Cultivar */}
      <ReviewSection title="Cultivar" step={1} onEdit={onGoToStep}>
        <div className="flex items-center gap-2">
          <span className="font-bold text-primary">
            {cultivar?.name ?? "—"}
          </span>
          <Badge variant="outlined">{cultivar?.cropTypeName}</Badge>
        </div>
        {cultivar?.defaultCycleDays && (
          <p className="mt-1 text-xs text-secondary">
            Ciclo: {cultivar.defaultCycleDays} dias
          </p>
        )}
      </ReviewSection>

      {/* Section: Phases */}
      <ReviewSection title="Fases" step={2} onEdit={onGoToStep}>
        <div className="flex flex-wrap items-center gap-1">
          {activeConfig.map((pc, idx) => {
            const phase = phases.find((p) => p.id === pc.phaseId);
            const isEntry = pc.phaseId === store.entryPhaseId;
            const isExit = pc.phaseId === store.exitPhaseId;
            return (
              <span key={pc.phaseId} className="flex items-center gap-1">
                {idx > 0 && (
                  <ArrowDown className="h-3 w-3 rotate-[-90deg] text-tertiary" />
                )}
                <Badge
                  variant={
                    isEntry || isExit ? "info" : "outlined"
                  }
                >
                  {phase?.name ?? "?"}
                </Badge>
              </span>
            );
          })}
        </div>
        {store.phaseConfig.some((pc) => pc.skipped) && (
          <p className="mt-1 text-xs text-warning">
            {store.phaseConfig.filter((pc) => pc.skipped).length} fase(s) omitida(s)
          </p>
        )}
      </ReviewSection>

      {/* Section: Quantity + Yield */}
      <ReviewSection title="Cantidad y rendimiento" step={3} onEdit={onGoToStep}>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-lg font-bold text-primary">
            {store.initialQuantity.toLocaleString("es-CO")}
          </span>
          <span className="text-sm text-secondary">
            {unit?.name ?? "—"}
          </span>
        </div>
        {cascade.length > 1 && (
          <p className="mt-1 text-xs text-secondary">
            Output final esperado:{" "}
            <span className="font-mono font-bold text-brand">
              {formatNumber(finalOutput)}
            </span>
          </p>
        )}
      </ReviewSection>

      {/* Section: Planning */}
      <ReviewSection title="Planificacion" step={4} onEdit={onGoToStep}>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <span className="text-xs text-tertiary">Inicio:</span>{" "}
            <span className="font-mono text-primary">
              {store.plannedStartDate || "—"}
            </span>
          </div>
          <div>
            <span className="text-xs text-tertiary">Prioridad:</span>{" "}
            <Badge variant={PRIORITY_VARIANTS[store.priority]}>
              {PRIORITY_LABELS[store.priority]}
            </Badge>
          </div>
          <div>
            <span className="text-xs text-tertiary">Responsable:</span>{" "}
            <span className="text-primary">
              {assignee?.fullName ?? "Sin asignar"}
            </span>
          </div>
        </div>

        {/* Zone assignments */}
        {activeConfig.some((pc) => pc.zoneId) && (
          <div className="mt-2 space-y-1">
            <span className="text-xs text-tertiary">Zonas:</span>
            {activeConfig
              .filter((pc) => pc.zoneId)
              .map((pc) => {
                const phase = phases.find((p) => p.id === pc.phaseId);
                const zone = data.zones.find((z) => z.id === pc.zoneId);
                return (
                  <div key={pc.phaseId} className="flex items-center gap-2 text-xs">
                    <span className="text-secondary">{phase?.name}:</span>
                    <span className="text-primary">{zone?.name}</span>
                  </div>
                );
              })}
          </div>
        )}
      </ReviewSection>

      {/* Notes */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-primary">Notas (opcional)</h3>
        <textarea
          value={store.notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Observaciones adicionales..."
          className="w-full rounded-input border border-border bg-surface px-3 py-2 text-sm text-primary placeholder:text-tertiary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button
          variant="secondary"
          icon={Save}
          onClick={handleSave}
          loading={saving}
        >
          Guardar como borrador
        </Button>
        {canApprove && (
          <Button
            icon={CheckCircle}
            onClick={handleSave}
            loading={saving}
            disabled
          >
            Aprobar directamente
          </Button>
        )}
      </div>

      {canApprove && (
        <p className="text-xs text-tertiary">
          La aprobacion directa estara disponible en una proxima version (F-014).
        </p>
      )}
    </div>
  );
}

function ReviewSection({
  title,
  step,
  onEdit,
  children,
}: {
  title: string;
  step: number;
  onEdit: (step: number) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-primary">{title}</h3>
        <button
          type="button"
          onClick={() => onEdit(step)}
          className="flex items-center gap-1 text-xs text-brand hover:text-brand/80"
        >
          <Pencil className="h-3 w-3" />
          Editar
        </button>
      </div>
      {children}
    </div>
  );
}

function formatNumber(n: number): string {
  if (n === 0) return "0";
  if (n >= 1) return n.toLocaleString("es-CO", { maximumFractionDigits: 1 });
  return n.toLocaleString("es-CO", { maximumFractionDigits: 2 });
}
