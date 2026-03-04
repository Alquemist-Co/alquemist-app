import { z } from 'zod'

// =============================================================
// ENUMs
// =============================================================

export const observationTypeEnum = z.enum([
  'pest', 'disease', 'deficiency', 'environmental', 'general', 'measurement',
])
export type ObservationType = z.infer<typeof observationTypeEnum>

export const observationSeverityEnum = z.enum([
  'info', 'low', 'medium', 'high', 'critical',
])
export type ObservationSeverity = z.infer<typeof observationSeverityEnum>

export const plantPartEnum = z.enum([
  'root', 'stem', 'leaf', 'flower', 'fruit', 'whole_plant',
])
export type PlantPart = z.infer<typeof plantPartEnum>

export const incidenceUnitEnum = z.enum(['count', 'percentage'])
export type IncidenceUnit = z.infer<typeof incidenceUnitEnum>

export const activityStatusEnum = z.enum([
  'in_progress', 'completed', 'cancelled',
])
export type ActivityStatus = z.infer<typeof activityStatusEnum>

export const scheduledActivityStatusEnum = z.enum([
  'pending', 'completed', 'skipped', 'overdue',
])
export type ScheduledActivityStatus = z.infer<typeof scheduledActivityStatusEnum>

// =============================================================
// Activity Resource (for execute payload)
// =============================================================

export const activityResourceSchema = z.object({
  product_id: z.string().uuid(),
  inventory_item_id: z.string().uuid('Selecciona un lote'),
  quantity_planned: z.number().nonnegative().optional().nullable(),
  quantity_actual: z.number().positive('La cantidad debe ser mayor a 0'),
  unit_id: z.string().uuid(),
})
export type ActivityResourceInput = z.infer<typeof activityResourceSchema>

// =============================================================
// Activity Observation
// =============================================================

export const activityObservationSchema = z.object({
  type: observationTypeEnum,
  agent_id: z.string().uuid().optional().nullable(),
  plant_part: plantPartEnum.optional().nullable(),
  incidence_value: z.number().nonnegative().optional().nullable(),
  incidence_unit: incidenceUnitEnum.optional().nullable(),
  severity: observationSeverityEnum,
  severity_pct: z.number().min(0).max(100).optional().nullable(),
  sample_size: z.number().int().positive().optional().nullable(),
  affected_plants: z.number().int().nonnegative().optional().nullable(),
  description: z.string().min(1, 'La descripción es requerida').max(5000),
  action_taken: z.string().max(2000).optional().or(z.literal('')),
})
export type ActivityObservationInput = z.infer<typeof activityObservationSchema>

// =============================================================
// Checklist Result (embedded in execute payload)
// =============================================================

const checklistResultSchema = z.object({
  step_order: z.number().int().nonnegative(),
  checked: z.boolean(),
  value: z.string().max(500).optional().or(z.literal('')),
  photo_url: z.string().url().optional().or(z.literal('')),
})

// =============================================================
// Execute Activity (Edge Function payload)
// =============================================================

export const executeActivitySchema = z.object({
  scheduled_activity_id: z.string().uuid(),
  activity_type_id: z.string().uuid(),
  zone_id: z.string().uuid(),
  batch_id: z.string().uuid(),
  phase_id: z.string().uuid().optional().nullable(),
  performed_by: z.string().uuid(),
  duration_minutes: z.number().int().positive().max(1440),
  measurement_data: z.record(z.string(), z.unknown()).optional(),
  notes: z.string().max(5000).optional().or(z.literal('')),
  checklist_results: z.array(checklistResultSchema).optional().default([]),
  activity_resources: z.array(activityResourceSchema).default([]),
  activity_observations: z.array(activityObservationSchema).default([]),
})
export type ExecuteActivityInput = z.infer<typeof executeActivitySchema>

// =============================================================
// Reschedule Activity (PostgREST update)
// =============================================================

export const rescheduleActivitySchema = z.object({
  planned_date: z.string().min(1, 'La fecha es requerida'),
}).refine(
  (data) => {
    const date = new Date(data.planned_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date >= today
  },
  { message: 'La fecha no puede ser anterior a hoy', path: ['planned_date'] }
)
export type RescheduleActivityInput = z.infer<typeof rescheduleActivitySchema>
