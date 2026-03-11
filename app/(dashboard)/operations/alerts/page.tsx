import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AlertsListClient } from '@/components/operations/alerts-list-client'

const PAGE_SIZE = 20

const VALID_SEVERITIES = ['critical', 'high', 'warning', 'info']
const VALID_STATUSES = ['pending', 'acknowledged', 'resolved']
const VALID_TYPES = [
  'overdue_activity', 'low_inventory', 'stale_batch', 'expiring_item',
  'env_out_of_range', 'order_delayed', 'quality_failed',
  'regulatory_expiring', 'regulatory_missing', 'pest_detected', 'phi_violation',
]

type SearchParams = Promise<{
  severity?: string
  type?: string
  status?: string
  show_resolved?: string
  search?: string
  page?: string
}>

export default async function AlertsPage({
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

  const role = currentUser.role as string
  const canAcknowledge = ['admin', 'manager', 'supervisor'].includes(role)
  const canResolve = ['admin', 'manager', 'supervisor'].includes(role)
  const companyId = currentUser.company_id as string

  const page = Math.max(1, parseInt(params.page || '1', 10) || 1)
  const offset = (page - 1) * PAGE_SIZE

  // Determine which statuses to show
  const showResolved = params.show_resolved === 'true'
  const statusFilter = params.status && VALID_STATUSES.includes(params.status)
    ? [params.status]
    : showResolved
      ? ['pending', 'acknowledged', 'resolved']
      : ['pending', 'acknowledged']

  // Build query
  let query = supabase
    .from('alerts')
    .select(
      `*,
       acknowledged_user:users!alerts_acknowledged_by_fkey(full_name)`,
      { count: 'exact' },
    )
    .in('status', statusFilter as unknown as ['pending'])

  if (params.severity && VALID_SEVERITIES.includes(params.severity)) {
    query = query.eq('severity', params.severity as 'critical')
  }

  if (params.type && VALID_TYPES.includes(params.type)) {
    query = query.eq('type', params.type as 'overdue_activity')
  }

  const { data: alerts, count } = await query
    .range(offset, offset + PAGE_SIZE - 1)
    .order('triggered_at', { ascending: false })

  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  // KPIs: count by severity (pending + acknowledged only)
  const [kpiCritical, kpiHigh, kpiWarning, kpiInfo, kpiAcknowledged] = await Promise.all([
    supabase.from('alerts').select('id', { count: 'exact', head: true })
      .eq('severity', 'critical').in('status', ['pending', 'acknowledged'] as unknown as ['pending']),
    supabase.from('alerts').select('id', { count: 'exact', head: true })
      .eq('severity', 'high').in('status', ['pending', 'acknowledged'] as unknown as ['pending']),
    supabase.from('alerts').select('id', { count: 'exact', head: true })
      .eq('severity', 'warning').in('status', ['pending', 'acknowledged'] as unknown as ['pending']),
    supabase.from('alerts').select('id', { count: 'exact', head: true })
      .eq('severity', 'info').in('status', ['pending', 'acknowledged'] as unknown as ['pending']),
    supabase.from('alerts').select('id', { count: 'exact', head: true })
      .eq('status', 'acknowledged'),
  ])

  const alertsData = (alerts ?? []).map((a) => {
    const ackUser = a.acknowledged_user as { full_name: string } | null
    return {
      id: a.id,
      type: a.type,
      severity: a.severity,
      title: a.title,
      entity_type: a.entity_type,
      entity_id: a.entity_id,
      batch_id: a.batch_id,
      message: a.message,
      triggered_at: a.triggered_at,
      status: a.status,
      acknowledged_by_name: ackUser?.full_name ?? null,
      acknowledged_at: a.acknowledged_at,
      resolved_at: a.resolved_at,
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Alertas</h2>
        <p className="text-sm text-muted-foreground">
          Centro de alertas operativas del sistema.
        </p>
      </div>

      <AlertsListClient
        alerts={alertsData}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        currentPage={page}
        canAcknowledge={canAcknowledge}
        canResolve={canResolve}
        companyId={companyId}
        userId={currentUser.id}
        kpis={{
          critical: kpiCritical.count ?? 0,
          high: kpiHigh.count ?? 0,
          warning: kpiWarning.count ?? 0,
          info: kpiInfo.count ?? 0,
          acknowledged: kpiAcknowledged.count ?? 0,
        }}
        filters={{
          severity: params.severity || '',
          type: params.type || '',
          status: params.status || '',
          show_resolved: showResolved,
        }}
      />
    </div>
  )
}
