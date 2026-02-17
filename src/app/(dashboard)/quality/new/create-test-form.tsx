"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/utils/toast-store";
import { cn } from "@/lib/utils/cn";
import { createQualityTest } from "@/lib/actions/quality";

type Props = {
  formData: {
    batches: { id: string; code: string }[];
    phases: { id: string; name: string; cropTypeName: string }[];
  };
};

const TEST_TYPES = [
  "Cannabinoides",
  "Terpenos",
  "Metales pesados",
  "Pesticidas",
  "Microbiologia",
  "Humedad",
  "Aflatoxinas",
  "Solventes residuales",
];

export function CreateTestForm({ formData }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [batchId, setBatchId] = useState("");
  const [phaseId, setPhaseId] = useState("");
  const [testType, setTestType] = useState("");
  const [labName, setLabName] = useState("");
  const [sampleDate, setSampleDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const result = await createQualityTest({
        batchId,
        phaseId,
        testType,
        labName,
        sampleDate,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Test de calidad creado");
      router.push("/quality");
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
    <>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text-primary">Nuevo test de calidad</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
            Batch
          </label>
          <select
            className={selectClasses}
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            required
          >
            <option value="">Seleccionar batch...</option>
            {formData.batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
            Fase (opcional)
          </label>
          <select
            className={selectClasses}
            value={phaseId}
            onChange={(e) => setPhaseId(e.target.value)}
          >
            <option value="">Sin fase especifica</option>
            {formData.phases.map((p) => (
              <option key={p.id} value={p.id}>
                {p.cropTypeName} — {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
            Tipo de test
          </label>
          <select
            className={selectClasses}
            value={testType}
            onChange={(e) => setTestType(e.target.value)}
            required
          >
            <option value="">Seleccionar tipo...</option>
            {TEST_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Laboratorio"
          placeholder="Nombre del laboratorio"
          value={labName}
          onChange={(e) => setLabName(e.target.value)}
        />

        <Input
          label="Fecha de muestra"
          type="date"
          value={sampleDate}
          onChange={(e) => setSampleDate(e.target.value)}
        />

        <div className="mt-4 flex gap-3">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" loading={submitting}>
            Crear test
          </Button>
        </div>
      </form>
    </>
  );
}
