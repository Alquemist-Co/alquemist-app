// REQUIRES: pnpm dev:reset before running (resets DB to seed state)
// Run with: pnpm test:integration

import { callFunction, createServiceClient, getTestJwt } from './helpers'

let jwt: string
let shipmentIds: Record<string, string>

beforeAll(async () => {
  jwt = await getTestJwt()

  const db = createServiceClient()
  const { data, error } = await db
    .from('shipments')
    .select('id, shipment_code')
    .in('shipment_code', ['SHP-2026-0004', 'SHP-2026-0005', 'SHP-2026-0006'])
  if (error) throw new Error(`Failed to load shipments: ${error.message}`)
  shipmentIds = Object.fromEntries(data!.map((s) => [s.shipment_code, s.id]))
})

describe('confirm-shipment-receipt', () => {
  // --- Auth & validation (no DB mutation) ---

  it('returns 401 when no authorization provided', async () => {
    const { status, data } = await callFunction('confirm-shipment-receipt', {
      body: { shipment_id: shipmentIds['SHP-2026-0005'] },
      token: null,
    })
    expect(status).toBe(401)
    expect(data).toEqual({ error: 'Missing authorization' })
  })

  it('returns 401 with invalid token', async () => {
    const { status, data } = await callFunction('confirm-shipment-receipt', {
      body: { shipment_id: shipmentIds['SHP-2026-0005'] },
      token: 'invalid-jwt-token',
    })
    expect(status).toBe(401)
    expect(data).toEqual({ error: 'Unauthorized' })
  })

  it('returns 400 when shipment_id is missing', async () => {
    const { status, data } = await callFunction('confirm-shipment-receipt', {
      body: {},
      token: jwt,
    })
    expect(status).toBe(400)
    expect(data).toEqual({ error: 'shipment_id is required' })
  })

  it('returns 400 when shipment has uninspected items (SHP-2026-0004)', async () => {
    const { status, data } = await callFunction('confirm-shipment-receipt', {
      body: { shipment_id: shipmentIds['SHP-2026-0004'] },
      token: jwt,
    })
    expect(status).toBe(400)
    expect((data as { error: string }).error).toContain(
      'All shipment lines must be inspected before confirming',
    )
  })

  // --- Happy path: all rejected (SHP-2026-0005) ---

  it('confirms fully-inspected all-rejected shipment', async () => {
    const { status, data } = await callFunction('confirm-shipment-receipt', {
      body: { shipment_id: shipmentIds['SHP-2026-0005'] },
      token: jwt,
    })
    expect(status).toBe(200)
    expect(data).toMatchObject({
      status: 'rejected',
      items_created: 0,
      shipment_id: shipmentIds['SHP-2026-0005'],
    })

    // DB assertion: shipment status changed
    const db = createServiceClient()
    const { data: shipment } = await db
      .from('shipments')
      .select('status')
      .eq('id', shipmentIds['SHP-2026-0005'])
      .single()
    expect(shipment!.status).toBe('rejected')
  })

  // --- Happy path: quarantine (SHP-2026-0006) ---

  it('confirms fully-inspected quarantine shipment', async () => {
    const { status, data } = await callFunction('confirm-shipment-receipt', {
      body: { shipment_id: shipmentIds['SHP-2026-0006'] },
      token: jwt,
    })
    expect(status).toBe(200)
    expect(data).toMatchObject({
      status: 'partial_accepted',
      items_created: 1,
      shipment_id: shipmentIds['SHP-2026-0006'],
    })

    // DB assertions
    const db = createServiceClient()

    // Shipment status changed
    const { data: shipment } = await db
      .from('shipments')
      .select('status')
      .eq('id', shipmentIds['SHP-2026-0006'])
      .single()
    expect(shipment!.status).toBe('partial_accepted')

    // Inventory item created with quarantine lot_status
    const { data: items } = await db
      .from('shipment_items')
      .select('inventory_item_id')
      .eq('shipment_id', shipmentIds['SHP-2026-0006'])
      .not('inventory_item_id', 'is', null)
    expect(items).toHaveLength(1)

    const { data: invItem } = await db
      .from('inventory_items')
      .select('lot_status, quantity_available, source_type')
      .eq('id', items![0].inventory_item_id)
      .single()
    expect(invItem).toMatchObject({
      lot_status: 'quarantine',
      quantity_available: 200,
      source_type: 'purchase',
    })

    // Receipt transaction created
    const { data: txns } = await db
      .from('inventory_transactions')
      .select('type, quantity')
      .eq('inventory_item_id', items![0].inventory_item_id)
    expect(txns).toHaveLength(1)
    expect(txns![0]).toMatchObject({ type: 'receipt', quantity: 200 })
  })

  // --- Post-mutation error ---

  it('returns 400 when re-confirming already confirmed shipment', async () => {
    const { status, data } = await callFunction('confirm-shipment-receipt', {
      body: { shipment_id: shipmentIds['SHP-2026-0005'] },
      token: jwt,
    })
    expect(status).toBe(400)
    expect((data as { error: string }).error).toContain(
      'received or inspecting status',
    )
  })
})
