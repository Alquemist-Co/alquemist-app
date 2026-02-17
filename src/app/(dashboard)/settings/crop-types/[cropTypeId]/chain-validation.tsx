"use client";

import { Check, AlertTriangle, XCircle, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { PhaseWithFlows } from "@/lib/actions/config";

type Props = {
  phases: PhaseWithFlows[];
};

type ConnectionStatus = "valid" | "warning" | "error";

type Connection = {
  fromPhase: string;
  toPhase: string;
  status: ConnectionStatus;
  message: string;
};

function validateChain(phases: PhaseWithFlows[]): Connection[] {
  const connections: Connection[] = [];

  for (let i = 0; i < phases.length - 1; i++) {
    const current = phases[i];
    const next = phases[i + 1];

    const currentOutputs = current.flows.filter(
      (f) => f.direction === "output" && f.productRole === "primary"
    );
    const nextInputs = next.flows.filter((f) => f.direction === "input");

    // No flows on either side
    if (currentOutputs.length === 0 && nextInputs.length === 0) {
      connections.push({
        fromPhase: current.name,
        toPhase: next.name,
        status: "warning",
        message: "Sin flujos configurados",
      });
      continue;
    }

    // Current has no output
    if (currentOutputs.length === 0) {
      connections.push({
        fromPhase: current.name,
        toPhase: next.name,
        status: "warning",
        message: `${current.name} no tiene output primario configurado`,
      });
      continue;
    }

    // Next has no input
    if (nextInputs.length === 0) {
      connections.push({
        fromPhase: current.name,
        toPhase: next.name,
        status: "warning",
        message: `${next.name} no tiene input configurado`,
      });
      continue;
    }

    // Check if any output primary matches any input
    const outputProductIds = new Set(
      currentOutputs.map((f) => f.productId).filter(Boolean)
    );
    const outputCategoryIds = new Set(
      currentOutputs.map((f) => f.productCategoryId).filter(Boolean)
    );

    const inputProductIds = new Set(
      nextInputs.map((f) => f.productId).filter(Boolean)
    );
    const inputCategoryIds = new Set(
      nextInputs.map((f) => f.productCategoryId).filter(Boolean)
    );

    const productMatch = [...outputProductIds].some((id) =>
      inputProductIds.has(id)
    );
    const categoryMatch = [...outputCategoryIds].some((id) =>
      inputCategoryIds.has(id)
    );

    if (productMatch || categoryMatch) {
      connections.push({
        fromPhase: current.name,
        toPhase: next.name,
        status: "valid",
        message: "Flujo correcto",
      });
    } else {
      connections.push({
        fromPhase: current.name,
        toPhase: next.name,
        status: "error",
        message: `Output de ${current.name} no coincide con input de ${next.name}`,
      });
    }
  }

  return connections;
}

const statusConfig: Record<
  ConnectionStatus,
  { icon: typeof Check; color: string; bg: string }
> = {
  valid: { icon: Check, color: "text-success", bg: "bg-success/10" },
  warning: {
    icon: AlertTriangle,
    color: "text-warning",
    bg: "bg-warning/10",
  },
  error: { icon: XCircle, color: "text-error", bg: "bg-error/10" },
};

export function ChainValidation({ phases }: Props) {
  const connections = validateChain(phases);

  if (connections.length === 0) return null;

  return (
    <div className="mb-6 rounded-card border border-border bg-surface-card p-4">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-text-secondary">
        Validacion de cadena
      </h3>
      <div className="flex flex-col gap-1">
        {connections.map((conn, i) => {
          const cfg = statusConfig[conn.status];
          const Icon = cfg.icon;

          return (
            <div key={i} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full",
                  cfg.bg
                )}
              >
                <Icon className={cn("size-3", cfg.color)} />
              </div>
              <span className="text-xs text-text-secondary">
                {conn.fromPhase}
              </span>
              <ArrowDown className="size-3 text-text-secondary rotate-[-90deg]" />
              <span className="text-xs text-text-secondary">
                {conn.toPhase}
              </span>
              <span className={cn("text-xs", cfg.color)}>
                {conn.message}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
