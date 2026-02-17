"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/utils/toast-store";
import {
  createOverheadSchema,
  type CreateOverheadData,
  COST_TYPE_LABELS,
  ALLOCATION_LABELS,
} from "@/lib/schemas/overhead";
import {
  registerOverhead,
  updateOverhead,
  type OverheadListItem,
  type OverheadFormData,
} from "@/lib/actions/overhead";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  formData: OverheadFormData;
  cost: OverheadListItem | null;
};

export function CostDialog({ open, onClose, onSaved, formData, cost }: Props) {
  const isEditing = !!cost;
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateOverheadData>({
    resolver: zodResolver(createOverheadSchema),
    defaultValues: cost
      ? {
          facilityId: formData.facilities.find((f) =>
            f.name === cost.facilityName
          )?.id ?? "",
          zoneId: "",
          costType: cost.costType as CreateOverheadData["costType"],
          description: cost.description,
          amount: cost.amount,
          currency: cost.currency,
          periodStart: cost.periodStart,
          periodEnd: cost.periodEnd,
          allocationBasis: cost.allocationBasis as CreateOverheadData["allocationBasis"],
          notes: "",
        }
      : {
          facilityId: formData.facilities[0]?.id ?? "",
          zoneId: "",
          costType: "energy",
          description: "",
          amount: 0,
          currency: "USD",
          periodStart: "",
          periodEnd: "",
          allocationBasis: "even_split",
          notes: "",
        },
  });

  // Reset on cost change
  const costId = cost?.id;
  const [prevId, setPrevId] = useState<string | undefined>(costId);
  if (costId !== prevId) {
    setPrevId(costId);
    reset(
      cost
        ? {
            facilityId: formData.facilities.find((f) => f.name === cost.facilityName)?.id ?? "",
            zoneId: "",
            costType: cost.costType as CreateOverheadData["costType"],
            description: cost.description,
            amount: cost.amount,
            currency: cost.currency,
            periodStart: cost.periodStart,
            periodEnd: cost.periodEnd,
            allocationBasis: cost.allocationBasis as CreateOverheadData["allocationBasis"],
            notes: "",
          }
        : undefined,
    );
  }

  const selectedFacilityId = watch("facilityId");
  const selectedFacility = useMemo(
    () => formData.facilities.find((f) => f.id === selectedFacilityId),
    [formData.facilities, selectedFacilityId],
  );

  const onSubmit = async (data: CreateOverheadData) => {
    setSubmitting(true);

    const result = isEditing
      ? await updateOverhead({ ...data, id: cost!.id })
      : await registerOverhead(data);

    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(isEditing ? "Costo actualizado" : "Costo registrado");
    onSaved();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? "Editar Costo" : "Registrar Costo"}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} disabled={submitting} className="flex-1">
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit(onSubmit)} disabled={submitting} className="flex-1">
            {submitting ? "Guardando..." : isEditing ? "Actualizar" : "Registrar"}
          </Button>
        </div>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        {/* Facility */}
        <div>
          <label className="mb-1 block text-xs font-bold text-text-secondary">Facility *</label>
          <select
            {...register("facilityId")}
            className="h-10 w-full rounded-input border border-border bg-surface-card px-3 text-sm text-text-primary"
          >
            {formData.facilities.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          {errors.facilityId && <p className="mt-1 text-xs text-error">{errors.facilityId.message}</p>}
        </div>

        {/* Zone (optional) */}
        {selectedFacility && selectedFacility.zones.length > 0 && (
          <div>
            <label className="mb-1 block text-xs font-bold text-text-secondary">Zona (opcional)</label>
            <select
              {...register("zoneId")}
              className="h-10 w-full rounded-input border border-border bg-surface-card px-3 text-sm text-text-primary"
            >
              <option value="">Toda la facility</option>
              {selectedFacility.zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Cost type */}
        <div>
          <label className="mb-1 block text-xs font-bold text-text-secondary">Tipo *</label>
          <select
            {...register("costType")}
            className="h-10 w-full rounded-input border border-border bg-surface-card px-3 text-sm text-text-primary"
          >
            {Object.entries(COST_TYPE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <Input label="Descripcion *" {...register("description")} error={errors.description?.message} />

        {/* Amount */}
        <Input
          label="Monto *"
          type="number"
          step="0.01"
          {...register("amount", { valueAsNumber: true })}
          error={errors.amount?.message}
        />

        {/* Period */}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Periodo inicio *" type="date" {...register("periodStart")} error={errors.periodStart?.message} />
          <Input label="Periodo fin *" type="date" {...register("periodEnd")} error={errors.periodEnd?.message} />
        </div>

        {/* Allocation basis */}
        <div>
          <label className="mb-1 block text-xs font-bold text-text-secondary">Base de asignacion *</label>
          <select
            {...register("allocationBasis")}
            className="h-10 w-full rounded-input border border-border bg-surface-card px-3 text-sm text-text-primary"
          >
            {Object.entries(ALLOCATION_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
      </form>
    </Dialog>
  );
}
