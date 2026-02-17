import { z } from "zod";

export const iotReadingSchema = z.object({
  serialNumber: z.string().min(1, "Serial requerido"),
  parameter: z.enum([
    "temperature",
    "humidity",
    "co2",
    "light_ppfd",
    "ec",
    "ph",
    "vpd",
  ]),
  value: z.number(),
  unit: z.string().min(1),
  timestamp: z.string().datetime().optional(),
});

export type IotReadingData = z.infer<typeof iotReadingSchema>;

export const PARAMETER_CONFIG: Record<
  string,
  { label: string; unit: string; min: number; max: number; optimalMin: number; optimalMax: number }
> = {
  temperature: { label: "Temperatura", unit: "°C", min: 10, max: 40, optimalMin: 20, optimalMax: 28 },
  humidity: { label: "Humedad", unit: "%", min: 20, max: 100, optimalMin: 50, optimalMax: 70 },
  co2: { label: "CO2", unit: "ppm", min: 200, max: 2000, optimalMin: 800, optimalMax: 1200 },
  light_ppfd: { label: "Luz PPFD", unit: "µmol", min: 0, max: 1200, optimalMin: 400, optimalMax: 800 },
  ec: { label: "EC", unit: "mS/cm", min: 0, max: 5, optimalMin: 1.0, optimalMax: 2.5 },
  ph: { label: "pH", unit: "", min: 4, max: 9, optimalMin: 5.5, optimalMax: 6.5 },
  vpd: { label: "VPD", unit: "kPa", min: 0, max: 3, optimalMin: 0.8, optimalMax: 1.2 },
};
