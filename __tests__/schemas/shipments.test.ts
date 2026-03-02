import { describe, it, expect } from 'vitest'
import {
  shipmentSchema,
  shipmentItemSchema,
  inspectionLineSchema,
  regulatoryDocumentSchema,
  markReceivedSchema,
  docTypeRequiredFieldsSchema,
} from '@/schemas/shipments'

const uuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

// ---------- shipmentSchema ----------

describe('shipmentSchema', () => {
  const validInbound = {
    type: 'inbound' as const,
    supplier_id: uuid,
    destination_facility_id: uuid,
    items: [{ product_id: uuid, expected_quantity: 10, unit_id: uuid }],
  }

  it('accepts valid inbound shipment', () => {
    const result = shipmentSchema.safeParse(validInbound)
    expect(result.success).toBe(true)
  })

  it('rejects inbound without supplier_id', () => {
    const result = shipmentSchema.safeParse({
      ...validInbound,
      supplier_id: null,
    })
    expect(result.success).toBe(false)
  })

  it('rejects outbound without origin_name', () => {
    const result = shipmentSchema.safeParse({
      type: 'outbound',
      destination_facility_id: uuid,
      items: [{ product_id: uuid, expected_quantity: 10, unit_id: uuid }],
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid outbound with origin_name', () => {
    const result = shipmentSchema.safeParse({
      type: 'outbound',
      origin_name: 'Warehouse A',
      destination_facility_id: uuid,
      items: [{ product_id: uuid, expected_quantity: 10, unit_id: uuid }],
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty items array', () => {
    const result = shipmentSchema.safeParse({
      ...validInbound,
      items: [],
    })
    expect(result.success).toBe(false)
  })
})

// ---------- shipmentItemSchema ----------

describe('shipmentItemSchema', () => {
  it('accepts valid item', () => {
    const result = shipmentItemSchema.safeParse({
      product_id: uuid,
      expected_quantity: 10,
      unit_id: uuid,
    })
    expect(result.success).toBe(true)
  })

  it('rejects negative quantity', () => {
    const result = shipmentItemSchema.safeParse({
      product_id: uuid,
      expected_quantity: -5,
      unit_id: uuid,
    })
    expect(result.success).toBe(false)
  })

  it('rejects zero quantity', () => {
    const result = shipmentItemSchema.safeParse({
      product_id: uuid,
      expected_quantity: 0,
      unit_id: uuid,
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid product_id', () => {
    const result = shipmentItemSchema.safeParse({
      product_id: 'not-a-uuid',
      expected_quantity: 10,
      unit_id: uuid,
    })
    expect(result.success).toBe(false)
  })
})

// ---------- inspectionLineSchema ----------

describe('inspectionLineSchema', () => {
  it('accepts valid accepted inspection', () => {
    const result = inspectionLineSchema.safeParse({
      received_quantity: 10,
      rejected_quantity: 0,
      inspection_result: 'accepted',
    })
    expect(result.success).toBe(true)
  })

  it('accepts quarantine result', () => {
    const result = inspectionLineSchema.safeParse({
      received_quantity: 10,
      rejected_quantity: 0,
      inspection_result: 'quarantine',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing inspection_result', () => {
    const result = inspectionLineSchema.safeParse({
      received_quantity: 10,
      rejected_quantity: 0,
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative received_quantity', () => {
    const result = inspectionLineSchema.safeParse({
      received_quantity: -1,
      rejected_quantity: 0,
      inspection_result: 'rejected',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid inspection_result value', () => {
    const result = inspectionLineSchema.safeParse({
      received_quantity: 10,
      rejected_quantity: 0,
      inspection_result: 'maybe',
    })
    expect(result.success).toBe(false)
  })
})

// ---------- regulatoryDocumentSchema ----------

describe('regulatoryDocumentSchema', () => {
  it('accepts valid document', () => {
    const result = regulatoryDocumentSchema.safeParse({
      doc_type_id: uuid,
      issue_date: '2026-01-15',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing issue_date', () => {
    const result = regulatoryDocumentSchema.safeParse({
      doc_type_id: uuid,
      issue_date: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid doc_type_id', () => {
    const result = regulatoryDocumentSchema.safeParse({
      doc_type_id: 'bad',
      issue_date: '2026-01-15',
    })
    expect(result.success).toBe(false)
  })
})

// ---------- markReceivedSchema ----------

describe('markReceivedSchema', () => {
  it('accepts valid input', () => {
    const result = markReceivedSchema.safeParse({
      actual_arrival_date: '2026-01-15T10:30',
      received_by: uuid,
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty date', () => {
    const result = markReceivedSchema.safeParse({
      actual_arrival_date: '',
      received_by: uuid,
    })
    expect(result.success).toBe(false)
  })
})

// ---------- docTypeRequiredFieldsSchema ----------

describe('docTypeRequiredFieldsSchema', () => {
  it('accepts valid structure', () => {
    const result = docTypeRequiredFieldsSchema.safeParse({
      fields: [
        { key: 'lab_name', label: 'Lab Name', type: 'text', required: true },
        { key: 'date', label: 'Date', type: 'date' },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty fields array', () => {
    const result = docTypeRequiredFieldsSchema.safeParse({ fields: [] })
    expect(result.success).toBe(true)
  })

  it('rejects malformed data without fields key', () => {
    const result = docTypeRequiredFieldsSchema.safeParse({ something: 'else' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid field type enum', () => {
    const result = docTypeRequiredFieldsSchema.safeParse({
      fields: [{ key: 'x', label: 'X', type: 'checkbox' }],
    })
    expect(result.success).toBe(false)
  })

  it('accepts field with select options', () => {
    const result = docTypeRequiredFieldsSchema.safeParse({
      fields: [
        {
          key: 'analysis',
          label: 'Analysis Type',
          type: 'select',
          required: true,
          options: ['Potencia', 'Completo'],
        },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejects null input', () => {
    const result = docTypeRequiredFieldsSchema.safeParse(null)
    expect(result.success).toBe(false)
  })
})
