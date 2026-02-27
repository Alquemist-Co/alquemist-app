'use client'

import { useState, useMemo } from 'react'
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

import { Button } from '@/components/ui/button'
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

// ---------- Types ----------

export type CropTypeRow = {
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

export type PhaseRow = {
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

// ---------- Constants ----------

export const categoryLabels: Record<string, string> = {
  annual: 'Anual',
  perennial: 'Perenne',
  biennial: 'Bienal',
}

export const categoryBadgeStyles: Record<string, string> = {
  annual: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  perennial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  biennial: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

// ================================================================
// CROP TYPE DIALOG
// ================================================================

export function CropTypeDialog({
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
// PHASE DIALOG
// ================================================================

export function PhaseDialog({
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
