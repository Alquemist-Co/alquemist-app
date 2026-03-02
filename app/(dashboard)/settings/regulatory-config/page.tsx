import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RegulatoryConfigClient } from '@/components/settings/regulatory-config-client'

export default async function RegulatoryConfigPage() {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  const { data: currentUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', authUser.id)
    .single()

  if (!currentUser) {
    redirect('/login')
  }

  const canWrite = currentUser.role === 'admin' || currentUser.role === 'manager'

  // Fetch company for feature flag check
  const { data: company } = await supabase
    .from('companies')
    .select('id, settings')
    .single()

  const settings = company?.settings as Record<string, unknown> | null
  const featuresEnabled = settings?.features_enabled as Record<string, boolean> | undefined
  const regulatoryEnabled = featuresEnabled?.regulatory !== false

  // Parallel fetch all needed data
  const [
    { data: docTypes },
    { data: productRequirements },
    { data: shipmentRequirements },
    { data: categories },
  ] = await Promise.all([
    supabase
      .from('regulatory_doc_types')
      .select('*')
      .order('sort_order')
      .order('name'),
    supabase
      .from('product_regulatory_requirements')
      .select('*, doc_type:regulatory_doc_types(name, code), category:resource_categories(name)')
      .order('sort_order'),
    supabase
      .from('shipment_doc_requirements')
      .select('*, doc_type:regulatory_doc_types(name, code), category:resource_categories(name)')
      .order('sort_order'),
    supabase
      .from('resource_categories')
      .select('id, name')
      .eq('is_active', true)
      .order('name'),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Configuración Regulatoria</h2>
        <p className="text-sm text-muted-foreground">
          Configura tipos de documentos regulatorios, requisitos por producto y requisitos de envío.
        </p>
      </div>

      <RegulatoryConfigClient
        docTypes={(docTypes ?? []).map((dt) => ({
          ...dt,
          required_fields: dt.required_fields as RequiredFieldsJson,
        }))}
        productRequirements={(productRequirements ?? []).map((pr) => ({
          ...pr,
          doc_type: pr.doc_type as { name: string; code: string } | null,
          category: pr.category as { name: string } | null,
        }))}
        shipmentRequirements={(shipmentRequirements ?? []).map((sr) => ({
          ...sr,
          doc_type: sr.doc_type as { name: string; code: string } | null,
          category: sr.category as { name: string } | null,
        }))}
        categories={categories ?? []}
        canWrite={canWrite}
        regulatoryEnabled={regulatoryEnabled}
      />
    </div>
  )
}

type RequiredFieldsJson = {
  fields: {
    key: string
    label: string
    type: 'text' | 'textarea' | 'date' | 'number' | 'boolean' | 'select'
    required: boolean
    options?: string[]
    placeholder?: string
    help_text?: string
  }[]
}
