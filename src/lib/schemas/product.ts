import { z } from "zod";

export const createProductSchema = z.object({
  sku: z
    .string()
    .min(1, "SKU requerido")
    .max(50, "Maximo 50 caracteres"),
  name: z
    .string()
    .min(2, "Minimo 2 caracteres")
    .max(200, "Maximo 200 caracteres"),
  categoryId: z.string().uuid("Categoria requerida"),
  defaultUnitId: z.string().uuid("Unidad requerida"),
  cultivarId: z.string().uuid().optional().or(z.literal("")),
  procurementType: z.enum(["purchased", "produced", "both"]),
  lotTracking: z.enum(["required", "optional", "none"]),
  shelfLifeDays: z.number().int().nonnegative().optional(),
  phiDays: z.number().int().nonnegative().optional(),
  reiHours: z.number().int().nonnegative().optional(),
  defaultPrice: z.number().nonnegative().optional(),
  priceCurrency: z.string().max(3).optional().or(z.literal("")),
  preferredSupplierId: z.string().uuid().optional().or(z.literal("")),
  minStockThreshold: z.number().nonnegative().optional(),
});

export const updateProductSchema = createProductSchema.extend({
  id: z.string().uuid(),
});

export type CreateProductData = z.infer<typeof createProductSchema>;
export type UpdateProductData = z.infer<typeof updateProductSchema>;
