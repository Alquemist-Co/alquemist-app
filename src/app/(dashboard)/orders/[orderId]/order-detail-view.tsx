"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { OrderDetail } from "@/lib/actions/orders";
import { approveOrder, rejectOrder } from "@/lib/actions/orders";
import { useAuthStore } from "@/stores/auth-store";
import { hasPermission } from "@/lib/auth/permissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/lib/utils/toast-store";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  ExternalLink,
} from "lucide-react";

type Props = {
  order: OrderDetail;
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

const PHASE_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  ready: "Lista",
  in_progress: "En progreso",
  completed: "Completada",
  skipped: "Omitida",
};

export function OrderDetailView({ order }: Props) {
  const router = useRouter();
  const role = useAuthStore((s) => s.role);
  const canApprove = role ? hasPermission(role, "approve_order") : false;

  const [approving, setApproving] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const isDraft = order.status === "draft";

  const handleApprove = async () => {
    setApproving(true);
    try {
      const result = await approveOrder(order.id);
      if (result.success) {
        toast.success(
          `Orden aprobada. Batch ${result.data.batchCode} creado.`,
        );
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    try {
      const result = await rejectOrder(order.id, rejectReason);
      if (result.success) {
        toast.success(`Orden ${order.code} rechazada`);
        setShowRejectDialog(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } finally {
      setRejecting(false);
    }
  };

  return (
    <>
      {/* Reject dialog */}
      <Dialog
        open={showRejectDialog}
        onClose={() => setShowRejectDialog(false)}
        title="Rechazar orden"
        footer={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowRejectDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleReject}
              loading={rejecting}
              disabled={rejectReason.trim().length < 5}
            >
              Confirmar rechazo
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-secondary">
            Ingresa la razon por la cual se rechaza esta orden. Esta accion no
            se puede deshacer.
          </p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            placeholder="Razon del rechazo (minimo 5 caracteres)..."
            className="w-full rounded-input border border-border bg-surface px-3 py-2 text-sm text-primary placeholder:text-tertiary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
          {rejectReason.length > 0 && rejectReason.trim().length < 5 && (
            <p className="text-xs text-error">
              La razon debe tener al menos 5 caracteres
            </p>
          )}
        </div>
      </Dialog>

      {/* Header */}
      <div className="border-b border-border bg-surface px-4 py-4 lg:px-6">
        <div className="mb-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/orders")}
            className="text-secondary hover:text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-lg font-bold text-primary">
                {order.code}
              </h1>
              <Badge variant={STATUS_VARIANTS[order.status] ?? "outlined"}>
                {STATUS_LABELS[order.status] ?? order.status}
              </Badge>
            </div>
            <p className="text-sm text-secondary">
              {order.cultivarName} — {order.cropTypeName}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        {isDraft && canApprove && (
          <div className="flex gap-3">
            <Button
              icon={CheckCircle}
              onClick={handleApprove}
              loading={approving}
            >
              Aprobar
            </Button>
            <Button
              variant="secondary"
              icon={XCircle}
              onClick={() => setShowRejectDialog(true)}
            >
              Rechazar
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="space-y-6">
          {/* Batch link */}
          {order.batchCode && order.batchId && (
            <div className="rounded-lg border border-success/30 bg-success/5 p-4">
              <p className="text-sm font-medium text-primary">
                Batch vinculado
              </p>
              <Link
                href={`/batches/${order.batchId}`}
                className="mt-1 inline-flex items-center gap-1 font-mono text-sm font-bold text-brand hover:underline"
              >
                {order.batchCode}
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          {/* Order details */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailField label="Cantidad inicial">
              <span className="font-mono font-bold">
                {order.initialQuantity}
              </span>{" "}
              <span className="text-secondary">
                {order.unitName} ({order.unitCode})
              </span>
            </DetailField>
            <DetailField label="Prioridad">
              {PRIORITY_LABELS[order.priority] ?? order.priority}
            </DetailField>
            <DetailField label="Responsable">
              {order.assigneeName ?? "Sin asignar"}
            </DetailField>
            <DetailField label="Fecha inicio">
              <span className="font-mono">{order.plannedStartDate}</span>
            </DetailField>
            <DetailField label="Fecha fin estimada">
              <span className="font-mono">
                {order.plannedEndDate ?? "—"}
              </span>
            </DetailField>
            <DetailField label="Fases">
              {order.entryPhaseName} → {order.exitPhaseName}
            </DetailField>
          </div>

          {/* Notes */}
          {order.notes && (
            <div>
              <h3 className="mb-1 text-sm font-medium text-tertiary">Notas</h3>
              <p className="text-sm text-primary">{order.notes}</p>
            </div>
          )}

          {/* Phase table */}
          <div>
            <h3 className="mb-2 text-sm font-bold text-primary">
              Fases de la orden
            </h3>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-secondary text-left text-xs text-tertiary">
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Fase</th>
                    <th className="px-3 py-2 font-medium">Zona</th>
                    <th className="px-3 py-2 font-medium">Dias</th>
                    <th className="px-3 py-2 font-medium">Inicio</th>
                    <th className="px-3 py-2 font-medium">Fin</th>
                    <th className="px-3 py-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {order.phases.map((phase) => (
                    <tr key={phase.id} className="border-b border-border/50">
                      <td className="px-3 py-2 font-mono text-xs text-tertiary">
                        {phase.sortOrder}
                      </td>
                      <td className="px-3 py-2 font-medium text-primary">
                        {phase.phaseName}
                      </td>
                      <td className="px-3 py-2 text-secondary">
                        {phase.zoneName ?? "—"}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {phase.plannedDurationDays ?? "—"}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {phase.plannedStartDate ?? "—"}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {phase.plannedEndDate ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        <Badge
                          variant={
                            phase.status === "completed"
                              ? "success"
                              : phase.status === "in_progress"
                                ? "warning"
                                : phase.status === "skipped"
                                  ? "error"
                                  : "outlined"
                          }
                        >
                          {PHASE_STATUS_LABELS[phase.status] ?? phase.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function DetailField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="text-xs text-tertiary">{label}</span>
      <p className="text-sm text-primary">{children}</p>
    </div>
  );
}
