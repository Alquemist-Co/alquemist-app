import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { docTypeRequiredFieldsSchema } from '@/schemas/shipments'
import { RegulatoryDocDetailClient, type DocDetailData } from '@/components/regulatory/document-detail-client'

type Params = Promise<{ id: string }>

export default async function RegulatoryDocDetailPage({
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
  const canEdit = ['admin', 'manager', 'supervisor'].includes(role)
  const canVerifyRevoke = ['admin', 'manager'].includes(role)

  // Fetch document + relations
  const { data: doc } = await supabase
    .from('regulatory_documents')
    .select(`
      *,
      doc_type:regulatory_doc_types(*),
      batch:batches(id, code, status, cultivar:cultivars(name)),
      product:products(id, name, sku),
      facility:facilities(id, name),
      shipment:shipments(id, shipment_code),
      inventory_item:inventory_items(id, batch_number),
      quality_test:quality_tests(id, test_type, status),
      verified_user:users!regulatory_documents_verified_by_fkey(full_name),
      created_user:users!regulatory_documents_created_by_fkey(full_name)
    `)
    .eq('id', id)
    .single()

  if (!doc) notFound()

  const docType = doc.doc_type as {
    id: string; name: string; code: string; category: string;
    description: string | null; valid_for_days: number | null;
    issuing_authority: string | null; required_fields: unknown
  } | null

  const batch = doc.batch as { id: string; code: string; status: string; cultivar: { name: string } | null } | null
  const product = doc.product as { id: string; name: string; sku: string } | null
  const facility = doc.facility as { id: string; name: string } | null
  const shipment = doc.shipment as { id: string; shipment_code: string } | null
  const inventoryItem = doc.inventory_item as { id: string; batch_number: string } | null
  const qualityTest = doc.quality_test as { id: string; test_type: string; status: string } | null
  const verifiedUserArr = doc.verified_user as { full_name: string }[] | null
  const verifiedUser = verifiedUserArr?.[0] ?? null
  const createdUserArr = doc.created_user as { full_name: string }[] | null
  const createdUser = createdUserArr?.[0] ?? null

  const parsedFields = docTypeRequiredFieldsSchema.safeParse(docType?.required_fields)
  const dynamicFields = parsedFields.success ? parsedFields.data.fields : []

  // Fetch version history if this doc has a superseded_by chain
  let versionHistory: { id: string; document_number: string | null; issue_date: string; expiry_date: string | null; status: string }[] = []
  if (docType) {
    // Find all docs of same type linked to same entity
    let versionQuery = supabase
      .from('regulatory_documents')
      .select('id, document_number, issue_date, expiry_date, status')
      .eq('doc_type_id', docType.id)
      .order('issue_date', { ascending: false })

    if (doc.batch_id) versionQuery = versionQuery.eq('batch_id', doc.batch_id)
    else if (doc.product_id) versionQuery = versionQuery.eq('product_id', doc.product_id)
    else if (doc.facility_id) versionQuery = versionQuery.eq('facility_id', doc.facility_id)

    const { data: versions } = await versionQuery

    if (versions && versions.length > 1) {
      versionHistory = versions
    }
  }

  const docData: DocDetailData = {
    id: doc.id,
    doc_type_id: docType?.id ?? '',
    doc_type_name: docType?.name ?? '',
    doc_type_code: docType?.code ?? '',
    category: docType?.category ?? '',
    description: docType?.description ?? null,
    valid_for_days: docType?.valid_for_days ?? null,
    issuing_authority: docType?.issuing_authority ?? null,
    document_number: doc.document_number,
    issue_date: doc.issue_date,
    expiry_date: doc.expiry_date,
    status: doc.status,
    field_data: (doc.field_data ?? {}) as Record<string, unknown>,
    file_path: doc.file_path,
    file_name: doc.file_name,
    file_size_bytes: doc.file_size_bytes,
    file_mime_type: doc.file_mime_type,
    notes: doc.notes,
    verified_by_name: verifiedUser?.full_name ?? null,
    verified_at: doc.verified_at,
    created_by_name: createdUser?.full_name ?? null,
    created_at: doc.created_at,
    superseded_by_id: doc.superseded_by_id,
    // Linked entities
    batch_id: batch?.id ?? null,
    batch_code: batch?.code ?? null,
    product_id: product?.id ?? null,
    product_name: product?.name ?? null,
    facility_id: facility?.id ?? null,
    facility_name: facility?.name ?? null,
    shipment_id: shipment?.id ?? null,
    shipment_code: shipment?.shipment_code ?? null,
    inventory_item_id: inventoryItem?.id ?? null,
    quality_test_id: qualityTest?.id ?? null,
    quality_test_type: qualityTest?.test_type ?? null,
  }

  return (
    <RegulatoryDocDetailClient
      doc={docData}
      dynamicFields={dynamicFields}
      versionHistory={versionHistory}
      canEdit={canEdit}
      canVerifyRevoke={canVerifyRevoke}
      userId={currentUser.id}
      serverNow={new Date().getTime()}
    />
  )
}
