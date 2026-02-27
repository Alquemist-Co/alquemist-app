'use client'

import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { cultivarSchema, type CultivarInput } from '@/schemas/cultivars'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

export type CropType = {
  id: string
  code: string
  name: string
  category: string
  is_active: boolean
}

export type CultivarRow = {
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

export type PhaseRow = {
  id: string
  crop_type_id: string
  code: string
  name: string
  sort_order: number
  default_duration_days: number | null
  is_transformation: boolean
  is_destructive: boolean
}

export type FlowRow = {
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

export type Category = { id: string; code: string; name: string }
export type Unit = { id: string; code: string; name: string; dimension: string }

// ---------- Constants ----------

export const roleLabels: Record<string, string> = {
  primary: 'Primario',
  secondary: 'Secundario',
  byproduct: 'Subproducto',
  waste: 'Desecho',
}

export const roleBadgeStyles: Record<string, string> = {
  primary: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  secondary: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  byproduct: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  waste: 'bg-gray-100 text-gray-500 dark:bg-gray-800/30 dark:text-gray-400',
}

export const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring'

// ================================================================
// CULTIVAR DIALOG
// ================================================================

export function CultivarDialog({
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
// COPY FLOWS DIALOG
// ================================================================

export type CultivarSummary = Pick<CultivarRow, 'id' | 'code' | 'name' | 'is_active'>

export function CopyFlowsDialog({
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
  allCultivars: CultivarSummary[]
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
