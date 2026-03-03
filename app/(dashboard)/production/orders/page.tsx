import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OrdersListClient } from '@/components/production/orders-list-client'

const PAGE_SIZE = 20

const VALID_STATUSES = ['draft', 'approved', 'in_progress', 'completed', 'cancelled']
const VALID_PRIORITIES = ['low', 'normal', 'high', 'urgent']

type SearchParams = Promise<{
  status?: string
  priority?: string
  cultivar?: string
  search?: string
  date_from?: string
  date_to?: string
  page?: string
}>

export default async function ProductionOrdersPage({
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

  const canWrite = ['admin', 'manager', 'supervisor'].includes(currentUser.role)
  const canCancel = ['admin', 'manager', 'supervisor'].includes(currentUser.role)

  // Build orders query
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1)
  const offset = (page - 1) * PAGE_SIZE

  let query = supabase
    .from('production_orders')
    .select(
      `*,
       cultivar:cultivars(id, name, crop_type_id, crop_type:crop_types(name)),
       entry_phase:production_phases!production_orders_entry_phase_id_fkey(id, name),
       exit_phase:production_phases!production_orders_exit_phase_id_fkey(id, name),
       initial_unit:units_of_measure!production_orders_initial_unit_id_fkey(id, code),
       output_unit:units_of_measure!production_orders_expected_output_unit_id_fkey(id, code),
       assigned_user:users!production_orders_assigned_to_fkey(id, full_name)`,
      { count: 'exact' },
    )

  if (params.status && VALID_STATUSES.includes(params.status)) {
    query = query.eq('status', params.status as 'draft')
  }

  if (params.priority && VALID_PRIORITIES.includes(params.priority)) {
    query = query.eq('priority', params.priority as 'normal')
  }

  if (params.cultivar) {
    query = query.eq('cultivar_id', params.cultivar)
  }

  if (params.search?.trim()) {
    const term = `%${params.search.trim()}%`
    query = query.or(`code.ilike.${term},notes.ilike.${term}`)
  }

  if (params.date_from) {
    query = query.gte('planned_start_date', params.date_from)
  }

  if (params.date_to) {
    query = query.lte('planned_start_date', params.date_to)
  }

  const { data: orders, count } = await query
    .range(offset, offset + PAGE_SIZE - 1)
    .order('created_at', { ascending: false })

  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  // Reference data
  const cultivarsRes = await supabase
    .from('cultivars')
    .select('id, name, crop_type_id, crop_type:crop_types(name)')
    .eq('is_active', true)
    .order('name')

  const ordersData = (orders ?? []).map((o) => {
    const cultivar = o.cultivar as { id: string; name: string; crop_type_id: string; crop_type: { name: string } | null } | null
    const entryPhase = o.entry_phase as { id: string; name: string } | null
    const exitPhase = o.exit_phase as { id: string; name: string } | null
    const initialUnit = o.initial_unit as { id: string; code: string } | null
    const outputUnit = o.output_unit as { id: string; code: string } | null
    const assignedUser = o.assigned_user as { id: string; full_name: string } | null

    return {
      id: o.id,
      code: o.code,
      cultivar_id: o.cultivar_id,
      cultivar_name: cultivar?.name ?? '',
      crop_type_name: cultivar?.crop_type?.name ?? '',
      entry_phase_id: o.entry_phase_id,
      entry_phase_name: entryPhase?.name ?? '',
      exit_phase_id: o.exit_phase_id,
      exit_phase_name: exitPhase?.name ?? '',
      initial_quantity: Number(o.initial_quantity),
      initial_unit_code: initialUnit?.code ?? '',
      expected_output_quantity: o.expected_output_quantity ? Number(o.expected_output_quantity) : null,
      expected_output_unit_code: outputUnit?.code ?? null,
      zone_name: null,
      planned_start_date: o.planned_start_date,
      planned_end_date: o.planned_end_date,
      assigned_to: o.assigned_to,
      assigned_to_name: assignedUser?.full_name ?? null,
      status: o.status,
      priority: o.priority,
      notes: o.notes,
    }
  })

  const cultivarsData = (cultivarsRes.data ?? []).map((c) => {
    const ct = c.crop_type as { name: string } | null
    return {
      id: c.id,
      name: c.name,
      crop_type_id: c.crop_type_id,
      crop_type_name: ct?.name ?? '',
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Órdenes de Producción</h2>
        <p className="text-sm text-muted-foreground">
          Gestiona las órdenes de producción de cultivos.
        </p>
      </div>

      <OrdersListClient
        orders={ordersData}
        cultivars={cultivarsData}
        canWrite={canWrite}
        canCancel={canCancel}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        currentPage={page}
        filters={{
          status: params.status || '',
          priority: params.priority || '',
          cultivar: params.cultivar || '',
          search: params.search || '',
          date_from: params.date_from || '',
          date_to: params.date_to || '',
        }}
      />
    </div>
  )
}
