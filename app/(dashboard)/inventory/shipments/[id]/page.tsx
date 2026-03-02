import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ShipmentDetailClient } from '@/components/inventory/shipment-detail-client'

type Params = Promise<{ id: string }>

export default async function ShipmentDetailPage({
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

  // Fetch shipment with joins
  const { data: shipment } = await supabase
    .from('shipments')
    .select(`
      *,
      supplier:suppliers(name),
      facility:facilities(name),
      receiver:users!shipments_received_by_fkey(full_name)
    `)
    .eq('id', id)
    .single()

  if (!shipment) notFound()

  // Parallel fetches
  const [itemsRes, docsRes, docReqRes, docTypesRes, companyRes] = await Promise.all([
    supabase
      .from('shipment_items')
      .select(`
        *,
        product:products(name, sku),
        unit:units_of_measure(code),
        zone:zones(name)
      `)
      .eq('shipment_id', id)
      .order('sort_order'),
    supabase
      .from('regulatory_documents')
      .select('id, doc_type_id, document_number, issue_date, file_path')
      .eq('shipment_id', id),
    supabase
      .from('shipment_doc_requirements')
      .select(`
        id, doc_type_id, is_mandatory, applies_when, product_id,
        doc_type:regulatory_doc_types(name),
        product:products(name)
      `),
    supabase
      .from('regulatory_doc_types')
      .select('id, name, required_fields, valid_for_days')
      .eq('is_active', true),
    supabase
      .from('companies')
      .select('settings')
      .single(),
  ])

  const supplier = shipment.supplier as { name: string } | null
  const facility = shipment.facility as { name: string } | null
  const receiver = shipment.receiver as { full_name: string } | null

  const shipmentData = {
    id: shipment.id,
    company_id: shipment.company_id,
    shipment_code: shipment.shipment_code,
    type: shipment.type,
    status: shipment.status,
    supplier_name: supplier?.name ?? null,
    origin_name: shipment.origin_name,
    origin_address: shipment.origin_address,
    facility_name: facility?.name ?? '',
    carrier_name: shipment.carrier_name,
    carrier_vehicle: shipment.carrier_vehicle,
    carrier_driver: shipment.carrier_driver,
    carrier_contact: shipment.carrier_contact,
    dispatch_date: shipment.dispatch_date,
    estimated_arrival_date: shipment.estimated_arrival_date,
    actual_arrival_date: shipment.actual_arrival_date,
    transport_conditions: shipment.transport_conditions as Record<string, unknown> | null,
    purchase_order_ref: shipment.purchase_order_ref,
    received_by_name: receiver?.full_name ?? null,
    notes: shipment.notes,
  }

  const itemsData = (itemsRes.data ?? []).map((i) => {
    const product = i.product as { name: string; sku: string } | null
    const unit = i.unit as { code: string } | null
    const zone = i.zone as { name: string } | null
    return {
      id: i.id,
      product_name: product?.name ?? '',
      product_sku: product?.sku ?? '',
      expected_quantity: Number(i.expected_quantity),
      received_quantity: i.received_quantity ? Number(i.received_quantity) : null,
      rejected_quantity: i.rejected_quantity ? Number(i.rejected_quantity) : null,
      unit_code: unit?.code ?? '',
      supplier_lot_number: i.supplier_lot_number,
      cost_per_unit: i.cost_per_unit ? Number(i.cost_per_unit) : null,
      zone_name: zone?.name ?? null,
      inspection_result: i.inspection_result,
      inspection_notes: i.inspection_notes,
      inventory_item_id: i.inventory_item_id,
    }
  })

  // Filter doc requirements to match products in this shipment
  const productIds = new Set(itemsData.map((i) => i.product_name)) // We need product IDs
  const shipmentProductIds = (itemsRes.data ?? []).map((i) => i.product_id)
  const filteredDocReqs = (docReqRes.data ?? [])
    .filter((r) => !r.product_id || shipmentProductIds.includes(r.product_id))
    .map((r) => {
      const docType = r.doc_type as { name: string } | null
      const product = r.product as { name: string } | null
      return {
        id: r.id,
        doc_type_id: r.doc_type_id,
        doc_type_name: docType?.name ?? '',
        is_mandatory: r.is_mandatory,
        applies_when: r.applies_when,
        product_name: product?.name ?? null,
      }
    })

  const settings = companyRes.data?.settings as Record<string, unknown> | null
  const regulatoryMode = (settings?.regulatory_mode as string) ?? 'standard'

  const docTypesData = (docTypesRes.data ?? []).map((dt) => ({
    id: dt.id,
    name: dt.name,
    required_fields: (dt.required_fields as { fields: Array<{ key: string; label: string; type: string; required?: boolean; options?: string[]; placeholder?: string }> }) ?? { fields: [] },
    valid_for_days: dt.valid_for_days,
  }))

  return (
    <ShipmentDetailClient
      shipment={shipmentData}
      items={itemsData}
      docRequirements={filteredDocReqs}
      uploadedDocs={docsRes.data ?? []}
      docTypes={docTypesData}
      regulatoryMode={regulatoryMode}
      userId={currentUser.id}
    />
  )
}
