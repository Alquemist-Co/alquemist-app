"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/utils/toast-store";
import { cn } from "@/lib/utils/cn";
import {
  createCultivarSchema,
  type CreateCultivarData,
} from "@/lib/schemas/config";
import {
  createCultivar,
  updateCultivar,
} from "@/lib/actions/config";
import type {
  CultivarWithCropType,
  CropTypeWithCounts,
} from "@/lib/actions/config";
import type { PhaseWithFlows } from "@/lib/actions/config";

type Props = {
  cropTypes: CropTypeWithCounts[];
  phases: PhaseWithFlows[];
  cultivar?: CultivarWithCropType | null;
};

const CONDITION_FIELDS = [
  { key: "temperature", label: "Temperatura", unit: "°C" },
  { key: "humidity", label: "Humedad", unit: "%" },
  { key: "co2", label: "CO2", unit: "ppm" },
  { key: "ec", label: "EC", unit: "mS/cm" },
  { key: "ph", label: "pH", unit: "" },
  { key: "lightPpfd", label: "Luz PPFD", unit: "µmol/m²s" },
  { key: "vpd", label: "VPD", unit: "kPa" },
] as const;

export function CultivarForm({ cropTypes, phases, cultivar }: Props) {
  const router = useRouter();
  const isEditing = !!cultivar;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateCultivarData>({
    resolver: zodResolver(createCultivarSchema),
    defaultValues: cultivar
      ? {
          cropTypeId: cultivar.cropTypeId,
          code: cultivar.code,
          name: cultivar.name,
          breeder: cultivar.breeder ?? "",
          genetics: cultivar.genetics ?? "",
          defaultCycleDays: cultivar.defaultCycleDays ?? undefined,
          expectedYieldPerPlantG: cultivar.expectedYieldPerPlantG
            ? Number(cultivar.expectedYieldPerPlantG)
            : undefined,
          expectedDryRatio: cultivar.expectedDryRatio
            ? Number(cultivar.expectedDryRatio)
            : undefined,
          qualityGrade: cultivar.qualityGrade ?? "",
          densityPlantsPerM2: cultivar.densityPlantsPerM2
            ? Number(cultivar.densityPlantsPerM2)
            : undefined,
          notes: cultivar.notes ?? "",
          phaseDurations: cultivar.phaseDurations ?? undefined,
          optimalConditions: cultivar.optimalConditions as CreateCultivarData["optimalConditions"],
        }
      : {
          cropTypeId: cropTypes[0]?.id ?? "",
          code: "",
          name: "",
          breeder: "",
          genetics: "",
          qualityGrade: "",
          notes: "",
        },
  });

  const selectedCropTypeId = watch("cropTypeId");
  const selectedPhases = phases.filter(
    (p) => selectedCropTypeId && p.id // phases are already filtered to crop type from parent
  );

  const phaseDurations = watch("phaseDurations") ?? {};
  const optimalConditions = watch("optimalConditions");

  // Compute cycle total
  const cycleTotal = selectedPhases.reduce((sum, phase) => {
    const customDays = phaseDurations[phase.code];
    const days = customDays ?? phase.defaultDurationDays ?? 0;
    return sum + days;
  }, 0);

  async function onSubmit(data: CreateCultivarData) {
    // Clean empty optional conditions
    if (data.optimalConditions) {
      const cleaned = { ...data.optimalConditions };
      for (const key of Object.keys(cleaned) as (keyof typeof cleaned)[]) {
        if (!cleaned[key]) delete cleaned[key];
      }
      data.optimalConditions = Object.keys(cleaned).length > 0 ? cleaned : undefined;
    }

    if (isEditing && cultivar) {
      const result = await updateCultivar({ ...data, id: cultivar.id });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Cultivar actualizado");
    } else {
      const result = await createCultivar(data);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Cultivar creado");
    }

    router.push("/settings/cultivars");
    router.refresh();
  }

  const selectClasses = cn(
    "h-12 w-full rounded-input border bg-surface-card px-3",
    "font-sans text-sm text-text-primary",
    "transition-colors duration-150",
    "focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand-light/25",
    "appearance-none"
  );

  const numRegister = (name: keyof CreateCultivarData) =>
    register(name, {
      setValueAs: (v: string) =>
        v === "" || isNaN(Number(v)) ? undefined : Number(v),
    });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-6"
    >
      {/* Basic info */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
          Datos basicos
        </h2>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="cropTypeId"
            className="text-[11px] font-bold uppercase tracking-wider text-text-secondary"
          >
            Tipo de cultivo
          </label>
          <select
            id="cropTypeId"
            className={cn(
              selectClasses,
              errors.cropTypeId ? "border-error" : "border-border"
            )}
            {...register("cropTypeId")}
          >
            <option value="">Seleccionar...</option>
            {cropTypes.map((ct) => (
              <option key={ct.id} value={ct.id}>
                {ct.name}
              </option>
            ))}
          </select>
          {errors.cropTypeId && (
            <p className="text-xs text-error" role="alert">
              {errors.cropTypeId.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Codigo"
            placeholder="gelato-41"
            error={errors.code?.message}
            {...register("code")}
          />
          <Input
            label="Nombre"
            placeholder="Gelato #41"
            error={errors.name?.message}
            {...register("name")}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Breeder (opcional)"
            placeholder="Seed Junky Genetics"
            {...register("breeder")}
          />
          <Input
            label="Genetica (opcional)"
            placeholder="Sunset Sherbert x Thin Mint GSC"
            {...register("genetics")}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Ciclo (dias)"
            type="number"
            placeholder="127"
            error={errors.defaultCycleDays?.message}
            {...numRegister("defaultCycleDays")}
          />
          <Input
            label="Yield/planta (g)"
            type="number"
            step="0.1"
            placeholder="500"
            {...numRegister("expectedYieldPerPlantG")}
          />
          <Input
            label="Ratio seco"
            type="number"
            step="0.01"
            placeholder="0.25"
            {...numRegister("expectedDryRatio")}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Densidad (pl/m2)"
            type="number"
            step="0.1"
            placeholder="9"
            {...numRegister("densityPlantsPerM2")}
          />
          <Input
            label="Grado calidad"
            placeholder="Premium Indoor"
            {...register("qualityGrade")}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="notes"
            className="text-[11px] font-bold uppercase tracking-wider text-text-secondary"
          >
            Notas (opcional)
          </label>
          <textarea
            id="notes"
            rows={3}
            className={cn(
              "w-full rounded-input border border-border bg-surface-card px-3 py-2",
              "font-sans text-sm text-text-primary placeholder:text-text-secondary/50",
              "focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand-light/25",
              "resize-y"
            )}
            placeholder="Notas sobre el cultivar..."
            {...register("notes")}
          />
        </div>
      </section>

      {/* Phase durations */}
      {selectedPhases.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
            Duracion por fase
          </h2>
          <div className="rounded-card border border-border bg-surface-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase text-text-secondary">
                    Fase
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-bold uppercase text-text-secondary">
                    Default
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-bold uppercase text-text-secondary">
                    Dias
                  </th>
                </tr>
              </thead>
              <tbody>
                {selectedPhases.map((phase) => {
                  const customVal = phaseDurations[phase.code];
                  return (
                    <tr key={phase.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-text-primary">
                        {phase.name}
                        <span className="ml-1 font-mono text-xs text-text-secondary">
                          {phase.code}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-text-secondary">
                        {phase.defaultDurationDays ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min={1}
                          className={cn(
                            "w-16 rounded border border-border bg-surface px-2 py-1 text-right",
                            "font-mono text-xs text-text-primary",
                            "focus:border-brand focus:outline-none"
                          )}
                          value={customVal ?? ""}
                          placeholder={String(phase.defaultDurationDays ?? "")}
                          onChange={(e) => {
                            const val = e.target.value;
                            const newDurations = { ...phaseDurations };
                            if (val === "" || isNaN(Number(val))) {
                              delete newDurations[phase.code];
                            } else {
                              newDurations[phase.code] = Number(val);
                            }
                            setValue("phaseDurations", Object.keys(newDurations).length > 0 ? newDurations : undefined);
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-surface">
                  <td className="px-3 py-2 font-bold text-text-primary" colSpan={2}>
                    Total ciclo
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-text-primary">
                    {cycleTotal}d
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {/* Optimal conditions */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
          Condiciones optimas (opcional)
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {CONDITION_FIELDS.map((field) => {
            const cond = optimalConditions?.[field.key];
            return (
              <div
                key={field.key}
                className="flex items-center gap-2 rounded-card border border-border bg-surface-card p-3"
              >
                <span className="min-w-[80px] text-xs font-bold text-text-secondary">
                  {field.label}
                </span>
                <input
                  type="number"
                  step="0.1"
                  className={cn(
                    "w-16 rounded border border-border bg-surface px-2 py-1",
                    "font-mono text-xs text-text-primary text-center",
                    "focus:border-brand focus:outline-none"
                  )}
                  placeholder="Min"
                  value={cond?.min ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    const current = optimalConditions ?? {};
                    const existing = current[field.key];
                    if (val === "") {
                      if (existing?.max != null) {
                        setValue("optimalConditions", {
                          ...current,
                          [field.key]: { min: 0, max: existing.max },
                        });
                      } else {
                        const next = { ...current };
                        delete next[field.key];
                        setValue("optimalConditions", next);
                      }
                    } else {
                      setValue("optimalConditions", {
                        ...current,
                        [field.key]: {
                          min: Number(val),
                          max: existing?.max ?? Number(val),
                        },
                      });
                    }
                  }}
                />
                <span className="text-xs text-text-secondary">—</span>
                <input
                  type="number"
                  step="0.1"
                  className={cn(
                    "w-16 rounded border border-border bg-surface px-2 py-1",
                    "font-mono text-xs text-text-primary text-center",
                    "focus:border-brand focus:outline-none"
                  )}
                  placeholder="Max"
                  value={cond?.max ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    const current = optimalConditions ?? {};
                    const existing = current[field.key];
                    if (val === "") {
                      if (existing?.min != null) {
                        setValue("optimalConditions", {
                          ...current,
                          [field.key]: { min: existing.min, max: 0 },
                        });
                      } else {
                        const next = { ...current };
                        delete next[field.key];
                        setValue("optimalConditions", next);
                      }
                    } else {
                      setValue("optimalConditions", {
                        ...current,
                        [field.key]: {
                          min: existing?.min ?? 0,
                          max: Number(val),
                        },
                      });
                    }
                  }}
                />
                {field.unit && (
                  <span className="text-xs text-text-secondary">
                    {field.unit}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="ghost"
          className="flex-1"
          onClick={() => router.back()}
        >
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting} className="flex-1">
          {isEditing ? "Guardar cambios" : "Crear cultivar"}
        </Button>
      </div>
    </form>
  );
}
