'use client'

import type { Json } from '@/types/database'
import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  activityTemplateSchema,
  type ActivityTemplateInput,
  cultivationScheduleSchema,
  type CultivationScheduleInput,
} from '@/schemas/activity-templates'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ChevronDown, ChevronRight } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
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

export type TemplateRow = {
  id: string
  company_id: string
  code: string
  activity_type_id: string
  name: string
  frequency: 'daily' | 'weekly' | 'biweekly' | 'once' | 'on_demand'
  estimated_duration_min: number
  trigger_day_from: number | null
  trigger_day_to: number | null
  depends_on_template_id: string | null
  triggers_phase_change_id: string | null
  triggers_transformation: boolean
  metadata: unknown
  is_active: boolean
}

export type TemplatePhaseRow = { id: string; template_id: string; phase_id: string }
export type TemplateResourceRow = {
  id: string
  template_id: string
  product_id: string | null
  quantity: number
  quantity_basis: 'fixed' | 'per_plant' | 'per_m2' | 'per_zone' | 'per_L_solution'
  is_optional: boolean
  sort_order: number
  notes: string | null
}
export type TemplateChecklistRow = {
  id: string
  template_id: string
  step_order: number
  instruction: string
  is_critical: boolean
  requires_photo: boolean
  expected_value: string | null
  tolerance: string | null
}

export type PhaseConfigItem = {
  phase_id: string
  duration_days: number
  templates: { template_id: string }[]
}

export type ScheduleRow = {
  id: string
  company_id: string
  name: string
  cultivar_id: string
  total_days: number | null
  phase_config: PhaseConfigItem[] | null
  is_active: boolean
  cultivar: { name: string; crop_type_id: string } | null
}

export type ActivityType = { id: string; name: string }
export type CropType = { id: string; name: string }
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
export type CultivarRef = {
  id: string
  crop_type_id: string
  code: string
  name: string
  phase_durations: Record<string, number> | null
}

// ---------- Constants ----------

export const frequencyLabels: Record<string, string> = {
  daily: 'Diaria',
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  once: 'Una vez',
  on_demand: 'A demanda',
}

export const basisLabels: Record<string, string> = {
  fixed: 'Fija',
  per_plant: 'Por planta',
  per_m2: 'Por m\u00B2',
  per_zone: 'Por zona',
  per_L_solution: 'Por L soluci\u00F3n',
}

export const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring'

// ================================================================
// TEMPLATE DIALOG
// ================================================================

export function TemplateDialog({
  open,
  onOpenChange,
  template,
  activityTypes,
  allTemplates,
  phases,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: TemplateRow | null
  activityTypes: ActivityType[]
  allTemplates: TemplateRow[]
  phases: PhaseRow[]
  onSuccess: (newId?: string) => void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const isEdit = !!template

  const form = useForm<ActivityTemplateInput>({
    resolver: zodResolver(activityTemplateSchema),
    values: {
      code: template?.code ?? '',
      activity_type_id: template?.activity_type_id ?? (activityTypes[0]?.id ?? ''),
      name: template?.name ?? '',
      frequency: template?.frequency ?? 'once',
      estimated_duration_min: template?.estimated_duration_min ?? 30,
      trigger_day_from: template?.trigger_day_from ?? null,
      trigger_day_to: template?.trigger_day_to ?? null,
      depends_on_template_id: template?.depends_on_template_id ?? null,
      triggers_phase_change_id: template?.triggers_phase_change_id ?? null,
      triggers_transformation: template?.triggers_transformation ?? false,
    },
  })

  async function onSubmit(values: ActivityTemplateInput) {
    setIsLoading(true)
    const supabase = createClient()

    const payload = {
      code: values.code,
      activity_type_id: values.activity_type_id,
      name: values.name,
      frequency: values.frequency,
      estimated_duration_min: values.estimated_duration_min,
      trigger_day_from: values.trigger_day_from,
      trigger_day_to: values.trigger_day_to,
      depends_on_template_id: values.depends_on_template_id,
      triggers_phase_change_id: values.triggers_phase_change_id,
      triggers_transformation: values.triggers_transformation,
    }

    try {
      if (isEdit) {
        const { error } = await supabase
          .from('activity_templates')
          .update(payload)
          .eq('id', template.id)
        if (error) {
          if (error.message?.includes('idx_activity_templates_code_company')) {
            form.setError('code', { message: 'Ya existe un template con este c\u00F3digo' })
          } else {
            toast.error('Error al actualizar el template.')
          }
          return
        }
        toast.success('Template actualizado.')
        onSuccess()
      } else {
        const { data, error } = await supabase
          .from('activity_templates')
          .insert(payload)
          .select('id')
          .single()
        if (error) {
          if (error.message?.includes('idx_activity_templates_code_company')) {
            form.setError('code', { message: 'Ya existe un template con este c\u00F3digo' })
          } else {
            toast.error('Error al crear el template.')
          }
          return
        }
        toast.success('Template creado.')
        onSuccess(data.id)
      }
    } catch {
      toast.error('Error inesperado.')
    } finally {
      setIsLoading(false)
    }
  }

  // Other templates for depends_on
  const otherTemplates = allTemplates.filter((t) => !isEdit || t.id !== template.id)

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isLoading) onOpenChange(o) }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar template' : 'Nuevo template'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Modifica los datos generales del template.' : 'Crea un nuevo template de actividad.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem>
                  <FormLabel>C&oacute;digo</FormLabel>
                  <FormControl><Input placeholder="FERT-VEG-S1" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="activity_type_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de actividad</FormLabel>
                  <FormControl>
                    <select className={selectClass} value={field.value} onChange={field.onChange}>
                      {activityTypes.map((at) => (
                        <option key={at.id} value={at.id}>{at.name}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl><Input placeholder="Fertirrigaci&oacute;n Vegetativa Semana 1-2" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="frequency" render={({ field }) => (
                <FormItem>
                  <FormLabel>Frecuencia</FormLabel>
                  <FormControl>
                    <select className={selectClass} value={field.value} onChange={field.onChange}>
                      {Object.entries(frequencyLabels).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="estimated_duration_min" render={({ field }) => (
                <FormItem>
                  <FormLabel>Duraci&oacute;n (min)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      value={field.value}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Advanced section */}
            <button
              type="button"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              Configuraci&oacute;n avanzada
            </button>

            {showAdvanced && (
              <div className="space-y-4 rounded-md border p-3">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="trigger_day_from" render={({ field }) => (
                    <FormItem>
                      <FormLabel>D&iacute;a trigger desde</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="—"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="trigger_day_to" render={({ field }) => (
                    <FormItem>
                      <FormLabel>D&iacute;a trigger hasta</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="—"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="depends_on_template_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Depende de template</FormLabel>
                    <FormControl>
                      <select
                        className={selectClass}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      >
                        <option value="">— Ninguno —</option>
                        {otherTemplates.map((t) => (
                          <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="triggers_phase_change_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dispara cambio de fase</FormLabel>
                    <FormControl>
                      <select
                        className={selectClass}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      >
                        <option value="">— Ninguno —</option>
                        {phases.map((p) => (
                          <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="triggers_transformation" render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-2 space-y-0">
                    <FormLabel className="font-normal text-sm">Dispara transformaci&oacute;n de inventario</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />
              </div>
            )}

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
// SCHEDULE DIALOG
// ================================================================

export function ScheduleDialog({
  open,
  onOpenChange,
  schedule,
  cultivars,
  phases,
  templates,
  templatePhases,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  schedule: ScheduleRow | null
  cultivars: CultivarRef[]
  phases: PhaseRow[]
  templates: TemplateRow[]
  templatePhases: TemplatePhaseRow[]
  onSuccess: (newId?: string) => void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const isEdit = !!schedule

  const form = useForm<CultivationScheduleInput>({
    resolver: zodResolver(cultivationScheduleSchema),
    values: {
      name: schedule?.name ?? '',
      cultivar_id: schedule?.cultivar_id ?? (cultivars[0]?.id ?? ''),
    },
  })

  const selectedCultivarId = form.watch('cultivar_id')
  const selectedCultivar = cultivars.find((c) => c.id === selectedCultivarId)
  const cropTypeId = selectedCultivar?.crop_type_id
  const cultivarPhases = useMemo(
    () => phases.filter((p) => p.crop_type_id === cropTypeId).sort((a, b) => a.sort_order - b.sort_order),
    [phases, cropTypeId]
  )

  // Phase config state
  const [phaseConfig, setPhaseConfig] = useState<PhaseConfigItem[]>(() => {
    if (schedule?.phase_config) return schedule.phase_config
    return []
  })

  // Rebuild phase config when cultivar changes
  const configKey = `${selectedCultivarId}-${cultivarPhases.map((p) => p.id).join(',')}`
  const [lastConfigKey, setLastConfigKey] = useState(configKey)
  if (configKey !== lastConfigKey) {
    setLastConfigKey(configKey)
    if (!isEdit) {
      setPhaseConfig(
        cultivarPhases.map((p) => ({
          phase_id: p.id,
          duration_days: selectedCultivar?.phase_durations?.[p.id] ?? p.default_duration_days ?? 0,
          templates: [],
        }))
      )
    }
  }

  const totalDays = phaseConfig.reduce((sum, pc) => sum + (pc.duration_days || 0), 0)

  // Templates applicable to a phase
  function getApplicableTemplates(phaseId: string) {
    const tIds = templatePhases.filter((tp) => tp.phase_id === phaseId).map((tp) => tp.template_id)
    return templates.filter((t) => tIds.includes(t.id) && t.is_active)
  }

  function updatePhaseDuration(phaseId: string, days: number) {
    setPhaseConfig((prev) =>
      prev.map((pc) => (pc.phase_id === phaseId ? { ...pc, duration_days: days } : pc))
    )
  }

  function toggleTemplateInPhase(phaseId: string, templateId: string) {
    setPhaseConfig((prev) =>
      prev.map((pc) => {
        if (pc.phase_id !== phaseId) return pc
        const has = pc.templates.some((t) => t.template_id === templateId)
        return {
          ...pc,
          templates: has
            ? pc.templates.filter((t) => t.template_id !== templateId)
            : [...pc.templates, { template_id: templateId }],
        }
      })
    )
  }

  async function onSubmit(values: CultivationScheduleInput) {
    setIsLoading(true)
    const supabase = createClient()

    const payload = {
      name: values.name,
      cultivar_id: values.cultivar_id,
      total_days: totalDays || null,
      phase_config: phaseConfig as unknown as Json,
    }

    try {
      if (isEdit) {
        const { error } = await supabase
          .from('cultivation_schedules')
          .update(payload)
          .eq('id', schedule.id)
        if (error) { toast.error('Error al actualizar el plan.'); return }
        toast.success('Plan actualizado.')
        onSuccess()
      } else {
        const { data, error } = await supabase
          .from('cultivation_schedules')
          .insert(payload)
          .select('id')
          .single()
        if (error) { toast.error('Error al crear el plan.'); return }
        toast.success('Plan creado.')
        onSuccess(data.id)
      }
    } catch {
      toast.error('Error inesperado.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isLoading) onOpenChange(o) }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar plan de cultivo' : 'Nuevo plan de cultivo'}</DialogTitle>
          <DialogDescription>
            Configura las fases, duraciones y templates para este plan.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl><Input placeholder="Plan Gelato Indoor 127 d&iacute;as" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="cultivar_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cultivar</FormLabel>
                  <FormControl>
                    <select className={selectClass} value={field.value} onChange={field.onChange}>
                      {cultivars.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Phase config */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Configuraci&oacute;n por fase</p>
                <span className="text-sm text-muted-foreground">Total: {totalDays} d&iacute;as</span>
              </div>

              {cultivarPhases.length === 0 ? (
                <p className="text-sm text-muted-foreground">Selecciona un cultivar para ver sus fases.</p>
              ) : (
                cultivarPhases.map((p) => {
                  const pc = phaseConfig.find((c) => c.phase_id === p.id)
                  const applicable = getApplicableTemplates(p.id)
                  const assignedIds = new Set(pc?.templates.map((t) => t.template_id) ?? [])

                  return (
                    <div key={p.id} className="rounded-md border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{p.name}</span>
                        <Input
                          type="number"
                          min="0"
                          className="h-8 w-24 text-xs"
                          placeholder="D&iacute;as"
                          value={pc?.duration_days ?? 0}
                          onChange={(e) => updatePhaseDuration(p.id, parseInt(e.target.value, 10) || 0)}
                        />
                      </div>

                      {applicable.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {applicable.map((t) => {
                            const isSelected = assignedIds.has(t.id)
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => toggleTemplateInPhase(p.id, t.id)}
                                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs transition-colors ${
                                  isSelected
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-background hover:bg-muted border-input'
                                }`}
                              >
                                {t.name}
                              </button>
                            )
                          })}
                        </div>
                      )}

                      {applicable.length === 0 && (
                        <p className="text-xs text-muted-foreground italic">Sin templates asignados a esta fase.</p>
                      )}
                    </div>
                  )
                })
              )}
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
