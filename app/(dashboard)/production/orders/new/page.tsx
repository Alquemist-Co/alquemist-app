import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OrderFormClient } from '@/components/production/order-form-client'

type SearchParams = Promise<{
  edit?: string
}>

export default async function NewOrderPage({
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
  if (!canWrite) redirect('/production/orders')

  // Parallel reference data fetches
  const [cultivarsRes, phasesRes, productsRes, unitsRes, zonesRes, usersRes] = await Promise.all([
    supabase
      .from('cultivars')
      .select('id, name, crop_type_id, crop_type:crop_types(name)')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('production_phases')
      .select('id, code, name, sort_order, default_duration_days, crop_type_id, can_be_entry_point, can_be_exit_point')
      .order('sort_order'),
    supabase
      .from('products')
      .select('id, name, sku')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('units_of_measure')
      .select('id, code, name')
      .order('code'),
    supabase
      .from('zones')
      .select('id, name, facility_id')
      .eq('status', 'active')
      .order('name'),
    supabase
      .from('users')
      .select('id, full_name')
      .order('full_name'),
  ])

  // If editing, fetch existing order
  let existingOrder = null
  if (params.edit) {
    const { data: order } = await supabase
      .from('production_orders')
      .select('*')
      .eq('id', params.edit)
      .eq('status', 'draft')
      .single()

    if (order) {
      const { data: orderPhases } = await supabase
        .from('production_order_phases')
        .select('phase_id, planned_duration_days, zone_id')
        .eq('order_id', order.id)
        .order('sort_order')

      existingOrder = {
        id: order.id,
        cultivar_id: order.cultivar_id,
        entry_phase_id: order.entry_phase_id,
        exit_phase_id: order.exit_phase_id,
        initial_quantity: Number(order.initial_quantity),
        initial_unit_id: order.initial_unit_id,
        initial_product_id: order.initial_product_id,
        zone_id: order.zone_id,
        planned_start_date: order.planned_start_date,
        priority: order.priority,
        assigned_to: order.assigned_to,
        notes: order.notes,
        phases: (orderPhases ?? []).map((p) => ({
          phase_id: p.phase_id,
          planned_duration_days: p.planned_duration_days,
          zone_id: p.zone_id,
        })),
      }
    }
  }

  const cultivarsData = (cultivarsRes.data ?? []).map((c) => {
    const ct = c.crop_type as { name: string } | null
    return {
      id: c.id,
      name: c.name,
      crop_type_id: c.crop_type_id,
      crop_type_name: ct?.name ?? '',
    }
  })

  const phasesData = (phasesRes.data ?? []).map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    sort_order: p.sort_order,
    default_duration_days: p.default_duration_days,
    crop_type_id: p.crop_type_id,
    can_be_entry_point: p.can_be_entry_point,
    can_be_exit_point: p.can_be_exit_point,
  }))

  return (
    <OrderFormClient
      cultivars={cultivarsData}
      phases={phasesData}
      products={(productsRes.data ?? []).map((p) => ({ id: p.id, name: p.name, sku: p.sku }))}
      units={unitsRes.data ?? []}
      zones={(zonesRes.data ?? []).map((z) => ({ id: z.id, name: z.name, facility_id: z.facility_id }))}
      users={(usersRes.data ?? []).map((u) => ({ id: u.id, full_name: u.full_name }))}
      existingOrder={existingOrder}
    />
  )
}
