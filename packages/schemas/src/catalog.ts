import { z } from 'zod'

// ---------- Resource Categories ----------

export const resourceCategorySchema = z.object({
  parent_id: z.string().uuid().nullable().optional(),
  code: z
    .string()
    .min(1, 'El código es requerido')
    .max(50, 'Máximo 50 caracteres')
    .regex(/^[A-Z0-9_]+$/, 'Solo letras mayúsculas, números y guión bajo'),
  name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres'),
  icon: z.string().max(50).optional().or(z.literal('')),
  color: z.string().max(20).optional().or(z.literal('')),
  is_consumable: z.boolean(),
  is_depreciable: z.boolean(),
  is_transformable: z.boolean(),
  default_lot_tracking: z.enum(['required', 'optional', 'none'], {
    message: 'Selecciona un modo de tracking',
  }),
})
export type ResourceCategoryInput = z.infer<typeof resourceCategorySchema>

// ---------- Units of Measure ----------

export const unitOfMeasureSchema = z.object({
  code: z.string().min(1, 'El código es requerido').max(20, 'Máximo 20 caracteres'),
  name: z.string().min(1, 'El nombre es requerido').max(100, 'Máximo 100 caracteres'),
  dimension: z.enum(
    ['mass', 'volume', 'count', 'area', 'energy', 'time', 'concentration'],
    { message: 'Selecciona una dimensión' }
  ),
  base_unit_id: z.string().uuid().nullable().optional(),
  to_base_factor: z.number().positive('El factor debe ser positivo'),
})
export type UnitOfMeasureInput = z.infer<typeof unitOfMeasureSchema>

// ---------- Activity Types ----------

export const activityTypeSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres'),
  category: z.string().max(100).optional().or(z.literal('')),
})
export type ActivityTypeInput = z.infer<typeof activityTypeSchema>
