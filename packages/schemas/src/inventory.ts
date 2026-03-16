import { z } from 'zod'

// ---------- ENUMs ----------

export const lotStatusEnum = z.enum(
  ['available', 'quarantine', 'expired'],
  { message: 'Selecciona un estado' },
)
export type LotStatus = z.infer<typeof lotStatusEnum>

export const sourceTypeEnum = z.enum(
  ['purchase', 'production', 'transfer', 'transformation'],
)
export type SourceType = z.infer<typeof sourceTypeEnum>

export const transactionTypeEnum = z.enum([
  'receipt', 'consumption', 'application',
  'transfer_out', 'transfer_in',
  'transformation_out', 'transformation_in',
  'adjustment', 'waste', 'return',
  'reservation', 'release',
])
export type TransactionType = z.infer<typeof transactionTypeEnum>

// ---------- Adjust Inventory ----------

export const adjustInventorySchema = z.object({
  inventory_item_id: z.string().uuid('Selecciona un lote'),
  quantity: z.number({ message: 'Ingresa la cantidad' })
    .refine((v) => v !== 0, 'La cantidad no puede ser 0'),
  reason: z.string()
    .min(1, 'La razón es requerida')
    .max(2000, 'Máximo 2000 caracteres'),
})

export type AdjustInventoryInput = z.infer<typeof adjustInventorySchema>

// ---------- Transfer Inventory ----------

export const transferInventorySchema = z.object({
  inventory_item_id: z.string().uuid('Selecciona un lote origen'),
  destination_zone_id: z.string().uuid('Selecciona una zona destino'),
  quantity: z.number({ message: 'Ingresa la cantidad' })
    .positive('La cantidad debe ser mayor a 0'),
  reason: z.string().max(2000, 'Máximo 2000 caracteres').optional().or(z.literal('')),
})

export type TransferInventoryInput = z.infer<typeof transferInventorySchema>

// ---------- Change Lot Status ----------

export const changeLotStatusSchema = z.object({
  lot_status: lotStatusEnum,
  reason: z.string().min(1, 'La razón es requerida').max(2000, 'Máximo 2000 caracteres'),
})

export type ChangeLotStatusInput = z.infer<typeof changeLotStatusSchema>
