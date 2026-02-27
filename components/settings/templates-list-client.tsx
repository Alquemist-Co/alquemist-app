'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Plus,
  Pencil,
  Power,
  Copy,
  ClipboardList,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
  type TemplateRow,
  type TemplatePhaseRow,
  type TemplateResourceRow,
  type TemplateChecklistRow,
  type ActivityType,
  type CropType,
  type PhaseRow,
  frequencyLabels,
  selectClass,
  TemplateDialog,
} from './templates-shared'

type Props = {
  templates: TemplateRow[]
  templatePhases: TemplatePhaseRow[]
  templateResources: TemplateResourceRow[]
  templateChecklist: TemplateChecklistRow[]
  activityTypes: ActivityType[]
  cropTypes: CropType[]
  phases: PhaseRow[]
  allTemplates: TemplateRow[]
  canWrite: boolean
}

export function TemplatesListClient({
  templates,
  templatePhases,
  templateResources,
  templateChecklist,
  activityTypes,
  cropTypes,
  phases,
  allTemplates,
  canWrite,
}: Props) {
  const router = useRouter()
  const [showInactive, setShowInactive] = useState(false)
  const [filterTypeId, setFilterTypeId] = useState('')
  const [filterFrequency, setFilterFrequency] = useState('')
  const [filterCropTypeId, setFilterCropTypeId] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<TemplateRow | null>(null)
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
    router.push(`/settings/activity-templates/templates/${newT.id}`)
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
            const tpIds = phaseIdsByTemplate[t.id] || []
            const phaseNames = tpIds
              .map((pid) => phases.find((p) => p.id === pid)?.name)
              .filter(Boolean)

            return (
              <Card
                key={t.id}
                className={`cursor-pointer transition-colors hover:border-primary/40 ${!t.is_active ? 'opacity-50' : ''}`}
                onClick={() => router.push(`/settings/activity-templates/templates/${t.id}`)}
              >
                <CardContent className="p-0">
                  <div className="flex items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{t.name}</span>
                        <span className="text-xs text-muted-foreground">{t.code}</span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="text-xs">
                          {typeNameMap[t.activity_type_id] ?? '\u2014'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {frequencyLabels[t.frequency] ?? t.frequency}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{t.estimated_duration_min}min</span>
                        {phaseNames.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            &middot; {phaseNames.length} fase{phaseNames.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          &middot; {resourceCount[t.id] || 0} rec &middot; {checklistCount[t.id] || 0} pasos
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
          if (newId) {
            router.push(`/settings/activity-templates/templates/${newId}`)
          } else {
            router.refresh()
          }
        }}
      />

      {/* Deactivate confirm */}
      <AlertDialog open={!!deactivating} onOpenChange={(o) => !o && setDeactivating(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar template</AlertDialogTitle>
            <AlertDialogDescription>
              &iquest;Desactivar &quot;{deactivating?.name}&quot;? No se podr&aacute; usar en nuevos planes de cultivo.
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
