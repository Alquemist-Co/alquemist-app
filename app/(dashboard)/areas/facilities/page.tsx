import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FacilitiesListClient } from '@/components/areas/facilities-list-client'

export default async function FacilitiesPage() {
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

  const { data: facilities } = await supabase
    .from('facilities')
    .select('*, zones:zones(id)')
    .order('name')

  const facilitiesWithCount = (facilities ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    type: f.type,
    total_footprint_m2: Number(f.total_footprint_m2),
    total_growing_area_m2: Number(f.total_growing_area_m2),
    total_plant_capacity: f.total_plant_capacity,
    address: f.address,
    latitude: f.latitude ? Number(f.latitude) : null,
    longitude: f.longitude ? Number(f.longitude) : null,
    is_active: f.is_active,
    zone_count: Array.isArray(f.zones) ? f.zones.length : 0,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Instalaciones</h2>
        <p className="text-sm text-muted-foreground">
          Gestiona las instalaciones físicas de tu operación.
        </p>
      </div>

      <FacilitiesListClient
        facilities={facilitiesWithCount}
        canWrite={canWrite}
      />
    </div>
  )
}
