// REQUIRES: pnpm dev:reset before running (resets DB to seed state)
// Run with: pnpm test:integration

import { callFunction, createServiceClient, getTestJwt } from './helpers'

let jwt: string
const batchId = '00000000-0000-0000-000b-000000000005' // v_batch_5 — active, germ phase
const completedBatchId = '00000000-0000-0000-000b-000000000004' // v_batch_4 — completed
const orderId = '00000000-0000-0000-000a-000000000005' // v_order_5

let vegZoneId: string

beforeAll(async () => {
  jwt = await getTestJwt()

  const db = createServiceClient()
  const { data: zone, error: zoneErr } = await db
    .from('zones')
    .select('id')
    .eq('name', 'Vegetativo A')
    .single()
  if (zoneErr) throw new Error(`Failed to load zone: ${zoneErr.message}`)
  vegZoneId = zone!.id
})

describe('transition-batch-phase', () => {
  // --- Auth & validation (no DB mutation) ---

  it('returns 401 when no authorization provided', async () => {
    const { status, data } = await callFunction('transition-batch-phase', {
      body: { batch_id: batchId },
      token: null,
    })
    expect(status).toBe(401)
    expect(data).toEqual({ error: 'Missing authorization' })
  })

  it('returns 401 with invalid token', async () => {
    const { status, data } = await callFunction('transition-batch-phase', {
      body: { batch_id: batchId },
      token: 'invalid-jwt-token',
    })
    expect(status).toBe(401)
    expect(data).toEqual({ error: 'Unauthorized' })
  })

  it('returns 400 when batch_id is missing', async () => {
    const { status, data } = await callFunction('transition-batch-phase', {
      body: {},
      token: jwt,
    })
    expect(status).toBe(400)
    expect(data).toEqual({ error: 'batch_id is required' })
  })

  it('returns 400 when batch does not exist', async () => {
    const { status, data } = await callFunction('transition-batch-phase', {
      body: { batch_id: '00000000-0000-0000-0000-000000000099' },
      token: jwt,
    })
    expect(status).toBe(400)
    expect((data as { error: string }).error).toContain('Batch not found')
  })

  it('returns 400 when batch is not active', async () => {
    const { status, data } = await callFunction('transition-batch-phase', {
      body: { batch_id: completedBatchId },
      token: jwt,
    })
    expect(status).toBe(400)
    expect((data as { error: string }).error).toContain('Batch must be active')
  })

  // --- Happy paths (mutate DB) ---

  it('transitions batch 5 from germ → veg', async () => {
    const { status, data } = await callFunction('transition-batch-phase', {
      body: { batch_id: batchId },
      token: jwt,
    })
    expect(status).toBe(200)

    const result = data as { new_phase_id: string; new_phase_name: string; batch_status: string; is_final: boolean }
    expect(result.new_phase_name).toBe('Vegetativo')
    expect(result.batch_status).toBe('active')
    expect(result.is_final).toBe(false)

    // DB assertions
    const db = createServiceClient()

    // Batch phase updated
    const { data: batch } = await db
      .from('batches')
      .select('current_phase_id, status')
      .eq('id', batchId)
      .single()
    expect(batch!.status).toBe('active')
    expect(batch!.current_phase_id).toBe(result.new_phase_id)

    // Germ phase completed
    const { data: phases } = await db
      .from('production_order_phases')
      .select('status, actual_start_date, actual_end_date, phase_id')
      .eq('order_id', orderId)
      .order('sort_order')
    expect(phases![0].status).toBe('completed')
    expect(phases![0].actual_end_date).toBeTruthy()

    // Veg phase now in_progress
    expect(phases![1].status).toBe('in_progress')
    expect(phases![1].actual_start_date).toBeTruthy()
  })

  it('transitions batch 5 from veg → flor with zone change', async () => {
    const { status, data } = await callFunction('transition-batch-phase', {
      body: { batch_id: batchId, zone_id: vegZoneId },
      token: jwt,
    })
    expect(status).toBe(200)

    const result = data as { new_phase_name: string; batch_status: string; is_final: boolean }
    expect(result.new_phase_name).toBe('Floración')
    expect(result.batch_status).toBe('active')
    expect(result.is_final).toBe(false)

    // Verify zone was updated
    const db = createServiceClient()
    const { data: batch } = await db
      .from('batches')
      .select('zone_id')
      .eq('id', batchId)
      .single()
    expect(batch!.zone_id).toBe(vegZoneId)
  })

  it('order 5 status changed from approved to in_progress', async () => {
    const db = createServiceClient()
    const { data: order } = await db
      .from('production_orders')
      .select('status')
      .eq('id', orderId)
      .single()
    expect(order!.status).toBe('in_progress')
  })
})
