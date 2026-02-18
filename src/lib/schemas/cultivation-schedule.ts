import { z } from "zod";

export const phaseTemplateSchema = z.object({
  templateId: z.string().uuid("Template requerido"),
  startDay: z.number().int().positive("Dia de inicio debe ser positivo"),
  frequency: z.enum(["daily", "weekly", "biweekly", "once"]),
});

export const phaseConfigItemSchema = z.object({
  phaseId: z.string().uuid(),
  durationDays: z.number().int().positive("Duracion debe ser positiva"),
  templates: z.array(phaseTemplateSchema),
});

export const cultivationScheduleSchema = z.object({
  name: z.string().min(2, "Minimo 2 caracteres").max(100, "Maximo 100 caracteres"),
  cultivarId: z.string().uuid("Cultivar requerido"),
  totalDays: z.number().int().positive("Total de dias debe ser positivo"),
  phaseConfig: z.array(phaseConfigItemSchema).min(1, "Al menos una fase requerida"),
});

export type CultivationScheduleFormData = z.infer<typeof cultivationScheduleSchema>;
export type PhaseConfigItem = z.infer<typeof phaseConfigItemSchema>;
export type PhaseTemplate = z.infer<typeof phaseTemplateSchema>;

/** Frequency labels for display */
export const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Diario",
  weekly: "Semanal",
  biweekly: "Bisemanal",
  once: "Una vez",
};

/** Generate preview activities from phase config */
export type PreviewActivity = {
  day: number;
  phaseName: string;
  templateName: string;
  frequency: string;
};

export function generatePreviewActivities(
  phaseConfig: PhaseConfigItem[],
  phaseNames: Record<string, string>,
  templateNames: Record<string, string>,
): PreviewActivity[] {
  const activities: PreviewActivity[] = [];
  let cumulativeDay = 0;

  for (const phase of phaseConfig) {
    const phaseStartDay = cumulativeDay + 1;
    const phaseEndDay = cumulativeDay + phase.durationDays;

    for (const tpl of phase.templates) {
      const firstDay = phaseStartDay + tpl.startDay - 1;
      const step =
        tpl.frequency === "daily"
          ? 1
          : tpl.frequency === "weekly"
            ? 7
            : tpl.frequency === "biweekly"
              ? 14
              : 0; // once

      if (step === 0) {
        // "once" — single activity
        if (firstDay <= phaseEndDay) {
          activities.push({
            day: firstDay,
            phaseName: phaseNames[phase.phaseId] ?? "Fase",
            templateName: templateNames[tpl.templateId] ?? "Template",
            frequency: tpl.frequency,
          });
        }
      } else {
        for (let d = firstDay; d <= phaseEndDay; d += step) {
          activities.push({
            day: d,
            phaseName: phaseNames[phase.phaseId] ?? "Fase",
            templateName: templateNames[tpl.templateId] ?? "Template",
            frequency: tpl.frequency,
          });
        }
      }
    }

    cumulativeDay = phaseEndDay;
  }

  activities.sort((a, b) => a.day - b.day);
  return activities;
}
