import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  BatchDetailClient,
  type BatchDetailData,
  type OrderPhaseData,
  type LineageRecord,
  type ZoneOption,
} from '@/components/production/batch-detail-client'

type Params = Promise<{ id: string }>

export default async function BatchDetailPage({
  params,
}: {
  params: Params
}) {
  const { id } = await params
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
  const canTransition = ['admin', 'manager', 'supervisor'].includes(role)
  const canHoldCancel = ['admin', 'manager'].includes(role)

  // Fetch batch + order phases + lineage + zones in parallel
  const [batchRes, zonesRes] = await Promise.all([
    supabase
      .from('batches')
      .select(`
        *,
        cultivar:cultivars(id, name, code, crop_type:crop_types(name)),
        phase:production_phases!batches_current_phase_id_fkey(id, name),
        zone:zones(id, name, facility:facilities(id, name)),
        product:products!batches_current_product_id_fkey(id, name, sku),
        order:production_orders(id, code, status),
        parent:batches!batches_parent_batch_id_fkey(id, code, status)
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('zones')
      .select('id, name, facility:facilities(id, name)')
      .order('name'),
  ])

  const batch = batchRes.data
  if (!batch) notFound()

  // Fetch order phases + lineage (depend on batch data)
  const [phasesRes, lineageParentRes, lineageChildRes] = await Promise.all([
    batch.production_order_id
      ? supabase
          .from('production_order_phases')
          .select(`
            *,
            phase:production_phases(id, name, sort_order),
            zone:zones(id, name)
          `)
          .eq('order_id', batch.production_order_id)
          .order('sort_order')
      : Promise.resolve({ data: null }),
    supabase
      .from('batch_lineage')
      .select('*, parent:batches!batch_lineage_parent_batch_id_fkey(id, code, status), child:batches!batch_lineage_child_batch_id_fkey(id, code, status)')
      .eq('parent_batch_id', id),
    supabase
      .from('batch_lineage')
      .select('*, parent:batches!batch_lineage_parent_batch_id_fkey(id, code, status), child:batches!batch_lineage_child_batch_id_fkey(id, code, status)')
      .eq('child_batch_id', id),
  ])

  // Cast joined relations
  const cultivar = batch.cultivar as { id: string; name: string; code: string; crop_type: { name: string } | null } | null
  const phase = batch.phase as { id: string; name: string } | null
  const zone = batch.zone as { id: string; name: string; facility: { id: string; name: string } | null } | null
  const product = batch.product as { id: string; name: string; sku: string } | null
  const order = batch.order as { id: string; code: string; status: string } | null
  const parentArr = batch.parent as { id: string; code: string; status: string }[] | null
  const parent = parentArr?.[0] ?? null

  const batchData: BatchDetailData = {
    id: batch.id,
    code: batch.code,
    status: batch.status,
    cultivar_name: cultivar?.name ?? '',
    cultivar_code: cultivar?.code ?? '',
    crop_type_name: cultivar?.crop_type?.name ?? '',
    phase_name: phase?.name ?? '',
    phase_id: batch.current_phase_id,
    zone_name: zone?.name ?? '',
    zone_id: batch.zone_id,
    facility_name: zone?.facility?.name ?? '',
    plant_count: batch.plant_count,
    area_m2: batch.area_m2 != null ? Number(batch.area_m2) : null,
    product_name: product?.name ?? null,
    product_sku: product?.sku ?? null,
    order_id: order?.id ?? null,
    order_code: order?.code ?? null,
    order_status: order?.status ?? null,
    parent_batch_id: parent?.id ?? null,
    parent_batch_code: parent?.code ?? null,
    start_date: batch.start_date,
    expected_end_date: batch.expected_end_date,
    yield_wet_kg: batch.yield_wet_kg != null ? Number(batch.yield_wet_kg) : null,
    yield_dry_kg: batch.yield_dry_kg != null ? Number(batch.yield_dry_kg) : null,
    created_at: batch.created_at,
    updated_at: batch.updated_at,
    production_order_id: batch.production_order_id,
  }

  const phases: OrderPhaseData[] = (phasesRes.data ?? []).map((p) => {
    const ph = p.phase as { id: string; name: string; sort_order: number } | null
    const pZone = p.zone as { id: string; name: string } | null
    return {
      id: p.id,
      phase_name: ph?.name ?? '',
      phase_id: p.phase_id,
      sort_order: p.sort_order,
      status: p.status,
      planned_duration_days: p.planned_duration_days,
      zone_name: pZone?.name ?? null,
      planned_start_date: p.planned_start_date,
      planned_end_date: p.planned_end_date,
      actual_start_date: p.actual_start_date,
      actual_end_date: p.actual_end_date,
      expected_input_qty: p.expected_input_qty != null ? Number(p.expected_input_qty) : null,
      expected_output_qty: p.expected_output_qty != null ? Number(p.expected_output_qty) : null,
      yield_pct: p.yield_pct != null ? Number(p.yield_pct) : null,
    }
  })

  const allLineage = [...(lineageParentRes.data ?? []), ...(lineageChildRes.data ?? [])]
  // Deduplicate by id
  const lineageMap = new Map<string, typeof allLineage[0]>()
  for (const l of allLineage) lineageMap.set(l.id, l)

  const lineage: LineageRecord[] = Array.from(lineageMap.values()).map((l) => {
    const lParent = l.parent as { id: string; code: string; status: string } | null
    const lChild = l.child as { id: string; code: string; status: string } | null
    return {
      id: l.id,
      operation: l.operation,
      parent_batch_id: l.parent_batch_id,
      parent_batch_code: lParent?.code ?? '',
      child_batch_id: l.child_batch_id,
      child_batch_code: lChild?.code ?? '',
      quantity: l.quantity_transferred != null ? Number(l.quantity_transferred) : null,
      reason: l.reason,
      created_at: l.created_at,
    }
  })

  const zonesData: ZoneOption[] = (zonesRes.data ?? []).map((z) => {
    const f = z.facility as { id: string; name: string } | null
    return {
      id: z.id,
      name: z.name,
      facility_name: f?.name ?? '',
    }
  })

  return (
    <BatchDetailClient
      batch={batchData}
      phases={phases}
      lineage={lineage}
      zones={zonesData}
      canTransition={canTransition}
      canHoldCancel={canHoldCancel}
    />
  )
}
