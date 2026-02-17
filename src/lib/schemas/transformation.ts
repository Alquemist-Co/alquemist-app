import { z } from "zod";

export const executeTransformationSchema = z.object({
  batchId: z.string().uuid(),
  phaseId: z.string().uuid(),
  outputs: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().positive("Cantidad debe ser mayor a 0"),
        unitId: z.string().uuid(),
        zoneId: z.string().uuid(),
      }),
    )
    .min(1, "Al menos un output requerido"),
  wasteQuantity: z.number().nonnegative().optional(),
  wasteUnitId: z.string().uuid().optional(),
  wasteReason: z.string().optional(),
  notes: z.string().optional(),
});

export type ExecuteTransformationInput = z.infer<typeof executeTransformationSchema>;
