'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productionOrderSchema, type ProductionOrderInput } from '@/schemas/production-orders'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ArrowLeft, RefreshCw, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  type CultivarOption,
  type PhaseOption,
  type ProductOption,
  type UnitOption,
  type ZoneOption,
  type UserOption,
  selectClass,
  orderPriorityLabels,
  getEntryPhases,
  getExitPhases,
  buildPhaseChain,
} from './orders-shared'

type YieldPhase = {
  phase_id: string
  phase_name: string
  sort_order: number
  default_duration_days: number | null
  input_qty: number
  yield_pct: number
  output_qty: number
  output_product_id: string | null
}

type YieldResult = {
  phases: YieldPhase[]
  final_output_qty: number
  final_output_product_id: string | null
}

type ExistingOrder = {
  id: string
  cultivar_id: string
  entry_phase_id: string
  exit_phase_id: string
  initial_quantity: number
  initial_unit_id: string
  initial_product_id: string | null
  zone_id: string | null
  planned_start_date: string | null
  priority: 'low' | 'normal' | 'high' | 'urgent'
  assigned_to: string | null
  notes: string | null
  phases: {
    phase_id: string
    planned_duration_days: number | null
    zone_id: string | null
  }[]
}

type Props = {
  cultivars: CultivarOption[]
  phases: PhaseOption[]
  products: ProductOption[]
  units: UnitOption[]
  zones: ZoneOption[]
  users: UserOption[]
  existingOrder: ExistingOrder | null
}

export function OrderFormClient({
  cultivars,
  phases,
  products,
  units,
  zones,
  users,
  existingOrder,
}: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [yieldResult, setYieldResult] = useState<YieldResult | null>(null)
  const [yieldLoading, setYieldLoading] = useState(false)
  const isEdit = !!existingOrder

  const form = useForm<ProductionOrderInput>({
    resolver: zodResolver(productionOrderSchema),
    defaultValues: {
      cultivar_id: existingOrder?.cultivar_id ?? '',
      entry_phase_id: existingOrder?.entry_phase_id ?? '',
      exit_phase_id: existingOrder?.exit_phase_id ?? '',
      initial_quantity: existingOrder?.initial_quantity ?? ('' as unknown as number),
      initial_unit_id: existingOrder?.initial_unit_id ?? '',
      initial_product_id: existingOrder?.initial_product_id ?? null,
      zone_id: existingOrder?.zone_id ?? null,
      planned_start_date: existingOrder?.planned_start_date ?? '',
      priority: existingOrder?.priority ?? 'normal',
      assigned_to: existingOrder?.assigned_to ?? null,
      notes: existingOrder?.notes ?? '',
      phase_overrides: existingOrder?.phases ?? [],
    },
  })

  const watchCultivar = form.watch('cultivar_id')
  const watchEntryPhase = form.watch('entry_phase_id')
  const watchExitPhase = form.watch('exit_phase_id')
  const watchInitialQty = form.watch('initial_quantity')

  // Get the selected cultivar's crop_type_id
  const selectedCultivar = cultivars.find((c) => c.id === watchCultivar)
  const cropTypeId = selectedCultivar?.crop_type_id ?? ''

  // Entry/exit phase options
  const entryPhases = cropTypeId ? getEntryPhases(phases, cropTypeId) : []
  const exitPhases = watchEntryPhase ? getExitPhases(phases, cropTypeId, watchEntryPhase) : []

  // Phase chain for the timeline
  const phaseChain = (watchEntryPhase && watchExitPhase)
    ? buildPhaseChain(phases, cropTypeId, watchEntryPhase, watchExitPhase)
    : []

  // Phase duration/zone overrides (local state synced with form)
  const [phaseOverrides, setPhaseOverrides] = useState<Record<string, { duration: number | null; zone_id: string | null }>>({})

  // Initialize overrides when phase chain changes
  useEffect(() => {
    const overrides: Record<string, { duration: number | null; zone_id: string | null }> = {}
    for (const p of phaseChain) {
      const existing = existingOrder?.phases?.find((ep) => ep.phase_id === p.id)
      overrides[p.id] = {
        duration: existing?.planned_duration_days ?? phaseOverrides[p.id]?.duration ?? p.default_duration_days,
        zone_id: existing?.zone_id ?? phaseOverrides[p.id]?.zone_id ?? null,
      }
    }
    setPhaseOverrides(overrides)
    // Update form
    form.setValue('phase_overrides', phaseChain.map((p) => ({
      phase_id: p.id,
      planned_duration_days: overrides[p.id]?.duration ?? null,
      zone_id: overrides[p.id]?.zone_id ?? null,
    })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseChain.map(p => p.id).join(',')])

  // Reset entry/exit when cultivar changes
  useEffect(() => {
    if (!isEdit) {
      form.setValue('entry_phase_id', '')
      form.setValue('exit_phase_id', '')
      setYieldResult(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchCultivar])

  // Reset exit when entry changes
  useEffect(() => {
    if (!isEdit) {
      form.setValue('exit_phase_id', '')
      setYieldResult(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchEntryPhase])

  // Group cultivars by crop type
  const cultivarsByCrop = cultivars.reduce<Record<string, CultivarOption[]>>((acc, c) => {
    const key = c.crop_type_name
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {})

  async function calculateYields() {
    if (!watchCultivar || !watchEntryPhase || !watchExitPhase || !watchInitialQty) return
    setYieldLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.rpc('calculate_cascade_yields', {
      p_cultivar_id: watchCultivar,
      p_entry_phase_id: watchEntryPhase,
      p_exit_phase_id: watchExitPhase,
      p_initial_quantity: watchInitialQty,
    })
    if (error) {
      toast.error('Error al calcular rendimientos.')
      setYieldLoading(false)
      return
    }
    setYieldResult(data as unknown as YieldResult)
    setYieldLoading(false)
  }

  // Calculate total duration
  const totalDays = phaseChain.reduce((sum, p) => sum + (phaseOverrides[p.id]?.duration ?? p.default_duration_days ?? 0), 0)

  // Calculate planned end date
  const plannedStartDate = form.watch('planned_start_date')
  const calculatedEndDate = plannedStartDate && totalDays > 0
    ? new Date(new Date(plannedStartDate).getTime() + totalDays * 86400000).toISOString().slice(0, 10)
    : null

  async function onSubmit(values: ProductionOrderInput) {
    setIsLoading(true)
    const supabase = createClient()

    const orderPayload = {
      cultivar_id: values.cultivar_id,
      entry_phase_id: values.entry_phase_id,
      exit_phase_id: values.exit_phase_id,
      initial_quantity: values.initial_quantity,
      initial_unit_id: values.initial_unit_id,
      initial_product_id: values.initial_product_id || null,
      zone_id: values.zone_id || null,
      planned_start_date: values.planned_start_date || null,
      planned_end_date: calculatedEndDate,
      assigned_to: values.assigned_to || null,
      priority: values.priority,
      notes: values.notes || null,
      expected_output_quantity: yieldResult?.final_output_qty ?? null,
      expected_output_product_id: yieldResult?.final_output_product_id ?? null,
      expected_output_unit_id: values.initial_unit_id,
    }

    try {
      if (isEdit && existingOrder) {
        const { error } = await supabase
          .from('production_orders')
          .update(orderPayload)
          .eq('id', existingOrder.id)
        if (error) { toast.error('Error al actualizar la orden.'); return }

        // Delete existing phases and re-insert
        const { error: delErr } = await supabase.from('production_order_phases').delete().eq('order_id', existingOrder.id)
        if (delErr) { toast.error('Error al actualizar las fases.'); return }
        const phasesPayload = buildPhasesPayload(existingOrder.id, values)
        if (phasesPayload.length > 0) {
          const { error: phaseErr } = await supabase.from('production_order_phases').insert(phasesPayload)
          if (phaseErr) { toast.error('Orden actualizada, pero error en las fases.'); return }
        }
        toast.success('Orden actualizada.')
      } else {
        const { data, error } = await supabase
          .from('production_orders')
          .insert(orderPayload)
          .select('id')
          .single()
        if (error) { toast.error('Error al crear la orden.'); return }

        const phasesPayload = buildPhasesPayload(data.id, values)
        if (phasesPayload.length > 0) {
          const { error: phaseErr } = await supabase.from('production_order_phases').insert(phasesPayload)
          if (phaseErr) { toast.error('Orden creada, pero error en las fases.') }
          else { toast.success('Orden creada.') }
        } else {
          toast.success('Orden creada.')
        }
      }
      router.push('/production/orders')
      router.refresh()
    } catch {
      toast.error('Error inesperado.')
    } finally {
      setIsLoading(false)
    }
  }

  function buildPhasesPayload(orderId: string, values: ProductionOrderInput) {
    let cumulativeDays = 0
    const startDate = values.planned_start_date ? new Date(values.planned_start_date) : null

    return phaseChain.map((p, idx) => {
      const override = phaseOverrides[p.id]
      const duration = override?.duration ?? p.default_duration_days ?? 0
      const yieldPhase = yieldResult?.phases?.find((yp) => yp.phase_id === p.id)

      const phaseStart = startDate
        ? new Date(startDate.getTime() + cumulativeDays * 86400000).toISOString().slice(0, 10)
        : null
      cumulativeDays += duration
      const phaseEnd = startDate
        ? new Date(startDate.getTime() + cumulativeDays * 86400000).toISOString().slice(0, 10)
        : null

      return {
        order_id: orderId,
        phase_id: p.id,
        sort_order: idx + 1,
        planned_duration_days: duration,
        zone_id: override?.zone_id || null,
        expected_input_qty: yieldPhase?.input_qty ?? null,
        expected_output_qty: yieldPhase?.output_qty ?? null,
        expected_output_product_id: yieldPhase?.output_product_id ?? null,
        yield_pct: yieldPhase?.yield_pct ?? null,
        planned_start_date: phaseStart,
        planned_end_date: phaseEnd,
      }
    })
  }

  const canCalculate = !!watchCultivar && !!watchEntryPhase && !!watchExitPhase && !!watchInitialQty && watchInitialQty > 0

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/production/orders')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            {isEdit ? 'Editar orden de producción' : 'Nueva orden de producción'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isEdit
              ? 'Modifica los datos de la orden en borrador.'
              : 'Define qué se va a producir, las fases y cantidades.'}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          {/* Section 1: Datos Básicos */}
          <div className="rounded-md border p-4 space-y-4">
            <p className="text-sm font-medium">Datos básicos</p>

            <FormField
              control={form.control}
              name="cultivar_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cultivar</FormLabel>
                  <FormControl>
                    <select value={field.value} onChange={field.onChange} className={selectClass}>
                      <option value="">— Seleccionar cultivar —</option>
                      {Object.entries(cultivarsByCrop).map(([cropName, cvs]) => (
                        <optgroup key={cropName} label={cropName}>
                          {cvs.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridad</FormLabel>
                    <FormControl>
                      <select value={field.value} onChange={field.onChange} className={selectClass}>
                        {Object.entries(orderPriorityLabels).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="planned_start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de inicio planeada</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="assigned_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asignado a (opcional)</FormLabel>
                    <FormControl>
                      <select
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        className={selectClass}
                      >
                        <option value="">— Sin asignar —</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>{u.full_name}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="zone_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zona inicial (opcional)</FormLabel>
                    <FormControl>
                      <select
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        className={selectClass}
                      >
                        <option value="">— Sin zona —</option>
                        {zones.map((z) => (
                          <option key={z.id} value={z.id}>{z.name}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Observaciones de la orden..." rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Section 2: Rango de Fases */}
          {cropTypeId && (
            <div className="rounded-md border p-4 space-y-4">
              <p className="text-sm font-medium">Rango de fases</p>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="entry_phase_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fase de entrada</FormLabel>
                      <FormControl>
                        <select value={field.value} onChange={field.onChange} className={selectClass}>
                          <option value="">— Seleccionar —</option>
                          {entryPhases.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="exit_phase_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fase de salida</FormLabel>
                      <FormControl>
                        <select value={field.value} onChange={field.onChange} className={selectClass} disabled={!watchEntryPhase}>
                          <option value="">— Seleccionar —</option>
                          {exitPhases.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Phase timeline */}
              {phaseChain.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Línea de fases ({phaseChain.length} fases, ~{totalDays} días)
                    {calculatedEndDate && (
                      <span className="ml-2">→ Fin estimado: {new Date(calculatedEndDate + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    )}
                  </p>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Fase</TableHead>
                          <TableHead className="text-xs w-[100px]">Duración (días)</TableHead>
                          <TableHead className="text-xs w-[180px]">Zona</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {phaseChain.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="text-sm font-medium">{p.name}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="1"
                                className="h-8 text-xs w-20"
                                value={phaseOverrides[p.id]?.duration ?? p.default_duration_days ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value ? parseInt(e.target.value) : null
                                  setPhaseOverrides((prev) => ({
                                    ...prev,
                                    [p.id]: { ...prev[p.id], duration: val },
                                  }))
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <select
                                value={phaseOverrides[p.id]?.zone_id ?? ''}
                                onChange={(e) => {
                                  setPhaseOverrides((prev) => ({
                                    ...prev,
                                    [p.id]: { ...prev[p.id], zone_id: e.target.value || null },
                                  }))
                                }}
                                className={selectClass + ' text-xs h-8'}
                              >
                                <option value="">— Sin zona —</option>
                                {zones.map((z) => (
                                  <option key={z.id} value={z.id}>{z.name}</option>
                                ))}
                              </select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 3: Material de Entrada */}
          <div className="rounded-md border p-4 space-y-4">
            <p className="text-sm font-medium">Material de entrada</p>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="initial_quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cantidad inicial</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={field.value === ('' as unknown as number) ? '' : field.value}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '' as unknown as number)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="initial_unit_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidad</FormLabel>
                    <FormControl>
                      <select value={field.value} onChange={field.onChange} className={selectClass}>
                        <option value="">— Unidad —</option>
                        {units.map((u) => (
                          <option key={u.id} value={u.id}>{u.code} — {u.name}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="initial_product_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Producto inicial (opcional)</FormLabel>
                  <FormControl>
                    <select
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      className={selectClass}
                    >
                      <option value="">— Sin producto específico —</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Section 4: Rendimiento Esperado */}
          <div className="rounded-md border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Rendimiento esperado</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={calculateYields}
                disabled={!canCalculate || yieldLoading}
              >
                {yieldLoading ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1 h-3.5 w-3.5" />
                )}
                {yieldResult ? 'Recalcular' : 'Calcular'}
              </Button>
            </div>

            {!canCalculate && (
              <p className="text-xs text-muted-foreground">
                Completa cultivar, fases y cantidad inicial para calcular rendimientos.
              </p>
            )}

            {yieldResult && (
              <div className="space-y-3">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Fase</TableHead>
                        <TableHead className="text-xs text-right">Entrada</TableHead>
                        <TableHead className="text-xs text-right">Rend. %</TableHead>
                        <TableHead className="text-xs text-right">Salida</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {yieldResult.phases.map((yp) => (
                        <TableRow key={yp.phase_id}>
                          <TableCell className="text-sm">{yp.phase_name}</TableCell>
                          <TableCell className="text-sm text-right">
                            {Number(yp.input_qty).toLocaleString('es-CO', { maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-sm text-right">{Number(yp.yield_pct)}%</TableCell>
                          <TableCell className="text-sm text-right font-medium">
                            {Number(yp.output_qty).toLocaleString('es-CO', { maximumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between rounded-md bg-muted p-3">
                  <span className="text-sm font-medium">Producción final esperada</span>
                  <span className="text-lg font-bold">
                    {Number(yieldResult.final_output_qty).toLocaleString('es-CO', { maximumFractionDigits: 2 })}
                    {' '}
                    {units.find((u) => u.id === form.watch('initial_unit_id'))?.code ?? ''}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.push('/production/orders')} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear orden'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
