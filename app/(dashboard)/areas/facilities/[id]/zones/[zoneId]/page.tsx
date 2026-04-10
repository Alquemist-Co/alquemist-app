import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ZoneDetailClient } from '@/components/areas/zone-detail-client'
import type { ClimateConfig } from '@/components/areas/zones-shared'

type Props = {
  params: Promise<{ id: string; zoneId: string }>
}

export default async function ZoneDetailPage({ params }: Props) {
  const { id: facilityId, zoneId } = await params
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

  // Fetch zone + structures + facilities + batch + sensors + readings in parallel
  const [
    { data: zoneRaw },
    { data: structuresRaw },
    { data: facilitiesData },
    { data: activeBatchRaw },
    { data: sensorsRaw },
    { data: readingsRaw },
  ] = await Promise.all([
    supabase
      .from('zones')
      .select(
        'id, facility_id, name, purpose, environment, area_m2, height_m, effective_growing_area_m2, plant_capacity, climate_config, status, facility:facilities(id, name)',
      )
      .eq('id', zoneId)
      .single(),
    supabase
      .from('zone_structures')
      .select(
        'id, zone_id, name, type, length_m, width_m, is_mobile, num_levels, positions_per_level, max_positions, spacing_cm, pot_size_l',
      )
      .eq('zone_id', zoneId)
      .order('name'),
    supabase
      .from('facilities')
      .select('id, name')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('batches')
      .select(
        'id, code, plant_count, start_date, expected_end_date, status, cultivar:cultivars(id, name, optimal_conditions), current_phase:production_phases(id, name)',
      )
      .eq('zone_id', zoneId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle(),
    supabase
      .from('sensors')
      .select('id, type, brand_model, serial_number, calibration_date, is_active')
      .eq('zone_id', zoneId)
      .order('type'),
    supabase
      .from('environmental_readings')
      .select('id, sensor_id, parameter, value, unit, timestamp')
      .eq('zone_id', zoneId)
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false })
      .limit(100),
  ])

  if (!zoneRaw || zoneRaw.facility_id !== facilityId) {
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

  // Process active batch
  const activeBatch = activeBatchRaw
    ? {
        id: activeBatchRaw.id,
        code: activeBatchRaw.code,
        plant_count: activeBatchRaw.plant_count ?? 0,
        start_date: activeBatchRaw.start_date,
        expected_end_date: activeBatchRaw.expected_end_date,
        status: activeBatchRaw.status,
        cultivar_name:
          (activeBatchRaw.cultivar as { id: string; name: string; optimal_conditions: unknown } | null)?.name ?? '',
        phase_name:
          (activeBatchRaw.current_phase as { id: string; name: string } | null)?.name ?? '',
      }
    : null

  // Extract optimal conditions from batch's cultivar
  const optimalConditions = activeBatchRaw
    ? ((activeBatchRaw.cultivar as { optimal_conditions: Record<string, unknown> } | null)
        ?.optimal_conditions as Record<string, { min?: number; max?: number }> | null)
    : null

  // Process sensors
  const sensors = (sensorsRaw ?? []).map((s) => ({
    id: s.id,
    type: s.type as string,
    brand_model: s.brand_model as string | null,
    serial_number: s.serial_number as string | null,
    calibration_date: s.calibration_date as string | null,
    is_active: s.is_active as boolean,
  }))

  // Process readings: group by parameter, keep latest per parameter
  const readingsMap = new Map<string, { parameter: string; value: number; unit: string; timestamp: string; sensor_id: string }>()
  for (const r of readingsRaw ?? []) {
    if (!readingsMap.has(r.parameter)) {
      readingsMap.set(r.parameter, {
        parameter: r.parameter,
        value: Number(r.value),
        unit: r.unit,
        timestamp: r.timestamp,
        sensor_id: r.sensor_id,
      })
    }
  }
  const latestReadings = Array.from(readingsMap.values())

  return (
    <ZoneDetailClient
      zone={zone}
      structures={structures}
      facilities={facilities}
      canWrite={canWrite}
      facilityId={facilityId}
      activeBatch={activeBatch}
      sensors={sensors}
      latestReadings={latestReadings}
      optimalConditions={optimalConditions}
    />
  )
}
