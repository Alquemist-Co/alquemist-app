'use client'

// ---------- Types ----------

export type QualityTestRow = {
  id: string
  test_type: string
  batch_id: string
  batch_code: string
  cultivar_name: string
  phase_name: string
  facility_name: string
  lab_name: string | null
  lab_reference: string | null
  sample_date: string
  result_date: string | null
  status: string
  overall_pass: boolean | null
  results_count: number
}

export type BatchOption = {
  id: string
  code: string
  cultivar_name: string
  phase_name: string
  phase_id: string
}

export type PhaseOption = {
  id: string
  name: string
}

export type CultivarOption = {
  id: string
  name: string
}

export type FacilityOption = {
  id: string
  name: string
}

// ---------- Label Maps ----------

export const testStatusLabels: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  completed: 'Completado',
  failed: 'Fallido',
  rejected: 'Rechazado',
}

export const testStatusBadgeStyles: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  rejected: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
}

export const passLabels: Record<string, string> = {
  true: 'Aprobado',
  false: 'Rechazado',
  null: 'Pendiente',
}

// ---------- Test Type Suggestions ----------

export const TEST_TYPE_SUGGESTIONS = [
  'potency',
  'contaminants',
  'terpenes',
  'heavy_metals',
  'pesticides',
  'moisture',
  'brix',
  'caliber',
  'microbiological',
  'mycotoxins',
]
