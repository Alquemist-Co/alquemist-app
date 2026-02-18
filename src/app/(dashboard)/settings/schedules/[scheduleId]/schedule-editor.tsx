"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus, Trash2, Eye, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/lib/utils/toast-store";
import { cn } from "@/lib/utils/cn";
import {
  getPhasesByCultivar,
  getTemplatesForPhase,
  updateCultivationSchedule,
  type ScheduleDetail,
  type ScheduleWizardData,
  type ScheduleWizardPhase,
  type ScheduleWizardTemplate,
} from "@/lib/actions/cultivation-schedules";
import {
  FREQUENCY_LABELS,
  generatePreviewActivities,
  type PhaseConfigItem,
  type PhaseTemplate,
} from "@/lib/schemas/cultivation-schedule";

const selectClasses = cn(
  "h-10 w-full rounded-input border border-border bg-surface-card px-3",
  "font-sans text-xs text-text-primary",
  "focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand-light/25",
  "appearance-none",
);

type Props = {
  schedule: ScheduleDetail;
  wizardData: ScheduleWizardData;
};

type PhaseState = ScheduleWizardPhase & {
  durationDays: number;
  templates: (PhaseTemplate & { templateName: string })[];
};

export function ScheduleEditor({ schedule, wizardData }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Basic fields
  const [name, setName] = useState(schedule.name);
  const [totalDays, setTotalDays] = useState(schedule.totalDays);

  // Phases + templates
  const [phases, setPhases] = useState<PhaseState[]>([]);
  const [templateOptions, setTemplateOptions] = useState<
    Record<string, ScheduleWizardTemplate[]>
  >({});
  const [loadingTemplates, setLoadingTemplates] = useState<string | null>(null);
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);

  // Load phases on mount and merge with existing config
  const mountedRef = useRef(false);
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    getPhasesByCultivar(schedule.cultivarId).then((serverPhases) => {
      const configMap = new Map(
        schedule.phaseConfig.map((p) => [p.phaseId, p]),
      );

      const merged: PhaseState[] = serverPhases.map((sp) => {
        const existing = configMap.get(sp.id);
        return {
          ...sp,
          durationDays:
            existing?.durationDays ?? sp.defaultDurationDays ?? 14,
          templates: (existing?.templates ?? []).map((t) => ({
            ...t,
            templateName: "", // Will be resolved below
          })),
        };
      });

      // Resolve template names
      const allTemplateIds = merged.flatMap((p) =>
        p.templates.map((t) => t.templateId),
      );

      if (allTemplateIds.length > 0) {
        // Load templates for all phases to get names
        Promise.all(
          merged
            .filter((p) => p.templates.length > 0)
            .map((p) => getTemplatesForPhase(p.id)),
        ).then((results) => {
          const nameMap = new Map<string, string>();
          for (const templates of results) {
            for (const t of templates) nameMap.set(t.id, t.name);
          }
          setPhases((prev) =>
            prev.map((p) => ({
              ...p,
              templates: p.templates.map((t) => ({
                ...t,
                templateName: nameMap.get(t.templateId) ?? t.templateId,
              })),
            })),
          );
        });
      }

      setPhases(merged);
    });
  }, [schedule.cultivarId, schedule.phaseConfig]);

  const durationSum = phases.reduce((s, p) => s + p.durationDays, 0);

  const updatePhaseDuration = useCallback(
    (phaseId: string, days: number) => {
      setPhases((prev) =>
        prev.map((p) =>
          p.id === phaseId ? { ...p, durationDays: Math.max(1, days) } : p,
        ),
      );
    },
    [],
  );

  const loadTemplatesForPhaseCallback = useCallback(
    async (phaseId: string) => {
      if (templateOptions[phaseId]) return;
      setLoadingTemplates(phaseId);
      const templates = await getTemplatesForPhase(phaseId);
      setTemplateOptions((prev) => ({ ...prev, [phaseId]: templates }));
      setLoadingTemplates(null);
    },
    [templateOptions],
  );

  const addTemplate = useCallback(
    (phaseId: string, template: ScheduleWizardTemplate) => {
      setPhases((prev) =>
        prev.map((p) => {
          if (p.id !== phaseId) return p;
          if (p.templates.some((t) => t.templateId === template.id)) return p;
          return {
            ...p,
            templates: [
              ...p.templates,
              {
                templateId: template.id,
                startDay: 1,
                frequency: template.frequency as PhaseTemplate["frequency"],
                templateName: template.name,
              },
            ],
          };
        }),
      );
    },
    [],
  );

  const removeTemplate = useCallback(
    (phaseId: string, templateId: string) => {
      setPhases((prev) =>
        prev.map((p) =>
          p.id === phaseId
            ? {
                ...p,
                templates: p.templates.filter(
                  (t) => t.templateId !== templateId,
                ),
              }
            : p,
        ),
      );
    },
    [],
  );

  const updateTemplateField = useCallback(
    (
      phaseId: string,
      templateId: string,
      field: "startDay" | "frequency",
      value: number | string,
    ) => {
      setPhases((prev) =>
        prev.map((p) =>
          p.id === phaseId
            ? {
                ...p,
                templates: p.templates.map((t) =>
                  t.templateId === templateId ? { ...t, [field]: value } : t,
                ),
              }
            : p,
        ),
      );
    },
    [],
  );

  async function handleSubmit() {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const phaseConfig: PhaseConfigItem[] = phases.map((p) => ({
      phaseId: p.id,
      durationDays: p.durationDays,
      templates: p.templates.map((t) => ({
        templateId: t.templateId,
        startDay: t.startDay,
        frequency: t.frequency,
      })),
    }));

    const result = await updateCultivationSchedule({
      id: schedule.id,
      name: name.trim(),
      cultivarId: schedule.cultivarId,
      totalDays,
      phaseConfig,
    });

    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Plan de cultivo actualizado");
    router.refresh();
  }

  // Preview data
  const phaseNames = Object.fromEntries(phases.map((p) => [p.id, p.name]));
  const templateNames = Object.fromEntries(
    phases.flatMap((p) =>
      p.templates.map((t) => [t.templateId, t.templateName]),
    ),
  );
  const previewConfig: PhaseConfigItem[] = phases.map((p) => ({
    phaseId: p.id,
    durationDays: p.durationDays,
    templates: p.templates.map((t) => ({
      templateId: t.templateId,
      startDay: t.startDay,
      frequency: t.frequency,
    })),
  }));
  const previewActivities = showPreview
    ? generatePreviewActivities(previewConfig, phaseNames, templateNames)
    : [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Editar plan</h1>
          <p className="text-xs text-text-secondary">
            {schedule.cultivarName} ({schedule.cropTypeName})
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => setShowPreview(true)}
        >
          <Eye className="size-4" />
          Vista previa
        </Button>
      </div>

      {/* Basic data */}
      <Card className="mb-4 flex flex-col gap-4 p-5">
        <Input
          label="Nombre del plan"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Cultivar"
            value={`${schedule.cultivarName} (${schedule.cultivarCode})`}
            disabled
          />
          <Input
            label="Duracion total (dias)"
            type="number"
            min={1}
            value={totalDays || ""}
            onChange={(e) => setTotalDays(Number(e.target.value) || 0)}
          />
        </div>
        {durationSum !== totalDays && (
          <p className="text-xs text-warning">
            Suma de fases: {durationSum}d vs total: {totalDays}d.{" "}
            <button
              type="button"
              className="underline"
              onClick={() => setTotalDays(durationSum)}
            >
              Ajustar total
            </button>
          </p>
        )}
      </Card>

      {/* Phases */}
      <h2 className="mb-3 text-sm font-bold text-text-primary">
        Fases y templates
      </h2>

      <div className="flex flex-col gap-3">
        {phases.map((phase) => (
          <Card key={phase.id} className="overflow-hidden">
            <button
              type="button"
              className="flex w-full items-center justify-between p-4"
              onClick={() => {
                const isExpanded = expandedPhase === phase.id;
                setExpandedPhase(isExpanded ? null : phase.id);
                if (!isExpanded) loadTemplatesForPhaseCallback(phase.id);
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-text-primary">
                  {phase.name}
                </span>
                <input
                  type="number"
                  min={1}
                  value={phase.durationDays}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    e.stopPropagation();
                    updatePhaseDuration(
                      phase.id,
                      Number(e.target.value) || 1,
                    );
                  }}
                  className={cn(
                    "h-7 w-16 rounded border border-border bg-surface-card px-1 text-center",
                    "font-mono text-xs",
                    "focus:border-brand focus:outline-none",
                  )}
                />
                <span className="text-xs text-text-secondary">dias</span>
                {phase.templates.length > 0 && (
                  <Badge variant="success">
                    {phase.templates.length}
                  </Badge>
                )}
              </div>
              <ChevronRight
                className={cn(
                  "size-4 text-text-secondary transition-transform",
                  expandedPhase === phase.id && "rotate-90",
                )}
              />
            </button>

            {expandedPhase === phase.id && (
              <div className="border-t border-border px-4 pb-4 pt-3">
                {phase.templates.length > 0 && (
                  <div className="mb-3 flex flex-col gap-2">
                    {phase.templates.map((t) => (
                      <div
                        key={t.templateId}
                        className="flex items-center gap-2 rounded-lg bg-surface-raised p-2"
                      >
                        <span className="min-w-0 flex-1 truncate text-xs font-bold text-text-primary">
                          {t.templateName || t.templateId.slice(0, 8)}
                        </span>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 text-xs text-text-secondary">
                            Dia
                            <input
                              type="number"
                              min={1}
                              max={phase.durationDays}
                              value={t.startDay}
                              onChange={(e) =>
                                updateTemplateField(
                                  phase.id,
                                  t.templateId,
                                  "startDay",
                                  Math.max(1, Number(e.target.value) || 1),
                                )
                              }
                              className={cn(
                                "h-7 w-14 rounded border border-border bg-surface-card px-1 text-center",
                                "font-mono text-xs",
                                "focus:border-brand focus:outline-none",
                              )}
                            />
                          </label>
                          <select
                            value={t.frequency}
                            onChange={(e) =>
                              updateTemplateField(
                                phase.id,
                                t.templateId,
                                "frequency",
                                e.target.value,
                              )
                            }
                            className="h-7 rounded border border-border bg-surface-card px-1 text-xs"
                          >
                            {Object.entries(FREQUENCY_LABELS).map(
                              ([val, label]) => (
                                <option key={val} value={val}>
                                  {label}
                                </option>
                              ),
                            )}
                          </select>
                          <button
                            type="button"
                            onClick={() =>
                              removeTemplate(phase.id, t.templateId)
                            }
                            className="text-text-secondary hover:text-error"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {loadingTemplates === phase.id ? (
                  <p className="text-xs text-text-secondary">
                    Cargando templates...
                  </p>
                ) : (
                  <div>
                    <label className="mb-1 block text-xs text-text-secondary">
                      Agregar template
                    </label>
                    <select
                      value=""
                      onChange={(e) => {
                        const tpl = templateOptions[phase.id]?.find(
                          (t) => t.id === e.target.value,
                        );
                        if (tpl) addTemplate(phase.id, tpl);
                      }}
                      className={cn(selectClasses, "h-9 text-xs")}
                    >
                      <option value="">Seleccionar template...</option>
                      {(templateOptions[phase.id] ?? [])
                        .filter(
                          (t) =>
                            !phase.templates.some(
                              (pt) => pt.templateId === t.id,
                            ),
                        )
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({FREQUENCY_LABELS[t.frequency] ?? t.frequency})
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Save button */}
      <div className="mt-6 flex justify-end">
        <Button
          variant="primary"
          onClick={handleSubmit}
          loading={isSubmitting}
          disabled={name.trim().length < 2}
        >
          Guardar cambios
        </Button>
      </div>

      {/* Preview dialog */}
      <Dialog
        open={showPreview}
        onClose={() => setShowPreview(false)}
        title="Vista previa de actividades"
      >
        <div className="flex flex-col gap-3">
          {previewActivities.length === 0 ? (
            <p className="text-sm text-text-secondary">
              No se generarian actividades. Asigne templates a las fases.
            </p>
          ) : (
            <>
              <p className="text-xs text-text-secondary">
                Se generarian{" "}
                <span className="font-bold text-text-primary">
                  {previewActivities.length}
                </span>{" "}
                actividades en {totalDays} dias.
              </p>
              <div className="max-h-96 overflow-y-auto">
                {/* Group by phase */}
                {phases.map((phase) => {
                  const phaseActivities = previewActivities.filter(
                    (a) => a.phaseName === phase.name,
                  );
                  if (phaseActivities.length === 0) return null;
                  return (
                    <div key={phase.id} className="mb-4">
                      <div className="mb-2 flex items-center gap-2">
                        <Calendar className="size-3 text-brand" />
                        <span className="text-xs font-bold text-text-primary">
                          {phase.name}
                        </span>
                        <Badge variant="outlined">
                          {phaseActivities.length}
                        </Badge>
                      </div>
                      <div className="flex flex-col gap-1 pl-5">
                        {phaseActivities.map((a, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-xs"
                          >
                            <span className="w-10 shrink-0 text-right font-mono text-text-secondary">
                              D{a.day}
                            </span>
                            <span className="text-text-primary">
                              {a.templateName}
                            </span>
                            <Badge variant="outlined">
                              {FREQUENCY_LABELS[a.frequency] ?? a.frequency}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </Dialog>
    </div>
  );
}
