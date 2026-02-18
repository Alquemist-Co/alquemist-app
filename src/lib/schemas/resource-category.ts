import { z } from "zod";

export const categorySchema = z.object({
  name: z
    .string()
    .min(2, "Minimo 2 caracteres")
    .max(100, "Maximo 100 caracteres"),
  code: z
    .string()
    .min(1, "Codigo requerido")
    .max(50, "Maximo 50 caracteres"),
  parentId: z.string().uuid().optional().or(z.literal("")),
  icon: z.string().max(50).optional().or(z.literal("")),
  color: z.string().max(20).optional().or(z.literal("")),
  isConsumable: z.boolean(),
  isDepreciable: z.boolean(),
  isTransformable: z.boolean(),
  defaultLotTracking: z.enum(["required", "optional", "none"]),
});

export const updateCategorySchema = categorySchema.extend({
  id: z.string().uuid(),
});

export type CategoryFormData = z.infer<typeof categorySchema>;
export type UpdateCategoryData = z.infer<typeof updateCategorySchema>;
