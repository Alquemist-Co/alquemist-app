import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CultivarDetailClient } from '@/components/settings/cultivar-detail-client'

type Props = {
  params: Promise<{ id: string }>
}

export default async function CultivarDetailPage({ params }: Props) {
  const { id } = await params
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

  // Fetch cultivar first to get crop_type_id
  const { data: cultivarRaw } = await supabase
    .from('cultivars')
    .select('*')
    .eq('id', id)
    .single()

  if (!cultivarRaw) {
    notFound()
  }

  // Parallel fetch related data
  const [
    { data: cropType },
    { data: phases },
    { data: flows },
    { data: siblingCultivars },
    { data: categories },
    { data: units },
  ] = await Promise.all([
    supabase.from('crop_types').select('id, name').eq('id', cultivarRaw.crop_type_id).single(),
    supabase.from('production_phases').select('*').eq('crop_type_id', cultivarRaw.crop_type_id).order('sort_order'),
    supabase.from('phase_product_flows').select('*').eq('cultivar_id', id).order('phase_id, direction, sort_order'),
    supabase.from('cultivars').select('id, code, name, crop_type_id, is_active').eq('crop_type_id', cultivarRaw.crop_type_id),
    supabase.from('resource_categories').select('id, code, name').eq('is_active', true).order('name'),
    supabase.from('units_of_measure').select('id, code, name, dimension').order('name'),
  ])

  const cultivar = {
    ...cultivarRaw,
    phase_durations: cultivarRaw.phase_durations as Record<string, number> | null,
    target_profile: cultivarRaw.target_profile as Record<string, string> | null,
    optimal_conditions: cultivarRaw.optimal_conditions as Record<string, { min?: number | null; max?: number | null; unit?: string }> | null,
  }

  return (
    <CultivarDetailClient
      cultivar={cultivar}
      cropTypeName={cropType?.name ?? ''}
      phases={phases ?? []}
      flows={flows ?? []}
      allCultivars={siblingCultivars ?? []}
      categories={categories ?? []}
      units={units ?? []}
      canWrite={canWrite}
    />
  )
}
