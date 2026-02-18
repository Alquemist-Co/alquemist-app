"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/lib/utils/toast-store";
import {
  holdBatch,
  resumeBatch,
  cancelBatch,
  changeBatchZone,
} from "@/lib/actions/batches";
import { cn } from "@/lib/utils/cn";

const selectClasses = cn(
  "h-10 w-full rounded-input border border-border bg-surface-card px-3",
  "font-sans text-xs text-text-primary",
  "focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand-light/25",
  "appearance-none",
);

type ZoneOption = {
  id: string;
  name: string;
  plantCapacity: number;
  currentOccupancy: number;
};

type Props = {
  batchId: string;
  batchStatus: string;
  currentZoneId: string;
  zones: ZoneOption[];
  dialog: "hold" | "resume" | "cancel" | "zone-change" | null;
  onClose: () => void;
};

export function BatchActionsDialogs({
  batchId,
  batchStatus,
  currentZoneId,
  zones,
  dialog,
  onClose,
}: Props) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [selectedZone, setSelectedZone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function resetAndClose() {
    setReason("");
    setSelectedZone("");
    onClose();
  }

  async function handleHold() {
    setSubmitting(true);
    const result = await holdBatch({ batchId, reason });
    setSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Batch pausado");
    resetAndClose();
    router.refresh();
  }

  async function handleResume() {
    setSubmitting(true);
    const result = await resumeBatch({ batchId });
    setSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Batch reanudado");
    resetAndClose();
    router.refresh();
  }

  async function handleCancel() {
    setSubmitting(true);
    const result = await cancelBatch({ batchId, reason });
    setSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Batch cancelado");
    resetAndClose();
    router.refresh();
  }

  async function handleZoneChange() {
    if (!selectedZone) return;
    setSubmitting(true);
    const result = await changeBatchZone({
      batchId,
      newZoneId: selectedZone,
      reason: reason || undefined,
    });
    setSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Zona actualizada");
    resetAndClose();
    router.refresh();
  }

  return (
    <>
      {/* Hold dialog */}
      <Dialog
        open={dialog === "hold"}
        onClose={resetAndClose}
        title="Pausar batch"
        footer={
          <Button
            onClick={handleHold}
            loading={submitting}
            disabled={reason.length < 10}
            className="w-full"
          >
            Pausar batch
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            Las actividades pendientes se suspenderan mientras el batch este en pausa.
          </p>
          <Input
            label="Razon (min 10 caracteres)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </Dialog>

      {/* Resume dialog */}
      <Dialog
        open={dialog === "resume"}
        onClose={resetAndClose}
        title="Reanudar batch"
        footer={
          <Button onClick={handleResume} loading={submitting} className="w-full">
            Reanudar batch
          </Button>
        }
      >
        <p className="text-sm text-text-secondary">
          El batch volvera a estado activo y se regeneraran las actividades programadas.
        </p>
      </Dialog>

      {/* Cancel dialog */}
      <Dialog
        open={dialog === "cancel"}
        onClose={resetAndClose}
        title="Cancelar batch"
        footer={
          <Button
            onClick={handleCancel}
            loading={submitting}
            disabled={reason.length < 10}
            className="w-full bg-error hover:bg-error/90"
          >
            Cancelar batch (irreversible)
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-error font-medium">
            Esta accion es irreversible. Todas las actividades pendientes seran canceladas.
          </p>
          <Input
            label="Razon (min 10 caracteres)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </Dialog>

      {/* Zone change dialog */}
      <Dialog
        open={dialog === "zone-change"}
        onClose={resetAndClose}
        title="Cambiar zona"
        footer={
          <Button
            onClick={handleZoneChange}
            loading={submitting}
            disabled={!selectedZone}
            className="w-full"
          >
            Cambiar zona
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-text-primary">
              Nueva zona
            </label>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className={selectClasses}
            >
              <option value="">Seleccionar zona...</option>
              {zones
                .filter((z) => z.id !== currentZoneId)
                .map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} ({z.currentOccupancy}/{z.plantCapacity} plantas)
                  </option>
                ))}
            </select>
          </div>
          <Input
            label="Razon (opcional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </Dialog>
    </>
  );
}
