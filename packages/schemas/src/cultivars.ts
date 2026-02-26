import { z } from 'zod'

// ---------- Cultivar ----------

export const cultivarSchema = z.object({
  crop_type_id: z.string().uuid('Tipo de cultivo requerido'),
  code: z.string().min(1, 'El código es requerido').max(50, 'Máximo 50 caracteres'),
  name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres'),
  breeder: z.string().max(200).optional().or(z.literal('')),
  genetics: z.string().max(200).optional().or(z.literal('')),
  default_cycle_days: z.number().int().positive().nullable(),
  expected_yield_per_plant_g: z.number().positive().nullable(),
  expected_dry_ratio: z
    .number()
    .min(0, 'Debe ser mayor o igual a 0')
    .max(1, 'Debe ser menor o igual a 1')
    .nullable(),
  quality_grade: z.string().max(100).optional().or(z.literal('')),
  density_plants_per_m2: z.number().positive().nullable(),
  notes: z.string().optional().or(z.literal('')),
})
export type CultivarInput = z.infer<typeof cultivarSchema>

// ---------- Phase Product Flow ----------

export const phaseProductFlowSchema = z.object({
  cultivar_id: z.string().uuid(),
  phase_id: z.string().uuid(),
  direction: z.enum(['input', 'output'], { message: 'Selecciona dirección' }),
  product_role: z.enum(['primary', 'secondary', 'byproduct', 'waste'], {
    message: 'Selecciona un rol',
  }),
  product_id: z.string().uuid().nullable(),
  product_category_id: z.string().uuid().nullable(),
  expected_yield_pct: z.number().min(0).max(100).nullable(),
  expected_quantity_per_input: z.number().positive().nullable(),
  unit_id: z.string().uuid().nullable(),
  is_required: z.boolean(),
  sort_order: z.number().int().min(0),
  notes: z.string().optional().or(z.literal('')),
})
export type PhaseProductFlowInput = z.infer<typeof phaseProductFlowSchema>
