import { z } from "zod";

export const supplierSchema = z.object({
  name: z
    .string()
    .min(2, "Minimo 2 caracteres")
    .max(200, "Maximo 200 caracteres"),
  email: z.string().email("Email invalido").optional().or(z.literal("")),
  phone: z.string().max(50).optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  website: z.string().max(200).optional().or(z.literal("")),
  paymentTerms: z.string().max(200).optional().or(z.literal("")),
});

export const updateSupplierSchema = supplierSchema.extend({
  id: z.string().uuid(),
});

export type SupplierFormData = z.infer<typeof supplierSchema>;
export type UpdateSupplierData = z.infer<typeof updateSupplierSchema>;
