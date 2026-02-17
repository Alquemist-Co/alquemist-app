"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Radio, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import { hasPermission } from "@/lib/auth/permissions";
import type { SensorListItem, SensorFormData } from "@/lib/actions/sensors";
import { SensorDialog } from "./sensor-dialog";

type Props = {
  initialData: SensorListItem[];
  formData: SensorFormData;
};

const SENSOR_TYPE_LABELS: Record<string, string> = {
  temperature: "Temperatura",
  humidity: "Humedad",
  co2: "CO2",
  light: "Luz",
  ec: "EC",
  ph: "pH",
  soil_moisture: "Humedad suelo",
  vpd: "VPD",
};

const CALIBRATION_THRESHOLD = 90; // days
const CALIBRATION_WARNING = 72; // days (80% of threshold)

function getCalibrationStatus(calibrationDate: string | null) {
  if (!calibrationDate) {
    return { label: "Sin calibracion", color: "text-text-tertiary", dot: "bg-text-tertiary" };
  }

  const daysSince = Math.floor(
    (Date.now() - new Date(calibrationDate).getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysSince > CALIBRATION_THRESHOLD) {
    return {
      label: `Vencida (${daysSince - CALIBRATION_THRESHOLD}d)`,
      color: "text-error",
      dot: "bg-error",
    };
  }

  if (daysSince > CALIBRATION_WARNING) {
    return {
      label: `Vence en ${CALIBRATION_THRESHOLD - daysSince}d`,
      color: "text-warning",
      dot: "bg-warning",
    };
  }

  return {
    label: `Calibrado (${CALIBRATION_THRESHOLD - daysSince}d)`,
    color: "text-success",
    dot: "bg-success",
  };
}

export function SensorList({ initialData, formData }: Props) {
  const router = useRouter();
  const role = useAuthStore((s) => s.role);
  const canManage = role ? hasPermission(role, "manage_sensors") : false;
  const [zoneFilter, setZoneFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSensor, setEditSensor] = useState<SensorListItem | null>(null);

  const allZones = useMemo(() => {
    const zoneMap = new Map<string, string>();
    for (const s of initialData) {
      zoneMap.set(s.zoneId, s.zoneName);
    }
    return Array.from(zoneMap, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [initialData]);

  const filtered = useMemo(() => {
    if (!zoneFilter) return initialData;
    return initialData.filter((s) => s.zoneId === zoneFilter);
  }, [initialData, zoneFilter]);

  const handleCreate = useCallback(() => {
    setEditSensor(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((sensor: SensorListItem) => {
    setEditSensor(sensor);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setEditSensor(null);
  }, []);

  const handleSaved = useCallback(() => {
    setDialogOpen(false);
    setEditSensor(null);
    router.refresh();
  }, [router]);

  if (initialData.length === 0) {
    return (
      <>
        <EmptyState
          icon={Radio}
          title="No hay sensores registrados"
          description="Registra tu primer sensor IoT para comenzar el monitoreo ambiental."
          action={{ label: "Registrar sensor", onClick: handleCreate }}
        />
        <SensorDialog
          open={dialogOpen}
          onClose={handleDialogClose}
          onSaved={handleSaved}
          formData={formData}
          sensor={editSensor}
        />
      </>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-sans text-xl font-bold text-text-primary">
          Sensores
        </h1>
        {canManage && (
          <Button variant="primary" onClick={handleCreate}>
            <Plus className="mr-1.5 size-4" />
            Registrar sensor
          </Button>
        )}
      </div>

      {/* Filter */}
      {allZones.length > 1 && (
        <div className="mb-4">
          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="h-10 w-full rounded-input border border-border bg-surface-card px-3 text-sm text-text-primary sm:w-auto"
          >
            <option value="">Todas las zonas</option>
            {allZones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden sm:block">
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left text-xs font-bold text-text-secondary">
                <th className="px-4 py-3">Zona</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Marca/Modelo</th>
                <th className="px-4 py-3">Serial</th>
                <th className="px-4 py-3">Calibracion</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const cal = getCalibrationStatus(s.calibrationDate);
                return (
                  <tr
                    key={s.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-3 text-text-primary">
                      {s.zoneName}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outlined">
                        {SENSOR_TYPE_LABELS[s.type] ?? s.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {s.brandModel || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-text-primary">
                      {s.serialNumber || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={cn("inline-block size-2 rounded-full", cal.dot)}
                        />
                        <span className={cn("text-xs", cal.color)}>
                          {cal.label}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {s.isActive ? (
                        <Badge variant="success">Activo</Badge>
                      ) : (
                        <span className="text-xs text-text-tertiary">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleEdit(s)}
                        className="rounded p-1 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                        aria-label={`Editar sensor ${s.serialNumber}`}
                      >
                        <Pencil className="size-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 sm:hidden">
        {filtered.map((s) => {
          const cal = getCalibrationStatus(s.calibrationDate);
          return (
            <Card
              key={s.id}
              className="flex items-start justify-between p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outlined">
                    {SENSOR_TYPE_LABELS[s.type] ?? s.type}
                  </Badge>
                  {s.isActive ? (
                    <Badge variant="success">Activo</Badge>
                  ) : (
                    <span className="text-[11px] text-text-tertiary">
                      Inactivo
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm text-text-primary">
                  {s.zoneName}
                </p>
                {s.serialNumber && (
                  <p className="mt-0.5 font-mono text-xs text-text-secondary">
                    {s.serialNumber}
                  </p>
                )}
                <span className="mt-1 inline-flex items-center gap-1.5">
                  <span
                    className={cn("inline-block size-2 rounded-full", cal.dot)}
                  />
                  <span className={cn("text-xs", cal.color)}>
                    {cal.label}
                  </span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleEdit(s)}
                className="ml-2 rounded p-1.5 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                aria-label={`Editar sensor ${s.serialNumber}`}
              >
                <Pencil className="size-4" />
              </button>
            </Card>
          );
        })}
      </div>

      <SensorDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        onSaved={handleSaved}
        formData={formData}
        sensor={editSensor}
      />
    </>
  );
}
