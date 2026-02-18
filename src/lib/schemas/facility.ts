import { z } from "zod";

export const facilitySchema = z.object({
  name: z
    .string()
    .min(2, "Minimo 2 caracteres")
    .max(100, "Maximo 100 caracteres"),
  type: z.enum([
    "indoor_warehouse",
    "greenhouse",
    "tunnel",
    "open_field",
    "vertical_farm",
  ]),
  totalFootprintM2: z.number().positive("Debe ser mayor a 0"),
  address: z
    .string()
    .min(2, "Minimo 2 caracteres")
    .max(500, "Maximo 500 caracteres"),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const updateFacilitySchema = facilitySchema.extend({
  id: z.string().uuid(),
});

export type FacilityFormData = z.infer<typeof facilitySchema>;
export type UpdateFacilityData = z.infer<typeof updateFacilitySchema>;
