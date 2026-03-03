import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  OrderDetailClient,
  type OrderDetailData,
} from '@/components/production/order-detail-client'
import type { OrderPhaseRow } from '@/components/production/orders-shared'

type Params = Promise<{ id: string }>

export default async function OrderDetailPage({
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
  const canWrite = ['admin', 'manager', 'supervisor'].includes(role)
  const canCancel = ['admin', 'manager'].includes(role)

  // Fetch order + phases in parallel (independent queries)
  const [orderRes, phasesRes] = await Promise.all([
    supabase
      .from('production_orders')
      .select(`
        *,
        cultivar:cultivars(id, name, code, crop_type:crop_types(name)),
        entry_phase:production_phases!production_orders_entry_phase_id_fkey(id, name),
        exit_phase:production_phases!production_orders_exit_phase_id_fkey(id, name),
        initial_unit:units_of_measure!production_orders_initial_unit_id_fkey(id, code),
        output_unit:units_of_measure!production_orders_expected_output_unit_id_fkey(id, code),
        initial_product:products!production_orders_initial_product_id_fkey(id, name, sku),
        expected_output_product:products!production_orders_expected_output_product_id_fkey(id, name, sku),
        zone:zones(id, name),
        assigned_user:users!production_orders_assigned_to_fkey(id, full_name)
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('production_order_phases')
      .select(`
        *,
        phase:production_phases(id, name, sort_order),
        zone:zones(id, name)
      `)
      .eq('order_id', id)
      .order('sort_order'),
  ])

  const order = orderRes.data
  if (!order) notFound()
  const phasesRaw = phasesRes.data

  // Cast joined relations
  const cultivar = order.cultivar as { id: string; name: string; code: string; crop_type: { name: string } | null } | null
  const entryPhase = order.entry_phase as { id: string; name: string } | null
  const exitPhase = order.exit_phase as { id: string; name: string } | null
  const initialUnit = order.initial_unit as { id: string; code: string } | null
  const outputUnit = order.output_unit as { id: string; code: string } | null
  const initialProduct = order.initial_product as { id: string; name: string; sku: string } | null
  const outputProduct = order.expected_output_product as { id: string; name: string; sku: string } | null
  const zone = order.zone as { id: string; name: string } | null
  const assignedUser = order.assigned_user as { id: string; full_name: string } | null

  const orderData: OrderDetailData = {
    id: order.id,
    code: order.code,
    status: order.status,
    priority: order.priority,
    cultivar_name: cultivar?.name ?? '',
    crop_type_name: cultivar?.crop_type?.name ?? '',
    entry_phase_name: entryPhase?.name ?? '',
    exit_phase_name: exitPhase?.name ?? '',
    initial_quantity: Number(order.initial_quantity),
    initial_unit_code: initialUnit?.code ?? '',
    initial_product_name: initialProduct?.name ?? null,
    initial_product_sku: initialProduct?.sku ?? null,
    expected_output_quantity: order.expected_output_quantity != null ? Number(order.expected_output_quantity) : null,
    expected_output_unit_code: outputUnit?.code ?? null,
    expected_output_product_name: outputProduct?.name ?? null,
    expected_output_product_sku: outputProduct?.sku ?? null,
    zone_name: zone?.name ?? null,
    planned_start_date: order.planned_start_date,
    planned_end_date: order.planned_end_date,
    assigned_to_name: assignedUser?.full_name ?? null,
    notes: order.notes,
    created_at: order.created_at,
    updated_at: order.updated_at,
  }

  const phases: OrderPhaseRow[] = (phasesRaw ?? []).map((p) => {
    const phase = p.phase as { id: string; name: string; sort_order: number } | null
    const pZone = p.zone as { id: string; name: string } | null
    return {
      id: p.id,
      phase_name: phase?.name ?? '',
      sort_order: p.sort_order,
      status: p.status,
      planned_duration_days: p.planned_duration_days,
      zone_name: pZone?.name ?? null,
      planned_start_date: p.planned_start_date,
      planned_end_date: p.planned_end_date,
      expected_input_qty: p.expected_input_qty != null ? Number(p.expected_input_qty) : null,
      expected_output_qty: p.expected_output_qty != null ? Number(p.expected_output_qty) : null,
      yield_pct: p.yield_pct != null ? Number(p.yield_pct) : null,
    }
  })

  return (
    <OrderDetailClient
      order={orderData}
      phases={phases}
      canWrite={canWrite}
      canCancel={canCancel}
    />
  )
}
