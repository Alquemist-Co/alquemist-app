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

  // KPI aggregation (single DB query) + reference data in parallel
  const [
    { data: kpiData },
    { data: zonesData },
    { data: batchesData },
  ] = await Promise.all([
    supabase.rpc('fn_transaction_kpis', {
      p_zone_id: params.zone_id || undefined,
      p_batch_id: params.batch_id || undefined,
      p_item_id: params.item_id || undefined,
      p_from: params.from || undefined,
      p_to: params.to ? params.to + 'T23:59:59' : undefined,
    }),
    supabase.from('zones').select('id, name').order('name'),
    supabase.from('batches').select('id, code').eq('is_active', true).order('code'),
  ])

  const kpiResult = kpiData as {
    entries_count: number; entries_cost: number
    exits_count: number; exits_cost: number
    adjust_count: number; adjust_cost: number
  } | null

  const kpis = {
    entriesCount: kpiResult?.entries_count ?? 0,
    entriesCost: kpiResult?.entries_cost ?? 0,
    exitsCount: kpiResult?.exits_count ?? 0,
    exitsCost: kpiResult?.exits_cost ?? 0,
    adjustCount: kpiResult?.adjust_count ?? 0,
    adjustCost: kpiResult?.adjust_cost ?? 0,
    periodCost: (kpiResult?.entries_cost ?? 0) + (kpiResult?.exits_cost ?? 0) + (kpiResult?.adjust_cost ?? 0),
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
