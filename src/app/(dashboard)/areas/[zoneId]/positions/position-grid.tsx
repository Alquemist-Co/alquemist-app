"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/utils/toast-store";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import { hasPermission } from "@/lib/auth/permissions";
import {
  updatePositionStatus,
  type PositionItem,
  type PositionStats,
} from "@/lib/actions/positions";
import type { ZoneBatch } from "@/lib/actions/areas";

type Props = {
  zoneId: string;
  positions: PositionItem[];
  stats: PositionStats;
  batches: ZoneBatch[];
};

const STATUS_COLORS: Record<string, string> = {
  empty: "bg-[#D4DDD6]",
  planted: "bg-emerald-600",
  harvested: "bg-amber-600",
  maintenance: "bg-red-600",
};

const STATUS_LABELS: Record<string, string> = {
  empty: "Vacia",
  planted: "Plantada",
  harvested: "Cosechada",
  maintenance: "Mantenimiento",
};

export function PositionGrid({ zoneId, positions, stats, batches }: Props) {
  const router = useRouter();
  const role = useAuthStore((s) => s.role);
  const canManage = role ? hasPermission(role, "manage_areas") : false;

  const [selected, setSelected] = useState<PositionItem | null>(null);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [newBatchId, setNewBatchId] = useState("");

  // Group by structure
  const groups = useMemo(() => {
    const map = new Map<string | null, PositionItem[]>();
    for (const p of positions) {
      const key = p.structureId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return Array.from(map.entries());
  }, [positions]);

  const handleCellClick = useCallback((pos: PositionItem) => {
    setSelected(pos);
    setNewStatus(pos.status);
    setNewBatchId(pos.batchId ?? "");
  }, []);

  const handleUpdate = useCallback(async () => {
    if (!selected) return;
    setUpdating(true);

    const result = await updatePositionStatus(
      selected.id,
      newStatus as "empty" | "planted" | "harvested" | "maintenance",
      newBatchId || undefined,
    );

    setUpdating(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Posicion actualizada");
    setSelected(null);
    router.refresh();
  }, [selected, newStatus, newBatchId, router]);

  const plantedPct = stats.total > 0 ? Math.round((stats.planted / stats.total) * 100) : 0;

  return (
    <>
      {/* Back */}
      <Link
        href={`/areas/${zoneId}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="size-4" />
        Zona
      </Link>

      <h1 className="mb-4 font-sans text-xl font-bold text-text-primary">
        Posiciones de Planta
      </h1>

      {/* Stats strip */}
      <Card className="mb-6 p-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div>
            <p className="font-mono text-lg font-bold text-text-primary">{stats.total}</p>
            <p className="text-[10px] text-text-secondary uppercase">Total</p>
          </div>
          <div>
            <p className="font-mono text-lg font-bold text-emerald-600">{stats.planted}</p>
            <p className="text-[10px] text-text-secondary uppercase">Plantadas</p>
          </div>
          <div>
            <p className="font-mono text-lg font-bold text-text-secondary">{stats.empty}</p>
            <p className="text-[10px] text-text-secondary uppercase">Vacias</p>
          </div>
          <div>
            <p className="font-mono text-lg font-bold text-amber-600">{stats.harvested}</p>
            <p className="text-[10px] text-text-secondary uppercase">Cosechadas</p>
          </div>
          <div>
            <p className="font-mono text-lg font-bold text-red-600">{stats.maintenance}</p>
            <p className="text-[10px] text-text-secondary uppercase">Mantenimiento</p>
          </div>
        </div>
        <div className="mt-3">
          <ProgressBar value={plantedPct} label="Ocupacion" color="success" />
        </div>
      </Card>

      {/* Grid by structure */}
      {groups.map(([structureId, items]) => (
        <div key={structureId ?? "no-structure"} className="mb-6">
          <h3 className="mb-2 text-xs font-bold uppercase text-text-secondary tracking-wider">
            {items[0]?.structureName ?? "Sin estructura"}
          </h3>
          <div className="flex flex-wrap gap-1">
            {items.map((pos) => (
              <button
                key={pos.id}
                type="button"
                onClick={() => handleCellClick(pos)}
                title={pos.label ?? `Pos ${pos.positionIndex}`}
                className={cn(
                  "size-8 rounded-sm transition-opacity hover:opacity-80 sm:size-10 cursor-pointer",
                  STATUS_COLORS[pos.status] ?? "bg-border",
                )}
                aria-label={`${pos.label ?? `Posicion ${pos.positionIndex}`}: ${STATUS_LABELS[pos.status] ?? pos.status}`}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-text-secondary">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <span className={cn("inline-block size-3 rounded-sm", color)} />
            {STATUS_LABELS[status]}
          </span>
        ))}
      </div>

      {/* Position detail dialog */}
      <Dialog
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.label ?? `Posicion ${selected?.positionIndex ?? ""}`}
        footer={
          canManage ? (
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setSelected(null)}
                disabled={updating}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleUpdate}
                disabled={updating || newStatus === selected?.status}
                className="flex-1"
              >
                {updating ? "Guardando..." : "Actualizar"}
              </Button>
            </div>
          ) : undefined
        }
      >
        {selected && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-bold text-text-secondary">Estado actual</p>
              <Badge variant="outlined" className="mt-1">
                {STATUS_LABELS[selected.status]}
              </Badge>
            </div>

            {selected.batchCode && (
              <div>
                <p className="text-xs font-bold text-text-secondary">Batch</p>
                <p className="mt-1 font-mono text-sm text-text-primary">
                  {selected.batchCode}
                  {selected.cultivarName && (
                    <span className="ml-2 font-sans text-text-secondary">
                      {selected.cultivarName}
                    </span>
                  )}
                </p>
              </div>
            )}

            {canManage && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-bold text-text-secondary">
                    Nuevo estado
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="h-10 w-full rounded-input border border-border bg-surface-card px-3 text-sm text-text-primary"
                  >
                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>

                {newStatus === "planted" && batches.length > 0 && (
                  <div>
                    <label className="mb-1 block text-xs font-bold text-text-secondary">
                      Asignar batch
                    </label>
                    <select
                      value={newBatchId}
                      onChange={(e) => setNewBatchId(e.target.value)}
                      className="h-10 w-full rounded-input border border-border bg-surface-card px-3 text-sm text-text-primary"
                    >
                      <option value="">Sin batch</option>
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.code} — {b.cultivarName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Dialog>
    </>
  );
}
