"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import type { OperatorSummary } from "@/lib/actions/dashboard";

type TeamPanelProps = {
  operators: OperatorSummary[];
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function TeamPanel({ operators }: TeamPanelProps) {
  if (operators.length === 0) return null;

  const onlineCount = operators.filter((o) => o.isOnline).length;

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-text-primary">Equipo</h2>
        <span className="text-xs text-text-secondary">
          {onlineCount} de {operators.length} activo
          {onlineCount !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-2">
        {operators.map((op) => (
          <div
            key={op.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-surface-card px-3 py-2.5"
          >
            {/* Avatar */}
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                op.isOnline
                  ? "bg-brand/10 text-brand"
                  : "bg-gray-100 text-text-secondary",
              )}
            >
              {getInitials(op.fullName)}
            </div>

            {/* Name */}
            <span className="flex-1 truncate text-sm font-medium text-text-primary">
              {op.fullName}
            </span>

            {/* Status */}
            <Badge variant={op.isOnline ? "success" : "outlined"}>
              {op.isOnline ? "Activo" : "Inactivo"}
            </Badge>
          </div>
        ))}
      </div>

      <p className="mt-2 text-[11px] text-text-tertiary">
        Progreso por operador disponible proximamente
      </p>
    </section>
  );
}
