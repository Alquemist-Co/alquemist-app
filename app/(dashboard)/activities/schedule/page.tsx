import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ScheduleClient } from '@/components/activities/schedule-client'

const PAGE_SIZE = 20
const VALID_STATUSES = ['pending', 'completed', 'skipped', 'overdue']

type SearchParams = Promise<{
  status?: string
  facility?: string
  zone?: string
  batch?: string
  type?: string
  search?: string
  page?: string
  view?: string
  week_start?: string
}>

export default async function SchedulePage({
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

  const canManage = ['admin', 'manager', 'supervisor'].includes(currentUser.role)

  // Determine date range for calendar (±2 weeks from week_start or today)
  const weekStart = params.week_start
    ? new Date(params.week_start + 'T00:00:00')
    : getMonday(new Date())
  const rangeStart = new Date(weekStart)
  rangeStart.setDate(rangeStart.getDate() - 14)
  const rangeEnd = new Date(weekStart)
  rangeEnd.setDate(rangeEnd.getDate() + 21) // 3 weeks forward

  const page = Math.max(1, parseInt(params.page || '1', 10) || 1)
  const offset = (page - 1) * PAGE_SIZE

  // Build query
  let query = supabase
    .from('scheduled_activities')
    .select(
      `*,
       template:activity_templates(id, name, code, estimated_duration_min,
         activity_type:activity_types(id, name)
       ),
       batch:batches(id, code,
         cultivar:cultivars(id, name),
         phase:production_phases!batches_current_phase_id_fkey(id, name),
         zone:zones(id, name, facility:facilities(id, name))
       ),
       phase:production_phases(id, name),
       completed_activity:activities(id)`,
      { count: 'exact' },
    )
    .gte('planned_date', rangeStart.toISOString().split('T')[0])
    .lte('planned_date', rangeEnd.toISOString().split('T')[0])
    .order('planned_date', { ascending: true })

  if (params.status && VALID_STATUSES.includes(params.status)) {
    query = query.eq('status', params.status as 'pending')
  }

  if (params.batch) {
    query = query.eq('batch_id', params.batch)
  }

  if (params.search?.trim()) {
    // Search by batch code via the batch relation isn't possible with ilike on FK
    // We'll filter client-side for search
  }

  // For list view, apply pagination
  const isListView = params.view === 'list'
  if (isListView) {
    query = query.range(offset, offset + PAGE_SIZE - 1)
  }

  const { data: activities, count } = await query

  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  // KPIs + ref data in parallel
  const today = new Date().toISOString().split('T')[0]
  const [
    kpiPendingRes,
    kpiCompletedRes,
    kpiOverdueRes,
    kpiSkippedRes,
    facilitiesRes,
    zonesRes,
    batchesRes,
    activityTypesRes,
  ] = await Promise.all([
    supabase.from('scheduled_activities').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('scheduled_activities').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('scheduled_activities').select('id', { count: 'exact', head: true }).eq('status', 'overdue'),
    supabase.from('scheduled_activities').select('id', { count: 'exact', head: true }).eq('status', 'skipped'),
    supabase.from('facilities').select('id, name').order('name'),
    supabase.from('zones').select('id, name, facility:facilities(id, name)').order('name'),
    supabase.from('batches').select('id, code, zone_id, cultivar:cultivars(id, name), phase:production_phases!batches_current_phase_id_fkey(id, name)').in('status', ['active', 'phase_transition']).order('code'),
    supabase.from('activity_types').select('id, name').eq('is_active', true).order('name'),
  ])

  // Transform data
  const activitiesData = (activities ?? []).map((sa) => {
    const template = sa.template as { id: string; name: string; code: string | null; estimated_duration_min: number | null; activity_type: { id: string; name: string } | null } | null
    const batch = sa.batch as { id: string; code: string; cultivar: { id: string; name: string } | null; phase: { id: string; name: string } | null; zone: { id: string; name: string; facility: { id: string; name: string } | null } | null } | null
    const completedActivity = sa.completed_activity as { id: string } | null

    // Client-side overdue detection
    let status = sa.status as string
    if (status === 'pending' && sa.planned_date < today) {
      status = 'overdue'
    }

    return {
      id: sa.id,
      planned_date: sa.planned_date,
      crop_day: sa.crop_day,
      status,
      template_name: template?.name ?? '—',
      template_code: template?.code ?? null,
      activity_type_name: template?.activity_type?.name ?? '—',
      batch_id: batch?.id ?? '',
      batch_code: batch?.code ?? '',
      cultivar_name: batch?.cultivar?.name ?? '',
      phase_name: batch?.phase?.name ?? sa.phase?.name ?? '',
      zone_name: batch?.zone?.name ?? '',
      facility_name: batch?.zone?.facility?.name ?? '',
      estimated_duration_min: template?.estimated_duration_min ?? null,
      completed_activity_id: completedActivity?.id ?? sa.completed_activity_id,
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Calendario de Actividades</h2>
        <p className="text-sm text-muted-foreground">
          Planificación y seguimiento de actividades programadas.
        </p>
      </div>

      <ScheduleClient
        activities={activitiesData}
        facilities={facilitiesData}
        zones={zonesData}
        batches={batchesData}
        activityTypes={activityTypesData}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        currentPage={page}
        weekStart={weekStart.toISOString().split('T')[0]}
        kpis={{
          pending: kpiPendingRes.count ?? 0,
          completed: kpiCompletedRes.count ?? 0,
          overdue: kpiOverdueRes.count ?? 0,
          skipped: kpiSkippedRes.count ?? 0,
        }}
        filters={{
          status: params.status || '',
          facility: params.facility || '',
          zone: params.zone || '',
          batch: params.batch || '',
          type: params.type || '',
          search: params.search || '',
          view: params.view || 'calendar',
        }}
        canManage={canManage}
        userRole={currentUser.role}
      />
    </div>
  )
}

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}
