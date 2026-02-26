import { z } from 'zod'

const roleEnum = z.enum(['admin', 'manager', 'supervisor', 'operator', 'viewer'])

const permissionsSchema = z.object({
  can_approve_orders: z.boolean(),
  can_adjust_inventory: z.boolean(),
  can_delete: z.boolean(),
})

export const inviteUserSchema = z.object({
  email: z.string().min(1, 'El email es requerido').email('Email inválido'),
  full_name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres'),
  role: roleEnum,
  assigned_facility_id: z.string().uuid().nullable().optional(),
  permissions: permissionsSchema,
})
export type InviteUserInput = z.infer<typeof inviteUserSchema>

export const editUserSchema = z.object({
  full_name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres'),
  role: roleEnum,
  assigned_facility_id: z.string().uuid().nullable().optional(),
  permissions: permissionsSchema,
})
export type EditUserInput = z.infer<typeof editUserSchema>
