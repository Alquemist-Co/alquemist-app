"use client";

import { useState, useMemo, useEffect } from "react";
import type { WizardPhase, WizardPhaseFlow, WizardUnit, WizardProduct } from "@/lib/actions/orders";
import type { WizardPhaseConfig } from "@/stores/order-wizard-store";
import {
  calculateYieldCascade,
  type PhaseFlowInfo,
} from "@/lib/utils/yield-cascade";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import { AlertTriangle, ArrowDown } from "lucide-react";

type Props = {
  phases: WizardPhase[];
  phaseFlows: WizardPhaseFlow[];
  units: WizardUnit[];
  products: WizardProduct[];
  entryPhaseId: string;
  exitPhaseId: string;
  phaseConfig: WizardPhaseConfig[];
  initialQuantity: number;
  initialUnitId: string;
  initialProductId: string;
  onUpdate: (qty: number, unitId: string, productId?: string) => void;
};

export function StepQuantity({
  phases,
  phaseFlows,
  units,
  products,
  entryPhaseId,
  exitPhaseId,
  phaseConfig,
  initialQuantity,
  initialUnitId,
  initialProductId,
  onUpdate,
}: Props) {
  const [qty, setQty] = useState(initialQuantity || "");
  const [unitId, setUnitId] = useState(initialUnitId);
  const [productId, setProductId] = useState(initialProductId);

  const entryPhase = phases.find((p) => p.id === entryPhaseId);
  const exitPhase = phases.find((p) => p.id === exitPhaseId);

  // Determine if entry phase is NOT the first phase (needs product selection)
  const isIntermediateEntry = useMemo(() => {
    if (!entryPhase) return false;
    const first = phases[0];
    return first && entryPhase.sortOrder > first.sortOrder;
  }, [phases, entryPhase]);

  // Build phases in range (excluding skipped)
  const activePhasesInRange = useMemo(() => {
    if (!entryPhase || !exitPhase) return [];
    const skippedSet = new Set(
      phaseConfig.filter((pc) => pc.skipped).map((pc) => pc.phaseId),
    );
    return phases.filter(
      (p) =>
        p.sortOrder >= entryPhase.sortOrder &&
        p.sortOrder <= exitPhase.sortOrder &&
        !skippedSet.has(p.id),
    );
  }, [phases, entryPhase, exitPhase, phaseConfig]);

  // Build flow info for yield cascade
  const phaseFlowInfos = useMemo((): PhaseFlowInfo[] => {
    return activePhasesInRange.map((phase) => {
      // Find primary output flow for this phase
      const primaryOutput = phaseFlows.find(
        (f) =>
          f.phaseId === phase.id &&
          f.direction === "output" &&
          f.productRole === "primary",
      );

      return {
        phaseId: phase.id,
        phaseName: phase.name,
        phaseCode: phase.code,
        primaryOutputYieldPct: primaryOutput?.expectedYieldPct
          ? parseFloat(primaryOutput.expectedYieldPct)
          : null,
      };
    });
  }, [activePhasesInRange, phaseFlows]);

  // Calculate yield cascade
  const numQty = typeof qty === "string" ? parseFloat(qty) || 0 : qty;
  const cascade = useMemo(
    () => calculateYieldCascade(phaseFlowInfos, numQty),
    [phaseFlowInfos, numQty],
  );

  const hasUnconfiguredFlows = cascade.some((c) => !c.hasFlows);

  // Notify parent when values change
  useEffect(() => {
    if (numQty > 0 && unitId) {
      onUpdate(numQty, unitId, productId || undefined);
    }
  }, [numQty, unitId, productId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-primary">
          Cantidad inicial y yield en cascada
        </h2>
        <p className="mt-1 text-sm text-secondary">
          Ingresa la cantidad inicial para calcular el rendimiento esperado por
          fase.
        </p>
      </div>

      {/* Quantity input + unit selector */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Cantidad inicial"
          type="number"
          min={1}
          step="any"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          error={
            numQty <= 0 && qty !== ""
              ? "La cantidad debe ser mayor a cero"
              : undefined
          }
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-primary">
            Unidad
          </label>
          <select
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            className="h-12 w-full rounded-input border border-border bg-surface px-3 text-sm text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="">Seleccionar unidad...</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Product selector for intermediate entry */}
      {isIntermediateEntry && (
        <div>
          <label className="mb-1 block text-sm font-medium text-primary">
            Producto de entrada
          </label>
          <p className="mb-2 text-xs text-secondary">
            La fase de entrada no es la primera del ciclo. Selecciona el producto
            con el que se inicia.
          </p>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="h-12 w-full rounded-input border border-border bg-surface px-3 text-sm text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="">Seleccionar producto...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Warning for unconfigured flows */}
      {hasUnconfiguredFlows && numQty > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Yields no configurados en algunas fases — usando 100% por defecto.
        </div>
      )}

      {/* Yield cascade visualization */}
      {numQty > 0 && cascade.length > 0 && (
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-primary">
            Rendimiento esperado en cascada
          </h3>
          <div className="rounded-lg border border-border bg-surface-card p-3">
            {cascade.map((phase, idx) => (
              <div key={phase.phaseId}>
                {idx > 0 && (
                  <div className="flex items-center gap-2 py-1 pl-4">
                    <ArrowDown className="h-3.5 w-3.5 text-tertiary" />
                    <span
                      className={cn(
                        "font-mono text-xs",
                        phase.hasFlows ? "text-secondary" : "text-warning",
                      )}
                    >
                      {phase.yieldPct}%
                      {!phase.hasFlows && " *"}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between rounded px-3 py-2 hover:bg-surface-secondary/50">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                        idx === 0
                          ? "bg-brand text-white"
                          : idx === cascade.length - 1
                            ? "bg-success text-white"
                            : "bg-brand/10 text-brand",
                      )}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-sm font-medium text-primary">
                      {phase.phaseName}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-sm font-bold text-primary">
                      {idx === 0
                        ? formatNumber(phase.inputQty)
                        : formatNumber(phase.outputQty)}
                    </span>
                    {idx > 0 && (
                      <span className="ml-1 text-xs text-tertiary">
                        (de {formatNumber(phase.inputQty)})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Final output summary */}
            {cascade.length > 1 && (
              <div className="mt-2 border-t border-border pt-2">
                <div className="flex items-center justify-between px-3">
                  <span className="text-sm font-medium text-secondary">
                    Output final esperado
                  </span>
                  <span className="font-mono text-base font-bold text-brand">
                    {formatNumber(cascade[cascade.length - 1].outputQty)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatNumber(n: number): string {
  if (n === 0) return "0";
  if (n >= 1) return n.toLocaleString("es-CO", { maximumFractionDigits: 1 });
  return n.toLocaleString("es-CO", { maximumFractionDigits: 2 });
}
