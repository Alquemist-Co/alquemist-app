"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { toast } from "@/lib/utils/toast-store";
import {
  createSensorSchema,
  type CreateSensorData,
} from "@/lib/schemas/sensor";
import {
  createSensor,
  updateSensor,
  type SensorListItem,
  type SensorFormData,
} from "@/lib/actions/sensors";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  formData: SensorFormData;
  sensor: SensorListItem | null;
};

const SENSOR_TYPES = [
  { value: "temperature", label: "Temperatura" },
  { value: "humidity", label: "Humedad" },
  { value: "co2", label: "CO2" },
  { value: "light", label: "Luz" },
  { value: "ec", label: "EC" },
  { value: "ph", label: "pH" },
  { value: "soil_moisture", label: "Humedad suelo" },
  { value: "vpd", label: "VPD" },
] as const;

export function SensorDialog({ open, onClose, onSaved, formData, sensor }: Props) {
  const isEditing = !!sensor;
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateSensorData>({
    resolver: zodResolver(createSensorSchema),
    defaultValues: sensor
      ? {
          zoneId: sensor.zoneId,
          type: sensor.type as CreateSensorData["type"],
          brandModel: sensor.brandModel ?? "",
          serialNumber: sensor.serialNumber ?? "",
          calibrationDate: sensor.calibrationDate ?? "",
          isActive: sensor.isActive,
        }
      : {
          zoneId: "",
          type: "temperature",
          brandModel: "",
          serialNumber: "",
          calibrationDate: "",
          isActive: true,
        },
  });

  // Reset form when sensor changes
  const sensorId = sensor?.id;
  const [prevId, setPrevId] = useState<string | undefined>(sensorId);
  if (sensorId !== prevId) {
    setPrevId(sensorId);
    if (sensor) {
      reset({
        zoneId: sensor.zoneId,
        type: sensor.type as CreateSensorData["type"],
        brandModel: sensor.brandModel ?? "",
        serialNumber: sensor.serialNumber ?? "",
        calibrationDate: sensor.calibrationDate ?? "",
        isActive: sensor.isActive,
      });
    } else {
      reset({
        zoneId: "",
        type: "temperature",
        brandModel: "",
        serialNumber: "",
        calibrationDate: "",
        isActive: true,
      });
    }
  }

  const selectedFacilityZones = useMemo(() => {
    const zoneId = watch("zoneId");
    if (!zoneId) return null;
    for (const f of formData.facilities) {
      if (f.zones.some((z) => z.id === zoneId)) return f;
    }
    return null;
  }, [formData.facilities, watch]);

  const onSubmit = async (data: CreateSensorData) => {
    setSubmitting(true);

    const result = isEditing
      ? await updateSensor({ ...data, id: sensor!.id })
      : await createSensor(data);

    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(isEditing ? "Sensor actualizado" : "Sensor registrado");
    onSaved();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? "Editar Sensor" : "Registrar Sensor"}
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
            onClick={handleSubmit(onSubmit)}
            disabled={submitting}
            className="flex-1"
          >
            {submitting
              ? "Guardando..."
              : isEditing
                ? "Actualizar"
                : "Registrar"}
          </Button>
        </div>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        {/* Zona */}
        <div>
          <label className="mb-1 block text-xs font-bold text-text-secondary">
            Zona *
          </label>
          <select
            {...register("zoneId")}
            className="h-10 w-full rounded-input border border-border bg-surface-card px-3 text-sm text-text-primary"
          >
            <option value="">Seleccionar zona</option>
            {formData.facilities.map((f) => (
              <optgroup key={f.id} label={f.name}>
                {f.zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {errors.zoneId && (
            <p className="mt-1 text-xs text-error">{errors.zoneId.message}</p>
          )}
        </div>

        {/* Tipo */}
        <div>
          <label className="mb-1 block text-xs font-bold text-text-secondary">
            Tipo de sensor *
          </label>
          <select
            {...register("type")}
            className="h-10 w-full rounded-input border border-border bg-surface-card px-3 text-sm text-text-primary"
          >
            {SENSOR_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          {errors.type && (
            <p className="mt-1 text-xs text-error">{errors.type.message}</p>
          )}
        </div>

        {/* Marca/Modelo */}
        <Input
          label="Marca / Modelo"
          {...register("brandModel")}
          placeholder="Ej: Trolmaster HCS-1"
          error={errors.brandModel?.message}
        />

        {/* Serial */}
        <Input
          label="Numero de Serie *"
          {...register("serialNumber")}
          placeholder="Ej: TROL-FA-001"
          error={errors.serialNumber?.message}
        />

        {/* Fecha Calibracion */}
        <Input
          label="Fecha de Calibracion"
          type="date"
          {...register("calibrationDate")}
          error={errors.calibrationDate?.message}
        />

        {/* Activo */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-text-primary">Activo</label>
          <Toggle
            checked={watch("isActive")}
            onChange={(checked) => setValue("isActive", checked)}
          />
        </div>
      </form>
    </Dialog>
  );
}
