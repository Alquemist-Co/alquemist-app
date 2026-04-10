import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FacilityDetailClient } from '@/components/areas/facility-detail-client'
import type { ClimateConfig } from '@/components/areas/zones-shared'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function FacilityDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const sp = await searchParams
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

  // Fetch facility + zones + facilities list in parallel
  const [{ data: facilityRaw }, { data: zonesRaw }, { data: facilitiesData }] =
    await Promise.all([
      supabase
        .from('facilities')
        .select('*')
        .eq('id', id)
        .single(),
      supabase
        .from('zones')
        .select('*, facility:facilities(id, name), structures:zone_structures(id)')
        .eq('facility_id', id)
        .order('name'),
      supabase
        .from('facilities')
        .select('id, name')
        .eq('is_active', true)
        .order('name'),
    ])

  if (!facilityRaw) {
    notFound()
  }

  const facility = {
    id: facilityRaw.id,
    name: facilityRaw.name,
    type: facilityRaw.type,
    total_footprint_m2: Number(facilityRaw.total_footprint_m2),
    total_growing_area_m2: Number(facilityRaw.total_growing_area_m2),
    total_plant_capacity: facilityRaw.total_plant_capacity,
    address: facilityRaw.address,
    latitude: facilityRaw.latitude ? Number(facilityRaw.latitude) : null,
    longitude: facilityRaw.longitude ? Number(facilityRaw.longitude) : null,
    is_active: facilityRaw.is_active,
    zone_count: 0,
  }

  const zones = (zonesRaw ?? []).map((z) => {
    const fac = z.facility as { id: string; name: string } | null
    return {
      id: z.id,
      facility_id: z.facility_id,
      facility_name: fac?.name ?? '',
      name: z.name,
      purpose: z.purpose,
      environment: z.environment,
      area_m2: Number(z.area_m2),
      effective_growing_area_m2: Number(z.effective_growing_area_m2),
      plant_capacity: z.plant_capacity,
      height_m: z.height_m ? Number(z.height_m) : null,
      climate_config: z.climate_config as ClimateConfig | null,
      status: z.status,
      structure_count: Array.isArray(z.structures) ? z.structures.length : 0,
    }
  })

  facility.zone_count = zones.length

  // Compute KPIs
  const kpis = {
    totalZones: zones.length,
    effectiveGrowingArea: zones.reduce((sum, z) => sum + z.effective_growing_area_m2, 0),
    totalPlantCapacity: zones.reduce((sum, z) => sum + z.plant_capacity, 0),
    zonesByStatus: {
      active: zones.filter((z) => z.status === 'active').length,
      maintenance: zones.filter((z) => z.status === 'maintenance').length,
      inactive: zones.filter((z) => z.status === 'inactive').length,
    },
  }

  const facilitiesList = (facilitiesData ?? []).map((f) => ({
    id: f.id,
    name: f.name,
  }))

  return (
    <FacilityDetailClient
      facility={facility}
      zones={zones}
      facilities={facilitiesList}
      kpis={kpis}
      canWrite={canWrite}
      defaultTab={sp.tab === 'zones' ? 'zones' : 'general'}
    />
  )
}
