import { z } from "zod";

export const zoneSchema = z.object({
  facilityId: z.string().uuid("Facility requerida"),
  name: z
    .string()
    .min(2, "Minimo 2 caracteres")
    .max(100, "Maximo 100 caracteres"),
  purpose: z.enum([
    "propagation",
    "vegetation",
    "flowering",
    "drying",
    "processing",
    "storage",
    "multipurpose",
  ]),
  environment: z.enum([
    "indoor_controlled",
    "greenhouse",
    "tunnel",
    "open_field",
  ]),
  areaM2: z.number().positive("Debe ser mayor a 0"),
  heightM: z.number().positive().optional(),
  plantCapacity: z.number().int().nonnegative().optional(),
});

export const updateZoneSchema = zoneSchema.extend({
  id: z.string().uuid(),
});

export type ZoneFormData = z.infer<typeof zoneSchema>;
export type UpdateZoneData = z.infer<typeof updateZoneSchema>;
