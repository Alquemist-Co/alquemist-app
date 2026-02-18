"use client";

import { useState, useCallback, useTransition } from "react";
import { StatCard } from "@/components/data/stat-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { PullToRefresh } from "./pull-to-refresh";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  FileText,
  Download,
  TrendingUp,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import {
  getManagerDashboardData,
  type ManagerDashboardData,
  type OrderProgress,
} from "@/lib/actions/dashboard";
import type { FacilityItem } from "@/lib/actions/areas";

const YieldChart = dynamic(() => import("./yield-chart"), { ssr: false });

type ManagerDashboardProps = {
  initialData: ManagerDashboardData;
};

export function ManagerDashboard({ initialData }: ManagerDashboardProps) {
  const [data, setData] = useState(initialData);
  const [selectedFacilityId, setSelectedFacilityId] = useState<
    string | undefined
  >(undefined);
  const [isPending, startTransition] = useTransition();

  const handleFacilityChange = useCallback(
    (facilityId: string | undefined) => {
      setSelectedFacilityId(facilityId);
      startTransition(async () => {
        const newData = await getManagerDashboardData(facilityId);
        setData(newData);
      });
    },
    [],
  );

  const handleRefresh = useCallback(async () => {
    const newData = await getManagerDashboardData(selectedFacilityId);
    setData(newData);
  }, [selectedFacilityId]);

  const { kpis, orders, costDistribution, yieldComparison, facilities } = data;

  return (
    <div className={cn("relative p-4 lg:p-6", isPending && "opacity-70")}>
      <PullToRefresh onRefresh={handleRefresh}>
        {/* Header */}
        <ManagerHeader
          facilities={facilities}
          selectedFacilityId={selectedFacilityId}
          onFacilityChange={handleFacilityChange}
        />

        {/* KPIs */}
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
              kpis.cogsPerGram != null
                ? `$${kpis.cogsPerGram.toFixed(2)}/g`
                : "N/A"
            }
            label="COGS/gramo"
            color="warning"
          />
        </div>

        {/* Yield Chart */}
        {yieldComparison.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-3 text-base font-bold text-text-primary">
              Rendimiento por orden
            </h2>
            <div className="rounded-card border border-border bg-surface-card p-4">
              <YieldChart data={yieldComparison} />
            </div>
          </section>
        )}

        {/* Orders Progress */}
        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-text-primary">
              Ordenes en progreso
            </h2>
            <Link
              href="/orders"
              className="text-xs font-medium text-brand hover:underline"
            >
              Ver todas
            </Link>
          </div>
          {orders.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="Sin ordenes activas"
              description="No hay ordenes en progreso."
            />
          ) : (
            <div className="space-y-2">
              {orders.slice(0, 5).map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </section>

        {/* Cost Distribution */}
        {costDistribution.total > 0 && (
          <section className="mb-6">
            <h2 className="mb-3 text-base font-bold text-text-primary">
              Distribucion de costos
            </h2>
            <div className="rounded-card border border-border bg-surface-card p-4">
              <div className="mb-3 text-center">
                <span className="font-mono text-2xl font-bold text-text-primary">
                  ${costDistribution.total.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
                <p className="text-xs text-text-secondary">Costo total</p>
              </div>
              <CostBar distribution={costDistribution} />
            </div>
          </section>
        )}

        {/* Quick Actions */}
        <section className="mb-6">
          <h2 className="mb-3 text-base font-bold text-text-primary">
            Acciones rapidas
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            <QuickAction
              icon={FileText}
              label="Nueva orden"
              href="/orders/new"
            />
            <QuickAction
              icon={Download}
              label="Exportar reporte"
              href="/inventory/movements"
            />
            <QuickAction
              icon={TrendingUp}
              label="Ver proyecciones"
              href="/areas/occupancy"
            />
          </div>
        </section>
      </PullToRefresh>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────

function ManagerHeader({
  facilities,
  selectedFacilityId,
  onFacilityChange,
}: {
  facilities: FacilityItem[];
  selectedFacilityId: string | undefined;
  onFacilityChange: (id: string | undefined) => void;
}) {
  return (
    <header className="mb-5">
      <h1 className="text-[28px] font-extrabold leading-tight text-text-primary">
        Produccion
      </h1>
      <p className="mt-1 text-sm text-text-secondary">
        KPIs y estado de ordenes
      </p>
      {facilities.length > 1 && (
        <select
          value={selectedFacilityId ?? ""}
          onChange={(e) => onFacilityChange(e.target.value || undefined)}
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
  );
}

const PRIORITY_BADGES: Record<
  string,
  { label: string; variant: "error" | "warning" | "outlined" }
> = {
  urgent: { label: "Urgente", variant: "error" },
  high: { label: "Alta", variant: "warning" },
  normal: { label: "Normal", variant: "outlined" },
  low: { label: "Baja", variant: "outlined" },
};

function OrderCard({ order }: { order: OrderProgress }) {
  const badge = PRIORITY_BADGES[order.priority] ?? PRIORITY_BADGES.normal;
  const isDelayed = order.daysRemaining != null && order.daysRemaining < 0;

  return (
    <Link
      href={`/orders/${order.id}`}
      className="flex items-center gap-3 rounded-card border border-border bg-surface-card p-3 transition-colors hover:border-brand"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-text-primary">
            {order.code}
          </span>
          <Badge variant={badge.variant}>{badge.label}</Badge>
          {isDelayed && <Badge variant="error">Retrasada</Badge>}
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
        {order.daysRemaining != null && (
          <p
            className={cn(
              "mt-1 text-[10px]",
              isDelayed ? "text-error" : "text-text-secondary",
            )}
          >
            {isDelayed
              ? `(${Math.abs(order.daysRemaining)} dias de retraso)`
              : `${order.daysRemaining} dias restantes`}
          </p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-tertiary" />
    </Link>
  );
}

function CostBar({
  distribution,
}: {
  distribution: { materials: number; labor: number; overhead: number; total: number };
}) {
  const pctMat =
    distribution.total > 0
      ? Math.round((distribution.materials / distribution.total) * 100)
      : 0;
  const pctLab =
    distribution.total > 0
      ? Math.round((distribution.labor / distribution.total) * 100)
      : 0;
  const pctOvh = 100 - pctMat - pctLab;

  return (
    <>
      <div className="flex h-4 w-full overflow-hidden rounded-full">
        {pctMat > 0 && (
          <div
            className="bg-brand"
            style={{ width: `${pctMat}%` }}
            title={`Insumos: ${pctMat}%`}
          />
        )}
        {pctLab > 0 && (
          <div
            className="bg-accent"
            style={{ width: `${pctLab}%` }}
            title={`Labor: ${pctLab}%`}
          />
        )}
        {pctOvh > 0 && (
          <div
            className="bg-border"
            style={{ width: `${pctOvh}%` }}
            title={`Overhead: ${pctOvh}%`}
          />
        )}
      </div>
      <div className="mt-2 flex gap-4 text-xs text-text-secondary">
        <span className="flex items-center gap-1">
          <span className="inline-block size-2 rounded-full bg-brand" />
          Insumos {pctMat}%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2 rounded-full bg-accent" />
          Labor {pctLab}%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2 rounded-full bg-border" />
          Overhead {pctOvh}%
        </span>
      </div>
    </>
  );
}

function QuickAction({
  icon: Icon,
  label,
  href,
}: {
  icon: typeof FileText;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-w-[120px] flex-1 flex-col items-center gap-2 rounded-card border border-border bg-surface-card px-3 py-3 text-center transition-colors hover:border-brand"
    >
      <div className="flex size-10 items-center justify-center rounded-full bg-brand/10">
        <Icon className="h-5 w-5 text-brand" />
      </div>
      <span className="text-xs font-medium text-text-primary">{label}</span>
    </Link>
  );
}
