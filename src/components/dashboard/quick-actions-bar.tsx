"use client";

import Link from "next/link";
import { FileText, ClipboardList, Bell } from "lucide-react";

const ACTIONS = [
  {
    label: "Nueva orden",
    icon: FileText,
    href: "/orders/new",
  },
  {
    label: "Ver actividades",
    icon: ClipboardList,
    href: "/activities",
  },
  {
    label: "Centro de alertas",
    icon: Bell,
    href: "/operations/alerts",
  },
] as const;

export function QuickActionsBar() {
  return (
    <section className="mb-6">
      <h2 className="mb-3 text-base font-bold text-text-primary">
        Acciones rapidas
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="flex min-w-[120px] flex-1 flex-col items-center gap-2 rounded-card border border-border bg-surface-card px-3 py-3 text-center transition-colors hover:border-brand"
            >
              <div className="flex size-10 items-center justify-center rounded-full bg-brand/10">
                <Icon className="h-5 w-5 text-brand" />
              </div>
              <span className="text-xs font-medium text-text-primary">
                {action.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
