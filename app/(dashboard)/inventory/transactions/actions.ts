'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type TransactionType = Database['public']['Enums']['transaction_type']

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

type ExportFilters = {
  type?: string
  item_id?: string
  zone_id?: string
  batch_id?: string
  from?: string
  to?: string
  search?: string
}

type ExportRow = {
  timestamp: string
  type: string
  product_name: string
  product_sku: string
  batch_number: string
  quantity: number
  unit_code: string
  zone_name: string
  batch_code: string
  user_name: string
  cost_per_unit: number | null
  cost_total: number | null
  reason: string
}

export async function exportTransactionsCsv(
  filters: ExportFilters,
): Promise<{ data: ExportRow[] | null; error: string | null }> {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  // Check permission
  const { data: currentUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', authUser.id)
    .single()

  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
    return { data: null, error: 'Sin permisos para exportar.' }
  }

  // Build query — up to 1000 rows
  // Note: batch_id has no FK to batches, so we select it raw
  let query = supabase
    .from('inventory_transactions')
    .select(
      `
      id, type, quantity, cost_per_unit, cost_total, timestamp, reason, batch_id,
      inventory_item:inventory_items!inventory_item_id(batch_number, product:products(name, sku)),
      unit:units_of_measure(code),
      zone:zones(name),
      user:users!user_id(full_name)
    `,
    )

  if (filters.type && VALID_TYPES.includes(filters.type as TransactionType)) {
    query = query.eq('type', filters.type as TransactionType)
  }
  if (filters.item_id) {
    query = query.eq('inventory_item_id', filters.item_id)
  }
  if (filters.zone_id) {
    query = query.eq('zone_id', filters.zone_id)
  }
  if (filters.batch_id) {
    query = query.eq('batch_id', filters.batch_id)
  }
  if (filters.from) {
    query = query.gte('timestamp', filters.from)
  }
  if (filters.to) {
    query = query.lte('timestamp', filters.to + 'T23:59:59')
  }
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`
    query = query.or(`reason.ilike.${term},inventory_item.product.name.ilike.${term},inventory_item.batch_number.ilike.${term}`)
  }

  const { data, error } = await query.order('timestamp', { ascending: false }).limit(10000)

  if (error) {
    return { data: null, error: 'Error al cargar las transacciones para exportar.' }
  }

  // Fetch batch codes for lookup
  const batchIds = [
    ...new Set((data ?? []).map((t) => t.batch_id).filter(Boolean) as string[]),
  ]
  let batchesMap = new Map<string, string>()
  if (batchIds.length > 0) {
    const { data: batchesData } = await supabase
      .from('batches')
      .select('id, code')
      .in('id', batchIds)
    if (batchesData) {
      batchesMap = new Map(batchesData.map((b) => [b.id, b.code]))
    }
  }

  const rows: ExportRow[] = (data ?? []).map((t) => {
    const item = t.inventory_item as {
      batch_number: string | null
      product: { name: string; sku: string } | null
    } | null
    const unit = t.unit as { code: string } | null
    const zone = t.zone as { name: string } | null
    const user = t.user as { full_name: string } | null

    return {
      timestamp: t.timestamp,
      type: t.type,
      product_name: item?.product?.name ?? '',
      product_sku: item?.product?.sku ?? '',
      batch_number: item?.batch_number ?? '',
      quantity: Number(t.quantity),
      unit_code: unit?.code ?? '',
      zone_name: zone?.name ?? '',
      batch_code: t.batch_id ? (batchesMap.get(t.batch_id) ?? '') : '',
      user_name: user?.full_name ?? '',
      cost_per_unit: t.cost_per_unit != null ? Number(t.cost_per_unit) : null,
      cost_total: t.cost_total != null ? Number(t.cost_total) : null,
      reason: t.reason ?? '',
    }
  })

  return { data: rows, error: null }
}
