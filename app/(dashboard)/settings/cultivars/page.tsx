import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CultivarsListClient } from '@/components/settings/cultivars-list-client'

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

  // Parallel fetch
  const [
    { data: cropTypes },
    { data: cultivars },
    { data: flows },
  ] = await Promise.all([
    supabase.from('crop_types').select('id, code, name, category, is_active').eq('is_active', true).order('name'),
    supabase.from('cultivars').select('*').order('name'),
    supabase.from('phase_product_flows').select('*').order('phase_id, direction, sort_order'),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Cultivares</h2>
        <p className="text-sm text-muted-foreground">
          Configura las variedades de cada tipo de cultivo y sus flujos de producción.
        </p>
      </div>

      <CultivarsListClient
        cropTypes={cropTypes ?? []}
        cultivars={(cultivars ?? []).map((c) => ({
          ...c,
          phase_durations: c.phase_durations as Record<string, number> | null,
          target_profile: c.target_profile as Record<string, string> | null,
          optimal_conditions: c.optimal_conditions as Record<string, { min?: number | null; max?: number | null; unit?: string }> | null,
        }))}
        flows={flows ?? []}
        canWrite={canWrite}
      />
    </div>
  )
}
