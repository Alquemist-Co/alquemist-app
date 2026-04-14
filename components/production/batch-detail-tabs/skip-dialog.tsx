'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { skipActivity } from '@/lib/actions/batch-activities'

// ---------- Types ----------

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  scheduledActivityId: string
  activityName: string
  batchId: string
}

// ---------- Component ----------

export function SkipDialog({
  open,
  onOpenChange,
  scheduledActivityId,
  activityName,
  batchId,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSkip() {
    setLoading(true)

    const result = await skipActivity({
      scheduledActivityId,
      batchId,
    })

    setLoading(false)

    if (result.success) {
      toast.success('Actividad omitida')
      onOpenChange(false)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Omitir actividad</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Omitir la actividad &ldquo;{activityName}&rdquo;? Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <Button onClick={handleSkip} disabled={loading}>
            {loading ? 'Omitiendo...' : 'Omitir actividad'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
