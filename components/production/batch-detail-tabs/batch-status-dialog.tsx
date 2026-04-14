'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'

// ---------- Types ----------

type StatusAction = 'on_hold' | 'cancelled' | 'active'

type BatchStatusTemplate = {
  id: string
  code: string
  name: string
  activity_type_id: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  action: StatusAction
  batchId: string
  batchCode: string
  zoneId: string
  phaseId: string
}

// Input style matching existing select style
const inputClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

const ACTION_CONFIG: Record<StatusAction, {
  title: string
  description: string
  buttonText: string
  loadingText: string
  templateCode: string
  variant: 'default' | 'destructive'
}> = {
  on_hold: {
    title: 'Pausar lote',
    description: 'El lote será puesto en espera. Podrás reactivarlo después.',
    buttonText: 'Pausar lote',
    loadingText: 'Pausando...',
    templateCode: 'BATCH_HOLD',
    variant: 'default',
  },
  cancelled: {
    title: 'Cancelar lote',
    description: 'El lote será cancelado permanentemente. Esta acción no se puede deshacer.',
    buttonText: 'Cancelar lote',
    loadingText: 'Cancelando...',
    templateCode: 'BATCH_CANCEL',
    variant: 'destructive',
  },
  active: {
    title: 'Reactivar lote',
    description: 'El lote volverá al estado activo.',
    buttonText: 'Reactivar',
    loadingText: 'Reactivando...',
    templateCode: 'BATCH_REACTIVATE',
    variant: 'default',
  },
}

// ---------- Component ----------

export function BatchStatusDialog({
  open,
  onOpenChange,
  action,
  batchId,
  batchCode,
  zoneId,
  phaseId,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState('')
  const [template, setTemplate] = useState<BatchStatusTemplate | null>(null)
  const [templateLoading, setTemplateLoading] = useState(false)

  const config = ACTION_CONFIG[action]

  const loadTemplate = useCallback(async () => {
    setTemplateLoading(true)
    const supabase = createClient()

    const { data } = await supabase
      .from('activity_templates')
      .select('id, code, name, activity_type_id')
      .eq('code', config.templateCode)
      .eq('is_active', true)
      .single()

    setTemplate(data)
    setTemplateLoading(false)
  }, [config.templateCode])

  // Load template when dialog opens
  useEffect(() => {
    if (open && !template) {
      loadTemplate()
    }
    if (open) {
      setNotes('')
    }
  }, [open, template, loadTemplate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!template) {
      toast.error('No se encontró el template de actividad')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        toast.error('Sesión expirada')
        setLoading(false)
        return
      }

      // First, create a scheduled activity for this status change
      const { data: saData, error: saError } = await supabase
        .from('scheduled_activities')
        .insert({
          batch_id: batchId,
          template_id: template.id,
          phase_id: phaseId,
          planned_date: new Date().toISOString().split('T')[0],
          crop_day: 0,
          status: 'pending',
          template_snapshot: {
            name: template.name,
            code: template.code,
            activity_type_id: template.activity_type_id,
            skip_checklist: true,
            batch_status_action: action,
          },
          created_by: session.user.id,
          updated_by: session.user.id,
        })
        .select('id')
        .single()

      if (saError) {
        toast.error('Error al programar la actividad: ' + saError.message)
        setLoading(false)
        return
      }

      // Then execute via edge function
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/execute-activity`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            scheduled_activity_id: saData.id,
            activity_type_id: template.activity_type_id,
            zone_id: zoneId,
            batch_id: batchId,
            phase_id: phaseId,
            performed_by: session.user.id,
            duration_minutes: 5,
            notes: notes || null,
            measurement_data: {},
            checklist_results: [],
            activity_resources: [],
            activity_observations: [],
          }),
        },
      )

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error ?? 'Error al ejecutar la actividad')
        setLoading(false)
        return
      }

      const successMsgs: Record<StatusAction, string> = {
        on_hold: 'Lote pausado exitosamente',
        cancelled: 'Lote cancelado exitosamente',
        active: 'Lote reactivado exitosamente',
      }

      toast.success(successMsgs[action])
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      toast.error('Error inesperado: ' + String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="rounded-md bg-muted/50 p-3 text-sm">
            <p>
              <strong>Lote:</strong> {batchCode}
            </p>
          </div>

          <div>
            <Label htmlFor="status-notes">Notas (opcional)</Label>
            <Textarea
              id="status-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Razón del cambio de estado..."
              className={inputClass + ' mt-1.5 min-h-[80px]'}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant={config.variant}
              disabled={loading || templateLoading || !template}
            >
              {loading ? config.loadingText : config.buttonText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
