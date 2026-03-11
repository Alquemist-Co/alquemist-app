import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SensorsListClient } from '@/components/operations/sensors-list-client'

const PAGE_SIZE = 20

const VALID_TYPES = ['temperature', 'humidity', 'co2', 'light', 'ec', 'ph', 'soil_moisture', 'vpd']
const VALID_STATUS = ['active', 'inactive']

type SearchParams = Promise<{
  facility?: string
  zone?: string
  type?: string
  status?: string
  search?: string
  page?: string
}>

export default async function SensorsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) redirect('/login')

  const { data: currentUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', authUser.id)
    .single()

  if (!currentUser) redirect('/login')

  const role = currentUser.role as string
  const canCreate = ['admin', 'manager'].includes(role)
  const canToggle = ['admin', 'manager', 'supervisor'].includes(role)

  const page = Math.max(1, parseInt(params.page || '1', 10) || 1)
  const offset = (page - 1) * PAGE_SIZE

  // Build query
  let query = supabase
    .from('sensors')
    .select(
      `*,
       zone:zones(id, name, facility:facilities(id, name))`,
      { count: 'exact' },
    )

  // Filters
  if (params.type && VALID_TYPES.includes(params.type)) {
    query = query.eq('type', params.type as 'temperature')
  }

  if (params.status && VALID_STATUS.includes(params.status)) {
    query = query.eq('is_active', params.status === 'active')
  }

  if (params.zone) {
    query = query.eq('zone_id', params.zone)
  }

  if (params.search?.trim()) {
    const term = `%${params.search.trim()}%`
    query = query.or(`brand_model.ilike.${term},serial_number.ilike.${term}`)
  }

  const { data: sensors, count } = await query
    .range(offset, offset + PAGE_SIZE - 1)
    .order('zone_id')
    .order('type')

  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  // Get last readings for these sensors
  const sensorIds = (sensors ?? []).map((s) => s.id)
  const lastReadings: Record<string, string> = {}

  if (sensorIds.length > 0) {
    const { data: readings } = await supabase
      .rpc('get_sensors_last_reading', { p_sensor_ids: sensorIds })

    if (readings) {
      for (const r of readings) {
        lastReadings[r.sensor_id] = r.last_reading_at
      }
    }
  }

  // KPIs + zones in parallel
  const [kpiActiveRes, kpiInactiveRes, zonesRes] = await Promise.all([
    supabase.from('sensors').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('sensors').select('id', { count: 'exact', head: true }).eq('is_active', false),
    supabase
      .from('zones')
      .select('id, name, facility:facilities(id, name)')
      .eq('status', 'active')
      .order('name'),
  ])

  // Map sensor rows
  const sensorsData = (sensors ?? []).map((s) => {
    const zone = s.zone as { id: string; name: string; facility: { id: string; name: string } | null } | null
    return {
      id: s.id,
      type: s.type,
      brand_model: s.brand_model,
      serial_number: s.serial_number,
      calibration_date: s.calibration_date,
      is_active: s.is_active,
      zone_name: zone?.name ?? '',
      zone_id: zone?.id ?? '',
      facility_name: zone?.facility?.name ?? '',
      facility_id: zone?.facility?.id ?? '',
      last_reading_at: lastReadings[s.id] ?? null,
    }
  })

  // Compute stale & calibration KPIs from all active sensors
  const { data: allActiveSensors } = await supabase
    .from('sensors')
    .select('id, calibration_date, is_active')
    .eq('is_active', true)

  let staleCount = 0
  let calExpiredCount = 0
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now()

  if (allActiveSensors) {
    // Get last readings for all active sensors
    const allIds = allActiveSensors.map((s) => s.id)
    const { data: allReadings } = await supabase.rpc('get_sensors_last_reading', { p_sensor_ids: allIds })
    const allReadingsMap: Record<string, string> = {}
    if (allReadings) {
      for (const r of allReadings) {
        allReadingsMap[r.sensor_id] = r.last_reading_at
      }
    }

    for (const s of allActiveSensors) {
      const lastReading = allReadingsMap[s.id]
      if (!lastReading || now - new Date(lastReading).getTime() > 30 * 60 * 1000) {
        staleCount++
      }
      if (s.calibration_date) {
        const calDate = new Date(s.calibration_date).getTime()
        if (now - calDate > 90 * 24 * 60 * 60 * 1000) {
          calExpiredCount++
        }
      }
    }
  }

  const zonesData = (zonesRes.data ?? []).map((z) => {
    const facility = z.facility as { id: string; name: string } | null
    return {
      id: z.id,
      name: z.name,
      facility_id: facility?.id ?? '',
      facility_name: facility?.name ?? '',
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Sensores</h2>
        <p className="text-sm text-muted-foreground">
          Gestión de sensores IoT instalados en zonas de cultivo.
        </p>
      </div>

      <SensorsListClient
        sensors={sensorsData}
        zones={zonesData}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        currentPage={page}
        canCreate={canCreate}
        canToggle={canToggle}
        kpis={{
          active: kpiActiveRes.count ?? 0,
          inactive: kpiInactiveRes.count ?? 0,
          stale: staleCount,
          calibration_expired: calExpiredCount,
        }}
        filters={{
          facility: params.facility || '',
          zone: params.zone || '',
          type: params.type || '',
          status: params.status || '',
          search: params.search || '',
        }}
      />
    </div>
  )
}
