'use client'

// ---------- Sensor Types ----------

export type SensorRow = {
  id: string
  type: string
  brand_model: string | null
  serial_number: string | null
  calibration_date: string | null
  is_active: boolean
  zone_name: string
  zone_id: string
  facility_name: string
  facility_id: string
  last_reading_at: string | null
}

export type ZoneOption = {
  id: string
  name: string
  facility_id: string
  facility_name: string
}

// ---------- Sensor Type Labels ----------

export const sensorTypeLabels: Record<string, string> = {
  temperature: 'Temperatura',
  humidity: 'Humedad',
  co2: 'CO₂',
  light: 'Luz',
  ec: 'EC',
  ph: 'pH',
  soil_moisture: 'Humedad suelo',
  vpd: 'VPD',
}

export const sensorTypeBadgeStyles: Record<string, string> = {
  temperature: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  humidity: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  co2: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  light: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  ec: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  ph: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  soil_moisture: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  vpd: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
}

// ---------- Helpers ----------

export function getRelativeTime(dateStr: string | null): { label: string; isStale: boolean } {
  if (!dateStr) return { label: 'Sin señal', isStale: true }
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return { label: 'Ahora', isStale: false }
  if (mins < 60) return { label: `Hace ${mins} min`, isStale: mins > 30 }
  const hours = Math.floor(mins / 60)
  if (hours < 24) return { label: `Hace ${hours}h`, isStale: true }
  const days = Math.floor(hours / 24)
  return { label: `Hace ${days}d`, isStale: true }
}

export function isCalibrationExpired(dateStr: string | null): boolean {
  if (!dateStr) return false
  const cal = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - cal.getTime()
  return diff > 90 * 24 * 60 * 60 * 1000
}

// ---------- Alert Types ----------

export type AlertRow = {
  id: string
  type: string
  severity: string
  title: string | null
  entity_type: string
  entity_id: string
  batch_id: string | null
  message: string
  triggered_at: string
  status: string
  acknowledged_by_name: string | null
  acknowledged_at: string | null
  resolved_at: string | null
}

// ---------- Alert Labels ----------

export const alertTypeLabels: Record<string, string> = {
  overdue_activity: 'Actividad vencida',
  low_inventory: 'Inventario bajo',
  stale_batch: 'Batch sin actividad',
  expiring_item: 'Item por vencer',
  env_out_of_range: 'Ambiente fuera de rango',
  order_delayed: 'Orden retrasada',
  quality_failed: 'Calidad fallida',
  regulatory_expiring: 'Regulatorio por vencer',
  regulatory_missing: 'Regulatorio faltante',
  pest_detected: 'Plaga detectada',
  phi_violation: 'Violación PHI',
}

export const alertSeverityLabels: Record<string, string> = {
  info: 'Info',
  warning: 'Advertencia',
  high: 'Alta',
  critical: 'Crítica',
}

export const alertSeverityBadgeStyles: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
}

export const alertStatusLabels: Record<string, string> = {
  pending: 'Pendiente',
  acknowledged: 'Reconocida',
  resolved: 'Resuelta',
}

export const alertStatusBadgeStyles: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  acknowledged: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

export const alertSeverityBorderStyles: Record<string, string> = {
  critical: 'border-l-4 border-l-red-500',
  high: 'border-l-4 border-l-orange-500',
  warning: 'border-l-4 border-l-yellow-500',
  info: 'border-l-4 border-l-blue-500',
}

export function getEntityLink(entityType: string, entityId: string): string {
  switch (entityType) {
    case 'batch': return `/production/batches/${entityId}`
    case 'sensor': return `/operations/sensors`
    case 'scheduled_activity': return `/activities/schedule`
    case 'inventory_item': return `/inventory/items`
    case 'regulatory_document': return `/regulatory/documents/${entityId}`
    case 'activity_observation': return `/activities/history`
    default: return '#'
  }
}

export const entityTypeLabels: Record<string, string> = {
  batch: 'Batch',
  sensor: 'Sensor',
  scheduled_activity: 'Actividad',
  inventory_item: 'Inventario',
  regulatory_document: 'Documento',
  shipment: 'Envío',
  activity_observation: 'Observación',
}
