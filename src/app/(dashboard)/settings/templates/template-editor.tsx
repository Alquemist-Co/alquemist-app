"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createTemplateSchema,
  type CreateTemplateData,
} from "@/lib/schemas/template";
import {
  createTemplate,
  updateTemplate,
  setTemplateResources,
  setTemplateChecklist,
  type TemplateDetail,
  type TemplateFormData,
} from "@/lib/actions/templates";
import { useAuthStore } from "@/stores/auth-store";
import { hasPermission } from "@/lib/auth/permissions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { toast } from "@/lib/utils/toast-store";
import { cn } from "@/lib/utils/cn";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  Camera,
  GripVertical,
} from "lucide-react";

type Props = {
  template?: TemplateDetail;
  formData: TemplateFormData;
};

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Diaria" },
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Bisemanal" },
  { value: "once", label: "Una vez" },
  { value: "on_demand", label: "Bajo demanda" },
];

const BASIS_OPTIONS = [
  { value: "fixed", label: "Fijo" },
  { value: "per_plant", label: "Por planta" },
  { value: "per_m2", label: "Por m2" },
  { value: "per_zone", label: "Por zona" },
  { value: "per_L_solution", label: "Por L solucion" },
];

type LocalResource = {
  key: string;
  productId: string;
  quantity: string;
  quantityBasis: string;
  isOptional: boolean;
  sortOrder: number;
  notes: string;
};

type LocalChecklist = {
  key: string;
  instruction: string;
  isCritical: boolean;
  requiresPhoto: boolean;
  expectedValue: string;
  tolerance: string;
  stepOrder: number;
};

export function TemplateEditor({ template, formData }: Props) {
  const router = useRouter();
  const role = useAuthStore((s) => s.role);
  const canManage = role ? hasPermission(role, "manage_templates") : false;
  const isEdit = !!template;

  // Form — use createTemplateSchema for both, add id manually for updates
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateTemplateData>({
    resolver: zodResolver(createTemplateSchema),
    defaultValues: isEdit
      ? {
          code: template.code,
          activityTypeId: template.activityTypeId,
          name: template.name,
          frequency: template.frequency as CreateTemplateData["frequency"],
          estimatedDurationMin: template.estimatedDurationMin,
          triggerDayFrom: template.triggerDayFrom ?? undefined,
          triggerDayTo: template.triggerDayTo ?? undefined,
          triggersPhaseChangeId: template.triggersPhaseChangeId ?? "",
          triggersTransformation: template.triggersTransformation,
          phaseIds: template.phases.map((p) => p.phaseId),
        }
      : {
          frequency: "on_demand" as const,
          estimatedDurationMin: 30,
          triggersTransformation: false,
          phaseIds: [],
        },
  });

  // Phase selection
  const [selectedPhaseIds, setSelectedPhaseIds] = useState<Set<string>>(
    new Set(template?.phases.map((p) => p.phaseId) ?? []),
  );

  // Resources
  const [resources, setResources] = useState<LocalResource[]>(
    template?.resources.map((r, i) => ({
      key: `r-${i}`,
      productId: r.productId,
      quantity: r.quantity,
      quantityBasis: r.quantityBasis,
      isOptional: r.isOptional,
      sortOrder: r.sortOrder,
      notes: r.notes ?? "",
    })) ?? [],
  );

  // Checklist
  const [checklist, setChecklist] = useState<LocalChecklist[]>(
    template?.checklist.map((c, i) => ({
      key: `c-${i}`,
      instruction: c.instruction,
      isCritical: c.isCritical,
      requiresPhoto: c.requiresPhoto,
      expectedValue: c.expectedValue ?? "",
      tolerance: c.tolerance ?? "",
      stepOrder: c.stepOrder,
    })) ?? [],
  );

  const togglePhase = useCallback((phaseId: string) => {
    setSelectedPhaseIds((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) {
        next.delete(phaseId);
      } else {
        next.add(phaseId);
      }
      return next;
    });
  }, []);

  // Resource helpers
  const addResource = useCallback(() => {
    setResources((prev) => [
      ...prev,
      {
        key: `r-${Date.now()}`,
        productId: "",
        quantity: "1",
        quantityBasis: "fixed",
        isOptional: false,
        sortOrder: prev.length + 1,
        notes: "",
      },
    ]);
  }, []);

  const removeResource = useCallback((key: string) => {
    setResources((prev) => prev.filter((r) => r.key !== key));
  }, []);

  const updateResource = useCallback(
    (key: string, field: keyof LocalResource, value: string | boolean) => {
      setResources((prev) =>
        prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)),
      );
    },
    [],
  );

  const moveResource = useCallback((index: number, direction: -1 | 1) => {
    setResources((prev) => {
      const arr = [...prev];
      const target = index + direction;
      if (target < 0 || target >= arr.length) return prev;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr.map((r, i) => ({ ...r, sortOrder: i + 1 }));
    });
  }, []);

  // Checklist helpers
  const addChecklistItem = useCallback(() => {
    setChecklist((prev) => [
      ...prev,
      {
        key: `c-${Date.now()}`,
        instruction: "",
        isCritical: false,
        requiresPhoto: false,
        expectedValue: "",
        tolerance: "",
        stepOrder: prev.length + 1,
      },
    ]);
  }, []);

  const removeChecklistItem = useCallback((key: string) => {
    setChecklist((prev) => prev.filter((c) => c.key !== key));
  }, []);

  const updateChecklistItem = useCallback(
    (key: string, field: keyof LocalChecklist, value: string | boolean) => {
      setChecklist((prev) =>
        prev.map((c) => (c.key === key ? { ...c, [field]: value } : c)),
      );
    },
    [],
  );

  const moveChecklist = useCallback((index: number, direction: -1 | 1) => {
    setChecklist((prev) => {
      const arr = [...prev];
      const target = index + direction;
      if (target < 0 || target >= arr.length) return prev;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr.map((c, i) => ({ ...c, stepOrder: i + 1 }));
    });
  }, []);

  // Submit
  const onSubmit = async (data: CreateTemplateData) => {
    const payload = { ...data, phaseIds: Array.from(selectedPhaseIds) };

    if (isEdit) {
      const result = await updateTemplate({ ...payload, id: template!.id });
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      // Save resources and checklist
      const [resResult, checkResult] = await Promise.all([
        setTemplateResources({
          templateId: template!.id,
          resources: resources
            .filter((r) => r.productId)
            .map((r, i) => ({
              productId: r.productId,
              quantity: Number(r.quantity),
              quantityBasis: r.quantityBasis as LocalResource["quantityBasis"],
              isOptional: r.isOptional,
              sortOrder: i + 1,
              notes: r.notes,
            })),
        }),
        setTemplateChecklist({
          templateId: template!.id,
          items: checklist
            .filter((c) => c.instruction.trim())
            .map((c, i) => ({
              instruction: c.instruction,
              isCritical: c.isCritical,
              requiresPhoto: c.requiresPhoto,
              expectedValue: c.expectedValue,
              tolerance: c.tolerance,
              stepOrder: i + 1,
            })),
        }),
      ]);

      if (!resResult.success) {
        toast.error(resResult.error);
        return;
      }
      if (!checkResult.success) {
        toast.error(checkResult.error);
        return;
      }

      toast.success("Template actualizado");
      router.refresh();
    } else {
      const result = await createTemplate(payload);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      // Save resources and checklist for new template
      const templateId = result.data.id;
      await Promise.all([
        resources.filter((r) => r.productId).length > 0
          ? setTemplateResources({
              templateId,
              resources: resources
                .filter((r) => r.productId)
                .map((r, i) => ({
                  productId: r.productId,
                  quantity: Number(r.quantity),
                  quantityBasis: r.quantityBasis as LocalResource["quantityBasis"],
                  isOptional: r.isOptional,
                  sortOrder: i + 1,
                  notes: r.notes,
                })),
            })
          : Promise.resolve(),
        checklist.filter((c) => c.instruction.trim()).length > 0
          ? setTemplateChecklist({
              templateId,
              items: checklist
                .filter((c) => c.instruction.trim())
                .map((c, i) => ({
                  instruction: c.instruction,
                  isCritical: c.isCritical,
                  requiresPhoto: c.requiresPhoto,
                  expectedValue: c.expectedValue,
                  tolerance: c.tolerance,
                  stepOrder: i + 1,
                })),
            })
          : Promise.resolve(),
      ]);

      toast.success("Template creado");
      router.push(`/settings/templates/${templateId}`);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-6 lg:py-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/settings/templates")}
          className="text-secondary hover:text-primary"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-primary">
          {isEdit ? `Editar: ${template.code}` : "Nuevo Template"}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Section 1: Basic data */}
        <section>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-tertiary">
            Datos base
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Codigo"
              {...register("code")}
              error={errors.code?.message}
              placeholder="FERT-VEG-S1"
              disabled={!canManage}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-primary">
                Tipo de actividad
              </label>
              <select
                {...register("activityTypeId")}
                className="h-10 w-full rounded-card border border-border bg-surface px-3 text-sm text-primary focus:border-brand focus:outline-none"
                disabled={!canManage}
              >
                <option value="">Seleccionar...</option>
                {formData.activityTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {errors.activityTypeId && (
                <p className="mt-1 text-xs text-error">
                  {errors.activityTypeId.message}
                </p>
              )}
            </div>
            <div className="sm:col-span-2">
              <Input
                label="Nombre"
                {...register("name")}
                error={errors.name?.message}
                placeholder="Fertirrigacion Vegetativa Semana 1-2"
                disabled={!canManage}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-primary">
                Frecuencia
              </label>
              <select
                {...register("frequency")}
                className="h-10 w-full rounded-card border border-border bg-surface px-3 text-sm text-primary focus:border-brand focus:outline-none"
                disabled={!canManage}
              >
                {FREQUENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Duracion estimada (min)"
              type="number"
              {...register("estimatedDurationMin", { valueAsNumber: true })}
              error={errors.estimatedDurationMin?.message}
              disabled={!canManage}
            />
            <Input
              label="Dia trigger desde"
              type="number"
              {...register("triggerDayFrom", { valueAsNumber: true, setValueAs: (v) => (v === "" || isNaN(Number(v)) ? undefined : Number(v)) })}
              placeholder="Opcional"
              disabled={!canManage}
            />
            <Input
              label="Dia trigger hasta"
              type="number"
              {...register("triggerDayTo", { valueAsNumber: true, setValueAs: (v) => (v === "" || isNaN(Number(v)) ? undefined : Number(v)) })}
              placeholder="Opcional"
              disabled={!canManage}
            />
          </div>
        </section>

        {/* Section 2: Advanced config */}
        <section>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-tertiary">
            Configuracion avanzada
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-primary">
                Dispara avance a fase
              </label>
              <select
                {...register("triggersPhaseChangeId")}
                className="h-10 w-full rounded-card border border-border bg-surface px-3 text-sm text-primary focus:border-brand focus:outline-none"
                disabled={!canManage}
              >
                <option value="">Ninguna</option>
                {formData.phases.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.cropTypeName} — {p.name}
                  </option>
                ))}
              </select>
            </div>
            <Toggle
              label="Dispara transformacion"
              checked={watch("triggersTransformation") ?? false}
              onChange={(checked) => setValue("triggersTransformation", checked)}
              disabled={!canManage}
            />
          </div>
        </section>

        {/* Section 3: Phase selection */}
        <section>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-tertiary">
            Fases aplicables
          </h2>
          {selectedPhaseIds.size === 0 && (
            <p className="mb-2 flex items-center gap-1.5 text-xs text-warning">
              <AlertTriangle className="h-3.5 w-3.5" />
              Sin fases. No sera ofrecido al programar actividades.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {formData.phases.map((phase) => {
              const isSelected = selectedPhaseIds.has(phase.id);
              return (
                <button
                  key={phase.id}
                  type="button"
                  onClick={() => canManage && togglePhase(phase.id)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    isSelected
                      ? "bg-brand text-white"
                      : "bg-surface-secondary text-secondary hover:text-primary",
                    !canManage && "cursor-default opacity-60",
                  )}
                >
                  {phase.name}
                  <span className="ml-1 opacity-60">({phase.cropTypeName})</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 4: Resources */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-tertiary">
              Recursos ({resources.length})
            </h2>
            {canManage && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={Plus}
                onClick={addResource}
              >
                Agregar
              </Button>
            )}
          </div>
          {resources.length === 0 ? (
            <p className="text-xs text-tertiary">
              Sin recursos definidos. Agrega productos necesarios.
            </p>
          ) : (
            <div className="space-y-2">
              {resources.map((r, index) => (
                <div
                  key={r.key}
                  className="flex items-start gap-2 rounded-lg border border-border bg-surface-card p-3"
                >
                  <div className="flex flex-col gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => moveResource(index, -1)}
                      disabled={index === 0 || !canManage}
                      className="text-tertiary hover:text-primary disabled:opacity-30"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveResource(index, 1)}
                      disabled={index === resources.length - 1 || !canManage}
                      className="text-tertiary hover:text-primary disabled:opacity-30"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid flex-1 gap-2 sm:grid-cols-4">
                    <select
                      value={r.productId}
                      onChange={(e) =>
                        updateResource(r.key, "productId", e.target.value)
                      }
                      className="h-9 w-full rounded-card border border-border bg-surface px-2 text-xs text-primary focus:border-brand focus:outline-none sm:col-span-2"
                      disabled={!canManage}
                    >
                      <option value="">Producto...</option>
                      {formData.products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.unitName})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={r.quantity}
                      onChange={(e) =>
                        updateResource(r.key, "quantity", e.target.value)
                      }
                      step="any"
                      min="0"
                      className="h-9 w-full rounded-card border border-border bg-surface px-2 text-xs text-primary focus:border-brand focus:outline-none"
                      placeholder="Cantidad"
                      disabled={!canManage}
                    />
                    <select
                      value={r.quantityBasis}
                      onChange={(e) =>
                        updateResource(r.key, "quantityBasis", e.target.value)
                      }
                      className="h-9 w-full rounded-card border border-border bg-surface px-2 text-xs text-primary focus:border-brand focus:outline-none"
                      disabled={!canManage}
                    >
                      {BASIS_OPTIONS.map((b) => (
                        <option key={b.value} value={b.value}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
                    <label className="flex items-center gap-1 text-xs text-tertiary">
                      <input
                        type="checkbox"
                        checked={r.isOptional}
                        onChange={(e) =>
                          updateResource(r.key, "isOptional", e.target.checked)
                        }
                        disabled={!canManage}
                        className="accent-brand"
                      />
                      Opc
                    </label>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => removeResource(r.key)}
                        className="ml-1 text-tertiary hover:text-error"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 5: Checklist */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-tertiary">
              Checklist ({checklist.length})
            </h2>
            {canManage && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={Plus}
                onClick={addChecklistItem}
              >
                Agregar
              </Button>
            )}
          </div>
          {checklist.length === 0 ? (
            <p className="text-xs text-tertiary">
              Sin items de checklist. Agrega pasos de verificacion.
            </p>
          ) : (
            <div className="space-y-2">
              {checklist.map((c, index) => (
                <div
                  key={c.key}
                  className={cn(
                    "flex items-start gap-2 rounded-lg border p-3",
                    c.isCritical
                      ? "border-error/30 bg-error/5"
                      : "border-border bg-surface-card",
                  )}
                >
                  <div className="flex flex-col gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => moveChecklist(index, -1)}
                      disabled={index === 0 || !canManage}
                      className="text-tertiary hover:text-primary disabled:opacity-30"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <GripVertical className="h-3.5 w-3.5 text-border" />
                    <button
                      type="button"
                      onClick={() => moveChecklist(index, 1)}
                      disabled={index === checklist.length - 1 || !canManage}
                      className="text-tertiary hover:text-primary disabled:opacity-30"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      value={c.instruction}
                      onChange={(e) =>
                        updateChecklistItem(
                          c.key,
                          "instruction",
                          e.target.value,
                        )
                      }
                      placeholder="Instruccion del paso..."
                      className="h-9 w-full rounded-card border border-border bg-surface px-2 text-xs text-primary placeholder:text-tertiary focus:border-brand focus:outline-none"
                      disabled={!canManage}
                    />
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs">
                        <input
                          type="checkbox"
                          checked={c.isCritical}
                          onChange={(e) =>
                            updateChecklistItem(
                              c.key,
                              "isCritical",
                              e.target.checked,
                            )
                          }
                          disabled={!canManage}
                          className="accent-error"
                        />
                        <span className="text-error">Critico</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-xs">
                        <input
                          type="checkbox"
                          checked={c.requiresPhoto}
                          onChange={(e) =>
                            updateChecklistItem(
                              c.key,
                              "requiresPhoto",
                              e.target.checked,
                            )
                          }
                          disabled={!canManage}
                          className="accent-brand"
                        />
                        <Camera className="h-3 w-3 text-secondary" />
                        <span className="text-secondary">Foto</span>
                      </label>
                      <input
                        value={c.expectedValue}
                        onChange={(e) =>
                          updateChecklistItem(
                            c.key,
                            "expectedValue",
                            e.target.value,
                          )
                        }
                        placeholder="Valor esperado"
                        className="h-7 w-24 rounded border border-border bg-surface px-2 text-xs text-primary placeholder:text-tertiary focus:border-brand focus:outline-none"
                        disabled={!canManage}
                      />
                      <input
                        value={c.tolerance}
                        onChange={(e) =>
                          updateChecklistItem(
                            c.key,
                            "tolerance",
                            e.target.value,
                          )
                        }
                        placeholder="Tolerancia"
                        className="h-7 w-24 rounded border border-border bg-surface px-2 text-xs text-primary placeholder:text-tertiary focus:border-brand focus:outline-none"
                        disabled={!canManage}
                      />
                    </div>
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => removeChecklistItem(c.key)}
                      className="mt-1 text-tertiary hover:text-error"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Submit */}
        {canManage && (
          <div className="flex gap-3 border-t border-border pt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/settings/templates")}
            >
              Cancelar
            </Button>
            <Button type="submit" icon={Save} loading={isSubmitting}>
              {isEdit ? "Guardar cambios" : "Crear template"}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
