import { z } from "zod";

export const createOverheadSchema = z.object({
  facilityId: z.string().uuid("Facility requerida"),
  zoneId: z.string().uuid().optional().or(z.literal("")),
  costType: z.enum([
    "energy",
    "rent",
    "depreciation",
    "insurance",
    "maintenance",
    "labor_fixed",
    "other",
  ]),
  description: z.string().min(1, "Descripcion requerida").max(500),
  amount: z.number().positive("Monto debe ser positivo"),
  currency: z.string().length(3, "3 caracteres"),
  periodStart: z.string().min(1, "Fecha inicio requerida"),
  periodEnd: z.string().min(1, "Fecha fin requerida"),
  allocationBasis: z.enum([
    "per_m2",
    "per_plant",
    "per_batch",
    "per_zone",
    "even_split",
  ]),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export const updateOverheadSchema = createOverheadSchema.extend({
  id: z.string().uuid(),
});

export type CreateOverheadData = z.infer<typeof createOverheadSchema>;
export type UpdateOverheadData = z.infer<typeof updateOverheadSchema>;

export const COST_TYPE_LABELS: Record<string, string> = {
  energy: "Energia",
  rent: "Arriendo",
  depreciation: "Depreciacion",
  insurance: "Seguro",
  maintenance: "Mantenimiento",
  labor_fixed: "Mano de obra fija",
  other: "Otro",
};

export const ALLOCATION_LABELS: Record<string, string> = {
  per_m2: "Por m²",
  per_plant: "Por planta",
  per_batch: "Por batch",
  per_zone: "Por zona",
  even_split: "Division uniforme",
};
