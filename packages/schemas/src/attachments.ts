import { z } from 'zod'

// ---------- Upload Attachment ----------

export const uploadAttachmentSchema = z.object({
  entity_type: z.enum(['activity', 'batch', 'quality_test', 'observation']),
  entity_id: z.string().uuid(),
  file_type: z.string().min(1, 'El tipo de archivo es requerido'),
  file_size_bytes: z.number().int().positive().optional(),
  description: z.string().max(255).optional().or(z.literal('')),
})

export type UploadAttachmentInput = z.infer<typeof uploadAttachmentSchema>

// ---------- Env Parameter Enum ----------

export const envParameterEnum = z.enum([
  'temperature', 'humidity', 'co2', 'light_ppfd', 'ec', 'ph', 'soil_moisture', 'vpd',
])
export type EnvParameter = z.infer<typeof envParameterEnum>
