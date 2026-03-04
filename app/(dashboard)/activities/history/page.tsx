import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { HistoryClient } from '@/components/activities/history-client'

const PAGE_SIZE = 20

type SearchParams = Promise<{
  status?: string
  facility?: string
  zone?: string
  batch?: string
  type?: string
  cultivar?: string
  phase?: string
  operator?: string
  search?: string
  page?: string
  date_from?: string
  date_to?: string
}>

export default async function HistoryPage({
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

  const { data: currentUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', authUser.id)
    .single()
  if (!currentUser) redirect('/login')

  const canExport = ['admin', 'manager'].includes(currentUser.role)
  const isOperator = currentUser.role === 'operator'

  const page = Math.max(1, parseInt(params.page || '1', 10) || 1)
  const offset = (page - 1) * PAGE_SIZE

  // Build main query
  let query = supabase
    .from('activities')
    .select(
      `*,
       type:activity_types(id, name),
       template:activity_templates(id, name, code),
       batch:batches(id, code, status,
         cultivar:cultivars(id, name),
         phase:production_phases!batches_current_phase_id_fkey(id, name)
       ),
       phase:production_phases(id, name),
       zone:zones(id, name, facility:facilities(id, name)),
       user:users!activities_performed_by_fkey(id, full_name),
       resources:activity_resources(count),
       observations:activity_observations(count)`,
      { count: 'exact' },
    )
    .order('performed_at', { ascending: false })

  // Operator auto-filter
  if (isOperator) {
    query = query.eq('performed_by', currentUser.id)
  } else if (params.operator) {
    query = query.eq('performed_by', params.operator)
  }

  if (params.status) {
    query = query.eq('status', params.status as 'completed')
  }
  if (params.batch) {
    query = query.eq('batch_id', params.batch)
  }
  if (params.zone) {
    query = query.eq('zone_id', params.zone)
  }
  if (params.phase) {
    query = query.eq('phase_id', params.phase)
  }
  if (params.date_from) {
    query = query.gte('performed_at', params.date_from + 'T00:00:00')
  }
  if (params.date_to) {
    query = query.lte('performed_at', params.date_to + 'T23:59:59')
  }
  if (params.search?.trim()) {
    // PostgREST doesn't support cross-table ilike, search client-side
  }

  const { data: activities, count } = await query
    .range(offset, offset + PAGE_SIZE - 1)

  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  // Reference data in parallel
  const [
    facilitiesRes, zonesRes, batchesRes, activityTypesRes,
    cultivarsRes, phasesRes, operatorsRes,
  ] = await Promise.all([
    supabase.from('facilities').select('id, name').order('name'),
    supabase.from('zones').select('id, name, facility:facilities(id, name)').order('name'),
    supabase.from('batches').select('id, code, zone_id, cultivar:cultivars(id, name), phase:production_phases!batches_current_phase_id_fkey(id, name)').order('code'),
    supabase.from('activity_types').select('id, name').eq('is_active', true).order('name'),
    supabase.from('cultivars').select('id, name').eq('is_active', true).order('name'),
    supabase.from('production_phases').select('id, name').order('sort_order'),
    isOperator
      ? Promise.resolve({ data: [] })
      : supabase.from('users').select('id, full_name').order('full_name'),
  ])

  // Check for high-severity observations
  const activityIds = (activities ?? []).map((a) => a.id)
  let highSeveritySet = new Set<string>()
  if (activityIds.length > 0) {
    const { data: highObs } = await supabase
      .from('activity_observations')
      .select('activity_id')
      .in('activity_id', activityIds)
      .in('severity', ['high', 'critical'])
    if (highObs) {
      highSeveritySet = new Set(highObs.map((o) => o.activity_id))
    }
  }

  // Transform data
  const activitiesData = (activities ?? []).map((a) => {
    const type = a.type as { id: string; name: string } | null
    const template = a.template as { id: string; name: string; code: string | null } | null
    const batch = a.batch as { id: string; code: string; status: string; cultivar: { id: string; name: string } | null; phase: { id: string; name: string } | null } | null
    const zone = a.zone as { id: string; name: string; facility: { id: string; name: string } | null } | null
    const user = a.user as { id: string; full_name: string } | null
    const resources = a.resources as { count: number }[]
    const observations = a.observations as { count: number }[]

    return {
      id: a.id,
      performed_at: a.performed_at,
      crop_day: a.crop_day,
      duration_minutes: a.duration_minutes,
      status: a.status,
      notes: a.notes,
      activity_type_name: type?.name ?? '—',
      template_name: template?.name ?? '—',
      template_code: template?.code ?? null,
      batch_id: batch?.id ?? '',
      batch_code: batch?.code ?? '',
      batch_status: batch?.status ?? '',
      cultivar_name: batch?.cultivar?.name ?? '',
      phase_name: batch?.phase?.name ?? a.phase?.name ?? '',
      zone_name: zone?.name ?? '',
      facility_name: zone?.facility?.name ?? '',
      operator_name: user?.full_name ?? '',
      resources_count: resources?.[0]?.count ?? 0,
      observations_count: observations?.[0]?.count ?? 0,
      has_high_severity: highSeveritySet.has(a.id),
    }
  })

  const facilitiesData = (facilitiesRes.data ?? []).map((f) => ({ id: f.id, name: f.name }))
  const zonesData = (zonesRes.data ?? []).map((z) => {
    const facility = z.facility as { id: string; name: string } | null
    return { id: z.id, name: z.name, facility_id: facility?.id ?? '', facility_name: facility?.name ?? '' }
  })
  const batchesData = (batchesRes.data ?? []).map((b) => {
    const cultivar = b.cultivar as { id: string; name: string } | null
    const phase = b.phase as { id: string; name: string } | null
    return {
      id: b.id, code: b.code, zone_id: b.zone_id,
      cultivar_name: cultivar?.name ?? '', phase_name: phase?.name ?? '', phase_id: phase?.id ?? '',
    }
  })
  const activityTypesData = (activityTypesRes.data ?? []).map((t) => ({ id: t.id, name: t.name }))
  const cultivarsData = (cultivarsRes.data ?? []).map((c) => ({ id: c.id, name: c.name }))
  const phasesData = (phasesRes.data ?? []).map((p) => ({ id: p.id, name: p.name }))
  const operatorsData = ((operatorsRes as { data: { id: string; full_name: string }[] | null }).data ?? []).map((u) => ({ id: u.id, full_name: u.full_name }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Historial de Actividades</h2>
        <p className="text-sm text-muted-foreground">
          {totalCount} actividad{totalCount !== 1 ? 'es' : ''} registrada{totalCount !== 1 ? 's' : ''}
        </p>
      </div>

      <HistoryClient
        activities={activitiesData}
        facilities={facilitiesData}
        zones={zonesData}
        batches={batchesData}
        activityTypes={activityTypesData}
        cultivars={cultivarsData}
        phases={phasesData}
        operators={operatorsData}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        currentPage={page}
        filters={{
          status: params.status || '',
          facility: params.facility || '',
          zone: params.zone || '',
          batch: params.batch || '',
          type: params.type || '',
          cultivar: params.cultivar || '',
          phase: params.phase || '',
          operator: params.operator || '',
          search: params.search || '',
          date_from: params.date_from || '',
          date_to: params.date_to || '',
        }}
        canExport={canExport}
        isOperator={isOperator}
      />
    </div>
  )
}
