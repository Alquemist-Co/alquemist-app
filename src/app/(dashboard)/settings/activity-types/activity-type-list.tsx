"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "@/lib/utils/toast-store";
import { cn } from "@/lib/utils/cn";
import {
  activityTypeSchema,
  type ActivityTypeFormData,
} from "@/lib/schemas/activity-type";
import {
  createActivityType,
  updateActivityType,
  toggleActivityTypeActive,
  type ActivityTypeListItem,
} from "@/lib/actions/activity-types";

type Props = { initialData: ActivityTypeListItem[] };

export function ActivityTypeList({ initialData }: Props) {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const hasInactive = initialData.some((t) => !t.isActive);
  const filtered = showInactive
    ? initialData
    : initialData.filter((t) => t.isActive);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ActivityTypeFormData>({
    resolver: zodResolver(activityTypeSchema),
  });

  const openCreate = useCallback(() => {
    setEditingId(null);
    reset({ name: "", category: "" });
    setShowDialog(true);
  }, [reset]);

  const openEdit = useCallback(
    (t: ActivityTypeListItem) => {
      setEditingId(t.id);
      reset({ name: t.name, category: t.category ?? "" });
      setShowDialog(true);
    },
    [reset],
  );

  const handleClose = useCallback(() => {
    setShowDialog(false);
    setEditingId(null);
  }, []);

  async function onSubmit(data: ActivityTypeFormData) {
    const result = editingId
      ? await updateActivityType({ ...data, id: editingId })
      : await createActivityType(data);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(editingId ? "Tipo actualizado" : "Tipo creado");
    handleClose();
    router.refresh();
  }

  async function handleToggle(t: ActivityTypeListItem) {
    const result = await toggleActivityTypeActive(t.id, !t.isActive);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(t.isActive ? "Tipo desactivado" : "Tipo reactivado");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">
          Tipos de actividad
        </h1>
        <div className="flex items-center gap-3">
          {hasInactive && (
            <label className="flex items-center gap-2 text-xs text-text-secondary">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              Inactivos
            </label>
          )}
          <Button variant="primary" onClick={openCreate}>
            <Plus className="size-4" />
            Nuevo
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="Sin tipos de actividad"
          description="Crea el primer tipo de actividad"
          action={{ label: "Nuevo tipo", onClick: openCreate }}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((t) => (
            <Card
              key={t.id}
              className={cn(
                "flex items-center gap-4 p-4",
                !t.isActive && "opacity-50",
              )}
            >
              <div
                className="flex flex-1 cursor-pointer flex-col gap-1"
                onClick={() => openEdit(t)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-text-primary">
                    {t.name}
                  </span>
                  {t.category && (
                    <Badge variant="outlined">{t.category}</Badge>
                  )}
                  {!t.isActive && <Badge variant="warning">Inactivo</Badge>}
                </div>
                <span className="text-xs text-text-secondary">
                  {t.templateCount} templates
                </span>
              </div>
              <button
                onClick={() => handleToggle(t)}
                className="shrink-0 text-xs text-text-secondary hover:text-text-primary"
              >
                {t.isActive ? "Desactivar" : "Reactivar"}
              </button>
              <Pencil
                className="size-4 shrink-0 cursor-pointer text-text-secondary"
                onClick={() => openEdit(t)}
              />
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={showDialog}
        onClose={handleClose}
        title={editingId ? "Editar tipo" : "Nuevo tipo de actividad"}
        footer={
          <Button
            type="submit"
            form="activity-type-form"
            loading={isSubmitting}
            className="w-full"
          >
            {editingId ? "Guardar cambios" : "Crear tipo"}
          </Button>
        }
      >
        <form
          id="activity-type-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <Input
            label="Nombre"
            placeholder="Riego"
            error={errors.name?.message}
            {...register("name")}
          />
          <Input
            label="Categoria (opcional)"
            placeholder="Nutricion"
            error={errors.category?.message}
            {...register("category")}
          />
        </form>
      </Dialog>
    </div>
  );
}
