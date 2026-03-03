'use client'

// ---------- Types ----------

export type OrderRow = {
  id: string
  code: string
  cultivar_id: string
  cultivar_name: string
  crop_type_name: string
  entry_phase_id: string
  entry_phase_name: string
  exit_phase_id: string
  exit_phase_name: string
  initial_quantity: number
  initial_unit_code: string
  expected_output_quantity: number | null
  expected_output_unit_code: string | null
  zone_name: string | null
  planned_start_date: string | null
  planned_end_date: string | null
  assigned_to: string | null
  assigned_to_name: string | null
  status: string
  priority: string
  notes: string | null
}

export type CultivarOption = {
  id: string
  name: string
  crop_type_id: string
  crop_type_name: string
}

export type PhaseOption = {
  id: string
  code: string
  name: string
  sort_order: number
  default_duration_days: number | null
  crop_type_id: string
  can_be_entry_point: boolean
  can_be_exit_point: boolean
}

export type ProductOption = { id: string; name: string; sku: string }
export type UnitOption = { id: string; code: string; name: string }
export type ZoneOption = { id: string; name: string; facility_id: string }
export type UserOption = { id: string; full_name: string }

// ---------- Label Maps ----------

export const orderStatusLabels: Record<string, string> = {
  draft: 'Borrador',
  approved: 'Aprobada',
  in_progress: 'En progreso',
  completed: 'Completada',
  cancelled: 'Cancelada',
}

export const orderPriorityLabels: Record<string, string> = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
}

// ---------- Badge Styles ----------

export const orderStatusBadgeStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export const orderPriorityBadgeStyles: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

// ---------- Select class (reuse pattern) ----------

export const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring'

// ---------- Phase Utilities ----------

/** Get phases valid as entry points for a given crop type */
export function getEntryPhases(phases: PhaseOption[], cropTypeId: string): PhaseOption[] {
  const filtered = phases.filter((p) => p.crop_type_id === cropTypeId)
  // If any phase is flagged as can_be_entry_point, use those; otherwise allow first
  const entryFlagged = filtered.filter((p) => p.can_be_entry_point)
  if (entryFlagged.length > 0) return entryFlagged
  const sorted = [...filtered].sort((a, b) => a.sort_order - b.sort_order)
  return sorted.length > 0 ? [sorted[0]] : []
}

/** Get phases valid as exit points for a given crop type, after the entry phase */
export function getExitPhases(
  phases: PhaseOption[],
  cropTypeId: string,
  entryPhaseId: string,
): PhaseOption[] {
  const filtered = phases.filter((p) => p.crop_type_id === cropTypeId)
  const entry = filtered.find((p) => p.id === entryPhaseId)
  if (!entry) return []
  const after = filtered.filter((p) => p.sort_order >= entry.sort_order)
  // If any is flagged can_be_exit_point, use those; otherwise allow last
  const exitFlagged = after.filter((p) => p.can_be_exit_point)
  if (exitFlagged.length > 0) return exitFlagged
  const sorted = [...after].sort((a, b) => a.sort_order - b.sort_order)
  return sorted.length > 0 ? [sorted[sorted.length - 1]] : []
}

/** Build the phase chain between entry and exit (inclusive) */
export function buildPhaseChain(
  phases: PhaseOption[],
  cropTypeId: string,
  entryPhaseId: string,
  exitPhaseId: string,
): PhaseOption[] {
  const filtered = phases.filter((p) => p.crop_type_id === cropTypeId)
  const entry = filtered.find((p) => p.id === entryPhaseId)
  const exit = filtered.find((p) => p.id === exitPhaseId)
  if (!entry || !exit) return []
  return filtered
    .filter((p) => p.sort_order >= entry.sort_order && p.sort_order <= exit.sort_order)
    .sort((a, b) => a.sort_order - b.sort_order)
}
