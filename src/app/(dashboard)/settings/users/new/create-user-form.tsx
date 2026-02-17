"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserSchema, type CreateUserData } from "@/lib/schemas/user";
import { createUser } from "@/lib/actions/create-user";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/lib/utils/toast-store";
import { cn } from "@/lib/utils/cn";
import { Check, Copy } from "lucide-react";

type Facility = { id: string; name: string };

type Props = {
  facilities: Facility[];
};

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "supervisor", label: "Supervisor" },
  { value: "operator", label: "Operador" },
  { value: "viewer", label: "Viewer" },
] as const;

export function CreateUserForm({ facilities }: Props) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdPassword, setCreatedPassword] = useState("");
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      fullName: "",
      role: "operator",
      facilityId: "",
      password: "",
    },
  });

  async function onSubmit(data: CreateUserData) {
    const result = await createUser(data);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    setCreatedPassword(result.temporaryPassword);
    setShowSuccess(true);
  }

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(createdPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [createdPassword]);

  function handleCloseDialog() {
    setShowSuccess(false);
    setCreatedPassword("");
    setCopied(false);
    reset();
  }

  const selectClasses = cn(
    "h-12 w-full rounded-input border bg-surface-card px-3",
    "font-sans text-sm text-text-primary",
    "transition-colors duration-150",
    "focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand-light/25",
    "appearance-none"
  );

  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <Input
          label="Email"
          type="email"
          autoComplete="off"
          placeholder="usuario@empresa.co"
          error={errors.email?.message}
          {...register("email")}
        />

        <Input
          label="Nombre completo"
          type="text"
          autoComplete="off"
          placeholder="Juan Perez"
          error={errors.fullName?.message}
          {...register("fullName")}
        />

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="role"
            className="text-[11px] font-bold uppercase tracking-wider text-text-secondary"
          >
            Rol
          </label>
          <select
            id="role"
            className={cn(
              selectClasses,
              errors.role ? "border-error" : "border-border"
            )}
            {...register("role")}
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          {errors.role && (
            <p className="text-xs text-error" role="alert">
              {errors.role.message}
            </p>
          )}
        </div>

        {facilities.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="facilityId"
              className="text-[11px] font-bold uppercase tracking-wider text-text-secondary"
            >
              Facility (opcional)
            </label>
            <select
              id="facilityId"
              className={cn(
                selectClasses,
                errors.facilityId ? "border-error" : "border-border"
              )}
              {...register("facilityId")}
            >
              <option value="">Sin asignar</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            {errors.facilityId && (
              <p className="text-xs text-error" role="alert">
                {errors.facilityId.message}
              </p>
            )}
          </div>
        )}

        <Input
          label="Contrasena (opcional)"
          type="password"
          autoComplete="new-password"
          placeholder="Se genera automaticamente si se deja vacio"
          error={errors.password?.message}
          {...register("password")}
        />

        <Button
          type="submit"
          loading={isSubmitting}
          className="mt-2 w-full"
        >
          Crear usuario
        </Button>
      </form>

      <Dialog
        open={showSuccess}
        onClose={handleCloseDialog}
        title="Usuario creado"
        footer={
          <Button
            variant="secondary"
            className="w-full"
            onClick={handleCloseDialog}
          >
            Cerrar
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            El usuario fue creado exitosamente. Comparte la contrasena temporal
            de forma segura.
          </p>
          <div className="flex items-center gap-2 rounded-card border border-border bg-surface p-3">
            <code className="flex-1 font-mono text-base text-text-primary break-all">
              {createdPassword}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-button",
                "text-text-secondary hover:bg-surface-card hover:text-text-primary",
                "transition-colors duration-150",
                "cursor-pointer",
              )}
              aria-label={copied ? "Copiado" : "Copiar contrasena"}
            >
              {copied ? (
                <Check className="size-4 text-success" />
              ) : (
                <Copy className="size-4" />
              )}
            </button>
          </div>
          {copied && (
            <p className="text-xs text-success">Copiado al portapapeles</p>
          )}
        </div>
      </Dialog>
    </>
  );
}
