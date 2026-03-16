// REQUIRES: pnpm dev:reset before running (resets DB to seed state)
// Run with: pnpm test:integration

import { callFunction, createServiceClient, getTestJwt } from './helpers'

let jwt: string

/** Fetch inventory item by batch_number. */
async function getItemByBatch(batchNumber: string) {
  const db = createServiceClient()
  const { data, error } = await db
    .from('inventory_items')
    .select('id, quantity_available, lot_status, cost_per_unit, zone_id, unit_id')
    .eq('batch_number', batchNumber)
    .single()
  if (error) throw new Error(`Item lookup failed (${batchNumber}): ${error.message}`)
  return data!
}

/** Fetch zone ID by name. */
async function getZoneByName(name: string) {
  const db = createServiceClient()
  const { data, error } = await db
    .from('zones')
    .select('id, name')
    .eq('name', name)
    .single()
  if (error) throw new Error(`Zone lookup failed (${name}): ${error.message}`)
  return data!
}

beforeAll(async () => {
  jwt = await getTestJwt()
})

describe('transfer-inventory', () => {
  // --- Auth & validation ---

  it('returns 401 when no authorization provided', async () => {
    const item = await getItemByBatch('INV-COCO-NAVE')
    const zone = await getZoneByName('Almacén General')
    const { status, data } = await callFunction('transfer-inventory', {
      body: { inventory_item_id: item.id, destination_zone_id: zone.id, quantity: 1 },
      token: null,
    })
    expect(status).toBe(401)
    expect(data).toEqual({ error: 'Missing authorization' })
  })

  it('returns 401 with invalid token', async () => {
    const item = await getItemByBatch('INV-COCO-NAVE')
    const zone = await getZoneByName('Almacén General')
    const { status, data } = await callFunction('transfer-inventory', {
      body: { inventory_item_id: item.id, destination_zone_id: zone.id, quantity: 1 },
      token: 'invalid-jwt-token',
    })
    expect(status).toBe(401)
    expect(data).toEqual({ error: 'Unauthorized' })
  })

  it('returns 400 when inventory_item_id is missing', async () => {
    const zone = await getZoneByName('Almacén General')
    const { status, data } = await callFunction('transfer-inventory', {
      body: { destination_zone_id: zone.id, quantity: 1 },
      token: jwt,
    })
    expect(status).toBe(400)
    expect(data).toEqual({ error: 'inventory_item_id is required' })
  })

  it('returns 400 when destination_zone_id is missing', async () => {
    const item = await getItemByBatch('INV-COCO-NAVE')
    const { status, data } = await callFunction('transfer-inventory', {
      body: { inventory_item_id: item.id, quantity: 1 },
      token: jwt,
    })
    expect(status).toBe(400)
    expect(data).toEqual({ error: 'destination_zone_id is required' })
  })

  it('returns 400 when quantity is zero or negative', async () => {
    const item = await getItemByBatch('INV-COCO-NAVE')
    const zone = await getZoneByName('Almacén General')
    const { status, data } = await callFunction('transfer-inventory', {
      body: { inventory_item_id: item.id, destination_zone_id: zone.id, quantity: -5 },
      token: jwt,
    })
    expect(status).toBe(400)
    expect(data).toEqual({ error: 'quantity must be a positive number' })
  })

  // --- SQL-level validation ---

  it('returns 400 when item is depleted', async () => {
    const item = await getItemByBatch('INV-GROW-DEPLETED')
    const zone = await getZoneByName('Procesamiento')
    const { status, data } = await callFunction('transfer-inventory', {
      body: { inventory_item_id: item.id, destination_zone_id: zone.id, quantity: 1 },
      token: jwt,
    })
    expect(status).toBe(400)
    expect((data as { error: string }).error).toContain('Cannot transfer from a depleted lot')
  })

  it('returns 400 when quantity exceeds available', async () => {
    // INV-COCO-NAVE has 10 units
    const item = await getItemByBatch('INV-COCO-NAVE')
    const zone = await getZoneByName('Almacén General')
    const { status, data } = await callFunction('transfer-inventory', {
      body: { inventory_item_id: item.id, destination_zone_id: zone.id, quantity: 999 },
      token: jwt,
    })
    expect(status).toBe(400)
    expect((data as { error: string }).error).toContain('Insufficient quantity')
  })

  it('returns 400 when target zone equals source zone', async () => {
    // INV-COCO-NAVE is in Vegetativo A
    const item = await getItemByBatch('INV-COCO-NAVE')
    const { status, data } = await callFunction('transfer-inventory', {
      body: {
        inventory_item_id: item.id,
        destination_zone_id: item.zone_id, // same zone
        quantity: 2,
      },
      token: jwt,
    })
    expect(status).toBe(400)
    expect((data as { error: string }).error).toContain('Target zone must be different')
  })

  // --- Happy path: partial transfer ---

  it('transfers partial quantity to a different zone', async () => {
    // INV-COCO-NAVE: 10 units in Vegetativo A, cost_per_unit 35000
    const sourceBefore = await getItemByBatch('INV-COCO-NAVE')
    const destZone = await getZoneByName('Procesamiento')

    const { status, data } = await callFunction('transfer-inventory', {
      body: {
        inventory_item_id: sourceBefore.id,
        destination_zone_id: destZone.id,
        quantity: 3,
        reason: 'Mover sustrato a zona de procesamiento',
      },
      token: jwt,
    })

    expect(status).toBe(200)
    const result = data as {
      source_item_id: string
      destination_item_id: string
      transfer_out_id: string
      transfer_in_id: string
      quantity: number
      source_remaining: number
    }
    expect(result.source_item_id).toBe(sourceBefore.id)
    expect(result.quantity).toBe(3)
    expect(result.source_remaining).toBe(7)

    // DB: source item decremented
    const sourceAfter = await getItemByBatch('INV-COCO-NAVE')
    expect(sourceAfter.quantity_available).toBe(7)
    expect(sourceAfter.lot_status).toBe('available')

    // DB: destination item created
    const db = createServiceClient()
    const { data: destItem } = await db
      .from('inventory_items')
      .select('id, quantity_available, zone_id, cost_per_unit, source_type, lot_status, unit_id')
      .eq('id', result.destination_item_id)
      .single()
    expect(destItem).toMatchObject({
      quantity_available: 3,
      zone_id: destZone.id,
      cost_per_unit: 35000,
      source_type: 'transfer',
      lot_status: 'available',
      unit_id: sourceBefore.unit_id,
    })

    // DB: transfer_out transaction on source
    const { data: txOut } = await db
      .from('inventory_transactions')
      .select('type, quantity, cost_total, zone_id, target_item_id, related_transaction_id, reason')
      .eq('id', result.transfer_out_id)
      .single()
    expect(txOut).toMatchObject({
      type: 'transfer_out',
      quantity: 3,
      cost_total: 105000, // 3 * 35000
      zone_id: sourceBefore.zone_id,
      target_item_id: result.destination_item_id,
      related_transaction_id: result.transfer_in_id,
      reason: 'Mover sustrato a zona de procesamiento',
    })

    // DB: transfer_in transaction on destination
    const { data: txIn } = await db
      .from('inventory_transactions')
      .select('type, quantity, cost_total, zone_id, related_transaction_id')
      .eq('id', result.transfer_in_id)
      .single()
    expect(txIn).toMatchObject({
      type: 'transfer_in',
      quantity: 3,
      cost_total: 105000,
      zone_id: destZone.id,
      related_transaction_id: result.transfer_out_id,
    })
  })

  // --- Happy path: full transfer depletes source ---

  it('full transfer depletes source lot', async () => {
    // After previous test, INV-COCO-NAVE has 7 units
    const sourceBefore = await getItemByBatch('INV-COCO-NAVE')
    expect(sourceBefore.quantity_available).toBe(7) // guard

    const destZone = await getZoneByName('Almacén General')
    const { status, data } = await callFunction('transfer-inventory', {
      body: {
        inventory_item_id: sourceBefore.id,
        destination_zone_id: destZone.id,
        quantity: 7,
      },
      token: jwt,
    })

    expect(status).toBe(200)
    const result = data as { source_remaining: number }
    expect(result.source_remaining).toBe(0)

    // DB: source depleted
    const sourceAfter = await getItemByBatch('INV-COCO-NAVE')
    expect(sourceAfter.quantity_available).toBe(0)
    expect(sourceAfter.lot_status).toBe('depleted')
  })
})
