import { z } from 'zod'

export const conversionPropertiesSchema = z.object({
  ppm_factor: z.number().positive('Debe ser mayor a 0').optional().nullable(),
  dilution_ratio: z.number().positive('Debe ser mayor a 0').optional().nullable(),
}).optional().nullable()

export type ConversionProperties = z.infer<typeof conversionPropertiesSchema>

export const productSchema = z.object({
  sku: z
    .string()
    .min(1, 'El SKU es requerido')
    .max(50, 'Máximo 50 caracteres')
    .regex(/^[A-Z0-9\-]+$/, 'Solo letras mayúsculas, números y guiones'),
  name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres'),
  category_id: z.string().uuid('Selecciona una categoría'),
  default_unit_id: z.string().uuid('Selecciona una unidad de medida'),
  cultivar_id: z.string().uuid().optional().nullable(),
  procurement_type: z.enum(['purchased', 'produced', 'both'], {
    message: 'Selecciona un tipo de adquisición',
  }),
  lot_tracking: z.enum(['required', 'optional', 'none'], {
    message: 'Selecciona seguimiento de lote',
  }),
  shelf_life_days: z.number().int().positive('Debe ser mayor a 0').optional().nullable(),
  phi_days: z.number().int().nonnegative('Debe ser 0 o mayor').optional().nullable(),
  rei_hours: z.number().int().nonnegative('Debe ser 0 o mayor').optional().nullable(),
  default_yield_pct: z.number().min(0).max(100, 'Máximo 100%').optional().nullable(),
  density_g_per_ml: z.number().positive('Debe ser mayor a 0').optional().nullable(),
  conversion_properties: conversionPropertiesSchema,
  default_price: z.number().nonnegative('No puede ser negativo').optional().nullable(),
  price_currency: z.string().length(3).optional().nullable(),
  preferred_supplier_id: z.string().uuid().optional().nullable(),
})

export type ProductInput = z.infer<typeof productSchema>

export const productRegReqSchema = z.object({
  doc_type_id: z.string().uuid('Selecciona un tipo de documento'),
  is_mandatory: z.boolean(),
  applies_to_scope: z.enum(['per_batch', 'per_lot', 'per_product', 'per_facility'], {
    message: 'Selecciona un alcance',
  }),
  frequency: z.enum(['once', 'per_production', 'annual', 'per_shipment'], {
    message: 'Selecciona una frecuencia',
  }),
  notes: z.string().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
})

export type ProductRegReqInput = z.infer<typeof productRegReqSchema>
