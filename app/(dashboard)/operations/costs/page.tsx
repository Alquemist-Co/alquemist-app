import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CostsClient } from '@/components/operations/costs-client'

const PAGE_SIZE = 20

const VALID_COST_TYPES = [
  'energy', 'rent', 'depreciation', 'insurance', 'maintenance', 'labor_fixed', 'other',
]

type SearchParams = Promise<{
  facility?: string
  zone?: string
  type?: string
  from?: string
  to?: string
  page?: string
  view?: string
}>

export default async function CostsPage({
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
    .select('id, role, company_id')
    .eq('id', authUser.id)
    .single()

  if (!currentUser) redirect('/login')

  const companyId = currentUser.company_id as string
  const role = currentUser.role as string

  // Check feature flag
  const { data: company } = await supabase
    .from('companies')
    .select('currency, settings')
    .eq('id', companyId)
    .single()

  const settings = company?.settings as Record<string, unknown> | null
  const featuresEnabled = settings?.features_enabled as Record<string, boolean> | null
  const costTrackingEnabled = featuresEnabled?.cost_tracking !== false

  if (!costTrackingEnabled) {
    redirect('/')
  }

  const currency = company?.currency ?? 'COP'
  const canEdit = ['admin', 'manager'].includes(role)
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1)
  const offset = (page - 1) * PAGE_SIZE

  // Default date range: current month
  const now = new Date()
  const defaultFrom = params.from || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const defaultTo = params.to || now.toISOString().split('T')[0]

  // Build costs query
  let query = supabase
    .from('overhead_costs')
    .select(
      `*,
       facility:facilities(id, name),
       zone:zones(id, name)`,
      { count: 'exact' },
    )
    .order('period_start', { ascending: false })

  if (params.facility) {
    query = query.eq('facility_id', params.facility)
  }

  if (params.zone) {
    query = query.eq('zone_id', params.zone)
  }

  if (params.type && VALID_COST_TYPES.includes(params.type)) {
    query = query.eq('cost_type', params.type as 'energy')
  }

  if (params.from) {
    query = query.gte('period_start', params.from)
  }

  if (params.to) {
    query = query.lte('period_end', params.to)
  }

  const { data: costs, count } = await query.range(offset, offset + PAGE_SIZE - 1)

  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  // KPIs: current month + previous month totals
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonthStart = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-01`
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]

  const [currentMonthRes, prevMonthRes, facilitiesRes, zonesRes] = await Promise.all([
    supabase
      .from('overhead_costs')
      .select('amount, cost_type')
      .gte('period_start', monthStart),
    supabase
      .from('overhead_costs')
      .select('amount')
      .gte('period_start', prevMonthStart)
      .lte('period_end', prevMonthEnd),
    supabase
      .from('facilities')
      .select('id, name')
      .eq('company_id', companyId)
      .order('name'),
    supabase
      .from('zones')
      .select('id, name, facility_id')
      .eq('status', 'active')
      .order('name'),
  ])

  const currentMonthTotal = (currentMonthRes.data ?? []).reduce(
    (sum, c) => sum + Number(c.amount), 0,
  )
  const prevMonthTotal = (prevMonthRes.data ?? []).reduce(
    (sum, c) => sum + Number(c.amount), 0,
  )

  // Cost by type for current month
  const costByType: Record<string, number> = {}
  for (const c of currentMonthRes.data ?? []) {
    costByType[c.cost_type] = (costByType[c.cost_type] || 0) + Number(c.amount)
  }

  // Map costs
  const costsData = (costs ?? []).map((c) => {
    const facility = c.facility as { id: string; name: string } | null
    const zone = c.zone as { id: string; name: string } | null
    return {
      id: c.id,
      cost_type: c.cost_type,
      description: c.description,
      amount: Number(c.amount),
      currency: c.currency,
      period_start: c.period_start,
      period_end: c.period_end,
      allocation_basis: c.allocation_basis,
      notes: c.notes,
      facility_id: c.facility_id,
      facility_name: facility?.name ?? '',
      zone_id: c.zone_id,
      zone_name: zone?.name ?? null,
    }
  })

  const facilitiesData = (facilitiesRes.data ?? []).map((f) => ({
    id: f.id,
    name: f.name,
  }))

  const zonesData = (zonesRes.data ?? []).map((z) => ({
    id: z.id,
    name: z.name,
    facility_id: z.facility_id,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Costos Overhead
        </h2>
        <p className="text-sm text-muted-foreground">
          Registro de costos indirectos para cálculo de COGS.
        </p>
      </div>

      <CostsClient
        costs={costsData}
        facilities={facilitiesData}
        zones={zonesData}
        currency={currency}
        canEdit={canEdit}
        companyId={companyId}
        userId={currentUser.id}
        totalPages={totalPages}
        totalCount={totalCount}
        currentPage={page}
        pageSize={PAGE_SIZE}
        kpis={{
          currentMonthTotal,
          prevMonthTotal,
          costByType,
        }}
        filters={{
          facility: params.facility || '',
          zone: params.zone || '',
          type: params.type || '',
          from: defaultFrom,
          to: defaultTo,
        }}
        initialView={params.view === 'cogs' ? 'cogs' : 'costs'}
      />
    </div>
  )
}
