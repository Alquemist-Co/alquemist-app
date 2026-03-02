import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CropTypesListClient } from '@/components/settings/crop-types-list-client'

export default async function CropTypesPage() {
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

  // Fetch crop types with phase count
  const { data: cropTypes } = await supabase
    .from('crop_types')
    .select('*, phases:production_phases(id)')
    .order('name')

  const cropTypesWithCount = (cropTypes ?? []).map((ct) => ({
    id: ct.id,
    code: ct.code,
    name: ct.name,
    scientific_name: ct.scientific_name,
    category: ct.category,
    regulatory_framework: ct.regulatory_framework,
    icon: ct.icon,
    is_active: ct.is_active,
    phase_count: Array.isArray(ct.phases) ? ct.phases.length : 0,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Tipos de Cultivo</h2>
        <p className="text-sm text-muted-foreground">
          Configura los tipos de cultivo y sus fases de producción.
        </p>
      </div>

      <CropTypesListClient
        cropTypes={cropTypesWithCount}
        canWrite={canWrite}
      />
    </div>
  )
}
