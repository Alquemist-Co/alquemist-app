import { z } from 'zod'

// ---------- Shipment Item ----------

export const shipmentItemSchema = z.object({
  product_id: z.string().uuid('Selecciona un producto'),
  expected_quantity: z.number({ message: 'Ingresa la cantidad' }).positive('La cantidad debe ser mayor a 0'),
  unit_id: z.string().uuid('Selecciona una unidad'),
  supplier_lot_number: z.string().max(100, 'Máximo 100 caracteres').optional().or(z.literal('')),
  supplier_batch_ref: z.string().max(100, 'Máximo 100 caracteres').optional().or(z.literal('')),
  cost_per_unit: z.number().nonnegative('No puede ser negativo').optional().nullable(),
  destination_zone_id: z.string().uuid().optional().nullable(),
  expiration_date: z.string().optional().or(z.literal('')),
})

export type ShipmentItemInput = z.infer<typeof shipmentItemSchema>

// ---------- Transport Conditions ----------

export const transportConditionsSchema = z.object({
  temperature_controlled: z.boolean().optional(),
  temperature_range_c: z.string().max(50).optional().or(z.literal('')),
  packaging_type: z.string().max(200).optional().or(z.literal('')),
  duration_hours: z.number().nonnegative().optional().nullable(),
  distance_km: z.number().nonnegative().optional().nullable(),
  cold_chain_maintained: z.boolean().optional(),
}).optional().nullable()

// ---------- Shipment ----------

export const shipmentSchema = z.object({
  type: z.enum(['inbound', 'outbound'], { message: 'Selecciona un tipo' }),
  supplier_id: z.string().uuid('Selecciona un proveedor').optional().nullable(),
  origin_name: z.string().max(300, 'Máximo 300 caracteres').optional().or(z.literal('')),
  origin_address: z.string().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
  destination_facility_id: z.string().uuid('Selecciona una instalación destino'),
  carrier_name: z.string().max(200).optional().or(z.literal('')),
  carrier_vehicle: z.string().max(200).optional().or(z.literal('')),
  carrier_driver: z.string().max(200).optional().or(z.literal('')),
  carrier_contact: z.string().max(50).optional().or(z.literal('')),
  dispatch_date: z.string().optional().nullable().or(z.literal('')),
  estimated_arrival_date: z.string().optional().nullable().or(z.literal('')),
  transport_conditions: transportConditionsSchema,
  purchase_order_ref: z.string().max(100).optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
  items: z.array(shipmentItemSchema).min(1, 'Agrega al menos una línea'),
}).superRefine((data, ctx) => {
  if (data.type === 'inbound' && !data.supplier_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'El proveedor es requerido para envíos de entrada',
      path: ['supplier_id'],
    })
  }
  if (data.type === 'outbound' && (!data.origin_name || data.origin_name.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'El origen es requerido para envíos de salida',
      path: ['origin_name'],
    })
  }
})

export type ShipmentInput = z.infer<typeof shipmentSchema>

// ---------- Mark Received ----------

export const markReceivedSchema = z.object({
  actual_arrival_date: z.string().min(1, 'La fecha es requerida'),
  received_by: z.string().uuid('Selecciona quién recibió'),
})

export type MarkReceivedInput = z.infer<typeof markReceivedSchema>

// ---------- Inspection Line (PRD 20) ----------

export const inspectionLineSchema = z.object({
  received_quantity: z.number({ message: 'Ingresa la cantidad' }).nonnegative('No puede ser negativo'),
  rejected_quantity: z.number({ message: 'Ingresa la cantidad' }).nonnegative('No puede ser negativo'),
  inspection_result: z.enum(
    ['accepted', 'accepted_with_observations', 'rejected', 'quarantine'],
    { message: 'Selecciona un resultado' },
  ),
  inspection_notes: z.string().max(2000, 'Máximo 2000 caracteres').optional().or(z.literal('')),
  inspection_data: z.record(z.string(), z.unknown()).optional().nullable(),
})

export type InspectionLineInput = z.infer<typeof inspectionLineSchema>

// ---------- Regulatory Document (PRD 20) ----------

export const regulatoryDocumentSchema = z.object({
  doc_type_id: z.string().uuid('Selecciona un tipo de documento'),
  document_number: z.string().max(100).optional().or(z.literal('')),
  issue_date: z.string().min(1, 'La fecha de emisión es requerida'),
  field_data: z.record(z.string(), z.unknown()).default({}),
})

export type RegulatoryDocumentInput = z.infer<typeof regulatoryDocumentSchema>
