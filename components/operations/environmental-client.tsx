'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Loader2,
  Radio,
  Thermometer,
  Droplets,
  Wind,
  Sun,
  Zap,
  FlaskConical,
  Gauge,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  sensorTypeLabels,
  sensorTypeBadgeStyles,
  getRelativeTime,
  isCalibrationExpired,
} from '@/components/operations/operations-shared'

// ---------- Types ----------

type Facility = { id: string; name: string }
type Zone = { id: string; name: string; facility_id: string }

type Reading = {
  parameter: string
  value: number
  unit: string
  timestamp: string
  sensor_id?: string
}

type OptimalRange = { min: number; max: number; unit?: string }

type BatchInfo = {
  id: string
  code: string
  cultivar_name: string
  phase_name: string | null
  optimal_conditions: Record<string, OptimalRange> | null
}

type SensorInfo = {
  id: string
  type: string
  brand_model: string | null
  serial_number: string | null
  calibration_date: string | null
  is_active: boolean
  last_reading_at: string | null
}

type AggregatedPoint = {
  bucket: string
  avg_value: number
  min_value: number
  max_value: number
  reading_count: number
}

type MultiZoneRow = {
  zone_id: string
  zone_name: string
  facility_name: string
  batch_code: string | null
  cultivar_name: string | null
  readings: Record<string, { value: number; unit: string; status: 'in-range' | 'near' | 'out' | 'stale' }>
}

// ---------- Constants ----------

const PERIODS = [
  { value: '24h', label: 'Últimas 24h' },
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Últimos 30 días' },
]

const parameterConfig: Record<string, {
  label: string
  unit: string
  icon: React.ElementType
  color: string
  optimalKey: string
}> = {
  temperature: { label: 'Temperatura', unit: '°C', icon: Thermometer, color: 'hsl(0, 80%, 55%)', optimalKey: 'temp' },
  humidity: { label: 'Humedad', unit: '%RH', icon: Droplets, color: 'hsl(210, 80%, 55%)', optimalKey: 'humidity' },
  co2: { label: 'CO₂', unit: 'ppm', icon: Wind, color: 'hsl(140, 60%, 45%)', optimalKey: 'co2' },
  light_ppfd: { label: 'Luz PPFD', unit: 'µmol/m²/s', icon: Sun, color: 'hsl(45, 90%, 50%)', optimalKey: 'light' },
  ec: { label: 'EC', unit: 'mS/cm', icon: Zap, color: 'hsl(30, 80%, 55%)', optimalKey: 'ec' },
  ph: { label: 'pH', unit: '', icon: FlaskConical, color: 'hsl(270, 60%, 55%)', optimalKey: 'ph' },
  soil_moisture: { label: 'Humedad suelo', unit: '%', icon: Droplets, color: 'hsl(25, 70%, 50%)', optimalKey: 'soil_moisture' },
  vpd: { label: 'VPD', unit: 'kPa', icon: Gauge, color: 'hsl(190, 70%, 45%)', optimalKey: 'vpd' },
}

// Key alias mapping: optimal_conditions uses shortened keys
const optimalKeyAliases: Record<string, string> = {
  temperature: 'temp',
  light_ppfd: 'light',
}

function getOptimalRange(
  conditions: Record<string, OptimalRange> | null | undefined,
  parameter: string,
): OptimalRange | null {
  if (!conditions) return null
  // Try direct key first, then alias
  const direct = conditions[parameter]
  if (direct) return direct
  const alias = optimalKeyAliases[parameter]
  if (alias && conditions[alias]) return conditions[alias]
  return null
}

function getReadingStatus(
  value: number,
  range: OptimalRange | null,
): 'in-range' | 'near' | 'out' {
  if (!range) return 'in-range'
  const span = range.max - range.min
  const margin = span * 0.1
  if (value >= range.min && value <= range.max) return 'in-range'
  if (value >= range.min - margin && value <= range.max + margin) return 'near'
  return 'out'
}

function getTrend(readings: Reading[]): 'up' | 'down' | 'stable' {
  if (readings.length < 2) return 'stable'
  const recent = readings[0].value
  const prev = readings[1].value
  const diff = recent - prev
  if (Math.abs(diff) < 0.3) return 'stable'
  return diff > 0 ? 'up' : 'down'
}

// ---------- Props ----------

type Props = {
  facilities: Facility[]
  zones: Zone[]
  initialFacilityId: string
  initialZoneId: string
  initialPeriod: string
}

export function EnvironmentalClient({
  facilities,
  zones,
  initialFacilityId,
  initialZoneId,
  initialPeriod,
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [facilityId, setFacilityId] = useState(initialFacilityId)
  const [zoneId, setZoneId] = useState(initialZoneId)
  const [period, setPeriod] = useState(initialPeriod)
  const [showOptimal, setShowOptimal] = useState(true)
  const [showMultiZone, setShowMultiZone] = useState(false)

  // Data state
  const [currentReadings, setCurrentReadings] = useState<Reading[]>([])
  const [batchInfo, setBatchInfo] = useState<BatchInfo | null>(null)
  const [sensors, setSensors] = useState<SensorInfo[]>([])
  const [seriesData, setSeriesData] = useState<Record<string, AggregatedPoint[]>>({})
  const [multiZoneData, setMultiZoneData] = useState<MultiZoneRow[]>([])

  const [loadingCurrent, setLoadingCurrent] = useState(true)
  const [loadingSeries, setLoadingSeries] = useState(true)
  const [loadingMultiZone, setLoadingMultiZone] = useState(false)

  const filteredZones = useMemo(
    () => zones.filter((z) => z.facility_id === facilityId),
    [zones, facilityId],
  )

  // Group current readings by parameter (latest per parameter)
  const latestByParam = useMemo(() => {
    const map: Record<string, Reading[]> = {}
    for (const r of currentReadings) {
      if (!map[r.parameter]) map[r.parameter] = []
      map[r.parameter].push(r)
    }
    // Sort each parameter's readings newest first
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    }
    return map
  }, [currentReadings])

  const availableParams = useMemo(
    () => Object.keys(latestByParam).filter((p) => p in parameterConfig),
    [latestByParam],
  )

  // ---------- Data fetching ----------

  const fetchCurrentReadings = useCallback(async (zId: string) => {
    setLoadingCurrent(true)
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

    const [readingsRes, batchRes, sensorsRes] = await Promise.all([
      supabase
        .from('environmental_readings')
        .select('parameter, value, unit, timestamp, sensor_id')
        .eq('zone_id', zId)
        .gte('timestamp', thirtyMinAgo)
        .order('timestamp', { ascending: false }),
      supabase
        .from('batches')
        .select(
          `id, code,
           cultivar:cultivars(name, optimal_conditions),
           phase:production_phases!current_phase_id(name)`,
        )
        .eq('zone_id', zId)
        .eq('status', 'active' as const)
        .limit(1)
        .maybeSingle(),
      supabase
        .from('sensors')
        .select('id, type, brand_model, serial_number, calibration_date, is_active')
        .eq('zone_id', zId)
        .order('type'),
    ])

    setCurrentReadings(
      (readingsRes.data ?? []).map((r) => ({
        parameter: r.parameter,
        value: Number(r.value),
        unit: r.unit,
        timestamp: r.timestamp,
        sensor_id: r.sensor_id,
      })),
    )

    if (batchRes.data) {
      const cultivar = batchRes.data.cultivar as { name: string; optimal_conditions: unknown } | null
      const phase = batchRes.data.phase as { name: string } | null
      let optimalConditions: Record<string, OptimalRange> | null = null

      if (cultivar?.optimal_conditions && typeof cultivar.optimal_conditions === 'object') {
        optimalConditions = cultivar.optimal_conditions as Record<string, OptimalRange>
      }

      setBatchInfo({
        id: batchRes.data.id,
        code: batchRes.data.code,
        cultivar_name: cultivar?.name ?? '',
        phase_name: phase?.name ?? null,
        optimal_conditions: optimalConditions,
      })
    } else {
      setBatchInfo(null)
    }

    // Get last readings for sensors
    const sensorsList = sensorsRes.data ?? []
    const sensorIds = sensorsList.map((s) => s.id)
    const lastReadingsMap: Record<string, string> = {}

    if (sensorIds.length > 0) {
      const { data: lastReadings } = await supabase.rpc('get_sensors_last_reading', {
        p_sensor_ids: sensorIds,
      })
      if (lastReadings) {
        for (const r of lastReadings) {
          lastReadingsMap[r.sensor_id] = r.last_reading_at
        }
      }
    }

    setSensors(
      sensorsList.map((s) => ({
        id: s.id,
        type: s.type,
        brand_model: s.brand_model,
        serial_number: s.serial_number,
        calibration_date: s.calibration_date,
        is_active: s.is_active,
        last_reading_at: lastReadingsMap[s.id] ?? null,
      })),
    )

    setLoadingCurrent(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchSeriesData = useCallback(async (zId: string, p: string) => {
    setLoadingSeries(true)

    const now = new Date()
    let start: Date
    let interval: string

    if (p === '24h') {
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      interval = '00:05:00' // 5 min buckets for raw-ish data
    } else if (p === '7d') {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      interval = '01:00:00'
    } else {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      interval = '04:00:00'
    }

    if (p === '24h') {
      // Raw data for 24h
      const { data } = await supabase
        .from('environmental_readings')
        .select('parameter, value, unit, timestamp')
        .eq('zone_id', zId)
        .gte('timestamp', start.toISOString())
        .order('timestamp')

      // Group by parameter into aggregated-like format
      const grouped: Record<string, AggregatedPoint[]> = {}
      for (const r of data ?? []) {
        if (!grouped[r.parameter]) grouped[r.parameter] = []
        grouped[r.parameter].push({
          bucket: r.timestamp,
          avg_value: Number(r.value),
          min_value: Number(r.value),
          max_value: Number(r.value),
          reading_count: 1,
        })
      }
      setSeriesData(grouped)
    } else {
      // Use RPC for aggregated data — call per parameter found in sensors
      const { data: sensorTypes } = await supabase
        .from('sensors')
        .select('type')
        .eq('zone_id', zId)
        .eq('is_active', true)

      const params = [...new Set((sensorTypes ?? []).map((s) => s.type))]
      const grouped: Record<string, AggregatedPoint[]> = {}

      // Map sensor_type to env_parameter (they match except light→light_ppfd)
      const paramMapping: Record<string, string> = { light: 'light_ppfd' }

      await Promise.all(
        params.map(async (param) => {
          const envParam = paramMapping[param] || param
          const { data } = await supabase.rpc('get_env_readings_aggregated', {
            p_zone_id: zId,
            p_parameter: envParam as 'temperature',
            p_start: start.toISOString(),
            p_end: now.toISOString(),
            p_interval: interval,
          })
          if (data && data.length > 0) {
            grouped[envParam] = data.map((d: { bucket: string; avg_value: number; min_value: number; max_value: number; reading_count: number }) => ({
              bucket: d.bucket,
              avg_value: Number(d.avg_value),
              min_value: Number(d.min_value),
              max_value: Number(d.max_value),
              reading_count: Number(d.reading_count),
            }))
          }
        }),
      )
      setSeriesData(grouped)
    }

    setLoadingSeries(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchMultiZoneData = useCallback(async () => {
    setLoadingMultiZone(true)

    const { data: zonesWithBatches } = await supabase
      .from('zones')
      .select(
        `id, name,
         facility:facilities(name),
         batches!inner(id, code, status, cultivar:cultivars(name, optimal_conditions))`,
      )
      .eq('batches.status', 'active' as const)

    if (!zonesWithBatches || zonesWithBatches.length === 0) {
      setMultiZoneData([])
      setLoadingMultiZone(false)
      return
    }

    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

    // Get latest readings for all these zones
    const zoneIds = zonesWithBatches.map((z) => z.id)
    const { data: allReadings } = await supabase
      .from('environmental_readings')
      .select('zone_id, parameter, value, unit, timestamp')
      .in('zone_id', zoneIds)
      .gte('timestamp', thirtyMinAgo)
      .order('timestamp', { ascending: false })

    // Group readings by zone+parameter, take latest
    const readingsByZone: Record<string, Record<string, { value: number; unit: string }>> = {}
    for (const r of allReadings ?? []) {
      if (!readingsByZone[r.zone_id]) readingsByZone[r.zone_id] = {}
      if (!readingsByZone[r.zone_id][r.parameter]) {
        readingsByZone[r.zone_id][r.parameter] = { value: Number(r.value), unit: r.unit }
      }
    }

    const rows: MultiZoneRow[] = zonesWithBatches.map((z) => {
      const facility = z.facility as { name: string } | null
      const batches = z.batches as { code: string; cultivar: { name: string; optimal_conditions: unknown } | null }[]
      const batch = batches[0]
      const conditions = batch?.cultivar?.optimal_conditions as Record<string, OptimalRange> | null

      const zoneReadings = readingsByZone[z.id] || {}
      const readings: MultiZoneRow['readings'] = {}

      for (const [param, data] of Object.entries(zoneReadings)) {
        if (!(param in parameterConfig)) continue
        const range = getOptimalRange(conditions, param)
        readings[param] = {
          value: data.value,
          unit: data.unit,
          status: range ? getReadingStatus(data.value, range) : 'in-range',
        }
      }

      return {
        zone_id: z.id,
        zone_name: z.name,
        facility_name: facility?.name ?? '',
        batch_code: batch?.code ?? null,
        cultivar_name: batch?.cultivar?.name ?? null,
        readings,
      }
    })

    setMultiZoneData(rows)
    setLoadingMultiZone(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------- Effects ----------

  // Fetch data when zone or period changes
  useEffect(() => {
    if (!zoneId) return
    fetchCurrentReadings(zoneId)
  }, [zoneId, fetchCurrentReadings])

  useEffect(() => {
    if (!zoneId) return
    fetchSeriesData(zoneId, period)
  }, [zoneId, period, fetchSeriesData])

  // Fetch multi-zone when toggled on
  useEffect(() => {
    if (showMultiZone) fetchMultiZoneData()
  }, [showMultiZone, fetchMultiZoneData])

  // Realtime subscription for new readings
  useEffect(() => {
    if (!zoneId) return

    const channel = supabase
      .channel(`env-readings-${zoneId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'environmental_readings',
          filter: `zone_id=eq.${zoneId}`,
        },
        (payload) => {
          const newReading: Reading = {
            parameter: payload.new.parameter,
            value: Number(payload.new.value),
            unit: payload.new.unit,
            timestamp: payload.new.timestamp,
            sensor_id: payload.new.sensor_id,
          }
          // Add to current readings
          setCurrentReadings((prev) => [newReading, ...prev])
          // Add to 24h series if in that mode
          if (period === '24h') {
            setSeriesData((prev) => {
              const param = newReading.parameter
              const existing = prev[param] ?? []
              return {
                ...prev,
                [param]: [
                  ...existing,
                  {
                    bucket: newReading.timestamp,
                    avg_value: newReading.value,
                    min_value: newReading.value,
                    max_value: newReading.value,
                    reading_count: 1,
                  },
                ],
              }
            })
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneId, period])

  // Update URL when selectors change
  useEffect(() => {
    const params = new URLSearchParams()
    if (facilityId) params.set('facility', facilityId)
    if (zoneId) params.set('zone', zoneId)
    if (period !== '24h') params.set('period', period)
    router.replace(`/operations/environmental?${params.toString()}`, { scroll: false })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilityId, zoneId, period])

  // ---------- Handlers ----------

  function handleFacilityChange(fId: string) {
    setFacilityId(fId)
    const firstZone = zones.find((z) => z.facility_id === fId)
    setZoneId(firstZone?.id || '')
  }

  function handleMultiZoneSelect(zId: string) {
    const zone = zones.find((z) => z.id === zId)
    if (zone) {
      setFacilityId(zone.facility_id)
      setZoneId(zone.id)
      setShowMultiZone(false)
    }
  }

  // ---------- Render ----------

  const noSensors = !loadingCurrent && sensors.length === 0
  const noData = !loadingCurrent && !noSensors && availableParams.length === 0

  return (
    <div className="space-y-6">
      {/* Selector bar */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Facility</Label>
          <Select value={facilityId} onValueChange={handleFacilityChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Seleccionar facility" />
            </SelectTrigger>
            <SelectContent>
              {facilities.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Zona</Label>
          <Select value={zoneId} onValueChange={setZoneId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Seleccionar zona" />
            </SelectTrigger>
            <SelectContent>
              {filteredZones.map((z) => (
                <SelectItem key={z.id} value={z.id}>
                  {z.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Periodo</Label>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="show-optimal"
            checked={showOptimal}
            onCheckedChange={setShowOptimal}
          />
          <Label htmlFor="show-optimal" className="text-sm">
            Comparar con óptimo
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="show-multizone"
            checked={showMultiZone}
            onCheckedChange={setShowMultiZone}
          />
          <Label htmlFor="show-multizone" className="text-sm">
            Vista multi-zona
          </Label>
        </div>
      </div>

      {/* Batch info banner */}
      {batchInfo && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Radio className="h-4 w-4" />
          <span>Batch activo:</span>
          <Link
            href={`/production/batches/${batchInfo.id}`}
            className="font-medium text-foreground hover:underline"
          >
            {batchInfo.code}
          </Link>
          <span>·</span>
          <span>{batchInfo.cultivar_name}</span>
          {batchInfo.phase_name && (
            <>
              <span>·</span>
              <Badge variant="outline" className="text-xs">
                {batchInfo.phase_name}
              </Badge>
            </>
          )}
        </div>
      )}

      {!batchInfo && !loadingCurrent && showOptimal && (
        <div className="text-sm text-muted-foreground italic">
          No hay batch activo en esta zona — comparación no disponible.
        </div>
      )}

      {/* Multi-zone view */}
      {showMultiZone && (
        <MultiZoneTable
          data={multiZoneData}
          loading={loadingMultiZone}
          onSelectZone={handleMultiZoneSelect}
        />
      )}

      {/* Main zone view */}
      {!showMultiZone && (
        <>
          {/* Empty states */}
          {noSensors && (
            <Card>
              <CardContent className="py-12 text-center">
                <Radio className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">
                  No hay sensores configurados en esta zona.
                </p>
                <Link
                  href="/operations/sensors"
                  className="mt-2 inline-block text-sm text-primary hover:underline"
                >
                  Agregar sensores
                </Link>
              </CardContent>
            </Card>
          )}

          {noData && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  Sin datos recientes en esta zona. Los sensores están configurados pero no han enviado lecturas en los últimos 30 minutos.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Current readings cards */}
          {loadingCurrent ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : (
            availableParams.length > 0 && (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {availableParams.map((param) => {
                  const config = parameterConfig[param]
                  if (!config) return null
                  const readings = latestByParam[param]
                  const latest = readings[0]
                  const range = showOptimal ? getOptimalRange(batchInfo?.optimal_conditions, param) : null
                  const status = range ? getReadingStatus(latest.value, range) : 'in-range'
                  const trend = getTrend(readings)
                  const Icon = config.icon

                  return (
                    <ReadingCard
                      key={param}
                      label={config.label}
                      value={latest.value}
                      unit={latest.unit || config.unit}
                      icon={Icon}
                      status={status}
                      trend={trend}
                      range={range}
                      showRange={showOptimal}
                    />
                  )
                })}
              </div>
            )
          )}

          {/* Time series charts */}
          {loadingSeries ? (
            <div className="grid gap-6 md:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          ) : (
            Object.keys(seriesData).length > 0 && (
              <div className="grid gap-6 md:grid-cols-2">
                {Object.entries(seriesData)
                  .filter(([param]) => param in parameterConfig)
                  .map(([param, data]) => {
                    const config = parameterConfig[param]
                    const range = showOptimal
                      ? getOptimalRange(batchInfo?.optimal_conditions, param)
                      : null
                    return (
                      <TimeSeriesChart
                        key={param}
                        label={config.label}
                        unit={config.unit}
                        color={config.color}
                        data={data}
                        range={range}
                        period={period}
                      />
                    )
                  })}
              </div>
            )
          )}

          {/* Zone sensors table */}
          {!noSensors && !loadingCurrent && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">
                  Sensores de la zona
                </CardTitle>
                <Link
                  href="/operations/sensors"
                  className="text-sm text-primary hover:underline"
                >
                  Gestionar sensores
                </Link>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Marca / Modelo</TableHead>
                      <TableHead>Serial</TableHead>
                      <TableHead>Última lectura</TableHead>
                      <TableHead>Calibración</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sensors.map((s) => {
                      const rel = getRelativeTime(s.last_reading_at)
                      const calExpired = isCalibrationExpired(s.calibration_date)
                      return (
                        <TableRow key={s.id}>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={cn(
                                'text-xs',
                                sensorTypeBadgeStyles[s.type],
                              )}
                            >
                              {sensorTypeLabels[s.type] || s.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {s.brand_model || '—'}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {s.serial_number || '—'}
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                'text-xs',
                                rel.isStale
                                  ? 'text-destructive'
                                  : 'text-muted-foreground',
                              )}
                            >
                              {rel.label}
                            </span>
                          </TableCell>
                          <TableCell>
                            {s.calibration_date ? (
                              <span
                                className={cn(
                                  'text-xs',
                                  calExpired
                                    ? 'text-destructive'
                                    : 'text-muted-foreground',
                                )}
                              >
                                {new Date(
                                  s.calibration_date,
                                ).toLocaleDateString('es-CL')}
                                {calExpired && ' (vencida)'}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={s.is_active ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {s.is_active ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

// ---------- Sub-components ----------

function ReadingCard({
  label,
  value,
  unit,
  icon: Icon,
  status,
  trend,
  range,
  showRange,
}: {
  label: string
  value: number
  unit: string
  icon: React.ElementType
  status: 'in-range' | 'near' | 'out' | 'stale'
  trend: 'up' | 'down' | 'stable'
  range: OptimalRange | null
  showRange: boolean
}) {
  const TrendIcon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : ArrowRight

  const statusStyles = {
    'in-range': 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
    near: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800',
    out: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
    stale: 'bg-muted border-border',
  }

  const valueStyles = {
    'in-range': 'text-green-700 dark:text-green-400',
    near: 'text-yellow-700 dark:text-yellow-400',
    out: 'text-red-700 dark:text-red-400',
    stale: 'text-muted-foreground',
  }

  return (
    <Card className={cn('relative overflow-hidden', statusStyles[status])}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            {label}
          </span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className={cn('text-2xl font-bold tabular-nums', valueStyles[status])}>
            {value.toFixed(1)}
          </span>
          <span className="text-sm text-muted-foreground">{unit}</span>
          <TrendIcon className={cn('ml-1 h-3.5 w-3.5', valueStyles[status])} />
          {status === 'out' && (
            <AlertTriangle className="ml-auto h-4 w-4 text-red-500" />
          )}
        </div>
        {showRange && range && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Óptimo: {range.min}–{range.max}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function TimeSeriesChart({
  label,
  unit,
  color,
  data,
  range,
  period,
}: {
  label: string
  unit: string
  color: string
  data: AggregatedPoint[]
  range: OptimalRange | null
  period: string
}) {
  const chartConfig: ChartConfig = {
    avg_value: { label, color },
  }

  const formatTime = (ts: string) => {
    const d = new Date(ts)
    if (period === '24h') {
      return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })
  }

  const hasRange = range && data.length > 0

  // Build chart data with optional range band
  const chartData = data.map((d) => ({
    time: d.bucket,
    avg_value: d.avg_value,
    min_value: d.min_value,
    max_value: d.max_value,
    ...(hasRange
      ? { range_min: range.min, range_max: range.max, range_band: range.max - range.min }
      : {}),
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          {label}
          {unit && <span className="ml-1 text-muted-foreground">({unit})</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            Sin datos en el periodo
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-48 w-full">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis
                dataKey="time"
                tickFormatter={formatTime}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                domain={['auto', 'auto']}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => {
                      if (!payload?.[0]?.payload?.time) return ''
                      return new Date(payload[0].payload.time).toLocaleString('es-CL')
                    }}
                  />
                }
              />
              {/* Optimal range band */}
              {hasRange && (
                <>
                  <ReferenceLine
                    y={range.min}
                    stroke="hsl(140, 60%, 45%)"
                    strokeDasharray="4 4"
                    strokeOpacity={0.6}
                  />
                  <ReferenceLine
                    y={range.max}
                    stroke="hsl(140, 60%, 45%)"
                    strokeDasharray="4 4"
                    strokeOpacity={0.6}
                  />
                  <Area
                    dataKey="range_max"
                    stroke="none"
                    fill="hsl(140, 60%, 45%)"
                    fillOpacity={0.08}
                    baseLine={range.min}
                    type="monotone"
                    isAnimationActive={false}
                  />
                </>
              )}
              {/* Min-max band when multiple readings per bucket */}
              {data[0]?.reading_count > 1 && (
                <Area
                  dataKey="max_value"
                  stroke="none"
                  fill={color}
                  fillOpacity={0.1}
                  type="monotone"
                  isAnimationActive={false}
                />
              )}
              {/* Main line */}
              <Line
                dataKey="avg_value"
                stroke={color}
                strokeWidth={2}
                dot={false}
                type="monotone"
                isAnimationActive={false}
              />
            </ComposedChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

function MultiZoneTable({
  data,
  loading,
  onSelectZone,
}: {
  data: MultiZoneRow[]
  loading: boolean
  onSelectZone: (zoneId: string) => void
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando vista multi-zona...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No hay zonas con batch activo.
        </CardContent>
      </Card>
    )
  }

  const allParams = ['temperature', 'humidity', 'co2', 'light_ppfd', 'ec', 'ph', 'soil_moisture', 'vpd']

  const statusColors = {
    'in-range': 'text-green-700 dark:text-green-400',
    near: 'text-yellow-700 dark:text-yellow-400',
    out: 'text-red-700 dark:text-red-400 font-semibold',
    stale: 'text-muted-foreground',
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Vista multi-zona</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zona</TableHead>
                <TableHead>Facility</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Cultivar</TableHead>
                {allParams.map((p) => (
                  <TableHead key={p} className="text-center text-xs">
                    {parameterConfig[p]?.label ?? p}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow
                  key={row.zone_id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onSelectZone(row.zone_id)}
                >
                  <TableCell className="font-medium">{row.zone_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.facility_name}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {row.batch_code || '—'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {row.cultivar_name || '—'}
                  </TableCell>
                  {allParams.map((p) => {
                    const reading = row.readings[p]
                    return (
                      <TableCell key={p} className="text-center">
                        {reading ? (
                          <span className={cn('text-sm tabular-nums', statusColors[reading.status])}>
                            {reading.value.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
