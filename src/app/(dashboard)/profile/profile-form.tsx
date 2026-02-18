"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Toggle } from "@/components/ui/toggle";
import { toast } from "@/lib/utils/toast-store";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import { createClient } from "@/lib/supabase/client";
import {
  profileSchema,
  changePasswordSchema,
  type ProfileFormData,
  type ChangePasswordFormData,
} from "@/lib/schemas/profile";
import { updateProfile, type ProfileData } from "@/lib/actions/profile";
import { ROLE_LABELS } from "@/lib/nav/navigation";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

type Props = { profile: ProfileData };

export function ProfileForm({ profile }: Props) {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const storeState = useAuthStore();

  // Profile form
  const {
    register: regProfile,
    handleSubmit: handleProfile,
    formState: { errors: profileErrors, isSubmitting: savingProfile, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile.fullName,
      phone: profile.phone ?? "",
    },
  });

  // Password form
  const {
    register: regPassword,
    handleSubmit: handlePassword,
    reset: resetPassword,
    formState: { errors: pwErrors, isSubmitting: savingPassword },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });

  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  async function onProfileSubmit(data: ProfileFormData) {
    const result = await updateProfile(data);
    if (!result.success) {
      toast.error(result.error);
      return;
    }

    // Update auth store
    if (storeState.userId && storeState.email && storeState.role && storeState.companyId) {
      setAuth({
        userId: storeState.userId,
        email: storeState.email,
        fullName: data.fullName,
        role: storeState.role,
        companyId: storeState.companyId,
        facilityId: storeState.facilityId,
      });
    }

    toast.success("Perfil actualizado");
    router.refresh();
  }

  async function onPasswordSubmit(data: ChangePasswordFormData) {
    const supabase = createClient();

    // Verify current password
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: data.currentPassword,
    });

    if (signInErr) {
      toast.error("Contraseña actual incorrecta");
      return;
    }

    // Update password
    const { error: updateErr } = await supabase.auth.updateUser({
      password: data.newPassword,
    });

    if (updateErr) {
      toast.error(updateErr.message);
      return;
    }

    toast.success("Contraseña actualizada");
    resetPassword();
  }

  const lastLogin = profile.lastSignInAt
    ? new Date(profile.lastSignInAt).toLocaleString("es-CO", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Nunca";

  return (
    <div className="mx-auto max-w-lg px-4 py-6 lg:px-6 lg:py-8">
      <h1 className="mb-6 text-xl font-bold text-text-primary">Mi perfil</h1>

      {/* Avatar + info */}
      <div className="mb-6 flex items-center gap-4">
        <div
          className={cn(
            "flex size-16 items-center justify-center rounded-full",
            "bg-brand text-white text-xl font-bold",
          )}
        >
          {getInitials(profile.fullName)}
        </div>
        <div>
          <p className="text-base font-bold text-text-primary">
            {profile.fullName}
          </p>
          <p className="text-sm text-text-secondary">{profile.email}</p>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="filled">
              {ROLE_LABELS[profile.role as keyof typeof ROLE_LABELS] ??
                profile.role}
            </Badge>
            {profile.facilityName && (
              <span className="text-xs text-text-secondary">
                {profile.facilityName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Profile card */}
      <Card className="mb-4 p-5">
        <h2 className="mb-4 text-sm font-bold text-text-primary">
          Datos personales
        </h2>
        <form
          onSubmit={handleProfile(onProfileSubmit)}
          className="flex flex-col gap-4"
        >
          <Input
            label="Nombre completo"
            error={profileErrors.fullName?.message}
            {...regProfile("fullName")}
          />
          <Input
            label="Telefono (opcional)"
            placeholder="+57 300 123 4567"
            error={profileErrors.phone?.message}
            {...regProfile("phone")}
          />
          <Input label="Email" value={profile.email} disabled />
          <p className="text-xs text-text-secondary">
            Ultimo acceso: {lastLogin}
          </p>
          <Button
            type="submit"
            loading={savingProfile}
            disabled={!isDirty}
            className="self-end"
          >
            Guardar cambios
          </Button>
        </form>
      </Card>

      {/* Notifications card (F-088) */}
      <NotificationsCard />

      {/* Password card */}
      <Card className="p-5">
        <h2 className="mb-4 text-sm font-bold text-text-primary">
          Cambiar contraseña
        </h2>
        <form
          onSubmit={handlePassword(onPasswordSubmit)}
          className="flex flex-col gap-4"
        >
          <div className="relative">
            <Input
              label="Contraseña actual"
              type={showCurrentPw ? "text" : "password"}
              error={pwErrors.currentPassword?.message}
              {...regPassword("currentPassword")}
            />
            <button
              type="button"
              onClick={() => setShowCurrentPw((v) => !v)}
              className="absolute right-3 top-8 text-xs text-text-secondary"
            >
              {showCurrentPw ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          <div className="relative">
            <Input
              label="Nueva contraseña"
              type={showNewPw ? "text" : "password"}
              error={pwErrors.newPassword?.message}
              {...regPassword("newPassword")}
            />
            <button
              type="button"
              onClick={() => setShowNewPw((v) => !v)}
              className="absolute right-3 top-8 text-xs text-text-secondary"
            >
              {showNewPw ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          <Input
            label="Confirmar nueva contraseña"
            type="password"
            error={pwErrors.confirmPassword?.message}
            {...regPassword("confirmPassword")}
          />
          <Button
            type="submit"
            loading={savingPassword}
            className="self-end"
          >
            Cambiar contraseña
          </Button>
        </form>
      </Card>
    </div>
  );
}

function NotificationsCard() {
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;
    // Defer state updates to avoid synchronous setState in effect
    Promise.resolve().then(() => {
      if ("Notification" in window && "serviceWorker" in navigator) {
        setPushSupported(true);
        setPushEnabled(Notification.permission === "granted");
      }
    });
  }, []);

  async function togglePush(enabled: boolean) {
    if (!enabled) {
      // Can't programmatically revoke — just update UI
      setPushEnabled(false);
      localStorage.setItem("alquemist-push-enabled", "false");
      toast.success("Notificaciones desactivadas");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setPushEnabled(true);
      localStorage.setItem("alquemist-push-enabled", "true");
      toast.success("Notificaciones activadas");
    } else {
      toast.error("Permiso de notificaciones denegado");
    }
  }

  if (!pushSupported) return null;

  return (
    <Card className="mb-4 p-5">
      <h2 className="mb-4 text-sm font-bold text-text-primary">
        Notificaciones
      </h2>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-text-primary">Notificaciones push</p>
          <p className="text-xs text-text-secondary">
            Recibir alertas criticas en el navegador
          </p>
        </div>
        <Toggle
          checked={pushEnabled}
          onChange={togglePush}
          label="Notificaciones push"
        />
      </div>
    </Card>
  );
}
