"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Layers,
} from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "@/lib/utils/toast-store";
import { cn } from "@/lib/utils/cn";
import { reorderPhases, deletePhase } from "@/lib/actions/config";
import type {
  CropTypeDetail,
  PhaseWithFlows,
  ProductOption,
  CategoryOption,
  UnitOption,
} from "@/lib/actions/config";
import { PhaseForm } from "./phase-form";
import { PhaseFlows } from "./phase-flows";
import { ChainValidation } from "./chain-validation";

type Props = {
  cropType: CropTypeDetail;
  products: ProductOption[];
  categories: CategoryOption[];
  units: UnitOption[];
};

export function PhaseList({ cropType, products, categories, units }: Props) {
  const router = useRouter();
  const [showPhaseDialog, setShowPhaseDialog] = useState(false);
  const [editingPhase, setEditingPhase] = useState<PhaseWithFlows | null>(null);
  const [expandedPhaseId, setExpandedPhaseId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PhaseWithFlows | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const phases = cropType.phases;

  const openCreate = useCallback(() => {
    setEditingPhase(null);
    setShowPhaseDialog(true);
  }, []);

  const openEdit = useCallback((phase: PhaseWithFlows) => {
    setEditingPhase(phase);
    setShowPhaseDialog(true);
  }, []);

  const handlePhaseClose = useCallback(() => {
    setShowPhaseDialog(false);
    setEditingPhase(null);
  }, []);

  const handlePhaseSuccess = useCallback(() => {
    handlePhaseClose();
    router.refresh();
  }, [handlePhaseClose, router]);

  const handleMoveUp = useCallback(
    async (index: number) => {
      if (index === 0 || isReordering) return;
      setIsReordering(true);

      const newOrder = [...phases];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];

      const result = await reorderPhases({
        cropTypeId: cropType.id,
        phaseIds: newOrder.map((p) => p.id),
      });

      if (!result.success) {
        toast.error(result.error);
      } else {
        router.refresh();
      }
      setIsReordering(false);
    },
    [phases, cropType.id, isReordering, router]
  );

  const handleMoveDown = useCallback(
    async (index: number) => {
      if (index === phases.length - 1 || isReordering) return;
      setIsReordering(true);

      const newOrder = [...phases];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];

      const result = await reorderPhases({
        cropTypeId: cropType.id,
        phaseIds: newOrder.map((p) => p.id),
      });

      if (!result.success) {
        toast.error(result.error);
      } else {
        router.refresh();
      }
      setIsReordering(false);
    },
    [phases, cropType.id, isReordering, router]
  );

  const handleDelete = useCallback(
    async (phase: PhaseWithFlows) => {
      setIsDeleting(true);
      const result = await deletePhase(phase.id);
      if (!result.success) {
        toast.error(result.error);
      } else {
        toast.success(`Fase "${phase.name}" eliminada`);
        router.refresh();
      }
      setConfirmDelete(null);
      setIsDeleting(false);
    },
    [router]
  );

  const toggleExpand = useCallback((phaseId: string) => {
    setExpandedPhaseId((prev) => (prev === phaseId ? null : phaseId));
  }, []);

  return (
    <>
      {/* Header */}
      <div className="mb-2">
        <Link
          href="/settings/crop-types"
          className="text-sm text-text-secondary hover:text-brand transition-colors"
        >
          ← Tipos de cultivo
        </Link>
      </div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary">
            {cropType.name}
          </h1>
          <p className="text-sm text-text-secondary font-mono">{cropType.code}</p>
        </div>
        <Button icon={Plus} size="sm" onClick={openCreate}>
          Nueva fase
        </Button>
      </div>

      {/* Chain validation */}
      {phases.length >= 2 && <ChainValidation phases={phases} />}

      {/* Phase list */}
      {phases.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Sin fases"
          description="Agrega la primera fase del ciclo productivo."
          action={{ label: "Nueva fase", onClick: openCreate }}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {phases.map((phase, index) => (
            <Card key={phase.id} className="p-0">
              {/* Phase header row */}
              <div className="flex items-center gap-2 p-4">
                {/* Reorder buttons */}
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0 || isReordering}
                    className={cn(
                      "flex size-6 items-center justify-center rounded",
                      "text-text-secondary hover:bg-surface hover:text-text-primary",
                      "disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer",
                    )}
                    aria-label={`Mover ${phase.name} arriba`}
                  >
                    <ChevronUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === phases.length - 1 || isReordering}
                    className={cn(
                      "flex size-6 items-center justify-center rounded",
                      "text-text-secondary hover:bg-surface hover:text-text-primary",
                      "disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer",
                    )}
                    aria-label={`Mover ${phase.name} abajo`}
                  >
                    <ChevronDown className="size-4" />
                  </button>
                </div>

                {/* Sort order indicator */}
                <span className="flex size-7 items-center justify-center rounded-full bg-surface text-xs font-bold text-text-secondary">
                  {phase.sortOrder}
                </span>

                {/* Phase info */}
                <div className="flex flex-1 flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-text-primary">
                      {phase.name}
                    </span>
                    <span className="font-mono text-xs text-text-secondary">
                      {phase.code}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {phase.isTransformation && (
                      <Badge variant="filled">Transformacion</Badge>
                    )}
                    {phase.isDestructive && (
                      <Badge variant="error">Destructiva</Badge>
                    )}
                    {phase.requiresZoneChange && (
                      <Badge variant="warning">Cambio zona</Badge>
                    )}
                    {phase.canSkip && (
                      <Badge variant="info">Omitible</Badge>
                    )}
                    {phase.canBeEntryPoint && (
                      <Badge variant="success">Entrada</Badge>
                    )}
                    {phase.canBeExitPoint && (
                      <Badge variant="success">Salida</Badge>
                    )}
                    {phase.defaultDurationDays && (
                      <span className="text-xs text-text-secondary">
                        {phase.defaultDurationDays}d
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(phase)}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-button",
                      "text-text-secondary hover:bg-surface hover:text-text-primary",
                      "transition-colors duration-150 cursor-pointer",
                    )}
                    aria-label={`Editar ${phase.name}`}
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(phase)}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-button",
                      "text-text-secondary hover:bg-surface hover:text-error",
                      "transition-colors duration-150 cursor-pointer",
                    )}
                    aria-label={`Eliminar ${phase.name}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleExpand(phase.id)}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-button",
                      "text-text-secondary hover:bg-surface hover:text-text-primary",
                      "transition-all duration-150 cursor-pointer",
                      expandedPhaseId === phase.id && "rotate-90",
                    )}
                    aria-label={`${expandedPhaseId === phase.id ? "Colapsar" : "Expandir"} flujos de ${phase.name}`}
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>

              {/* Expanded flows section */}
              {expandedPhaseId === phase.id && (
                <div className="border-t border-border px-4 py-4">
                  <PhaseFlows
                    phaseId={phase.id}
                    phaseName={phase.name}
                    initialFlows={phase.flows}
                    products={products}
                    categories={categories}
                    units={units}
                  />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Phase create/edit dialog */}
      <PhaseForm
        open={showPhaseDialog}
        onClose={handlePhaseClose}
        onSuccess={handlePhaseSuccess}
        cropTypeId={cropType.id}
        phase={editingPhase}
      />

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar fase"
        footer={
          <div className="flex gap-3">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => setConfirmDelete(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              className="flex-1 bg-error hover:bg-error/90"
              loading={isDeleting}
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
            >
              Eliminar
            </Button>
          </div>
        }
      >
        <p className="text-sm text-text-secondary">
          Esta accion eliminara la fase &quot;{confirmDelete?.name}&quot; y todos
          sus flujos de producto. Esta accion no se puede deshacer.
        </p>
      </Dialog>
    </>
  );
}
