import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ZoneDetailClient } from '@/components/areas/zone-detail-client'
import type { ClimateConfig } from '@/components/areas/zones-shared'

type Props = {
  params: Promise<{ id: string }>
}

export default async function ZoneDetailPage({ params }: Props) {
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

  // Fetch zone with facility + structures + facilities list in parallel
  const [{ data: zoneRaw }, { data: structuresRaw }, { data: facilitiesData }] =
    await Promise.all([
      supabase
        .from('zones')
        .select('id, facility_id, name, purpose, environment, area_m2, height_m, effective_growing_area_m2, plant_capacity, climate_config, status, facility:facilities(id, name)')
        .eq('id', id)
        .single(),
      supabase
        .from('zone_structures')
        .select('id, zone_id, name, type, length_m, width_m, is_mobile, num_levels, positions_per_level, max_positions, spacing_cm, pot_size_l')
        .eq('zone_id', id)
        .order('name'),
      supabase
        .from('facilities')
        .select('id, name')
        .eq('is_active', true)
        .order('name'),
    ])

  if (!zoneRaw) {
    notFound()
  }

  const facility = zoneRaw.facility as { id: string; name: string } | null

  const zone = {
    id: zoneRaw.id,
    facility_id: zoneRaw.facility_id,
    facility_name: facility?.name ?? '',
    name: zoneRaw.name,
    purpose: zoneRaw.purpose,
    environment: zoneRaw.environment,
    area_m2: Number(zoneRaw.area_m2),
    effective_growing_area_m2: Number(zoneRaw.effective_growing_area_m2),
    plant_capacity: zoneRaw.plant_capacity,
    height_m: zoneRaw.height_m ? Number(zoneRaw.height_m) : null,
    climate_config: zoneRaw.climate_config as ClimateConfig | null,
    status: zoneRaw.status,
  }

  const structures = (structuresRaw ?? []).map((s) => ({
    id: s.id,
    zone_id: s.zone_id,
    name: s.name,
    type: s.type,
    length_m: Number(s.length_m),
    width_m: Number(s.width_m),
    is_mobile: s.is_mobile,
    num_levels: s.num_levels,
    positions_per_level: s.positions_per_level,
    max_positions: s.max_positions,
    spacing_cm: s.spacing_cm ? Number(s.spacing_cm) : null,
    pot_size_l: s.pot_size_l ? Number(s.pot_size_l) : null,
  }))

  const facilities = (facilitiesData ?? []).map((f) => ({
    id: f.id,
    name: f.name,
  }))

  return (
    <ZoneDetailClient
      zone={zone}
      structures={structures}
      facilities={facilities}
      canWrite={canWrite}
    />
  )
}
