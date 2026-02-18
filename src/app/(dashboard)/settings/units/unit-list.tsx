"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Ruler } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// Badge unused but kept for future use

import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "@/lib/utils/toast-store";
import { cn } from "@/lib/utils/cn";
import { unitSchema, type UnitFormData } from "@/lib/schemas/unit";
import {
  createUnit,
  updateUnit,
  type UnitListItem,
} from "@/lib/actions/units";

const DIMENSIONS = [
  { value: "mass", label: "Masa" },
  { value: "volume", label: "Volumen" },
  { value: "count", label: "Conteo" },
  { value: "area", label: "Area" },
  { value: "energy", label: "Energia" },
  { value: "time", label: "Tiempo" },
  { value: "concentration", label: "Concentracion" },
] as const;

const dimensionLabel: Record<string, string> = Object.fromEntries(
  DIMENSIONS.map((d) => [d.value, d.label]),
);

const selectClasses = cn(
  "h-12 w-full rounded-input border bg-surface-card px-3",
  "font-sans text-sm text-text-primary",
  "transition-colors duration-150",
  "focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand-light/25",
  "appearance-none",
);

type Props = { initialData: UnitListItem[] };

export function UnitList({ initialData }: Props) {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterDim, setFilterDim] = useState("");

  const grouped = useMemo(() => {
    const groups = new Map<string, UnitListItem[]>();
    for (const u of initialData) {
      const dim = u.dimension;
      if (!groups.has(dim)) groups.set(dim, []);
      groups.get(dim)!.push(u);
    }
    return groups;
  }, [initialData]);

  const displayGroups = filterDim
    ? [[filterDim, grouped.get(filterDim) ?? []] as const]
    : Array.from(grouped.entries());

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UnitFormData>({
    resolver: zodResolver(unitSchema),
    defaultValues: { toBaseFactor: 1 },
  });

  const selectedDim = watch("dimension");
  const sameUnits = initialData.filter(
    (u) => u.dimension === selectedDim && u.id !== editingId,
  );

  const openCreate = useCallback(() => {
    setEditingId(null);
    reset({ code: "", name: "", dimension: "mass", baseUnitId: "", toBaseFactor: 1 });
    setShowDialog(true);
  }, [reset]);

  const openEdit = useCallback(
    (u: UnitListItem) => {
      setEditingId(u.id);
      reset({
        code: u.code,
        name: u.name,
        dimension: u.dimension as UnitFormData["dimension"],
        baseUnitId: u.baseUnitId ?? "",
        toBaseFactor: Number(u.toBaseFactor),
      });
      setShowDialog(true);
    },
    [reset],
  );

  const handleClose = useCallback(() => {
    setShowDialog(false);
    setEditingId(null);
  }, []);

  async function onSubmit(data: UnitFormData) {
    const result = editingId
      ? await updateUnit({ ...data, id: editingId })
      : await createUnit(data);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(editingId ? "Unidad actualizada" : "Unidad creada");
    handleClose();
    router.refresh();
  }

  const numRegister = (name: "toBaseFactor") =>
    register(name, {
      setValueAs: (v: string) =>
        v === "" || isNaN(Number(v)) ? undefined : Number(v),
    });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">
          Unidades de medida
        </h1>
        <Button variant="primary" onClick={openCreate}>
          <Plus className="size-4" />
          Nueva
        </Button>
      </div>

      <select
        className={cn(selectClasses, "mb-4 max-w-[200px]")}
        value={filterDim}
        onChange={(e) => setFilterDim(e.target.value)}
      >
        <option value="">Todas las dimensiones</option>
        {DIMENSIONS.map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </select>

      {initialData.length === 0 ? (
        <EmptyState
          icon={Ruler}
          title="Sin unidades"
          description="Crea la primera unidad de medida"
          action={{ label: "Nueva unidad", onClick: openCreate }}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {displayGroups.map(([dim, units]) => (
            <div key={dim}>
              <h2 className="mb-2 text-sm font-bold text-text-secondary">
                {dimensionLabel[dim] ?? dim}
              </h2>
              <div className="flex flex-col gap-2">
                {(units as UnitListItem[]).map((u) => (
                  <Card
                    key={u.id}
                    className="flex cursor-pointer items-center gap-4 p-3"
                    onClick={() => openEdit(u)}
                  >
                    <div className="flex flex-1 flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-text-primary">
                          {u.code}
                        </span>
                        <span className="text-sm text-text-secondary">
                          {u.name}
                        </span>
                      </div>
                      <div className="flex gap-3 text-xs text-text-secondary">
                        {u.baseUnitName && (
                          <span>
                            1 {u.code} = {u.toBaseFactor} {u.baseUnitName}
                          </span>
                        )}
                        <span>{u.productCount} productos</span>
                      </div>
                    </div>
                    <Pencil className="size-4 shrink-0 text-text-secondary" />
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={showDialog}
        onClose={handleClose}
        title={editingId ? "Editar unidad" : "Nueva unidad"}
        footer={
          <Button
            type="submit"
            form="unit-form"
            loading={isSubmitting}
            className="w-full"
          >
            {editingId ? "Guardar cambios" : "Crear unidad"}
          </Button>
        }
      >
        <form
          id="unit-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Codigo"
              placeholder="kg"
              error={errors.code?.message}
              {...register("code")}
            />
            <Input
              label="Nombre"
              placeholder="Kilogramo"
              error={errors.name?.message}
              {...register("name")}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              Dimension
            </label>
            <select
              className={cn(
                selectClasses,
                errors.dimension ? "border-error" : "border-border",
              )}
              {...register("dimension")}
            >
              {DIMENSIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              Unidad base (opcional)
            </label>
            <select
              className={selectClasses}
              {...register("baseUnitId")}
            >
              <option value="">— Ninguna (es unidad base) —</option>
              {sameUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.code} — {u.name}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Factor de conversion a base"
            type="number"
            step="any"
            placeholder="1000"
            error={errors.toBaseFactor?.message}
            {...numRegister("toBaseFactor")}
          />
        </form>
      </Dialog>
    </div>
  );
}
