"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { BatchListItem, BatchFilterOptions } from "@/lib/actions/batches";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils/cn";
import { Sprout } from "lucide-react";

type Props = {
  batches: BatchListItem[];
  filterOptions: BatchFilterOptions;
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

export function BatchList({ batches, filterOptions }: Props) {
  const [statusFilter, setStatusFilter] = useState("");
  const [phaseFilter, setPhaseFilter] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [cultivarFilter, setCultivarFilter] = useState("");

  const filtered = useMemo(() => {
    let result = batches;
    if (statusFilter) result = result.filter((b) => b.status === statusFilter);
    if (phaseFilter) result = result.filter((b) => b.currentPhaseId === phaseFilter);
    if (zoneFilter) result = result.filter((b) => b.zoneId === zoneFilter);
    if (cultivarFilter) result = result.filter((b) => b.cultivarName === cultivarFilter);
    return result;
  }, [batches, statusFilter, phaseFilter, zoneFilter, cultivarFilter]);

  const hasFilters = statusFilter || phaseFilter || zoneFilter || cultivarFilter;

  if (batches.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 lg:p-6">
        <EmptyState
          icon={Sprout}
          title="Sin batches"
          description="No hay batches de produccion. Aprueba una orden para crear el primer batch."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col p-4 lg:p-6">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-lg font-bold text-primary">Batches</h1>
        <p className="text-sm text-secondary">
          {filtered.length} de {batches.length} batch(es)
        </p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-full border border-border bg-surface px-3 text-xs text-primary focus:border-brand focus:outline-none"
        >
          <option value="">Estado: Todos</option>
          {filterOptions.statuses.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s] ?? s}
            </option>
          ))}
        </select>
        <select
          value={phaseFilter}
          onChange={(e) => setPhaseFilter(e.target.value)}
          className="h-9 rounded-full border border-border bg-surface px-3 text-xs text-primary focus:border-brand focus:outline-none"
        >
          <option value="">Fase: Todas</option>
          {filterOptions.phases.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={zoneFilter}
          onChange={(e) => setZoneFilter(e.target.value)}
          className="h-9 rounded-full border border-border bg-surface px-3 text-xs text-primary focus:border-brand focus:outline-none"
        >
          <option value="">Zona: Todas</option>
          {filterOptions.zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </select>
        <select
          value={cultivarFilter}
          onChange={(e) => setCultivarFilter(e.target.value)}
          className="h-9 rounded-full border border-border bg-surface px-3 text-xs text-primary focus:border-brand focus:outline-none"
        >
          <option value="">Cultivar: Todos</option>
          {filterOptions.cultivars.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setStatusFilter("");
              setPhaseFilter("");
              setZoneFilter("");
              setCultivarFilter("");
            }}
            className="h-9 rounded-full border border-border bg-surface-secondary px-3 text-xs text-secondary hover:text-primary"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Batch cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((batch) => (
          <Link
            key={batch.id}
            href={`/batches/${batch.id}`}
            className={cn(
              "rounded-card border border-border bg-surface-card p-4 transition-colors hover:border-brand/50",
            )}
          >
            <div className="mb-2 flex items-start justify-between">
              <span className="font-mono text-sm font-bold text-primary">
                {batch.code}
              </span>
              <Badge variant={STATUS_VARIANTS[batch.status] ?? "outlined"}>
                {STATUS_LABELS[batch.status] ?? batch.status}
              </Badge>
            </div>
            <p className="text-sm font-medium text-primary">
              {batch.cultivarName}
            </p>
            <p className="text-xs text-secondary">{batch.cropTypeName}</p>

            <div className="mt-3 grid grid-cols-2 gap-y-1 text-xs">
              <div>
                <span className="text-tertiary">Fase: </span>
                <span className="text-primary">{batch.currentPhaseName}</span>
              </div>
              <div>
                <span className="text-tertiary">Plantas: </span>
                <span className="font-mono text-primary">
                  {batch.plantCount}
                </span>
              </div>
              <div>
                <span className="text-tertiary">Zona: </span>
                <span className="text-primary">{batch.zoneName}</span>
              </div>
              <div>
                <span className="text-tertiary">Inicio: </span>
                <span className="font-mono text-primary">
                  {batch.startDate}
                </span>
              </div>
            </div>

            {batch.orderCode && (
              <p className="mt-2 text-xs text-tertiary">
                Orden: {batch.orderCode}
              </p>
            )}
          </Link>
        ))}
      </div>

      {filtered.length === 0 && hasFilters && (
        <div className="flex flex-1 items-center justify-center py-12">
          <p className="text-sm text-secondary">
            No hay batches que coincidan con los filtros seleccionados.
          </p>
        </div>
      )}
    </div>
  );
}
