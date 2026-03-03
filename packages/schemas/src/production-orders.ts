import { z } from 'zod'

// ---------- Phase Override ----------

export const orderPhaseOverrideSchema = z.object({
  phase_id: z.string().uuid('Selecciona una fase'),
  planned_duration_days: z.number().int().positive('Debe ser mayor a 0').optional().nullable(),
  zone_id: z.string().uuid().optional().nullable(),
})

export type OrderPhaseOverrideInput = z.infer<typeof orderPhaseOverrideSchema>

// ---------- Production Order ----------

export const productionOrderSchema = z.object({
  cultivar_id: z.string().uuid('Selecciona un cultivar'),
  entry_phase_id: z.string().uuid('Selecciona la fase de entrada'),
  exit_phase_id: z.string().uuid('Selecciona la fase de salida'),
  initial_quantity: z.number({ message: 'Ingresa la cantidad' }).positive('La cantidad debe ser mayor a 0'),
  initial_unit_id: z.string().uuid('Selecciona una unidad'),
  initial_product_id: z.string().uuid().optional().nullable(),
  zone_id: z.string().uuid().optional().nullable(),
  planned_start_date: z.string().min(1, 'La fecha de inicio es requerida'),
  priority: z.enum(['low', 'normal', 'high', 'urgent'], { message: 'Selecciona una prioridad' }),
  assigned_to: z.string().uuid().optional().nullable(),
  notes: z.string().max(2000, 'Máximo 2000 caracteres').optional().or(z.literal('')),
  phase_overrides: z.array(orderPhaseOverrideSchema).optional(),
})

export type ProductionOrderInput = z.infer<typeof productionOrderSchema>

// ---------- Calculate Yields ----------

export const calculateYieldsSchema = z.object({
  cultivar_id: z.string().uuid('Selecciona un cultivar'),
  entry_phase_id: z.string().uuid('Selecciona la fase de entrada'),
  exit_phase_id: z.string().uuid('Selecciona la fase de salida'),
  initial_quantity: z.number({ message: 'Ingresa la cantidad' }).positive('La cantidad debe ser mayor a 0'),
})

export type CalculateYieldsInput = z.infer<typeof calculateYieldsSchema>
