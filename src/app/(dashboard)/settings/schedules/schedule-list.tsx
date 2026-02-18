"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Calendar, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "@/lib/utils/toast-store";
import { cn } from "@/lib/utils/cn";
import {
  toggleScheduleActive,
  type ScheduleListItem,
} from "@/lib/actions/cultivation-schedules";

type Props = { initialData: ScheduleListItem[] };

export function ScheduleList({ initialData }: Props) {
  const router = useRouter();
  const [showInactive, setShowInactive] = useState(false);
  const [filterCultivar, setFilterCultivar] = useState("");

  const hasInactive = initialData.some((s) => !s.isActive);
  const cultivarOptions = [
    ...new Map(
      initialData.map((s) => [s.cultivarCode, s.cultivarName]),
    ).entries(),
  ];

  const filtered = initialData.filter((s) => {
    if (!showInactive && !s.isActive) return false;
    if (filterCultivar && s.cultivarCode !== filterCultivar) return false;
    return true;
  });

  async function handleToggle(s: ScheduleListItem) {
    const newActive = !s.isActive;
    const result = await toggleScheduleActive(s.id, newActive);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    if (!newActive && result.data?.activeBatchCount) {
      toast.warning(
        `Plan desactivado. ${result.data.activeBatchCount} batch(es) activo(s) no se ven afectados.`,
      );
    } else {
      toast.success(newActive ? "Plan reactivado" : "Plan desactivado");
    }
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">
          Planes de cultivo
        </h1>
        <Link href="/settings/schedules/new">
          <Button variant="primary">
            <Plus className="size-4" />
            Nuevo
          </Button>
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        {cultivarOptions.length > 1 && (
          <select
            value={filterCultivar}
            onChange={(e) => setFilterCultivar(e.target.value)}
            className={cn(
              "h-9 rounded-input border border-border bg-surface-card px-3",
              "text-xs text-text-primary",
            )}
          >
            <option value="">Todos los cultivares</option>
            {cultivarOptions.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        )}
        {hasInactive && (
          <label className="flex items-center gap-2 text-xs text-text-secondary">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Inactivos
          </label>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Sin planes de cultivo"
          description="Crea el primer plan de cultivo para automatizar actividades"
          action={{
            label: "Nuevo plan",
            onClick: () => router.push("/settings/schedules/new"),
          }}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((s) => (
            <Link key={s.id} href={`/settings/schedules/${s.id}`}>
              <Card
                className={cn(
                  "flex flex-col gap-2 p-4",
                  !s.isActive && "opacity-50",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-bold text-text-primary">
                    {s.name}
                  </span>
                  {!s.isActive && <Badge variant="warning">Inactivo</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outlined">{s.cropTypeName}</Badge>
                  <span className="text-xs text-text-secondary">
                    {s.cultivarName}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-text-secondary">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {s.totalDays} dias
                  </span>
                  <span>{s.phaseCount} fases</span>
                  <span>{s.templateCount} templates</span>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleToggle(s);
                  }}
                  className="mt-1 self-start text-xs text-text-secondary hover:text-text-primary"
                >
                  {s.isActive ? "Desactivar" : "Reactivar"}
                </button>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
