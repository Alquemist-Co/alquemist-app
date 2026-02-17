"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import type {
  WizardPhase,
  WizardZone,
  WizardUser,
  WizardCultivar,
} from "@/lib/actions/orders";
import type { WizardPhaseConfig } from "@/stores/order-wizard-store";
import { Input } from "@/components/ui/input";

type Props = {
  phases: WizardPhase[];
  zones: WizardZone[];
  users: WizardUser[];
  cultivar: WizardCultivar | null;
  entryPhaseId: string;
  exitPhaseId: string;
  phaseConfig: WizardPhaseConfig[];
  plannedStartDate: string;
  priority: "low" | "normal" | "high" | "urgent";
  assignedTo: string;
  onUpdate: (data: {
    plannedStartDate: string;
    priority: "low" | "normal" | "high" | "urgent";
    assignedTo: string;
    phaseConfig: WizardPhaseConfig[];
  }) => void;
};

export function StepPlanning({
  phases,
  zones,
  users,
  cultivar,
  entryPhaseId,
  exitPhaseId,
  phaseConfig,
  plannedStartDate: initialDate,
  priority: initialPriority,
  assignedTo: initialAssignedTo,
  onUpdate,
}: Props) {
  const [startDate, setStartDate] = useState(initialDate);
  const [priority, setPriority] = useState(initialPriority);
  const [assignedTo, setAssignedTo] = useState(initialAssignedTo);

  const entryPhase = phases.find((p) => p.id === entryPhaseId);
  const exitPhase = phases.find((p) => p.id === exitPhaseId);

  const phasesInRange = useMemo(() => {
    if (!entryPhase || !exitPhase) return [];
    return phases.filter(
      (p) =>
        p.sortOrder >= entryPhase.sortOrder &&
        p.sortOrder <= exitPhase.sortOrder,
    );
  }, [phases, entryPhase, exitPhase]);

  // Compute initial config: use phaseConfig from parent if non-empty,
  // otherwise build from phasesInRange with cultivar/default durations
  const computeInitialConfig = useCallback((): WizardPhaseConfig[] => {
    if (phaseConfig.length > 0) return phaseConfig;
    return phasesInRange.map((p) => {
      const cultivarDuration = cultivar?.phaseDurations?.[p.id];
      return {
        phaseId: p.id,
        zoneId: "",
        durationDays: cultivarDuration ?? p.defaultDurationDays ?? undefined,
        skipped: false,
      };
    });
  }, [phaseConfig, phasesInRange, cultivar]);

  const [localConfig, setLocalConfig] = useState<WizardPhaseConfig[]>(computeInitialConfig);

  // Calculate dates based on start date and durations
  const phaseDates = useMemo(() => {
    if (!startDate) return new Map<string, { start: string; end: string }>();
    const dates = new Map<string, { start: string; end: string }>();
    let currentDate = startDate;

    for (const pc of localConfig) {
      if (pc.skipped) continue;
      const duration = pc.durationDays;
      let endDate = currentDate;

      if (duration) {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + duration);
        endDate = d.toISOString().split("T")[0];
      }

      dates.set(pc.phaseId, { start: currentDate, end: endDate });
      if (duration) {
        currentDate = endDate;
      }
    }

    return dates;
  }, [startDate, localConfig]);

  const notifyParent = useCallback(() => {
    onUpdate({
      plannedStartDate: startDate,
      priority,
      assignedTo,
      phaseConfig: localConfig,
    });
  }, [startDate, priority, assignedTo, localConfig, onUpdate]);

  // Notify parent on changes
  useEffect(() => {
    if (startDate) {
      notifyParent();
    }
  }, [startDate, priority, assignedTo, localConfig]); // eslint-disable-line react-hooks/exhaustive-deps

  const updatePhaseConfig = (
    phaseId: string,
    field: "zoneId" | "durationDays",
    value: string | number | undefined,
  ) => {
    setLocalConfig((prev) =>
      prev.map((pc) =>
        pc.phaseId === phaseId ? { ...pc, [field]: value } : pc,
      ),
    );
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-primary">Planificacion</h2>
        <p className="mt-1 text-sm text-secondary">
          Asigna zonas, fechas y responsable para la orden.
        </p>
      </div>

      {/* General fields */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          label="Fecha de inicio"
          type="date"
          min={todayStr}
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          error={
            startDate && startDate < todayStr
              ? "La fecha debe ser hoy o posterior"
              : undefined
          }
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-primary">
            Prioridad
          </label>
          <select
            value={priority}
            onChange={(e) =>
              setPriority(e.target.value as typeof priority)
            }
            className="h-12 w-full rounded-input border border-border bg-surface px-3 text-sm text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="low">Baja</option>
            <option value="normal">Normal</option>
            <option value="high">Alta</option>
            <option value="urgent">Urgente</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-primary">
            Responsable
          </label>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="h-12 w-full rounded-input border border-border bg-surface px-3 text-sm text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="">Sin asignar</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName} ({u.role})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Per-phase configuration */}
      {phasesInRange.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-primary">
            Configuracion por fase
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-tertiary">
                  <th className="pb-2 pr-3 font-medium">Fase</th>
                  <th className="pb-2 pr-3 font-medium">Zona</th>
                  <th className="pb-2 pr-3 font-medium">Dias</th>
                  <th className="pb-2 pr-3 font-medium">Inicio</th>
                  <th className="pb-2 font-medium">Fin</th>
                </tr>
              </thead>
              <tbody>
                {phasesInRange.map((phase) => {
                  const config = localConfig.find(
                    (pc) => pc.phaseId === phase.id,
                  );
                  if (!config || config.skipped) return null;

                  const dates = phaseDates.get(phase.id);

                  return (
                    <tr key={phase.id} className="border-b border-border/50">
                      <td className="py-2 pr-3 font-medium text-primary">
                        {phase.name}
                      </td>
                      <td className="py-2 pr-3">
                        <select
                          value={config.zoneId}
                          onChange={(e) =>
                            updatePhaseConfig(
                              phase.id,
                              "zoneId",
                              e.target.value,
                            )
                          }
                          className="h-9 w-full min-w-[140px] rounded border border-border bg-surface px-2 text-xs text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                        >
                          <option value="">Sin asignar</option>
                          {zones.map((z) => (
                            <option key={z.id} value={z.id}>
                              {z.name} ({z.facilityName})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          type="number"
                          min={1}
                          value={config.durationDays ?? ""}
                          onChange={(e) =>
                            updatePhaseConfig(
                              phase.id,
                              "durationDays",
                              e.target.value
                                ? parseInt(e.target.value, 10)
                                : undefined,
                            )
                          }
                          className="h-9 w-16 rounded border border-border bg-surface px-2 text-center font-mono text-xs text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs text-secondary">
                        {dates?.start ?? "—"}
                      </td>
                      <td className="py-2 font-mono text-xs text-secondary">
                        {dates?.end !== dates?.start ? dates?.end : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Total duration */}
          {startDate && (
            <p className="text-xs text-secondary">
              Duracion total estimada:{" "}
              <span className="font-mono font-bold text-primary">
                {(() => {
                  const allDates = Array.from(phaseDates.values());
                  const lastDate = allDates[allDates.length - 1]?.end;
                  if (!lastDate || lastDate === startDate) return "—";
                  const diff =
                    (new Date(lastDate).getTime() -
                      new Date(startDate).getTime()) /
                    (1000 * 60 * 60 * 24);
                  return `${Math.round(diff)} dias`;
                })()}
              </span>
              {" ("}
              <span className="font-mono">
                {startDate}
              </span>
              {" → "}
              <span className="font-mono">
                {Array.from(phaseDates.values()).pop()?.end ?? "—"}
              </span>
              {")"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
