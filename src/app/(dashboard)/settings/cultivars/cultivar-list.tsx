"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, FlaskConical, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils/cn";
import type { CultivarWithCropType, CropTypeWithCounts } from "@/lib/actions/config";

type Props = {
  initialData: CultivarWithCropType[];
  cropTypes: CropTypeWithCounts[];
};

export function CultivarList({ initialData, cropTypes }: Props) {
  const [filterCropType, setFilterCropType] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  let filtered = initialData;
  if (!showInactive) {
    filtered = filtered.filter((c) => c.isActive);
  }
  if (filterCropType) {
    filtered = filtered.filter((c) => c.cropTypeId === filterCropType);
  }

  const hasInactive = initialData.some((c) => !c.isActive);

  const selectClasses = cn(
    "h-9 rounded-input border border-border bg-surface-card px-2",
    "font-sans text-xs text-text-primary",
    "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-light/25",
    "appearance-none"
  );

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-text-primary">Cultivares</h1>
        <Link href="/settings/cultivars/new">
          <Button icon={Plus} size="sm">
            Nuevo
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={filterCropType}
          onChange={(e) => setFilterCropType(e.target.value)}
          className={selectClasses}
        >
          <option value="">Todos los tipos</option>
          {cropTypes.map((ct) => (
            <option key={ct.id} value={ct.id}>
              {ct.name}
            </option>
          ))}
        </select>

        {hasInactive && (
          <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="accent-brand"
            />
            Mostrar inactivos
          </label>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title="Sin cultivares"
          description="Crea el primero para poder configurar ordenes de produccion."
          action={{ label: "Nuevo cultivar", href: "/settings/cultivars/new" }}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((c) => (
            <Link key={c.id} href={`/settings/cultivars/${c.id}`}>
              <Card
                className={cn(
                  "flex items-center gap-4",
                  !c.isActive && "opacity-50"
                )}
              >
                <div className="flex flex-1 flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-text-primary">
                      {c.name}
                    </span>
                    <Badge variant="outlined">{c.cropTypeName}</Badge>
                    {c.qualityGrade && (
                      <Badge variant="success">{c.qualityGrade}</Badge>
                    )}
                    {!c.isActive && <Badge variant="warning">Inactivo</Badge>}
                  </div>
                  <span className="font-mono text-xs text-text-secondary">
                    {c.code}
                  </span>
                  <div className="flex flex-wrap gap-3 text-xs text-text-secondary">
                    {c.breeder && <span>{c.breeder}</span>}
                    {c.defaultCycleDays && (
                      <span className="font-mono">{c.defaultCycleDays}d ciclo</span>
                    )}
                    {c.expectedYieldPerPlantG && (
                      <span className="font-mono">
                        {c.expectedYieldPerPlantG}g/planta
                      </span>
                    )}
                    {c.densityPlantsPerM2 && (
                      <span className="font-mono">
                        {c.densityPlantsPerM2} pl/m2
                      </span>
                    )}
                  </div>
                </div>
                <Pencil className="size-4 shrink-0 text-text-secondary" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
