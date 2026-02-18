import { z } from "zod";

export const unitSchema = z.object({
  code: z
    .string()
    .min(1, "Codigo requerido")
    .max(20, "Maximo 20 caracteres"),
  name: z
    .string()
    .min(2, "Minimo 2 caracteres")
    .max(100, "Maximo 100 caracteres"),
  dimension: z.enum([
    "mass",
    "volume",
    "count",
    "area",
    "energy",
    "time",
    "concentration",
  ]),
  baseUnitId: z.string().uuid().optional().or(z.literal("")),
  toBaseFactor: z.number().positive("Factor debe ser mayor a 0"),
});

export const updateUnitSchema = unitSchema.extend({
  id: z.string().uuid(),
});

export type UnitFormData = z.infer<typeof unitSchema>;
export type UpdateUnitData = z.infer<typeof updateUnitSchema>;
