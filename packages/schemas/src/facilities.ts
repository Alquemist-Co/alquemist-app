import { z } from 'zod'

export const facilitySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres'),
  type: z.enum(['indoor_warehouse', 'greenhouse', 'tunnel', 'open_field', 'vertical_farm'], {
    message: 'Selecciona un tipo',
  }),
  total_footprint_m2: z
    .number({ message: 'Ingresa la superficie' })
    .positive('Debe ser mayor a 0')
    .max(1000000, 'Máximo 1,000,000 m²'),
  address: z.string().min(1, 'La dirección es requerida').max(500, 'Máximo 500 caracteres'),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
})
export type FacilityInput = z.infer<typeof facilitySchema>
