import { z } from 'zod'

// ---------- Sensor Type Enum ----------

export const sensorTypeEnum = z.enum([
  'temperature', 'humidity', 'co2', 'light', 'ec', 'ph', 'soil_moisture', 'vpd',
])
export type SensorType = z.infer<typeof sensorTypeEnum>

// ---------- Create Sensor (PRD 35) ----------

export const createSensorSchema = z.object({
  zone_id: z.string().uuid('Selecciona una zona'),
  type: sensorTypeEnum,
  brand_model: z.string().max(200).optional().or(z.literal('')),
  serial_number: z.string().max(100).optional().or(z.literal('')),
  calibration_date: z.string().optional().or(z.literal('')),
  is_active: z.boolean().default(true),
})

export type CreateSensorInput = z.infer<typeof createSensorSchema>

// ---------- Update Sensor (PRD 35) ----------

export const updateSensorSchema = z.object({
  zone_id: z.string().uuid('Selecciona una zona').optional(),
  type: sensorTypeEnum.optional(),
  brand_model: z.string().max(200).optional().or(z.literal('')),
  serial_number: z.string().max(100).optional().or(z.literal('')),
  calibration_date: z.string().optional().or(z.literal('')),
  is_active: z.boolean().optional(),
})

export type UpdateSensorInput = z.infer<typeof updateSensorSchema>
