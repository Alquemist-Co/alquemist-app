"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/lib/utils/toast-store";
import { updateCompany } from "@/lib/actions/company";
import {
  companySchema,
  type CompanyFormData,
  type CompanyData,
} from "@/lib/schemas/company";

type Props = { company: CompanyData };

export function CompanyForm({ company }: Props) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: company.name,
      legalId: company.legalId ?? "",
      country: company.country,
      timezone: company.timezone,
      currency: company.currency,
    },
  });

  async function onSubmit(data: CompanyFormData) {
    const result = await updateCompany(data);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Datos de empresa actualizados");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-6 lg:py-8">
      <h1 className="mb-6 text-xl font-bold text-text-primary">
        Configuracion de empresa
      </h1>

      <Card className="p-6">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
        >
          <Input
            label="Nombre de la empresa"
            placeholder="Mi Empresa S.A.S."
            error={errors.name?.message}
            {...register("name")}
          />
          <Input
            label="ID legal (NIT/RUT)"
            placeholder="900.123.456-7"
            error={errors.legalId?.message}
            {...register("legalId")}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Pais (ISO 2)"
              placeholder="CO"
              maxLength={2}
              error={errors.country?.message}
              {...register("country")}
            />
            <Input
              label="Moneda (ISO 3)"
              placeholder="COP"
              maxLength={3}
              error={errors.currency?.message}
              {...register("currency")}
            />
          </div>
          <Input
            label="Zona horaria"
            placeholder="America/Bogota"
            error={errors.timezone?.message}
            {...register("timezone")}
          />
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={!isDirty}
            className="self-end"
          >
            Guardar cambios
          </Button>
        </form>
      </Card>
    </div>
  );
}
