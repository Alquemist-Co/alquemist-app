import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ExecuteClient } from '@/components/activities/execute-client'

type Params = Promise<{ id: string }>

export default async function ExecuteActivityPage({
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
    .select('id, role, full_name')
    .eq('id', authUser.id)
    .single()
  if (!currentUser) redirect('/login')

  // Fetch scheduled activity with full joins
  const { data: scheduledActivity } = await supabase
    .from('scheduled_activities')
    .select(
      `*,
       template:activity_templates(id, name, code, estimated_duration_min, metadata,
         triggers_phase_change_id, triggers_transformation,
         activity_type:activity_types(id, name)
       ),
       batch:batches(id, code, status, plant_count, area_m2,
         cultivar:cultivars(id, name, code, crop_type:crop_types(id, name)),
         phase:production_phases!batches_current_phase_id_fkey(id, name, sort_order),
         zone:zones(id, name, effective_growing_area_m2, facility:facilities(id, name)),
         product:products!batches_current_product_id_fkey(id, name, sku)
       ),
       phase:production_phases(id, name),
       completed_activity:activities(id, performed_at, performed_by,
         user:users!activities_performed_by_fkey(full_name)
       )`,
    )
    .eq('id', id)
    .single()

  if (!scheduledActivity) notFound()

  const template = scheduledActivity.template as {
    id: string; name: string; code: string | null;
    estimated_duration_min: number | null; metadata: Record<string, unknown> | null;
    triggers_phase_change_id: string | null; triggers_transformation: boolean | null;
    activity_type: { id: string; name: string } | null;
  } | null

  const batch = scheduledActivity.batch as {
    id: string; code: string; status: string; plant_count: number | null; area_m2: number | null;
    cultivar: { id: string; name: string; code: string | null; crop_type: { id: string; name: string } | null } | null;
    phase: { id: string; name: string; sort_order: number } | null;
    zone: { id: string; name: string; effective_growing_area_m2: number | null; facility: { id: string; name: string } | null } | null;
    product: { id: string; name: string; sku: string } | null;
  } | null

  const completedActivity = scheduledActivity.completed_activity as {
    id: string; performed_at: string; performed_by: string;
    user: { full_name: string } | null;
  }[] | null

  const isAlreadyExecuted = scheduledActivity.status === 'completed' || scheduledActivity.status === 'skipped'
  const canExecute = ['pending', 'overdue'].includes(scheduledActivity.status as string) &&
    ['admin', 'manager', 'supervisor', 'operator'].includes(currentUser.role)

  let templateResources: {
    product_id: string; product_name: string; quantity: number;
    quantity_basis: string; unit_id: string; unit_code: string;
    is_optional: boolean;
  }[] = []

  let templateChecklist: {
    step_order: number; instruction: string; expected_value: string | null;
    tolerance: string | null; is_critical: boolean; requires_photo: boolean;
  }[] = []

  if (template?.id) {
    // Fetch template resources (no FK to products/units — resolve manually)
    const { data: resources } = await supabase
      .from('activity_template_resources')
      .select('*')
      .eq('template_id', template.id)
      .order('sort_order')

    // Resolve product names
    const resourceProductIds = (resources ?? []).map((r) => r.product_id).filter(Boolean) as string[]
    const { data: resourceProducts } = resourceProductIds.length > 0
      ? await supabase.from('products').select('id, name, default_unit_id').in('id', resourceProductIds)
      : { data: [] }

    // Resolve unit names from default_unit_id
    const unitIds = (resourceProducts ?? []).map((p) => p.default_unit_id).filter(Boolean) as string[]
    const { data: resourceUnits } = unitIds.length > 0
      ? await supabase.from('units_of_measure').select('id, code, name').in('id', unitIds)
      : { data: [] }

    const productMap = new Map((resourceProducts ?? []).map((p) => [p.id, p]))
    const unitMap = new Map((resourceUnits ?? []).map((u) => [u.id, u]))

    templateResources = (resources ?? []).map((r) => {
      const product = r.product_id ? productMap.get(r.product_id) : null
      const unit = product?.default_unit_id ? unitMap.get(product.default_unit_id) : null
      return {
        product_id: r.product_id ?? '',
        product_name: product?.name ?? '—',
        quantity: r.quantity,
        quantity_basis: r.quantity_basis ?? 'fixed',
        unit_id: unit?.id ?? '',
        unit_code: unit?.code ?? '',
        is_optional: r.is_optional ?? false,
      }
    })

    // Fetch template checklist
    const { data: checklist } = await supabase
      .from('activity_template_checklist')
      .select('*')
      .eq('template_id', template.id)
      .order('step_order')

    templateChecklist = (checklist ?? []).map((c) => ({
      step_order: c.step_order,
      instruction: c.instruction,
      expected_value: c.expected_value,
      tolerance: c.tolerance,
      is_critical: c.is_critical ?? false,
      requires_photo: c.requires_photo ?? false,
    }))
  }

  // Fetch available inventory items for template products
  const productIds = templateResources.map((r) => r.product_id)
  let inventoryItems: {
    id: string; product_id: string; batch_number: string;
    quantity_available: number; cost_per_unit: number | null;
  }[] = []

  if (productIds.length > 0) {
    const { data: items } = await supabase
      .from('inventory_items')
      .select('id, product_id, batch_number, quantity_available, cost_per_unit, lot_status')
      .in('product_id', productIds)
      .eq('lot_status', 'available')
      .gt('quantity_available', 0)
      .order('expiration_date', { ascending: true, nullsFirst: false })

    inventoryItems = (items ?? []).map((i) => ({
      id: i.id,
      product_id: i.product_id,
      batch_number: i.batch_number ?? '—',
      quantity_available: i.quantity_available,
      cost_per_unit: i.cost_per_unit,
    }))
  }

  // Fetch phytosanitary agents
  const cropTypeId = batch?.cultivar?.crop_type?.id
  let agentsQuery = supabase
    .from('phytosanitary_agents')
    .select('id, common_name, scientific_name, type, category, default_plant_parts')
    .eq('is_active', true)
    .order('common_name')

  if (cropTypeId) {
    agentsQuery = agentsQuery.or(`crop_type_id.eq.${cropTypeId},crop_type_id.is.null`)
  }

  const { data: agents } = await agentsQuery

  // Fetch all products for ad-hoc resource addition
  const { data: allProducts } = await supabase
    .from('products')
    .select('id, name, sku')
    .eq('is_active', true)
    .order('name')

  // Fetch units
  const { data: allUnits } = await supabase
    .from('units_of_measure')
    .select('id, code, name')
    .eq('is_active', true)
    .order('name')

  return (
    <ExecuteClient
      scheduledActivity={{
        id: scheduledActivity.id,
        status: scheduledActivity.status as string,
        planned_date: scheduledActivity.planned_date,
        crop_day: scheduledActivity.crop_day,
        template_name: template?.name ?? '—',
        template_code: template?.code ?? null,
        activity_type_id: template?.activity_type?.id ?? '',
        activity_type_name: template?.activity_type?.name ?? '—',
        estimated_duration_min: template?.estimated_duration_min ?? null,
        triggers_phase_change_id: template?.triggers_phase_change_id ?? null,
        measurement_fields: (template?.metadata as Record<string, unknown> | null)?.measurement_fields as Record<string, string>[] | null ?? null,
      }}
      batch={{
        id: batch?.id ?? '',
        code: batch?.code ?? '',
        plant_count: batch?.plant_count ?? null,
        area_m2: batch?.area_m2 ?? null,
        cultivar_name: batch?.cultivar?.name ?? '',
        phase_id: batch?.phase?.id ?? '',
        phase_name: batch?.phase?.name ?? '',
        zone_id: batch?.zone?.id ?? '',
        zone_name: batch?.zone?.name ?? '',
        facility_name: batch?.zone?.facility?.name ?? '',
      }}
      templateResources={templateResources}
      templateChecklist={templateChecklist}
      inventoryItems={inventoryItems}
      agents={(agents ?? []).map((a) => ({
        id: a.id,
        common_name: a.common_name,
        scientific_name: a.scientific_name,
        type: a.type,
        category: a.category,
        default_plant_parts: a.default_plant_parts as string[] | null,
      }))}
      products={(allProducts ?? []).map((p) => ({ id: p.id, name: p.name, sku: p.sku }))}
      units={(allUnits ?? []).map((u) => ({ id: u.id, code: u.code, name: u.name }))}
      currentUser={{
        id: currentUser.id,
        full_name: currentUser.full_name,
        role: currentUser.role,
      }}
      isAlreadyExecuted={isAlreadyExecuted}
      canExecute={canExecute}
      completedInfo={completedActivity?.[0] ? {
        performed_at: completedActivity[0].performed_at,
        performer_name: completedActivity[0].user?.full_name ?? '',
        activity_id: completedActivity[0].id,
      } : null}
    />
  )
}
