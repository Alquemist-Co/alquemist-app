"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Plus, Pencil, Sprout } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "@/lib/utils/toast-store";
import { cn } from "@/lib/utils/cn";
import {
  createCropTypeSchema,
  type CreateCropTypeData,
} from "@/lib/schemas/config";
import {
  createCropType,
  updateCropType,
  type CropTypeWithCounts,
} from "@/lib/actions/config";

type Props = {
  initialData: CropTypeWithCounts[];
};

const CATEGORIES = [
  { value: "annual", label: "Anual" },
  { value: "perennial", label: "Perenne" },
  { value: "biennial", label: "Bienal" },
] as const;

const categoryLabel: Record<string, string> = {
  annual: "Anual",
  perennial: "Perenne",
  biennial: "Bienal",
};

export function CropTypeList({ initialData }: Props) {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const filtered = showInactive
    ? initialData
    : initialData.filter((ct) => ct.isActive);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCropTypeData>({
    resolver: zodResolver(createCropTypeSchema),
    defaultValues: {
      code: "",
      name: "",
      category: "annual",
      scientificName: "",
      regulatoryFramework: "",
      icon: "",
    },
  });

  const openCreate = useCallback(() => {
    setEditingId(null);
    reset({
      code: "",
      name: "",
      category: "annual",
      scientificName: "",
      regulatoryFramework: "",
      icon: "",
    });
    setShowDialog(true);
  }, [reset]);

  const openEdit = useCallback(
    (ct: CropTypeWithCounts) => {
      setEditingId(ct.id);
      reset({
        code: ct.code,
        name: ct.name,
        category: ct.category as "annual" | "perennial" | "biennial",
        scientificName: ct.scientificName ?? "",
        regulatoryFramework: ct.regulatoryFramework ?? "",
        icon: ct.icon ?? "",
      });
      setShowDialog(true);
    },
    [reset]
  );

  const handleClose = useCallback(() => {
    setShowDialog(false);
    setEditingId(null);
  }, []);

  async function onSubmit(data: CreateCropTypeData) {
    if (editingId) {
      const result = await updateCropType({ ...data, id: editingId });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Tipo de cultivo actualizado");
    } else {
      const result = await createCropType(data);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Tipo de cultivo creado");
    }

    handleClose();
    router.refresh();
  }

  const selectClasses = cn(
    "h-12 w-full rounded-input border bg-surface-card px-3",
    "font-sans text-sm text-text-primary",
    "transition-colors duration-150",
    "focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand-light/25",
    "appearance-none"
  );

  const hasInactive = initialData.some((ct) => !ct.isActive);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-text-primary">
          Tipos de cultivo
        </h1>
        <Button icon={Plus} size="sm" onClick={openCreate}>
          Nuevo
        </Button>
      </div>

      {hasInactive && (
        <label className="mb-4 flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="accent-brand"
          />
          Mostrar inactivos
        </label>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={Sprout}
          title="Sin tipos de cultivo"
          description="Crea el primero para comenzar a configurar fases y cultivares."
          action={{ label: "Nuevo tipo de cultivo", onClick: openCreate }}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((ct) => (
            <Link
              key={ct.id}
              href={`/settings/crop-types/${ct.id}`}
            >
              <Card
                className={cn(
                  "flex items-center gap-4",
                  !ct.isActive && "opacity-50"
                )}
              >
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-text-primary">
                      {ct.name}
                    </span>
                    <Badge variant="outlined">
                      {categoryLabel[ct.category] ?? ct.category}
                    </Badge>
                    {!ct.isActive && (
                      <Badge variant="warning">Inactivo</Badge>
                    )}
                  </div>
                  <span className="font-mono text-xs text-text-secondary">
                    {ct.code}
                  </span>
                  <div className="flex gap-4 text-xs text-text-secondary">
                    <span>{ct.phaseCount} fases</span>
                    <span>{ct.cultivarCount} cultivares</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openEdit(ct);
                  }}
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-button",
                    "text-text-secondary hover:bg-surface hover:text-text-primary",
                    "transition-colors duration-150 cursor-pointer",
                  )}
                  aria-label={`Editar ${ct.name}`}
                >
                  <Pencil className="size-4" />
                </button>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog
        open={showDialog}
        onClose={handleClose}
        title={editingId ? "Editar tipo de cultivo" : "Nuevo tipo de cultivo"}
        footer={
          <Button
            type="submit"
            form="crop-type-form"
            loading={isSubmitting}
            className="w-full"
          >
            {editingId ? "Guardar cambios" : "Crear"}
          </Button>
        }
      >
        <form
          id="crop-type-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <Input
            label="Codigo"
            placeholder="cannabis-medicinal"
            error={errors.code?.message}
            {...register("code")}
          />
          <Input
            label="Nombre"
            placeholder="Cannabis Medicinal"
            error={errors.name?.message}
            {...register("name")}
          />
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="category"
              className="text-[11px] font-bold uppercase tracking-wider text-text-secondary"
            >
              Categoria
            </label>
            <select
              id="category"
              className={cn(
                selectClasses,
                errors.category ? "border-error" : "border-border"
              )}
              {...register("category")}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Nombre cientifico (opcional)"
            placeholder="Cannabis sativa L."
            error={errors.scientificName?.message}
            {...register("scientificName")}
          />
          <Input
            label="Marco regulatorio (opcional)"
            placeholder="Ley 1787/2016"
            error={errors.regulatoryFramework?.message}
            {...register("regulatoryFramework")}
          />
        </form>
      </Dialog>
    </>
  );
}
