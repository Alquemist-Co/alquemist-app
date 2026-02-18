"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Map } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "@/lib/utils/toast-store";
import { cn } from "@/lib/utils/cn";
import { zoneSchema, type ZoneFormData } from "@/lib/schemas/zone";
import {
  createZone,
  updateZone,
  updateZoneStatus,
  type ZoneListItem,
} from "@/lib/actions/zones-crud";
import type { FacilityListItem } from "@/lib/actions/facilities";

const PURPOSES = [
  { value: "propagation", label: "Propagacion" },
  { value: "vegetation", label: "Vegetacion" },
  { value: "flowering", label: "Floracion" },
  { value: "drying", label: "Secado" },
  { value: "processing", label: "Procesamiento" },
  { value: "storage", label: "Almacenamiento" },
  { value: "multipurpose", label: "Multiproposito" },
] as const;

const ENVIRONMENTS = [
  { value: "indoor_controlled", label: "Indoor controlado" },
  { value: "greenhouse", label: "Invernadero" },
  { value: "tunnel", label: "Tunel" },
  { value: "open_field", label: "Campo abierto" },
] as const;

const purposeLabel: Record<string, string> = Object.fromEntries(
  PURPOSES.map((p) => [p.value, p.label]),
);

const statusColors: Record<string, string> = {
  active: "success",
  maintenance: "warning",
  inactive: "error",
};
const statusLabels: Record<string, string> = {
  active: "Activa",
  maintenance: "Mantenimiento",
  inactive: "Inactiva",
};

const selectClasses = cn(
  "h-12 w-full rounded-input border bg-surface-card px-3",
  "font-sans text-sm text-text-primary",
  "transition-colors duration-150",
  "focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand-light/25",
  "appearance-none",
);

type Props = {
  initialData: ZoneListItem[];
  facilities: FacilityListItem[];
};

export function ZoneList({ initialData, facilities }: Props) {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterFacility, setFilterFacility] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  let filtered = initialData;
  if (filterFacility)
    filtered = filtered.filter((z) => z.facilityId === filterFacility);
  if (filterStatus)
    filtered = filtered.filter((z) => z.status === filterStatus);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ZoneFormData>({
    resolver: zodResolver(zoneSchema),
  });

  const openCreate = useCallback(() => {
    setEditingId(null);
    reset({
      facilityId: facilities[0]?.id ?? "",
      name: "",
      purpose: "vegetation",
      environment: "indoor_controlled",
      areaM2: 0,
    });
    setShowDialog(true);
  }, [reset, facilities]);

  const openEdit = useCallback(
    (z: ZoneListItem) => {
      setEditingId(z.id);
      reset({
        facilityId: z.facilityId,
        name: z.name,
        purpose: z.purpose as ZoneFormData["purpose"],
        environment: z.environment as ZoneFormData["environment"],
        areaM2: Number(z.areaM2),
        plantCapacity: z.plantCapacity || undefined,
      });
      setShowDialog(true);
    },
    [reset],
  );

  const handleClose = useCallback(() => {
    setShowDialog(false);
    setEditingId(null);
  }, []);

  async function onSubmit(data: ZoneFormData) {
    const result = editingId
      ? await updateZone({ ...data, id: editingId })
      : await createZone(data);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(editingId ? "Zona actualizada" : "Zona creada");
    handleClose();
    router.refresh();
  }

  async function handleStatusChange(z: ZoneListItem, status: string) {
    const result = await updateZoneStatus(
      z.id,
      status as "active" | "maintenance" | "inactive",
    );
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Status actualizado");
    router.refresh();
  }

  const numRegister = (name: "areaM2" | "heightM" | "plantCapacity") =>
    register(name, {
      setValueAs: (v: string) =>
        v === "" || isNaN(Number(v)) ? undefined : Number(v),
    });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Zonas</h1>
        <Button variant="primary" onClick={openCreate}>
          <Plus className="size-4" />
          Nueva
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          className={cn(selectClasses, "max-w-[200px]")}
          value={filterFacility}
          onChange={(e) => setFilterFacility(e.target.value)}
        >
          <option value="">Todas las facilities</option>
          {facilities.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <select
          className={cn(selectClasses, "max-w-[180px]")}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="active">Activa</option>
          <option value="maintenance">Mantenimiento</option>
          <option value="inactive">Inactiva</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Map}
          title="Sin zonas"
          description="Crea la primera zona para comenzar"
          action={{ label: "Nueva zona", onClick: openCreate }}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((z) => (
            <Card
              key={z.id}
              className={cn(
                "flex items-center gap-4 p-4",
                z.status === "inactive" && "opacity-50",
              )}
            >
              <div
                className="flex flex-1 cursor-pointer flex-col gap-1"
                onClick={() => openEdit(z)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-text-primary">
                    {z.name}
                  </span>
                  <Badge variant="outlined">
                    {purposeLabel[z.purpose] ?? z.purpose}
                  </Badge>
                  <Badge
                    variant={
                      statusColors[z.status] as "success" | "warning" | "error"
                    }
                  >
                    {statusLabels[z.status]}
                  </Badge>
                </div>
                <span className="text-xs text-text-secondary">
                  {z.facilityName}
                </span>
                <div className="flex gap-4 text-xs text-text-secondary">
                  <span>{Number(z.areaM2).toLocaleString()} m²</span>
                  <span>{z.plantCapacity} plantas</span>
                  <span>{z.batchCount} batches</span>
                  <span>{z.structureCount} estructuras</span>
                </div>
              </div>
              <select
                className="rounded border border-border bg-surface-card px-2 py-1 text-xs"
                value={z.status}
                onChange={(e) => handleStatusChange(z, e.target.value)}
              >
                <option value="active">Activa</option>
                <option value="maintenance">Mantenimiento</option>
                <option value="inactive">Inactiva</option>
              </select>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={showDialog}
        onClose={handleClose}
        title={editingId ? "Editar zona" : "Nueva zona"}
        footer={
          <Button
            type="submit"
            form="zone-form"
            loading={isSubmitting}
            className="w-full"
          >
            {editingId ? "Guardar cambios" : "Crear zona"}
          </Button>
        }
      >
        <form
          id="zone-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              Facility
            </label>
            <select
              className={cn(
                selectClasses,
                errors.facilityId ? "border-error" : "border-border",
              )}
              {...register("facilityId")}
            >
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Nombre"
            placeholder="Zona A-1"
            error={errors.name?.message}
            {...register("name")}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Proposito
              </label>
              <select className={selectClasses} {...register("purpose")}>
                {PURPOSES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Ambiente
              </label>
              <select className={selectClasses} {...register("environment")}>
                {ENVIRONMENTS.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Area (m²)"
              type="number"
              placeholder="50"
              error={errors.areaM2?.message}
              {...numRegister("areaM2")}
            />
            <Input
              label="Capacidad plantas"
              type="number"
              placeholder="200"
              error={errors.plantCapacity?.message}
              {...numRegister("plantCapacity")}
            />
          </div>
          <Input
            label="Altura (m)"
            type="number"
            step="any"
            placeholder="3.5"
            error={errors.heightM?.message}
            {...numRegister("heightM")}
          />
        </form>
      </Dialog>
    </div>
  );
}
