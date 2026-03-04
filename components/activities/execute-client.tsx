'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Clock, AlertTriangle, Plus, Trash2,
  ChevronDown, ChevronRight, Info,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { createClient } from '@/lib/supabase/client'
import {
  scheduledStatusLabels,
  scheduledStatusBadgeStyles,
  observationTypeLabels,
  observationTypeBadgeStyles,
  severityLabels,
  severityBadgeStyles,
  plantPartLabels,
  selectClass,
  formatDate,
} from './activities-shared'

// ---------- Types ----------

type ScheduledActivityInfo = {
  id: string
  status: string
  planned_date: string
  crop_day: number | null
  template_name: string
  template_code: string | null
  activity_type_id: string
  activity_type_name: string
  estimated_duration_min: number | null
  triggers_phase_change_id: string | null
  measurement_fields: Record<string, string>[] | null
}

type BatchInfo = {
  id: string
  code: string
  plant_count: number | null
  area_m2: number | null
  cultivar_name: string
  phase_id: string
  phase_name: string
  zone_id: string
  zone_name: string
  facility_name: string
}

type TemplateResource = {
  product_id: string
  product_name: string
  quantity: number
  quantity_basis: string
  unit_id: string
  unit_code: string
  is_optional: boolean
}

type ChecklistItem = {
  step_order: number
  instruction: string
  expected_value: string | null
  tolerance: string | null
  is_critical: boolean
  requires_photo: boolean
}

type InventoryItem = {
  id: string
  product_id: string
  batch_number: string
  quantity_available: number
  cost_per_unit: number | null
}

type Agent = {
  id: string
  common_name: string
  scientific_name: string | null
  type: string
  category: string
  default_plant_parts: string[] | null
}

type Product = { id: string; name: string; sku: string }
type Unit = { id: string; code: string; name: string }
type CurrentUser = { id: string; full_name: string; role: string }

type ResourceEntry = {
  product_id: string
  product_name: string
  inventory_item_id: string
  quantity_planned: number
  quantity_actual: number
  unit_id: string
  unit_code: string
  cost_estimate: number | null
  is_optional: boolean
  included: boolean
}

type ObservationEntry = {
  key: string
  type: string
  agent_id: string
  plant_part: string
  incidence_value: string
  incidence_unit: string
  severity: string
  severity_pct: string
  sample_size: string
  affected_plants: string
  description: string
  action_taken: string
}

type Props = {
  scheduledActivity: ScheduledActivityInfo
  batch: BatchInfo
  templateResources: TemplateResource[]
  templateChecklist: ChecklistItem[]
  inventoryItems: InventoryItem[]
  agents: Agent[]
  products: Product[]
  units: Unit[]
  currentUser: CurrentUser
  isAlreadyExecuted: boolean
  canExecute: boolean
  completedInfo: {
    performed_at: string
    performer_name: string
    activity_id: string
  } | null
}

const DRAFT_PREFIX = 'draft-activity-'

export function ExecuteClient({
  scheduledActivity,
  batch,
  templateResources,
  templateChecklist,
  inventoryItems,
  agents,
  products,
  units,
  currentUser,
  isAlreadyExecuted,
  canExecute,
  completedInfo,
}: Props) {
  const router = useRouter()

  // Form state
  const [duration, setDuration] = useState(scheduledActivity.estimated_duration_min?.toString() ?? '')
  const [notes, setNotes] = useState('')
  const [measurementData, setMeasurementData] = useState<Record<string, string>>({})
  const [resources, setResources] = useState<ResourceEntry[]>([])
  const [checklistState, setChecklistState] = useState<Record<number, { checked: boolean; value: string }>>({})
  const [observations, setObservations] = useState<ObservationEntry[]>([])
  const [showObsForm, setShowObsForm] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showAddResource, setShowAddResource] = useState(false)
  const [obsExpanded, setObsExpanded] = useState(true)

  // Initialize resources from template
  useEffect(() => {
    const scaledResources = templateResources.map((tr) => {
      const planned = scaleQuantity(tr.quantity, tr.quantity_basis, batch.plant_count, batch.area_m2)
      const availableItems = inventoryItems.filter((i) => i.product_id === tr.product_id)
      const firstItem = availableItems[0]
      return {
        product_id: tr.product_id,
        product_name: tr.product_name,
        inventory_item_id: firstItem?.id ?? '',
        quantity_planned: planned,
        quantity_actual: planned,
        unit_id: tr.unit_id,
        unit_code: tr.unit_code,
        cost_estimate: firstItem?.cost_per_unit ? planned * firstItem.cost_per_unit : null,
        is_optional: tr.is_optional,
        included: !tr.is_optional,
      }
    })
    setResources(scaledResources)

    // Initialize checklist
    const initial: Record<number, { checked: boolean; value: string }> = {}
    templateChecklist.forEach((c) => {
      initial[c.step_order] = { checked: false, value: '' }
    })
    setChecklistState(initial)

    // Try restore draft
    const draftKey = DRAFT_PREFIX + scheduledActivity.id
    const draft = localStorage.getItem(draftKey)
    if (draft && !isAlreadyExecuted) {
      try {
        const parsed = JSON.parse(draft)
        if (parsed.duration) setDuration(parsed.duration)
        if (parsed.notes) setNotes(parsed.notes)
        if (parsed.measurementData) setMeasurementData(parsed.measurementData)
        if (parsed.observations) setObservations(parsed.observations)
        if (parsed.checklistState) setChecklistState(parsed.checklistState)
        toast.info('Borrador restaurado')
      } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function saveDraft() {
    const draftKey = DRAFT_PREFIX + scheduledActivity.id
    localStorage.setItem(draftKey, JSON.stringify({
      duration, notes, measurementData, observations, checklistState,
    }))
    toast.success('Borrador guardado')
  }

  // Validation
  const criticalItems = templateChecklist.filter((c) => c.is_critical)
  const allCriticalChecked = criticalItems.every((c) => checklistState[c.step_order]?.checked)
  const mandatoryResources = resources.filter((r) => !r.is_optional || r.included)
  const allResourcesValid = mandatoryResources.every((r) => r.quantity_actual > 0 && r.inventory_item_id)
  const hasDuration = duration && parseInt(duration) > 0
  const canSubmit = canExecute && !submitting && allCriticalChecked && (mandatoryResources.length === 0 || allResourcesValid) && hasDuration

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)

    try {
      const supabase = createClient()

      // Build payload
      const activeResources = resources.filter((r) => !r.is_optional || r.included)

      const payload = {
        scheduled_activity_id: scheduledActivity.id,
        activity_type_id: scheduledActivity.activity_type_id,
        zone_id: batch.zone_id,
        batch_id: batch.id,
        phase_id: batch.phase_id || null,
        performed_by: currentUser.id,
        duration_minutes: parseInt(duration),
        measurement_data: Object.keys(measurementData).length > 0 ? measurementData : null,
        notes: notes || null,
        checklist_results: templateChecklist.map((c) => ({
          step_order: c.step_order,
          checked: checklistState[c.step_order]?.checked ?? false,
          value: checklistState[c.step_order]?.value || '',
        })),
        activity_resources: activeResources.map((r) => ({
          product_id: r.product_id,
          inventory_item_id: r.inventory_item_id,
          quantity_planned: r.quantity_planned,
          quantity_actual: r.quantity_actual,
          unit_id: r.unit_id,
        })),
        activity_observations: observations.map((o) => ({
          type: o.type,
          agent_id: o.agent_id || null,
          plant_part: o.plant_part || null,
          incidence_value: o.incidence_value ? parseFloat(o.incidence_value) : null,
          incidence_unit: o.incidence_unit || null,
          severity: o.severity || 'info',
          severity_pct: o.severity_pct ? parseFloat(o.severity_pct) : null,
          sample_size: o.sample_size ? parseInt(o.sample_size) : null,
          affected_plants: o.affected_plants ? parseInt(o.affected_plants) : null,
          description: o.description,
          action_taken: o.action_taken || null,
        })),
      }

      const { data, error } = await supabase.functions.invoke('execute-activity', {
        body: payload,
      })

      if (error) throw error

      // Clear draft
      localStorage.removeItem(DRAFT_PREFIX + scheduledActivity.id)

      const result = data as { activity_id: string; phase_changed?: boolean } | null
      let msg = 'Actividad completada exitosamente'
      if (observations.length > 0) {
        msg += `. ${observations.length} observacion${observations.length > 1 ? 'es' : ''} registrada${observations.length > 1 ? 's' : ''}`
      }
      toast.success(msg)

      if (result?.phase_changed) {
        toast.info('El batch avanzó a la siguiente fase')
      }

      router.push('/activities/schedule')
      router.refresh()
    } catch (err) {
      console.error(err)
      toast.error('Error al completar la actividad')
    } finally {
      setSubmitting(false)
    }
  }

  function updateResource(index: number, field: string, value: string | number | boolean) {
    setResources((prev) => {
      const next = [...prev]
      const r = { ...next[index] }

      if (field === 'quantity_actual') {
        r.quantity_actual = Number(value) || 0
        const item = inventoryItems.find((i) => i.id === r.inventory_item_id)
        r.cost_estimate = item?.cost_per_unit ? r.quantity_actual * item.cost_per_unit : null
      } else if (field === 'inventory_item_id') {
        r.inventory_item_id = String(value)
        const item = inventoryItems.find((i) => i.id === String(value))
        r.cost_estimate = item?.cost_per_unit ? r.quantity_actual * item.cost_per_unit : null
      } else if (field === 'included') {
        r.included = Boolean(value)
      }

      next[index] = r
      return next
    })
  }

  function addAdHocResource(productId: string, unitId: string) {
    const product = products.find((p) => p.id === productId)
    const unit = units.find((u) => u.id === unitId)
    const available = inventoryItems.filter((i) => i.product_id === productId)

    setResources((prev) => [
      ...prev,
      {
        product_id: productId,
        product_name: product?.name ?? '—',
        inventory_item_id: available[0]?.id ?? '',
        quantity_planned: 0,
        quantity_actual: 0,
        unit_id: unitId,
        unit_code: unit?.code ?? '',
        cost_estimate: null,
        is_optional: false,
        included: true,
      },
    ])
    setShowAddResource(false)
  }

  function removeResource(index: number) {
    setResources((prev) => prev.filter((_, i) => i !== index))
  }

  function addObservation(obs: ObservationEntry) {
    setObservations((prev) => [...prev, obs])
    setShowObsForm(false)
  }

  function removeObservation(key: string) {
    setObservations((prev) => prev.filter((o) => o.key !== key))
  }

  const checkedCount = Object.values(checklistState).filter((c) => c.checked).length
  const totalChecklist = templateChecklist.length

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="mt-0.5 shrink-0" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold tracking-tight">{scheduledActivity.template_name}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Link href={`/production/batches/${batch.id}`} className="text-primary hover:underline">
              {batch.code}
            </Link>
            <span>·</span>
            <span>{batch.cultivar_name}</span>
            <span>·</span>
            <span>{batch.phase_name}</span>
            <span>·</span>
            <span>{batch.zone_name} ({batch.facility_name})</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary" className={scheduledStatusBadgeStyles[scheduledActivity.status] ?? ''}>
              {scheduledStatusLabels[scheduledActivity.status] ?? scheduledActivity.status}
            </Badge>
            {scheduledActivity.crop_day != null && (
              <Badge variant="outline">Día {scheduledActivity.crop_day}</Badge>
            )}
            <Badge variant="outline">{formatDate(scheduledActivity.planned_date)}</Badge>
            {scheduledActivity.estimated_duration_min && (
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                {scheduledActivity.estimated_duration_min} min est.
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Already executed banner */}
      {isAlreadyExecuted && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950">
          <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">
              Esta actividad ya fue {scheduledStatusLabels[scheduledActivity.status]?.toLowerCase() ?? scheduledActivity.status}
              {completedInfo && ` el ${formatDate(completedInfo.performed_at)} por ${completedInfo.performer_name}`}
            </span>
          </div>
          {completedInfo && (
            <Link href="/activities/history" className="mt-2 inline-block text-sm text-primary hover:underline">
              Ver en historial
            </Link>
          )}
        </div>
      )}

      {!isAlreadyExecuted && canExecute && (
        <>
          {/* Section 1: General Data */}
          <section className="rounded-lg border p-4">
            <h3 className="mb-3 font-medium">Datos generales</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Duración (minutos) *</label>
                <Input
                  type="number"
                  min={1}
                  max={1440}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="30"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">Notas</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas generales de la actividad..."
                  maxLength={5000}
                  rows={2}
                />
              </div>

              {/* Dynamic measurement fields */}
              {scheduledActivity.measurement_fields && scheduledActivity.measurement_fields.map((field) => {
                const key = Object.keys(field)[0]
                if (!key) return null
                return (
                  <div key={key}>
                    <label className="mb-1 block text-sm font-medium">{field[key] || key}</label>
                    <Input
                      value={measurementData[key] ?? ''}
                      onChange={(e) => setMeasurementData((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder={key}
                    />
                  </div>
                )
              })}
            </div>
          </section>

          {/* Section 2: Resources */}
          {(resources.length > 0 || templateResources.length === 0) && (
            <section className="rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-medium">Recursos</h3>
                <Button variant="outline" size="sm" onClick={() => setShowAddResource(true)}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Agregar
                </Button>
              </div>

              {resources.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Recurso</TableHead>
                        <TableHead className="text-right">Planificado</TableHead>
                        <TableHead className="text-right">Real *</TableHead>
                        <TableHead>Unidad</TableHead>
                        <TableHead>Lote</TableHead>
                        <TableHead className="text-right">Costo est.</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resources.map((r, i) => {
                        const available = inventoryItems.filter((item) => item.product_id === r.product_id)
                        const selectedItem = inventoryItems.find((item) => item.id === r.inventory_item_id)
                        const stockWarning = selectedItem && r.quantity_actual > selectedItem.quantity_available

                        if (r.is_optional && !r.included) {
                          return (
                            <TableRow key={i} className="opacity-50">
                              <TableCell className="text-sm">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={false}
                                    onCheckedChange={(v) => updateResource(i, 'included', !!v)}
                                  />
                                  {r.product_name}
                                  <Badge variant="outline" className="text-[10px]">Opcional</Badge>
                                </div>
                              </TableCell>
                              <TableCell colSpan={5} className="text-sm text-muted-foreground">No incluido</TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                          )
                        }

                        return (
                          <TableRow key={i}>
                            <TableCell className="text-sm">
                              <div className="flex items-center gap-2">
                                {r.is_optional && (
                                  <Checkbox
                                    checked={r.included}
                                    onCheckedChange={(v) => updateResource(i, 'included', !!v)}
                                  />
                                )}
                                {r.product_name}
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {r.quantity_planned.toLocaleString('es-CO')}
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                min={0}
                                step="any"
                                value={r.quantity_actual}
                                onChange={(e) => updateResource(i, 'quantity_actual', e.target.value)}
                                className="h-8 w-24 text-right"
                              />
                            </TableCell>
                            <TableCell className="text-sm">{r.unit_code}</TableCell>
                            <TableCell>
                              <select
                                value={r.inventory_item_id}
                                onChange={(e) => updateResource(i, 'inventory_item_id', e.target.value)}
                                className={`${selectClass} h-8 w-40 text-xs`}
                              >
                                <option value="">Seleccionar...</option>
                                {available.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.batch_number} ({item.quantity_available.toLocaleString('es-CO')} disp.)
                                  </option>
                                ))}
                              </select>
                              {stockWarning && (
                                <p className="mt-0.5 text-[10px] text-yellow-600">
                                  Stock insuficiente (disp: {selectedItem.quantity_available})
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {r.cost_estimate != null ? `$${r.cost_estimate.toLocaleString('es-CO', { maximumFractionDigits: 0 })}` : '—'}
                            </TableCell>
                            <TableCell>
                              {!templateResources.some((tr) => tr.product_id === r.product_id) && (
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeResource(i)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No hay recursos definidos para esta actividad.</p>
              )}
            </section>
          )}

          {/* Section 3: Checklist */}
          {templateChecklist.length > 0 && (
            <section className="rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-medium">Checklist</h3>
                <span className="text-sm text-muted-foreground">
                  {checkedCount} de {totalChecklist}
                </span>
              </div>
              <div className="mb-2 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${totalChecklist > 0 ? (checkedCount / totalChecklist) * 100 : 0}%` }}
                />
              </div>
              <div className="space-y-2">
                {templateChecklist.map((c) => (
                  <div key={c.step_order} className="flex items-start gap-3 rounded-md border p-3">
                    <Checkbox
                      checked={checklistState[c.step_order]?.checked ?? false}
                      onCheckedChange={(v) =>
                        setChecklistState((prev) => ({
                          ...prev,
                          [c.step_order]: { ...prev[c.step_order], checked: !!v },
                        }))
                      }
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${checklistState[c.step_order]?.checked ? 'line-through text-muted-foreground' : ''}`}>
                          {c.instruction}
                        </span>
                        {c.is_critical && (
                          <Badge variant="destructive" className="text-[10px]">Crítico</Badge>
                        )}
                      </div>
                      {c.expected_value && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Esperado: {c.expected_value}
                          {c.tolerance && ` (±${c.tolerance})`}
                        </p>
                      )}
                      {c.expected_value && (
                        <Input
                          placeholder="Valor observado"
                          value={checklistState[c.step_order]?.value ?? ''}
                          onChange={(e) =>
                            setChecklistState((prev) => ({
                              ...prev,
                              [c.step_order]: { ...prev[c.step_order], value: e.target.value },
                            }))
                          }
                          className="mt-1 h-7 text-xs"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 4: Observations */}
          <section className="rounded-lg border p-4">
            <button
              className="flex w-full items-center justify-between"
              onClick={() => setObsExpanded(!obsExpanded)}
            >
              <h3 className="font-medium">
                Observaciones
                {observations.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{observations.length}</Badge>
                )}
              </h3>
              {obsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>

            {obsExpanded && (
              <div className="mt-3 space-y-2">
                {observations.map((o) => (
                  <div key={o.key} className="flex items-start justify-between rounded-md border p-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={`text-[10px] ${observationTypeBadgeStyles[o.type] ?? ''}`}>
                          {observationTypeLabels[o.type] ?? o.type}
                        </Badge>
                        <Badge variant="secondary" className={`text-[10px] ${severityBadgeStyles[o.severity] ?? ''}`}>
                          {severityLabels[o.severity] ?? o.severity}
                        </Badge>
                        {o.agent_id && (
                          <span className="text-xs text-muted-foreground">
                            {agents.find((a) => a.id === o.agent_id)?.common_name}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm">{o.description}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeObservation(o.key)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}

                <Button variant="outline" size="sm" onClick={() => setShowObsForm(true)}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Agregar observación
                </Button>
              </div>
            )}
          </section>

          {/* Sticky footer */}
          <div className="sticky bottom-0 flex items-center gap-2 rounded-lg border bg-background p-4 shadow-lg">
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex-1 sm:flex-none"
            >
              {submitting ? 'Completando...' : 'Completar actividad'}
            </Button>
            <Button variant="outline" onClick={saveDraft}>
              Guardar borrador
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                const hasChanges = duration || notes || observations.length > 0
                if (hasChanges) setShowCancelDialog(true)
                else router.push('/activities/schedule')
              }}
            >
              Cancelar
            </Button>

            {!allCriticalChecked && criticalItems.length > 0 && (
              <span className="ml-auto flex items-center gap-1 text-xs text-yellow-600">
                <Info className="h-3.5 w-3.5" />
                Completa todos los items críticos
              </span>
            )}
          </div>
        </>
      )}

      {/* Cancel confirmation dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Cancelar ejecución?</DialogTitle>
            <DialogDescription>
              Tienes cambios sin guardar. ¿Deseas guardar un borrador antes de salir?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Continuar editando
            </Button>
            <Button variant="secondary" onClick={() => { saveDraft(); router.push('/activities/schedule') }}>
              Guardar borrador y salir
            </Button>
            <Button variant="destructive" onClick={() => router.push('/activities/schedule')}>
              Salir sin guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Observation form dialog */}
      <ObservationFormDialog
        open={showObsForm}
        onClose={() => setShowObsForm(false)}
        onAdd={addObservation}
        agents={agents}
      />

      {/* Add resource dialog */}
      <AddResourceDialog
        open={showAddResource}
        onClose={() => setShowAddResource(false)}
        onAdd={addAdHocResource}
        products={products}
        units={units}
        existingProductIds={resources.map((r) => r.product_id)}
      />
    </div>
  )
}

// ---------- Observation Form ----------

function ObservationFormDialog({
  open, onClose, onAdd, agents,
}: {
  open: boolean
  onClose: () => void
  onAdd: (obs: ObservationEntry) => void
  agents: Agent[]
}) {
  const [type, setType] = useState('general')
  const [agentId, setAgentId] = useState('')
  const [plantPart, setPlantPart] = useState('')
  const [incidenceValue, setIncidenceValue] = useState('')
  const [incidenceUnit, setIncidenceUnit] = useState('')
  const [severity, setSeverity] = useState('info')
  const [severityPct, setSeverityPct] = useState('')
  const [sampleSize, setSampleSize] = useState('')
  const [affectedPlants, setAffectedPlants] = useState('')
  const [description, setDescription] = useState('')
  const [actionTaken, setActionTaken] = useState('')

  const needsAgent = ['pest', 'disease', 'deficiency'].includes(type)
  const filteredAgents = agents.filter((a) => a.type === type || !needsAgent)

  function handleSubmit() {
    if (!description.trim()) {
      toast.error('La descripción es requerida')
      return
    }
    onAdd({
      key: crypto.randomUUID(),
      type, agent_id: agentId, plant_part: plantPart,
      incidence_value: incidenceValue, incidence_unit: incidenceUnit,
      severity, severity_pct: severityPct,
      sample_size: sampleSize, affected_plants: affectedPlants,
      description: description.trim(), action_taken: actionTaken,
    })
    // Reset
    setType('general')
    setAgentId('')
    setPlantPart('')
    setIncidenceValue('')
    setIncidenceUnit('')
    setSeverity('info')
    setSeverityPct('')
    setSampleSize('')
    setAffectedPlants('')
    setDescription('')
    setActionTaken('')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva observación</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium">Tipo *</label>
              <select value={type} onChange={(e) => { setType(e.target.value); setAgentId('') }} className={selectClass}>
                {Object.entries(observationTypeLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Severidad *</label>
              <select value={severity} onChange={(e) => setSeverity(e.target.value)} className={selectClass}>
                {Object.entries(severityLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          {needsAgent && (
            <div>
              <label className="mb-1 block text-xs font-medium">Agente</label>
              <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className={selectClass}>
                <option value="">Seleccionar...</option>
                {filteredAgents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.common_name}{a.scientific_name ? ` (${a.scientific_name})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium">Parte de la planta</label>
              <select value={plantPart} onChange={(e) => setPlantPart(e.target.value)} className={selectClass}>
                <option value="">—</option>
                {Object.entries(plantPartLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Incidencia</label>
              <Input type="number" min={0} value={incidenceValue} onChange={(e) => setIncidenceValue(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Unidad</label>
              <select value={incidenceUnit} onChange={(e) => setIncidenceUnit(e.target.value)} className={selectClass}>
                <option value="">—</option>
                <option value="count">Conteo</option>
                <option value="percentage">Porcentaje</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium">Tamaño muestra</label>
              <Input type="number" min={0} value={sampleSize} onChange={(e) => setSampleSize(e.target.value)} placeholder="Plantas" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Plantas afectadas</label>
              <Input type="number" min={0} value={affectedPlants} onChange={(e) => setAffectedPlants(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Área afectada %</label>
              <Input type="number" min={0} max={100} value={severityPct} onChange={(e) => setSeverityPct(e.target.value)} placeholder="0" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium">Descripción *</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe la observación..."
              maxLength={5000}
              rows={3}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium">Acción tomada</label>
            <Textarea
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
              placeholder="Acción realizada o recomendada..."
              maxLength={2000}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!description.trim()}>Agregar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Add Resource Dialog ----------

function AddResourceDialog({
  open, onClose, onAdd, products, units, existingProductIds,
}: {
  open: boolean
  onClose: () => void
  onAdd: (productId: string, unitId: string) => void
  products: Product[]
  units: Unit[]
  existingProductIds: string[]
}) {
  const [productId, setProductId] = useState('')
  const [unitId, setUnitId] = useState('')

  const available = products.filter((p) => !existingProductIds.includes(p.id))

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Agregar recurso</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium">Producto *</label>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} className={selectClass}>
              <option value="">Seleccionar...</option>
              {available.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Unidad *</label>
            <select value={unitId} onChange={(e) => setUnitId(e.target.value)} className={selectClass}>
              <option value="">Seleccionar...</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.code})</option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => { onAdd(productId, unitId); setProductId(''); setUnitId('') }} disabled={!productId || !unitId}>
            Agregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Scaling utility ----------

function scaleQuantity(
  quantity: number,
  basis: string,
  plantCount: number | null,
  areaM2: number | null,
): number {
  switch (basis) {
    case 'per_plant':
      return quantity * (plantCount ?? 0)
    case 'per_m2':
      return quantity * (areaM2 ?? 0)
    case 'per_zone':
    case 'fixed':
    default:
      return quantity
  }
}
