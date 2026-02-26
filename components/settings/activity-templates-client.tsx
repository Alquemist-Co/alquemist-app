'use client'

import type { Json } from '@/types/database'
import { useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import {
  Plus,
  Pencil,
  Power,
  Copy,
  Trash2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

type TemplateRow = {
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

type TemplatePhaseRow = { id: string; template_id: string; phase_id: string }
type TemplateResourceRow = {
  id: string
  template_id: string
  product_id: string | null
  quantity: number
  quantity_basis: 'fixed' | 'per_plant' | 'per_m2' | 'per_zone' | 'per_L_solution'
  is_optional: boolean
  sort_order: number
  notes: string | null
}
type TemplateChecklistRow = {
  id: string
  template_id: string
  step_order: number
  instruction: string
  is_critical: boolean
  requires_photo: boolean
  expected_value: string | null
  tolerance: string | null
}

type PhaseConfigItem = {
  phase_id: string
  duration_days: number
  templates: { template_id: string }[]
}

type ScheduleRow = {
  id: string
  company_id: string
  name: string
  cultivar_id: string
  total_days: number | null
  phase_config: PhaseConfigItem[] | null
  is_active: boolean
  cultivar: { name: string; crop_type_id: string } | null
}

type ActivityType = { id: string; name: string }
type CropType = { id: string; name: string }
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
type CultivarRef = {
  id: string
  crop_type_id: string
  code: string
  name: string
  phase_durations: Record<string, number> | null
}

type Props = {
  templates: TemplateRow[]
  templatePhases: TemplatePhaseRow[]
  templateResources: TemplateResourceRow[]
  templateChecklist: TemplateChecklistRow[]
  schedules: ScheduleRow[]
  activityTypes: ActivityType[]
  cropTypes: CropType[]
  phases: PhaseRow[]
  cultivars: CultivarRef[]
  canWrite: boolean
}

// ---------- Constants ----------

const frequencyLabels: Record<string, string> = {
  daily: 'Diaria',
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  once: 'Una vez',
  on_demand: 'A demanda',
}

const basisLabels: Record<string, string> = {
  fixed: 'Fija',
  per_plant: 'Por planta',
  per_m2: 'Por m²',
  per_zone: 'Por zona',
  per_L_solution: 'Por L solución',
}

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring'

// ================================================================
// MAIN COMPONENT
// ================================================================

export function ActivityTemplatesClient({
  templates,
  templatePhases,
  templateResources,
  templateChecklist,
  schedules,
  activityTypes,
  cropTypes,
  phases,
  cultivars,
  canWrite,
}: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const currentTab = searchParams.get('tab') || 'templates'

  function setTab(tab: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.push(`?${params.toString()}`, { scroll: false })
  }

  return (
    <Tabs value={currentTab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="templates">Templates</TabsTrigger>
        <TabsTrigger value="schedules">Planes de Cultivo</TabsTrigger>
      </TabsList>

      <TabsContent value="templates" className="mt-4">
        <TemplatesTab
          templates={templates}
          templatePhases={templatePhases}
          templateResources={templateResources}
          templateChecklist={templateChecklist}
          activityTypes={activityTypes}
          cropTypes={cropTypes}
          phases={phases}
          allTemplates={templates}
          canWrite={canWrite}
        />
      </TabsContent>

      <TabsContent value="schedules" className="mt-4">
        <SchedulesTab
          schedules={schedules}
          cultivars={cultivars}
          phases={phases}
          templates={templates}
          templatePhases={templatePhases}
          canWrite={canWrite}
        />
      </TabsContent>
    </Tabs>
  )
}

// ================================================================
// TAB 1: TEMPLATES
// ================================================================

function TemplatesTab({
  templates,
  templatePhases,
  templateResources,
  templateChecklist,
  activityTypes,
  cropTypes,
  phases,
  allTemplates,
  canWrite,
}: {
  templates: TemplateRow[]
  templatePhases: TemplatePhaseRow[]
  templateResources: TemplateResourceRow[]
  templateChecklist: TemplateChecklistRow[]
  activityTypes: ActivityType[]
  cropTypes: CropType[]
  phases: PhaseRow[]
  allTemplates: TemplateRow[]
  canWrite: boolean
}) {
  const router = useRouter()
  const [showInactive, setShowInactive] = useState(false)
  const [filterTypeId, setFilterTypeId] = useState('')
  const [filterFrequency, setFilterFrequency] = useState('')
  const [filterCropTypeId, setFilterCropTypeId] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<TemplateRow | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deactivating, setDeactivating] = useState<TemplateRow | null>(null)

  // Get activity type name by ID
  const typeNameMap = useMemo(() => {
    const m: Record<string, string> = {}
    for (const t of activityTypes) m[t.id] = t.name
    return m
  }, [activityTypes])

  // Count resources and checklist per template
  const resourceCount = useMemo(() => {
    const m: Record<string, number> = {}
    for (const r of templateResources) m[r.template_id] = (m[r.template_id] || 0) + 1
    return m
  }, [templateResources])

  const checklistCount = useMemo(() => {
    const m: Record<string, number> = {}
    for (const c of templateChecklist) m[c.template_id] = (m[c.template_id] || 0) + 1
    return m
  }, [templateChecklist])

  // Phase IDs per template
  const phaseIdsByTemplate = useMemo(() => {
    const m: Record<string, string[]> = {}
    for (const tp of templatePhases) {
      if (!m[tp.template_id]) m[tp.template_id] = []
      m[tp.template_id].push(tp.phase_id)
    }
    return m
  }, [templatePhases])

  // Filtered templates
  const filtered = useMemo(() => {
    let list = templates
    if (!showInactive) list = list.filter((t) => t.is_active)
    if (filterTypeId) list = list.filter((t) => t.activity_type_id === filterTypeId)
    if (filterFrequency) list = list.filter((t) => t.frequency === filterFrequency)
    if (filterCropTypeId) {
      const cropPhaseIds = new Set(phases.filter((p) => p.crop_type_id === filterCropTypeId).map((p) => p.id))
      list = list.filter((t) => {
        const tpIds = phaseIdsByTemplate[t.id] || []
        return tpIds.some((pid) => cropPhaseIds.has(pid))
      })
    }
    return list
  }, [templates, showInactive, filterTypeId, filterFrequency, filterCropTypeId, phases, phaseIdsByTemplate])

  function openNew() {
    setEditingTemplate(null)
    setDialogOpen(true)
  }

  function openEdit(t: TemplateRow) {
    setEditingTemplate(t)
    setDialogOpen(true)
  }

  async function handleToggle(t: TemplateRow) {
    const supabase = createClient()
    const { error } = await supabase
      .from('activity_templates')
      .update({ is_active: !t.is_active })
      .eq('id', t.id)
    if (error) {
      toast.error('Error al cambiar el estado.')
      return
    }
    toast.success(t.is_active ? 'Template desactivado.' : 'Template reactivado.')
    router.refresh()
  }

  async function handleDuplicate(t: TemplateRow) {
    const supabase = createClient()
    const { data: newT, error } = await supabase
      .from('activity_templates')
      .insert({
        code: `${t.code}-COPY`,
        activity_type_id: t.activity_type_id,
        name: `${t.name} (Copia)`,
        frequency: t.frequency,
        estimated_duration_min: t.estimated_duration_min,
        trigger_day_from: t.trigger_day_from,
        trigger_day_to: t.trigger_day_to,
        depends_on_template_id: t.depends_on_template_id,
        triggers_phase_change_id: t.triggers_phase_change_id,
        triggers_transformation: t.triggers_transformation,
        metadata: t.metadata as Record<string, string>,
      })
      .select('id')
      .single()

    if (error) {
      toast.error('Error al duplicar template.')
      return
    }

    // Copy phases
    const tPhases = templatePhases.filter((tp) => tp.template_id === t.id)
    if (tPhases.length > 0) {
      await supabase.from('activity_template_phases').insert(
        tPhases.map((tp) => ({ template_id: newT.id, phase_id: tp.phase_id }))
      )
    }

    // Copy resources
    const tResources = templateResources.filter((r) => r.template_id === t.id)
    if (tResources.length > 0) {
      await supabase.from('activity_template_resources').insert(
        tResources.map((r) => ({
          template_id: newT.id,
          product_id: r.product_id,
          quantity: r.quantity,
          quantity_basis: r.quantity_basis,
          is_optional: r.is_optional,
          sort_order: r.sort_order,
          notes: r.notes,
        }))
      )
    }

    // Copy checklist
    const tChecklist = templateChecklist.filter((c) => c.template_id === t.id)
    if (tChecklist.length > 0) {
      await supabase.from('activity_template_checklist').insert(
        tChecklist.map((c) => ({
          template_id: newT.id,
          step_order: c.step_order,
          instruction: c.instruction,
          is_critical: c.is_critical,
          requires_photo: c.requires_photo,
          expected_value: c.expected_value,
          tolerance: c.tolerance,
        }))
      )
    }

    toast.success('Template duplicado.')
    setExpandedId(newT.id)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select className={selectClass + ' w-44'} value={filterTypeId} onChange={(e) => setFilterTypeId(e.target.value)}>
          <option value="">Todos los tipos</option>
          {activityTypes.map((at) => (
            <option key={at.id} value={at.id}>{at.name}</option>
          ))}
        </select>
        <select className={selectClass + ' w-36'} value={filterFrequency} onChange={(e) => setFilterFrequency(e.target.value)}>
          <option value="">Toda frecuencia</option>
          {Object.entries(frequencyLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select className={selectClass + ' w-44'} value={filterCropTypeId} onChange={(e) => setFilterCropTypeId(e.target.value)}>
          <option value="">Todo crop type</option>
          {cropTypes.map((ct) => (
            <option key={ct.id} value={ct.id}>{ct.name}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox checked={showInactive} onCheckedChange={(v) => setShowInactive(!!v)} />
          Inactivos
        </label>
        <div className="ml-auto">
          {canWrite && (
            <Button size="sm" onClick={openNew}>
              <Plus className="mr-1.5 h-4 w-4" /> Nuevo template
            </Button>
          )}
        </div>
      </div>

      {/* Template list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ClipboardList className="mb-3 h-10 w-10" />
            <p className="text-sm text-center">Crea tu primer template de actividad.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => {
            const isExpanded = expandedId === t.id
            const tpIds = phaseIdsByTemplate[t.id] || []
            const phaseNames = tpIds
              .map((pid) => phases.find((p) => p.id === pid)?.name)
              .filter(Boolean)

            return (
              <Card key={t.id} className={`${!t.is_active ? 'opacity-50' : ''}`}>
                <CardContent className="p-0">
                  {/* Header row */}
                  <div
                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedId(isExpanded ? null : t.id)}
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{t.name}</span>
                        <span className="text-xs text-muted-foreground">{t.code}</span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="text-xs">
                          {typeNameMap[t.activity_type_id] ?? '—'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {frequencyLabels[t.frequency] ?? t.frequency}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{t.estimated_duration_min}min</span>
                        {phaseNames.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            · {phaseNames.length} fase{phaseNames.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          · {resourceCount[t.id] || 0} rec · {checklistCount[t.id] || 0} pasos
                        </span>
                      </div>
                    </div>

                    {canWrite && (
                      <div className="flex shrink-0 gap-0.5" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(t)}>
                          <Pencil className="mr-1 h-3 w-3" /> Editar
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleDuplicate(t)}>
                          <Copy className="mr-1 h-3 w-3" /> Duplicar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => t.is_active ? setDeactivating(t) : handleToggle(t)}
                        >
                          <Power className="mr-1 h-3 w-3" />
                          {t.is_active ? 'Desact.' : 'React.'}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t px-4 pb-4 space-y-4">
                      {/* Phases sub-section */}
                      <TemplatePhasesSub
                        templateId={t.id}
                        templatePhases={templatePhases.filter((tp) => tp.template_id === t.id)}
                        cropTypes={cropTypes}
                        phases={phases}
                        canWrite={canWrite}
                      />

                      {/* Resources sub-section */}
                      <TemplateResourcesSub
                        templateId={t.id}
                        resources={templateResources.filter((r) => r.template_id === t.id)}
                        canWrite={canWrite}
                      />

                      {/* Checklist sub-section */}
                      <TemplateChecklistSub
                        templateId={t.id}
                        checklist={templateChecklist.filter((c) => c.template_id === t.id)}
                        canWrite={canWrite}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Template Dialog */}
      <TemplateDialog
        open={dialogOpen}
        onOpenChange={(o) => { if (!o) { setDialogOpen(false); setEditingTemplate(null) } else setDialogOpen(true) }}
        template={editingTemplate}
        activityTypes={activityTypes}
        allTemplates={allTemplates}
        phases={phases}
        onSuccess={(newId) => {
          setDialogOpen(false)
          setEditingTemplate(null)
          if (newId) setExpandedId(newId)
          router.refresh()
        }}
      />

      {/* Deactivate confirm */}
      <AlertDialog open={!!deactivating} onOpenChange={(o) => !o && setDeactivating(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar template</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Desactivar &quot;{deactivating?.name}&quot;? No se podrá usar en nuevos planes de cultivo.
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
// TEMPLATE DIALOG
// ================================================================

function TemplateDialog({
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
            form.setError('code', { message: 'Ya existe un template con este código' })
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
            form.setError('code', { message: 'Ya existe un template con este código' })
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
                  <FormLabel>Código</FormLabel>
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
                <FormControl><Input placeholder="Fertirrigación Vegetativa Semana 1-2" {...field} /></FormControl>
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
                  <FormLabel>Duración (min)</FormLabel>
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
              Configuración avanzada
            </button>

            {showAdvanced && (
              <div className="space-y-4 rounded-md border p-3">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="trigger_day_from" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Día trigger desde</FormLabel>
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
                      <FormLabel>Día trigger hasta</FormLabel>
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
                    <FormLabel className="font-normal text-sm">Dispara transformación de inventario</FormLabel>
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
// SUB-SECTION B: TEMPLATE PHASES
// ================================================================

function TemplatePhasesSub({
  templateId,
  templatePhases,
  cropTypes,
  phases,
  canWrite,
}: {
  templateId: string
  templatePhases: TemplatePhaseRow[]
  cropTypes: CropType[]
  phases: PhaseRow[]
  canWrite: boolean
}) {
  const router = useRouter()
  const [filterCropTypeId, setFilterCropTypeId] = useState(cropTypes[0]?.id ?? '')
  const assignedPhaseIds = new Set(templatePhases.map((tp) => tp.phase_id))
  const filteredPhases = phases.filter((p) => p.crop_type_id === filterCropTypeId)

  async function togglePhase(phaseId: string) {
    const supabase = createClient()
    if (assignedPhaseIds.has(phaseId)) {
      const row = templatePhases.find((tp) => tp.phase_id === phaseId)
      if (!row) return
      const { error } = await supabase.from('activity_template_phases').delete().eq('id', row.id)
      if (error) { toast.error('Error al quitar fase.'); return }
    } else {
      const { error } = await supabase.from('activity_template_phases').insert({ template_id: templateId, phase_id: phaseId })
      if (error) { toast.error('Error al agregar fase.'); return }
    }
    router.refresh()
  }

  return (
    <div className="pt-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Fases Aplicables</p>
      <div className="flex items-center gap-2 mb-2">
        <select className={selectClass + ' w-44 h-8 text-xs'} value={filterCropTypeId} onChange={(e) => setFilterCropTypeId(e.target.value)}>
          {cropTypes.map((ct) => (
            <option key={ct.id} value={ct.id}>{ct.name}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        {filteredPhases.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin fases para este tipo de cultivo.</p>
        ) : (
          filteredPhases.map((p) => {
            const isAssigned = assignedPhaseIds.has(p.id)
            return (
              <button
                key={p.id}
                type="button"
                disabled={!canWrite}
                onClick={() => togglePhase(p.id)}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ${
                  isAssigned
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted border-input'
                } ${!canWrite ? 'cursor-default' : 'cursor-pointer'}`}
              >
                {p.name}
              </button>
            )
          })
        )}
      </div>
      {/* Show all assigned phases as badges (across crop types) */}
      {templatePhases.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {templatePhases.map((tp) => {
            const phase = phases.find((p) => p.id === tp.phase_id)
            return (
              <Badge key={tp.id} variant="secondary" className="text-xs">
                {phase?.name ?? tp.phase_id}
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ================================================================
// SUB-SECTION C: TEMPLATE RESOURCES
// ================================================================

function TemplateResourcesSub({
  templateId,
  resources,
  canWrite,
}: {
  templateId: string
  resources: TemplateResourceRow[]
  canWrite: boolean
}) {
  const router = useRouter()

  async function handleAdd() {
    const supabase = createClient()
    const nextSort = resources.length > 0 ? Math.max(...resources.map((r) => r.sort_order)) + 1 : 0
    const { error } = await supabase.from('activity_template_resources').insert({
      template_id: templateId,
      quantity: 1,
      quantity_basis: 'fixed' as const,
      sort_order: nextSort,
    })
    if (error) { toast.error('Error al agregar recurso.'); return }
    router.refresh()
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('activity_template_resources').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar recurso.'); return }
    router.refresh()
  }

  async function handleUpdate(id: string, field: string, value: unknown) {
    const supabase = createClient()
    const { error } = await supabase.from('activity_template_resources').update({ [field]: value }).eq('id', id)
    if (error) { toast.error('Error al actualizar.'); return }
    router.refresh()
  }

  return (
    <div className="pt-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recursos</p>
        {canWrite && (
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleAdd}>
            <Plus className="mr-1 h-3 w-3" /> Agregar recurso
          </Button>
        )}
      </div>

      {resources.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Sin recursos configurados.</p>
      ) : (
        <div className="space-y-2">
          {resources.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm">
              {/* Quantity */}
              {canWrite ? (
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="h-8 w-20 text-xs"
                  defaultValue={r.quantity}
                  onBlur={(e) => handleUpdate(r.id, 'quantity', parseFloat(e.target.value) || 1)}
                />
              ) : (
                <span className="text-xs">{r.quantity}</span>
              )}

              {/* Basis */}
              {canWrite ? (
                <select
                  className={selectClass + ' w-32 h-8 text-xs'}
                  value={r.quantity_basis}
                  onChange={(e) => handleUpdate(r.id, 'quantity_basis', e.target.value)}
                >
                  {Object.entries(basisLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              ) : (
                <Badge variant="outline" className="text-xs">{basisLabels[r.quantity_basis]}</Badge>
              )}

              {/* Optional toggle */}
              {canWrite ? (
                <div className="flex items-center gap-1">
                  <Switch
                    checked={r.is_optional}
                    onCheckedChange={(v) => handleUpdate(r.id, 'is_optional', v)}
                    className="scale-75"
                  />
                  <span className="text-xs text-muted-foreground">Opcional</span>
                </div>
              ) : (
                r.is_optional && <Badge variant="outline" className="text-xs">Opcional</Badge>
              )}

              {/* Notes */}
              {canWrite ? (
                <Input
                  className="h-8 flex-1 min-w-[100px] text-xs"
                  placeholder="Notas..."
                  defaultValue={r.notes ?? ''}
                  onBlur={(e) => handleUpdate(r.id, 'notes', e.target.value || null)}
                />
              ) : (
                r.notes && <span className="text-xs text-muted-foreground">{r.notes}</span>
              )}

              {/* No product_id available yet */}
              {!r.product_id && (
                <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 shrink-0" />
              )}

              {canWrite && (
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 ml-auto" onClick={() => handleDelete(r.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
          {canWrite && (
            <p className="text-xs text-muted-foreground">
              Los productos se configuran en Inventario &gt; Productos (Fase 3). Los recursos se guardan sin producto por ahora.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ================================================================
// SUB-SECTION D: TEMPLATE CHECKLIST
// ================================================================

function TemplateChecklistSub({
  templateId,
  checklist,
  canWrite,
}: {
  templateId: string
  checklist: TemplateChecklistRow[]
  canWrite: boolean
}) {
  const router = useRouter()
  const sorted = [...checklist].sort((a, b) => a.step_order - b.step_order)

  async function handleAdd() {
    const supabase = createClient()
    const nextOrder = sorted.length > 0 ? Math.max(...sorted.map((c) => c.step_order)) + 1 : 1
    const { error } = await supabase.from('activity_template_checklist').insert({
      template_id: templateId,
      step_order: nextOrder,
      instruction: 'Nuevo paso',
    })
    if (error) { toast.error('Error al agregar paso.'); return }
    router.refresh()
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('activity_template_checklist').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar paso.'); return }
    router.refresh()
  }

  async function handleUpdate(id: string, field: string, value: unknown) {
    const supabase = createClient()
    const { error } = await supabase.from('activity_template_checklist').update({ [field]: value }).eq('id', id)
    if (error) { toast.error('Error al actualizar.'); return }
    router.refresh()
  }

  async function handleReorder(id: string, direction: 'up' | 'down') {
    const idx = sorted.findIndex((c) => c.id === id)
    if (idx < 0) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return

    const supabase = createClient()
    const a = sorted[idx]
    const b = sorted[swapIdx]

    await Promise.all([
      supabase.from('activity_template_checklist').update({ step_order: b.step_order }).eq('id', a.id),
      supabase.from('activity_template_checklist').update({ step_order: a.step_order }).eq('id', b.id),
    ])
    router.refresh()
  }

  return (
    <div className="pt-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Checklist</p>
        {canWrite && (
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleAdd}>
            <Plus className="mr-1 h-3 w-3" /> Agregar paso
          </Button>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Sin pasos de verificación.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((step, idx) => (
            <div
              key={step.id}
              className={`flex items-start gap-2 rounded-md border p-2 text-sm ${
                step.is_critical ? 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10' : ''
              }`}
            >
              {/* Reorder buttons */}
              {canWrite && (
                <div className="flex flex-col gap-0.5 pt-0.5">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleReorder(step.id, 'up')}
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === sorted.length - 1}
                    onClick={() => handleReorder(step.id, 'down')}
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>
              )}

              <span className="text-xs font-mono text-muted-foreground w-4 pt-1">{step.step_order}</span>

              <div className="flex-1 min-w-0 space-y-1">
                {canWrite ? (
                  <Input
                    className="h-8 text-xs"
                    defaultValue={step.instruction}
                    onBlur={(e) => handleUpdate(step.id, 'instruction', e.target.value)}
                  />
                ) : (
                  <span className="text-sm">{step.instruction}</span>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  {canWrite ? (
                    <>
                      <label className="flex items-center gap-1 text-xs">
                        <Switch
                          checked={step.is_critical}
                          onCheckedChange={(v) => handleUpdate(step.id, 'is_critical', v)}
                          className="scale-75"
                        />
                        Crítico
                      </label>
                      <label className="flex items-center gap-1 text-xs">
                        <Switch
                          checked={step.requires_photo}
                          onCheckedChange={(v) => handleUpdate(step.id, 'requires_photo', v)}
                          className="scale-75"
                        />
                        Foto
                      </label>
                      <Input
                        className="h-7 w-24 text-xs"
                        placeholder="Valor esp."
                        defaultValue={step.expected_value ?? ''}
                        onBlur={(e) => handleUpdate(step.id, 'expected_value', e.target.value || null)}
                      />
                      <Input
                        className="h-7 w-20 text-xs"
                        placeholder="Tolerancia"
                        defaultValue={step.tolerance ?? ''}
                        onBlur={(e) => handleUpdate(step.id, 'tolerance', e.target.value || null)}
                      />
                    </>
                  ) : (
                    <>
                      {step.is_critical && <Badge variant="destructive" className="text-xs">Crítico</Badge>}
                      {step.requires_photo && <Badge variant="outline" className="text-xs">Requiere foto</Badge>}
                      {step.expected_value && <span className="text-xs text-muted-foreground">Esperado: {step.expected_value}</span>}
                      {step.tolerance && <span className="text-xs text-muted-foreground">±{step.tolerance}</span>}
                    </>
                  )}
                </div>
              </div>

              {canWrite && (
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleDelete(step.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ================================================================
// TAB 2: CULTIVATION SCHEDULES
// ================================================================

function SchedulesTab({
  schedules,
  cultivars,
  phases,
  templates,
  templatePhases,
  canWrite,
}: {
  schedules: ScheduleRow[]
  cultivars: CultivarRef[]
  phases: PhaseRow[]
  templates: TemplateRow[]
  templatePhases: TemplatePhaseRow[]
  canWrite: boolean
}) {
  const router = useRouter()
  const [showInactive, setShowInactive] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<ScheduleRow | null>(null)
  const [deactivating, setDeactivating] = useState<ScheduleRow | null>(null)

  const filtered = showInactive ? schedules : schedules.filter((s) => s.is_active)

  function openNew() {
    setEditingSchedule(null)
    setDialogOpen(true)
  }

  function openEdit(s: ScheduleRow) {
    setEditingSchedule(s)
    setDialogOpen(true)
  }

  async function handleToggle(s: ScheduleRow) {
    const supabase = createClient()
    const { error } = await supabase
      .from('cultivation_schedules')
      .update({ is_active: !s.is_active })
      .eq('id', s.id)
    if (error) { toast.error('Error al cambiar el estado.'); return }
    toast.success(s.is_active ? 'Plan desactivado.' : 'Plan reactivado.')
    router.refresh()
  }

  async function handleDuplicate(s: ScheduleRow) {
    const supabase = createClient()
    const { error } = await supabase
      .from('cultivation_schedules')
      .insert({
        name: `${s.name} (Copia)`,
        cultivar_id: s.cultivar_id,
        total_days: s.total_days,
        phase_config: s.phase_config as unknown as Json,
      })
    if (error) { toast.error('Error al duplicar plan.'); return }
    toast.success('Plan duplicado.')
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox checked={showInactive} onCheckedChange={(v) => setShowInactive(!!v)} />
          Inactivos
        </label>
        <div className="ml-auto">
          {canWrite && (
            <Button size="sm" onClick={openNew}>
              <Plus className="mr-1.5 h-4 w-4" /> Nuevo plan
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ClipboardList className="mb-3 h-10 w-10" />
            <p className="text-sm text-center">Crea tu primer plan de cultivo.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => {
            const phaseCount = s.phase_config?.length ?? 0
            return (
              <Card key={s.id} className={!s.is_active ? 'opacity-50' : ''}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-sm">{s.name}</span>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{s.cultivar?.name ?? '—'}</span>
                        {s.total_days && <><span>·</span><span>{s.total_days} días</span></>}
                        <span>·</span>
                        <span>{phaseCount} fases</span>
                      </div>
                    </div>
                    {!s.is_active && (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-500 text-xs">Inactivo</Badge>
                    )}
                  </div>

                  {canWrite && (
                    <div className="mt-2 flex gap-1 border-t pt-2">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(s)}>
                        <Pencil className="mr-1 h-3 w-3" /> Editar
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleDuplicate(s)}>
                        <Copy className="mr-1 h-3 w-3" /> Duplicar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => s.is_active ? setDeactivating(s) : handleToggle(s)}
                      >
                        <Power className="mr-1 h-3 w-3" />
                        {s.is_active ? 'Desact.' : 'React.'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Schedule Dialog */}
      <ScheduleDialog
        open={dialogOpen}
        onOpenChange={(o) => { if (!o) { setDialogOpen(false); setEditingSchedule(null) } else setDialogOpen(true) }}
        schedule={editingSchedule}
        cultivars={cultivars}
        phases={phases}
        templates={templates}
        templatePhases={templatePhases}
        onSuccess={() => {
          setDialogOpen(false)
          setEditingSchedule(null)
          router.refresh()
        }}
      />

      {/* Deactivate confirm */}
      <AlertDialog open={!!deactivating} onOpenChange={(o) => !o && setDeactivating(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar plan</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Desactivar &quot;{deactivating?.name}&quot;? No se podrá usar para nuevos batches.
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
// SCHEDULE DIALOG
// ================================================================

function ScheduleDialog({
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
  onSuccess: () => void
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
      } else {
        const { error } = await supabase
          .from('cultivation_schedules')
          .insert(payload)
        if (error) { toast.error('Error al crear el plan.'); return }
        toast.success('Plan creado.')
      }
      onSuccess()
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
                  <FormControl><Input placeholder="Plan Gelato Indoor 127 días" {...field} /></FormControl>
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
                <p className="text-sm font-medium">Configuración por fase</p>
                <span className="text-sm text-muted-foreground">Total: {totalDays} días</span>
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
                          placeholder="Días"
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
