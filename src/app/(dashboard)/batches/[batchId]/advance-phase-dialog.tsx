"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getAdvancePhaseData,
  advancePhase,
  type AdvancePhaseData,
} from "@/lib/actions/batches";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/utils/toast-store";
import { AlertTriangle, CheckCircle, MapPin } from "lucide-react";

type Props = {
  batchId: string;
  open: boolean;
  onClose: () => void;
};

export function AdvancePhaseDialog({ batchId, open, onClose }: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<AdvancePhaseData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [notes, setNotes] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getAdvancePhaseData(batchId);
    if (result.success) {
      setData(result.data);
      setSelectedZoneId("");
      setNotes("");
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, [batchId]);

  // Load data when dialog opens
  const handleOpen = useCallback(() => {
    if (open && !data && !loading) {
      loadData();
    }
  }, [open, data, loading, loadData]);

  // Trigger load on open
  if (open && !data && !loading && !error) {
    handleOpen();
  }

  const handleClose = () => {
    setData(null);
    setError(null);
    setSelectedZoneId("");
    setNotes("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!data) return;

    if (data.requiresZoneChange && !selectedZoneId) {
      toast.error("Selecciona una zona destino.");
      return;
    }

    setSubmitting(true);
    const result = await advancePhase({
      batchId,
      targetZoneId: selectedZoneId || undefined,
      notes: notes || undefined,
    });

    if (result.success) {
      const message = data.isExitPhase
        ? `Batch ${data.batchCode} completado exitosamente`
        : `Batch ${data.batchCode} avanzado a ${data.nextPhaseName}`;
      toast.success(message);
      handleClose();
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setSubmitting(false);
  };

  const canSubmit =
    data && (!data.requiresZoneChange || selectedZoneId) && !submitting;

  const hasPendingActivities =
    data && data.pendingActivities.length > 0;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={
        data?.isExitPhase ? "Completar batch" : "Avanzar fase"
      }
      footer={
        data && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              loading={submitting}
              disabled={!canSubmit}
            >
              {data.isExitPhase
                ? "Completar batch"
                : hasPendingActivities
                  ? "Avanzar de todas formas"
                  : "Confirmar avance"}
            </Button>
          </div>
        )
      }
    >
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-error/10 p-4 text-sm text-error">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-4">
          {/* Phase transition info */}
          <div className="rounded-lg bg-surface-secondary p-3">
            {data.isExitPhase ? (
              <div className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <div>
                  <p className="text-sm font-medium text-primary">
                    Fase final: {data.currentPhaseName}
                  </p>
                  <p className="mt-0.5 text-xs text-secondary">
                    Al completar, el batch se cerrara y la orden se evaluara como
                    completada.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-sm">
                <span className="text-secondary">Avanzar de </span>
                <span className="font-medium text-primary">
                  {data.currentPhaseName}
                </span>
                <span className="text-secondary"> a </span>
                <span className="font-medium text-brand">
                  {data.nextPhaseName}
                </span>
              </div>
            )}
          </div>

          {/* Pending activities warning */}
          {hasPendingActivities && (
            <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <div>
                  <p className="text-sm font-medium text-primary">
                    {data.pendingActivities.length} actividad(es) pendiente(s)
                  </p>
                  <p className="mt-0.5 text-xs text-secondary">
                    Estas actividades se marcaran como omitidas al avanzar:
                  </p>
                  <ul className="mt-2 space-y-1">
                    {data.pendingActivities.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center gap-2 text-xs text-secondary"
                      >
                        <span className="h-1 w-1 shrink-0 rounded-full bg-warning" />
                        {a.name}
                        <span className="font-mono text-tertiary">
                          ({a.plannedDate})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Zone selector (when required) */}
          {data.requiresZoneChange && !data.isExitPhase && (
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-primary">
                <MapPin className="h-3.5 w-3.5 text-brand" />
                Zona destino
                <span className="text-error">*</span>
              </label>
              <select
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(e.target.value)}
                className="h-10 w-full rounded-card border border-border bg-surface px-3 text-sm text-primary focus:border-brand focus:outline-none"
              >
                <option value="">Seleccionar zona...</option>
                {data.availableZones.map((zone) => {
                  const available = zone.plantCapacity - zone.currentOccupancy;
                  return (
                    <option key={zone.id} value={zone.id}>
                      {zone.name} — {available} plantas disponibles
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Optional zone selector (when not required but available) */}
          {!data.requiresZoneChange && !data.isExitPhase && data.availableZones.length > 0 && (
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-primary">
                <MapPin className="h-3.5 w-3.5 text-secondary" />
                Cambiar zona
                <span className="text-xs text-tertiary">(opcional)</span>
              </label>
              <select
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(e.target.value)}
                className="h-10 w-full rounded-card border border-border bg-surface px-3 text-sm text-primary focus:border-brand focus:outline-none"
              >
                <option value="">Mantener zona actual</option>
                {data.availableZones.map((zone) => {
                  const available = zone.plantCapacity - zone.currentOccupancy;
                  return (
                    <option key={zone.id} value={zone.id}>
                      {zone.name} — {available} plantas disponibles
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-primary">
              Notas
              <span className="ml-1 text-xs text-tertiary">(opcional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones sobre el avance de fase..."
              rows={2}
              maxLength={500}
              className="w-full rounded-card border border-border bg-surface px-3 py-2 text-sm text-primary placeholder:text-tertiary focus:border-brand focus:outline-none"
            />
          </div>
        </div>
      )}
    </Dialog>
  );
}
