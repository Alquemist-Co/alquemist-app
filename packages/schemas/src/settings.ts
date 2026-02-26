import { z } from 'zod'

export const profileInfoSchema = z.object({
  full_name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres'),
  phone: z.string().max(20, 'Máximo 20 caracteres').optional().or(z.literal('')),
})
export type ProfileInfoInput = z.infer<typeof profileInfoSchema>

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'La contraseña actual es requerida'),
  new_password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirm_password: z.string().min(1, 'Confirma la nueva contraseña'),
}).refine((d) => d.new_password === d.confirm_password, {
  message: 'Las contraseñas no coinciden',
  path: ['confirm_password'],
})
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
