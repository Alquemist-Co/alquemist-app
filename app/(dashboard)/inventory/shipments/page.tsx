import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ShipmentsListClient } from '@/components/inventory/shipments-list-client'

const PAGE_SIZE = 20

const VALID_STATUSES = [
  'scheduled', 'in_transit', 'received', 'inspecting',
  'accepted', 'partial_accepted', 'rejected', 'cancelled',
]

type SearchParams = Promise<{
  tab?: string
  status?: string
  supplier?: string
  facility?: string
  search?: string
  page?: string
}>

export default async function ShipmentsPage({
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

  // Build shipments query
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1)
  const offset = (page - 1) * PAGE_SIZE
  const tab = params.tab === 'outbound' ? 'outbound' : 'inbound'

  let query = supabase
    .from('shipments')
    .select(
      '*, supplier:suppliers(id, name), facility:facilities(id, name), items:shipment_items(id)',
      { count: 'exact' },
    )
    .eq('type', tab)

  if (params.status && VALID_STATUSES.includes(params.status)) {
    query = query.eq('status', params.status as 'scheduled')
  }

  if (params.supplier && tab === 'inbound') {
    query = query.eq('supplier_id', params.supplier)
  }

  if (params.facility) {
    query = query.eq('destination_facility_id', params.facility)
  }

  if (params.search?.trim()) {
    const term = `%${params.search.trim()}%`
    query = query.or(`shipment_code.ilike.${term},purchase_order_ref.ilike.${term}`)
  }

  const { data: shipments, count } = await query
    .range(offset, offset + PAGE_SIZE - 1)
    .order('estimated_arrival_date', { ascending: false, nullsFirst: false })

  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  // Reference data (parallel fetches)
  const [suppliersRes, facilitiesRes, productsRes, unitsRes, zonesRes] = await Promise.all([
    supabase.from('suppliers').select('id, name').eq('is_active', true).order('name'),
    supabase.from('facilities').select('id, name').eq('is_active', true).order('name'),
    supabase.from('products').select('id, name, sku, default_unit_id, shelf_life_days').eq('is_active', true).order('name'),
    supabase.from('units_of_measure').select('id, code, name').order('code'),
    supabase.from('zones').select('id, name, facility_id').eq('status', 'active').order('name'),
  ])

  const shipmentsData = (shipments ?? []).map((s) => {
    const supplier = s.supplier as { id: string; name: string } | null
    const facility = s.facility as { id: string; name: string } | null
    return {
      id: s.id,
      shipment_code: s.shipment_code,
      type: s.type,
      status: s.status,
      supplier_id: s.supplier_id,
      supplier_name: supplier?.name ?? null,
      origin_name: s.origin_name,
      destination_facility_id: s.destination_facility_id,
      facility_name: facility?.name ?? '',
      estimated_arrival_date: s.estimated_arrival_date,
      actual_arrival_date: s.actual_arrival_date,
      purchase_order_ref: s.purchase_order_ref,
      items_count: Array.isArray(s.items) ? s.items.length : 0,
      carrier_name: s.carrier_name,
      carrier_vehicle: s.carrier_vehicle,
      carrier_driver: s.carrier_driver,
      carrier_contact: s.carrier_contact,
      dispatch_date: s.dispatch_date,
      origin_address: s.origin_address,
      transport_conditions: s.transport_conditions as Record<string, unknown> | null,
      notes: s.notes,
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Envíos</h2>
        <p className="text-sm text-muted-foreground">
          Gestiona los envíos de entrada y salida de inventario.
        </p>
      </div>

      <ShipmentsListClient
        shipments={shipmentsData}
        suppliers={suppliersRes.data ?? []}
        facilities={facilitiesRes.data ?? []}
        products={(productsRes.data ?? []).map((p) => ({ ...p, shelf_life_days: p.shelf_life_days ?? null }))}
        units={unitsRes.data ?? []}
        zones={zonesRes.data ?? []}
        canWrite={canWrite}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        currentPage={page}
        filters={{
          tab,
          status: params.status || '',
          supplier: params.supplier || '',
          facility: params.facility || '',
          search: params.search || '',
        }}
      />
    </div>
  )
}
