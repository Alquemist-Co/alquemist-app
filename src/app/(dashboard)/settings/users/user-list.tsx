"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "@/lib/utils/toast-store";
import { toggleUserActive, type UserListItem } from "@/lib/actions/users";
import { Plus, Users, Search } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Gerente",
  supervisor: "Supervisor",
  operator: "Operador",
  viewer: "Viewer",
};

const ROLE_VARIANTS: Record<
  string,
  "filled" | "success" | "warning" | "error" | "outlined"
> = {
  admin: "error",
  manager: "warning",
  supervisor: "filled",
  operator: "success",
  viewer: "outlined",
};

export function UserList({ users }: { users: UserListItem[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(filter.toLowerCase()) ||
      u.email.toLowerCase().includes(filter.toLowerCase()) ||
      u.role.toLowerCase().includes(filter.toLowerCase()),
  );

  function handleToggle(userId: string) {
    startTransition(async () => {
      const result = await toggleUserActive(userId);
      if (result.success) {
        toast.success("Estado del usuario actualizado");
        router.refresh();
      } else {
        toast.error(result.error ?? "Error al actualizar");
      }
    });
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-xl font-extrabold text-text-primary">
            Usuarios
          </h1>
          <Link href="/settings/users/new">
            <Button variant="primary">
              <Plus className="mr-1.5 h-4 w-4" />
              Nuevo usuario
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="Buscar por nombre, email o rol..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full rounded-md border border-border bg-surface py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Sin usuarios"
            description={
              filter
                ? "No se encontraron usuarios con ese filtro."
                : "Crea el primer usuario."
            }
          />
        ) : (
          <div className={`space-y-2 ${isPending ? "opacity-60" : ""}`}>
            {filtered.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 rounded-card border border-border bg-surface-card p-3"
              >
                {/* Avatar */}
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">
                  {user.fullName
                    .split(" ")
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-text-primary">
                      {user.fullName}
                    </span>
                    <Badge
                      variant={ROLE_VARIANTS[user.role] ?? "outlined"}
                    >
                      {ROLE_LABELS[user.role] ?? user.role}
                    </Badge>
                    {!user.isActive && (
                      <Badge variant="outlined">Inactivo</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-text-secondary">
                    {user.email}
                    {user.facilityName && ` — ${user.facilityName}`}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 gap-1">
                  <Link href={`/settings/users/${user.id}`}>
                    <Button variant="ghost" className="text-xs">
                      Editar
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    className="text-xs"
                    onClick={() => handleToggle(user.id)}
                  >
                    {user.isActive ? "Desactivar" : "Activar"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
