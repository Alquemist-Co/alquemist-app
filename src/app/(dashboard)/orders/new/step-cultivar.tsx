"use client";

import { useState, useMemo } from "react";
import type { WizardCultivar } from "@/lib/actions/orders";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Check, Leaf } from "lucide-react";

type Props = {
  cultivars: WizardCultivar[];
  selectedId: string;
  onSelect: (cultivarId: string, cropTypeId: string) => void;
};

export function StepCultivar({ cultivars, selectedId, onSelect }: Props) {
  const [filter, setFilter] = useState("");

  // Get unique crop types for filter chips
  const cropTypes = useMemo(() => {
    const map = new Map<string, { id: string; name: string; category: string }>();
    for (const c of cultivars) {
      if (!map.has(c.cropTypeId)) {
        map.set(c.cropTypeId, {
          id: c.cropTypeId,
          name: c.cropTypeName,
          category: c.cropTypeCategory,
        });
      }
    }
    return Array.from(map.values());
  }, [cultivars]);

  const filtered = useMemo(
    () =>
      filter
        ? cultivars.filter((c) => c.cropTypeId === filter)
        : cultivars,
    [cultivars, filter],
  );

  if (cultivars.length === 0) {
    return (
      <EmptyState
        icon={Leaf}
        title="No hay cultivares"
        description="No hay cultivares activos configurados. Contacta al administrador para crear cultivares."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-primary">
          Selecciona un cultivar
        </h2>
        <p className="mt-1 text-sm text-secondary">
          Elige la variedad para esta orden de produccion.
        </p>
      </div>

      {/* Crop type filter chips */}
      {cropTypes.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilter("")}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              !filter
                ? "bg-brand text-white"
                : "bg-surface-secondary text-secondary hover:bg-surface-secondary/80",
            )}
          >
            Todos
          </button>
          {cropTypes.map((ct) => (
            <button
              key={ct.id}
              type="button"
              onClick={() => setFilter(ct.id === filter ? "" : ct.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                ct.id === filter
                  ? "bg-brand text-white"
                  : "bg-surface-secondary text-secondary hover:bg-surface-secondary/80",
              )}
            >
              {ct.name}
            </button>
          ))}
        </div>
      )}

      {/* Cultivar cards grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((cultivar) => {
          const isSelected = cultivar.id === selectedId;
          return (
            <button
              key={cultivar.id}
              type="button"
              onClick={() => onSelect(cultivar.id, cultivar.cropTypeId)}
              className={cn(
                "relative rounded-card border p-4 text-left transition-all",
                isSelected
                  ? "border-brand bg-brand/5 ring-1 ring-brand"
                  : "border-border bg-surface-card hover:border-brand/50",
              )}
            >
              {isSelected && (
                <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white">
                  <Check className="h-3 w-3" />
                </div>
              )}
              <div className="mb-2 flex items-start gap-2">
                <span className="text-base font-bold text-primary">
                  {cultivar.name}
                </span>
              </div>
              <Badge variant="outlined" className="mb-2">
                {cultivar.cropTypeName}
              </Badge>
              <div className="space-y-1 text-xs text-secondary">
                {cultivar.defaultCycleDays && (
                  <p>
                    Ciclo:{" "}
                    <span className="font-mono text-primary">
                      {cultivar.defaultCycleDays} dias
                    </span>
                  </p>
                )}
                {cultivar.expectedYieldPerPlantG && (
                  <p>
                    Rendimiento:{" "}
                    <span className="font-mono text-primary">
                      {cultivar.expectedYieldPerPlantG}g/planta
                    </span>
                  </p>
                )}
                {cultivar.breeder && (
                  <p className="text-tertiary">{cultivar.breeder}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
