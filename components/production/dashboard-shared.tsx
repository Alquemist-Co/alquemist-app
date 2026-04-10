// ---------- Types ----------

export type DashboardBatchRow = {
  id: string
  code: string
  status: string
  cultivar_id: string
  cultivar_name: string
  crop_type_id: string
  crop_type_name: string
  phase_id: string
  phase_name: string
  phase_sort_order: number
  zone_name: string
  facility_name: string
  plant_count: number | null
  days_in_phase: number
}

export type DashboardPhase = {
  id: string
  name: string
  code: string
  sort_order: number
  crop_type_id: string
  color: string | null
  default_duration_days: number | null
  batch_count: number
  total_plants: number
}

export type DashboardCropType = {
  id: string
  name: string
  batch_count: number
}
