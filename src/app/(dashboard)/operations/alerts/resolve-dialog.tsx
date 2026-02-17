"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/utils/toast-store";
import { resolveAlert } from "@/lib/actions/alerts";

type Props = {
  open: boolean;
  onClose: () => void;
  alertId: string;
  onResolved: () => void;
};

export function ResolveDialog({ open, onClose, alertId, onResolved }: Props) {
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleResolve = async () => {
    setSubmitting(true);

    const result = await resolveAlert({
      alertId,
      resolutionNotes: notes,
    });

    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Alerta resuelta");
    setNotes("");
    onClose();
    onResolved();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Resolver Alerta"
      footer={
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleResolve}
            disabled={submitting}
            className="flex-1"
          >
            {submitting ? "Resolviendo..." : "Resolver"}
          </Button>
        </div>
      }
    >
      <div>
        <label className="mb-1 block text-xs font-bold text-text-secondary">
          Notas de resolucion (opcional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Describe como se resolvio esta alerta..."
          rows={3}
          className="w-full rounded-input border border-border bg-surface-card px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand-light/25"
          maxLength={2000}
        />
      </div>
    </Dialog>
  );
}
