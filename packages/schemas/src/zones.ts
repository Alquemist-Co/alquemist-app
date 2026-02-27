import { z } from 'zod'

export const zoneSchema = z.object({
  facility_id: z.string().uuid('Selecciona una instalación'),
  name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres'),
  purpose: z.enum(
    ['propagation', 'vegetation', 'flowering', 'drying', 'processing', 'storage', 'multipurpose'],
    { message: 'Selecciona un propósito' },
  ),
  environment: z.enum(
    ['indoor_controlled', 'greenhouse', 'tunnel', 'open_field'],
    { message: 'Selecciona un ambiente' },
  ),
  area_m2: z
    .number({ message: 'Ingresa el área' })
    .positive('El área debe ser mayor a 0')
    .max(100000, 'Área demasiado grande'),
  height_m: z.number().positive('La altura debe ser mayor a 0').nullable().optional(),
  status: z.enum(['active', 'maintenance', 'inactive'], { message: 'Selecciona un estado' }),
})
export type ZoneInput = z.infer<typeof zoneSchema>

export const zoneStructureSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres'),
  type: z.enum(
    ['mobile_rack', 'fixed_rack', 'rolling_bench', 'row', 'bed', 'trellis_row', 'nft_channel'],
    { message: 'Selecciona un tipo' },
  ),
  length_m: z.number({ message: 'Ingresa el largo' }).positive('Debe ser mayor a 0'),
  width_m: z.number({ message: 'Ingresa el ancho' }).positive('Debe ser mayor a 0'),
  is_mobile: z.boolean(),
  num_levels: z.number({ message: 'Ingresa niveles' }).int().min(1, 'Mínimo 1 nivel'),
  positions_per_level: z.number().int().positive('Debe ser mayor a 0').nullable().optional(),
  spacing_cm: z.number().positive('Debe ser mayor a 0').nullable().optional(),
  pot_size_l: z.number().positive('Debe ser mayor a 0').nullable().optional(),
})
export type ZoneStructureInput = z.infer<typeof zoneStructureSchema>
