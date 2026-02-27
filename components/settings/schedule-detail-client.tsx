'use client'

import type { Json } from '@/types/database'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Pencil, Power } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  type ScheduleRow,
  type TemplateRow,
  type TemplatePhaseRow,
  type CultivarRef,
  type PhaseRow,
  type PhaseConfigItem,
  ScheduleDialog,
} from './templates-shared'

type Props = {
  schedule: ScheduleRow
  cultivars: CultivarRef[]
  phases: PhaseRow[]
  templates: TemplateRow[]
  templatePhases: TemplatePhaseRow[]
  canWrite: boolean
}

export function ScheduleDetailClient({
  schedule,
  cultivars,
  phases,
  templates,
  templatePhases,
  canWrite,
}: Props) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [phaseConfig, setPhaseConfig] = useState<PhaseConfigItem[]>(schedule.phase_config ?? [])
  const [saving, setSaving] = useState(false)

  const cultivar = cultivars.find((c) => c.id === schedule.cultivar_id)
  const cropTypeId = cultivar?.crop_type_id
  const cultivarPhases = useMemo(
    () => phases.filter((p) => p.crop_type_id === cropTypeId).sort((a, b) => a.sort_order - b.sort_order),
    [phases, cropTypeId]
  )

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

  async function handleSaveConfig() {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('cultivation_schedules')
      .update({
        total_days: totalDays || null,
        phase_config: phaseConfig as unknown as Json,
      })
      .eq('id', schedule.id)
    setSaving(false)
    if (error) { toast.error('Error al guardar la configuraci\u00F3n.'); return }
    toast.success('Configuraci\u00F3n guardada.')
    router.refresh()
  }

  async function handleToggle() {
    const supabase = createClient()
    const { error } = await supabase
      .from('cultivation_schedules')
      .update({ is_active: !schedule.is_active })
      .eq('id', schedule.id)
    if (error) { toast.error('Error al cambiar el estado.'); return }
    toast.success(schedule.is_active ? 'Plan desactivado.' : 'Plan reactivado.')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <DetailPageHeader
        backHref="/settings/activity-templates?tab=schedules"
        backLabel="Planes de Cultivo"
        title={schedule.name}
        subtitle={cultivar?.name ?? null}
        badges={
          <div className="flex items-center gap-1.5">
            {schedule.total_days && (
              <Badge variant="outline" className="text-xs">
                {schedule.total_days} d&iacute;as
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {phaseConfig.length} fases
            </Badge>
            {!schedule.is_active && (
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
                onClick={() => schedule.is_active ? setDeactivating(true) : handleToggle()}
              >
                <Power className="mr-1 h-3.5 w-3.5" />
                {schedule.is_active ? 'Desactivar' : 'Reactivar'}
              </Button>
            </>
          ) : undefined
        }
      />

      {/* Phase config editing */}
      <div className="rounded-lg border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium uppercase tracking-wide">Configuraci&oacute;n por fase</p>
          <span className="text-sm text-muted-foreground">Total: {totalDays} d&iacute;as</span>
        </div>

        {cultivarPhases.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin fases configuradas para este cultivar.</p>
        ) : (
          cultivarPhases.map((p) => {
            const pc = phaseConfig.find((c) => c.phase_id === p.id)
            const applicable = getApplicableTemplates(p.id)
            const assignedIds = new Set(pc?.templates.map((t) => t.template_id) ?? [])

            return (
              <div key={p.id} className="rounded-md border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{p.name}</span>
                  {canWrite ? (
                    <Input
                      type="number"
                      min="0"
                      className="h-8 w-24 text-xs"
                      placeholder="D&iacute;as"
                      value={pc?.duration_days ?? 0}
                      onChange={(e) => updatePhaseDuration(p.id, parseInt(e.target.value, 10) || 0)}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">{pc?.duration_days ?? 0} d&iacute;as</span>
                  )}
                </div>

                {applicable.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {applicable.map((t) => {
                      const isSelected = assignedIds.has(t.id)
                      return canWrite ? (
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
                      ) : (
                        isSelected && (
                          <Badge key={t.id} variant="secondary" className="text-xs">
                            {t.name}
                          </Badge>
                        )
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

        {canWrite && cultivarPhases.length > 0 && (
          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={handleSaveConfig} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar configuraci\u00F3n'}
            </Button>
          </div>
        )}
      </div>

      {/* Schedule Dialog */}
      <ScheduleDialog
        open={dialogOpen}
        onOpenChange={(o) => { if (!o) setDialogOpen(false); else setDialogOpen(true) }}
        schedule={schedule}
        cultivars={cultivars}
        phases={phases}
        templates={templates}
        templatePhases={templatePhases}
        onSuccess={() => {
          setDialogOpen(false)
          router.refresh()
        }}
      />

      {/* Deactivate confirm */}
      <AlertDialog open={deactivating} onOpenChange={(o) => !o && setDeactivating(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar plan</AlertDialogTitle>
            <AlertDialogDescription>
              &iquest;Desactivar &quot;{schedule.name}&quot;? No se podr&aacute; usar para nuevos batches.
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
