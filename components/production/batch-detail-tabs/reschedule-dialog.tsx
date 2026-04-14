'use client'

import { useState, useMemo } from 'react'
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
import { rescheduleActivity } from '@/lib/actions/batch-activities'

// ---------- Types ----------

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  scheduledActivityId: string
  activityName: string
  currentPlannedDate: string
  batchId: string
  batchStartDate: string
}

// Input style matching existing select style
const inputClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

// ---------- Component ----------

export function RescheduleDialog({
  open,
  onOpenChange,
  scheduledActivityId,
  activityName,
  currentPlannedDate,
  batchId,
  batchStartDate,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
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

  // Handle dialog open change - reset form when opening
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setPlannedDate('')
    }
    onOpenChange(newOpen)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!plannedDate) {
      toast.error('Selecciona una nueva fecha')
      return
    }

    setLoading(true)

    const result = await rescheduleActivity({
      scheduledActivityId,
      batchId,
      plannedDate,
    })

    setLoading(false)

    if (result.success) {
      toast.success('Actividad re-agendada exitosamente')
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
          <DialogTitle>Re-agendar actividad</DialogTitle>
          <DialogDescription>
            Cambiar la fecha planificada de &ldquo;{activityName}&rdquo;.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="rounded-md bg-muted/50 p-3 text-sm">
            <p>
              <strong>Fecha actual:</strong>{' '}
              {new Date(currentPlannedDate + 'T00:00:00').toLocaleDateString('es-CO', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>

          <div>
            <Label htmlFor="new-date">Nueva fecha</Label>
            <input
              id="new-date"
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
                <strong>Nuevo día de cultivo:</strong> D{cropDay}
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
            <Button type="submit" disabled={loading || !plannedDate}>
              {loading ? 'Re-agendando...' : 'Re-agendar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
