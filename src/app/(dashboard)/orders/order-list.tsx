"use client";

import Link from "next/link";
import type { OrderListItem } from "@/lib/actions/orders";
import { useAuthStore } from "@/stores/auth-store";
import { hasPermission } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
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

export function OrderList({ orders }: Props) {
  const role = useAuthStore((s) => s.role);
  const canCreate = role ? hasPermission(role, "create_order") : false;

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
        <h1 className="text-lg font-bold text-primary">Ordenes de Produccion</h1>
        {canCreate && (
          <Link href="/orders/new">
            <Button icon={Plus} size="sm">
              Nueva Orden
            </Button>
          </Link>
        )}
      </div>

      {/* Orders list */}
      <div className="space-y-3">
        {orders.map((order) => (
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
