"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/utils/toast-store";
import { cn } from "@/lib/utils/cn";
import { executeActivity } from "@/lib/actions/execute-activity";
import type { ActivityContext } from "@/lib/actions/execute-activity";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Package,
  ClipboardList,
  AlertTriangle,
  Pause,
  Play,
} from "lucide-react";

type Props = {
  context: ActivityContext;
};

type Step = 1 | 2 | 3;

type ResourceEntry = {
  productId: string;
  productName: string;
  productSku: string;
  unitName: string;
  unitId: string;
  quantityPlanned: number;
  quantityActual: number;
  quantityBasis: string;
  isOptional: boolean;
};

type ChecklistEntry = {
  stepOrder: number;
  instruction: string;
  isCritical: boolean;
  requiresPhoto: boolean;
  expectedValue: string | null;
  tolerance: string | null;
  isCompleted: boolean;
  valueRecorded: string;
};

export function ExecuteActivityView({ context }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState("");

  // Timer state — lazy init to avoid impure render
  const startTimeRef = useRef<number>(0);
  const [pausedMs, setPausedMs] = useState(0);
  const pauseStartRef = useRef<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [timerDisplay, setTimerDisplay] = useState("00:00");
  const timerInitRef = useRef(false);

  useEffect(() => {
    if (!timerInitRef.current) {
      startTimeRef.current = Date.now();
      timerInitRef.current = true;
    }
    const id = setInterval(() => {
      if (pauseStartRef.current !== null) return;
      const now = Date.now();
      const elapsed = now - startTimeRef.current - pausedMs;
      const mins = Math.floor(elapsed / 60000);
      const secs = Math.floor((elapsed % 60000) / 1000);
      setTimerDisplay(
        `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`,
      );
    }, 1000);
    return () => clearInterval(id);
  }, [pausedMs]);

  function togglePause() {
    if (isPaused && pauseStartRef.current !== null) {
      setPausedMs((prev) => prev + (Date.now() - pauseStartRef.current!));
      pauseStartRef.current = null;
      setIsPaused(false);
    } else {
      pauseStartRef.current = Date.now();
      setIsPaused(true);
    }
  }

  function getDurationMinutes(): number {
    let totalPaused = pausedMs;
    if (pauseStartRef.current !== null) {
      totalPaused += Date.now() - pauseStartRef.current;
    }
    return Math.max(1, Math.round((Date.now() - startTimeRef.current - totalPaused) / 60000));
  }

  // Resources state
  const [resources, setResources] = useState<ResourceEntry[]>(
    context.resources.map((r) => ({
      ...r,
      quantityActual: r.quantityPlanned,
    })),
  );

  function updateResourceQty(idx: number, value: number) {
    setResources((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, quantityActual: value } : r)),
    );
  }

  // Checklist state
  const [checklist, setChecklist] = useState<ChecklistEntry[]>(
    context.checklist.map((c) => ({
      ...c,
      isCompleted: false,
      valueRecorded: "",
    })),
  );

  function toggleChecklistItem(idx: number) {
    setChecklist((prev) =>
      prev.map((c, i) =>
        i === idx ? { ...c, isCompleted: !c.isCompleted } : c,
      ),
    );
  }

  function updateChecklistValue(idx: number, value: string) {
    setChecklist((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, valueRecorded: value } : c)),
    );
  }

  // Validation
  const criticalItems = checklist.filter((c) => c.isCritical);
  const criticalCompleted = criticalItems.filter((c) => c.isCompleted).length;
  const allCriticalDone = criticalCompleted === criticalItems.length;

  // Submit
  async function handleSubmit() {
    setSubmitting(true);
    const result = await executeActivity({
      scheduledActivityId: context.scheduledActivityId,
      resources: resources.map((r) => ({
        productId: r.productId,
        quantityPlanned: r.quantityPlanned,
        quantityActual: r.quantityActual,
        unitId: r.unitId,
      })),
      checklistResults: checklist.map((c) => ({
        stepOrder: c.stepOrder,
        isCompleted: c.isCompleted,
        valueRecorded: c.valueRecorded || undefined,
      })),
      notes: notes || undefined,
      durationMinutes: getDurationMinutes(),
    });
    setSubmitting(false);

    if (result.success) {
      toast.success("Actividad completada.");
      router.push("/activities");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  const STEPS = [
    { num: 1, label: "Recursos", icon: Package },
    { num: 2, label: "Checklist", icon: ClipboardList },
    { num: 3, label: "Confirmar", icon: Check },
  ] as const;

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="border-b border-border bg-surface px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/activities")}
            className="text-secondary hover:text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-primary truncate">
              {context.templateName}
            </h1>
            <p className="text-xs text-secondary">
              {context.batchCode} — {context.zoneName} — {context.phaseName}
            </p>
          </div>
          {/* Timer */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={togglePause}
              className="rounded p-1 text-secondary hover:bg-surface-secondary"
            >
              {isPaused ? (
                <Play className="h-3.5 w-3.5" />
              ) : (
                <Pause className="h-3.5 w-3.5" />
              )}
            </button>
            <span
              className={cn(
                "font-mono text-sm font-bold",
                isPaused ? "text-tertiary" : "text-primary",
              )}
            >
              {timerDisplay}
            </span>
          </div>
        </div>

        {/* Step indicator */}
        <div className="mt-3 flex gap-1">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const isActive = step === s.num;
            const isDone = step > s.num;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => setStep(s.num as Step)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 text-xs font-medium transition-colors",
                  isActive && "bg-brand text-white",
                  isDone && "bg-success/10 text-success",
                  !isActive && !isDone && "bg-surface-secondary text-tertiary",
                )}
              >
                {isDone ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Icon className="h-3 w-3" />
                )}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        {step === 1 && (
          <ResourcesStep
            resources={resources}
            onUpdateQty={updateResourceQty}
            plantCount={context.plantCount}
          />
        )}
        {step === 2 && (
          <ChecklistStep
            checklist={checklist}
            onToggle={toggleChecklistItem}
            onUpdateValue={updateChecklistValue}
          />
        )}
        {step === 3 && (
          <ConfirmStep
            context={context}
            resources={resources}
            checklist={checklist}
            criticalCompleted={criticalCompleted}
            criticalTotal={criticalItems.length}
            allCriticalDone={allCriticalDone}
            notes={notes}
            onNotesChange={setNotes}
            timerDisplay={timerDisplay}
          />
        )}
      </div>

      {/* Footer navigation */}
      <div className="border-t border-border bg-surface px-4 py-3 lg:px-6">
        <div className="flex gap-2">
          {step > 1 && (
            <Button
              variant="secondary"
              onClick={() => setStep((step - 1) as Step)}
              icon={ArrowLeft}
            >
              Anterior
            </Button>
          )}
          <div className="flex-1" />
          {step < 3 && (
            <Button onClick={() => setStep((step + 1) as Step)} icon={ArrowRight}>
              Siguiente
            </Button>
          )}
          {step === 3 && (
            <Button
              onClick={handleSubmit}
              loading={submitting}
              disabled={!allCriticalDone}
              icon={Check}
            >
              Completar actividad
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step 1: Resources ─────────────────────────────────────────────

function ResourcesStep({
  resources,
  onUpdateQty,
  plantCount,
}: {
  resources: ResourceEntry[];
  onUpdateQty: (idx: number, value: number) => void;
  plantCount: number;
}) {
  if (resources.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface-card p-4 text-center text-sm text-secondary">
        Esta actividad no requiere recursos.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-primary">Recursos</h2>
        <span className="text-xs text-secondary">
          {plantCount} plantas
        </span>
      </div>

      <div className="space-y-2">
        {resources.map((r, idx) => {
          const isDifferent = r.quantityActual !== r.quantityPlanned;
          return (
            <div
              key={r.productId}
              className="rounded-lg border border-border bg-surface-card p-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-primary">
                  {r.productName}
                </span>
                {r.isOptional && (
                  <Badge variant="outlined">Opcional</Badge>
                )}
                <span className="font-mono text-[10px] text-tertiary">
                  {r.productSku}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-3">
                <div>
                  <span className="block text-[10px] uppercase text-tertiary">
                    Planificado
                  </span>
                  <span className="font-mono text-sm text-secondary">
                    {r.quantityPlanned} {r.unitName}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-tertiary">
                    Real
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    value={r.quantityActual}
                    onChange={(e) =>
                      onUpdateQty(idx, parseFloat(e.target.value) || 0)
                    }
                    className={cn(
                      "w-full rounded border px-2 py-1 font-mono text-sm",
                      isDifferent
                        ? "border-warning text-warning"
                        : "border-border text-primary",
                    )}
                  />
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-tertiary">
                    Base
                  </span>
                  <span className="text-xs text-secondary">
                    {r.quantityBasis === "per_plant"
                      ? "Por planta"
                      : r.quantityBasis === "per_zone"
                        ? "Por zona"
                        : r.quantityBasis === "per_m2"
                          ? "Por m2"
                          : "Fijo"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 2: Checklist ─────────────────────────────────────────────

function ChecklistStep({
  checklist,
  onToggle,
  onUpdateValue,
}: {
  checklist: ChecklistEntry[];
  onToggle: (idx: number) => void;
  onUpdateValue: (idx: number, value: string) => void;
}) {
  if (checklist.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface-card p-4 text-center text-sm text-secondary">
        Esta actividad no tiene checklist.
      </div>
    );
  }

  const completed = checklist.filter((c) => c.isCompleted).length;
  const critical = checklist.filter((c) => c.isCritical);
  const criticalDone = critical.filter((c) => c.isCompleted).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-primary">Checklist</h2>
        <span className="text-xs text-secondary">
          {completed}/{checklist.length} completados
          {critical.length > 0 && (
            <span className={cn(criticalDone < critical.length && "text-error")}>
              {" "}({criticalDone}/{critical.length} criticos)
            </span>
          )}
        </span>
      </div>

      <div className="space-y-2">
        {checklist.map((item, idx) => {
          const valueStatus = getValueStatus(
            item.valueRecorded,
            item.expectedValue,
            item.tolerance,
          );

          return (
            <div
              key={idx}
              className={cn(
                "rounded-lg border p-3",
                item.isCritical && !item.isCompleted
                  ? "border-error/30 bg-error/5"
                  : item.isCompleted
                    ? "border-success/30 bg-success/5"
                    : "border-border bg-surface-card",
              )}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => onToggle(idx)}
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                    item.isCompleted
                      ? "border-success bg-success text-white"
                      : "border-border hover:border-brand",
                  )}
                >
                  {item.isCompleted && <Check className="h-3 w-3" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-sm",
                        item.isCompleted
                          ? "text-secondary line-through"
                          : "text-primary",
                      )}
                    >
                      {item.instruction}
                    </span>
                    {item.isCritical && (
                      <Badge variant="error">Critico</Badge>
                    )}
                  </div>

                  {item.expectedValue && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-tertiary">
                        Esperado: {item.expectedValue}
                        {item.tolerance && ` (±${item.tolerance})`}
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={item.valueRecorded}
                        onChange={(e) => onUpdateValue(idx, e.target.value)}
                        placeholder="Valor medido"
                        className={cn(
                          "w-24 rounded border px-2 py-0.5 font-mono text-xs",
                          valueStatus === "ok" && "border-success text-success",
                          valueStatus === "warning" &&
                            "border-warning text-warning",
                          valueStatus === "error" && "border-error text-error",
                          valueStatus === null && "border-border text-primary",
                        )}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 3: Confirm ───────────────────────────────────────────────

function ConfirmStep({
  context,
  resources,
  checklist,
  criticalCompleted,
  criticalTotal,
  allCriticalDone,
  notes,
  onNotesChange,
  timerDisplay,
}: {
  context: ActivityContext;
  resources: ResourceEntry[];
  checklist: ChecklistEntry[];
  criticalCompleted: number;
  criticalTotal: number;
  allCriticalDone: boolean;
  notes: string;
  onNotesChange: (v: string) => void;
  timerDisplay: string;
}) {
  const completedItems = checklist.filter((c) => c.isCompleted).length;
  const resourcesUsed = resources.filter((r) => r.quantityActual > 0);

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold text-primary">Resumen</h2>

      {/* Activity info */}
      <div className="rounded-lg border border-border bg-surface-card p-3">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-tertiary">Actividad</span>
            <p className="font-medium text-primary">{context.templateName}</p>
          </div>
          <div>
            <span className="text-tertiary">Batch</span>
            <p className="font-mono font-medium text-primary">
              {context.batchCode}
            </p>
          </div>
          <div>
            <span className="text-tertiary">Zona</span>
            <p className="text-primary">{context.zoneName}</p>
          </div>
          <div>
            <span className="text-tertiary">Duracion</span>
            <p className="font-mono text-xl font-bold text-primary">
              {timerDisplay}
            </p>
          </div>
        </div>
      </div>

      {/* Resources summary */}
      <div className="rounded-lg border border-border bg-surface-card p-3">
        <div className="flex items-center gap-2 mb-2">
          <Package className="h-4 w-4 text-secondary" />
          <span className="text-xs font-bold text-primary">
            Recursos ({resourcesUsed.length})
          </span>
        </div>
        {resourcesUsed.length === 0 ? (
          <p className="text-xs text-secondary">Sin recursos consumidos.</p>
        ) : (
          <div className="space-y-1">
            {resourcesUsed.map((r) => (
              <div
                key={r.productId}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-primary">{r.productName}</span>
                <span className="font-mono text-primary">
                  {r.quantityActual} {r.unitName}
                  {r.quantityActual !== r.quantityPlanned && (
                    <span className="ml-1 text-warning">
                      (plan: {r.quantityPlanned})
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Checklist summary */}
      <div className="rounded-lg border border-border bg-surface-card p-3">
        <div className="flex items-center gap-2 mb-2">
          <ClipboardList className="h-4 w-4 text-secondary" />
          <span className="text-xs font-bold text-primary">
            Checklist ({completedItems}/{checklist.length})
          </span>
        </div>
        {criticalTotal > 0 && (
          <div
            className={cn(
              "flex items-center gap-1.5 text-xs",
              allCriticalDone ? "text-success" : "text-error",
            )}
          >
            {allCriticalDone ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5" />
            )}
            {criticalCompleted}/{criticalTotal} items criticos completados
          </div>
        )}
        {!allCriticalDone && (
          <p className="mt-1 text-xs text-error">
            Completa todos los items criticos para habilitar la confirmacion.
          </p>
        )}
      </div>

      {/* Notes */}
      <div>
        <Input
          label="Notas (opcional)"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Observaciones adicionales..."
        />
      </div>

      {/* Trigger warning */}
      {context.triggersPhaseChangeId && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Esta actividad avanzara automaticamente el batch a la siguiente fase.
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────

function getValueStatus(
  recorded: string,
  expected: string | null,
  tolerance: string | null,
): "ok" | "warning" | "error" | null {
  if (!recorded || !expected) return null;

  const num = parseFloat(recorded);
  if (isNaN(num)) return null;

  // Parse expected range "1.5-2.0" or single value "1.5"
  const parts = expected.split("-").map((s) => parseFloat(s.trim()));
  let min: number, max: number;

  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    min = parts[0];
    max = parts[1];
  } else if (parts.length === 1 && !isNaN(parts[0])) {
    min = parts[0];
    max = parts[0];
  } else {
    return null;
  }

  if (num >= min && num <= max) return "ok";

  // Check tolerance
  if (tolerance) {
    const tol = parseFloat(tolerance.replace("+-", "").replace("±", ""));
    if (!isNaN(tol) && num >= min - tol && num <= max + tol) return "warning";
  }

  return "error";
}
