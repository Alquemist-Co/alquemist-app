import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CultivarsClient } from '@/components/settings/cultivars-client'

export default async function CultivarsPage() {
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

  // Parallel fetch all needed data
  const [
    { data: cropTypes },
    { data: cultivars },
    { data: phases },
    { data: flows },
    { data: categories },
    { data: units },
  ] = await Promise.all([
    supabase.from('crop_types').select('id, code, name, category, is_active').eq('is_active', true).order('name'),
    supabase.from('cultivars').select('*').order('name'),
    supabase.from('production_phases').select('*').order('sort_order'),
    supabase.from('phase_product_flows').select('*').order('phase_id, direction, sort_order'),
    supabase.from('resource_categories').select('id, code, name').eq('is_active', true).order('name'),
    supabase.from('units_of_measure').select('id, code, name, dimension').order('name'),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Cultivares</h2>
        <p className="text-sm text-muted-foreground">
          Configura las variedades de cada tipo de cultivo y sus flujos de producción.
        </p>
      </div>

      <CultivarsClient
        cropTypes={cropTypes ?? []}
        cultivars={(cultivars ?? []).map((c) => ({
          ...c,
          phase_durations: c.phase_durations as Record<string, number> | null,
          target_profile: c.target_profile as Record<string, string> | null,
          optimal_conditions: c.optimal_conditions as Record<string, { min?: number | null; max?: number | null; unit?: string }> | null,
        }))}
        phases={phases ?? []}
        flows={flows ?? []}
        categories={categories ?? []}
        units={units ?? []}
        canWrite={canWrite}
      />
    </div>
  )
}
