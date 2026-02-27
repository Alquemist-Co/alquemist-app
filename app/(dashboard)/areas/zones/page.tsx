import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ZonesListClient } from '@/components/areas/zones-list-client'
import type { ClimateConfig } from '@/components/areas/zones-shared'

const PAGE_SIZE = 20

const VALID_PURPOSES = ['propagation', 'vegetation', 'flowering', 'drying', 'processing', 'storage', 'multipurpose']
const VALID_STATUSES = ['active', 'maintenance', 'inactive']

type SearchParams = Promise<{
  facility?: string
  purpose?: string
  status?: string
  search?: string
  page?: string
}>

export default async function ZonesPage({
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

  // Build zones query
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1)
  const offset = (page - 1) * PAGE_SIZE

  let query = supabase
    .from('zones')
    .select('*, facility:facilities(id, name), structures:zone_structures(id)', { count: 'exact' })

  if (params.facility) {
    query = query.eq('facility_id', params.facility)
  }

  if (params.purpose && VALID_PURPOSES.includes(params.purpose)) {
    query = query.eq('purpose', params.purpose as 'propagation')
  }

  if (params.status && VALID_STATUSES.includes(params.status)) {
    query = query.eq('status', params.status as 'active')
  }

  if (params.search?.trim()) {
    const term = `%${params.search.trim()}%`
    query = query.ilike('name', term)
  }

  const { data: zones, count } = await query
    .range(offset, offset + PAGE_SIZE - 1)
    .order('name')

  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  // Fetch active facilities for filter dropdown
  const { data: facilitiesData } = await supabase
    .from('facilities')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  const facilitiesList = (facilitiesData ?? []).map((f) => ({
    id: f.id,
    name: f.name,
  }))

  // Map zones with computed fields
  const zonesWithData = (zones ?? []).map((z) => {
    const facility = z.facility as { id: string; name: string } | null
    return {
      id: z.id,
      facility_id: z.facility_id,
      facility_name: facility?.name ?? '',
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Zonas</h2>
        <p className="text-sm text-muted-foreground">
          Gestiona las zonas de cultivo dentro de tus instalaciones.
        </p>
      </div>

      <ZonesListClient
        zones={zonesWithData}
        facilities={facilitiesList}
        canWrite={canWrite}
        totalPages={totalPages}
        currentPage={page}
        filters={{
          facility: params.facility || '',
          purpose: params.purpose || '',
          status: params.status || '',
          search: params.search || '',
        }}
      />
    </div>
  )
}
