"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { TemplateListItem } from "@/lib/actions/templates";
import { useAuthStore } from "@/stores/auth-store";
import { hasPermission } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils/cn";
import {
  Zap,
  Plus,
  Clock,
  ArrowRight,
  ListChecks,
  Package,
} from "lucide-react";

type Props = {
  templates: TemplateListItem[];
  activityTypes: { id: string; name: string }[];
  phases: { id: string; name: string; cropTypeName: string }[];
};

const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Diaria",
  weekly: "Semanal",
  biweekly: "Bisemanal",
  once: "Una vez",
  on_demand: "Bajo demanda",
};

export function TemplateList({ templates, activityTypes, phases }: Props) {
  const role = useAuthStore((s) => s.role);
  const canManage = role ? hasPermission(role, "manage_templates") : false;
  const [typeFilter, setTypeFilter] = useState("");
  const [phaseFilter, setPhaseFilter] = useState("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let result = templates;

    if (typeFilter) {
      result = result.filter((t) => t.activityTypeName === typeFilter);
    }
    if (phaseFilter) {
      const phase = phases.find((p) => p.id === phaseFilter);
      if (phase) {
        result = result.filter((t) => t.phaseNames.includes(phase.name));
      }
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.code.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q),
      );
    }

    return result;
  }, [templates, typeFilter, phaseFilter, phases, search]);

  if (templates.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-4 lg:p-6">
        <EmptyState
          icon={Zap}
          title="Sin templates"
          description="No hay templates de actividad. Crea el primero para poder programar actividades."
        />
        {canManage && (
          <Link href="/settings/templates/new" className="mt-4">
            <Button icon={Plus}>Nuevo Template</Button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col p-4 lg:p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-primary">
            Templates de Actividad
          </h1>
          <p className="text-sm text-secondary">
            {filtered.length} de {templates.length} template(s)
          </p>
        </div>
        {canManage && (
          <Link href="/settings/templates/new">
            <Button icon={Plus} size="sm">
              Nuevo
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por codigo o nombre..."
          className="h-9 w-48 rounded-full border border-border bg-surface px-3 text-xs text-primary placeholder:text-tertiary focus:border-brand focus:outline-none"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className={cn(
            "h-9 rounded-full border border-border bg-surface px-3 text-xs",
            typeFilter ? "text-brand" : "text-secondary",
          )}
        >
          <option value="">Todos los tipos</option>
          {activityTypes.map((t) => (
            <option key={t.id} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={phaseFilter}
          onChange={(e) => setPhaseFilter(e.target.value)}
          className={cn(
            "h-9 rounded-full border border-border bg-surface px-3 text-xs",
            phaseFilter ? "text-brand" : "text-secondary",
          )}
        >
          <option value="">Todas las fases</option>
          {phases.map((p) => (
            <option key={p.id} value={p.id}>
              {p.cropTypeName} — {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Template cards */}
      <div className="space-y-3">
        {filtered.map((t) => (
          <Link
            key={t.id}
            href={`/settings/templates/${t.id}`}
            className="block rounded-card border border-border bg-surface-card p-4 transition-colors hover:border-brand/50"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-primary">
                    {t.code}
                  </span>
                  <Badge variant="info">{t.activityTypeName}</Badge>
                  {t.triggersPhaseChangeName && (
                    <Badge variant="warning">
                      <ArrowRight className="mr-0.5 h-3 w-3" />
                      {t.triggersPhaseChangeName}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-secondary">{t.name}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-tertiary">
                <Clock className="h-3 w-3" />
                {t.estimatedDurationMin} min
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-tertiary">
                {FREQUENCY_LABELS[t.frequency] ?? t.frequency}
              </span>
              <span className="text-border">|</span>
              <span className="flex items-center gap-1 text-tertiary">
                <Package className="h-3 w-3" />
                {t.resourceCount} recurso(s)
              </span>
              <span className="text-border">|</span>
              <span className="flex items-center gap-1 text-tertiary">
                <ListChecks className="h-3 w-3" />
                {t.checklistCount} item(s)
              </span>
            </div>

            {t.phaseNames.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {t.phaseNames.map((name) => (
                  <Badge key={name} variant="outlined">
                    {name}
                  </Badge>
                ))}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
