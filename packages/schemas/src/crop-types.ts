import { z } from 'zod'

export const cropTypeSchema = z.object({
  code: z
    .string()
    .min(1, 'El código es requerido')
    .max(50, 'Máximo 50 caracteres')
    .regex(/^[a-z0-9_]+$/, 'Solo minúsculas, números y guión bajo'),
  name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres'),
  scientific_name: z.string().max(200).optional().or(z.literal('')),
  category: z.enum(['annual', 'perennial', 'biennial'], {
    message: 'Selecciona una categoría',
  }),
  regulatory_framework: z.string().max(200).optional().or(z.literal('')),
  icon: z.string().max(50).optional().or(z.literal('')),
})
export type CropTypeInput = z.infer<typeof cropTypeSchema>

export const productionPhaseSchema = z
  .object({
    code: z
      .string()
      .min(1, 'El código es requerido')
      .max(50, 'Máximo 50 caracteres')
      .regex(/^[a-z0-9_]+$/, 'Solo minúsculas, números y guión bajo'),
    name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres'),
    default_duration_days: z.number().int().positive('Debe ser mayor a 0').nullable(),
    is_transformation: z.boolean(),
    is_destructive: z.boolean(),
    requires_zone_change: z.boolean(),
    can_skip: z.boolean(),
    can_be_entry_point: z.boolean(),
    can_be_exit_point: z.boolean(),
    depends_on_phase_id: z.string().uuid().nullable(),
    icon: z.string().max(50).optional().or(z.literal('')),
    color: z.string().max(20).optional().or(z.literal('')),
  })
  .refine(
    (data) => data.is_transformation || !data.is_destructive,
    {
      message: 'Solo puede ser destructiva si es transformación',
      path: ['is_destructive'],
    }
  )
export type ProductionPhaseInput = z.infer<typeof productionPhaseSchema>
