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

export const companySettingsSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres'),
  legal_id: z.string().max(50, 'Máximo 50 caracteres').optional().or(z.literal('')),
  country: z.string().length(2, 'Selecciona un país'),
  timezone: z.string().min(1, 'Selecciona una zona horaria'),
  currency: z.string().length(3, 'Moneda requerida'),
  regulatory_mode: z.enum(['strict', 'standard', 'none']),
  regulatory_blocking_enabled: z.boolean(),
  features_enabled: z.object({
    quality: z.boolean(),
    regulatory: z.boolean(),
    iot: z.boolean(),
    field_app: z.boolean(),
    cost_tracking: z.boolean(),
  }),
})
export type CompanySettingsInput = z.infer<typeof companySettingsSchema>
