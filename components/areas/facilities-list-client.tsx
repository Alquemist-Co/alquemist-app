'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Pencil, Power, MapPin } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

import {
  type FacilityRow,
  facilityTypeLabels,
  facilityTypeIcons,
  facilityTypeBadgeStyles,
  FacilityDialog,
} from './facilities-shared'

type Props = {
  facilities: FacilityRow[]
  canWrite: boolean
}

export function FacilitiesListClient({ facilities, canWrite }: Props) {
  const router = useRouter()
  const [showInactive, setShowInactive] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingFacility, setEditingFacility] = useState<FacilityRow | null>(null)
  const [deactivatingFacility, setDeactivatingFacility] = useState<FacilityRow | null>(null)

  const filtered = showInactive ? facilities : facilities.filter((f) => f.is_active)

  function openNew() {
    setEditingFacility(null)
    setDialogOpen(true)
  }

  function openEdit(f: FacilityRow) {
    setEditingFacility(f)
    setDialogOpen(true)
  }

  async function handleToggle(f: FacilityRow) {
    const supabase = createClient()
    const { error } = await supabase
      .from('facilities')
      .update({ is_active: !f.is_active })
      .eq('id', f.id)
    if (error) {
      toast.error('Error al cambiar el estado.')
      return
    }
    toast.success(f.is_active ? 'Instalación desactivada.' : 'Instalación reactivada.')
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox checked={showInactive} onCheckedChange={(v) => setShowInactive(!!v)} />
          Inactivos
        </label>
        {canWrite && (
          <Button size="sm" onClick={openNew}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nueva instalación
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <MapPin className="mb-3 h-10 w-10" />
            <p className="text-sm text-center">
              {facilities.length > 0 && !showInactive
                ? 'No hay instalaciones activas.'
                : 'No hay instalaciones registradas.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((f) => {
            const Icon = facilityTypeIcons[f.type] ?? MapPin
            return (
              <Card
                key={f.id}
                className={`cursor-pointer transition-colors hover:border-muted-foreground/30 ${!f.is_active ? 'opacity-50' : ''}`}
                onClick={() => router.push(`/areas/zones?facility=${f.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate font-medium text-sm">{f.name}</span>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{f.address}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${facilityTypeBadgeStyles[f.type] ?? ''}`}
                      >
                        {facilityTypeLabels[f.type] ?? f.type}
                      </Badge>
                      {!f.is_active && (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-500 text-xs">
                          Inactivo
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground border-t pt-2">
                    <div>
                      <span className="font-medium text-foreground">{f.total_footprint_m2.toLocaleString()}</span> m²
                    </div>
                    <div>
                      <span className="font-medium text-foreground">{f.total_growing_area_m2.toLocaleString()}</span> cultivo
                    </div>
                    <div>
                      <span className="font-medium text-foreground">{f.zone_count}</span> zonas
                    </div>
                  </div>

                  {/* Inline actions */}
                  {canWrite && (
                    <div className="mt-2 flex gap-1 border-t pt-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Editar"
                        onClick={(e) => { e.stopPropagation(); openEdit(f) }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title={f.is_active ? 'Desactivar' : 'Reactivar'}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (f.is_active && f.zone_count > 0) {
                            setDeactivatingFacility(f)
                          } else {
                            handleToggle(f)
                          }
                        }}
                      >
                        <Power className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Facility Dialog */}
      <FacilityDialog
        open={dialogOpen}
        onOpenChange={(o) => { if (!o) { setDialogOpen(false); setEditingFacility(null) } else setDialogOpen(true) }}
        facility={editingFacility}
        onSuccess={() => {
          setDialogOpen(false)
          setEditingFacility(null)
          router.refresh()
        }}
      />

      {/* Deactivate warning */}
      <AlertDialog open={!!deactivatingFacility} onOpenChange={(o) => !o && setDeactivatingFacility(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar instalación</AlertDialogTitle>
            <AlertDialogDescription>
              Esta instalación tiene {deactivatingFacility?.zone_count ?? 0} zonas configuradas. Desactivarla impedirá asignar nuevos lotes a sus zonas. ¿Continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { if (deactivatingFacility) await handleToggle(deactivatingFacility); setDeactivatingFacility(null) }}>
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
