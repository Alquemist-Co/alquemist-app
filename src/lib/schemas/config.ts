import { z } from "zod";

const codeRegex = /^[a-z0-9_-]+$/;

// ── Crop Type schemas ──────────────────────────────────────────────

export const createCropTypeSchema = z.object({
  code: z
    .string()
    .min(2, "Minimo 2 caracteres")
    .max(50, "Maximo 50 caracteres")
    .regex(codeRegex, "Solo minusculas, numeros, guiones y guion bajo"),
  name: z
    .string()
    .min(2, "Minimo 2 caracteres")
    .max(100, "Maximo 100 caracteres"),
  category: z.enum(["annual", "perennial", "biennial"]),
  scientificName: z.string().max(200).optional().or(z.literal("")),
  regulatoryFramework: z.string().max(200).optional().or(z.literal("")),
  icon: z.string().max(50).optional().or(z.literal("")),
});

export const updateCropTypeSchema = createCropTypeSchema.extend({
  id: z.string().uuid(),
});

export type CreateCropTypeData = z.infer<typeof createCropTypeSchema>;
export type UpdateCropTypeData = z.infer<typeof updateCropTypeSchema>;

// ── Phase schemas ──────────────────────────────────────────────────

export const createPhaseSchema = z.object({
  cropTypeId: z.string().uuid(),
  code: z
    .string()
    .min(2, "Minimo 2 caracteres")
    .max(50, "Maximo 50 caracteres")
    .regex(codeRegex, "Solo minusculas, numeros, guiones y guion bajo"),
  name: z
    .string()
    .min(2, "Minimo 2 caracteres")
    .max(100, "Maximo 100 caracteres"),
  defaultDurationDays: z.coerce.number().int().min(1).optional(),
  isTransformation: z.boolean().default(false),
  isDestructive: z.boolean().default(false),
  requiresZoneChange: z.boolean().default(false),
  canSkip: z.boolean().default(false),
  canBeEntryPoint: z.boolean().default(false),
  canBeExitPoint: z.boolean().default(false),
  icon: z.string().max(50).optional().or(z.literal("")),
  color: z.string().max(20).optional().or(z.literal("")),
});

export const updatePhaseSchema = createPhaseSchema.omit({ cropTypeId: true }).extend({
  id: z.string().uuid(),
});

export const reorderPhasesSchema = z.object({
  cropTypeId: z.string().uuid(),
  phaseIds: z.array(z.string().uuid()).min(1),
});

export type CreatePhaseData = z.infer<typeof createPhaseSchema>;
export type UpdatePhaseData = z.infer<typeof updatePhaseSchema>;
export type ReorderPhasesData = z.infer<typeof reorderPhasesSchema>;

// ── Phase Product Flow schemas ─────────────────────────────────────

export const phaseProductFlowItemSchema = z
  .object({
    direction: z.enum(["input", "output"]),
    productRole: z.enum(["primary", "secondary", "byproduct", "waste"]),
    productId: z.string().uuid().optional().or(z.literal("")),
    productCategoryId: z.string().uuid().optional().or(z.literal("")),
    expectedYieldPct: z.coerce.number().min(0).optional(),
    expectedQuantityPerInput: z.coerce.number().min(0).optional(),
    unitId: z.string().uuid().optional().or(z.literal("")),
    isRequired: z.boolean().default(true),
    sortOrder: z.coerce.number().int().min(0),
    notes: z.string().max(500).optional().or(z.literal("")),
  })
  .refine(
    (d) => (d.productId && d.productId !== "") || (d.productCategoryId && d.productCategoryId !== ""),
    { message: "Debe seleccionar un producto o una categoria" }
  );

export const setPhaseFlowsSchema = z.object({
  phaseId: z.string().uuid(),
  flows: z.array(phaseProductFlowItemSchema),
});

export type PhaseProductFlowItem = z.infer<typeof phaseProductFlowItemSchema>;
export type SetPhaseFlowsData = z.infer<typeof setPhaseFlowsSchema>;
