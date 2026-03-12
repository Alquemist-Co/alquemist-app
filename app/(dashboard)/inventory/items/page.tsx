import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ItemsListClient } from '@/components/inventory/items-list-client'

const DEFAULT_PAGE_SIZE = 20
const VALID_PAGE_SIZES = [10, 20, 50]

const VALID_LOT_STATUS = ['available', 'quarantine', 'expired', 'depleted']
const VALID_SOURCE_TYPE = ['purchase', 'production', 'transfer', 'transformation']

type SearchParams = Promise<{
  product_id?: string
  zone_id?: string
  facility_id?: string
  lot_status?: string
  source_type?: string
  show_depleted?: string
  search?: string
  page?: string
  pageSize?: string
}>

export default async function InventoryItemsPage({
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

  const canAdjust = currentUser.role === 'admin' || currentUser.role === 'manager'
  const canTransfer =
    currentUser.role === 'admin' ||
    currentUser.role === 'manager' ||
    currentUser.role === 'supervisor'
  const canChangeStatus = currentUser.role === 'admin' || currentUser.role === 'manager'

  // Pagination
  const pageSize = VALID_PAGE_SIZES.includes(parseInt(params.pageSize || ''))
    ? parseInt(params.pageSize!)
    : DEFAULT_PAGE_SIZE
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1)
  const offset = (page - 1) * pageSize

  const showDepleted = params.show_depleted === '1'

  // Build main query
  let query = supabase
    .from('inventory_items')
    .select(
      `id, batch_number, supplier_lot_number, quantity_available, quantity_reserved, quantity_committed,
      cost_per_unit, expiration_date, source_type, lot_status, created_at,
      product:products(id, name, sku, category:resource_categories(id, name)),
      unit:units_of_measure(id, code, name),
      zone:zones(id, name, facility:facilities(id, name)),
      shipment_item:shipment_items(supplier_lot_number, shipment:shipments(id, shipment_code))`,
      { count: 'exact' },
    )

  // Filters
  if (params.product_id) {
    query = query.eq('product_id', params.product_id)
  }

  if (params.zone_id) {
    query = query.eq('zone_id', params.zone_id)
  }

  if (params.lot_status && VALID_LOT_STATUS.includes(params.lot_status)) {
    query = query.eq('lot_status', params.lot_status as 'available' | 'quarantine' | 'expired' | 'depleted')
  }

  if (params.source_type && VALID_SOURCE_TYPE.includes(params.source_type)) {
    query = query.eq('source_type', params.source_type as 'purchase' | 'production' | 'transfer' | 'transformation')
  }

  if (params.search?.trim()) {
    const term = `%${params.search.trim()}%`
    query = query.or(`batch_number.ilike.${term}`)
  }

  // Exclude depleted by default
  if (!showDepleted && !params.lot_status) {
    query = query.neq('lot_status', 'depleted' as 'available' | 'quarantine' | 'expired' | 'depleted')
  }

  const { data: items, count } = await query
    .range(offset, offset + pageSize - 1)
    .order('product_id')
    .order('zone_id')

  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  // KPIs + reference data in parallel
  const [
    { count: activeLotsCount },
    { count: quarantineCount },
    { count: expiredCount },
    { data: distinctProductsData },
    { data: productsData },
    { data: zonesData },
    { data: facilitiesData },
  ] = await Promise.all([
    supabase
      .from('inventory_items')
      .select('id', { count: 'exact', head: true })
      .in('lot_status', ['available', 'quarantine']),
    supabase
      .from('inventory_items')
      .select('id', { count: 'exact', head: true })
      .eq('lot_status', 'quarantine'),
    supabase
      .from('inventory_items')
      .select('id', { count: 'exact', head: true })
      .eq('lot_status', 'expired'),
    supabase
      .from('inventory_items')
      .select('product_id'),
    supabase
      .from('products')
      .select('id, name, sku')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('zones')
      .select('id, name, facility:facilities(id, name)')
      .order('name'),
    supabase
      .from('facilities')
      .select('id, name')
      .order('name'),
  ])

  // Count distinct products from inventory
  const distinctProductIds = new Set((distinctProductsData ?? []).map((r) => r.product_id))
  const distinctProductCount = distinctProductIds.size

  const kpis = {
    activeLots: activeLotsCount ?? 0,
    quarantine: quarantineCount ?? 0,
    expired: expiredCount ?? 0,
    distinctProducts: distinctProductCount,
  }

  // Transform items
  const itemRows = (items ?? []).map((item) => {
    const product = item.product as { id: string; name: string; sku: string; category: { id: string; name: string } | null } | null
    const unit = item.unit as { id: string; code: string; name: string } | null
    const zone = item.zone as { id: string; name: string; facility: { id: string; name: string } | null } | null
    const shipmentItem = item.shipment_item as { supplier_lot_number: string | null; shipment: { id: string; shipment_code: string } | null }[] | null
    const firstShipment = Array.isArray(shipmentItem) ? shipmentItem[0] : null

    return {
      id: item.id,
      batch_number: item.batch_number ?? '',
      supplier_lot_number: item.supplier_lot_number,
      quantity_available: Number(item.quantity_available),
      quantity_reserved: Number(item.quantity_reserved),
      quantity_committed: Number(item.quantity_committed),
      cost_per_unit: item.cost_per_unit ? Number(item.cost_per_unit) : null,
      expiration_date: item.expiration_date,
      source_type: item.source_type,
      lot_status: item.lot_status,
      created_at: item.created_at,
      product_id: product?.id ?? '',
      product_name: product?.name ?? '',
      product_sku: product?.sku ?? '',
      category_name: product?.category?.name ?? null,
      unit_id: unit?.id ?? '',
      unit_code: unit?.code ?? '',
      zone_id: zone?.id ?? '',
      zone_name: zone?.name ?? '',
      facility_name: zone?.facility?.name ?? '',
      shipment_code: firstShipment?.shipment?.shipment_code ?? null,
    }
  })

  const products = (productsData ?? []).map((p) => ({ id: p.id, name: p.name, sku: p.sku }))
  const zones = (zonesData ?? []).map((z) => {
    const facility = z.facility as { id: string; name: string } | null
    return { id: z.id, name: z.name, facility_name: facility?.name ?? '' }
  })
  const facilities = (facilitiesData ?? []).map((f) => ({ id: f.id, name: f.name }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Inventario — Lotes</h2>
        <p className="text-sm text-muted-foreground">
          Consulta los niveles de stock por lote. Ajusta cantidades, transfiere entre zonas o cambia el estado del lote.
        </p>
      </div>

      <ItemsListClient
        items={itemRows}
        products={products}
        zones={zones}
        facilities={facilities}
        kpis={kpis}
        canAdjust={canAdjust}
        canTransfer={canTransfer}
        canChangeStatus={canChangeStatus}
        totalPages={totalPages}
        totalCount={totalCount}
        currentPage={page}
        pageSize={pageSize}
        filters={{
          product_id: params.product_id || '',
          zone_id: params.zone_id || '',
          facility_id: params.facility_id || '',
          lot_status: params.lot_status || '',
          source_type: params.source_type || '',
          show_depleted: showDepleted,
          search: params.search || '',
        }}
      />
    </div>
  )
}
