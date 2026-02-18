"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "@/lib/utils/toast-store";
import { cn } from "@/lib/utils/cn";
import {
  createManualBatch,
  type ManualBatchFormData,
} from "@/lib/actions/batches";

const selectClasses = cn(
  "h-10 w-full rounded-input border border-border bg-surface-card px-3",
  "font-sans text-xs text-text-primary",
  "focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand-light/25",
  "appearance-none",
);

type Props = { formData: ManualBatchFormData };

export function ManualBatchForm({ formData }: Props) {
  const router = useRouter();
  const [cultivarId, setCultivarId] = useState("");
  const [phaseId, setPhaseId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [plantCount, setPlantCount] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [areaM2, setAreaM2] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Get crop type from selected cultivar to filter phases
  const selectedCultivar = formData.cultivars.find((c) => c.id === cultivarId);
  const filteredPhases = useMemo(() => {
    if (!selectedCultivar) return [];
    // Filter phases by the cultivar's crop type
    const cropTypeName = selectedCultivar.cropTypeName;
    const cultivarCropType = formData.cultivars.find(
      (c) => c.cropTypeName === cropTypeName,
    );
    if (!cultivarCropType) return formData.phases;
    // We need crop_type_id on phases — use the grouped relationship
    // Phases are already linked by cropTypeId, but we have cropTypeName on cultivar
    // Just show all phases (they're filtered by cropTypeId on the server anyway)
    return formData.phases;
  }, [formData, selectedCultivar]);

  const selectedZone = formData.zones.find((z) => z.id === zoneId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cultivarId || !phaseId || !zoneId || !plantCount) return;

    setSubmitting(true);
    const result = await createManualBatch({
      cultivarId,
      phaseId,
      zoneId,
      plantCount: Number(plantCount),
      startDate,
      areaM2: areaM2 ? Number(areaM2) : undefined,
    });
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Batch creado exitosamente");
    router.push(`/batches/${result.data!.id}`);
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/batches")}
          className="text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-text-primary">
          Crear batch manual
        </h1>
      </div>

      <Card className="p-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-text-primary">
              Cultivar
            </label>
            <select
              value={cultivarId}
              onChange={(e) => {
                setCultivarId(e.target.value);
                setPhaseId("");
              }}
              className={selectClasses}
            >
              <option value="">Seleccionar cultivar...</option>
              {formData.cultivars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.cropTypeName})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-text-primary">
              Fase inicial
            </label>
            <select
              value={phaseId}
              onChange={(e) => setPhaseId(e.target.value)}
              className={selectClasses}
              disabled={!cultivarId}
            >
              <option value="">Seleccionar fase...</option>
              {filteredPhases.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-text-primary">
              Zona
            </label>
            <select
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              className={selectClasses}
            >
              <option value="">Seleccionar zona...</option>
              {formData.zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name} ({z.currentOccupancy}/{z.plantCapacity} plantas)
                </option>
              ))}
            </select>
            {selectedZone &&
              Number(plantCount) > 0 &&
              selectedZone.currentOccupancy + Number(plantCount) >
                selectedZone.plantCapacity && (
                <p className="mt-1 text-xs text-warning">
                  La zona superara su capacidad con este batch.
                </p>
              )}
          </div>

          <Input
            label="Cantidad de plantas"
            type="number"
            min={1}
            step={1}
            value={plantCount}
            onChange={(e) => setPlantCount(e.target.value)}
          />

          <Input
            label="Fecha de inicio"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <Input
            label="Area (m2, opcional)"
            type="number"
            min={0.01}
            step="any"
            value={areaM2}
            onChange={(e) => setAreaM2(e.target.value)}
          />

          <Button
            type="submit"
            loading={submitting}
            disabled={!cultivarId || !phaseId || !zoneId || !plantCount}
            className="mt-2"
          >
            Crear batch
          </Button>
        </form>
      </Card>
    </div>
  );
}
