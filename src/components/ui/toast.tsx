"use client";

import { useState } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useToastStore, type ToastItem, type ToastType } from "@/lib/utils/toast-store";

const iconMap: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const iconColorMap: Record<ToastType, string> = {
  success: "text-success",
  error: "text-error",
  warning: "text-warning",
  info: "text-info",
};

function ToastItem({ item }: { item: ToastItem }) {
  const remove = useToastStore((s) => s.remove);
  const [exiting, setExiting] = useState(false);
  const Icon = iconMap[item.type];

  const handleClose = () => {
    setExiting(true);
    setTimeout(() => remove(item.id), 200);
  };

  return (
    <div
      role="alert"
      className={cn(
        "flex items-center gap-3 rounded-button px-4 py-3",
        "bg-text-primary text-white shadow-lg",
        "min-w-[280px] max-w-[400px]",
        exiting
          ? "animate-[fade-in_200ms_ease-in_reverse_forwards]"
          : "animate-[slide-up_250ms_ease-out]",
      )}
    >
      <Icon className={cn("size-5 shrink-0", iconColorMap[item.type])} />
      <p className="flex-1 text-sm">{item.message}</p>
      {item.type === "error" && (
        <button
          type="button"
          onClick={handleClose}
          aria-label="Cerrar notificación"
          className="shrink-0 rounded-full p-0.5 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-col-reverse gap-2"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} item={t} />
      ))}
    </div>
  );
}

export { ToastContainer };
