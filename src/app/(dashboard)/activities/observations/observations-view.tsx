"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "@/lib/utils/toast-store";
import { cn } from "@/lib/utils/cn";
import {
  createObservation,
  type ObservationItem,
  type ObservationBatchOption,
} from "@/lib/actions/observations";

const selectClasses = cn(
  "h-10 w-full rounded-input border border-border bg-surface-card px-3",
  "font-sans text-xs text-text-primary",
  "focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand-light/25",
  "appearance-none",
);

const OBSERVATION_TYPES = [
  { value: "pest", label: "Plaga" },
  { value: "disease", label: "Enfermedad" },
  { value: "deficiency", label: "Deficiencia" },
  { value: "environmental", label: "Ambiental" },
  { value: "general", label: "General" },
  { value: "measurement", label: "Medicion" },
] as const;

const SEVERITY_LEVELS = [
  { value: "info", label: "Info", color: "info" },
  { value: "low", label: "Baja", color: "info" },
  { value: "medium", label: "Media", color: "warning" },
  { value: "high", label: "Alta", color: "warning" },
  { value: "critical", label: "Critica", color: "error" },
] as const;

type Props = {
  observations: ObservationItem[];
  batches: ObservationBatchOption[];
};

export function ObservationsView({ observations, batches }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [batchId, setBatchId] = useState("");
  const [type, setType] = useState<string>("general");
  const [severity, setSeverity] = useState<string>("info");
  const [description, setDescription] = useState("");
  const [affectedPlants, setAffectedPlants] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setBatchId("");
    setType("general");
    setSeverity("info");
    setDescription("");
    setAffectedPlants("");
    setActionTaken("");
  }

  async function handleSubmit() {
    if (!batchId || !description) return;
    setSubmitting(true);
    const result = await createObservation({
      batchId,
      type: type as "pest" | "disease" | "deficiency" | "environmental" | "general" | "measurement",
      severity: severity as "info" | "low" | "medium" | "high" | "critical",
      description,
      affectedPlants: affectedPlants ? Number(affectedPlants) : undefined,
      actionTaken: actionTaken || undefined,
    });
    setSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Observacion registrada");
    setShowForm(false);
    resetForm();
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-text-primary">Observaciones</h1>
          <p className="text-sm text-text-secondary">
            {observations.length} observaciones recientes
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          <PlusCircle className="size-4" />
          Nueva observacion
        </Button>
      </div>

      {observations.length === 0 ? (
        <EmptyState
          icon={Eye}
          title="Sin observaciones"
          description="No hay observaciones registradas aun."
        />
      ) : (
        <div className="space-y-2">
          {observations.map((obs) => (
            <Card key={obs.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge
                      variant={
                        obs.severity === "critical" || obs.severity === "high"
                          ? "error"
                          : obs.severity === "medium"
                            ? "warning"
                            : "info"
                      }
                    >
                      {SEVERITY_LEVELS.find((s) => s.value === obs.severity)?.label ?? obs.severity}
                    </Badge>
                    <span className="text-xs text-text-secondary">
                      {OBSERVATION_TYPES.find((t) => t.value === obs.type)?.label ?? obs.type}
                    </span>
                  </div>
                  <p className="text-sm text-text-primary">{obs.description}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-text-secondary">
                    {obs.batchCode && <span>Batch: {obs.batchCode}</span>}
                    <span>Zona: {obs.zoneName}</span>
                    {obs.affectedPlants != null && (
                      <span>{obs.affectedPlants} plantas afectadas</span>
                    )}
                  </div>
                  {obs.actionTaken && (
                    <p className="mt-1 text-xs text-text-secondary">
                      Accion: {obs.actionTaken}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-text-tertiary">
                  {new Date(obs.createdAt).toLocaleDateString("es-CO", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create observation dialog */}
      <Dialog
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Nueva observacion"
        footer={
          <Button
            onClick={handleSubmit}
            loading={submitting}
            disabled={!batchId || description.length < 5}
            className="w-full"
          >
            Registrar observacion
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-text-primary">
              Batch
            </label>
            <select
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className={selectClasses}
            >
              <option value="">Seleccionar batch...</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} — {b.cultivarName} ({b.zoneName})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-text-primary">
              Tipo
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={selectClasses}
            >
              {OBSERVATION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-text-primary">
              Severidad
            </label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className={selectClasses}
            >
              {SEVERITY_LEVELS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Descripcion (min 5 caracteres)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Input
            label="Plantas afectadas (opcional)"
            type="number"
            min={0}
            step={1}
            value={affectedPlants}
            onChange={(e) => setAffectedPlants(e.target.value)}
          />
          <Input
            label="Accion tomada (opcional)"
            value={actionTaken}
            onChange={(e) => setActionTaken(e.target.value)}
          />
        </div>
      </Dialog>
    </div>
  );
}
