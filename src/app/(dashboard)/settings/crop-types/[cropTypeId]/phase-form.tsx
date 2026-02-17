"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Toggle } from "@/components/ui/toggle";
import { toast } from "@/lib/utils/toast-store";
import {
  createPhaseSchema,
  type CreatePhaseData,
} from "@/lib/schemas/config";
import { createPhase, updatePhase } from "@/lib/actions/config";
import type { PhaseWithFlows } from "@/lib/actions/config";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  cropTypeId: string;
  phase: PhaseWithFlows | null;
};

export function PhaseForm({ open, onClose, onSuccess, cropTypeId, phase }: Props) {
  const isEditing = !!phase;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreatePhaseData>({
    resolver: zodResolver(createPhaseSchema),
    defaultValues: phase
      ? {
          cropTypeId,
          code: phase.code,
          name: phase.name,
          defaultDurationDays: phase.defaultDurationDays ?? undefined,
          isTransformation: phase.isTransformation,
          isDestructive: phase.isDestructive,
          requiresZoneChange: phase.requiresZoneChange,
          canSkip: phase.canSkip,
          canBeEntryPoint: phase.canBeEntryPoint,
          canBeExitPoint: phase.canBeExitPoint,
          icon: phase.icon ?? "",
          color: phase.color ?? "",
        }
      : {
          cropTypeId,
          code: "",
          name: "",
          isTransformation: false,
          isDestructive: false,
          requiresZoneChange: false,
          canSkip: false,
          canBeEntryPoint: false,
          canBeExitPoint: false,
          icon: "",
          color: "",
        },
  });

  // Reset form when phase changes
  // We can't use useEffect due to ESLint rule, so we key the component from parent

  async function onSubmit(data: CreatePhaseData) {
    if (isEditing && phase) {
      const result = await updatePhase({ ...data, id: phase.id });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Fase actualizada");
    } else {
      const result = await createPhase(data);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Fase creada");
    }
    reset();
    onSuccess();
  }

  const toggleFields = [
    { name: "isTransformation" as const, label: "Transformacion" },
    { name: "isDestructive" as const, label: "Destructiva" },
    { name: "requiresZoneChange" as const, label: "Requiere cambio de zona" },
    { name: "canSkip" as const, label: "Se puede omitir" },
    { name: "canBeEntryPoint" as const, label: "Punto de entrada" },
    { name: "canBeExitPoint" as const, label: "Punto de salida" },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? "Editar fase" : "Nueva fase"}
      footer={
        <Button
          type="submit"
          form="phase-form"
          loading={isSubmitting}
          className="w-full"
        >
          {isEditing ? "Guardar cambios" : "Crear fase"}
        </Button>
      }
    >
      <form
        id="phase-form"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <input type="hidden" {...register("cropTypeId")} />

        <Input
          label="Codigo"
          placeholder="floracion"
          error={errors.code?.message}
          {...register("code")}
        />
        <Input
          label="Nombre"
          placeholder="Floracion"
          error={errors.name?.message}
          {...register("name")}
        />
        <Input
          label="Duracion por defecto (dias)"
          type="number"
          placeholder="63"
          error={errors.defaultDurationDays?.message}
          {...register("defaultDurationDays", { valueAsNumber: true, setValueAs: (v) => (v === "" || isNaN(Number(v)) ? undefined : Number(v)) })}
        />

        <div className="flex flex-col gap-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
            Propiedades
          </span>
          {toggleFields.map((field) => (
            <Toggle
              key={field.name}
              label={field.label}
              checked={watch(field.name)}
              onChange={(checked) => setValue(field.name, checked)}
            />
          ))}
        </div>
      </form>
    </Dialog>
  );
}
