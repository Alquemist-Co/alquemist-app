'use client'

// ---------- Types ----------

export type ScheduledActivityRow = {
  id: string
  planned_date: string
  crop_day: number | null
  status: string
  template_name: string
  template_code: string | null
  activity_type_name: string
  batch_id: string
  batch_code: string
  cultivar_name: string
  phase_name: string
  zone_name: string
  facility_name: string
  estimated_duration_min: number | null
  completed_activity_id: string | null
}

export type ActivityRow = {
  id: string
  performed_at: string
  crop_day: number | null
  duration_minutes: number | null
  status: string
  notes: string | null
  activity_type_name: string
  template_name: string
  template_code: string | null
  batch_id: string
  batch_code: string
  batch_status: string
  cultivar_name: string
  phase_name: string
  zone_name: string
  facility_name: string
  operator_name: string
  resources_count: number
  observations_count: number
  has_high_severity: boolean
}

export type FacilityOption = { id: string; name: string }
export type ZoneOption = { id: string; name: string; facility_id: string; facility_name: string }
export type BatchOption = { id: string; code: string; zone_id: string; cultivar_name: string; phase_name: string; phase_id: string }
export type ActivityTypeOption = { id: string; name: string }
export type PhaseOption = { id: string; name: string }
export type CultivarOption = { id: string; name: string }
export type OperatorOption = { id: string; full_name: string }

// ---------- Label Maps ----------

export const scheduledStatusLabels: Record<string, string> = {
  pending: 'Pendiente',
  completed: 'Completada',
  skipped: 'Omitida',
  overdue: 'Vencida',
}

export const activityStatusLabels: Record<string, string> = {
  in_progress: 'En progreso',
  completed: 'Completada',
  cancelled: 'Cancelada',
}

export const observationTypeLabels: Record<string, string> = {
  pest: 'Plaga',
  disease: 'Enfermedad',
  deficiency: 'Deficiencia',
  environmental: 'Ambiental',
  general: 'General',
  measurement: 'Medición',
}

export const severityLabels: Record<string, string> = {
  info: 'Info',
  low: 'Bajo',
  medium: 'Medio',
  high: 'Alto',
  critical: 'Crítico',
}

export const plantPartLabels: Record<string, string> = {
  root: 'Raíz',
  stem: 'Tallo',
  leaf: 'Hoja',
  flower: 'Flor',
  fruit: 'Fruto',
  whole_plant: 'Planta completa',
}

// ---------- Badge Styles ----------

export const scheduledStatusBadgeStyles: Record<string, string> = {
  pending: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  skipped: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export const activityStatusBadgeStyles: Record<string, string> = {
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
}

export const severityBadgeStyles: Record<string, string> = {
  info: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export const observationTypeBadgeStyles: Record<string, string> = {
  pest: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  disease: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  deficiency: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  environmental: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  general: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  measurement: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

// ---------- Utilities ----------

export const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring'

export function formatDate(d: string | null) {
  if (!d) return '—'
  // Append time component for date-only strings to avoid UTC timezone shift
  const dateStr = d.length === 10 ? d + 'T00:00:00' : d
  return new Date(dateStr).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/** Check if a date string is in the past (for overdue detection) */
export function isPastDate(dateStr: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr + 'T00:00:00')
  return d < today
}
