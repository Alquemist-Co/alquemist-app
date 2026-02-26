'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  cropTypeSchema,
  type CropTypeInput,
  productionPhaseSchema,
  type ProductionPhaseInput,
} from '@/schemas/crop-types'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

// ---------- Types ----------

type CropTypeRow = {
  id: string
  code: string
  name: string
  scientific_name: string | null
  category: string
  regulatory_framework: string | null
  icon: string | null
  is_active: boolean
  phase_count: number
}

type PhaseRow = {
  id: string
  crop_type_id: string
  code: string
  name: string
  sort_order: number
  default_duration_days: number | null
  is_transformation: boolean
  is_destructive: boolean
  requires_zone_change: boolean
  can_skip: boolean
  can_be_entry_point: boolean
  can_be_exit_point: boolean
  depends_on_phase_id: string | null
  icon: string | null
  color: string | null
}

type Props = {
  cropTypes: CropTypeRow[]
  phases: PhaseRow[]
  canWrite: boolean
}

// ---------- Constants ----------

const categoryLabels: Record<string, string> = {
  annual: 'Anual',
  perennial: 'Perenne',
  biennial: 'Bienal',
}

const categoryBadgeStyles: Record<string, string> = {
  annual: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  perennial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  biennial: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

// ================================================================
// MAIN COMPONENT
// ================================================================

export function CropTypesClient({ cropTypes, phases, canWrite }: Props) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | null>(
    cropTypes.length > 0 ? cropTypes[0].id : null
  )
  const [showInactive, setShowInactive] = useState(false)
  const [ctDialogOpen, setCtDialogOpen] = useState(false)
  const [editingCt, setEditingCt] = useState<CropTypeRow | null>(null)
  const [deactivatingCt, setDeactivatingCt] = useState<CropTypeRow | null>(null)

  const filtered = showInactive ? cropTypes : cropTypes.filter((ct) => ct.is_active)
  const selectedCt = cropTypes.find((ct) => ct.id === selectedId) ?? null
  const selectedPhases = useMemo(
    () => phases.filter((p) => p.crop_type_id === selectedId).sort((a, b) => a.sort_order - b.sort_order),
    [phases, selectedId]
  )

  function openNewCt() {
    setEditingCt(null)
    setCtDialogOpen(true)
  }

  function openEditCt(ct: CropTypeRow) {
    setEditingCt(ct)
    setCtDialogOpen(true)
  }

  async function handleToggleCt(ct: CropTypeRow) {
    const supabase = createClient()
    const { error } = await supabase
      .from('crop_types')
      .update({ is_active: !ct.is_active })
      .eq('id', ct.id)
    if (error) {
      toast.error('Error al cambiar el estado.')
      return
    }
    toast.success(ct.is_active ? 'Tipo de cultivo desactivado.' : 'Tipo de cultivo reactivado.')
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Master panel — Crop types list */}
      <div className="w-full space-y-4 lg:w-80 lg:shrink-0">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox checked={showInactive} onCheckedChange={(v) => setShowInactive(!!v)} />
            Inactivos
          </label>
          {canWrite && (
            <Button size="sm" onClick={openNewCt}>
              <Plus className="mr-1.5 h-4 w-4" />
              Nuevo tipo
            </Button>
          )}
        </div>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Sprout className="mb-3 h-10 w-10" />
              <p className="text-sm text-center">Crea tu primer tipo de cultivo para comenzar.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((ct) => (
              <Card
                key={ct.id}
                className={`cursor-pointer transition-colors ${
                  ct.id === selectedId
                    ? 'border-primary ring-1 ring-primary'
                    : 'hover:border-muted-foreground/30'
                } ${!ct.is_active ? 'opacity-50' : ''}`}
                onClick={() => setSelectedId(ct.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {ct.icon && <span className="text-base">{ct.icon}</span>}
                        <span className="truncate font-medium text-sm">{ct.name}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{ct.code}</span>
                        <span>·</span>
                        <span>{ct.phase_count} fases</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${categoryBadgeStyles[ct.category] ?? ''}`}
                      >
                        {categoryLabels[ct.category] ?? ct.category}
                      </Badge>
                      {!ct.is_active && (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-500 text-xs">
                          Inactivo
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Inline actions */}
                  {canWrite && (
                    <div className="mt-2 flex gap-1 border-t pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={(e) => { e.stopPropagation(); openEditCt(ct) }}
                      >
                        <Pencil className="mr-1 h-3 w-3" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (ct.is_active && ct.phase_count > 0) {
                            setDeactivatingCt(ct)
                          } else {
                            handleToggleCt(ct)
                          }
                        }}
                      >
                        <Power className="mr-1 h-3 w-3" />
                        {ct.is_active ? 'Desactivar' : 'Reactivar'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Detail panel — Phases */}
      <div className="flex-1 min-w-0">
        {selectedCt ? (
          <PhasesPanel
            cropType={selectedCt}
            phases={selectedPhases}
            canWrite={canWrite}
          />
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Sprout className="mb-3 h-10 w-10" />
              <p className="text-sm">Selecciona un tipo de cultivo para ver sus fases.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Crop Type Dialog */}
      <CropTypeDialog
        open={ctDialogOpen}
        onOpenChange={(o) => { if (!o) { setCtDialogOpen(false); setEditingCt(null) } else setCtDialogOpen(true) }}
        cropType={editingCt}
        onSuccess={(newId) => {
          setCtDialogOpen(false)
          setEditingCt(null)
          if (newId) setSelectedId(newId)
          router.refresh()
        }}
      />

      {/* Deactivate warning */}
      <AlertDialog open={!!deactivatingCt} onOpenChange={(o) => !o && setDeactivatingCt(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar tipo de cultivo</AlertDialogTitle>
            <AlertDialogDescription>
              Este tipo de cultivo tiene {deactivatingCt?.phase_count ?? 0} fases configuradas. Desactivarlo impedirá crear nuevas órdenes con sus cultivares. ¿Continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deactivatingCt) handleToggleCt(deactivatingCt); setDeactivatingCt(null) }}>
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ================================================================
// CROP TYPE DIALOG
// ================================================================

function CropTypeDialog({
  open,
  onOpenChange,
  cropType,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  cropType: CropTypeRow | null
  onSuccess: (newId?: string) => void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const isEdit = !!cropType

  const form = useForm<CropTypeInput>({
    resolver: zodResolver(cropTypeSchema),
    values: {
      code: cropType?.code ?? '',
      name: cropType?.name ?? '',
      scientific_name: cropType?.scientific_name ?? '',
      category: (cropType?.category as CropTypeInput['category']) ?? 'annual',
      regulatory_framework: cropType?.regulatory_framework ?? '',
      icon: cropType?.icon ?? '',
    },
  })

  async function onSubmit(values: CropTypeInput) {
    setIsLoading(true)
    const supabase = createClient()

    const payload = {
      code: values.code,
      name: values.name,
      scientific_name: values.scientific_name || null,
      category: values.category,
      regulatory_framework: values.regulatory_framework || null,
      icon: values.icon || null,
    }

    try {
      if (isEdit) {
        const { error } = await supabase
          .from('crop_types')
          .update(payload)
          .eq('id', cropType.id)
        if (error) {
          if (error.message?.includes('idx_crop_types_code_company')) {
            form.setError('code', { message: 'Ya existe un tipo de cultivo con este código' })
          } else {
            toast.error('Error al actualizar el tipo de cultivo.')
          }
          return
        }
        toast.success('Tipo de cultivo actualizado.')
        onSuccess()
      } else {
        const { data, error } = await supabase
          .from('crop_types')
          .insert(payload)
          .select('id')
          .single()
        if (error) {
          if (error.message?.includes('idx_crop_types_code_company')) {
            form.setError('code', { message: 'Ya existe un tipo de cultivo con este código' })
          } else {
            toast.error('Error al crear el tipo de cultivo.')
          }
          return
        }
        toast.success('Tipo de cultivo creado.')
        onSuccess(data.id)
      }
    } catch {
      toast.error('Error inesperado. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isLoading) onOpenChange(o) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar tipo de cultivo' : 'Nuevo tipo de cultivo'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Modifica los datos del tipo de cultivo.' : 'Crea un nuevo tipo de cultivo.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input placeholder="cannabis" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Cannabis Medicinal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="scientific_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre científico (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Cannabis sativa L." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <FormControl>
                      <select
                        value={field.value}
                        onChange={field.onChange}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="annual">Anual</option>
                        <option value="perennial">Perenne</option>
                        <option value="biennial">Bienal</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icono (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="🌿" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="regulatory_framework"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marco regulatorio (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Resolución 227/2022" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ================================================================
// PHASES PANEL
// ================================================================

function PhasesPanel({
  cropType,
  phases,
  canWrite,
}: {
  cropType: CropTypeRow
  phases: PhaseRow[]
  canWrite: boolean
}) {
  const router = useRouter()
  const [phaseDialogOpen, setPhaseDialogOpen] = useState(false)
  const [editingPhase, setEditingPhase] = useState<PhaseRow | null>(null)
  const [deletingPhase, setDeletingPhase] = useState<PhaseRow | null>(null)

  function openNewPhase() {
    setEditingPhase(null)
    setPhaseDialogOpen(true)
  }

  function openEditPhase(phase: PhaseRow) {
    setEditingPhase(phase)
    setPhaseDialogOpen(true)
  }

  async function handleDelete(phase: PhaseRow) {
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

    // Swap sort_order values
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase
        .from('production_phases')
        .update({ sort_order: b.sort_order })
        .eq('id', a.id),
      supabase
        .from('production_phases')
        .update({ sort_order: a.sort_order })
        .eq('id', b.id),
    ])

    if (e1 || e2) {
      toast.error('Error al reordenar.')
      return
    }
    router.refresh()
  }

  // Get phase name by ID (for depends_on display)
  function getPhaseName(id: string | null) {
    if (!id) return null
    return phases.find((p) => p.id === id)?.name ?? null
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-base">
            {cropType.icon && <span className="mr-1.5">{cropType.icon}</span>}
            Fases de {cropType.name}
          </CardTitle>
          {cropType.scientific_name && (
            <p className="text-xs text-muted-foreground italic mt-0.5">{cropType.scientific_name}</p>
          )}
        </div>
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

                  {/* Duration + dependency */}
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

                  {/* Flag badges */}
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
            <AlertDialogAction onClick={() => deletingPhase && handleDelete(deletingPhase)}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

// ================================================================
// PHASE DIALOG
// ================================================================

function PhaseDialog({
  open,
  onOpenChange,
  phase,
  cropTypeId,
  allPhases,
  nextSortOrder,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  phase: PhaseRow | null
  cropTypeId: string
  allPhases: PhaseRow[]
  nextSortOrder: number
  onSuccess: () => void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const isEdit = !!phase

  const form = useForm<ProductionPhaseInput>({
    resolver: zodResolver(productionPhaseSchema),
    values: {
      code: phase?.code ?? '',
      name: phase?.name ?? '',
      default_duration_days: phase?.default_duration_days ?? null,
      is_transformation: phase?.is_transformation ?? false,
      is_destructive: phase?.is_destructive ?? false,
      requires_zone_change: phase?.requires_zone_change ?? false,
      can_skip: phase?.can_skip ?? false,
      can_be_entry_point: phase?.can_be_entry_point ?? false,
      can_be_exit_point: phase?.can_be_exit_point ?? false,
      depends_on_phase_id: phase?.depends_on_phase_id ?? null,
      icon: phase?.icon ?? '',
      color: phase?.color ?? '',
    },
  })

  const watchTransformation = form.watch('is_transformation')

  // Auto-clear is_destructive when is_transformation is unchecked
  if (!watchTransformation && form.getValues('is_destructive')) {
    form.setValue('is_destructive', false)
  }

  // Build depends_on options (exclude self, validate no cycles)
  const dependsOnOptions = useMemo(() => {
    const opts = allPhases.filter((p) => !isEdit || p.id !== phase.id)
    // Simple cycle check: exclude phases that depend on the current phase (direct)
    if (isEdit) {
      const dependents = new Set<string>()
      function findDependents(id: string) {
        for (const p of allPhases) {
          if (p.depends_on_phase_id === id && !dependents.has(p.id)) {
            dependents.add(p.id)
            findDependents(p.id)
          }
        }
      }
      findDependents(phase.id)
      return opts.filter((p) => !dependents.has(p.id))
    }
    return opts
  }, [allPhases, phase, isEdit])

  async function onSubmit(values: ProductionPhaseInput) {
    setIsLoading(true)
    const supabase = createClient()

    const payload = {
      crop_type_id: cropTypeId,
      code: values.code,
      name: values.name,
      default_duration_days: values.default_duration_days,
      is_transformation: values.is_transformation,
      is_destructive: values.is_transformation ? values.is_destructive : false,
      requires_zone_change: values.requires_zone_change,
      can_skip: values.can_skip,
      can_be_entry_point: values.can_be_entry_point,
      can_be_exit_point: values.can_be_exit_point,
      depends_on_phase_id: values.depends_on_phase_id,
      icon: values.icon || null,
      color: values.color || null,
    }

    try {
      if (isEdit) {
        const { error } = await supabase
          .from('production_phases')
          .update(payload)
          .eq('id', phase.id)
        if (error) {
          if (error.message?.includes('idx_production_phases_code_crop')) {
            form.setError('code', { message: 'Ya existe una fase con este código' })
          } else {
            toast.error('Error al actualizar la fase.')
          }
          return
        }
        toast.success('Fase actualizada.')
      } else {
        const { error } = await supabase
          .from('production_phases')
          .insert({ ...payload, sort_order: nextSortOrder })
        if (error) {
          if (error.message?.includes('idx_production_phases_code_crop')) {
            form.setError('code', { message: 'Ya existe una fase con este código' })
          } else {
            toast.error('Error al crear la fase.')
          }
          return
        }
        toast.success('Fase creada.')
      }
      onSuccess()
    } catch {
      toast.error('Error inesperado. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isLoading) onOpenChange(o) }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar fase' : 'Nueva fase'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Modifica los datos de la fase de producción.' : 'Agrega una nueva fase al ciclo productivo.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input placeholder="germination" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Germinación" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="default_duration_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duración (días, opt)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Indefinida"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const v = e.target.value
                          field.onChange(v ? parseInt(v, 10) || null : null)
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="depends_on_phase_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bifurca desde (opt)</FormLabel>
                    <FormControl>
                      <select
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">— Secuencia lineal —</option>
                        {dependsOnOptions.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.code})
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icono (opt)</FormLabel>
                    <FormControl>
                      <Input placeholder="🌱" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color (opt)</FormLabel>
                    <FormControl>
                      <Input type="color" {...field} value={field.value || '#000000'} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Flags */}
            <div className="space-y-3 rounded-md border p-3">
              <p className="text-sm font-medium">Flags</p>
              <FormField
                control={form.control}
                name="is_transformation"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-2 space-y-0">
                    <FormLabel className="font-normal text-sm">Es transformación</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_destructive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-2 space-y-0">
                    <FormLabel className={`font-normal text-sm ${!watchTransformation ? 'opacity-50' : ''}`}>
                      Es destructiva
                    </FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!watchTransformation}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="requires_zone_change"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-2 space-y-0">
                    <FormLabel className="font-normal text-sm">Requiere cambio de zona</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="can_skip"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-2 space-y-0">
                    <FormLabel className="font-normal text-sm">Se puede saltar (opcional)</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="can_be_entry_point"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-2 space-y-0">
                    <FormLabel className="font-normal text-sm">Punto de entrada</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="can_be_exit_point"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-2 space-y-0">
                    <FormLabel className="font-normal text-sm">Punto de salida</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
