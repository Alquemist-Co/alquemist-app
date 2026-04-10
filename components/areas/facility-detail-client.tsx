'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Pencil, MapPin, Sprout, Ruler, Warehouse as WarehouseIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

import { DetailPageHeader } from '@/components/settings/detail-page-header'
import {
  type FacilityRow,
  facilityTypeLabels,
  facilityTypeIcons,
  facilityTypeBadgeStyles,
  FacilityDialog,
} from './facilities-shared'
import { ZonesListClient } from './zones-list-client'
import type { ZoneRow } from './zones-shared'

const FacilityMap = dynamic(
  () => import('./facility-map').then((m) => m.FacilityMap),
  { ssr: false },
)

// ---------- Types ----------

type FacilityKpis = {
  totalZones: number
  effectiveGrowingArea: number
  totalPlantCapacity: number
  zonesByStatus: { active: number; maintenance: number; inactive: number }
}

type Props = {
  facility: FacilityRow
  zones: ZoneRow[]
  facilities: { id: string; name: string }[]
  kpis: FacilityKpis
  canWrite: boolean
  defaultTab: string
}

// ---------- Component ----------

export function FacilityDetailClient({
  facility,
  zones,
  facilities,
  kpis,
  canWrite,
  defaultTab,
}: Props) {
  const router = useRouter()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(defaultTab)

  const Icon = facilityTypeIcons[facility.type] ?? MapPin

  function handleTabChange(value: string) {
    setActiveTab(value)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', value)
    router.replace(url.pathname + url.search, { scroll: false })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <DetailPageHeader
        backHref="/areas/facilities"
        backLabel="Instalaciones"
        title={facility.name}
        badges={
          <div className="flex gap-1.5">
            <Badge
              variant="secondary"
              className={`text-xs ${facilityTypeBadgeStyles[facility.type] ?? ''}`}
            >
              {facilityTypeLabels[facility.type] ?? facility.type}
            </Badge>
            {!facility.is_active && (
              <Badge variant="secondary" className="bg-gray-100 text-gray-500 text-xs">
                Inactivo
              </Badge>
            )}
          </div>
        }
        actions={
          canWrite ? (
            <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
              <Pencil className="mr-1.5 h-4 w-4" />
              Editar
            </Button>
          ) : undefined
        }
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList variant="line">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="zones">Zonas ({kpis.totalZones})</TabsTrigger>
        </TabsList>

        {/* Tab: General */}
        <TabsContent value="general" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total zonas</p>
                <p className="text-2xl font-semibold">{kpis.totalZones}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis.zonesByStatus.active} activas
                  {kpis.zonesByStatus.maintenance > 0 &&
                    ` · ${kpis.zonesByStatus.maintenance} mant.`}
                  {kpis.zonesByStatus.inactive > 0 &&
                    ` · ${kpis.zonesByStatus.inactive} inactivas`}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Superficie total</p>
                <p className="text-2xl font-semibold">
                  {facility.total_footprint_m2.toLocaleString('es-CO')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">m²</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Área cultivo efectiva</p>
                <p className="text-2xl font-semibold">
                  {kpis.effectiveGrowingArea.toLocaleString('es-CO')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">m²</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Capacidad plantas</p>
                <p className="text-2xl font-semibold">
                  {kpis.totalPlantCapacity.toLocaleString('es-CO')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">plantas</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Facility Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Información</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground text-xs">Tipo</dt>
                    <dd className="flex items-center gap-1.5">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {facilityTypeLabels[facility.type] ?? facility.type}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">Superficie</dt>
                    <dd>{facility.total_footprint_m2.toLocaleString('es-CO')} m²</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-muted-foreground text-xs">Dirección</dt>
                    <dd>{facility.address}</dd>
                  </div>
                  {facility.latitude != null && facility.longitude != null && (
                    <div className="col-span-2">
                      <dt className="text-muted-foreground text-xs">Coordenadas</dt>
                      <dd className="text-muted-foreground">
                        {facility.latitude}, {facility.longitude}
                      </dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>

            {/* Mini Map */}
            {facility.latitude != null && facility.longitude != null && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Ubicación</CardTitle>
                </CardHeader>
                <CardContent>
                  <FacilityMap
                    latitude={facility.latitude}
                    longitude={facility.longitude}
                    name={facility.name}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Tab: Zonas */}
        <TabsContent value="zones">
          <ZonesListClient
            zones={zones}
            facilities={facilities}
            canWrite={canWrite}
            totalPages={1}
            totalCount={zones.length}
            pageSize={zones.length || 20}
            currentPage={1}
            filters={{ facility: '', purpose: '', status: '', search: '' }}
            basePath={`/areas/facilities/${facility.id}/zones`}
            scopedToFacility
            lockedFacilityId={facility.id}
          />
        </TabsContent>
      </Tabs>

      {/* Edit Facility Dialog */}
      <FacilityDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        facility={facility}
        onSuccess={() => {
          setEditDialogOpen(false)
          router.refresh()
        }}
      />
    </div>
  )
}
