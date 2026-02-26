import { z } from 'zod'

// ---------- Activity Template (General) ----------

export const activityTemplateSchema = z
  .object({
    code: z.string().min(1, 'El código es requerido').max(50, 'Máximo 50 caracteres'),
    activity_type_id: z.string().uuid('Selecciona un tipo de actividad'),
    name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres'),
    frequency: z.enum(['daily', 'weekly', 'biweekly', 'once', 'on_demand'], {
      message: 'Selecciona una frecuencia',
    }),
    estimated_duration_min: z.number().int().positive('Debe ser mayor a 0'),
    trigger_day_from: z.number().int().min(0).nullable(),
    trigger_day_to: z.number().int().min(0).nullable(),
    depends_on_template_id: z.string().uuid().nullable(),
    triggers_phase_change_id: z.string().uuid().nullable(),
    triggers_transformation: z.boolean(),
  })
  .refine(
    (data) =>
      data.trigger_day_from == null ||
      data.trigger_day_to == null ||
      data.trigger_day_to >= data.trigger_day_from,
    {
      message: 'El día final debe ser mayor o igual al día inicial',
      path: ['trigger_day_to'],
    }
  )
export type ActivityTemplateInput = z.infer<typeof activityTemplateSchema>

// ---------- Template Resource ----------

export const templateResourceSchema = z.object({
  product_id: z.string().uuid().nullable(),
  quantity: z.number().positive('La cantidad debe ser mayor a 0'),
  quantity_basis: z.enum(['fixed', 'per_plant', 'per_m2', 'per_zone', 'per_L_solution'], {
    message: 'Selecciona un modo de escalado',
  }),
  is_optional: z.boolean(),
  sort_order: z.number().int().min(0),
  notes: z.string().optional().or(z.literal('')),
})
export type TemplateResourceInput = z.infer<typeof templateResourceSchema>

// ---------- Template Checklist Step ----------

export const templateChecklistSchema = z.object({
  instruction: z
    .string()
    .min(1, 'La instrucción es requerida')
    .max(500, 'Máximo 500 caracteres'),
  is_critical: z.boolean(),
  requires_photo: z.boolean(),
  expected_value: z.string().max(100).optional().or(z.literal('')),
  tolerance: z.string().max(50).optional().or(z.literal('')),
})
export type TemplateChecklistInput = z.infer<typeof templateChecklistSchema>

// ---------- Cultivation Schedule ----------

export const cultivationScheduleSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres'),
  cultivar_id: z.string().uuid('Selecciona un cultivar'),
})
export type CultivationScheduleInput = z.infer<typeof cultivationScheduleSchema>
