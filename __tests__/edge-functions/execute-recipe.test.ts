// REQUIRES: pnpm dev:reset before running (resets DB to seed state)
// Run with: pnpm test:integration

import { callFunction, createServiceClient, getTestJwt } from './helpers'

let jwt: string
let recipeIds: Record<string, string>

beforeAll(async () => {
  jwt = await getTestJwt()

  const db = createServiceClient()
  const { data, error } = await db
    .from('recipes')
    .select('id, code')
    .in('code', ['SOL-FLORA-1K', 'SOL-GROW-1K'])
  if (error) throw new Error(`Failed to load recipes: ${error.message}`)
  recipeIds = Object.fromEntries(data!.map((r) => [r.code, r.id]))
})

describe('execute-recipe', () => {
  // --- Auth & validation (no DB mutation) ---

  it('returns 401 when no authorization provided', async () => {
    const { status, data } = await callFunction('execute-recipe', {
      body: { recipe_id: recipeIds['SOL-FLORA-1K'], scale_factor: 1 },
      token: null,
    })
    expect(status).toBe(401)
    expect(data).toEqual({ error: 'Missing authorization' })
  })

  it('returns 401 with invalid token', async () => {
    const { status, data } = await callFunction('execute-recipe', {
      body: { recipe_id: recipeIds['SOL-FLORA-1K'], scale_factor: 1 },
      token: 'invalid-jwt-token',
    })
    expect(status).toBe(401)
    expect(data).toEqual({ error: 'Unauthorized' })
  })

  it('returns 400 when recipe_id is missing', async () => {
    const { status, data } = await callFunction('execute-recipe', {
      body: { scale_factor: 1 },
      token: jwt,
    })
    expect(status).toBe(400)
    expect(data).toEqual({
      error: 'recipe_id and scale_factor are required',
    })
  })

  it('returns 400 when scale_factor is missing', async () => {
    const { status, data } = await callFunction('execute-recipe', {
      body: { recipe_id: recipeIds['SOL-FLORA-1K'] },
      token: jwt,
    })
    expect(status).toBe(400)
    expect(data).toEqual({
      error: 'recipe_id and scale_factor are required',
    })
  })

  it('returns 400 when recipe does not exist', async () => {
    const { status, data } = await callFunction('execute-recipe', {
      body: {
        recipe_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        scale_factor: 1,
      },
      token: jwt,
    })
    expect(status).toBe(400)
    expect((data as { error: string }).error).toContain(
      'Recipe not found or inactive',
    )
  })

  // --- Happy path: SOL-FLORA-1K at scale 1.0 ---
  // Consumes: FERT-FLORA 3L + FERT-MICRO 2L
  // Seed stock: FERT-FLORA 5.5L total, FERT-MICRO 4L

  it('executes SOL-FLORA-1K at scale_factor=1 successfully', async () => {
    const db = createServiceClient()

    // Snapshot pre-execution stock for FERT-FLORA
    const { data: floraStockBefore } = await db
      .from('inventory_items')
      .select('id, quantity_available')
      .eq('product_id', (await db.from('products').select('id').eq('sku', 'FERT-FLORA').single()).data!.id)
      .eq('lot_status', 'available')
      .gt('quantity_available', 0)
    const totalFloraBefore = floraStockBefore!.reduce(
      (sum, i) => sum + Number(i.quantity_available),
      0,
    )

    const { status, data } = await callFunction('execute-recipe', {
      body: { recipe_id: recipeIds['SOL-FLORA-1K'], scale_factor: 1 },
      token: jwt,
    })

    expect(status).toBe(200)
    const result = data as Record<string, unknown>
    expect(result.execution_id).toBeDefined()
    expect(result.output_inventory_item_id).toBeDefined()
    expect(result.output_quantity_actual).toBe(1000)
    expect(result.yield_pct).toBe(100)

    // DB assertions: recipe_execution created
    const { data: execution } = await db
      .from('recipe_executions')
      .select('scale_factor, output_quantity_expected, output_quantity_actual, yield_pct')
      .eq('id', result.execution_id as string)
      .single()
    expect(execution).toMatchObject({
      scale_factor: 1,
      output_quantity_expected: 1000,
      output_quantity_actual: 1000,
      yield_pct: 100,
    })

    // DB assertions: consumption transactions created
    const { data: consumptions } = await db
      .from('inventory_transactions')
      .select('type, quantity')
      .eq('recipe_execution_id', result.execution_id as string)
      .eq('type', 'consumption')
    expect(consumptions!.length).toBeGreaterThanOrEqual(2)

    // DB assertions: transformation_in transaction created
    const { data: transformations } = await db
      .from('inventory_transactions')
      .select('type, quantity')
      .eq('recipe_execution_id', result.execution_id as string)
      .eq('type', 'transformation_in')
    expect(transformations).toHaveLength(1)
    expect(transformations![0].quantity).toBe(1000)

    // DB assertions: output inventory_item created
    const { data: outputItem } = await db
      .from('inventory_items')
      .select('source_type, lot_status, quantity_available')
      .eq('id', result.output_inventory_item_id as string)
      .single()
    expect(outputItem).toMatchObject({
      source_type: 'production',
      lot_status: 'available',
      quantity_available: 1000,
    })

    // DB assertions: FERT-FLORA stock decreased by 3L
    const { data: floraStockAfter } = await db
      .from('inventory_items')
      .select('id, quantity_available')
      .eq('product_id', (await db.from('products').select('id').eq('sku', 'FERT-FLORA').single()).data!.id)
      .in('lot_status', ['available', 'depleted'])
      .in('id', floraStockBefore!.map((i) => i.id))
    const totalFloraAfter = floraStockAfter!.reduce(
      (sum, i) => sum + Number(i.quantity_available),
      0,
    )
    expect(totalFloraBefore - totalFloraAfter).toBeCloseTo(3, 1)
  })

  // --- Happy path: SOL-GROW-1K at scale 0.5 with custom output ---
  // Consumes: FERT-GROW 1.25L + FERT-MICRO 0.75L
  // output_quantity_actual=450, expected=500 → yield=90%

  it('executes SOL-GROW-1K at scale_factor=0.5 with output_quantity_actual', async () => {
    const { status, data } = await callFunction('execute-recipe', {
      body: {
        recipe_id: recipeIds['SOL-GROW-1K'],
        scale_factor: 0.5,
        output_quantity_actual: 450,
      },
      token: jwt,
    })

    expect(status).toBe(200)
    const result = data as Record<string, unknown>
    expect(result.execution_id).toBeDefined()
    expect(result.output_quantity_actual).toBe(450)
    expect(result.yield_pct).toBe(90)

    // DB assertion: output_quantity_actual stored correctly
    const db = createServiceClient()
    const { data: execution } = await db
      .from('recipe_executions')
      .select('output_quantity_actual, yield_pct')
      .eq('id', result.execution_id as string)
      .single()
    expect(execution).toMatchObject({
      output_quantity_actual: 450,
      yield_pct: 90,
    })
  })

  // --- Insufficient stock (after tests 6+7 consumed inventory) ---
  // FERT-FLORA remaining: ~2.5L (5.5 - 3). Needs 3L → insufficient

  it('returns 400 with insufficient stock', async () => {
    const { status, data } = await callFunction('execute-recipe', {
      body: { recipe_id: recipeIds['SOL-FLORA-1K'], scale_factor: 1 },
      token: jwt,
    })
    expect(status).toBe(400)
    expect((data as { error: string }).error).toContain('Insufficient stock')
  })
})
