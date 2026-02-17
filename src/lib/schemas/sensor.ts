import { z } from "zod";

const SENSOR_TYPES = [
  "temperature",
  "humidity",
  "co2",
  "light",
  "ec",
  "ph",
  "soil_moisture",
  "vpd",
] as const;

export const createSensorSchema = z.object({
  zoneId: z.string().uuid("Zona requerida"),
  type: z.enum(SENSOR_TYPES, { message: "Tipo de sensor requerido" }),
  brandModel: z
    .string()
    .max(200, "Maximo 200 caracteres")
    .optional()
    .or(z.literal("")),
  serialNumber: z
    .string()
    .min(1, "Serial requerido")
    .max(100, "Maximo 100 caracteres"),
  calibrationDate: z.string().optional().or(z.literal("")),
  isActive: z.boolean(),
});

export const updateSensorSchema = createSensorSchema.extend({
  id: z.string().uuid(),
});

export type CreateSensorData = z.infer<typeof createSensorSchema>;
export type UpdateSensorData = z.infer<typeof updateSensorSchema>;
