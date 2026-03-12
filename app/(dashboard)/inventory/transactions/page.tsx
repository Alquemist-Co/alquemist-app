import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TransactionsListClient } from '@/components/inventory/transactions-list-client'
import type { Database } from '@/types/database'

type TransactionType = Database['public']['Enums']['transaction_type']

const DEFAULT_PAGE_SIZE = 20
const VALID_PAGE_SIZES = [10, 20, 50]

const VALID_TYPES: TransactionType[] = [
  'receipt',
  'consumption',
  'application',
  'transfer_out',
  'transfer_in',
  'transformation_out',
  'transformation_in',
  'adjustment',
  'waste',
  'return',
  'reservation',
  'release',
]

const ENTRY_TYPES: TransactionType[] = ['receipt', 'transfer_in', 'transformation_in', 'return']
const EXIT_TYPES: TransactionType[] = [
  'consumption',
  'application',
  'transfer_out',
  'transformation_out',
  'waste',
]
const ADJUST_TYPES: TransactionType[] = ['adjustment', 'reservation', 'release']

type SearchParams = Promise<{
  type?: string
  item_id?: string
  zone_id?: string
  batch_id?: string
  from?: string
  to?: string
  search?: string
  page?: string
  pageSize?: string
}>

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  const { data: currentUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', authUser.id)
    .single()

  if (!currentUser) {
    redirect('/login')
  }

  const canExport = currentUser.role === 'admin' || currentUser.role === 'manager'

  // Pagination
  const pageSize = VALID_PAGE_SIZES.includes(parseInt(params.pageSize || ''))
    ? parseInt(params.pageSize!)
    : DEFAULT_PAGE_SIZE
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1)
  const offset = (page - 1) * pageSize

  // Build main query
  // Note: batch_id has no FK to batches table, so we select it raw and resolve client-side
  let query = supabase
    .from('inventory_transactions')
    .select(
      `
      id, type, quantity, cost_per_unit, cost_total, timestamp, reason, batch_id,
      inventory_item:inventory_items!inventory_item_id(id, batch_number, product:products(id, name, sku)),
      unit:units_of_measure(code),
      zone:zones(id, name),
      user:users!user_id(id, full_name),
      related:inventory_transactions!related_transaction_id(id, type),
      target_item:inventory_items!target_item_id(id, batch_number, zone:zones(name))
    `,
      { count: 'exact' },
    )

  // Apply filters
  if (params.type && VALID_TYPES.includes(params.type as TransactionType)) {
    query = query.eq('type', params.type as TransactionType)
  }

  if (params.item_id) {
    query = query.eq('inventory_item_id', params.item_id)
  }

  if (params.zone_id) {
    query = query.eq('zone_id', params.zone_id)
  }

  if (params.batch_id) {
    query = query.eq('batch_id', params.batch_id)
  }

  if (params.from) {
    query = query.gte('timestamp', params.from)
  }

  if (params.to) {
    query = query.lte('timestamp', params.to + 'T23:59:59')
  }

  if (params.search?.trim()) {
    const term = `%${params.search.trim()}%`
    query = query.or(`reason.ilike.${term}`)
  }

  const { data: transactions, count } = await query
    .range(offset, offset + pageSize - 1)
    .order('timestamp', { ascending: false })

  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  // Build KPI queries and reference data in parallel
  let entriesQuery = supabase
    .from('inventory_transactions')
    .select('cost_total', { count: 'exact' })
    .in('type', ENTRY_TYPES)

  let exitsQuery = supabase
    .from('inventory_transactions')
    .select('cost_total', { count: 'exact' })
    .in('type', EXIT_TYPES)

  let adjustQuery = supabase
    .from('inventory_transactions')
    .select('cost_total', { count: 'exact' })
    .in('type', ADJUST_TYPES)

  // Apply date filters to KPIs
  if (params.from) {
    entriesQuery = entriesQuery.gte('timestamp', params.from)
    exitsQuery = exitsQuery.gte('timestamp', params.from)
    adjustQuery = adjustQuery.gte('timestamp', params.from)
  }
  if (params.to) {
    entriesQuery = entriesQuery.lte('timestamp', params.to + 'T23:59:59')
    exitsQuery = exitsQuery.lte('timestamp', params.to + 'T23:59:59')
    adjustQuery = adjustQuery.lte('timestamp', params.to + 'T23:59:59')
  }

  // Apply zone/batch/item filters to KPIs too
  if (params.zone_id) {
    entriesQuery = entriesQuery.eq('zone_id', params.zone_id)
    exitsQuery = exitsQuery.eq('zone_id', params.zone_id)
    adjustQuery = adjustQuery.eq('zone_id', params.zone_id)
  }
  if (params.batch_id) {
    entriesQuery = entriesQuery.eq('batch_id', params.batch_id)
    exitsQuery = exitsQuery.eq('batch_id', params.batch_id)
    adjustQuery = adjustQuery.eq('batch_id', params.batch_id)
  }
  if (params.item_id) {
    entriesQuery = entriesQuery.eq('inventory_item_id', params.item_id)
    exitsQuery = exitsQuery.eq('inventory_item_id', params.item_id)
    adjustQuery = adjustQuery.eq('inventory_item_id', params.item_id)
  }

  const [
    { data: entriesData, count: entriesCount },
    { data: exitsData, count: exitsCount },
    { data: adjustData, count: adjustCount },
    { data: zonesData },
    { data: batchesData },
  ] = await Promise.all([
    entriesQuery,
    exitsQuery,
    adjustQuery,
    supabase.from('zones').select('id, name').order('name'),
    supabase.from('batches').select('id, code').eq('is_active', true).order('code'),
  ])

  // Sum cost_total for each category
  const entriesCostTotal = (entriesData ?? []).reduce(
    (sum, t) => sum + (t.cost_total ? Number(t.cost_total) : 0),
    0,
  )
  const exitsCostTotal = (exitsData ?? []).reduce(
    (sum, t) => sum + (t.cost_total ? Number(t.cost_total) : 0),
    0,
  )
  const adjustCostTotal = (adjustData ?? []).reduce(
    (sum, t) => sum + (t.cost_total ? Number(t.cost_total) : 0),
    0,
  )

  const kpis = {
    entriesCount: entriesCount ?? 0,
    entriesCost: entriesCostTotal,
    exitsCount: exitsCount ?? 0,
    exitsCost: exitsCostTotal,
    adjustCount: adjustCount ?? 0,
    adjustCost: adjustCostTotal,
    periodCost: entriesCostTotal + exitsCostTotal + adjustCostTotal,
  }

  const zones = (zonesData ?? []).map((z) => ({ id: z.id, name: z.name }))
  const batchesMap = new Map(
    (batchesData ?? []).map((b) => [b.id, b.code]),
  )
  const batches = (batchesData ?? []).map((b) => ({ id: b.id, code: b.code }))

  // Transform transactions
  const transactionRows = (transactions ?? []).map((t) => {
    const item = t.inventory_item as {
      id: string
      batch_number: string | null
      product: { id: string; name: string; sku: string } | null
    } | null
    const unit = t.unit as { code: string } | null
    const zone = t.zone as { id: string; name: string } | null
    const user = t.user as { id: string; full_name: string } | null
    const related = t.related as { id: string; type: string } | null
    const targetItem = t.target_item as {
      id: string
      batch_number: string | null
      zone: { name: string } | null
    } | null

    return {
      id: t.id,
      type: t.type,
      quantity: Number(t.quantity),
      cost_per_unit: t.cost_per_unit != null ? Number(t.cost_per_unit) : null,
      cost_total: t.cost_total != null ? Number(t.cost_total) : null,
      timestamp: t.timestamp,
      reason: t.reason,
      item_batch_number: item?.batch_number ?? null,
      item_product_name: item?.product?.name ?? null,
      item_product_sku: item?.product?.sku ?? null,
      unit_code: unit?.code ?? null,
      zone_id: zone?.id ?? null,
      zone_name: zone?.name ?? null,
      batch_id: t.batch_id ?? null,
      batch_code: t.batch_id ? (batchesMap.get(t.batch_id) ?? null) : null,
      user_name: user?.full_name ?? null,
      related_id: related?.id ?? null,
      related_type: related?.type ?? null,
      target_item_batch: targetItem?.batch_number ?? null,
      target_item_zone: targetItem?.zone?.name ?? null,
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Transacciones de Inventario</h2>
        <p className="text-sm text-muted-foreground">
          Registro inmutable de todos los movimientos de stock.
        </p>
      </div>

      <TransactionsListClient
        transactions={transactionRows}
        zones={zones}
        batches={batches}
        canExport={canExport}
        totalPages={totalPages}
        totalCount={totalCount}
        currentPage={page}
        pageSize={pageSize}
        kpis={kpis}
        filters={{
          type: params.type || '',
          item_id: params.item_id || '',
          zone_id: params.zone_id || '',
          batch_id: params.batch_id || '',
          from: params.from || '',
          to: params.to || '',
          search: params.search || '',
        }}
      />
    </div>
  )
}
