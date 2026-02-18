import { z } from "zod";

export const companySchema = z.object({
  name: z.string().min(2, "Minimo 2 caracteres").max(200),
  legalId: z.string().max(50).optional().or(z.literal("")),
  country: z.string().length(2, "Codigo pais de 2 caracteres"),
  timezone: z.string().min(1, "Zona horaria requerida"),
  currency: z.string().length(3, "Codigo moneda de 3 caracteres"),
});

export type CompanyFormData = z.infer<typeof companySchema>;

export type CompanyData = {
  id: string;
  name: string;
  legalId: string | null;
  country: string;
  timezone: string;
  currency: string;
  isActive: boolean;
};
