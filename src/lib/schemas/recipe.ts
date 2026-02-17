import { z } from "zod";

const recipeItemSchema = z.object({
  productId: z.string().uuid("Producto requerido"),
  quantity: z.number().positive("Cantidad debe ser positiva"),
  unitId: z.string().uuid("Unidad requerida"),
});

export const createRecipeSchema = z.object({
  name: z.string().min(2, "Minimo 2 caracteres").max(200),
  code: z.string().min(1, "Codigo requerido").max(50),
  outputProductId: z.string().uuid("Producto de salida requerido"),
  baseQuantity: z.number().positive("Cantidad base debe ser positiva"),
  baseUnitId: z.string().uuid("Unidad requerida"),
  items: z.array(recipeItemSchema).min(1, "Al menos un ingrediente"),
});

export const executeRecipeSchema = z.object({
  recipeId: z.string().uuid(),
  scaleFactor: z.number().positive(),
  zoneId: z.string().uuid("Zona requerida"),
  batchId: z.string().uuid().optional().or(z.literal("")),
});

export type CreateRecipeData = z.infer<typeof createRecipeSchema>;
export type ExecuteRecipeData = z.infer<typeof executeRecipeSchema>;
export type RecipeItem = z.infer<typeof recipeItemSchema>;
