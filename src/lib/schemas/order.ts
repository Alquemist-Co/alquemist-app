import { z } from "zod";

export const createOrderSchema = z.object({
  cultivarId: z.string().uuid("Cultivar requerido"),
  entryPhaseId: z.string().uuid("Fase de entrada requerida"),
  exitPhaseId: z.string().uuid("Fase de salida requerida"),
  initialQuantity: z.number().positive("La cantidad debe ser mayor a cero"),
  initialUnitId: z.string().uuid("Unidad requerida"),
  initialProductId: z.string().uuid().optional().or(z.literal("")),
  plannedStartDate: z.string().min(1, "Fecha de inicio requerida"),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  assignedTo: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  // Per-phase data
  phaseConfig: z.array(
    z.object({
      phaseId: z.string().uuid(),
      zoneId: z.string().uuid().optional().or(z.literal("")),
      durationDays: z.number().int().min(1).optional(),
      skipped: z.boolean(),
    })
  ),
});

export type CreateOrderData = z.infer<typeof createOrderSchema>;
