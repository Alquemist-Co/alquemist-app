import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CatalogClient } from '@/components/settings/catalog-client'

type SearchParams = Promise<{
  tab?: string
}>

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
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
  const activeTab = params.tab || 'categories'

  // Fetch all 3 datasets in parallel (small catalogs)
  const [categoriesRes, unitsRes, activityTypesRes] = await Promise.all([
    supabase
      .from('resource_categories')
      .select('*')
      .order('name'),
    supabase
      .from('units_of_measure')
      .select('*')
      .order('dimension')
      .order('name'),
    supabase
      .from('activity_types')
      .select('*')
      .order('name'),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Catálogos</h2>
        <p className="text-sm text-muted-foreground">
          Gestiona categorías de recursos, unidades de medida y tipos de actividad.
        </p>
      </div>

      <CatalogClient
        categories={categoriesRes.data ?? []}
        units={unitsRes.data ?? []}
        activityTypes={activityTypesRes.data ?? []}
        canWrite={canWrite}
        activeTab={activeTab}
      />
    </div>
  )
}
