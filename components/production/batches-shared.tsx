'use client'

// ---------- Types ----------

export type BatchRow = {
  id: string
  code: string
  cultivar_name: string
  phase_name: string
  zone_name: string
  facility_name: string
  plant_count: number | null
  current_product_name: string | null
  order_code: string | null
  order_id: string | null
  start_date: string
  expected_end_date: string | null
  days_in_production: number
  status: string
}

export type CultivarOption = {
  id: string
  name: string
}

export type PhaseOption = {
  id: string
  name: string
}

export type ZoneOption = {
  id: string
  name: string
  facility_id: string
  facility_name: string
}

// ---------- Label Maps ----------

export const batchStatusLabels: Record<string, string> = {
  active: 'Activo',
  phase_transition: 'En transición',
  completed: 'Completado',
  cancelled: 'Cancelado',
  on_hold: 'En pausa',
}

// ---------- Badge Styles ----------

export const batchStatusBadgeStyles: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  phase_transition: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  on_hold: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
}

// ---------- Select class (reuse pattern) ----------

export const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring'
