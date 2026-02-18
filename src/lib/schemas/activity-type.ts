import { z } from "zod";

export const activityTypeSchema = z.object({
  name: z
    .string()
    .min(2, "Minimo 2 caracteres")
    .max(100, "Maximo 100 caracteres"),
  category: z.string().max(100).optional().or(z.literal("")),
});

export const updateActivityTypeSchema = activityTypeSchema.extend({
  id: z.string().uuid(),
});

export type ActivityTypeFormData = z.infer<typeof activityTypeSchema>;
export type UpdateActivityTypeData = z.infer<typeof updateActivityTypeSchema>;
