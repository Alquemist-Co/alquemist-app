import { z } from "zod";

export const resolveAlertSchema = z.object({
  alertId: z.string().uuid(),
  resolutionNotes: z.string().max(2000).optional().or(z.literal("")),
});

export type ResolveAlertData = z.infer<typeof resolveAlertSchema>;

export const ALERT_TYPE_LABELS: Record<string, string> = {
  overdue_activity: "Actividad vencida",
  low_inventory: "Inventario bajo",
  stale_batch: "Batch estancado",
  expiring_item: "Item por vencer",
  env_out_of_range: "Ambiente fuera de rango",
  order_delayed: "Orden retrasada",
  quality_failed: "Calidad fallida",
};

export const SEVERITY_CONFIG: Record<string, { label: string; variant: "info" | "warning" | "error" }> = {
  info: { label: "Info", variant: "info" },
  warning: { label: "Advertencia", variant: "warning" },
  critical: { label: "Critico", variant: "error" },
};
