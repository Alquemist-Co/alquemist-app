// REQUIRES: pnpm dev:reset before running (resets DB to seed state)
// Run with: pnpm test:integration

import { callFunction, createServiceClient, getTestJwt } from './helpers'

let jwt: string
let orderId: string
let cancelledOrderId: string
let zoneId: string

beforeAll(async () => {
  jwt = await getTestJwt()

  const db = createServiceClient()

  // Get order IDs
  const { data: orders, error: ordersErr } = await db
    .from('production_orders')
    .select('id, code')
    .in('code', ['OP-2026-0004', 'OP-2026-0003'])
  if (ordersErr) throw new Error(`Failed to load orders: ${ordersErr.message}`)
  const orderMap = Object.fromEntries(orders!.map((o) => [o.code, o.id]))
  orderId = orderMap['OP-2026-0004']
  cancelledOrderId = orderMap['OP-2026-0003']

  // Get a valid zone for approval
  const { data: zone, error: zoneErr } = await db
    .from('zones')
    .select('id')
    .eq('name', 'Propagación')
    .single()
  if (zoneErr) throw new Error(`Failed to load zone: ${zoneErr.message}`)
  zoneId = zone!.id
})

describe('approve-production-order', () => {
  // --- Auth & validation (no DB mutation) ---

  it('returns 401 when no authorization provided', async () => {
    const { status, data } = await callFunction('approve-production-order', {
      body: { order_id: orderId, zone_id: zoneId },
      token: null,
    })
    expect(status).toBe(401)
    expect(data).toEqual({ error: 'Missing authorization' })
  })

  it('returns 401 with invalid token', async () => {
    const { status, data } = await callFunction('approve-production-order', {
      body: { order_id: orderId, zone_id: zoneId },
      token: 'invalid-jwt-token',
    })
    expect(status).toBe(401)
    expect(data).toEqual({ error: 'Unauthorized' })
  })

  it('returns 400 when order_id is missing', async () => {
    const { status, data } = await callFunction('approve-production-order', {
      body: { zone_id: zoneId },
      token: jwt,
    })
    expect(status).toBe(400)
    expect(data).toEqual({ error: 'order_id is required' })
  })

  it('returns 400 when zone_id is missing', async () => {
    const { status, data } = await callFunction('approve-production-order', {
      body: { order_id: orderId },
      token: jwt,
    })
    expect(status).toBe(400)
    expect(data).toEqual({ error: 'zone_id is required' })
  })

  it('returns 400 when order does not exist', async () => {
    const { status, data } = await callFunction('approve-production-order', {
      body: { order_id: '00000000-0000-0000-0000-000000000099', zone_id: zoneId },
      token: jwt,
    })
    expect(status).toBe(400)
    expect((data as { error: string }).error).toContain('Production order not found')
  })

  it('returns 400 when order is not in draft status', async () => {
    const { status, data } = await callFunction('approve-production-order', {
      body: { order_id: cancelledOrderId, zone_id: zoneId },
      token: jwt,
    })
    expect(status).toBe(400)
    expect((data as { error: string }).error).toContain('draft status to approve')
  })

  // --- Happy path (mutates DB) ---

  it('approves order and creates batch', async () => {
    const { status, data } = await callFunction('approve-production-order', {
      body: { order_id: orderId, zone_id: zoneId },
      token: jwt,
    })
    expect(status).toBe(200)

    const result = data as { batch_id: string; batch_code: string; scheduled_activities_count: number }
    expect(result.batch_code).toMatch(/^LOT-OGK-/)
    expect(result.batch_id).toBeDefined()
    expect(result.scheduled_activities_count).toBe(0)

    // DB assertions
    const db = createServiceClient()

    // Order status changed to approved
    const { data: order } = await db
      .from('production_orders')
      .select('status')
      .eq('id', orderId)
      .single()
    expect(order!.status).toBe('approved')

    // Batch created with correct data
    const { data: batch } = await db
      .from('batches')
      .select('id, code, cultivar_id, zone_id, current_phase_id, production_order_id, plant_count, status')
      .eq('id', result.batch_id)
      .single()
    expect(batch).toBeTruthy()
    expect(batch!.code).toBe(result.batch_code)
    expect(batch!.production_order_id).toBe(orderId)
    expect(batch!.plant_count).toBe(25)
    expect(batch!.status).toBe('active')

    // First phase updated to ready with batch_id
    const { data: phases } = await db
      .from('production_order_phases')
      .select('status, batch_id')
      .eq('order_id', orderId)
      .order('sort_order')
    expect(phases![0].status).toBe('ready')
    expect(phases![0].batch_id).toBe(result.batch_id)
    // Other phases still pending
    expect(phases![1].status).toBe('pending')
  })

  // --- Post-mutation error ---

  it('returns 400 when re-approving already approved order', async () => {
    const { status, data } = await callFunction('approve-production-order', {
      body: { order_id: orderId, zone_id: zoneId },
      token: jwt,
    })
    expect(status).toBe(400)
    expect((data as { error: string }).error).toContain('draft status to approve')
  })
})
