import { z } from 'zod'

// ---------- Create Quality Test (PRD 29) ----------

export const createQualityTestSchema = z.object({
  batch_id: z.string().uuid('Selecciona un lote'),
  phase_id: z.string().uuid('Selecciona una fase'),
  test_type: z.string().min(1, 'El tipo de test es requerido').max(100),
  lab_name: z.string().max(200).optional().or(z.literal('')),
  lab_reference: z.string().max(100).optional().or(z.literal('')),
  sample_date: z.string().min(1, 'La fecha de muestreo es requerida'),
  notes: z.string().max(2000).optional().or(z.literal('')),
})

export type CreateQualityTestInput = z.infer<typeof createQualityTestSchema>

// ---------- Update Quality Test (PRD 30) ----------

export const updateQualityTestSchema = z.object({
  lab_name: z.string().max(200).optional().or(z.literal('')),
  lab_reference: z.string().max(100).optional().or(z.literal('')),
  result_date: z.string().optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
})

export type UpdateQualityTestInput = z.infer<typeof updateQualityTestSchema>

// ---------- Quality Test Result (PRD 30) ----------

export const qualityTestResultSchema = z.object({
  parameter: z.string().min(1, 'El parámetro es requerido').max(200),
  value: z.string().min(1, 'El valor es requerido').max(200),
  numeric_value: z.number().optional().nullable(),
  unit: z.string().max(50).optional().or(z.literal('')),
  min_threshold: z.number().optional().nullable(),
  max_threshold: z.number().optional().nullable(),
}).refine(
  (data) => {
    if (data.min_threshold != null && data.max_threshold != null) {
      return data.min_threshold <= data.max_threshold
    }
    return true
  },
  { message: 'El mínimo debe ser menor o igual al máximo', path: ['min_threshold'] }
)

export type QualityTestResultInput = z.infer<typeof qualityTestResultSchema>
