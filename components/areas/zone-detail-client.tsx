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

type Props = {
  zone: ZoneDetail
  structures: StructureRow[]
  facilities: FacilityOption[]
  canWrite: boolean
}

// ---------- Component ----------

export function ZoneDetailClient({ zone, structures, facilities, canWrite }: Props) {
  const router = useRouter()
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  // Build ZoneRow shape for ZoneDialog (it expects the full ZoneRow type)
  const zoneForDialog = {
    ...zone,
    structure_count: structures.length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <DetailPageHeader
        backHref="/areas/zones"
        backLabel="Zonas"
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
                    href={`/areas/zones?facility=${zone.facility_id}`}
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

        {/* Section 3: Batch Activo (empty state — connected in Phase 4) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Batch activo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <FlaskConical className="mb-2 h-8 w-8" />
              <p className="text-sm">No hay batch activo en esta zona</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 2: Estructuras (full width) */}
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

      {/* Section 3: Posiciones de Plantas (empty state — connected in Phase 4, feature-flagged) */}
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

      {/* Section 4 & 5: Sensores + Lecturas (empty states — connected in Phase 6) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sensores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Radio className="mb-2 h-8 w-8" />
              <p className="text-sm">No hay sensores asignados a esta zona</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Lecturas ambientales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Thermometer className="mb-2 h-8 w-8" />
              <p className="text-sm">Sin lecturas ambientales recientes</p>
            </div>
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
