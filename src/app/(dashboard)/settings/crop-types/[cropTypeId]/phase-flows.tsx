"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Toggle } from "@/components/ui/toggle";
import { toast } from "@/lib/utils/toast-store";
import { cn } from "@/lib/utils/cn";
import { setPhaseFlows } from "@/lib/actions/config";
import type {
  FlowRow,
  ProductOption,
  CategoryOption,
  UnitOption,
} from "@/lib/actions/config";

type LocalFlow = {
  localId: string;
  direction: "input" | "output";
  productRole: "primary" | "secondary" | "byproduct" | "waste";
  productId: string;
  productCategoryId: string;
  expectedYieldPct: string;
  expectedQuantityPerInput: string;
  unitId: string;
  isRequired: boolean;
  sortOrder: number;
  notes: string;
};

type Props = {
  phaseId: string;
  phaseName: string;
  initialFlows: FlowRow[];
  products: ProductOption[];
  categories: CategoryOption[];
  units: UnitOption[];
};

let localCounter = 0;

function toLocalFlow(f: FlowRow): LocalFlow {
  return {
    localId: f.id,
    direction: f.direction as "input" | "output",
    productRole: f.productRole as "primary" | "secondary" | "byproduct" | "waste",
    productId: f.productId ?? "",
    productCategoryId: f.productCategoryId ?? "",
    expectedYieldPct: f.expectedYieldPct ?? "",
    expectedQuantityPerInput: f.expectedQuantityPerInput ?? "",
    unitId: f.unitId ?? "",
    isRequired: f.isRequired,
    sortOrder: f.sortOrder,
    notes: f.notes ?? "",
  };
}

function newFlow(direction: "input" | "output", sortOrder: number): LocalFlow {
  return {
    localId: `new-${++localCounter}`,
    direction,
    productRole: "primary",
    productId: "",
    productCategoryId: "",
    expectedYieldPct: "",
    expectedQuantityPerInput: "",
    unitId: "",
    isRequired: true,
    sortOrder,
    notes: "",
  };
}

const ROLE_OPTIONS = [
  { value: "primary", label: "Primario" },
  { value: "secondary", label: "Secundario" },
  { value: "byproduct", label: "Subproducto" },
  { value: "waste", label: "Residuo" },
] as const;

const roleVariant: Record<string, "success" | "info" | "warning" | "error"> = {
  primary: "success",
  secondary: "info",
  byproduct: "warning",
  waste: "error",
};

export function PhaseFlows({
  phaseId,
  phaseName,
  initialFlows,
  products,
  categories,
  units,
}: Props) {
  const router = useRouter();
  const [flows, setFlows] = useState<LocalFlow[]>(
    initialFlows.map(toLocalFlow)
  );
  const [isSaving, setIsSaving] = useState(false);

  const inputs = flows.filter((f) => f.direction === "input");
  const outputs = flows.filter((f) => f.direction === "output");

  const updateFlow = useCallback(
    (localId: string, updates: Partial<LocalFlow>) => {
      setFlows((prev) =>
        prev.map((f) => (f.localId === localId ? { ...f, ...updates } : f))
      );
    },
    []
  );

  const addFlow = useCallback((direction: "input" | "output") => {
    setFlows((prev) => {
      const dirFlows = prev.filter((f) => f.direction === direction);
      const maxSort = dirFlows.reduce((max, f) => Math.max(max, f.sortOrder), 0);
      return [...prev, newFlow(direction, maxSort + 1)];
    });
  }, []);

  const removeFlow = useCallback((localId: string) => {
    setFlows((prev) => prev.filter((f) => f.localId !== localId));
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);

    const result = await setPhaseFlows({
      phaseId,
      flows: flows.map((f) => ({
        direction: f.direction,
        productRole: f.productRole,
        productId: f.productId || undefined,
        productCategoryId: f.productCategoryId || undefined,
        expectedYieldPct: f.expectedYieldPct ? Number(f.expectedYieldPct) : undefined,
        expectedQuantityPerInput: f.expectedQuantityPerInput
          ? Number(f.expectedQuantityPerInput)
          : undefined,
        unitId: f.unitId || undefined,
        isRequired: f.isRequired,
        sortOrder: f.sortOrder,
        notes: f.notes || undefined,
      })),
    });

    if (!result.success) {
      toast.error(result.error);
    } else {
      toast.success(`Flujos de "${phaseName}" guardados`);
      router.refresh();
    }
    setIsSaving(false);
  }, [phaseId, phaseName, flows, router]);

  const selectClasses = cn(
    "h-9 rounded-input border border-border bg-surface-card px-2",
    "font-sans text-xs text-text-primary",
    "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-light/25",
    "appearance-none"
  );

  const inputClasses = cn(
    "h-9 w-20 rounded-input border border-border bg-surface-card px-2",
    "font-sans text-xs text-text-primary",
    "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-light/25",
  );

  function renderFlowSection(
    direction: "input" | "output",
    dirFlows: LocalFlow[]
  ) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
            {direction === "input" ? "Inputs" : "Outputs"}
          </span>
          <button
            type="button"
            onClick={() => addFlow(direction)}
            className="flex items-center gap-1 text-xs text-brand hover:text-brand-dark cursor-pointer"
          >
            <Plus className="size-3" />
            Agregar
          </button>
        </div>

        {dirFlows.length === 0 && (
          <p className="text-xs text-text-secondary italic">
            Sin {direction === "input" ? "inputs" : "outputs"} configurados
          </p>
        )}

        {dirFlows.map((flow) => (
          <div
            key={flow.localId}
            className="flex flex-wrap items-center gap-2 rounded-card border border-border bg-surface p-2"
          >
            {/* Role */}
            <select
              value={flow.productRole}
              onChange={(e) =>
                updateFlow(flow.localId, {
                  productRole: e.target.value as LocalFlow["productRole"],
                })
              }
              className={selectClasses}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>

            <Badge variant={roleVariant[flow.productRole]}>
              {flow.productRole}
            </Badge>

            {/* Product */}
            <select
              value={flow.productId}
              onChange={(e) =>
                updateFlow(flow.localId, { productId: e.target.value })
              }
              className={cn(selectClasses, "flex-1 min-w-[120px]")}
            >
              <option value="">Producto...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>

            {/* Category (alternative to product) */}
            <select
              value={flow.productCategoryId}
              onChange={(e) =>
                updateFlow(flow.localId, { productCategoryId: e.target.value })
              }
              className={cn(selectClasses, "min-w-[100px]")}
            >
              <option value="">Categoria...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Yield % */}
            <input
              type="number"
              value={flow.expectedYieldPct}
              onChange={(e) =>
                updateFlow(flow.localId, { expectedYieldPct: e.target.value })
              }
              placeholder="Yield %"
              className={inputClasses}
              min={0}
              step="0.1"
            />

            {/* Unit */}
            <select
              value={flow.unitId}
              onChange={(e) =>
                updateFlow(flow.localId, { unitId: e.target.value })
              }
              className={selectClasses}
            >
              <option value="">Unidad...</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.code}
                </option>
              ))}
            </select>

            {/* Required toggle */}
            <Toggle
              checked={flow.isRequired}
              onChange={(checked) =>
                updateFlow(flow.localId, { isRequired: checked })
              }
              label="Req."
            />

            {/* Remove */}
            <button
              type="button"
              onClick={() => removeFlow(flow.localId)}
              className="flex size-7 items-center justify-center rounded text-text-secondary hover:text-error cursor-pointer"
              aria-label="Eliminar flujo"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-bold text-text-primary">
        Flujos de producto — {phaseName}
      </h3>

      {renderFlowSection("input", inputs)}
      {renderFlowSection("output", outputs)}

      <Button
        icon={Save}
        size="sm"
        onClick={handleSave}
        loading={isSaving}
        className="self-end"
      >
        Guardar flujos
      </Button>
    </div>
  );
}
