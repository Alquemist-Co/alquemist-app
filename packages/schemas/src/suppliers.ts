import { z } from 'zod'

export const supplierContactInfoSchema = z.object({
  contact_name: z.string().max(200).optional().or(z.literal('')),
  email: z.string().email('Formato de email inválido').optional().or(z.literal('')),
  phone: z.string().max(30).optional().or(z.literal('')),
  phone_secondary: z.string().max(30).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  country: z.string().max(100).optional().or(z.literal('')),
  website: z.string().url('Formato de URL inválido').optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal('')),
})

export type SupplierContactInfo = z.infer<typeof supplierContactInfoSchema>

export const supplierSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres'),
  contact_info: supplierContactInfoSchema,
  payment_terms: z.string().max(200, 'Máximo 200 caracteres').optional().or(z.literal('')),
})

export type SupplierInput = z.infer<typeof supplierSchema>
