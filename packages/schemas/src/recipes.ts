import { z } from 'zod'

// ---------- Recipe Item (ingredient in JSONB) ----------

export const recipeItemSchema = z.object({
  product_id: z.string().uuid('Selecciona un producto'),
  quantity: z.number({ message: 'Ingresa la cantidad' }).positive('La cantidad debe ser mayor a 0'),
  unit_id: z.string().uuid('Selecciona una unidad'),
})

export type RecipeItemInput = z.infer<typeof recipeItemSchema>

// ---------- Recipe ----------

export const recipeSchema = z.object({
  code: z
    .string()
    .min(1, 'El código es requerido')
    .max(50, 'Máximo 50 caracteres'),
  name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres'),
  output_product_id: z.string().uuid('Selecciona un producto resultante'),
  base_quantity: z.number({ message: 'Ingresa la cantidad' }).positive('La cantidad debe ser mayor a 0'),
  base_unit_id: z.string().uuid('Selecciona una unidad'),
  items: z.array(recipeItemSchema).min(1, 'Agrega al menos un ingrediente'),
})

export type RecipeInput = z.infer<typeof recipeSchema>

// ---------- Execute Recipe ----------

export const executeRecipeSchema = z.object({
  recipe_id: z.string().uuid(),
  scale_factor: z
    .number({ message: 'Ingresa el factor' })
    .positive('El factor debe ser mayor a 0')
    .max(100, 'Factor demasiado grande'),
  output_quantity_actual: z.number().positive('Debe ser mayor a 0').optional().nullable(),
  batch_id: z.string().uuid().optional().nullable(),
})

export type ExecuteRecipeInput = z.infer<typeof executeRecipeSchema>
