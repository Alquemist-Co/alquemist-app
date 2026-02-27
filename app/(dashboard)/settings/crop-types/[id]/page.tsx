import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CropTypeDetailClient } from '@/components/settings/crop-type-detail-client'

type Props = {
  params: Promise<{ id: string }>
}

export default async function CropTypeDetailPage({ params }: Props) {
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

  // Fetch crop type + its phases in parallel
  const [{ data: cropTypeRaw }, { data: phases }] = await Promise.all([
    supabase
      .from('crop_types')
      .select('*, phases:production_phases(id)')
      .eq('id', id)
      .single(),
    supabase
      .from('production_phases')
      .select('*')
      .eq('crop_type_id', id)
      .order('sort_order'),
  ])

  if (!cropTypeRaw) {
    notFound()
  }

  const cropType = {
    id: cropTypeRaw.id,
    code: cropTypeRaw.code,
    name: cropTypeRaw.name,
    scientific_name: cropTypeRaw.scientific_name,
    category: cropTypeRaw.category,
    regulatory_framework: cropTypeRaw.regulatory_framework,
    icon: cropTypeRaw.icon,
    is_active: cropTypeRaw.is_active,
    phase_count: Array.isArray(cropTypeRaw.phases) ? cropTypeRaw.phases.length : 0,
  }

  return (
    <CropTypeDetailClient
      cropType={cropType}
      phases={phases ?? []}
      canWrite={canWrite}
    />
  )
}
