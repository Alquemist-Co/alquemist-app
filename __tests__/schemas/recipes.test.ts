import { describe, it, expect } from 'vitest'
import {
  recipeSchema,
  recipeItemSchema,
  executeRecipeSchema,
} from '@/schemas/recipes'

const uuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

// ---------- recipeItemSchema ----------

describe('recipeItemSchema', () => {
  it('accepts valid item', () => {
    const result = recipeItemSchema.safeParse({
      product_id: uuid,
      quantity: 3,
      unit_id: uuid,
    })
    expect(result.success).toBe(true)
  })

  it('rejects zero quantity', () => {
    const result = recipeItemSchema.safeParse({
      product_id: uuid,
      quantity: 0,
      unit_id: uuid,
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative quantity', () => {
    const result = recipeItemSchema.safeParse({
      product_id: uuid,
      quantity: -1,
      unit_id: uuid,
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid UUID', () => {
    const result = recipeItemSchema.safeParse({
      product_id: 'not-uuid',
      quantity: 3,
      unit_id: uuid,
    })
    expect(result.success).toBe(false)
  })
})

// ---------- recipeSchema ----------

describe('recipeSchema', () => {
  const validRecipe = {
    code: 'SOL-001',
    name: 'Solución Nutritiva',
    output_product_id: uuid,
    base_quantity: 1000,
    base_unit_id: uuid,
    items: [{ product_id: uuid, quantity: 3, unit_id: uuid }],
  }

  it('accepts valid recipe with items', () => {
    const result = recipeSchema.safeParse(validRecipe)
    expect(result.success).toBe(true)
  })

  it('rejects empty items array', () => {
    const result = recipeSchema.safeParse({ ...validRecipe, items: [] })
    expect(result.success).toBe(false)
  })

  it('rejects code too long', () => {
    const result = recipeSchema.safeParse({
      ...validRecipe,
      code: 'A'.repeat(51),
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing code', () => {
    const result = recipeSchema.safeParse({ ...validRecipe, code: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing name', () => {
    const result = recipeSchema.safeParse({ ...validRecipe, name: '' })
    expect(result.success).toBe(false)
  })

  it('accepts multiple items', () => {
    const result = recipeSchema.safeParse({
      ...validRecipe,
      items: [
        { product_id: uuid, quantity: 3, unit_id: uuid },
        { product_id: uuid, quantity: 2, unit_id: uuid },
      ],
    })
    expect(result.success).toBe(true)
  })
})

// ---------- executeRecipeSchema ----------

describe('executeRecipeSchema', () => {
  it('accepts valid scale_factor=1', () => {
    const result = executeRecipeSchema.safeParse({
      recipe_id: uuid,
      scale_factor: 1,
    })
    expect(result.success).toBe(true)
  })

  it('rejects scale_factor=0', () => {
    const result = executeRecipeSchema.safeParse({
      recipe_id: uuid,
      scale_factor: 0,
    })
    expect(result.success).toBe(false)
  })

  it('rejects scale_factor > 100', () => {
    const result = executeRecipeSchema.safeParse({
      recipe_id: uuid,
      scale_factor: 101,
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative scale_factor', () => {
    const result = executeRecipeSchema.safeParse({
      recipe_id: uuid,
      scale_factor: -1,
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional batch_id as null', () => {
    const result = executeRecipeSchema.safeParse({
      recipe_id: uuid,
      scale_factor: 1,
      batch_id: null,
    })
    expect(result.success).toBe(true)
  })

  it('accepts optional batch_id as valid UUID', () => {
    const result = executeRecipeSchema.safeParse({
      recipe_id: uuid,
      scale_factor: 1,
      batch_id: uuid,
    })
    expect(result.success).toBe(true)
  })

  it('accepts fractional scale_factor', () => {
    const result = executeRecipeSchema.safeParse({
      recipe_id: uuid,
      scale_factor: 0.5,
    })
    expect(result.success).toBe(true)
  })

  it('accepts optional output_quantity_actual', () => {
    const result = executeRecipeSchema.safeParse({
      recipe_id: uuid,
      scale_factor: 1,
      output_quantity_actual: 950,
    })
    expect(result.success).toBe(true)
  })
})
