'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Plus,
  Pencil,
  Power,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sprout,
  GitBranch,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

import { DetailPageHeader } from './detail-page-header'
import {
  type CropTypeRow,
  type PhaseRow,
  categoryLabels,
  categoryBadgeStyles,
  CropTypeDialog,
  PhaseDialog,
} from './crop-types-shared'

type Props = {
  cropType: CropTypeRow
  phases: PhaseRow[]
  canWrite: boolean
}

export function CropTypeDetailClient({ cropType, phases, canWrite }: Props) {
  const router = useRouter()
  const [ctDialogOpen, setCtDialogOpen] = useState(false)
  const [phaseDialogOpen, setPhaseDialogOpen] = useState(false)
  const [editingPhase, setEditingPhase] = useState<PhaseRow | null>(null)
  const [deletingPhase, setDeletingPhase] = useState<PhaseRow | null>(null)
  const [deactivatingCt, setDeactivatingCt] = useState(false)

  function openNewPhase() {
    setEditingPhase(null)
    setPhaseDialogOpen(true)
  }

  function openEditPhase(phase: PhaseRow) {
    setEditingPhase(phase)
    setPhaseDialogOpen(true)
  }

  async function handleToggleCt() {
    const supabase = createClient()
    const { error } = await supabase
      .from('crop_types')
      .update({ is_active: !cropType.is_active })
      .eq('id', cropType.id)
    if (error) {
      toast.error('Error al cambiar el estado.')
      return
    }
    toast.success(cropType.is_active ? 'Tipo de cultivo desactivado.' : 'Tipo de cultivo reactivado.')
    if (cropType.is_active) {
      router.push('/settings/crop-types')
    } else {
      router.refresh()
    }
  }

  async function handleDeletePhase(phase: PhaseRow) {
    // Check if other phases depend on this one
    const dependents = phases.filter((p) => p.depends_on_phase_id === phase.id)
    if (dependents.length > 0) {
      toast.error(`No se puede eliminar: ${dependents.length} fase(s) dependen de esta.`)
      setDeletingPhase(null)
      return
    }

    const supabase = createClient()
    const { error } = await supabase
      .from('production_phases')
      .delete()
      .eq('id', phase.id)

    if (error) {
      if (error.message?.includes('foreign key') || error.message?.includes('violates')) {
        toast.error('No se puede eliminar: esta fase está en uso.')
      } else {
        toast.error('Error al eliminar la fase.')
      }
      setDeletingPhase(null)
      return
    }
    toast.success('Fase eliminada.')
    setDeletingPhase(null)
    router.refresh()
  }

  async function handleReorder(phaseId: string, direction: 'up' | 'down') {
    const idx = phases.findIndex((p) => p.id === phaseId)
    if (idx < 0) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= phases.length) return

    const supabase = createClient()
    const a = phases[idx]
    const b = phases[swapIdx]

    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from('production_phases').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('production_phases').update({ sort_order: a.sort_order }).eq('id', b.id),
    ])

    if (e1 || e2) {
      toast.error('Error al reordenar.')
      return
    }
    router.refresh()
  }

  function getPhaseName(id: string | null) {
    if (!id) return null
    return phases.find((p) => p.id === id)?.name ?? null
  }

  return (
    <div className="space-y-6">
      <DetailPageHeader
        backHref="/settings/crop-types"
        backLabel="Tipos de Cultivo"
        title={cropType.name}
        subtitle={cropType.scientific_name}
        icon={cropType.icon}
        badges={
          <Badge
            variant="secondary"
            className={`text-xs ${categoryBadgeStyles[cropType.category] ?? ''}`}
          >
            {categoryLabels[cropType.category] ?? cropType.category}
          </Badge>
        }
        actions={
          canWrite ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setCtDialogOpen(true)}>
                <Pencil className="mr-1.5 h-4 w-4" />
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (cropType.is_active && phases.length > 0) {
                    setDeactivatingCt(true)
                  } else {
                    handleToggleCt()
                  }
                }}
              >
                <Power className="mr-1.5 h-4 w-4" />
                {cropType.is_active ? 'Desactivar' : 'Reactivar'}
              </Button>
            </>
          ) : undefined
        }
      />

      {/* Phases section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base">Fases de producción</CardTitle>
          {canWrite && (
            <Button variant="outline" size="sm" onClick={openNewPhase}>
              <Plus className="mr-1.5 h-4 w-4" />
              Nueva fase
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {phases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Sprout className="mb-3 h-10 w-10" />
              <p className="text-sm text-center">
                Configura las fases del ciclo productivo para {cropType.name}.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {phases.map((phase, idx) => (
                <div
                  key={phase.id}
                  className="flex items-start gap-3 px-4 py-3"
                >
                  {/* Sort order + reorder buttons */}
                  <div className="flex flex-col items-center gap-0.5 pt-0.5">
                    <span className="text-xs font-mono text-muted-foreground w-5 text-center">
                      {phase.sort_order}
                    </span>
                    {canWrite && (
                      <>
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleReorder(phase.id, 'up')}
                          className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === phases.length - 1}
                          onClick={() => handleReorder(phase.id, 'down')}
                          className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Color dot */}
                  {phase.color && (
                    <span
                      className="mt-1 h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: phase.color }}
                    />
                  )}

                  {/* Phase info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{phase.name}</span>
                      <span className="text-xs text-muted-foreground">{phase.code}</span>
                    </div>

                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span>
                        {phase.default_duration_days
                          ? `${phase.default_duration_days} días`
                          : 'Indefinida'}
                      </span>
                      {phase.depends_on_phase_id && (
                        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                          <GitBranch className="h-3 w-3" />
                          Bifurca desde: {getPhaseName(phase.depends_on_phase_id)}
                        </span>
                      )}
                    </div>

                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {phase.is_transformation && (
                        <Badge variant="outline" className="text-xs">Transforma</Badge>
                      )}
                      {phase.is_destructive && (
                        <Badge variant="outline" className="text-xs text-red-600 border-red-200">Destructiva</Badge>
                      )}
                      {phase.requires_zone_change && (
                        <Badge variant="outline" className="text-xs">Cambio de zona</Badge>
                      )}
                      {phase.can_skip && (
                        <Badge variant="outline" className="text-xs">Opcional</Badge>
                      )}
                      {phase.can_be_entry_point && (
                        <Badge variant="outline" className="text-xs text-green-600 border-green-200">Entry</Badge>
                      )}
                      {phase.can_be_exit_point && (
                        <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">Exit</Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {canWrite && (
                    <div className="flex shrink-0 gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEditPhase(phase)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setDeletingPhase(phase)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Crop Type Edit Dialog */}
      <CropTypeDialog
        open={ctDialogOpen}
        onOpenChange={(o) => { if (!o) setCtDialogOpen(false); else setCtDialogOpen(true) }}
        cropType={cropType}
        onSuccess={() => {
          setCtDialogOpen(false)
          router.refresh()
        }}
      />

      {/* Phase Dialog */}
      <PhaseDialog
        open={phaseDialogOpen}
        onOpenChange={(o) => { if (!o) { setPhaseDialogOpen(false); setEditingPhase(null) } else setPhaseDialogOpen(true) }}
        phase={editingPhase}
        cropTypeId={cropType.id}
        allPhases={phases}
        nextSortOrder={phases.length > 0 ? Math.max(...phases.map((p) => p.sort_order)) + 1 : 1}
        onSuccess={() => { setPhaseDialogOpen(false); setEditingPhase(null); router.refresh() }}
      />

      {/* Delete phase confirmation */}
      <AlertDialog open={!!deletingPhase} onOpenChange={(o) => !o && setDeletingPhase(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar fase</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar la fase &quot;{deletingPhase?.name}&quot;? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingPhase && handleDeletePhase(deletingPhase)}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate crop type confirmation */}
      <AlertDialog open={deactivatingCt} onOpenChange={(o) => !o && setDeactivatingCt(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar tipo de cultivo</AlertDialogTitle>
            <AlertDialogDescription>
              Este tipo de cultivo tiene {phases.length} fases configuradas. Desactivarlo impedirá crear nuevas órdenes con sus cultivares. ¿Continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { handleToggleCt(); setDeactivatingCt(false) }}>
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
