'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { cultivarSchema, type CultivarInput } from '@/schemas/cultivars'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Plus,
  Pencil,
  Power,
  Copy,
  ChevronDown,
  ChevronRight,
  Trash2,
  Leaf,
  AlertTriangle,
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

type CropType = {
  id: string
  code: string
  name: string
  category: string
  is_active: boolean
}

type CultivarRow = {
  id: string
  crop_type_id: string
  code: string
  name: string
  breeder: string | null
  genetics: string | null
  default_cycle_days: number | null
  phase_durations: Record<string, number> | null
  expected_yield_per_plant_g: number | null
  expected_dry_ratio: number | null
  target_profile: Record<string, string> | null
  quality_grade: string | null
  optimal_conditions: Record<string, { min?: number | null; max?: number | null; unit?: string }> | null
  density_plants_per_m2: number | null
  notes: string | null
  is_active: boolean
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
}

type FlowRow = {
  id: string
  cultivar_id: string
  phase_id: string
  direction: 'input' | 'output'
  product_role: 'primary' | 'secondary' | 'byproduct' | 'waste'
  product_id: string | null
  product_category_id: string | null
  expected_yield_pct: number | null
  expected_quantity_per_input: number | null
  unit_id: string | null
  is_required: boolean
  sort_order: number
  notes: string | null
}

type Category = { id: string; code: string; name: string }
type Unit = { id: string; code: string; name: string; dimension: string }

type Props = {
  cropTypes: CropType[]
  cultivars: CultivarRow[]
  phases: PhaseRow[]
  flows: FlowRow[]
  categories: Category[]
  units: Unit[]
  canWrite: boolean
}

// ---------- Constants ----------

const roleLabels: Record<string, string> = {
  primary: 'Primario',
  secondary: 'Secundario',
  byproduct: 'Subproducto',
  waste: 'Desecho',
}

const roleBadgeStyles: Record<string, string> = {
  primary: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  secondary: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  byproduct: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  waste: 'bg-gray-100 text-gray-500 dark:bg-gray-800/30 dark:text-gray-400',
}

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring'

// ================================================================
// MAIN COMPONENT
// ================================================================

export function CultivarsClient({
  cropTypes,
  cultivars,
  phases,
  flows,
  categories,
  units,
  canWrite,
}: Props) {
  const router = useRouter()
  const [selectedCropTypeId, setSelectedCropTypeId] = useState<string>(
    cropTypes.length > 0 ? cropTypes[0].id : ''
  )
  const [selectedCultivarId, setSelectedCultivarId] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCultivar, setEditingCultivar] = useState<CultivarRow | null>(null)
  const [deactivating, setDeactivating] = useState<CultivarRow | null>(null)

  const filteredCultivars = useMemo(() => {
    let list = cultivars.filter((c) => c.crop_type_id === selectedCropTypeId)
    if (!showInactive) list = list.filter((c) => c.is_active)
    return list
  }, [cultivars, selectedCropTypeId, showInactive])

  const selectedCultivar = cultivars.find((c) => c.id === selectedCultivarId) ?? null
  const cropTypePhases = useMemo(
    () => phases.filter((p) => p.crop_type_id === selectedCropTypeId).sort((a, b) => a.sort_order - b.sort_order),
    [phases, selectedCropTypeId]
  )
  const cultivarFlows = useMemo(
    () => flows.filter((f) => f.cultivar_id === selectedCultivarId),
    [flows, selectedCultivarId]
  )
  // Count flows per cultivar for badges
  const flowCountsByCultivar = useMemo(() => {
    const map: Record<string, number> = {}
    for (const f of flows) {
      map[f.cultivar_id] = (map[f.cultivar_id] || 0) + 1
    }
    return map
  }, [flows])
  // Count phases that have flows for a given cultivar
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
    setSelectedCultivarId(newCv.id)
    // Open edit dialog for the duplicate
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Crop type filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Tipo de cultivo:</label>
          <select
            value={selectedCropTypeId}
            onChange={(e) => {
              setSelectedCropTypeId(e.target.value)
              setSelectedCultivarId(null)
            }}
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
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Master panel — cultivar list */}
          <div className="w-full space-y-4 lg:w-72 lg:shrink-0">
            <div className="flex items-center justify-end">
              {canWrite && (
                <Button size="sm" onClick={openNew}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Nuevo cultivar
                </Button>
              )}
            </div>

            {filteredCultivars.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Leaf className="mb-3 h-10 w-10" />
                  <p className="text-sm text-center">
                    No hay cultivares. Crea el primero.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredCultivars.map((cv) => {
                  const pfCount = phaseFlowCount(cv.id)
                  const hasFlows = (flowCountsByCultivar[cv.id] || 0) > 0
                  return (
                    <Card
                      key={cv.id}
                      className={`cursor-pointer transition-colors ${
                        cv.id === selectedCultivarId
                          ? 'border-primary ring-1 ring-primary'
                          : 'hover:border-muted-foreground/30'
                      } ${!cv.is_active ? 'opacity-50' : ''}`}
                      onClick={() => setSelectedCultivarId(cv.id)}
                    >
                      <CardContent className="p-3">
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
          </div>

          {/* Detail panel */}
          <div className="flex-1 min-w-0">
            {selectedCultivar ? (
              <CultivarDetail
                cultivar={selectedCultivar}
                phases={cropTypePhases}
                flows={cultivarFlows}
                allCultivars={filteredCultivars}
                categories={categories}
                units={units}
                canWrite={canWrite}
              />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Leaf className="mb-3 h-10 w-10" />
                  <p className="text-sm">Selecciona un cultivar para ver sus detalles.</p>
                </CardContent>
              </Card>
            )}
          </div>
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
          if (newId) setSelectedCultivarId(newId)
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
    </div>
  )
}

// ================================================================
// CULTIVAR DIALOG
// ================================================================

function CultivarDialog({
  open,
  onOpenChange,
  cultivar,
  cropTypeId,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  cultivar: CultivarRow | null
  cropTypeId: string
  onSuccess: (newId?: string) => void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const isEdit = !!cultivar

  const form = useForm<CultivarInput>({
    resolver: zodResolver(cultivarSchema),
    values: {
      crop_type_id: cultivar?.crop_type_id ?? cropTypeId,
      code: cultivar?.code ?? '',
      name: cultivar?.name ?? '',
      breeder: cultivar?.breeder ?? '',
      genetics: cultivar?.genetics ?? '',
      default_cycle_days: cultivar?.default_cycle_days ?? null,
      expected_yield_per_plant_g: cultivar?.expected_yield_per_plant_g ?? null,
      expected_dry_ratio: cultivar?.expected_dry_ratio ?? null,
      quality_grade: cultivar?.quality_grade ?? '',
      density_plants_per_m2: cultivar?.density_plants_per_m2 ?? null,
      notes: cultivar?.notes ?? '',
    },
  })

  async function onSubmit(values: CultivarInput) {
    setIsLoading(true)
    const supabase = createClient()

    const payload = {
      crop_type_id: values.crop_type_id,
      code: values.code,
      name: values.name,
      breeder: values.breeder || null,
      genetics: values.genetics || null,
      default_cycle_days: values.default_cycle_days,
      expected_yield_per_plant_g: values.expected_yield_per_plant_g,
      expected_dry_ratio: values.expected_dry_ratio,
      quality_grade: values.quality_grade || null,
      density_plants_per_m2: values.density_plants_per_m2,
      notes: values.notes || null,
    }

    try {
      if (isEdit) {
        const { error } = await supabase
          .from('cultivars')
          .update(payload)
          .eq('id', cultivar.id)
        if (error) {
          if (error.message?.includes('idx_cultivars_code')) {
            form.setError('code', { message: 'Ya existe un cultivar con este código' })
          } else {
            toast.error('Error al actualizar el cultivar.')
          }
          return
        }
        toast.success('Cultivar actualizado.')
        onSuccess()
      } else {
        const { data, error } = await supabase
          .from('cultivars')
          .insert(payload)
          .select('id')
          .single()
        if (error) {
          if (error.message?.includes('idx_cultivars_code')) {
            form.setError('code', { message: 'Ya existe un cultivar con este código' })
          } else {
            toast.error('Error al crear el cultivar.')
          }
          return
        }
        toast.success('Cultivar creado.')
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar cultivar' : 'Nuevo cultivar'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Modifica los datos del cultivar.' : 'Crea un nuevo cultivar.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem>
                  <FormLabel>Código</FormLabel>
                  <FormControl><Input placeholder="GELATO-41" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl><Input placeholder="Gelato #41" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="breeder" render={({ field }) => (
                <FormItem>
                  <FormLabel>Breeder (opt)</FormLabel>
                  <FormControl><Input placeholder="Seed Junky Genetics" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="genetics" render={({ field }) => (
                <FormItem>
                  <FormLabel>Genetics (opt)</FormLabel>
                  <FormControl><Input placeholder="Sunset Sherbet × Thin Mint GSC" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="default_cycle_days" render={({ field }) => (
                <FormItem>
                  <FormLabel>Ciclo (días)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      placeholder="—"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) || null : null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="expected_yield_per_plant_g" render={({ field }) => (
                <FormItem>
                  <FormLabel>Yield/planta (g)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="—"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) || null : null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="expected_dry_ratio" render={({ field }) => (
                <FormItem>
                  <FormLabel>Ratio seco</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      placeholder="0.25"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) || null : null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="quality_grade" render={({ field }) => (
                <FormItem>
                  <FormLabel>Quality grade (opt)</FormLabel>
                  <FormControl><Input placeholder="Premium Indoor" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="density_plants_per_m2" render={({ field }) => (
                <FormItem>
                  <FormLabel>Densidad (pl/m2)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="—"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) || null : null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notas (opt)</FormLabel>
                <FormControl>
                  <textarea
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Notas adicionales..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

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
// CULTIVAR DETAIL
// ================================================================

function CultivarDetail({
  cultivar,
  phases,
  flows,
  allCultivars,
  categories,
  units,
  canWrite,
}: {
  cultivar: CultivarRow
  phases: PhaseRow[]
  flows: FlowRow[]
  allCultivars: CultivarRow[]
  categories: Category[]
  units: Unit[]
  canWrite: boolean
}) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    general: true,
    durations: false,
    profile: false,
    conditions: false,
    flows: true,
  })

  function toggle(key: string) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="space-y-3">
      <CollapsibleSection title="Datos Generales" sectionKey="general" open={openSections.general} onToggle={toggle}>
        <GeneralSection cultivar={cultivar} />
      </CollapsibleSection>

      <CollapsibleSection title="Duración por Fase" sectionKey="durations" open={openSections.durations} onToggle={toggle}>
        <PhaseDurationsSection cultivar={cultivar} phases={phases} canWrite={canWrite} />
      </CollapsibleSection>

      <CollapsibleSection title="Perfil Objetivo" sectionKey="profile" open={openSections.profile} onToggle={toggle}>
        <TargetProfileSection cultivar={cultivar} canWrite={canWrite} />
      </CollapsibleSection>

      <CollapsibleSection title="Condiciones Óptimas" sectionKey="conditions" open={openSections.conditions} onToggle={toggle}>
        <OptimalConditionsSection cultivar={cultivar} canWrite={canWrite} />
      </CollapsibleSection>

      <CollapsibleSection title="Flujos de Producción por Fase" sectionKey="flows" open={openSections.flows} onToggle={toggle}>
        <PhaseFlowsSection
          cultivar={cultivar}
          phases={phases}
          flows={flows}
          allCultivars={allCultivars}
          categories={categories}
          units={units}
          canWrite={canWrite}
        />
      </CollapsibleSection>
    </div>
  )
}

// ================================================================
// COLLAPSIBLE SECTION
// ================================================================

function CollapsibleSection({
  title,
  sectionKey,
  open,
  onToggle,
  children,
}: {
  title: string
  sectionKey: string
  open: boolean
  onToggle: (key: string) => void
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader
        className="cursor-pointer flex flex-row items-center justify-between space-y-0 py-3 px-4"
        onClick={() => onToggle(sectionKey)}
      >
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </CardHeader>
      {open && <CardContent className="px-4 pb-4 pt-0">{children}</CardContent>}
    </Card>
  )
}

// ================================================================
// SECTION 1: GENERAL
// ================================================================

function GeneralSection({ cultivar }: { cultivar: CultivarRow }) {
  const fields: [string, string | number | null][] = [
    ['Código', cultivar.code],
    ['Nombre', cultivar.name],
    ['Breeder', cultivar.breeder],
    ['Genetics', cultivar.genetics],
    ['Ciclo total', cultivar.default_cycle_days ? `${cultivar.default_cycle_days} días` : null],
    ['Yield/planta', cultivar.expected_yield_per_plant_g ? `${cultivar.expected_yield_per_plant_g} g` : null],
    ['Ratio seco', cultivar.expected_dry_ratio != null ? `${cultivar.expected_dry_ratio}` : null],
    ['Quality grade', cultivar.quality_grade],
    ['Densidad', cultivar.density_plants_per_m2 ? `${cultivar.density_plants_per_m2} pl/m²` : null],
  ]

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
      {fields.map(([label, value]) => (
        <div key={label}>
          <span className="text-muted-foreground">{label}:</span>{' '}
          <span className="font-medium">{value || '—'}</span>
        </div>
      ))}
      {cultivar.notes && (
        <div className="col-span-full mt-2">
          <span className="text-muted-foreground">Notas:</span>{' '}
          <span>{cultivar.notes}</span>
        </div>
      )}
    </div>
  )
}

// ================================================================
// SECTION 2: PHASE DURATIONS
// ================================================================

function PhaseDurationsSection({
  cultivar,
  phases,
  canWrite,
}: {
  cultivar: CultivarRow
  phases: PhaseRow[]
  canWrite: boolean
}) {
  const router = useRouter()
  const [durations, setDurations] = useState<Record<string, number | null>>(
    () => {
      const d: Record<string, number | null> = {}
      for (const p of phases) {
        d[p.id] = cultivar.phase_durations?.[p.id] ?? null
      }
      return d
    }
  )
  const [saving, setSaving] = useState(false)

  const total = phases.reduce((sum, p) => {
    const val = durations[p.id] ?? p.default_duration_days
    return sum + (val ?? 0)
  }, 0)

  async function save() {
    setSaving(true)
    const supabase = createClient()
    const clean: Record<string, number> = {}
    for (const [key, val] of Object.entries(durations)) {
      if (val != null) clean[key] = val
    }
    const { error } = await supabase
      .from('cultivars')
      .update({ phase_durations: clean, default_cycle_days: total || null })
      .eq('id', cultivar.id)
    setSaving(false)
    if (error) {
      toast.error('Error al guardar duraciones.')
      return
    }
    toast.success('Duraciones guardadas.')
    router.refresh()
  }

  if (phases.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay fases configuradas para este tipo de cultivo.</p>
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 font-medium">Fase</th>
              <th className="pb-2 font-medium">Default (días)</th>
              <th className="pb-2 font-medium">Cultivar (días)</th>
            </tr>
          </thead>
          <tbody>
            {phases.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="py-2">{p.name}</td>
                <td className="py-2 text-muted-foreground">
                  {p.default_duration_days ?? 'Indefinida'}
                </td>
                <td className="py-2">
                  {canWrite ? (
                    <Input
                      type="number"
                      min="1"
                      className="h-8 w-24"
                      placeholder={p.default_duration_days?.toString() ?? '—'}
                      value={durations[p.id] ?? ''}
                      onChange={(e) =>
                        setDurations((prev) => ({
                          ...prev,
                          [p.id]: e.target.value ? parseInt(e.target.value, 10) || null : null,
                        }))
                      }
                    />
                  ) : (
                    <span>{durations[p.id] ?? '—'}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-medium">
              <td className="pt-2">Total</td>
              <td className="pt-2" />
              <td className="pt-2">{total > 0 ? `${total} días` : '—'}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {canWrite && (
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar duraciones'}
        </Button>
      )}
    </div>
  )
}

// ================================================================
// SECTION 3: TARGET PROFILE
// ================================================================

function TargetProfileSection({
  cultivar,
  canWrite,
}: {
  cultivar: CultivarRow
  canWrite: boolean
}) {
  const router = useRouter()
  const [entries, setEntries] = useState<{ key: string; value: string }[]>(
    () => {
      const tp = cultivar.target_profile
      if (!tp || Object.keys(tp).length === 0) return []
      return Object.entries(tp).map(([key, value]) => ({ key, value }))
    }
  )
  const [saving, setSaving] = useState(false)

  function addEntry() {
    setEntries((prev) => [...prev, { key: '', value: '' }])
  }

  function removeEntry(idx: number) {
    setEntries((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateEntry(idx: number, field: 'key' | 'value', val: string) {
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, [field]: val } : e)))
  }

  async function save() {
    setSaving(true)
    const supabase = createClient()
    const profile: Record<string, string> = {}
    for (const e of entries) {
      if (e.key.trim()) profile[e.key.trim()] = e.value
    }
    const { error } = await supabase
      .from('cultivars')
      .update({ target_profile: profile })
      .eq('id', cultivar.id)
    setSaving(false)
    if (error) {
      toast.error('Error al guardar perfil.')
      return
    }
    toast.success('Perfil guardado.')
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin parámetros configurados.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                className="h-8 w-40"
                placeholder="Clave (ej: THC)"
                value={entry.key}
                onChange={(e) => updateEntry(idx, 'key', e.target.value)}
                disabled={!canWrite}
              />
              <Input
                className="h-8 flex-1"
                placeholder="Valor (ej: 20-25%)"
                value={entry.value}
                onChange={(e) => updateEntry(idx, 'value', e.target.value)}
                disabled={!canWrite}
              />
              {canWrite && (
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeEntry(idx)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
      {canWrite && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addEntry}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Agregar parámetro
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar perfil'}
          </Button>
        </div>
      )}
    </div>
  )
}

// ================================================================
// SECTION 4: OPTIMAL CONDITIONS
// ================================================================

function OptimalConditionsSection({
  cultivar,
  canWrite,
}: {
  cultivar: CultivarRow
  canWrite: boolean
}) {
  const router = useRouter()
  type ConditionEntry = { key: string; min: string; max: string; unit: string }
  const [entries, setEntries] = useState<ConditionEntry[]>(
    () => {
      const oc = cultivar.optimal_conditions
      if (!oc || Object.keys(oc).length === 0) return []
      return Object.entries(oc).map(([key, val]) => ({
        key,
        min: val.min != null ? String(val.min) : '',
        max: val.max != null ? String(val.max) : '',
        unit: val.unit ?? '',
      }))
    }
  )
  const [saving, setSaving] = useState(false)

  function addEntry() {
    setEntries((prev) => [...prev, { key: '', min: '', max: '', unit: '' }])
  }

  function removeEntry(idx: number) {
    setEntries((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateEntry(idx: number, field: keyof ConditionEntry, val: string) {
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, [field]: val } : e)))
  }

  async function save() {
    setSaving(true)
    const supabase = createClient()
    const conditions: Record<string, { min: number | null; max: number | null; unit: string }> = {}
    for (const e of entries) {
      if (e.key.trim()) {
        conditions[e.key.trim()] = {
          min: e.min ? parseFloat(e.min) : null,
          max: e.max ? parseFloat(e.max) : null,
          unit: e.unit,
        }
      }
    }
    const { error } = await supabase
      .from('cultivars')
      .update({ optimal_conditions: conditions })
      .eq('id', cultivar.id)
    setSaving(false)
    if (error) {
      toast.error('Error al guardar condiciones.')
      return
    }
    toast.success('Condiciones guardadas.')
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin condiciones configuradas.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, idx) => (
            <div key={idx} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <Input
                className="h-8 w-32"
                placeholder="Clave (ej: Temp)"
                value={entry.key}
                onChange={(e) => updateEntry(idx, 'key', e.target.value)}
                disabled={!canWrite}
              />
              <Input
                type="number"
                className="h-8 w-20"
                placeholder="Min"
                value={entry.min}
                onChange={(e) => updateEntry(idx, 'min', e.target.value)}
                disabled={!canWrite}
              />
              <span className="text-muted-foreground text-sm">–</span>
              <Input
                type="number"
                className="h-8 w-20"
                placeholder="Max"
                value={entry.max}
                onChange={(e) => updateEntry(idx, 'max', e.target.value)}
                disabled={!canWrite}
              />
              <Input
                className="h-8 w-20"
                placeholder="Unidad"
                value={entry.unit}
                onChange={(e) => updateEntry(idx, 'unit', e.target.value)}
                disabled={!canWrite}
              />
              {canWrite && (
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeEntry(idx)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
      {canWrite && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addEntry}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Agregar condición
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar condiciones'}
          </Button>
        </div>
      )}
    </div>
  )
}

// ================================================================
// SECTION 5: PHASE PRODUCT FLOWS
// ================================================================

function PhaseFlowsSection({
  cultivar,
  phases,
  flows,
  allCultivars,
  categories,
  units,
  canWrite,
}: {
  cultivar: CultivarRow
  phases: PhaseRow[]
  flows: FlowRow[]
  allCultivars: CultivarRow[]
  categories: Category[]
  units: Unit[]
  canWrite: boolean
}) {
  const router = useRouter()
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>(
    () => {
      const m: Record<string, boolean> = {}
      for (const p of phases) m[p.id] = true
      return m
    }
  )

  function togglePhase(id: string) {
    setExpandedPhases((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // Group flows by phase
  const flowsByPhase = useMemo(() => {
    const map: Record<string, FlowRow[]> = {}
    for (const f of flows) {
      if (!map[f.phase_id]) map[f.phase_id] = []
      map[f.phase_id].push(f)
    }
    return map
  }, [flows])

  if (phases.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay fases configuradas para este tipo de cultivo.</p>
  }

  return (
    <div className="space-y-3">
      {canWrite && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setCopyDialogOpen(true)}>
            <Copy className="mr-1.5 h-3.5 w-3.5" /> Copiar flujos de otro cultivar
          </Button>
        </div>
      )}

      {flows.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Configura los flujos de producción para cada fase.
        </p>
      )}

      {phases.map((phase) => {
        const phaseFlows = flowsByPhase[phase.id] ?? []
        const inputs = phaseFlows.filter((f) => f.direction === 'input')
        const outputs = phaseFlows.filter((f) => f.direction === 'output')
        const isExpanded = expandedPhases[phase.id]

        return (
          <div key={phase.id} className="rounded-md border">
            <button
              type="button"
              className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50"
              onClick={() => togglePhase(phase.id)}
            >
              <div className="flex items-center gap-2">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span className="font-medium text-sm">{phase.name}</span>
                <span className="text-xs text-muted-foreground">({phase.code})</span>
                {phase.is_transformation && (
                  <Badge variant="outline" className="text-xs">Transforma</Badge>
                )}
                {phase.is_destructive && (
                  <Badge variant="outline" className="text-xs text-red-600 border-red-200">Destructiva</Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {phaseFlows.length} flow{phaseFlows.length !== 1 ? 's' : ''}
              </span>
            </button>

            {isExpanded && (
              <div className="border-t px-3 pb-3 space-y-3">
                {/* Inputs */}
                <FlowSubSection
                  label="Inputs"
                  direction="input"
                  flows={inputs}
                  cultivarId={cultivar.id}
                  phaseId={phase.id}
                  categories={categories}
                  units={units}
                  canWrite={canWrite}
                />

                {/* Outputs */}
                <FlowSubSection
                  label="Outputs"
                  direction="output"
                  flows={outputs}
                  cultivarId={cultivar.id}
                  phaseId={phase.id}
                  categories={categories}
                  units={units}
                  canWrite={canWrite}
                />
              </div>
            )}
          </div>
        )
      })}

      {/* Copy flows dialog */}
      <CopyFlowsDialog
        open={copyDialogOpen}
        onOpenChange={setCopyDialogOpen}
        cultivar={cultivar}
        allCultivars={allCultivars}
        existingFlowCount={flows.length}
        onSuccess={() => {
          setCopyDialogOpen(false)
          router.refresh()
        }}
      />
    </div>
  )
}

// ================================================================
// FLOW SUB-SECTION (inputs or outputs for a phase)
// ================================================================

function FlowSubSection({
  label,
  direction,
  flows,
  cultivarId,
  phaseId,
  categories,
  units,
  canWrite,
}: {
  label: string
  direction: 'input' | 'output'
  flows: FlowRow[]
  cultivarId: string
  phaseId: string
  categories: Category[]
  units: Unit[]
  canWrite: boolean
}) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)

  async function handleAdd() {
    setAdding(true)
    const supabase = createClient()
    const nextSort = flows.length > 0 ? Math.max(...flows.map((f) => f.sort_order)) + 1 : 0
    const { error } = await supabase.from('phase_product_flows').insert({
      cultivar_id: cultivarId,
      phase_id: phaseId,
      direction,
      product_role: 'primary',
      is_required: true,
      sort_order: nextSort,
    })
    setAdding(false)
    if (error) {
      toast.error('Error al agregar flow.')
      return
    }
    router.refresh()
  }

  async function handleDelete(flowId: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('phase_product_flows')
      .delete()
      .eq('id', flowId)
    if (error) {
      toast.error('Error al eliminar flow.')
      return
    }
    router.refresh()
  }

  async function handleUpdateField(flowId: string, field: string, value: unknown) {
    const supabase = createClient()
    const { error } = await supabase
      .from('phase_product_flows')
      .update({ [field]: value })
      .eq('id', flowId)
    if (error) {
      toast.error('Error al actualizar.')
      return
    }
    router.refresh()
  }

  return (
    <div className="pt-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        {canWrite && (
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleAdd} disabled={adding}>
            <Plus className="mr-1 h-3 w-3" /> Agregar {direction === 'input' ? 'input' : 'output'}
          </Button>
        )}
      </div>

      {flows.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Sin {label.toLowerCase()}.</p>
      ) : (
        <div className="space-y-2">
          {flows.map((flow) => {
            const hasMissing = !flow.product_id && !flow.product_category_id
            return (
              <div
                key={flow.id}
                className={`flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm ${
                  hasMissing ? 'border-yellow-300 bg-yellow-50/50 dark:border-yellow-700 dark:bg-yellow-900/10' : ''
                }`}
              >
                {/* Role */}
                {canWrite ? (
                  <select
                    className={selectClass + ' w-28 h-8 text-xs'}
                    value={flow.product_role}
                    onChange={(e) => handleUpdateField(flow.id, 'product_role', e.target.value)}
                  >
                    <option value="primary">Primario</option>
                    <option value="secondary">Secundario</option>
                    <option value="byproduct">Subproducto</option>
                    <option value="waste">Desecho</option>
                  </select>
                ) : (
                  <Badge variant="secondary" className={`text-xs ${roleBadgeStyles[flow.product_role] ?? ''}`}>
                    {roleLabels[flow.product_role] ?? flow.product_role}
                  </Badge>
                )}

                {/* Category select */}
                {canWrite ? (
                  <select
                    className={selectClass + ' w-40 h-8 text-xs'}
                    value={flow.product_category_id ?? ''}
                    onChange={(e) => {
                      const val = e.target.value || null
                      handleUpdateField(flow.id, 'product_category_id', val)
                      if (val) handleUpdateField(flow.id, 'product_id', null)
                    }}
                  >
                    <option value="">Categoría...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs">
                    {flow.product_category_id
                      ? categories.find((c) => c.id === flow.product_category_id)?.name ?? '—'
                      : '—'}
                  </span>
                )}

                {/* Yield % */}
                {canWrite ? (
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    className="h-8 w-20 text-xs"
                    placeholder="Yield %"
                    value={flow.expected_yield_pct ?? ''}
                    onBlur={(e) =>
                      handleUpdateField(
                        flow.id,
                        'expected_yield_pct',
                        e.target.value ? parseFloat(e.target.value) : null
                      )
                    }
                    defaultValue={flow.expected_yield_pct ?? ''}
                  />
                ) : (
                  flow.expected_yield_pct != null && (
                    <span className="text-xs">{flow.expected_yield_pct}%</span>
                  )
                )}

                {/* Qty per input */}
                {canWrite ? (
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className="h-8 w-20 text-xs"
                    placeholder="Cant/input"
                    value={flow.expected_quantity_per_input ?? ''}
                    onBlur={(e) =>
                      handleUpdateField(
                        flow.id,
                        'expected_quantity_per_input',
                        e.target.value ? parseFloat(e.target.value) : null
                      )
                    }
                    defaultValue={flow.expected_quantity_per_input ?? ''}
                  />
                ) : (
                  flow.expected_quantity_per_input != null && (
                    <span className="text-xs">{flow.expected_quantity_per_input}</span>
                  )
                )}

                {/* Unit */}
                {canWrite ? (
                  <select
                    className={selectClass + ' w-24 h-8 text-xs'}
                    value={flow.unit_id ?? ''}
                    onChange={(e) => handleUpdateField(flow.id, 'unit_id', e.target.value || null)}
                  >
                    <option value="">Unidad</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.code}
                      </option>
                    ))}
                  </select>
                ) : (
                  flow.unit_id && (
                    <span className="text-xs">
                      {units.find((u) => u.id === flow.unit_id)?.code ?? ''}
                    </span>
                  )
                )}

                {/* Required toggle */}
                {canWrite ? (
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={flow.is_required}
                      onCheckedChange={(v) => handleUpdateField(flow.id, 'is_required', v)}
                      className="scale-75"
                    />
                    <span className="text-xs text-muted-foreground">Req</span>
                  </div>
                ) : (
                  !flow.is_required && (
                    <Badge variant="outline" className="text-xs">Opcional</Badge>
                  )
                )}

                {/* Warning if missing product/category */}
                {hasMissing && (
                  <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 shrink-0" />
                )}

                {/* Delete */}
                {canWrite && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 ml-auto"
                    onClick={() => handleDelete(flow.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Products not available message */}
      {canWrite && flows.length > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          Los productos se configuran en Inventario &gt; Productos. Puedes usar categorías mientras tanto.
        </p>
      )}
    </div>
  )
}

// ================================================================
// COPY FLOWS DIALOG
// ================================================================

function CopyFlowsDialog({
  open,
  onOpenChange,
  cultivar,
  allCultivars,
  existingFlowCount,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  cultivar: CultivarRow
  allCultivars: CultivarRow[]
  existingFlowCount: number
  onSuccess: () => void
}) {
  const [sourceCultivarId, setSourceCultivarId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [confirmReplace, setConfirmReplace] = useState(false)

  const otherCultivars = allCultivars.filter((c) => c.id !== cultivar.id && c.is_active)

  async function doCopy() {
    if (!sourceCultivarId) return
    setIsLoading(true)
    const supabase = createClient()

    // Fetch source flows
    const { data: sourceFlows, error: fetchErr } = await supabase
      .from('phase_product_flows')
      .select('*')
      .eq('cultivar_id', sourceCultivarId)

    if (fetchErr || !sourceFlows) {
      toast.error('Error al obtener flujos del cultivar origen.')
      setIsLoading(false)
      return
    }

    if (sourceFlows.length === 0) {
      toast.error('El cultivar seleccionado no tiene flows configurados.')
      setIsLoading(false)
      return
    }

    // Delete existing flows
    if (existingFlowCount > 0) {
      const { error: delErr } = await supabase
        .from('phase_product_flows')
        .delete()
        .eq('cultivar_id', cultivar.id)
      if (delErr) {
        toast.error('Error al eliminar flows existentes.')
        setIsLoading(false)
        return
      }
    }

    // Insert copied flows
    const { error: insertErr } = await supabase.from('phase_product_flows').insert(
      sourceFlows.map((f) => ({
        cultivar_id: cultivar.id,
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

    setIsLoading(false)

    if (insertErr) {
      toast.error('Error al copiar flujos. Los flows anteriores se mantienen.')
      return
    }

    toast.success(`${sourceFlows.length} flows copiados exitosamente.`)
    onSuccess()
  }

  function handleConfirm() {
    if (existingFlowCount > 0 && !confirmReplace) {
      setConfirmReplace(true)
      return
    }
    doCopy()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!isLoading) {
          onOpenChange(o)
          if (!o) {
            setSourceCultivarId('')
            setConfirmReplace(false)
          }
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copiar flujos de otro cultivar</DialogTitle>
          <DialogDescription>
            Selecciona un cultivar del mismo tipo de cultivo para copiar sus flujos de producción.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <select
            className={selectClass}
            value={sourceCultivarId}
            onChange={(e) => {
              setSourceCultivarId(e.target.value)
              setConfirmReplace(false)
            }}
          >
            <option value="">Seleccionar cultivar...</option>
            {otherCultivars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>

          {confirmReplace && (
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              Esto eliminará los {existingFlowCount} flows existentes y los reemplazará con los del cultivar seleccionado. ¿Continuar?
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              setSourceCultivarId('')
              setConfirmReplace(false)
            }}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!sourceCultivarId || isLoading}
          >
            {isLoading
              ? 'Copiando...'
              : confirmReplace
                ? 'Confirmar reemplazo'
                : 'Copiar flujos'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
