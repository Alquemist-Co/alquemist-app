import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { QualityTestsListClient } from '@/components/quality/tests-list-client'

const PAGE_SIZE = 20

const VALID_STATUSES = ['pending', 'in_progress', 'completed', 'failed', 'rejected']

type SearchParams = Promise<{
  status?: string
  test_type?: string
  facility?: string
  batch?: string
  cultivar?: string
  date_from?: string
  date_to?: string
  result?: string
  search?: string
  page?: string
}>

export default async function QualityTestsPage({
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

  const role = currentUser.role as string
  const canCreate = ['admin', 'manager', 'supervisor'].includes(role)

  const page = Math.max(1, parseInt(params.page || '1', 10) || 1)
  const offset = (page - 1) * PAGE_SIZE

  // Build query
  let query = supabase
    .from('quality_tests')
    .select(
      `*,
       batch:batches(id, code, status,
         cultivar:cultivars(id, name),
         zone:zones(id, name, facility:facilities(id, name))
       ),
       phase:production_phases(id, name),
       performer:users!quality_tests_performed_by_fkey(full_name),
       results:quality_test_results(id)`,
      { count: 'exact' },
    )

  // Filters
  if (params.status && VALID_STATUSES.includes(params.status)) {
    query = query.eq('status', params.status as 'pending')
  }

  if (params.test_type?.trim()) {
    query = query.eq('test_type', params.test_type.trim())
  }

  if (params.batch) {
    query = query.eq('batch_id', params.batch)
  }

  if (params.date_from) {
    query = query.gte('sample_date', params.date_from)
  }

  if (params.date_to) {
    query = query.lte('sample_date', params.date_to)
  }

  if (params.result === 'pass') {
    query = query.eq('overall_pass', true)
  } else if (params.result === 'fail') {
    query = query.eq('overall_pass', false)
  }

  if (params.search?.trim()) {
    const term = `%${params.search.trim()}%`
    query = query.or(`test_type.ilike.${term},lab_reference.ilike.${term}`)
  }

  const { data: tests, count } = await query
    .range(offset, offset + PAGE_SIZE - 1)
    .order('sample_date', { ascending: false })

  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  // KPIs + reference data in parallel
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    kpiPendingRes,
    kpiInProgressRes,
    kpiCompletedRes,
    kpiFailedRes,
    batchesRes,
    phasesRes,
  ] = await Promise.all([
    supabase.from('quality_tests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('quality_tests').select('id', { count: 'exact', head: true }).eq('status', 'in_progress'),
    supabase.from('quality_tests').select('id', { count: 'exact', head: true }).eq('status', 'completed')
      .gte('result_date', monthStart),
    supabase.from('quality_tests').select('id', { count: 'exact', head: true }).eq('status', 'failed')
      .gte('result_date', monthStart),
    supabase.from('batches').select('id, code, cultivar:cultivars(id, name), phase:production_phases!batches_current_phase_id_fkey(id, name)')
      .in('status', ['active', 'phase_transition', 'on_hold'])
      .order('code'),
    supabase.from('production_phases').select('id, name').order('sort_order'),
  ])

  const testsData = (tests ?? []).map((t) => {
    const batch = t.batch as { id: string; code: string; status: string; cultivar: { id: string; name: string } | null; zone: { id: string; name: string; facility: { id: string; name: string } | null } | null } | null
    const phase = t.phase as { id: string; name: string } | null
    const results = t.results as { id: string }[] | null

    return {
      id: t.id,
      test_type: t.test_type,
      batch_id: batch?.id ?? '',
      batch_code: batch?.code ?? '',
      cultivar_name: batch?.cultivar?.name ?? '',
      phase_name: phase?.name ?? '',
      facility_name: batch?.zone?.facility?.name ?? '',
      lab_name: t.lab_name,
      lab_reference: t.lab_reference,
      sample_date: t.sample_date,
      result_date: t.result_date,
      status: t.status,
      overall_pass: t.overall_pass,
      results_count: results?.length ?? 0,
    }
  })

  const batchesData = (batchesRes.data ?? []).map((b) => {
    const cultivar = b.cultivar as { id: string; name: string } | null
    const phase = b.phase as { id: string; name: string } | null
    return {
      id: b.id,
      code: b.code,
      cultivar_name: cultivar?.name ?? '',
      phase_name: phase?.name ?? '',
      phase_id: phase?.id ?? '',
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Tests de Calidad</h2>
        <p className="text-sm text-muted-foreground">
          Gestión de análisis de laboratorio por lote de producción.
        </p>
      </div>

      <QualityTestsListClient
        tests={testsData}
        batches={batchesData}
        phases={(phasesRes.data ?? []).map((p) => ({ id: p.id, name: p.name }))}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        currentPage={page}
        canCreate={canCreate}
        userId={currentUser.id}
        kpis={{
          pending: kpiPendingRes.count ?? 0,
          in_progress: kpiInProgressRes.count ?? 0,
          completed_month: kpiCompletedRes.count ?? 0,
          failed_month: kpiFailedRes.count ?? 0,
        }}
        filters={{
          status: params.status || '',
          test_type: params.test_type || '',
          batch: params.batch || '',
          cultivar: params.cultivar || '',
          facility: params.facility || '',
          date_from: params.date_from || '',
          date_to: params.date_to || '',
          result: params.result || '',
          search: params.search || '',
        }}
      />
    </div>
  )
}
