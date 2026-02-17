"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, DollarSign, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useAuthStore } from "@/stores/auth-store";
import { hasPermission } from "@/lib/auth/permissions";
import {
  getAllocations,
  type OverheadListItem,
  type OverheadFormData,
  type AllocationItem,
} from "@/lib/actions/overhead";
import { COST_TYPE_LABELS, ALLOCATION_LABELS } from "@/lib/schemas/overhead";
import { CostDialog } from "./cost-dialog";

type Props = {
  initialData: OverheadListItem[];
  formData: OverheadFormData;
};

export function CostList({ initialData, formData }: Props) {
  const router = useRouter();
  const role = useAuthStore((s) => s.role);
  const canManage = role ? hasPermission(role, "manage_overhead_costs") : false;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCost, setEditCost] = useState<OverheadListItem | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [allocations, setAllocations] = useState<AllocationItem[]>([]);
  const [loadingAlloc, setLoadingAlloc] = useState(false);

  const handleCreate = useCallback(() => {
    setEditCost(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((cost: OverheadListItem) => {
    setEditCost(cost);
    setDialogOpen(true);
  }, []);

  const handleSaved = useCallback(() => {
    setDialogOpen(false);
    setEditCost(null);
    router.refresh();
  }, [router]);

  const toggleAllocations = useCallback(
    async (costId: string) => {
      if (expandedId === costId) {
        setExpandedId(null);
        return;
      }

      setExpandedId(costId);
      setLoadingAlloc(true);
      const items = await getAllocations(costId);
      setAllocations(items);
      setLoadingAlloc(false);
    },
    [expandedId],
  );

  if (initialData.length === 0) {
    return (
      <>
        <EmptyState
          icon={DollarSign}
          title="Sin costos registrados"
          description="Registra costos overhead para calcular el COGS de tus batches."
          action={canManage ? { label: "Registrar costo", onClick: handleCreate } : undefined}
        />
        <CostDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSaved={handleSaved}
          formData={formData}
          cost={editCost}
        />
      </>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-sans text-xl font-bold text-text-primary">
          Costos Overhead
        </h1>
        {canManage && (
          <Button variant="primary" onClick={handleCreate}>
            <Plus className="mr-1.5 size-4" />
            Registrar costo
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {initialData.map((cost) => (
          <div key={cost.id}>
            <Card className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outlined">
                      {COST_TYPE_LABELS[cost.costType] ?? cost.costType}
                    </Badge>
                    <span className="text-xs text-text-secondary">
                      {ALLOCATION_LABELS[cost.allocationBasis]}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-bold text-text-primary">
                    {cost.description}
                  </p>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    {cost.facilityName}
                    {cost.zoneName ? ` / ${cost.zoneName}` : ""}
                    {" · "}
                    {cost.periodStart} — {cost.periodEnd}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <p className="font-mono text-lg font-bold text-text-primary">
                    ${cost.amount.toLocaleString()}
                  </p>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleEdit(cost)}
                      className="rounded p-1 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                    >
                      <Pencil className="size-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Allocation toggle */}
              <button
                type="button"
                onClick={() => toggleAllocations(cost.id)}
                className="mt-3 flex items-center gap-1 text-xs text-brand hover:underline cursor-pointer"
              >
                {expandedId === cost.id ? (
                  <ChevronUp className="size-3.5" />
                ) : (
                  <ChevronDown className="size-3.5" />
                )}
                Ver asignacion por batch
              </button>

              {/* Allocations table */}
              {expandedId === cost.id && (
                <div className="mt-3 border-t border-border pt-3">
                  {loadingAlloc ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="size-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                    </div>
                  ) : allocations.length === 0 ? (
                    <p className="text-xs text-text-secondary">
                      Sin batches activos para asignar
                    </p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-text-secondary">
                          <th className="pb-1">Batch</th>
                          <th className="pb-1">Cultivar</th>
                          <th className="pb-1 text-right">%</th>
                          <th className="pb-1 text-right">Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allocations.map((a) => (
                          <tr key={a.batchId} className="border-t border-border/50">
                            <td className="py-1 font-mono">{a.batchCode}</td>
                            <td className="py-1">{a.cultivarName}</td>
                            <td className="py-1 text-right">{a.percentage}%</td>
                            <td className="py-1 text-right font-mono">
                              ${a.allocatedAmount.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </Card>
          </div>
        ))}
      </div>

      <CostDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditCost(null); }}
        onSaved={handleSaved}
        formData={formData}
        cost={editCost}
      />
    </>
  );
}
