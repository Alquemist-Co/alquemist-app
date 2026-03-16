import { z } from 'zod'

// ---------- Cost Enums ----------

export const costTypeEnum = z.enum([
  'energy', 'rent', 'depreciation', 'insurance', 'maintenance', 'labor_fixed', 'other',
])
export type CostType = z.infer<typeof costTypeEnum>

export const allocationBasisEnum = z.enum([
  'per_m2', 'per_plant', 'per_batch', 'per_zone', 'even_split',
])
export type AllocationBasis = z.infer<typeof allocationBasisEnum>

// ---------- Create Overhead Cost (PRD 36) ----------

export const createOverheadCostSchema = z.object({
  facility_id: z.string().uuid('Selecciona una instalación'),
  zone_id: z.string().uuid().optional().or(z.literal('')),
  cost_type: costTypeEnum,
  description: z.string().min(1, 'La descripción es requerida').max(255),
  amount: z.number().positive('El monto debe ser positivo'),
  currency: z.string().length(3, 'Moneda debe ser código ISO de 3 letras').default('COP'),
  period_start: z.string().min(1, 'La fecha de inicio es requerida'),
  period_end: z.string().min(1, 'La fecha de fin es requerida'),
  allocation_basis: allocationBasisEnum.default('even_split'),
  notes: z.string().max(2000).optional().or(z.literal('')),
}).refine(
  (data) => data.period_start <= data.period_end,
  { message: 'La fecha de inicio debe ser anterior a la fecha de fin', path: ['period_start'] }
).superRefine((data, ctx) => {
  if (data.allocation_basis === 'per_zone' && !data.zone_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'La zona es requerida cuando el prorrateo es por zona',
      path: ['zone_id'],
    })
  }
})

export type CreateOverheadCostInput = z.infer<typeof createOverheadCostSchema>

// ---------- Update Overhead Cost (PRD 36) ----------

export const updateOverheadCostSchema = z.object({
  facility_id: z.string().uuid().optional(),
  zone_id: z.string().uuid().optional().nullable(),
  cost_type: costTypeEnum.optional(),
  description: z.string().min(1).max(255).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  allocation_basis: allocationBasisEnum.optional(),
  notes: z.string().max(2000).optional().or(z.literal('')),
})

export type UpdateOverheadCostInput = z.infer<typeof updateOverheadCostSchema>
