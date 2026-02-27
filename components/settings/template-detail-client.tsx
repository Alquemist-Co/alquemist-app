'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Plus,
  Pencil,
  Power,
  Trash2,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
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

import { DetailPageHeader } from './detail-page-header'
import {
  type TemplateRow,
  type TemplatePhaseRow,
  type TemplateResourceRow,
  type TemplateChecklistRow,
  type ActivityType,
  type CropType,
  type PhaseRow,
  frequencyLabels,
  basisLabels,
  selectClass,
  TemplateDialog,
} from './templates-shared'

type Props = {
  template: TemplateRow
  templatePhases: TemplatePhaseRow[]
  templateResources: TemplateResourceRow[]
  templateChecklist: TemplateChecklistRow[]
  activityTypes: ActivityType[]
  cropTypes: CropType[]
  phases: PhaseRow[]
  allTemplates: TemplateRow[]
  canWrite: boolean
}

export function TemplateDetailClient({
  template,
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
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deactivating, setDeactivating] = useState(false)

  const typeNameMap = useMemo(() => {
    const m: Record<string, string> = {}
    for (const t of activityTypes) m[t.id] = t.name
    return m
  }, [activityTypes])

  async function handleToggle() {
    const supabase = createClient()
    const { error } = await supabase
      .from('activity_templates')
      .update({ is_active: !template.is_active })
      .eq('id', template.id)
    if (error) {
      toast.error('Error al cambiar el estado.')
      return
    }
    toast.success(template.is_active ? 'Template desactivado.' : 'Template reactivado.')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <DetailPageHeader
        backHref="/settings/activity-templates?tab=templates"
        backLabel="Templates de Actividad"
        title={template.name}
        subtitle={template.code}
        badges={
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="text-xs">
              {typeNameMap[template.activity_type_id] ?? '\u2014'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {frequencyLabels[template.frequency] ?? template.frequency}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {template.estimated_duration_min}min
            </Badge>
            {!template.is_active && (
              <Badge variant="secondary" className="bg-gray-100 text-gray-500 text-xs">Inactivo</Badge>
            )}
          </div>
        }
        actions={
          canWrite ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => template.is_active ? setDeactivating(true) : handleToggle()}
              >
                <Power className="mr-1 h-3.5 w-3.5" />
                {template.is_active ? 'Desactivar' : 'Reactivar'}
              </Button>
            </>
          ) : undefined
        }
      />

      {/* Phases section */}
      <TemplatePhasesSub
        templateId={template.id}
        templatePhases={templatePhases}
        cropTypes={cropTypes}
        phases={phases}
        canWrite={canWrite}
      />

      {/* Resources section */}
      <TemplateResourcesSub
        templateId={template.id}
        resources={templateResources}
        canWrite={canWrite}
      />

      {/* Checklist section */}
      <TemplateChecklistSub
        templateId={template.id}
        checklist={templateChecklist}
        canWrite={canWrite}
      />

      {/* Template Dialog */}
      <TemplateDialog
        open={dialogOpen}
        onOpenChange={(o) => { if (!o) setDialogOpen(false); else setDialogOpen(true) }}
        template={template}
        activityTypes={activityTypes}
        allTemplates={allTemplates}
        phases={phases}
        onSuccess={() => {
          setDialogOpen(false)
          router.refresh()
        }}
      />

      {/* Deactivate confirm */}
      <AlertDialog open={deactivating} onOpenChange={(o) => !o && setDeactivating(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar template</AlertDialogTitle>
            <AlertDialogDescription>
              &iquest;Desactivar &quot;{template.name}&quot;? No se podr&aacute; usar en nuevos planes de cultivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { handleToggle(); setDeactivating(false) }}>
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ================================================================
// SUB-SECTION: TEMPLATE PHASES
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
    <div className="rounded-lg border p-4">
      <p className="text-sm font-medium uppercase tracking-wide mb-3">Fases Aplicables</p>
      <div className="flex items-center gap-2 mb-3">
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
// SUB-SECTION: TEMPLATE RESOURCES
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
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium uppercase tracking-wide">Recursos</p>
        {canWrite && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleAdd}>
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
// SUB-SECTION: TEMPLATE CHECKLIST
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
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium uppercase tracking-wide">Checklist</p>
        {canWrite && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleAdd}>
            <Plus className="mr-1 h-3 w-3" /> Agregar paso
          </Button>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Sin pasos de verificaci&oacute;n.</p>
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
                        Cr&iacute;tico
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
                      {step.is_critical && <Badge variant="destructive" className="text-xs">Cr&iacute;tico</Badge>}
                      {step.requires_photo && <Badge variant="outline" className="text-xs">Requiere foto</Badge>}
                      {step.expected_value && <span className="text-xs text-muted-foreground">Esperado: {step.expected_value}</span>}
                      {step.tolerance && <span className="text-xs text-muted-foreground">&plusmn;{step.tolerance}</span>}
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
