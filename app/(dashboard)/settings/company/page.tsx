import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CompanySettingsForm } from '@/components/settings/company-settings-form'

export default async function CompanySettingsPage() {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  // Fetch user role
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // Fetch company — RLS returns only user's company
  const { data: company } = await supabase
    .from('companies')
    .select('id, name, legal_id, country, timezone, currency, settings, is_active')
    .single()

  if (!company) {
    redirect('/login')
  }

  const isAdmin = userData.role === 'admin'

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Configuración de empresa</h2>
        <p className="text-sm text-muted-foreground">
          Administra los datos de tu empresa, logo, modo regulatorio y módulos habilitados.
        </p>
      </div>

      <CompanySettingsForm
        company={{
          ...company,
          settings: company.settings as Record<string, unknown> | null,
        }}
        isAdmin={isAdmin}
      />
    </div>
  )
}
