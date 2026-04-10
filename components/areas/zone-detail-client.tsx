'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Pencil, FlaskConical, Radio, Thermometer, LayoutGrid, Grid3X3 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { DetailPageHeader } from '@/components/settings/detail-page-header'
import {
  type StructureRow,
  type ClimateConfig,
  purposeLabels,
  environmentLabels,
  statusLabels,
  structureTypeLabels,
  purposeBadgeStyles,
  statusBadgeStyles,
  ZoneDialog,
} from './zones-shared'

// ---------- Types ----------

type ZoneDetail = {
  id: string
  facility_id: string
  facility_name: string
  name: string
  purpose: string
  environment: string
  area_m2: number
  effective_growing_area_m2: number
  plant_capacity: number
  height_m: number | null
  climate_config: ClimateConfig | null
  status: string
}

type FacilityOption = { id: string; name: string }

type ActiveBatch = {
  id: string
  code: string
  plant_count: number
  start_date: string
  expected_end_date: string | null
  status: string
  cultivar_name: string
  phase_name: string
}

type SensorRow = {
  id: string
  type: string
  brand_model: string | null
  serial_number: string | null
  calibration_date: string | null
  is_active: boolean
}

type LatestReading = {
  parameter: string
  value: number
  unit: string
  timestamp: string
  sensor_id: string
}

type Props = {
  zone: ZoneDetail
  structures: StructureRow[]
  facilities: FacilityOption[]
  canWrite: boolean
  facilityId?: string
  activeBatch?: ActiveBatch | null
  sensors?: SensorRow[]
  latestReadings?: LatestReading[]
  optimalConditions?: Record<string, { min?: number; max?: number }> | null
}

// ---------- Helpers ----------

const sensorTypeLabels: Record<string, string> = {
  temperature: 'Temperatura',
  humidity: 'Humedad',
  co2: 'CO₂',
  light: 'Luz',
  ec: 'EC',
  ph: 'pH',
  soil_moisture: 'Humedad suelo',
  vpd: 'VPD',
}

const parameterLabels: Record<string, string> = {
  temperature: 'Temperatura',
  humidity: 'Humedad',
  co2: 'CO₂',
  light_ppfd: 'Luz (PPFD)',
  ec: 'EC',
  ph: 'pH',
  vpd: 'VPD',
}

const batchStatusLabels: Record<string, string> = {
  active: 'Activo',
  phase_transition: 'Transición',
  completed: 'Completado',
  cancelled: 'Cancelado',
  on_hold: 'En pausa',
}

const batchStatusStyles: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  phase_transition: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  on_hold: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours}h`
  return `hace ${Math.floor(hours / 24)}d`
}

function getReadingStatus(
  parameter: string,
  value: number,
  optimalConditions?: Record<string, { min?: number; max?: number }> | null,
): 'in-range' | 'near-limit' | 'out-of-range' | 'no-reference' {
  if (!optimalConditions) return 'no-reference'
  const range = optimalConditions[parameter]
  if (!range || (range.min == null && range.max == null)) return 'no-reference'
  const { min, max } = range
  if (min != null && value < min) return 'out-of-range'
  if (max != null && value > max) return 'out-of-range'
  // Near-limit: within 10% of boundary
  if (min != null && max != null) {
    const span = max - min
    if (span > 0 && (value - min < span * 0.1 || max - value < span * 0.1)) return 'near-limit'
  }
  return 'in-range'
}

const readingStatusStyles: Record<string, string> = {
  'in-range': 'text-green-600 dark:text-green-400',
  'near-limit': 'text-yellow-600 dark:text-yellow-400',
  'out-of-range': 'text-red-600 dark:text-red-400',
  'no-reference': 'text-muted-foreground',
}

const readingStatusBg: Record<string, string> = {
  'in-range': 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800',
  'near-limit': 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800',
  'out-of-range': 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800',
  'no-reference': 'bg-muted/50 border-border',
}

// ---------- Component ----------

export function ZoneDetailClient({
  zone,
  structures,
  facilities,
  canWrite,
  facilityId,
  activeBatch,
  sensors = [],
  latestReadings = [],
  optimalConditions,
}: Props) {
  const router = useRouter()
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  // Build ZoneRow shape for ZoneDialog (it expects the full ZoneRow type)
  const zoneForDialog = {
    ...zone,
    structure_count: structures.length,
  }

  const backHref = facilityId
    ? `/areas/facilities/${facilityId}?tab=zones`
    : '/areas/zones'
  const backLabel = facilityId ? 'Zonas' : 'Zonas'

  return (
    <div className="space-y-6">
      {/* Header */}
      <DetailPageHeader
        backHref={backHref}
        backLabel={backLabel}
        title={zone.name}
        badges={
          <div className="flex gap-1.5">
            <Badge
              variant="secondary"
              className={`text-xs ${purposeBadgeStyles[zone.purpose] ?? ''}`}
            >
              {purposeLabels[zone.purpose] ?? zone.purpose}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {environmentLabels[zone.environment] ?? zone.environment}
            </Badge>
            <Badge
              variant="secondary"
              className={`text-xs ${statusBadgeStyles[zone.status] ?? ''}`}
            >
              {statusLabels[zone.status] ?? zone.status}
            </Badge>
          </div>
        }
        actions={
          canWrite ? (
            <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
              <Pencil className="mr-1.5 h-4 w-4" />
              Editar zona
            </Button>
          ) : undefined
        }
      />

      {/* Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: General Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Información general</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground text-xs">Instalación</dt>
                <dd className="font-medium">
                  <Link
                    href={`/areas/facilities/${zone.facility_id}`}
                    className="text-primary hover:underline"
                  >
                    {zone.facility_name}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Propósito</dt>
                <dd>
                  <Badge
                    variant="secondary"
                    className={`text-xs ${purposeBadgeStyles[zone.purpose] ?? ''}`}
                  >
                    {purposeLabels[zone.purpose] ?? zone.purpose}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Ambiente</dt>
                <dd>{environmentLabels[zone.environment] ?? zone.environment}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Estado</dt>
                <dd>
                  <Badge
                    variant="secondary"
                    className={`text-xs ${statusBadgeStyles[zone.status] ?? ''}`}
                  >
                    {statusLabels[zone.status] ?? zone.status}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Área de piso</dt>
                <dd>{zone.area_m2.toLocaleString('es-CO')} m²</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Altura</dt>
                <dd>{zone.height_m != null ? `${zone.height_m} m` : '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Área cultivo efectiva</dt>
                <dd className="font-medium">{zone.effective_growing_area_m2.toLocaleString('es-CO')} m²</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Capacidad plantas</dt>
                <dd className="font-medium">{zone.plant_capacity.toLocaleString('es-CO')}</dd>
              </div>
            </dl>

            {/* Climate config */}
            {zone.climate_config && (
              <div className="mt-4 rounded-md border p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Configuración climática</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  {zone.climate_config.temperature != null && (
                    <div>
                      <span className="text-xs text-muted-foreground">Temp</span>
                      <p className="font-medium">{zone.climate_config.temperature}°C</p>
                    </div>
                  )}
                  {zone.climate_config.humidity != null && (
                    <div>
                      <span className="text-xs text-muted-foreground">HR</span>
                      <p className="font-medium">{zone.climate_config.humidity}%</p>
                    </div>
                  )}
                  {zone.climate_config.co2 != null && (
                    <div>
                      <span className="text-xs text-muted-foreground">CO₂</span>
                      <p className="font-medium">{zone.climate_config.co2} ppm</p>
                    </div>
                  )}
                  {zone.climate_config.photoperiod && (
                    <div>
                      <span className="text-xs text-muted-foreground">Fotoperiodo</span>
                      <p className="font-medium">{zone.climate_config.photoperiod}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section: Batch Activo */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Batch activo</CardTitle>
          </CardHeader>
          <CardContent>
            {activeBatch ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-muted-foreground text-xs">Código</dt>
                  <dd className="font-medium">
                    <Link
                      href={`/production/batches/${activeBatch.id}`}
                      className="text-primary hover:underline"
                    >
                      {activeBatch.code}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Cultivar</dt>
                  <dd>{activeBatch.cultivar_name}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Fase actual</dt>
                  <dd>
                    <Badge variant="secondary" className="text-xs">
                      {activeBatch.phase_name || '—'}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Plantas</dt>
                  <dd className="font-medium">{activeBatch.plant_count.toLocaleString('es-CO')}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Inicio</dt>
                  <dd>{activeBatch.start_date}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Fin esperado</dt>
                  <dd>{activeBatch.expected_end_date ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Estado</dt>
                  <dd>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${batchStatusStyles[activeBatch.status] ?? ''}`}
                    >
                      {batchStatusLabels[activeBatch.status] ?? activeBatch.status}
                    </Badge>
                  </dd>
                </div>
              </dl>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <FlaskConical className="mb-2 h-8 w-8" />
                <p className="text-sm">No hay batch activo en esta zona</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section: Estructuras (full width) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Estructuras</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {structures.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground px-4">
              <LayoutGrid className="mb-2 h-8 w-8" />
              <p className="text-sm">Zona sin estructuras internas — capacidad basada en área de piso</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Dimensiones</TableHead>
                    <TableHead>Niveles</TableHead>
                    <TableHead>Pos/nivel</TableHead>
                    <TableHead>Capacidad</TableHead>
                    <TableHead>Móvil</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {structures.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {structureTypeLabels[s.type] ?? s.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{s.length_m}×{s.width_m} m</TableCell>
                      <TableCell>{s.num_levels}</TableCell>
                      <TableCell>{s.positions_per_level ?? '—'}</TableCell>
                      <TableCell>{s.max_positions ?? '—'}</TableCell>
                      <TableCell>
                        {s.is_mobile ? (
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            Móvil
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">Fijo</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section: Posiciones de Plantas (placeholder — feature-flagged) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Posiciones de plantas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Grid3X3 className="mb-2 h-8 w-8" />
            <p className="text-sm">Sin posiciones individuales para esta zona</p>
          </div>
        </CardContent>
      </Card>

      {/* Sensores + Lecturas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section: Sensores */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sensores</CardTitle>
          </CardHeader>
          <CardContent>
            {sensors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Radio className="mb-2 h-8 w-8" />
                <p className="text-sm">No hay sensores asignados a esta zona</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Serial</TableHead>
                      <TableHead>Calibración</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sensors.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {sensorTypeLabels[s.type] ?? s.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{s.brand_model ?? '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{s.serial_number ?? '—'}</TableCell>
                        <TableCell className="text-xs">{s.calibration_date ?? '—'}</TableCell>
                        <TableCell>
                          {s.is_active ? (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              Activo
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-500">
                              Inactivo
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section: Lecturas Ambientales */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Lecturas ambientales</CardTitle>
          </CardHeader>
          <CardContent>
            {latestReadings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Thermometer className="mb-2 h-8 w-8" />
                <p className="text-sm">Sin lecturas ambientales recientes</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {latestReadings.map((r) => {
                  const status = getReadingStatus(r.parameter, r.value, optimalConditions)
                  const range = optimalConditions?.[r.parameter]
                  return (
                    <div
                      key={r.parameter}
                      className={`rounded-lg border p-3 ${readingStatusBg[status]}`}
                    >
                      <p className="text-xs text-muted-foreground mb-1">
                        {parameterLabels[r.parameter] ?? r.parameter}
                      </p>
                      <p className={`text-lg font-semibold ${readingStatusStyles[status]}`}>
                        {r.value} {r.unit}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">{timeAgo(r.timestamp)}</span>
                        {range && (range.min != null || range.max != null) && (
                          <span className="text-xs text-muted-foreground">
                            Óptimo: {range.min ?? '—'}–{range.max ?? '—'} {r.unit}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Zone Dialog (reuses PRD 15 dialog) */}
      <ZoneDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        zone={zoneForDialog}
        facilities={facilities}
        onSuccess={() => {
          setEditDialogOpen(false)
          router.refresh()
        }}
      />
    </div>
  )
}
