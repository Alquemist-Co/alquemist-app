import { z } from "zod";

const codeRegex = /^[A-Za-z0-9_-]+$/;

// ── Template base schemas ────────────────────────────────────────

export const createTemplateSchema = z.object({
  code: z
    .string()
    .min(2, "Minimo 2 caracteres")
    .max(50, "Maximo 50 caracteres")
    .regex(codeRegex, "Solo letras, numeros, guiones y guion bajo"),
  activityTypeId: z.string().uuid("Selecciona un tipo de actividad"),
  name: z
    .string()
    .min(2, "Minimo 2 caracteres")
    .max(200, "Maximo 200 caracteres"),
  frequency: z.enum(["daily", "weekly", "biweekly", "once", "on_demand"]),
  estimatedDurationMin: z
    .number()
    .int()
    .min(1, "Minimo 1 minuto")
    .max(1440, "Maximo 1440 minutos"),
  triggerDayFrom: z.number().int().optional(),
  triggerDayTo: z.number().int().optional(),
  triggersPhaseChangeId: z.string().uuid().optional().or(z.literal("")),
  triggersTransformation: z.boolean().optional(),
  phaseIds: z.array(z.string().uuid()).optional(),
});

export const updateTemplateSchema = createTemplateSchema.extend({
  id: z.string().uuid(),
});

export type CreateTemplateData = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateData = z.infer<typeof updateTemplateSchema>;

// ── Template resources schema ────────────────────────────────────

export const templateResourceItemSchema = z.object({
  productId: z.string().uuid("Selecciona un producto"),
  quantity: z.coerce.number().positive("Cantidad debe ser positiva"),
  quantityBasis: z.enum([
    "fixed",
    "per_plant",
    "per_m2",
    "per_zone",
    "per_L_solution",
  ]),
  isOptional: z.boolean(),
  sortOrder: z.coerce.number().int(),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export const setTemplateResourcesSchema = z.object({
  templateId: z.string().uuid(),
  resources: z.array(templateResourceItemSchema),
});

export type TemplateResourceItem = z.infer<typeof templateResourceItemSchema>;

// ── Template checklist schema ────────────────────────────────────

export const templateChecklistItemSchema = z.object({
  instruction: z
    .string()
    .min(2, "Minimo 2 caracteres")
    .max(500, "Maximo 500 caracteres"),
  isCritical: z.boolean(),
  requiresPhoto: z.boolean(),
  expectedValue: z.string().max(100).optional().or(z.literal("")),
  tolerance: z.string().max(100).optional().or(z.literal("")),
  stepOrder: z.coerce.number().int(),
});

export const setTemplateChecklistSchema = z.object({
  templateId: z.string().uuid(),
  items: z.array(templateChecklistItemSchema),
});

export type TemplateChecklistItem = z.infer<typeof templateChecklistItemSchema>;
