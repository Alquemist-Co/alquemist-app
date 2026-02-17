"use client";

import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import type { AlertItem } from "@/lib/actions/alerts";
import { AlertTriangle, AlertCircle, Info, ChevronRight } from "lucide-react";

const SEVERITY_CONFIG: Record<
  string,
  { icon: typeof AlertTriangle; bg: string; border: string; text: string }
> = {
  critical: {
    icon: AlertTriangle,
    bg: "bg-error/10",
    border: "border-l-error",
    text: "text-error",
  },
  warning: {
    icon: AlertCircle,
    bg: "bg-warning/10",
    border: "border-l-warning",
    text: "text-warning",
  },
  info: {
    icon: Info,
    bg: "bg-info/10",
    border: "border-l-info",
    text: "text-info",
  },
};

type DashboardAlertsProps = {
  alerts: AlertItem[];
  totalCount: number;
};

export function DashboardAlerts({ alerts, totalCount }: DashboardAlertsProps) {
  if (alerts.length === 0) return null;

  return (
    <section className="mb-5">
      <h2 className="mb-3 text-base font-bold text-text-primary">Alertas</h2>
      <div className="space-y-2">
        {alerts.map((alert) => {
          const config =
            SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.info;
          const Icon = config.icon;

          return (
            <Link
              key={alert.id}
              href="/operations/alerts"
              className={cn(
                "flex h-12 items-center gap-3 rounded-lg border-l-4 px-3",
                config.bg,
                config.border,
                "transition-colors hover:opacity-80",
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", config.text)} />
              <span className="flex-1 truncate text-sm font-medium text-text-primary">
                {alert.title || alert.message}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-tertiary" />
            </Link>
          );
        })}
      </div>
      {totalCount > 3 && (
        <Link
          href="/operations/alerts"
          className="mt-2 inline-block text-sm font-medium text-brand hover:underline"
        >
          Ver todas ({totalCount})
        </Link>
      )}
    </section>
  );
}
