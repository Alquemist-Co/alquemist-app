import { z } from "zod";

export const splitBatchSchema = z.object({
  batchId: z.string().uuid(),
  splitCount: z.number().int().positive("Cantidad debe ser mayor a 0"),
  zoneId: z.string().uuid("Zona requerida"),
  reason: z.string().min(5, "Razon debe tener al menos 5 caracteres"),
});

export const mergeBatchesSchema = z.object({
  targetBatchId: z.string().uuid(),
  sourceBatchIds: z.array(z.string().uuid()).min(1, "Selecciona al menos un batch"),
  reason: z.string().min(5, "Razon debe tener al menos 5 caracteres"),
});

export type SplitBatchInput = z.infer<typeof splitBatchSchema>;
export type MergeBatchesInput = z.infer<typeof mergeBatchesSchema>;
