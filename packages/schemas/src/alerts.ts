import { z } from 'zod'

// ---------- Alert Enums ----------

export const alertTypeEnum = z.enum([
  'overdue_activity', 'low_inventory', 'stale_batch', 'expiring_item',
  'env_out_of_range', 'order_delayed', 'quality_failed',
  'regulatory_expiring', 'regulatory_missing', 'pest_detected', 'phi_violation',
])
export type AlertType = z.infer<typeof alertTypeEnum>

export const alertSeverityEnum = z.enum(['info', 'warning', 'high', 'critical'])
export type AlertSeverity = z.infer<typeof alertSeverityEnum>

export const alertStatusEnum = z.enum(['pending', 'acknowledged', 'resolved'])
export type AlertStatus = z.infer<typeof alertStatusEnum>

// ---------- Acknowledge Alert (PRD 33) ----------

export const acknowledgeAlertSchema = z.object({
  id: z.string().uuid(),
})

export type AcknowledgeAlertInput = z.infer<typeof acknowledgeAlertSchema>

// ---------- Resolve Alert (PRD 33) ----------

export const resolveAlertSchema = z.object({
  id: z.string().uuid(),
})

export type ResolveAlertInput = z.infer<typeof resolveAlertSchema>

// ---------- Alert Filters (PRD 33) ----------

export const alertFiltersSchema = z.object({
  status: alertStatusEnum.optional(),
  severity: alertSeverityEnum.optional(),
  type: alertTypeEnum.optional(),
})

export type AlertFilters = z.infer<typeof alertFiltersSchema>
