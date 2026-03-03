import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BatchesListClient } from '@/components/production/batches-list-client'

const PAGE_SIZE = 20

const VALID_STATUSES = ['active', 'phase_transition', 'completed', 'cancelled', 'on_hold']
const DEFAULT_STATUSES = ['active', 'phase_transition', 'on_hold'] as const

type SearchParams = Promise<{
  status?: string
  cultivar?: string
  phase?: string
  zone?: string
  search?: string
  show_all?: string
  page?: string
}>

export default async function BatchesPage({
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

  // Build batches query
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1)
  const offset = (page - 1) * PAGE_SIZE
  const showAll = params.show_all === 'true'

  let query = supabase
    .from('batches')
    .select(
      `*,
       cultivar:cultivars(id, name),
       phase:production_phases!batches_current_phase_id_fkey(id, name),
       zone:zones(id, name, facility:facilities(id, name)),
       order:production_orders(id, code),
       product:products(id, name, sku)`,
      { count: 'exact' },
    )

  // Default: only active statuses unless show_all
  if (!showAll) {
    if (params.status && VALID_STATUSES.includes(params.status)) {
      query = query.eq('status', params.status as 'active')
    } else {
      query = query.in('status', DEFAULT_STATUSES)
    }
  } else if (params.status && VALID_STATUSES.includes(params.status)) {
    query = query.eq('status', params.status as 'active')
  }

  if (params.cultivar) {
    query = query.eq('cultivar_id', params.cultivar)
  }

  if (params.phase) {
    query = query.eq('current_phase_id', params.phase)
  }

  if (params.zone) {
    query = query.eq('zone_id', params.zone)
  }

  if (params.search?.trim()) {
    const term = `%${params.search.trim()}%`
    query = query.ilike('code', term)
  }

  const { data: batches, count } = await query
    .range(offset, offset + PAGE_SIZE - 1)
    .order('start_date', { ascending: false })

  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  // KPIs + reference data in parallel
  const [
    kpiActiveRes,
    kpiTransitionRes,
    kpiHoldRes,
    kpiCompletedRes,
    cultivarsRes,
    phasesRes,
    zonesRes,
  ] = await Promise.all([
    supabase.from('batches').select('id', { count: 'exact', head: true }).in('status', ['active', 'phase_transition']),
    supabase.from('batches').select('id', { count: 'exact', head: true }).eq('status', 'phase_transition'),
    supabase.from('batches').select('id', { count: 'exact', head: true }).eq('status', 'on_hold'),
    supabase.from('batches').select('id', { count: 'exact', head: true }).eq('status', 'completed')
      .gte('updated_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    supabase.from('cultivars').select('id, name').eq('is_active', true).order('name'),
    supabase.from('production_phases').select('id, name').order('sort_order'),
    supabase.from('zones').select('id, name, facility:facilities(id, name)').order('name'),
  ])

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const batchesData = (batches ?? []).map((b) => {
    const cultivar = b.cultivar as { id: string; name: string } | null
    const phase = b.phase as { id: string; name: string } | null
    const zone = b.zone as { id: string; name: string; facility: { id: string; name: string } | null } | null
    const order = b.order as { id: string; code: string } | null
    const product = b.product as { id: string; name: string; sku: string } | null

    const startDate = new Date(b.start_date + 'T00:00:00')
    const endDate = b.status === 'completed' || b.status === 'cancelled'
      ? new Date(b.updated_at)
      : new Date(todayStr + 'T00:00:00')
    const days = Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))

    return {
      id: b.id,
      code: b.code,
      cultivar_name: cultivar?.name ?? '',
      phase_name: phase?.name ?? '',
      zone_name: zone?.name ?? '',
      facility_name: zone?.facility?.name ?? '',
      plant_count: b.plant_count,
      current_product_name: product?.name ?? null,
      order_code: order?.code ?? null,
      order_id: order?.id ?? null,
      start_date: b.start_date,
      expected_end_date: b.expected_end_date,
      days_in_production: days,
      status: b.status,
    }
  })

  const cultivarsData = (cultivarsRes.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
  }))

  const phasesData = (phasesRes.data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
  }))

  const zonesData = (zonesRes.data ?? []).map((z) => {
    const facility = z.facility as { id: string; name: string } | null
    return {
      id: z.id,
      name: z.name,
      facility_id: facility?.id ?? '',
      facility_name: facility?.name ?? '',
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Lotes de Producción</h2>
        <p className="text-sm text-muted-foreground">
          Seguimiento de lotes activos y su progreso por fase.
        </p>
      </div>

      <BatchesListClient
        batches={batchesData}
        cultivars={cultivarsData}
        phases={phasesData}
        zones={zonesData}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        currentPage={page}
        kpis={{
          active: kpiActiveRes.count ?? 0,
          in_transition: kpiTransitionRes.count ?? 0,
          on_hold: kpiHoldRes.count ?? 0,
          completed_month: kpiCompletedRes.count ?? 0,
        }}
        filters={{
          status: params.status || '',
          cultivar: params.cultivar || '',
          phase: params.phase || '',
          zone: params.zone || '',
          search: params.search || '',
          show_all: params.show_all || '',
        }}
      />
    </div>
  )
}
