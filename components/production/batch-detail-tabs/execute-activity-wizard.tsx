'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, ChevronLeft, ChevronRight, AlertTriangle, Plus, Trash2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import type { ScheduledActivityData, ZoneOption } from '../batch-detail-client'

// ---------- Types ----------

type ChecklistItem = {
  step_order: number
  instruction: string
  is_critical: boolean
  requires_photo: boolean
  expected_value: string | null
  tolerance: string | null
  checked: boolean
  value: string
}

type ResourceItem = {
  product_id: string
  product_name: string
  quantity_planned: number
  quantity_actual: number
  unit_id: string
  unit_name: string
  inventory_item_id: string | null
  quantity_basis: string
}

type ObservationItem = {
  type: 'pest' | 'disease' | 'deficiency' | 'environmental' | 'general' | 'measurement'
  agent_id: string | null
  plant_part: string | null
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical'
  severity_pct: number | null
  incidence_value: number | null
  incidence_unit: 'count' | 'percentage' | null
  sample_size: number | null
  affected_plants: number | null
  description: string
  action_taken: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  scheduledActivity: ScheduledActivityData
  batchId: string
  currentPhaseId: string
  zoneId: string
  zones: ZoneOption[]
}

type Step = 'info' | 'checklist' | 'resources' | 'observations' | 'measurements' | 'confirm'

const STEP_LABELS: Record<Step, string> = {
  info: 'Info',
  checklist: 'Checklist',
  resources: 'Recursos',
  observations: 'Observaciones',
  measurements: 'Mediciones',
  confirm: 'Confirmar',
}

// Input style
const inputClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

// Helper to parse snapshot
function parseSnapshot(snapshot: unknown) {
  const s = snapshot as {
    activity_type_id?: string
    estimated_duration_min?: number
    checklist?: Array<{
      step_order: number
      instruction: string
      is_critical: boolean
      requires_photo: boolean
      expected_value?: string
      tolerance?: string
    }>
    metadata?: Record<string, unknown>
  } | null

  const activityTypeId = s?.activity_type_id ?? null
  const durationMinutes = s?.estimated_duration_min ?? 30

  const checklist: ChecklistItem[] = (s?.checklist ?? []).map((item) => ({
    ...item,
    expected_value: item.expected_value ?? null,
    tolerance: item.tolerance ?? null,
    checked: false,
    value: '',
  }))

  const measurementKeys = s?.metadata
    ? Object.keys(s.metadata).filter((k) => !['batch_status_action'].includes(k))
    : []
  const measurements: Record<string, string> = {}
  for (const key of measurementKeys) {
    measurements[key] = ''
  }

  return { activityTypeId, durationMinutes, checklist, measurements }
}

// ---------- Component ----------

export function ExecuteActivityWizard({
  open,
  onOpenChange,
  scheduledActivity,
  batchId,
  currentPhaseId,
  zoneId,
  zones,
}: Props) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>('info')
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // Form state
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [selectedZoneId, setSelectedZoneId] = useState(zoneId)
  const [notes, setNotes] = useState('')
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [resources] = useState<ResourceItem[]>([])
  const [observations, setObservations] = useState<ObservationItem[]>([])
  const [measurements, setMeasurements] = useState<Record<string, string>>({})
  const [activityTypeId, setActivityTypeId] = useState<string | null>(null)

  // Derived state
  const triggersPhaseChange = !!scheduledActivity.triggers_phase_change_id
  const triggersPhaseChangeName = scheduledActivity.triggers_phase_change_name

  // Handle dialog open/close
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !initialized) {
      // Initialize form from snapshot
      const parsed = parseSnapshot(scheduledActivity.template_snapshot)
      setActivityTypeId(parsed.activityTypeId)
      setDurationMinutes(parsed.durationMinutes)
      setChecklist(parsed.checklist)
      setMeasurements(parsed.measurements)
      setSelectedZoneId(zoneId)
      setNotes('')
      setObservations([])
      setCurrentStep('info')
      setInitialized(true)
    } else if (!newOpen) {
      // Reset for next open
      setInitialized(false)
    }
    onOpenChange(newOpen)
  }

  // Determine which steps to show based on data
  const hasChecklist = checklist.length > 0
  const hasMeasurements = Object.keys(measurements).length > 0

  const visibleSteps = useMemo((): Step[] => {
    const steps: Step[] = ['info']
    if (hasChecklist) steps.push('checklist')
    steps.push('resources') // Always show resources for adding
    steps.push('observations') // Always show observations
    if (hasMeasurements) steps.push('measurements')
    steps.push('confirm')
    return steps
  }, [hasChecklist, hasMeasurements])

  const currentVisibleIndex = visibleSteps.indexOf(currentStep)

  const goNext = () => {
    const nextIndex = currentVisibleIndex + 1
    if (nextIndex < visibleSteps.length) {
      setCurrentStep(visibleSteps[nextIndex])
    }
  }

  const goPrev = () => {
    const prevIndex = currentVisibleIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(visibleSteps[prevIndex])
    }
  }

  const canProceed = (): boolean => {
    if (currentStep === 'info') {
      return durationMinutes > 0 && !!selectedZoneId
    }
    if (currentStep === 'checklist') {
      // All critical items must be checked
      return checklist.filter((c) => c.is_critical).every((c) => c.checked)
    }
    return true
  }

  const handleChecklistToggle = (index: number) => {
    setChecklist((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, checked: !item.checked } : item
      )
    )
  }

  const handleChecklistValueChange = (index: number, value: string) => {
    setChecklist((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, value } : item
      )
    )
  }

  const addObservation = () => {
    setObservations((prev) => [
      ...prev,
      {
        type: 'general',
        agent_id: null,
        plant_part: null,
        severity: 'info',
        severity_pct: null,
        incidence_value: null,
        incidence_unit: null,
        sample_size: null,
        affected_plants: null,
        description: '',
        action_taken: '',
      },
    ])
  }

  const removeObservation = (index: number) => {
    setObservations((prev) => prev.filter((_, i) => i !== index))
  }

  const updateObservation = (index: number, field: keyof ObservationItem, value: unknown) => {
    setObservations((prev) =>
      prev.map((obs, i) =>
        i === index ? { ...obs, [field]: value } : obs
      )
    )
  }

  async function handleSubmit() {
    if (!activityTypeId) {
      toast.error('Error: Activity type not found')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      toast.error('No autenticado')
      setLoading(false)
      return
    }

    // Build checklist results
    const checklistResults = checklist.map((c) => ({
      step_order: c.step_order,
      instruction: c.instruction,
      checked: c.checked,
      value: c.value || null,
    }))

    // Build payload
    const payload = {
      scheduled_activity_id: scheduledActivity.id,
      activity_type_id: activityTypeId,
      zone_id: selectedZoneId,
      batch_id: batchId,
      phase_id: currentPhaseId,
      performed_by: session.user.id,
      duration_minutes: durationMinutes,
      measurement_data: Object.keys(measurements).length > 0 ? measurements : null,
      notes: notes || null,
      checklist_results: checklistResults.length > 0 ? checklistResults : null,
      activity_resources: resources.map((r) => ({
        product_id: r.product_id,
        inventory_item_id: r.inventory_item_id,
        quantity_planned: r.quantity_planned,
        quantity_actual: r.quantity_actual,
        unit_id: r.unit_id,
      })),
      activity_observations: observations
        .filter((o) => o.description.trim() !== '')
        .map((o) => ({
          type: o.type,
          agent_id: o.agent_id,
          plant_part: o.plant_part,
          severity: o.severity,
          severity_pct: o.severity_pct,
          incidence_value: o.incidence_value,
          incidence_unit: o.incidence_unit,
          sample_size: o.sample_size,
          affected_plants: o.affected_plants,
          description: o.description,
          action_taken: o.action_taken || null,
        })),
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/execute-activity`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error ?? 'Error al ejecutar la actividad')
        setLoading(false)
        return
      }

      if (result.phase_changed) {
        toast.success(`Actividad completada. Batch avanzó a fase ${triggersPhaseChangeName ?? 'siguiente'}.`)
      } else {
        toast.success('Actividad completada exitosamente')
      }

      onOpenChange(false)
      router.refresh()
    } catch {
      toast.error('Error de conexión')
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ejecutar actividad</DialogTitle>
          <DialogDescription>
            {scheduledActivity.template_name ?? 'Actividad programada'}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 py-2">
          {visibleSteps.map((step, idx) => (
            <div key={step} className="flex items-center">
              {idx > 0 && <div className="w-4 h-px bg-border mx-1" />}
              <button
                type="button"
                onClick={() => {
                  if (idx <= currentVisibleIndex) setCurrentStep(step)
                }}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors',
                  step === currentStep
                    ? 'bg-primary text-primary-foreground'
                    : idx < currentVisibleIndex
                      ? 'bg-muted text-foreground cursor-pointer hover:bg-muted/80'
                      : 'bg-muted/50 text-muted-foreground',
                )}
                disabled={idx > currentVisibleIndex}
              >
                {idx < currentVisibleIndex ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <span className="w-4 text-center">{idx + 1}</span>
                )}
                <span className="hidden sm:inline">{STEP_LABELS[step]}</span>
              </button>
            </div>
          ))}
        </div>

        <div className="py-4 min-h-[300px]">
          {/* Step: Info */}
          {currentStep === 'info' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="duration">Duración (minutos)</Label>
                <input
                  id="duration"
                  type="number"
                  min={1}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                  className={inputClass + ' mt-1.5'}
                />
              </div>

              <div>
                <Label htmlFor="zone">Zona</Label>
                <select
                  id="zone"
                  value={selectedZoneId}
                  onChange={(e) => setSelectedZoneId(e.target.value)}
                  className={inputClass + ' mt-1.5'}
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} ({z.facility_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1.5"
                  rows={3}
                />
              </div>

              {triggersPhaseChange && (
                <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 p-3 text-sm">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-800 dark:text-blue-300">
                        Esta actividad transiciona fase
                      </p>
                      <p className="text-blue-600 dark:text-blue-400">
                        Al completar, el lote avanzará a: {triggersPhaseChangeName ?? 'siguiente fase'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step: Checklist */}
          {currentStep === 'checklist' && (
            <div className="space-y-4">
              {checklist.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay checklist para esta actividad.</p>
              ) : (
                <div className="space-y-3">
                  {checklist.map((item, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border',
                        item.is_critical && !item.checked && 'border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20',
                      )}
                    >
                      <Checkbox
                        id={`check-${idx}`}
                        checked={item.checked}
                        onCheckedChange={() => handleChecklistToggle(idx)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 space-y-2">
                        <label
                          htmlFor={`check-${idx}`}
                          className={cn(
                            'text-sm cursor-pointer',
                            item.checked && 'line-through text-muted-foreground',
                          )}
                        >
                          {item.instruction}
                          {item.is_critical && (
                            <Badge variant="destructive" className="ml-2 text-xs">
                              Crítico
                            </Badge>
                          )}
                        </label>
                        {item.expected_value && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              Esperado: {item.expected_value}
                              {item.tolerance && ` (±${item.tolerance})`}
                            </span>
                            <input
                              type="text"
                              placeholder="Valor medido"
                              value={item.value}
                              onChange={(e) => handleChecklistValueChange(idx, e.target.value)}
                              className={inputClass + ' w-32 h-7 text-xs'}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step: Resources */}
          {currentStep === 'resources' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Registro de recursos consumidos. (Funcionalidad completa próximamente)
              </p>
              {resources.length === 0 && (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    No hay recursos pre-configurados para esta actividad.
                  </p>
                  <Button variant="outline" size="sm" disabled>
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Agregar recurso
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step: Observations */}
          {currentStep === 'observations' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Registra observaciones de plagas, enfermedades u otras notas.
                </p>
                <Button variant="outline" size="sm" onClick={addObservation}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Agregar
                </Button>
              </div>

              {observations.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    No hay observaciones registradas.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {observations.map((obs, idx) => (
                    <div key={idx} className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-3">
                          <div>
                            <Label className="text-xs">Tipo</Label>
                            <select
                              value={obs.type}
                              onChange={(e) => updateObservation(idx, 'type', e.target.value)}
                              className={inputClass + ' mt-1 w-32'}
                            >
                              <option value="general">General</option>
                              <option value="pest">Plaga</option>
                              <option value="disease">Enfermedad</option>
                              <option value="deficiency">Deficiencia</option>
                              <option value="environmental">Ambiental</option>
                              <option value="measurement">Medición</option>
                            </select>
                          </div>
                          <div>
                            <Label className="text-xs">Severidad</Label>
                            <select
                              value={obs.severity}
                              onChange={(e) => updateObservation(idx, 'severity', e.target.value)}
                              className={inputClass + ' mt-1 w-24'}
                            >
                              <option value="info">Info</option>
                              <option value="low">Baja</option>
                              <option value="medium">Media</option>
                              <option value="high">Alta</option>
                              <option value="critical">Crítica</option>
                            </select>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeObservation(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div>
                        <Label className="text-xs">Descripción</Label>
                        <Textarea
                          value={obs.description}
                          onChange={(e) => updateObservation(idx, 'description', e.target.value)}
                          className="mt-1"
                          rows={2}
                          placeholder="Describe la observación..."
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Acción tomada (opcional)</Label>
                        <Textarea
                          value={obs.action_taken}
                          onChange={(e) => updateObservation(idx, 'action_taken', e.target.value)}
                          className="mt-1"
                          rows={2}
                          placeholder="Describe las acciones tomadas..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step: Measurements */}
          {currentStep === 'measurements' && (
            <div className="space-y-4">
              {Object.keys(measurements).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay mediciones configuradas para esta actividad.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(measurements).map(([key, value]) => (
                    <div key={key}>
                      <Label htmlFor={`measure-${key}`} className="capitalize">
                        {key.replace(/_/g, ' ')}
                      </Label>
                      <input
                        id={`measure-${key}`}
                        type="text"
                        value={value}
                        onChange={(e) =>
                          setMeasurements((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        className={inputClass + ' mt-1.5'}
                        placeholder="—"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step: Confirm */}
          {currentStep === 'confirm' && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Actividad:</span>
                  <span className="font-medium">{scheduledActivity.template_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duración:</span>
                  <span>{durationMinutes} minutos</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Zona:</span>
                  <span>{zones.find((z) => z.id === selectedZoneId)?.name ?? '—'}</span>
                </div>
                {hasChecklist && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Checklist:</span>
                    <span>
                      {checklist.filter((c) => c.checked).length}/{checklist.length} completados
                    </span>
                  </div>
                )}
                {observations.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Observaciones:</span>
                    <span>{observations.length}</span>
                  </div>
                )}
                {notes && (
                  <div>
                    <span className="text-muted-foreground">Notas:</span>
                    <p className="mt-1">{notes}</p>
                  </div>
                )}
              </div>

              {triggersPhaseChange && (
                <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 p-3 text-sm">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-800 dark:text-blue-300">
                        El lote avanzará a: {triggersPhaseChangeName ?? 'siguiente fase'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex-1">
            {currentVisibleIndex > 0 && (
              <Button variant="outline" onClick={goPrev} disabled={loading}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Anterior
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            {currentStep === 'confirm' ? (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Ejecutando...' : 'Ejecutar actividad'}
              </Button>
            ) : (
              <Button onClick={goNext} disabled={!canProceed()}>
                Siguiente
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
