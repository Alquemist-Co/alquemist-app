"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/utils/toast-store";
import { cn } from "@/lib/utils/cn";
import {
  getTransformationContext,
  executeTransformation,
  type TransformationContext,
} from "@/lib/actions/inventory";

type Props = {
  batchId: string;
  open: boolean;
  onClose: () => void;
};

type OutputLine = {
  key: number;
  productId: string;
  productName: string;
  quantity: string;
  unitId: string;
  unitCode: string;
  zoneId: string;
};

export function TransformDialog({ batchId, open, onClose }: Props) {
  const router = useRouter();
  const [context, setContext] = useState<TransformationContext | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [outputs, setOutputs] = useState<OutputLine[]>([]);
  const [wasteQty, setWasteQty] = useState("");
  const [wasteReason, setWasteReason] = useState("");
  const [notes, setNotes] = useState("");

  const loadContext = useCallback(async () => {
    if (!open) return;
    const data = await getTransformationContext(batchId);
    setContext(data);
    if (data) {
      setOutputs(
        data.outputs
          .filter((o) => o.productId)
          .map((o, i) => ({
            key: i,
            productId: o.productId!,
            productName: o.productName ?? "Producto",
            quantity: o.expectedQtyPerInput
              ? (parseFloat(o.expectedQtyPerInput) * data.plantCount).toFixed(2)
              : "",
            unitId: o.unitId ?? "",
            unitCode: o.unitCode ?? "",
            zoneId: "",
          })),
      );
    }
  }, [batchId, open]);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  const updateOutput = useCallback(
    (key: number, field: keyof OutputLine, value: string) => {
      setOutputs((prev) =>
        prev.map((o) => (o.key === key ? { ...o, [field]: value } : o)),
      );
    },
    [],
  );

  const removeOutput = useCallback((key: number) => {
    setOutputs((prev) => prev.filter((o) => o.key !== key));
  }, []);

  async function handleSubmit() {
    const validOutputs = outputs.filter((o) => o.productId && o.quantity && o.zoneId);
    if (validOutputs.length === 0) {
      toast.error("Agrega al menos un output con zona");
      return;
    }

    setSubmitting(true);
    try {
      const result = await executeTransformation({
        batchId,
        phaseId: context!.phaseId,
        outputs: validOutputs.map((o) => ({
          productId: o.productId,
          quantity: parseFloat(o.quantity),
          unitId: o.unitId,
          zoneId: o.zoneId,
        })),
        wasteQuantity: wasteQty ? parseFloat(wasteQty) : undefined,
        wasteUnitId: wasteQty && outputs[0]?.unitId ? outputs[0].unitId : undefined,
        wasteReason: wasteReason || undefined,
        notes: notes || undefined,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Transformacion registrada");
      onClose();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const selectClasses = cn(
    "h-12 w-full rounded-input border border-border bg-surface-card px-3",
    "font-sans text-sm text-text-primary",
    "focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand-light/25",
    "appearance-none",
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Transformacion — ${context?.phaseName ?? "Cargando..."}`}
      footer={
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={submitting} onClick={handleSubmit}>
            Registrar transformacion
          </Button>
        </div>
      }
    >
      {!context ? (
        <p className="text-sm text-text-secondary py-4">Cargando contexto...</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="text-sm">
            <p className="text-text-secondary">
              Batch: <span className="font-mono text-text-primary">{context.batchCode}</span>
              {" — "}{context.plantCount} plantas
            </p>
          </div>

          {/* Output lines */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
              Outputs
            </h3>
            <div className="flex flex-col gap-3">
              {outputs.map((line) => (
                <div key={line.key} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-text-primary">
                      {line.productName}
                    </span>
                    {outputs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOutput(line.key)}
                        className="text-xs text-error hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="Cantidad"
                      type="number"
                      step="0.01"
                      value={line.quantity}
                      onChange={(e) => updateOutput(line.key, "quantity", e.target.value)}
                    />
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                        Zona destino
                      </label>
                      <select
                        className={selectClasses}
                        value={line.zoneId}
                        onChange={(e) => updateOutput(line.key, "zoneId", e.target.value)}
                      >
                        <option value="">Seleccionar zona...</option>
                        {context.zones.map((z) => (
                          <option key={z.id} value={z.id}>
                            {z.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {line.unitCode && (
                    <p className="mt-1 text-xs text-text-secondary">
                      Unidad: {line.unitCode}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Waste section */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
              Desperdicio (opcional)
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Cantidad desperdicio"
                type="number"
                step="0.01"
                value={wasteQty}
                onChange={(e) => setWasteQty(e.target.value)}
              />
              <Input
                label="Razon"
                value={wasteReason}
                onChange={(e) => setWasteReason(e.target.value)}
                placeholder="Motivo del desperdicio"
              />
            </div>
          </div>

          <Input
            label="Notas (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      )}
    </Dialog>
  );
}
