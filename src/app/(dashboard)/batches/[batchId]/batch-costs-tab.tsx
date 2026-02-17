"use client";

import { useState, useEffect, useRef } from "react";
import { DollarSign } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { calculateBatchCOGS, type COGSBreakdown } from "@/lib/actions/cogs";

type Props = {
  batchId: string;
};

export function BatchCostsTab({ batchId }: Props) {
  const [cogs, setCogs] = useState<COGSBreakdown | null>(null);
  const [error, setError] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    calculateBatchCOGS(batchId)
      .then(setCogs)
      .catch(() => setError(true));
  }, [batchId]);

  if (error) {
    return (
      <EmptyState
        icon={DollarSign}
        title="Error al cargar costos"
        description="No se pudieron calcular los costos de este batch."
      />
    );
  }

  if (!cogs) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  const hasData = cogs.total > 0;

  if (!hasData) {
    return (
      <EmptyState
        icon={DollarSign}
        title="Sin datos de costos"
        description="No hay transacciones o actividades registradas para calcular el COGS."
      />
    );
  }

  const materialsPct = cogs.total > 0 ? Math.round((cogs.directMaterials / cogs.total) * 100) : 0;
  const laborPct = cogs.total > 0 ? Math.round((cogs.labor / cogs.total) * 100) : 0;
  const overheadPct = cogs.total > 0 ? Math.round((cogs.overhead / cogs.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Summary */}
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-[10px] font-bold uppercase text-text-secondary">Total COGS</p>
            <p className="font-mono text-xl font-bold text-text-primary">
              ${cogs.total.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-text-secondary">Por planta</p>
            <p className="font-mono text-xl font-bold text-text-primary">
              {cogs.perPlant !== null ? `$${cogs.perPlant.toFixed(2)}` : "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-text-secondary">Plantas</p>
            <p className="font-mono text-xl font-bold text-text-primary">
              {cogs.plantCount}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-text-secondary">Fases</p>
            <p className="font-mono text-xl font-bold text-text-primary">
              {cogs.phaseBreakdown.length}
            </p>
          </div>
        </div>
      </Card>

      {/* Cost breakdown */}
      <Card className="p-4">
        <h3 className="mb-3 text-xs font-bold uppercase text-text-secondary tracking-wider">
          Desglose de Costos
        </h3>

        <div className="flex flex-col gap-2">
          {/* Materials */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-primary">Materiales directos</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-text-secondary">{materialsPct}%</span>
              <span className="font-mono text-sm font-bold text-text-primary">
                ${cogs.directMaterials.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full bg-brand" style={{ width: `${materialsPct}%` }} />
          </div>

          {/* Labor */}
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-text-primary">Mano de obra</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-text-secondary">{laborPct}%</span>
              <span className="font-mono text-sm font-bold text-text-primary">
                ${cogs.labor.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full bg-info" style={{ width: `${laborPct}%` }} />
          </div>

          {/* Overhead */}
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-text-primary">Overhead</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-text-secondary">{overheadPct}%</span>
              <span className="font-mono text-sm font-bold text-text-primary">
                ${cogs.overhead.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full bg-warning" style={{ width: `${overheadPct}%` }} />
          </div>
        </div>
      </Card>

      {/* Phase breakdown */}
      {cogs.phaseBreakdown.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 text-xs font-bold uppercase text-text-secondary tracking-wider">
            Costos por Fase
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-secondary">
                <th className="pb-2">Fase</th>
                <th className="pb-2 text-right">Materiales</th>
                <th className="pb-2 text-right">Mano de obra</th>
                <th className="pb-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {cogs.phaseBreakdown.map((phase) => (
                <tr key={phase.phase} className="border-t border-border">
                  <td className="py-2 text-text-primary">{phase.phase}</td>
                  <td className="py-2 text-right font-mono text-text-secondary">
                    ${phase.materials.toFixed(2)}
                  </td>
                  <td className="py-2 text-right font-mono text-text-secondary">
                    ${phase.labor.toFixed(2)}
                  </td>
                  <td className="py-2 text-right font-mono font-bold text-text-primary">
                    ${(phase.materials + phase.labor).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
