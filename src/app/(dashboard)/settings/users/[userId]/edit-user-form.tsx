"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/utils/toast-store";
import { updateUser, type UserDetail } from "@/lib/actions/users";
import type { FacilityItem } from "@/lib/actions/areas";

type FormValues = {
  fullName: string;
  role: string;
  facilityId: string;
  phone: string;
};

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Gerente" },
  { value: "supervisor", label: "Supervisor" },
  { value: "operator", label: "Operador" },
  { value: "viewer", label: "Viewer" },
];

export function EditUserForm({
  user,
  facilities,
}: {
  user: UserDetail;
  facilities: FacilityItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      fullName: user.fullName,
      role: user.role,
      facilityId: user.facilityId ?? "",
      phone: user.phone ?? "",
    },
  });

  function onSubmit(data: FormValues) {
    startTransition(async () => {
      const result = await updateUser(user.id, {
        fullName: data.fullName,
        role: data.role,
        facilityId: data.facilityId || null,
        phone: data.phone || null,
      });
      if (result.success) {
        toast.success("Usuario actualizado");
        router.push("/settings/users");
        router.refresh();
      } else {
        toast.error(result.error ?? "Error al actualizar");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <h1 className="text-xl font-extrabold text-text-primary">
        Editar usuario
      </h1>

      <p className="text-sm text-text-secondary">{user.email}</p>

      <Input
        label="Nombre completo"
        {...register("fullName", { required: "Requerido" })}
        error={errors.fullName?.message}
      />

      <div>
        <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-text-secondary">
          Rol
        </label>
        <select
          {...register("role")}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-text-secondary">
          Facility asignada
        </label>
        <select
          {...register("facilityId")}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        >
          <option value="">Sin asignar</option>
          {facilities.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      <Input
        label="Telefono"
        {...register("phone")}
        placeholder="Opcional"
      />

      <div className="flex gap-3">
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
