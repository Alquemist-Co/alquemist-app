import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().min(1, 'El email es requerido').email('Formato de email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})
export type LoginInput = z.infer<typeof loginSchema>

export const signupSchema = z.object({
  // Step 1 - Company
  name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres'),
  legal_id: z.string().max(50, 'Máximo 50 caracteres').optional().or(z.literal('')),
  country: z.string().length(2, 'Selecciona un país'),
  timezone: z.string().min(1, 'Selecciona una zona horaria'),
  currency: z.string().length(3, 'Moneda requerida'),
  // Step 2 - Admin
  full_name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres'),
  email: z.string().min(1, 'El email es requerido').email('Formato de email inválido'),
  phone: z.string().max(20, 'Máximo 20 caracteres').optional().or(z.literal('')),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirm_password: z.string().min(1, 'Confirma tu contraseña'),
}).refine((d) => d.password === d.confirm_password, {
  message: 'Las contraseñas no coinciden',
  path: ['confirm_password'],
})
export type SignupInput = z.infer<typeof signupSchema>
