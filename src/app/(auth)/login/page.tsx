"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { loginSchema, type LoginFormData } from "@/lib/schemas/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/";
  const expired = searchParams.get("expired") === "true";

  const [serverError, setServerError] = useState<string | null>(
    expired ? "Tu sesion ha expirado. Inicia sesion nuevamente." : null
  );

  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginFormData) {
    setServerError(null);

    if (!navigator.onLine) {
      setServerError(
        "Sin conexion a internet. Verifica tu red e intenta nuevamente."
      );
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      setServerError("Credenciales invalidas");
      setFocus("password");
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-card bg-brand">
          <span className="text-2xl font-bold text-white">A</span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand">
          Alquemist
        </h1>
        <p className="text-sm text-text-secondary">
          Sistema de gestion agricola
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="usuario@empresa.co"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Contrasena"
          type="password"
          autoComplete="current-password"
          placeholder="••••••"
          error={errors.password?.message}
          {...register("password")}
        />

        {serverError && (
          <p className="text-sm text-error" role="alert">
            {serverError}
          </p>
        )}

        <Button type="submit" loading={isSubmitting} className="mt-2 w-full">
          Iniciar sesion
        </Button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
