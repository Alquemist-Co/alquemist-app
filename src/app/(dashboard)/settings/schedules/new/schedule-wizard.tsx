"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/utils/toast-store";
import { cn } from "@/lib/utils/cn";
import {
  getPhasesByCultivar,
  getTemplatesForPhase,
  createCultivationSchedule,
  type ScheduleWizardData,
  type ScheduleWizardPhase,
  type ScheduleWizardTemplate,
} from "@/lib/actions/cultivation-schedules";
import {
  FREQUENCY_LABELS,
  type PhaseConfigItem,
  type PhaseTemplate,
} from "@/lib/schemas/cultivation-schedule";

const selectClasses = cn(
  "h-10 w-full rounded-input border border-border bg-surface-card px-3",
  "font-sans text-xs text-text-primary",
  "focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand-light/25",
  "appearance-none",
);

type Props = { wizardData: ScheduleWizardData };

type PhaseState = ScheduleWizardPhase & {
  durationDays: number;
  templates: (PhaseTemplate & { templateName: string })[];
};

export function ScheduleWizard({ wizardData }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Basic data
  const [name, setName] = useState("");
  const [cultivarId, setCultivarId] = useState("");
  const [totalDays, setTotalDays] = useState(0);

  // Step 2: Phase durations
  const [phases, setPhases] = useState<PhaseState[]>([]);
  const [loadingPhases, setLoadingPhases] = useState(false);

  // Step 3: Template assignments
  const [templateOptions, setTemplateOptions] = useState<
    Record<string, ScheduleWizardTemplate[]>
  >({});
  const [loadingTemplates, setLoadingTemplates] = useState<string | null>(null);
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);

  // Load phases when cultivar changes
  const fetchedCultivarRef = useRef<string | null>(null);
  useEffect(() => {
    if (!cultivarId || fetchedCultivarRef.current === cultivarId) return;
    fetchedCultivarRef.current = cultivarId;
    setLoadingPhases(true);
    getPhasesByCultivar(cultivarId)
      .then((result) => {
        const phaseStates: PhaseState[] = result.map((p) => ({
          ...p,
          durationDays: p.defaultDurationDays ?? 14,
          templates: [],
        }));
        setPhases(phaseStates);
        const sum = phaseStates.reduce((s, p) => s + p.durationDays, 0);
        setTotalDays(sum);
      })
      .finally(() => setLoadingPhases(false));
  }, [cultivarId]);

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

  const loadTemplatesForPhase = useCallback(
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
          // Don't add duplicates
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

  // Step navigation validation
  const canGoStep2 = name.trim().length >= 2 && cultivarId && totalDays > 0;
  const canGoStep3 = phases.length > 0;
  const canSubmit = phases.some((p) => p.templates.length > 0);

  function goToStep2() {
    if (!canGoStep2) return;
    if (phases.length === 0 && !loadingPhases) {
      toast.error(
        "El tipo de cultivo de este cultivar no tiene fases configuradas.",
      );
      return;
    }
    setStep(2);
  }

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

    const result = await createCultivationSchedule({
      name: name.trim(),
      cultivarId,
      totalDays,
      phaseConfig,
    });

    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Plan de cultivo creado");
    router.push("/settings/schedules");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-6 lg:py-8">
      <h1 className="mb-2 text-xl font-bold text-text-primary">
        Nuevo plan de cultivo
      </h1>

      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                "flex size-7 items-center justify-center rounded-full text-xs font-bold",
                s === step
                  ? "bg-brand text-white"
                  : s < step
                    ? "bg-success/20 text-success"
                    : "bg-surface-raised text-text-secondary",
              )}
            >
              {s}
            </div>
            <span
              className={cn(
                "hidden text-xs sm:inline",
                s === step ? "text-text-primary font-bold" : "text-text-secondary",
              )}
            >
              {s === 1 ? "Datos basicos" : s === 2 ? "Fases" : "Templates"}
            </span>
            {s < 3 && (
              <div className="mx-1 h-px w-6 bg-border" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Basic data */}
      {step === 1 && (
        <Card className="flex flex-col gap-5 p-6">
          <Input
            label="Nombre del plan"
            placeholder="Plan Gelato Indoor 127d"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div>
            <label className="mb-1 block text-xs font-bold text-text-primary">
              Cultivar
            </label>
            <select
              value={cultivarId}
              onChange={(e) => setCultivarId(e.target.value)}
              className={selectClasses}
            >
              <option value="">Seleccionar cultivar...</option>
              {wizardData.cultivars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.cropTypeName})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Duracion total (dias)"
            type="number"
            min={1}
            value={totalDays || ""}
            onChange={(e) => setTotalDays(Number(e.target.value) || 0)}
          />

          {loadingPhases && (
            <p className="text-xs text-text-secondary">Cargando fases...</p>
          )}

          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={goToStep2}
              disabled={!canGoStep2 || loadingPhases}
            >
              Siguiente
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Phase durations */}
      {step === 2 && (
        <Card className="flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-text-primary">
              Duracion por fase
            </span>
            <span
              className={cn(
                "text-xs font-mono",
                durationSum === totalDays
                  ? "text-success"
                  : "text-warning",
              )}
            >
              {durationSum} / {totalDays} dias
            </span>
          </div>

          {phases.map((p) => (
            <div key={p.id} className="flex items-center gap-3">
              <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
                {p.name}
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={p.durationDays}
                  onChange={(e) =>
                    updatePhaseDuration(p.id, Number(e.target.value) || 1)
                  }
                  className={cn(
                    "h-9 w-20 rounded-input border border-border bg-surface-card px-2 text-center",
                    "font-mono text-sm text-text-primary",
                    "focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand-light/25",
                  )}
                />
                <span className="text-xs text-text-secondary">dias</span>
              </div>
              {/* Visual bar */}
              <div className="hidden w-24 sm:block">
                <div className="h-2 rounded-full bg-surface-raised">
                  <div
                    className="h-2 rounded-full bg-brand transition-all"
                    style={{
                      width: `${Math.min(100, (p.durationDays / Math.max(totalDays, 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}

          {durationSum !== totalDays && (
            <p className="text-xs text-warning">
              La suma de fases ({durationSum}d) no coincide con la duracion total (
              {totalDays}d).{" "}
              <button
                type="button"
                className="underline"
                onClick={() => setTotalDays(durationSum)}
              >
                Ajustar total
              </button>
            </p>
          )}

          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep(1)}>
              <ChevronLeft className="size-4" />
              Anterior
            </Button>
            <Button
              variant="primary"
              onClick={() => setStep(3)}
              disabled={!canGoStep3}
            >
              Siguiente
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Assign templates to phases */}
      {step === 3 && (
        <div className="flex flex-col gap-3">
          {phases.map((phase) => (
            <Card key={phase.id} className="overflow-hidden">
              <button
                type="button"
                className="flex w-full items-center justify-between p-4"
                onClick={() => {
                  const isExpanded = expandedPhase === phase.id;
                  setExpandedPhase(isExpanded ? null : phase.id);
                  if (!isExpanded) loadTemplatesForPhase(phase.id);
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-text-primary">
                    {phase.name}
                  </span>
                  <Badge variant="outlined">
                    {phase.durationDays}d
                  </Badge>
                  {phase.templates.length > 0 && (
                    <Badge variant="success">
                      {phase.templates.length} templates
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
                  {/* Existing templates */}
                  {phase.templates.length > 0 && (
                    <div className="mb-3 flex flex-col gap-2">
                      {phase.templates.map((t) => (
                        <div
                          key={t.templateId}
                          className="flex items-center gap-2 rounded-lg bg-surface-raised p-2"
                        >
                          <span className="min-w-0 flex-1 truncate text-xs font-bold text-text-primary">
                            {t.templateName}
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

                  {/* Add template */}
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

          <div className="mt-2 flex justify-between">
            <Button variant="secondary" onClick={() => setStep(2)}>
              <ChevronLeft className="size-4" />
              Anterior
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={isSubmitting}
              disabled={!canSubmit}
            >
              Crear plan
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
