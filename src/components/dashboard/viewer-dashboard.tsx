"use client";

import { useState, useCallback, useTransition } from "react";
import { StatCard } from "@/components/data/stat-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { PullToRefresh } from "./pull-to-refresh";
import { cn } from "@/lib/utils/cn";
import { BarChart3 } from "lucide-react";
import {
  getViewerDashboardData,
  type ViewerDashboardData,
  type ViewerOrderStatus,
} from "@/lib/actions/dashboard";

type ViewerDashboardProps = {
  initialData: ViewerDashboardData;
};

export function ViewerDashboard({ initialData }: ViewerDashboardProps) {
  const [data, setData] = useState(initialData);
  const [selectedFacilityId, setSelectedFacilityId] = useState<
    string | undefined
  >(undefined);
  const [isPending, startTransition] = useTransition();

  const handleFacilityChange = useCallback(
    (facilityId: string | undefined) => {
      setSelectedFacilityId(facilityId);
      startTransition(async () => {
        const newData = await getViewerDashboardData(facilityId);
        setData(newData);
      });
    },
    [],
  );

  const handleRefresh = useCallback(async () => {
    const newData = await getViewerDashboardData(selectedFacilityId);
    setData(newData);
  }, [selectedFacilityId]);

  const { kpis, orders, facilities, overallYieldReal, overallYieldExpected } =
    data;

  return (
    <div className={cn("relative p-4 lg:p-6", isPending && "opacity-70")}>
      <PullToRefresh onRefresh={handleRefresh}>
        {/* Header */}
        <header className="mb-5">
          <h1 className="text-[28px] font-extrabold leading-tight text-text-primary">
            Resumen de Produccion
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Vista general de la operacion
          </p>
          {facilities.length > 1 && (
            <select
              value={selectedFacilityId ?? ""}
              onChange={(e) =>
                handleFacilityChange(e.target.value || undefined)
              }
              className="mt-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="">Todas las facilities</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          )}
        </header>

        {/* KPIs — read-only, no onClick */}
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            value={kpis.activeOrders}
            label="Ordenes activas"
            color="brand"
          />
          <StatCard
            value={kpis.activeBatches}
            label="Batches"
            color="info"
          />
          <StatCard
            value={
              kpis.avgYieldPct != null
                ? `${kpis.avgYieldPct.toFixed(1)}%`
                : "N/A"
            }
            label="Yield promedio"
            color="success"
          />
          <StatCard
            value={
              kpis.qualityPassRate != null
                ? `${kpis.qualityPassRate.toFixed(0)}%`
                : "N/A"
            }
            label="Calidad (pass rate)"
            color={
              kpis.qualityPassRate != null && kpis.qualityPassRate >= 90
                ? "success"
                : "warning"
            }
          />
        </div>

        {/* Yield Bar */}
        {overallYieldReal != null && (
          <section className="mb-6">
            <h2 className="mb-3 text-base font-bold text-text-primary">
              Rendimiento general
            </h2>
            <div className="rounded-card border border-border bg-surface-card p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">
                  Rendimiento:{" "}
                  <span className="font-mono font-bold text-text-primary">
                    {overallYieldReal.toFixed(1)}%
                  </span>
                </span>
                {overallYieldExpected != null && (
                  <span className="text-text-secondary">
                    Esperado:{" "}
                    <span className="font-mono font-bold">
                      {overallYieldExpected.toFixed(1)}%
                    </span>
                  </span>
                )}
              </div>
              <div className="mt-2">
                <ProgressBar value={Math.min(overallYieldReal, 100)} />
              </div>
            </div>
          </section>
        )}

        {/* Orders Table */}
        <section className="mb-6">
          <h2 className="mb-3 text-base font-bold text-text-primary">
            Estado de ordenes
          </h2>
          {orders.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="Sin ordenes de produccion"
              description="No hay ordenes en este periodo."
            />
          ) : (
            <div className="space-y-2">
              {orders.map((order) => (
                <ViewerOrderCard key={order.code} order={order} />
              ))}
            </div>
          )}
        </section>
      </PullToRefresh>
    </div>
  );
}

// ── Sub-component ────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  approved: "Aprobada",
  in_progress: "En progreso",
  completed: "Completada",
  draft: "Borrador",
  cancelled: "Cancelada",
};

const STATUS_VARIANTS: Record<
  string,
  "success" | "warning" | "error" | "outlined" | "filled"
> = {
  approved: "filled",
  in_progress: "warning",
  completed: "success",
  draft: "outlined",
  cancelled: "error",
};

function ViewerOrderCard({ order }: { order: ViewerOrderStatus }) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-border bg-surface-card p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-text-primary">
            {order.code}
          </span>
          <Badge variant={STATUS_VARIANTS[order.status] ?? "outlined"}>
            {STATUS_LABELS[order.status] ?? order.status}
          </Badge>
        </div>
        <p className="mt-0.5 truncate text-xs text-text-secondary">
          {order.cultivarName}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <ProgressBar value={order.progressPct} className="flex-1" />
          <span className="shrink-0 font-mono text-[10px] text-text-secondary">
            {order.progressPct}%
          </span>
        </div>
        {order.expectedEndDate && (
          <p className="mt-1 text-[10px] text-text-secondary">
            Fin estimado: {order.expectedEndDate}
          </p>
        )}
      </div>
    </div>
  );
}
