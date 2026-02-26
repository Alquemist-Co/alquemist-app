import { z } from 'zod'

// ---------- Form Builder Field ----------

const formFieldSchema = z.object({
  key: z
    .string()
    .min(1, 'La key es requerida')
    .regex(/^[a-z0-9_]+$/, 'Solo minúsculas, números y guión bajo'),
  label: z.string().min(1, 'La etiqueta es requerida'),
  type: z.enum(['text', 'textarea', 'date', 'number', 'boolean', 'select'], {
    message: 'Selecciona un tipo de campo',
  }),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  placeholder: z.string().optional(),
  help_text: z.string().optional(),
})

// ---------- Regulatory Doc Type ----------

export const regulatoryDocTypeSchema = z
  .object({
    code: z
      .string()
      .min(1, 'El código es requerido')
      .max(50, 'Máximo 50 caracteres')
      .regex(/^[A-Z0-9_]+$/, 'Solo mayúsculas, números y guión bajo'),
    name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres'),
    description: z.string().max(1000).optional().or(z.literal('')),
    category: z.enum(['quality', 'transport', 'compliance', 'origin', 'safety', 'commercial'], {
      message: 'Selecciona una categoría',
    }),
    valid_for_days: z.number().int().positive('Debe ser mayor a 0').nullable(),
    issuing_authority: z.string().max(200).optional().or(z.literal('')),
    sort_order: z.number().int().min(0),
    required_fields: z.object({
      fields: z.array(formFieldSchema),
    }),
  })
  .superRefine((data, ctx) => {
    // Unique keys
    const keys = data.required_fields.fields.map((f) => f.key)
    const seen = new Set<string>()
    for (let i = 0; i < keys.length; i++) {
      if (seen.has(keys[i])) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Ya existe un campo con esta key',
          path: ['required_fields', 'fields', i, 'key'],
        })
      }
      seen.add(keys[i])
    }
    // Select fields need at least 2 options
    for (let i = 0; i < data.required_fields.fields.length; i++) {
      const f = data.required_fields.fields[i]
      if (f.type === 'select' && (!f.options || f.options.length < 2)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Los campos tipo 'select' necesitan al menos 2 opciones",
          path: ['required_fields', 'fields', i, 'options'],
        })
      }
    }
  })
export type RegulatoryDocTypeInput = z.infer<typeof regulatoryDocTypeSchema>

// ---------- Product Regulatory Requirement ----------

export const productRequirementSchema = z
  .object({
    product_id: z.string().uuid().nullable(),
    category_id: z.string().uuid().nullable(),
    doc_type_id: z.string().uuid('Selecciona un tipo de documento'),
    is_mandatory: z.boolean(),
    applies_to_scope: z.enum(['per_batch', 'per_lot', 'per_product', 'per_facility'], {
      message: 'Selecciona un alcance',
    }),
    frequency: z.enum(['once', 'per_production', 'annual', 'per_shipment'], {
      message: 'Selecciona una frecuencia',
    }),
    notes: z.string().max(500).optional().or(z.literal('')),
    sort_order: z.number().int().min(0),
  })
  .refine(
    (data) =>
      (data.product_id != null && data.category_id == null) ||
      (data.product_id == null && data.category_id != null),
    {
      message: 'Selecciona un producto o una categoría (no ambos)',
      path: ['product_id'],
    }
  )
export type ProductRequirementInput = z.infer<typeof productRequirementSchema>

// ---------- Shipment Doc Requirement ----------

export const shipmentRequirementSchema = z
  .object({
    product_id: z.string().uuid().nullable(),
    category_id: z.string().uuid().nullable(),
    doc_type_id: z.string().uuid('Selecciona un tipo de documento'),
    is_mandatory: z.boolean(),
    applies_when: z.enum(['always', 'interstate', 'international', 'regulated_material'], {
      message: 'Selecciona cuándo aplica',
    }),
    notes: z.string().max(500).optional().or(z.literal('')),
    sort_order: z.number().int().min(0),
  })
  .refine(
    (data) =>
      (data.product_id != null && data.category_id == null) ||
      (data.product_id == null && data.category_id != null),
    {
      message: 'Selecciona un producto o una categoría (no ambos)',
      path: ['product_id'],
    }
  )
export type ShipmentRequirementInput = z.infer<typeof shipmentRequirementSchema>
