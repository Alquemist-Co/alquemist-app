import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  BatchDetailClient,
  type BatchDetailData,
  type OrderPhaseData,
  type LineageRecord,
  type ZoneOption,
  type ScheduledActivityData,
  type ActivityData,
  type QualityTestData,
  type RegulatoryDocData,
  type InventoryTransactionData,
  type EnvironmentalReadingData,
} from '@/components/production/batch-detail-client'

type Params = Promise<{ id: string }>
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function BatchDetailPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: SearchParams
}) {
  const { id } = await params
  const resolvedSearchParams = await searchParams
  const defaultTab = typeof resolvedSearchParams.tab === 'string' ? resolvedSearchParams.tab : 'general'
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
  const canScheduleActivities = ['admin', 'manager', 'supervisor'].includes(role)
  const canExecuteActivities = ['admin', 'manager', 'supervisor', 'operator'].includes(role)
  const canHoldCancel = ['admin', 'manager'].includes(role)

  // Fetch batch + zones in parallel
  const [batchRes, zonesRes] = await Promise.all([
    supabase
      .from('batches')
      .select(`
        *,
        cultivar:cultivars(id, name, code, crop_type:crop_types(name)),
        phase:production_phases!batches_current_phase_id_fkey(id, name),
        zone:zones(id, name, facility:facilities(id, name)),
        product:products!batches_current_product_id_fkey(id, name, sku),
        order:production_orders(id, code, status)
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

  // Pre-compute cutoff date for environmental readings (30 days ago)
  // Using date arithmetic to avoid Date.now() which is flagged as impure
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const envCutoff = thirtyDaysAgo.toISOString()

  // Fetch parent batch, order phases, lineage, activities, quality tests, regulatory docs, inventory tx, and env readings (depend on batch data)
  const [parentRes, phasesRes, lineageParentRes, lineageChildRes, scheduledActivitiesRes, activitiesRes, qualityTestsRes, regulatoryDocsRes, inventoryTxRes, envReadingsRes] = await Promise.all([
    batch.parent_batch_id
      ? supabase
          .from('batches')
          .select('id, code, status')
          .eq('id', batch.parent_batch_id)
          .single()
      : Promise.resolve({ data: null }),
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
    // Scheduled activities with template and phase info
    supabase
      .from('scheduled_activities')
      .select(`
        *,
        template:activity_templates(id, name, code, activity_type:activity_types(name), triggers_phase_change:production_phases!activity_templates_triggers_phase_change_id_fkey(id, name)),
        phase:production_phases(id, name)
      `)
      .eq('batch_id', id)
      .order('planned_date'),
    // Executed activities with related data
    supabase
      .from('activities')
      .select(`
        *,
        activity_type:activity_types(id, name),
        template:activity_templates(id, name, code),
        performer:users(id, full_name),
        phase:production_phases(id, name),
        observations:activity_observations(id, severity),
        resources:activity_resources(id)
      `)
      .eq('batch_id', id)
      .order('performed_at', { ascending: false }),
    // Quality tests with results and phase info
    supabase
      .from('quality_tests')
      .select(`
        *,
        phase:production_phases(id, name),
        performer:users(id, full_name),
        results:quality_test_results(id, parameter, value, numeric_value, unit, min_threshold, max_threshold, passed)
      `)
      .eq('batch_id', id)
      .order('sample_date', { ascending: false }),
    // Regulatory documents with doc type info
    supabase
      .from('regulatory_documents')
      .select(`
        *,
        doc_type:regulatory_doc_types(id, name, category),
        verifier:users!regulatory_documents_verified_by_fkey(id, full_name)
      `)
      .eq('batch_id', id)
      .order('issue_date', { ascending: false }),
    // Inventory transactions with product and user info
    supabase
      .from('inventory_transactions')
      .select(`
        *,
        inventory_item:inventory_items!inventory_transactions_inventory_item_id_fkey(id, product:products(id, name, sku)),
        unit:units_of_measure!inventory_transactions_unit_id_fkey(id, code),
        user:users!inventory_transactions_user_id_fkey(id, full_name)
      `)
      .eq('batch_id', id)
      .order('timestamp', { ascending: false }),
    // Environmental readings for the batch's zone (last 30 days)
    batch.zone_id
      ? supabase
          .from('environmental_readings')
          .select('id, parameter, value, unit, timestamp')
          .eq('zone_id', batch.zone_id)
          .gte('timestamp', envCutoff)
          .order('timestamp', { ascending: false })
          .limit(1000)
      : Promise.resolve({ data: null }),
  ])

  // Cast joined relations
  const cultivar = batch.cultivar as { id: string; name: string; code: string; crop_type: { name: string } | null } | null
  const phase = batch.phase as { id: string; name: string } | null
  const zone = batch.zone as { id: string; name: string; facility: { id: string; name: string } | null } | null
  const product = batch.product as { id: string; name: string; sku: string } | null
  const order = batch.order as { id: string; code: string; status: string } | null
  const parent = parentRes.data as { id: string; code: string; status: string } | null

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

  // Transform scheduled activities
  const scheduledActivities: ScheduledActivityData[] = (scheduledActivitiesRes.data ?? []).map((sa) => {
    const template = sa.template as {
      id: string
      name: string
      code: string
      activity_type: { name: string } | null
      triggers_phase_change: { id: string; name: string } | null
    } | null
    const saPhase = sa.phase as { id: string; name: string } | null
    return {
      id: sa.id,
      template_id: sa.template_id,
      template_name: template?.name ?? null,
      template_code: template?.code ?? null,
      activity_type_name: template?.activity_type?.name ?? null,
      triggers_phase_change_id: template?.triggers_phase_change?.id ?? null,
      triggers_phase_change_name: template?.triggers_phase_change?.name ?? null,
      planned_date: sa.planned_date,
      crop_day: sa.crop_day,
      phase_id: sa.phase_id,
      phase_name: saPhase?.name ?? null,
      status: sa.status,
      template_snapshot: sa.template_snapshot,
    }
  })

  // Transform executed activities
  const activities: ActivityData[] = (activitiesRes.data ?? []).map((a) => {
    const activityType = a.activity_type as { id: string; name: string } | null
    const aTemplate = a.template as { id: string; name: string; code: string } | null
    const performer = a.performer as { id: string; full_name: string } | null
    const aPhase = a.phase as { id: string; name: string } | null
    const observations = a.observations as { id: string; severity: string }[] | null
    const resources = a.resources as { id: string }[] | null
    return {
      id: a.id,
      activity_type_id: a.activity_type_id,
      activity_type_name: activityType?.name ?? '',
      template_id: a.template_id,
      template_name: aTemplate?.name ?? null,
      scheduled_activity_id: a.scheduled_activity_id,
      performed_at: a.performed_at,
      performed_by: a.performed_by,
      performer_name: performer?.full_name ?? '',
      duration_minutes: a.duration_minutes,
      phase_id: a.phase_id,
      phase_name: aPhase?.name ?? null,
      crop_day: a.crop_day,
      status: a.status,
      measurement_data: a.measurement_data,
      notes: a.notes,
      observations_count: observations?.length ?? 0,
      has_high_severity: observations?.some((o) => ['high', 'critical'].includes(o.severity)) ?? false,
      resources_count: resources?.length ?? 0,
    }
  })

  // Transform quality tests
  const qualityTests: QualityTestData[] = (qualityTestsRes.data ?? []).map((qt) => {
    const qtPhase = qt.phase as { id: string; name: string } | null
    const qtPerformer = qt.performer as { id: string; full_name: string } | null
    const qtResults = qt.results as Array<{
      id: string
      parameter: string
      value: string
      numeric_value: number | null
      unit: string | null
      min_threshold: number | null
      max_threshold: number | null
      passed: boolean | null
    }> | null
    return {
      id: qt.id,
      test_type: qt.test_type,
      lab_name: qt.lab_name,
      lab_reference: qt.lab_reference,
      sample_date: qt.sample_date,
      result_date: qt.result_date,
      status: qt.status,
      overall_pass: qt.overall_pass,
      notes: qt.notes,
      performed_by: qt.performed_by,
      performer_name: qtPerformer?.full_name ?? null,
      phase_id: qt.phase_id,
      phase_name: qtPhase?.name ?? null,
      results: (qtResults ?? []).map((r) => ({
        id: r.id,
        parameter: r.parameter,
        value: r.value,
        numeric_value: r.numeric_value != null ? Number(r.numeric_value) : null,
        unit: r.unit,
        min_threshold: r.min_threshold != null ? Number(r.min_threshold) : null,
        max_threshold: r.max_threshold != null ? Number(r.max_threshold) : null,
        passed: r.passed,
      })),
    }
  })

  // Determine quality permissions based on role
  const canCreateTest = ['admin', 'manager', 'supervisor', 'operator'].includes(role)
  const canCaptureResults = ['admin', 'manager', 'supervisor', 'operator'].includes(role)
  const canRejectTest = ['admin', 'manager'].includes(role)

  // Transform regulatory documents
  const regulatoryDocs: RegulatoryDocData[] = (regulatoryDocsRes.data ?? []).map((rd) => {
    const docType = rd.doc_type as { id: string; name: string; category: string } | null
    const verifier = rd.verifier as { id: string; full_name: string } | null
    return {
      id: rd.id,
      doc_type_id: rd.doc_type_id,
      doc_type_name: docType?.name ?? '',
      doc_type_category: docType?.category ?? 'other',
      document_number: rd.document_number,
      issue_date: rd.issue_date,
      expiry_date: rd.expiry_date,
      status: rd.status,
      file_path: rd.file_path,
      field_data: (rd.field_data as Record<string, unknown>) ?? {},
      verified_by: rd.verified_by,
      verifier_name: verifier?.full_name ?? null,
    }
  })

  // Transform inventory transactions
  const inventoryTransactions: InventoryTransactionData[] = (inventoryTxRes.data ?? []).map((tx) => {
    const invItem = tx.inventory_item as { id: string; product: { id: string; name: string; sku: string | null } | null } | null
    const txUnit = tx.unit as { id: string; code: string } | null
    const txUser = tx.user as { id: string; full_name: string } | null
    return {
      id: tx.id,
      type: tx.type,
      quantity: Number(tx.quantity),
      unit_abbreviation: txUnit?.code ?? '',
      timestamp: tx.timestamp,
      product_name: invItem?.product?.name ?? '',
      product_sku: invItem?.product?.sku ?? null,
      cost_total: tx.cost_total != null ? Number(tx.cost_total) : null,
      activity_id: tx.activity_id,
      phase_id: tx.phase_id,
      phase_name: null, // phase_id comes from activity, not direct relation
      user_name: txUser?.full_name ?? '',
      reason: tx.reason,
    }
  })

  // Transform environmental readings
  const envReadings: EnvironmentalReadingData[] = (envReadingsRes.data ?? []).map((er) => ({
    id: er.id,
    parameter: er.parameter,
    value: Number(er.value),
    unit: er.unit,
    timestamp: er.timestamp,
  }))

  return (
    <BatchDetailClient
      batch={batchData}
      phases={phases}
      lineage={lineage}
      zones={zonesData}
      scheduledActivities={scheduledActivities}
      activities={activities}
      qualityTests={qualityTests}
      regulatoryDocs={regulatoryDocs}
      inventoryTransactions={inventoryTransactions}
      envReadings={envReadings}
      canScheduleActivities={canScheduleActivities}
      canExecuteActivities={canExecuteActivities}
      canHoldCancel={canHoldCancel}
      canCreateTest={canCreateTest}
      canCaptureResults={canCaptureResults}
      canRejectTest={canRejectTest}
      defaultTab={defaultTab}
    />
  )
}
