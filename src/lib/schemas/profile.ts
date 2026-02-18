import { z } from "zod";

export const profileSchema = z.object({
  fullName: z
    .string()
    .min(2, "Minimo 2 caracteres")
    .max(100, "Maximo 100 caracteres"),
  phone: z
    .string()
    .max(20)
    .optional()
    .or(z.literal("")),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Contraseña actual requerida"),
    newPassword: z
      .string()
      .min(8, "Minimo 8 caracteres")
      .regex(/[A-Z]/, "Debe contener al menos una mayuscula")
      .regex(/[0-9]/, "Debe contener al menos un numero"),
    confirmPassword: z.string().min(1, "Confirmar contraseña requerida"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
