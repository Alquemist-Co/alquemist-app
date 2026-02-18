"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "@/lib/utils/toast-store";
import { cn } from "@/lib/utils/cn";
import {
  facilitySchema,
  type FacilityFormData,
} from "@/lib/schemas/facility";
import {
  createFacility,
  updateFacility,
  toggleFacilityActive,
  type FacilityListItem,
} from "@/lib/actions/facilities";

const TYPES = [
  { value: "indoor_warehouse", label: "Bodega indoor" },
  { value: "greenhouse", label: "Invernadero" },
  { value: "tunnel", label: "Tunel" },
  { value: "open_field", label: "Campo abierto" },
  { value: "vertical_farm", label: "Granja vertical" },
] as const;

const typeLabel: Record<string, string> = Object.fromEntries(
  TYPES.map((t) => [t.value, t.label]),
);

const selectClasses = cn(
  "h-12 w-full rounded-input border bg-surface-card px-3",
  "font-sans text-sm text-text-primary",
  "transition-colors duration-150",
  "focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand-light/25",
  "appearance-none",
);

type Props = { initialData: FacilityListItem[] };

export function FacilityList({ initialData }: Props) {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const hasInactive = initialData.some((f) => !f.isActive);
  const filtered = showInactive
    ? initialData
    : initialData.filter((f) => f.isActive);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FacilityFormData>({
    resolver: zodResolver(facilitySchema),
    defaultValues: {
      name: "",
      type: "greenhouse",
      totalFootprintM2: 0,
      address: "",
    },
  });

  const openCreate = useCallback(() => {
    setEditingId(null);
    reset({
      name: "",
      type: "greenhouse",
      totalFootprintM2: 0,
      address: "",
    });
    setShowDialog(true);
  }, [reset]);

  const openEdit = useCallback(
    (f: FacilityListItem) => {
      setEditingId(f.id);
      reset({
        name: f.name,
        type: f.type as FacilityFormData["type"],
        totalFootprintM2: Number(f.totalFootprintM2),
        address: f.address,
        latitude: f.latitude ? Number(f.latitude) : undefined,
        longitude: f.longitude ? Number(f.longitude) : undefined,
      });
      setShowDialog(true);
    },
    [reset],
  );

  const handleClose = useCallback(() => {
    setShowDialog(false);
    setEditingId(null);
  }, []);

  async function onSubmit(data: FacilityFormData) {
    const result = editingId
      ? await updateFacility({ ...data, id: editingId })
      : await createFacility(data);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(editingId ? "Facility actualizada" : "Facility creada");
    handleClose();
    router.refresh();
  }

  async function handleToggle(f: FacilityListItem) {
    const result = await toggleFacilityActive(f.id, !f.isActive);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(f.isActive ? "Facility desactivada" : "Facility reactivada");
    router.refresh();
  }

  const numRegister = (name: "totalFootprintM2" | "latitude" | "longitude") =>
    register(name, {
      setValueAs: (v: string) =>
        v === "" || isNaN(Number(v)) ? undefined : Number(v),
    });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Facilities</h1>
        <div className="flex items-center gap-3">
          {hasInactive && (
            <label className="flex items-center gap-2 text-xs text-text-secondary">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              Inactivas
            </label>
          )}
          <Button variant="primary" onClick={openCreate}>
            <Plus className="size-4" />
            Nueva
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Sin facilities"
          description="Crea la primera facility para comenzar"
          action={{ label: "Nueva facility", onClick: openCreate }}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((f) => (
            <Card
              key={f.id}
              className={cn(
                "flex items-center gap-4 p-4",
                !f.isActive && "opacity-50",
              )}
            >
              <div
                className="flex flex-1 cursor-pointer flex-col gap-1"
                onClick={() => openEdit(f)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-text-primary">
                    {f.name}
                  </span>
                  <Badge variant="outlined">{typeLabel[f.type] ?? f.type}</Badge>
                  {!f.isActive && <Badge variant="warning">Inactiva</Badge>}
                </div>
                <span className="text-xs text-text-secondary">{f.address}</span>
                <div className="flex gap-4 text-xs text-text-secondary">
                  <span>{Number(f.totalFootprintM2).toLocaleString()} m²</span>
                  <span>{f.zoneCount} zonas</span>
                  <span>{f.userCount} usuarios</span>
                </div>
              </div>
              <button
                onClick={() => handleToggle(f)}
                className="shrink-0 text-xs text-text-secondary hover:text-text-primary"
              >
                {f.isActive ? "Desactivar" : "Reactivar"}
              </button>
              <Pencil
                className="size-4 shrink-0 cursor-pointer text-text-secondary"
                onClick={() => openEdit(f)}
              />
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={showDialog}
        onClose={handleClose}
        title={editingId ? "Editar facility" : "Nueva facility"}
        footer={
          <Button
            type="submit"
            form="facility-form"
            loading={isSubmitting}
            className="w-full"
          >
            {editingId ? "Guardar cambios" : "Crear facility"}
          </Button>
        }
      >
        <form
          id="facility-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <Input
            label="Nombre"
            placeholder="Invernadero Principal"
            error={errors.name?.message}
            {...register("name")}
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              Tipo
            </label>
            <select
              className={cn(
                selectClasses,
                errors.type ? "border-error" : "border-border",
              )}
              {...register("type")}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Area total (m²)"
            type="number"
            placeholder="500"
            error={errors.totalFootprintM2?.message}
            {...numRegister("totalFootprintM2")}
          />
          <Input
            label="Direccion"
            placeholder="Calle 1 #2-3, Ciudad"
            error={errors.address?.message}
            {...register("address")}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Latitud"
              type="number"
              step="any"
              placeholder="4.6097"
              error={errors.latitude?.message}
              {...numRegister("latitude")}
            />
            <Input
              label="Longitud"
              type="number"
              step="any"
              placeholder="-74.0817"
              error={errors.longitude?.message}
              {...numRegister("longitude")}
            />
          </div>
        </form>
      </Dialog>
    </div>
  );
}
