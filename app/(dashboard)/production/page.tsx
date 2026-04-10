import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProductionDashboardClient } from '@/components/production/dashboard-client'
import type {
  DashboardBatchRow,
  DashboardPhase,
  DashboardCropType,
} from '@/components/production/dashboard-shared'

type SearchParams = Promise<{
  crop_type?: string
  facility?: string
  status?: string
  cultivar?: string
}>

export default async function ProductionDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) redirect('/login')

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // Parallel queries
  const [
    batchesRes,
    orderPhasesRes,
    phasesRes,
    kpiActiveRes,
    kpiTransitionRes,
    kpiHoldRes,
    kpiCompletedRes,
  ] = await Promise.all([
    // Active batches with joins
    supabase
      .from('batches')
      .select(
        `id, code, status, plant_count, start_date,
         cultivar:cultivars(id, name, crop_type:crop_types(id, name)),
         phase:production_phases!batches_current_phase_id_fkey(id, name, sort_order, code, color),
         zone:zones(id, name, facility:facilities(id, name))`,
      )
      .in('status', ['active', 'phase_transition', 'on_hold']),

    // In-progress order phases (to compute days in current phase)
    supabase
      .from('production_order_phases')
      .select('batch_id, actual_start_date')
      .eq('status', 'in_progress'),

    // All production phases with crop_type_id
    supabase
      .from('production_phases')
      .select('id, name, sort_order, code, color, default_duration_days, crop_type_id')
      .order('sort_order'),

    // KPIs
    supabase
      .from('batches')
      .select('id', { count: 'exact', head: true })
      .in('status', ['active', 'phase_transition']),

    supabase
      .from('batches')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'phase_transition'),

    supabase
      .from('batches')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'on_hold'),

    supabase
      .from('batches')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('updated_at', new Date(today.getFullYear(), today.getMonth(), 1).toISOString()),
  ])

  // Build a map of batch_id -> actual_start_date for current phase
  const phaseStartMap = new Map<string, string>()
  for (const op of orderPhasesRes.data ?? []) {
    if (op.batch_id && op.actual_start_date) {
      phaseStartMap.set(op.batch_id, op.actual_start_date)
    }
  }

  // Map batches to DashboardBatchRow
  let totalDaysInProduction = 0

  const batchesData: DashboardBatchRow[] = (batchesRes.data ?? []).map((b) => {
    const cultivar = b.cultivar as {
      id: string
      name: string
      crop_type: { id: string; name: string } | null
    } | null
    const phase = b.phase as {
      id: string
      name: string
      sort_order: number
      code: string
      color: string | null
    } | null
    const zone = b.zone as {
      id: string
      name: string
      facility: { id: string; name: string } | null
    } | null

    // Calculate days in current phase
    const phaseStartStr = phaseStartMap.get(b.id) ?? b.start_date
    const phaseStart = new Date(phaseStartStr + 'T00:00:00')
    const todayDate = new Date(todayStr + 'T00:00:00')
    const daysInPhase = Math.max(1, Math.floor((todayDate.getTime() - phaseStart.getTime()) / (1000 * 60 * 60 * 24)))

    // Accumulate total days in production for avg KPI
    const prodStart = new Date(b.start_date + 'T00:00:00')
    totalDaysInProduction += Math.max(1, Math.floor((todayDate.getTime() - prodStart.getTime()) / (1000 * 60 * 60 * 24)))

    return {
      id: b.id,
      code: b.code,
      status: b.status,
      cultivar_id: cultivar?.id ?? '',
      cultivar_name: cultivar?.name ?? '',
      crop_type_id: cultivar?.crop_type?.id ?? '',
      crop_type_name: cultivar?.crop_type?.name ?? '',
      phase_id: phase?.id ?? '',
      phase_name: phase?.name ?? '',
      phase_sort_order: phase?.sort_order ?? 0,
      zone_name: zone?.name ?? '',
      facility_name: zone?.facility?.name ?? '',
      plant_count: b.plant_count,
      days_in_phase: daysInPhase,
    }
  })

  // Build phases with aggregated counts
  const phasesRaw = phasesRes.data ?? []
  const phasesData: DashboardPhase[] = phasesRaw.map((p) => {
    const batchesInPhase = batchesData.filter((b) => b.phase_id === p.id)
    return {
      id: p.id,
      name: p.name,
      code: p.code,
      sort_order: p.sort_order,
      crop_type_id: p.crop_type_id,
      color: p.color,
      default_duration_days: p.default_duration_days,
      batch_count: batchesInPhase.length,
      total_plants: batchesInPhase.reduce((sum, b) => sum + (b.plant_count ?? 0), 0),
    }
  })

  // Derive crop types from batch data (sorted by batch count desc)
  const cropTypeMap = new Map<string, DashboardCropType>()
  for (const batch of batchesData) {
    if (!batch.crop_type_id) continue
    const existing = cropTypeMap.get(batch.crop_type_id)
    if (existing) {
      existing.batch_count += 1
    } else {
      cropTypeMap.set(batch.crop_type_id, {
        id: batch.crop_type_id,
        name: batch.crop_type_name,
        batch_count: 1,
      })
    }
  }
  const cropTypes = Array.from(cropTypeMap.values()).sort(
    (a, b) => b.batch_count - a.batch_count,
  )

  // Extract unique facilities and cultivars for filters
  const facilitySet = new Set<string>()
  const cultivarMap = new Map<string, { id: string; name: string; crop_type_id: string }>()
  for (const batch of batchesData) {
    if (batch.facility_name) facilitySet.add(batch.facility_name)
    if (batch.cultivar_id && !cultivarMap.has(batch.cultivar_id)) {
      cultivarMap.set(batch.cultivar_id, {
        id: batch.cultivar_id,
        name: batch.cultivar_name,
        crop_type_id: batch.crop_type_id,
      })
    }
  }

  const filterOptions = {
    facilities: Array.from(facilitySet).sort(),
    cultivars: Array.from(cultivarMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
  }

  const totalPlants = batchesData.reduce((sum, b) => sum + (b.plant_count ?? 0), 0)
  const avgDuration =
    batchesData.length > 0
      ? Math.round(totalDaysInProduction / batchesData.length)
      : 0

  const kpis = {
    active: kpiActiveRes.count ?? 0,
    transition: kpiTransitionRes.count ?? 0,
    hold: kpiHoldRes.count ?? 0,
    completedMonth: kpiCompletedRes.count ?? 0,
    avgDuration,
    totalPlants,
  }

  return (
    <ProductionDashboardClient
      batches={batchesData}
      phases={phasesData}
      cropTypes={cropTypes}
      kpis={kpis}
      filterOptions={filterOptions}
    />
  )
}
