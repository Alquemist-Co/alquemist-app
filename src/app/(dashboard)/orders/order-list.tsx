"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { OrderListItem } from "@/lib/actions/orders";
import { useAuthStore } from "@/stores/auth-store";
import { hasPermission } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils/cn";
import { ClipboardList, Plus } from "lucide-react";

type Props = {
  orders: OrderListItem[];
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  approved: "Aprobada",
  in_progress: "En progreso",
  completed: "Completada",
  cancelled: "Cancelada",
};

const STATUS_VARIANTS: Record<string, "outlined" | "info" | "success" | "warning" | "error"> = {
  draft: "outlined",
  approved: "info",
  in_progress: "warning",
  completed: "success",
  cancelled: "error",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baja",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

const STATUS_FILTERS = ["", "draft", "in_progress", "completed", "cancelled"] as const;

export function OrderList({ orders }: Props) {
  const role = useAuthStore((s) => s.role);
  const canCreate = role ? hasPermission(role, "create_order") : false;
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let result = orders;
    if (statusFilter) result = result.filter((o) => o.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.code.toLowerCase().includes(q) ||
          o.cultivarName.toLowerCase().includes(q),
      );
    }
    return result;
  }, [orders, statusFilter, search]);

  if (orders.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-4 lg:p-6">
        <EmptyState
          icon={ClipboardList}
          title="Sin ordenes"
          description="No hay ordenes de produccion. Crea la primera orden para comenzar."
        />
        {canCreate && (
          <Link href="/orders/new" className="mt-4">
            <Button icon={Plus}>Nueva Orden</Button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col p-4 lg:p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-primary">Ordenes de Produccion</h1>
          <p className="text-sm text-secondary">
            {filtered.length} de {orders.length} orden(es)
          </p>
        </div>
        {canCreate && (
          <Link href="/orders/new">
            <Button icon={Plus} size="sm">
              Nueva Orden
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por codigo o cultivar..."
          className="h-9 w-48 rounded-full border border-border bg-surface px-3 text-xs text-primary placeholder:text-tertiary focus:border-brand focus:outline-none"
        />
        {STATUS_FILTERS.map((status) => (
          <button
            key={status || "all"}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              statusFilter === status
                ? "bg-brand text-white"
                : "bg-surface-secondary text-secondary hover:text-primary",
            )}
          >
            {status ? STATUS_LABELS[status] ?? status : "Todos"}
          </button>
        ))}
      </div>

      {/* Orders list */}
      <div className="space-y-3">
        {filtered.map((order) => (
          <Link
            key={order.id}
            href={`/orders/${order.id}`}
            className="block rounded-card border border-border bg-surface-card p-4 transition-colors hover:border-brand/50"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-primary">
                    {order.code}
                  </span>
                  <Badge variant={STATUS_VARIANTS[order.status] ?? "outlined"}>
                    {STATUS_LABELS[order.status] ?? order.status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-secondary">
                  {order.cultivarName} — {order.cropTypeName}
                </p>
              </div>
              <div className="text-right">
                <span className="font-mono text-sm font-bold text-primary">
                  {order.initialQuantity}
                </span>{" "}
                <span className="text-xs text-secondary">{order.unitCode}</span>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-tertiary">
              <span>
                Inicio: <span className="font-mono">{order.plannedStartDate}</span>
              </span>
              <span>Prioridad: {PRIORITY_LABELS[order.priority] ?? order.priority}</span>
              {order.batchCode && (
                <Badge variant="success">{order.batchCode}</Badge>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
