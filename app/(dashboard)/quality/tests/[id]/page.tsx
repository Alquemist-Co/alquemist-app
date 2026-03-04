import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { QualityTestDetailClient, type TestDetailData, type TestResultRow } from '@/components/quality/test-detail-client'

type Params = Promise<{ id: string }>

export default async function QualityTestDetailPage({
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
  const canChangeStatus = ['admin', 'manager'].includes(role)

  // Fetch test + results + linked CoA in parallel
  const [testRes, resultsRes, coaRes] = await Promise.all([
    supabase
      .from('quality_tests')
      .select(`
        *,
        batch:batches(id, code, status, plant_count,
          cultivar:cultivars(id, name, code),
          zone:zones(id, name, facility:facilities(id, name)),
          product:products!batches_current_product_id_fkey(id, name, sku)
        ),
        phase:production_phases(id, name),
        performer:users!quality_tests_performed_by_fkey(full_name)
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('quality_test_results')
      .select('*')
      .eq('test_id', id)
      .order('created_at'),
    supabase
      .from('regulatory_documents')
      .select('id, doc_type_id, document_number, issue_date, expiry_date, status, file_path, doc_type:regulatory_doc_types(name, code, category)')
      .eq('quality_test_id', id),
  ])

  const test = testRes.data
  if (!test) notFound()

  const batch = test.batch as {
    id: string; code: string; status: string; plant_count: number | null
    cultivar: { id: string; name: string; code: string } | null
    zone: { id: string; name: string; facility: { id: string; name: string } | null } | null
    product: { id: string; name: string; sku: string } | null
  } | null
  const phase = test.phase as { id: string; name: string } | null
  const performer = test.performer as { full_name: string } | null

  const testData: TestDetailData = {
    id: test.id,
    test_type: test.test_type,
    status: test.status,
    overall_pass: test.overall_pass,
    batch_id: batch?.id ?? '',
    batch_code: batch?.code ?? '',
    cultivar_name: batch?.cultivar?.name ?? '',
    cultivar_code: batch?.cultivar?.code ?? '',
    phase_name: phase?.name ?? '',
    zone_name: batch?.zone?.name ?? '',
    facility_name: batch?.zone?.facility?.name ?? '',
    product_name: batch?.product?.name ?? null,
    lab_name: test.lab_name,
    lab_reference: test.lab_reference,
    sample_date: test.sample_date,
    result_date: test.result_date,
    performed_by_name: performer?.full_name ?? null,
    notes: test.notes,
    created_at: test.created_at,
  }

  const resultsData: TestResultRow[] = (resultsRes.data ?? []).map((r) => ({
    id: r.id,
    parameter: r.parameter,
    value: r.value,
    numeric_value: r.numeric_value != null ? Number(r.numeric_value) : null,
    unit: r.unit,
    min_threshold: r.min_threshold != null ? Number(r.min_threshold) : null,
    max_threshold: r.max_threshold != null ? Number(r.max_threshold) : null,
    passed: r.passed,
  }))

  const coaDocs = (coaRes.data ?? []).map((d) => {
    const docType = d.doc_type as { name: string; code: string; category: string } | null
    return {
      id: d.id,
      doc_type_name: docType?.name ?? '',
      document_number: d.document_number,
      issue_date: d.issue_date,
      expiry_date: d.expiry_date,
      status: d.status,
      file_path: d.file_path,
    }
  })

  return (
    <QualityTestDetailClient
      test={testData}
      results={resultsData}
      coaDocs={coaDocs}
      canEdit={canEdit}
      canChangeStatus={canChangeStatus}
    />
  )
}
