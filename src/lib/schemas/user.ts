import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email("Email invalido"),
  fullName: z
    .string()
    .min(2, "Minimo 2 caracteres")
    .max(100, "Maximo 100 caracteres"),
  role: z.enum(["admin", "manager", "supervisor", "operator", "viewer"]),
  facilityId: z.string().uuid("Facility invalida").optional().or(z.literal("")),
  password: z.string().min(8, "Minimo 8 caracteres").optional().or(z.literal("")),
});

export type CreateUserData = z.infer<typeof createUserSchema>;
