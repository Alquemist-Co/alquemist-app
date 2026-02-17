"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Scissors, GitMerge, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/lib/utils/toast-store";
import { cn } from "@/lib/utils/cn";
import { splitBatch, mergeBatches, type SplitContext, type MergeCandidate } from "@/lib/actions/batch-split";

type Props = {
  context: SplitContext;
  mergeCandidates: MergeCandidate[];
};

type Step = 1 | 2 | 3;

export function SplitWizard({ context, mergeCandidates }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);

  // Split form
  const [splitCount, setSplitCount] = useState(Math.floor(context.plantCount / 2));
  const [zoneId, setZoneId] = useState("");
  const [reason, setReason] = useState("");

  // Merge
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeSelected, setMergeSelected] = useState<string[]>([]);
  const [mergeReason, setMergeReason] = useState("");
  const [mergeSubmitting, setMergeSubmitting] = useState(false);

  const childCodePreview = `${context.batchCode}-${String.fromCharCode(65 + context.existingChildCount)}`;
  const remaining = context.plantCount - splitCount;

  async function handleSplit() {
    setSubmitting(true);
    try {
      const result = await splitBatch({
        batchId: context.batchId,
        splitCount,
        zoneId,
        reason,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(`Batch dividido: ${result.data.childCode} creado`);
      router.push(`/batches/${context.batchId}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMerge() {
    if (mergeSelected.length === 0) {
      toast.error("Selecciona al menos un batch");
      return;
    }
    setMergeSubmitting(true);
    try {
      const result = await mergeBatches({
        targetBatchId: context.batchId,
        sourceBatchIds: mergeSelected,
        reason: mergeReason,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Batches fusionados exitosamente");
      setMergeOpen(false);
      router.push(`/batches/${context.batchId}`);
      router.refresh();
    } finally {
      setMergeSubmitting(false);
    }
  }

  const selectClasses = cn(
    "h-12 w-full rounded-input border border-border bg-surface-card px-3",
    "font-sans text-sm text-text-primary",
    "focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand-light/25",
    "appearance-none",
  );

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/batches/${context.batchId}`}>
          <button type="button" className="text-text-secondary hover:text-text-primary">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-text-primary">
            Dividir batch
          </h1>
          <p className="text-sm text-text-secondary">
            <span className="font-mono">{context.batchCode}</span> — {context.plantCount} plantas — {context.currentPhaseName}
          </p>
        </div>
        {mergeCandidates.length > 0 && (
          <Button size="sm" variant="ghost" icon={GitMerge} onClick={() => setMergeOpen(true)}>
            Fusionar
          </Button>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
              s === step ? "bg-brand text-white" : s < step ? "bg-success text-white" : "bg-border text-text-secondary",
            )}
          >
            {s}
          </div>
        ))}
      </div>

      {/* Step 1: Quantity */}
      {step === 1 && (
        <Card>
          <h2 className="text-sm font-bold text-text-primary mb-4">Cantidad a separar</h2>
          <input
            type="range"
            min={1}
            max={context.plantCount - 1}
            value={splitCount}
            onChange={(e) => setSplitCount(parseInt(e.target.value))}
            className="w-full mb-3"
          />
          <div className="flex items-center gap-3 mb-4">
            <Input
              label="Plantas al nuevo batch"
              type="number"
              min={1}
              max={context.plantCount - 1}
              value={splitCount.toString()}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val) && val > 0 && val < context.plantCount) setSplitCount(val);
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-surface-secondary p-3">
              <p className="text-xs text-text-secondary">Original ({context.batchCode})</p>
              <p className="font-mono font-bold text-text-primary">{remaining} plantas</p>
            </div>
            <div className="rounded-lg bg-brand/5 p-3">
              <p className="text-xs text-text-secondary">Nuevo ({childCodePreview})</p>
              <p className="font-mono font-bold text-brand">{splitCount} plantas</p>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setStep(2)} icon={ChevronRight}>
              Siguiente
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Zone + Reason */}
      {step === 2 && (
        <Card>
          <h2 className="text-sm font-bold text-text-primary mb-4">Zona y razon</h2>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                Zona destino
              </label>
              <select
                className={selectClasses}
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                required
              >
                <option value="">Seleccionar zona...</option>
                {context.zones.map((z) => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </div>
            <Input
              label="Razon de la division"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Minimo 5 caracteres"
            />
          </div>
          <div className="mt-4 flex gap-3 justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>Atras</Button>
            <Button
              onClick={() => setStep(3)}
              icon={ChevronRight}
              disabled={!zoneId || reason.length < 5}
            >
              Siguiente
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && (
        <Card>
          <h2 className="text-sm font-bold text-text-primary mb-4">Confirmar division</h2>
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Batch original</span>
              <span className="font-mono text-text-primary">{context.batchCode} → {remaining} plantas</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Nuevo batch</span>
              <span className="font-mono text-brand">{childCodePreview} → {splitCount} plantas</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Zona</span>
              <span className="text-text-primary">
                {context.zones.find((z) => z.id === zoneId)?.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Razon</span>
              <span className="text-text-primary">{reason}</span>
            </div>
          </div>
          <div className="mt-4 flex gap-3 justify-between">
            <Button variant="ghost" onClick={() => setStep(2)}>Atras</Button>
            <Button loading={submitting} onClick={handleSplit} icon={Scissors}>
              Dividir batch
            </Button>
          </div>
        </Card>
      )}

      {/* Merge dialog */}
      <Dialog
        open={mergeOpen}
        onClose={() => setMergeOpen(false)}
        title="Fusionar batches"
        footer={
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setMergeOpen(false)}>Cancelar</Button>
            <Button loading={mergeSubmitting} onClick={handleMerge} icon={GitMerge}>
              Fusionar
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-text-secondary">
            Selecciona batches hermanos para fusionar en <span className="font-mono font-bold">{context.batchCode}</span>.
          </p>
          {mergeCandidates.map((mc) => (
            <label key={mc.id} className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:border-brand/30">
              <input
                type="checkbox"
                checked={mergeSelected.includes(mc.id)}
                onChange={(e) => {
                  setMergeSelected((prev) =>
                    e.target.checked ? [...prev, mc.id] : prev.filter((id) => id !== mc.id),
                  );
                }}
                className="h-4 w-4"
              />
              <div className="flex-1">
                <span className="font-mono text-sm font-bold text-text-primary">{mc.code}</span>
                <span className="ml-2 text-xs text-text-secondary">{mc.plantCount} plantas</span>
              </div>
              <Badge variant="outlined">{mc.currentPhaseName}</Badge>
            </label>
          ))}
          <Input
            label="Razon de la fusion"
            value={mergeReason}
            onChange={(e) => setMergeReason(e.target.value)}
            placeholder="Minimo 5 caracteres"
          />
        </div>
      </Dialog>
    </>
  );
}
