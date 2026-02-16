"use client";

import { useAuth } from "@/hooks/use-auth";
import { ROLE_LABELS } from "@/lib/nav/navigation";

const ROLE_DESCRIPTIONS: Record<string, string> = {
  operator: "Gestiona actividades diarias, registra datos de campo e inventario.",
  supervisor: "Supervisa batches, actividades y operaciones del equipo.",
  manager: "Administra ordenes de produccion, costos y reportes.",
  admin: "Configura el sistema, gestiona usuarios y acceso completo.",
  viewer: "Consulta datos de produccion, calidad y batches.",
};

export default function DashboardPage() {
  const { fullName, role } = useAuth();

  const firstName = fullName?.split(" ")[0] ?? "Usuario";
  const roleLabel = role ? ROLE_LABELS[role] : "";
  const roleDesc = role ? ROLE_DESCRIPTIONS[role] ?? "" : "";

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-text-primary">
          Bienvenido, {firstName}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {roleLabel} — {roleDesc}
        </p>
      </div>

      <div className="flex flex-col items-center justify-center py-16">
        <div className="flex size-16 items-center justify-center rounded-card bg-brand">
          <span className="text-2xl font-bold text-white">A</span>
        </div>
        <p className="mt-4 text-sm text-text-secondary">
          Dashboard en desarrollo. Proximamente.
        </p>
      </div>
    </div>
  );
}
