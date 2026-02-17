"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { WizardPhase } from "@/lib/actions/orders";
import type { WizardPhaseConfig } from "@/stores/order-wizard-store";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { AlertTriangle, Check, SkipForward } from "lucide-react";

type Props = {
  phases: WizardPhase[];
  entryPhaseId: string;
  exitPhaseId: string;
  phaseConfig: WizardPhaseConfig[];
  onSelect: (
    entryPhaseId: string,
    exitPhaseId: string,
    phaseConfig: WizardPhaseConfig[],
  ) => void;
};

export function StepPhases({
  phases,
  entryPhaseId: initialEntry,
  exitPhaseId: initialExit,
  phaseConfig: initialConfig,
  onSelect,
}: Props) {
  const [entryId, setEntryId] = useState(initialEntry);
  const [exitId, setExitId] = useState(initialExit);
  const [skippedPhases, setSkippedPhases] = useState<Set<string>>(() => {
    const skipped = new Set<string>();
    for (const pc of initialConfig) {
      if (pc.skipped) skipped.add(pc.phaseId);
    }
    return skipped;
  });

  const entryOptions = useMemo(
    () => phases.filter((p) => p.canBeEntryPoint),
    [phases],
  );

  const exitOptions = useMemo(
    () => phases.filter((p) => p.canBeExitPoint),
    [phases],
  );

  const entryPhase = phases.find((p) => p.id === entryId);
  const exitPhase = phases.find((p) => p.id === exitId);

  const isValidRange =
    entryPhase && exitPhase && entryPhase.sortOrder < exitPhase.sortOrder;

  // Phases in the selected range
  const phasesInRange = useMemo(() => {
    if (!entryPhase || !exitPhase) return [];
    return phases.filter(
      (p) =>
        p.sortOrder >= entryPhase.sortOrder &&
        p.sortOrder <= exitPhase.sortOrder,
    );
  }, [phases, entryPhase, exitPhase]);

  // Build config and notify parent
  const buildConfig = useCallback((): WizardPhaseConfig[] => {
    return phasesInRange.map((p) => ({
      phaseId: p.id,
      zoneId: "",
      durationDays: undefined,
      skipped: skippedPhases.has(p.id),
    }));
  }, [phasesInRange, skippedPhases]);

  // Notify parent when selection changes
  useEffect(() => {
    if (entryId && exitId && isValidRange) {
      onSelect(entryId, exitId, buildConfig());
    }
  }, [entryId, exitId, isValidRange, buildConfig]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSkip = (phaseId: string) => {
    setSkippedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) {
        next.delete(phaseId);
      } else {
        next.add(phaseId);
      }
      return next;
    });
  };

  if (entryOptions.length === 0) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Sin puntos de entrada"
        description="No hay fases configuradas como punto de entrada. Contacta al administrador."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-primary">
          Selecciona fases de inicio y fin
        </h2>
        <p className="mt-1 text-sm text-secondary">
          Define el rango de fases productivas para esta orden.
        </p>
      </div>

      {/* Entry / Exit selectors */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-primary">
            Fase de entrada
          </label>
          <select
            value={entryId}
            onChange={(e) => {
              setEntryId(e.target.value);
              setSkippedPhases(new Set());
            }}
            className="h-12 w-full rounded-input border border-border bg-surface px-3 text-sm text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="">Seleccionar...</option>
            {entryOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-primary">
            Fase de salida
          </label>
          <select
            value={exitId}
            onChange={(e) => {
              setExitId(e.target.value);
              setSkippedPhases(new Set());
            }}
            className="h-12 w-full rounded-input border border-border bg-surface px-3 text-sm text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="">Seleccionar...</option>
            {exitOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Validation error */}
      {entryId && exitId && !isValidRange && (
        <div className="flex items-center gap-2 rounded-lg border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          La fase de salida debe ser posterior a la fase de entrada.
        </div>
      )}

      {/* Phase stepper visual */}
      {phasesInRange.length > 0 && isValidRange && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-primary">
            Fases incluidas ({phasesInRange.filter((p) => !skippedPhases.has(p.id)).length} de {phasesInRange.length})
          </h3>
          <div className="space-y-1">
            {phases.map((phase) => {
              const inRange =
                entryPhase &&
                exitPhase &&
                phase.sortOrder >= entryPhase.sortOrder &&
                phase.sortOrder <= exitPhase.sortOrder;
              const isSkipped = skippedPhases.has(phase.id);
              const isEntry = phase.id === entryId;
              const isExit = phase.id === exitId;
              const canToggleSkip = inRange && phase.canSkip && !isEntry && !isExit;

              return (
                <div
                  key={phase.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors",
                    inRange && !isSkipped
                      ? "border-brand/30 bg-brand/5"
                      : inRange && isSkipped
                        ? "border-border bg-surface-secondary opacity-60"
                        : "border-transparent bg-surface-secondary opacity-40",
                  )}
                >
                  {/* Step indicator */}
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      inRange && !isSkipped
                        ? "bg-brand text-white"
                        : "bg-border text-tertiary",
                    )}
                  >
                    {isSkipped ? (
                      <SkipForward className="h-3.5 w-3.5" />
                    ) : inRange ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      phase.sortOrder
                    )}
                  </div>

                  {/* Phase info */}
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-primary">
                      {phase.name}
                    </span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {isEntry && <Badge variant="info">Entrada</Badge>}
                      {isExit && <Badge variant="info">Salida</Badge>}
                      {isSkipped && <Badge variant="warning">Omitida</Badge>}
                      {phase.defaultDurationDays && inRange && !isSkipped && (
                        <span className="text-xs text-tertiary">
                          ~{phase.defaultDurationDays}d
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Skip toggle */}
                  {canToggleSkip && (
                    <button
                      type="button"
                      onClick={() => toggleSkip(phase.id)}
                      className={cn(
                        "rounded px-2 py-1 text-xs font-medium transition-colors",
                        isSkipped
                          ? "bg-brand/10 text-brand hover:bg-brand/20"
                          : "bg-surface-secondary text-secondary hover:bg-border",
                      )}
                    >
                      {isSkipped ? "Incluir" : "Omitir"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
