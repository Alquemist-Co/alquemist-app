"use client";

import { useState, useCallback } from "react";
import { Check, CheckCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/utils/toast-store";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import { hasPermission } from "@/lib/auth/permissions";
import { acknowledgeAlert, type AlertItem } from "@/lib/actions/alerts";
import {
  ALERT_TYPE_LABELS,
  SEVERITY_CONFIG,
} from "@/lib/schemas/alert";
import { ResolveDialog } from "./resolve-dialog";

type Props = {
  alert: AlertItem;
  tab: "pending" | "acknowledged" | "resolved";
  onAction: () => void;
};

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Hace <1m";
  if (mins < 60) return `Hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days}d`;
}

const SEVERITY_BORDER: Record<string, string> = {
  info: "border-l-info",
  warning: "border-l-warning",
  critical: "border-l-error",
};

export function AlertCard({ alert, tab, onAction }: Props) {
  const role = useAuthStore((s) => s.role);
  const canAcknowledge = role ? hasPermission(role, "acknowledge_alert") : false;
  const canResolve = role ? hasPermission(role, "resolve_alert") : false;

  const [acknowledging, setAcknowledging] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);

  const severity = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.info;

  const handleAcknowledge = useCallback(async () => {
    setAcknowledging(true);
    const result = await acknowledgeAlert(alert.id);
    setAcknowledging(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Alerta reconocida");
    onAction();
  }, [alert.id, onAction]);

  return (
    <>
      <Card
        className={cn(
          "border-l-4 p-4",
          SEVERITY_BORDER[alert.severity] ?? "border-l-border",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={severity.variant}>{severity.label}</Badge>
              <span className="text-xs text-text-secondary">
                {ALERT_TYPE_LABELS[alert.type] ?? alert.type}
              </span>
            </div>
            {alert.title && (
              <p className="mt-1.5 text-sm font-bold text-text-primary">
                {alert.title}
              </p>
            )}
            <p className="mt-0.5 text-sm text-text-secondary">
              {alert.message}
            </p>
            <p className="mt-1 text-[10px] text-text-tertiary">
              {timeAgo(alert.triggeredAt)}
              {alert.acknowledgedByName && (
                <> · Reconocida por {alert.acknowledgedByName}</>
              )}
              {alert.resolvedByName && (
                <> · Resuelta por {alert.resolvedByName}</>
              )}
            </p>
            {alert.resolutionNotes && (
              <p className="mt-1 text-xs text-text-secondary italic">
                {alert.resolutionNotes}
              </p>
            )}
          </div>

          {/* Actions */}
          {tab === "pending" && canAcknowledge && (
            <div className="flex shrink-0 gap-2">
              <Button
                variant="ghost"
                onClick={handleAcknowledge}
                disabled={acknowledging}
                className="text-xs"
              >
                <Check className="mr-1 size-3.5" />
                Reconocer
              </Button>
              {canResolve && (
                <Button
                  variant="secondary"
                  onClick={() => setResolveOpen(true)}
                  className="text-xs"
                >
                  <CheckCheck className="mr-1 size-3.5" />
                  Resolver
                </Button>
              )}
            </div>
          )}

          {tab === "acknowledged" && canResolve && (
            <Button
              variant="secondary"
              onClick={() => setResolveOpen(true)}
              className="shrink-0 text-xs"
            >
              <CheckCheck className="mr-1 size-3.5" />
              Resolver
            </Button>
          )}
        </div>
      </Card>

      <ResolveDialog
        open={resolveOpen}
        onClose={() => setResolveOpen(false)}
        alertId={alert.id}
        onResolved={onAction}
      />
    </>
  );
}
