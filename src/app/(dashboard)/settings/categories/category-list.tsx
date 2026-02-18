"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, FolderTree } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "@/lib/utils/toast-store";
import { cn } from "@/lib/utils/cn";
import {
  categorySchema,
  type CategoryFormData,
} from "@/lib/schemas/resource-category";
import {
  createCategory,
  updateCategory,
  toggleCategoryActive,
  type CategoryListItem,
} from "@/lib/actions/resource-categories";

const LOT_LABELS: Record<string, string> = {
  required: "Requerido",
  optional: "Opcional",
  none: "Ninguno",
};

const selectClasses = cn(
  "h-12 w-full rounded-input border bg-surface-card px-3",
  "font-sans text-sm text-text-primary",
  "transition-colors duration-150",
  "focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand-light/25",
  "appearance-none",
);

type Props = { initialData: CategoryListItem[] };

export function CategoryList({ initialData }: Props) {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const hasInactive = initialData.some((c) => !c.isActive);
  const filtered = showInactive
    ? initialData
    : initialData.filter((c) => c.isActive);

  // Build tree: roots first, then children grouped under parents
  const tree = useMemo(() => {
    const roots = filtered.filter((c) => !c.parentId);
    const childMap = new Map<string, CategoryListItem[]>();
    for (const c of filtered) {
      if (c.parentId) {
        if (!childMap.has(c.parentId)) childMap.set(c.parentId, []);
        childMap.get(c.parentId)!.push(c);
      }
    }
    const result: { item: CategoryListItem; depth: number }[] = [];
    function addChildren(parentId: string, depth: number) {
      for (const child of childMap.get(parentId) ?? []) {
        result.push({ item: child, depth });
        addChildren(child.id, depth + 1);
      }
    }
    for (const root of roots) {
      result.push({ item: root, depth: 0 });
      addChildren(root.id, 1);
    }
    return result;
  }, [filtered]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      isConsumable: false,
      isDepreciable: false,
      isTransformable: false,
      defaultLotTracking: "none",
    },
  });

  // Only show root + first-level categories as parent options (max 3 levels)
  const parentOptions = initialData.filter(
    (c) => c.isActive && !c.parentId || (c.parentId && !initialData.find((p) => p.id === c.parentId)?.parentId),
  ).filter((c) => c.id !== editingId);

  const openCreate = useCallback(() => {
    setEditingId(null);
    reset({
      name: "",
      code: "",
      parentId: "",
      icon: "",
      color: "",
      isConsumable: false,
      isDepreciable: false,
      isTransformable: false,
      defaultLotTracking: "none",
    });
    setShowDialog(true);
  }, [reset]);

  const openEdit = useCallback(
    (c: CategoryListItem) => {
      setEditingId(c.id);
      reset({
        name: c.name,
        code: c.code,
        parentId: c.parentId ?? "",
        icon: c.icon ?? "",
        color: c.color ?? "",
        isConsumable: c.isConsumable,
        isDepreciable: c.isDepreciable,
        isTransformable: c.isTransformable,
        defaultLotTracking: c.defaultLotTracking as CategoryFormData["defaultLotTracking"],
      });
      setShowDialog(true);
    },
    [reset],
  );

  const handleClose = useCallback(() => {
    setShowDialog(false);
    setEditingId(null);
  }, []);

  async function onSubmit(data: CategoryFormData) {
    const result = editingId
      ? await updateCategory({ ...data, id: editingId })
      : await createCategory(data);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(editingId ? "Categoria actualizada" : "Categoria creada");
    handleClose();
    router.refresh();
  }

  async function handleToggle(c: CategoryListItem) {
    const result = await toggleCategoryActive(c.id, !c.isActive);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(c.isActive ? "Categoria desactivada" : "Categoria reactivada");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">
          Categorias de recursos
        </h1>
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

      {tree.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="Sin categorias"
          description="Crea la primera categoria de recursos"
          action={{ label: "Nueva categoria", onClick: openCreate }}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {tree.map(({ item: c, depth }) => (
            <Card
              key={c.id}
              className={cn(
                "flex items-center gap-4 p-4",
                !c.isActive && "opacity-50",
              )}
              style={{ marginLeft: depth * 24 }}
            >
              <div
                className="flex flex-1 cursor-pointer flex-col gap-1"
                onClick={() => openEdit(c)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-text-primary">
                    {c.name}
                  </span>
                  <span className="font-mono text-xs text-text-secondary">
                    {c.code}
                  </span>
                  {!c.isActive && <Badge variant="warning">Inactiva</Badge>}
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-text-secondary">
                  {c.isConsumable && <Badge variant="info">Consumible</Badge>}
                  {c.isTransformable && (
                    <Badge variant="info">Transformable</Badge>
                  )}
                  {c.isDepreciable && (
                    <Badge variant="outlined">Depreciable</Badge>
                  )}
                  <span>Lote: {LOT_LABELS[c.defaultLotTracking]}</span>
                  <span>{c.productCount} productos</span>
                  {c.childCount > 0 && (
                    <span>{c.childCount} subcategorias</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleToggle(c)}
                className="shrink-0 text-xs text-text-secondary hover:text-text-primary"
              >
                {c.isActive ? "Desactivar" : "Reactivar"}
              </button>
              <Pencil
                className="size-4 shrink-0 cursor-pointer text-text-secondary"
                onClick={() => openEdit(c)}
              />
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={showDialog}
        onClose={handleClose}
        title={editingId ? "Editar categoria" : "Nueva categoria"}
        footer={
          <Button
            type="submit"
            form="category-form"
            loading={isSubmitting}
            className="w-full"
          >
            {editingId ? "Guardar cambios" : "Crear categoria"}
          </Button>
        }
      >
        <form
          id="category-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nombre"
              placeholder="Fertilizantes"
              error={errors.name?.message}
              {...register("name")}
            />
            <Input
              label="Codigo"
              placeholder="FERT"
              error={errors.code?.message}
              {...register("code")}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              Categoria padre
            </label>
            <select className={selectClasses} {...register("parentId")}>
              <option value="">— Raiz —</option>
              {parentOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.parentName ? `${p.parentName} > ` : ""}{p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              Seguimiento de lote
            </label>
            <select className={selectClasses} {...register("defaultLotTracking")}>
              <option value="none">Ninguno</option>
              <option value="optional">Opcional</option>
              <option value="required">Requerido</option>
            </select>
          </div>
          <div className="flex flex-col gap-3">
            <Toggle
              label="Consumible"
              checked={watch("isConsumable")}
              onChange={(v) => setValue("isConsumable", v)}
            />
            <Toggle
              label="Transformable"
              checked={watch("isTransformable")}
              onChange={(v) => setValue("isTransformable", v)}
            />
            <Toggle
              label="Depreciable"
              checked={watch("isDepreciable")}
              onChange={(v) => setValue("isDepreciable", v)}
            />
          </div>
        </form>
      </Dialog>
    </div>
  );
}
