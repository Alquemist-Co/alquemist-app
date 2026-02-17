"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/lib/utils/toast-store";
import { Plus, ClipboardList, Eye, Camera } from "lucide-react";

const ACTIONS = [
  {
    label: "Actividad ad-hoc",
    icon: ClipboardList,
    action: "navigate" as const,
    href: "/activities",
  },
  {
    label: "Nueva observacion",
    icon: Eye,
    action: "coming-soon" as const,
  },
  {
    label: "Foto rapida",
    icon: Camera,
    action: "coming-soon" as const,
  },
];

export function QuickActionsFab() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function handleAction(action: (typeof ACTIONS)[number]) {
    setOpen(false);
    if (action.action === "navigate" && "href" in action) {
      router.push(action.href);
    } else {
      toast.info("Proximamente");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-4 z-40 flex size-14 items-center justify-center rounded-full bg-brand shadow-lg transition-transform hover:scale-105 active:scale-95 bottom-[calc(var(--height-bottombar)+16px+env(safe-area-inset-bottom))] lg:bottom-6"
        aria-label="Acciones rapidas"
      >
        <Plus className="h-6 w-6 text-brand-light" />
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Acciones rapidas">
        <div className="space-y-1 py-2">
          {ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                onClick={() => handleAction(action)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-surface-secondary"
              >
                <div className="flex size-10 items-center justify-center rounded-full bg-brand/10">
                  <Icon className="h-5 w-5 text-brand" />
                </div>
                <span className="text-sm font-medium text-text-primary">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </Dialog>
    </>
  );
}
