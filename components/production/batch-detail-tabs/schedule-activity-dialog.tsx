'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { scheduleActivity } from '@/lib/actions/batch-activities'
import { createClient } from '@/lib/supabase/client'

// ---------- Types ----------

type ActivityTemplate = {
  id: string
  name: string
  code: string
  activity_type_name: string | null
  triggers_phase_change_name: string | null
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  batchId: string
  batchStartDate: string
  phaseId: string
  phaseName: string
}

// Input style matching existing select style
const inputClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

// ---------- Component ----------

export function ScheduleActivityDialog({
  open,
  onOpenChange,
  batchId,
  batchStartDate,
  phaseId,
  phaseName,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState<ActivityTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [templatesLoaded, setTemplatesLoaded] = useState(false)

  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [plannedDate, setPlannedDate] = useState('')

  // Calculate crop day as derived state
  const cropDay = useMemo(() => {
    if (plannedDate && batchStartDate) {
      const start = new Date(batchStartDate + 'T00:00:00')
      const planned = new Date(plannedDate + 'T00:00:00')
      return Math.ceil((planned.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    }
    return null
  }, [plannedDate, batchStartDate])

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true)
    const supabase = createClient()

    // Get templates that are active and applicable to this phase
    const { data } = await supabase
      .from('activity_templates')
      .select(`
        id, name, code,
        activity_type:activity_types(name),
        triggers_phase_change:production_phases!activity_templates_triggers_phase_change_id_fkey(name),
        phases:activity_template_phases!inner(phase_id)
      `)
      .eq('is_active', true)
      .eq('phases.phase_id', phaseId)
      .order('name')

    const mapped: ActivityTemplate[] = (data ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      code: t.code,
      activity_type_name: (t.activity_type as { name: string } | null)?.name ?? null,
      triggers_phase_change_name: (t.triggers_phase_change as { name: string } | null)?.name ?? null,
    }))

    setTemplates(mapped)
    setLoadingTemplates(false)
    setTemplatesLoaded(true)
  }, [phaseId])

  // Handle dialog open - load templates and reset form
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !templatesLoaded) {
      loadTemplates()
    }
    if (newOpen) {
      // Reset form when opening
      setSelectedTemplateId('')
      setPlannedDate('')
    }
    onOpenChange(newOpen)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedTemplateId) {
      toast.error('Selecciona un template de actividad')
      return
    }

    if (!plannedDate) {
      toast.error('Selecciona una fecha planificada')
      return
    }

    setLoading(true)

    const result = await scheduleActivity({
      batchId,
      templateId: selectedTemplateId,
      plannedDate,
      phaseId,
    })

    setLoading(false)

    if (result.success) {
      toast.success('Actividad programada exitosamente')
      setTemplatesLoaded(false) // Force reload next time
      onOpenChange(false)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Programar actividad</DialogTitle>
          <DialogDescription>
            Programa una nueva actividad para la fase {phaseName}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <Label htmlFor="template">Template de actividad</Label>
            <select
              id="template"
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className={inputClass + ' mt-1.5'}
              disabled={loadingTemplates}
            >
              <option value="">
                {loadingTemplates ? 'Cargando templates...' : 'Seleccionar template'}
              </option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.code})
                  {t.triggers_phase_change_name && ` → ${t.triggers_phase_change_name}`}
                </option>
              ))}
            </select>
            {!loadingTemplates && templatesLoaded && templates.length === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                No hay templates disponibles para esta fase.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="planned-date">Fecha planificada</Label>
            <input
              id="planned-date"
              type="date"
              value={plannedDate}
              onChange={(e) => setPlannedDate(e.target.value)}
              min={today}
              className={inputClass + ' mt-1.5'}
            />
          </div>

          {cropDay !== null && (
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <p>
                <strong>Día de cultivo:</strong> D{cropDay}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || loadingTemplates}>
              {loading ? 'Programando...' : 'Programar actividad'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
