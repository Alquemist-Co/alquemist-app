import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RegulatoryDocsListClient } from '@/components/regulatory/documents-list-client'
import { docTypeRequiredFieldsSchema } from '@/schemas/shipments'

const PAGE_SIZE = 20

const VALID_STATUSES = ['draft', 'valid', 'expired', 'revoked', 'superseded']

type SearchParams = Promise<{
  status?: string
  category?: string
  doc_type?: string
  search?: string
  page?: string
}>

export default async function RegulatoryDocumentsPage({
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

  const role = currentUser.role as string
  const canCreate = ['admin', 'manager', 'supervisor'].includes(role)

  const page = Math.max(1, parseInt(params.page || '1', 10) || 1)
  const offset = (page - 1) * PAGE_SIZE

  // Build query
  let query = supabase
    .from('regulatory_documents')
    .select(
      `*,
       doc_type:regulatory_doc_types(id, name, code, category, valid_for_days, issuing_authority),
       batch:batches(id, code),
       product:products(id, name, sku),
       facility:facilities(id, name),
       shipment:shipments(id, shipment_code),
       quality_test:quality_tests(id, test_type),
       verified_user:users!regulatory_documents_verified_by_fkey(full_name)`,
      { count: 'exact' },
    )

  // Filters
  if (params.status && VALID_STATUSES.includes(params.status)) {
    query = query.eq('status', params.status as 'draft')
  }

  if (params.doc_type) {
    query = query.eq('doc_type_id', params.doc_type)
  }

  if (params.search?.trim()) {
    const term = `%${params.search.trim()}%`
    query = query.or(`document_number.ilike.${term}`)
  }

  const { data: docs, count } = await query
    .range(offset, offset + PAGE_SIZE - 1)
    .order('issue_date', { ascending: false })

  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  // KPIs + reference data in parallel
  const today = new Date().toISOString().split('T')[0]
  const nowMs = new Date().getTime()
  const today30 = new Date(nowMs + 30 * 86400000).toISOString().split('T')[0]

  const [
    kpiValidRes,
    kpiExpiringRes,
    kpiExpiredRes,
    kpiDraftRes,
    docTypesRes,
    batchesRes,
    productsRes,
    facilitiesRes,
    shipmentsRes,
    qualityTestsRes,
  ] = await Promise.all([
    supabase.from('regulatory_documents').select('id', { count: 'exact', head: true }).eq('status', 'valid'),
    supabase.from('regulatory_documents').select('id', { count: 'exact', head: true })
      .eq('status', 'valid').lte('expiry_date', today30).gte('expiry_date', today),
    supabase.from('regulatory_documents').select('id', { count: 'exact', head: true }).eq('status', 'expired'),
    supabase.from('regulatory_documents').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('regulatory_doc_types').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('batches').select('id, code').in('status', ['active', 'phase_transition', 'on_hold', 'completed']).order('code'),
    supabase.from('products').select('id, name, sku').order('name'),
    supabase.from('facilities').select('id, name').order('name'),
    supabase.from('shipments').select('id, shipment_code').order('shipment_code'),
    supabase.from('quality_tests').select('id, test_type, batch:batches(code)').order('sample_date', { ascending: false }).limit(50),
  ])

  const docsData = (docs ?? []).map((d) => {
    const docType = d.doc_type as { id: string; name: string; code: string; category: string } | null
    const batch = d.batch as { id: string; code: string } | null
    const product = d.product as { id: string; name: string; sku: string } | null
    const facility = d.facility as { id: string; name: string } | null
    const shipment = d.shipment as { id: string; shipment_code: string } | null
    const qualityTest = d.quality_test as { id: string; test_type: string } | null
    const verifiedUser = d.verified_user as { full_name: string } | null

    // Determine what it's linked to
    let linkedTo = '—'
    let linkedType: string | null = null
    if (batch) { linkedTo = batch.code; linkedType = 'batch' }
    else if (product) { linkedTo = product.name; linkedType = 'product' }
    else if (facility) { linkedTo = facility.name; linkedType = 'facility' }
    else if (shipment) { linkedTo = shipment.shipment_code; linkedType = 'shipment' }
    else if (qualityTest) { linkedTo = `Test: ${qualityTest.test_type}`; linkedType = 'quality_test' }

    return {
      id: d.id,
      doc_type_name: docType?.name ?? '',
      doc_type_code: docType?.code ?? '',
      category: docType?.category ?? '',
      document_number: d.document_number,
      linked_to: linkedTo,
      linked_type: linkedType,
      issue_date: d.issue_date,
      expiry_date: d.expiry_date,
      status: d.status,
      has_file: !!d.file_path,
      verified: !!verifiedUser,
    }
  })

  const docTypesData = (docTypesRes.data ?? []).map((dt) => {
    const parsed = docTypeRequiredFieldsSchema.safeParse(dt.required_fields)
    return {
      id: dt.id,
      name: dt.name,
      code: dt.code,
      category: dt.category,
      description: dt.description,
      valid_for_days: dt.valid_for_days,
      issuing_authority: dt.issuing_authority,
      required_fields: parsed.success ? parsed.data : { fields: [] },
    }
  })

  const qualityTestsData = (qualityTestsRes.data ?? []).map((qt) => {
    const batch = qt.batch as { code: string } | null
    return {
      id: qt.id,
      test_type: qt.test_type,
      batch_code: batch?.code ?? '',
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Documentos Regulatorios</h2>
        <p className="text-sm text-muted-foreground">
          Gestión centralizada de documentos regulatorios y compliance.
        </p>
      </div>

      <RegulatoryDocsListClient
        docs={docsData}
        docTypes={docTypesData}
        batches={(batchesRes.data ?? []).map((b) => ({ id: b.id, code: b.code }))}
        products={(productsRes.data ?? []).map((p) => ({ id: p.id, name: p.name, sku: p.sku }))}
        facilities={(facilitiesRes.data ?? []).map((f) => ({ id: f.id, name: f.name }))}
        shipments={(shipmentsRes.data ?? []).map((s) => ({ id: s.id, shipment_code: s.shipment_code }))}
        qualityTests={qualityTestsData}
        totalPages={totalPages}
        totalCount={totalCount}
        currentPage={page}
        canCreate={canCreate}
        serverNow={nowMs}
        kpis={{
          valid: kpiValidRes.count ?? 0,
          expiring: kpiExpiringRes.count ?? 0,
          expired: kpiExpiredRes.count ?? 0,
          drafts: kpiDraftRes.count ?? 0,
        }}
        filters={{
          status: params.status || '',
          category: params.category || '',
          doc_type: params.doc_type || '',
          search: params.search || '',
        }}
      />
    </div>
  )
}
