// REQUIRES: pnpm dev:reset before running (resets DB to seed state)
// Run with: pnpm test:integration

import { callFunction, createServiceClient, getTestJwt } from './helpers'

let jwt: string

/** Fetch inventory item ID by batch_number. */
async function getItemByBatch(batchNumber: string) {
  const db = createServiceClient()
  const { data, error } = await db
    .from('inventory_items')
    .select('id, quantity_available, lot_status, cost_per_unit, zone_id')
    .eq('batch_number', batchNumber)
    .single()
  if (error) throw new Error(`Item lookup failed (${batchNumber}): ${error.message}`)
  return data!
}

beforeAll(async () => {
  jwt = await getTestJwt()
})

describe('adjust-inventory', () => {
  // --- Auth & validation ---

  it('returns 401 when no authorization provided', async () => {
    const item = await getItemByBatch('INV-FLORA-001')
    const { status, data } = await callFunction('adjust-inventory', {
      body: { inventory_item_id: item.id, quantity: 1, reason: 'test' },
      token: null,
    })
    expect(status).toBe(401)
    expect(data).toEqual({ error: 'Missing authorization' })
  })

  it('returns 401 with invalid token', async () => {
    const item = await getItemByBatch('INV-FLORA-001')
    const { status, data } = await callFunction('adjust-inventory', {
      body: { inventory_item_id: item.id, quantity: 1, reason: 'test' },
      token: 'invalid-jwt-token',
    })
    expect(status).toBe(401)
    expect(data).toEqual({ error: 'Unauthorized' })
  })

  it('returns 400 when inventory_item_id is missing', async () => {
    const { status, data } = await callFunction('adjust-inventory', {
      body: { quantity: 1, reason: 'test' },
      token: jwt,
    })
    expect(status).toBe(400)
    expect(data).toEqual({ error: 'inventory_item_id is required' })
  })

  it('returns 400 when quantity is zero', async () => {
    const item = await getItemByBatch('INV-FLORA-001')
    const { status, data } = await callFunction('adjust-inventory', {
      body: { inventory_item_id: item.id, quantity: 0, reason: 'test' },
      token: jwt,
    })
    expect(status).toBe(400)
    expect(data).toEqual({ error: 'quantity must be a non-zero number' })
  })

  it('returns 400 when reason is missing', async () => {
    const item = await getItemByBatch('INV-FLORA-001')
    const { status, data } = await callFunction('adjust-inventory', {
      body: { inventory_item_id: item.id, quantity: 1 },
      token: jwt,
    })
    expect(status).toBe(400)
    expect(data).toEqual({ error: 'reason is required' })
  })

  // --- SQL-level validation ---

  it('returns 400 when item is depleted', async () => {
    const item = await getItemByBatch('INV-GROW-DEPLETED')
    const { status, data } = await callFunction('adjust-inventory', {
      body: { inventory_item_id: item.id, quantity: 1, reason: 'test' },
      token: jwt,
    })
    expect(status).toBe(400)
    expect((data as { error: string }).error).toContain('Cannot adjust a depleted lot')
  })

  it('returns 400 when negative adjustment exceeds available quantity', async () => {
    const item = await getItemByBatch('INV-FLORA-LOW')
    // INV-FLORA-LOW has 0.5L available
    const { status, data } = await callFunction('adjust-inventory', {
      body: { inventory_item_id: item.id, quantity: -1, reason: 'excess removal' },
      token: jwt,
    })
    expect(status).toBe(400)
    expect((data as { error: string }).error).toContain('Insufficient quantity')
  })

  // --- Happy paths ---

  it('positive adjustment increases quantity and creates transaction', async () => {
    const itemBefore = await getItemByBatch('INV-PERL-EXPIRING')
    // INV-PERL-EXPIRING: 8 units, cost_per_unit 22000

    const { status, data } = await callFunction('adjust-inventory', {
      body: {
        inventory_item_id: itemBefore.id,
        quantity: 3,
        reason: 'Conteo físico encontró 3 unidades extra',
      },
      token: jwt,
    })

    expect(status).toBe(200)
    const result = data as {
      transaction_id: string
      inventory_item_id: string
      previous_quantity: number
      new_quantity: number
      adjustment: number
    }
    expect(result.inventory_item_id).toBe(itemBefore.id)
    expect(result.previous_quantity).toBe(8)
    expect(result.new_quantity).toBe(11)
    expect(result.adjustment).toBe(3)

    // DB: item quantity updated
    const itemAfter = await getItemByBatch('INV-PERL-EXPIRING')
    expect(itemAfter.quantity_available).toBe(11)
    expect(itemAfter.lot_status).toBe('available')

    // DB: adjustment transaction created
    const db = createServiceClient()
    const { data: txn } = await db
      .from('inventory_transactions')
      .select('type, quantity, cost_per_unit, cost_total, reason')
      .eq('id', result.transaction_id)
      .single()
    expect(txn).toMatchObject({
      type: 'adjustment',
      quantity: 3,
      cost_per_unit: 22000,
      cost_total: 66000,
      reason: 'Conteo físico encontró 3 unidades extra',
    })
  })

  it('negative adjustment decreases quantity and creates transaction', async () => {
    const itemBefore = await getItemByBatch('INV-MICRO-001')
    // INV-MICRO-001: 4L, cost_per_unit 88000

    const { status, data } = await callFunction('adjust-inventory', {
      body: {
        inventory_item_id: itemBefore.id,
        quantity: -1,
        reason: 'Daño por almacenamiento incorrecto',
      },
      token: jwt,
    })

    expect(status).toBe(200)
    const result = data as {
      previous_quantity: number
      new_quantity: number
      adjustment: number
    }
    expect(result.previous_quantity).toBe(4)
    expect(result.new_quantity).toBe(3)
    expect(result.adjustment).toBe(-1)

    // DB: item quantity updated
    const itemAfter = await getItemByBatch('INV-MICRO-001')
    expect(itemAfter.quantity_available).toBe(3)
  })

  it('adjustment to zero auto-depletes the lot', async () => {
    const itemBefore = await getItemByBatch('INV-FLORA-LOW')
    // INV-FLORA-LOW: 0.5L available

    const { status, data } = await callFunction('adjust-inventory', {
      body: {
        inventory_item_id: itemBefore.id,
        quantity: -0.5,
        reason: 'Pérdida total del lote',
      },
      token: jwt,
    })

    expect(status).toBe(200)
    const result = data as { new_quantity: number }
    expect(result.new_quantity).toBe(0)

    // DB: lot_status changed to depleted
    const itemAfter = await getItemByBatch('INV-FLORA-LOW')
    expect(itemAfter.quantity_available).toBe(0)
    expect(itemAfter.lot_status).toBe('depleted')
  })
})
