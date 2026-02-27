'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Pencil, Power, Copy, Leaf } from 'lucide-react'

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
  type CropType,
  type CultivarRow,
  type FlowRow,
  selectClass,
  CultivarDialog,
} from './cultivars-shared'

type Props = {
  cropTypes: CropType[]
  cultivars: CultivarRow[]
  flows: FlowRow[]
  canWrite: boolean
}

export function CultivarsListClient({ cropTypes, cultivars, flows, canWrite }: Props) {
  const router = useRouter()
  const [selectedCropTypeId, setSelectedCropTypeId] = useState<string>(
    cropTypes.length > 0 ? cropTypes[0].id : ''
  )
  const [showInactive, setShowInactive] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCultivar, setEditingCultivar] = useState<CultivarRow | null>(null)
  const [deactivating, setDeactivating] = useState<CultivarRow | null>(null)

  const filteredCultivars = useMemo(() => {
    let list = cultivars.filter((c) => c.crop_type_id === selectedCropTypeId)
    if (!showInactive) list = list.filter((c) => c.is_active)
    return list
  }, [cultivars, selectedCropTypeId, showInactive])

  const flowCountsByCultivar = useMemo(() => {
    const map: Record<string, number> = {}
    for (const f of flows) {
      map[f.cultivar_id] = (map[f.cultivar_id] || 0) + 1
    }
    return map
  }, [flows])

  const phaseFlowCount = useCallback(
    (cultivarId: string) => {
      const phaseIds = new Set(flows.filter((f) => f.cultivar_id === cultivarId).map((f) => f.phase_id))
      return phaseIds.size
    },
    [flows]
  )

  function openNew() {
    setEditingCultivar(null)
    setDialogOpen(true)
  }

  function openEdit(cv: CultivarRow) {
    setEditingCultivar(cv)
    setDialogOpen(true)
  }

  async function handleToggle(cv: CultivarRow) {
    const supabase = createClient()
    const { error } = await supabase
      .from('cultivars')
      .update({ is_active: !cv.is_active })
      .eq('id', cv.id)
    if (error) {
      toast.error('Error al cambiar el estado.')
      return
    }
    toast.success(cv.is_active ? 'Cultivar desactivado.' : 'Cultivar reactivado.')
    router.refresh()
  }

  async function handleDuplicate(cv: CultivarRow) {
    const supabase = createClient()
    const { data: newCv, error } = await supabase
      .from('cultivars')
      .insert({
        crop_type_id: cv.crop_type_id,
        code: `${cv.code}-COPY`,
        name: `${cv.name} (Copia)`,
        breeder: cv.breeder,
        genetics: cv.genetics,
        default_cycle_days: cv.default_cycle_days,
        phase_durations: cv.phase_durations as Record<string, number>,
        expected_yield_per_plant_g: cv.expected_yield_per_plant_g,
        expected_dry_ratio: cv.expected_dry_ratio,
        target_profile: cv.target_profile as Record<string, string>,
        quality_grade: cv.quality_grade,
        optimal_conditions: cv.optimal_conditions as Record<string, { min?: number | null; max?: number | null; unit?: string }>,
        density_plants_per_m2: cv.density_plants_per_m2,
        notes: cv.notes,
      })
      .select('id')
      .single()

    if (error) {
      if (error.message?.includes('idx_cultivars_code')) {
        toast.error('Ya existe un cultivar con el código de copia. Edita el código del duplicado.')
      } else {
        toast.error('Error al duplicar el cultivar.')
      }
      return
    }

    // Copy flows
    const cvFlows = flows.filter((f) => f.cultivar_id === cv.id)
    if (cvFlows.length > 0) {
      const { error: flowErr } = await supabase.from('phase_product_flows').insert(
        cvFlows.map((f) => ({
          cultivar_id: newCv.id,
          phase_id: f.phase_id,
          direction: f.direction,
          product_role: f.product_role,
          product_id: f.product_id,
          product_category_id: f.product_category_id,
          expected_yield_pct: f.expected_yield_pct,
          expected_quantity_per_input: f.expected_quantity_per_input,
          unit_id: f.unit_id,
          is_required: f.is_required,
          sort_order: f.sort_order,
          notes: f.notes,
        }))
      )
      if (flowErr) {
        toast.error('Cultivar duplicado pero hubo error al copiar los flows.')
      }
    }

    toast.success('Cultivar duplicado.')
    router.push(`/settings/cultivars/${newCv.id}`)
  }

  return (
    <>
      {/* Crop type filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Tipo de cultivo:</label>
          <select
            value={selectedCropTypeId}
            onChange={(e) => setSelectedCropTypeId(e.target.value)}
            className={selectClass + ' w-56'}
          >
            {cropTypes.length === 0 && <option value="">Sin tipos de cultivo</option>}
            {cropTypes.map((ct) => (
              <option key={ct.id} value={ct.id}>
                {ct.name}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox checked={showInactive} onCheckedChange={(v) => setShowInactive(!!v)} />
          Inactivos
        </label>
        <div className="ml-auto">
          {canWrite && (
            <Button size="sm" onClick={openNew}>
              <Plus className="mr-1.5 h-4 w-4" />
              Nuevo cultivar
            </Button>
          )}
        </div>
      </div>

      {cropTypes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Leaf className="mb-3 h-10 w-10" />
            <p className="text-sm text-center">
              Primero crea tipos de cultivo en Settings &gt; Tipos de Cultivo.
            </p>
          </CardContent>
        </Card>
      ) : filteredCultivars.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Leaf className="mb-3 h-10 w-10" />
            <p className="text-sm text-center">No hay cultivares. Crea el primero.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCultivars.map((cv) => {
            const pfCount = phaseFlowCount(cv.id)
            const hasFlows = (flowCountsByCultivar[cv.id] || 0) > 0
            return (
              <Card
                key={cv.id}
                className={`cursor-pointer transition-colors hover:border-muted-foreground/30 ${!cv.is_active ? 'opacity-50' : ''}`}
                onClick={() => router.push(`/settings/cultivars/${cv.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="truncate font-medium text-sm">{cv.name}</span>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{cv.code}</span>
                        {cv.default_cycle_days && (
                          <>
                            <span>·</span>
                            <span>{cv.default_cycle_days}d</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {hasFlows ? (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Flows: {pfCount} fases
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                          Sin flows
                        </Badge>
                      )}
                      {!cv.is_active && (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-500 text-xs">
                          Inactivo
                        </Badge>
                      )}
                    </div>
                  </div>

                  {canWrite && (
                    <div className="mt-2 flex gap-1 border-t pt-2">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); openEdit(cv) }}>
                        <Pencil className="mr-1 h-3 w-3" /> Editar
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); handleDuplicate(cv) }}>
                        <Copy className="mr-1 h-3 w-3" /> Duplicar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (cv.is_active) setDeactivating(cv)
                          else handleToggle(cv)
                        }}
                      >
                        <Power className="mr-1 h-3 w-3" />
                        {cv.is_active ? 'Desact.' : 'React.'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Cultivar Dialog */}
      <CultivarDialog
        open={dialogOpen}
        onOpenChange={(o) => { if (!o) { setDialogOpen(false); setEditingCultivar(null) } else setDialogOpen(true) }}
        cultivar={editingCultivar}
        cropTypeId={selectedCropTypeId}
        onSuccess={(newId) => {
          setDialogOpen(false)
          setEditingCultivar(null)
          if (newId) {
            router.push(`/settings/cultivars/${newId}`)
          }
          router.refresh()
        }}
      />

      {/* Deactivate confirm */}
      <AlertDialog open={!!deactivating} onOpenChange={(o) => !o && setDeactivating(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar cultivar</AlertDialogTitle>
            <AlertDialogDescription>
              Desactivar &quot;{deactivating?.name}&quot; impedirá crear nuevas órdenes de producción con este cultivar. ¿Continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deactivating) handleToggle(deactivating); setDeactivating(null) }}>
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
