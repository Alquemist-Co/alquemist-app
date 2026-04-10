'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Pause, Play, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { batchStatusLabels, batchStatusBadgeStyles, selectClass } from './batches-shared'
import { BatchPhaseCards } from './batch-phase-cards'

// ---------- Types ----------

export type BatchDetailData = {
  id: string
  code: string
  status: string
  cultivar_name: string
  cultivar_code: string
  crop_type_name: string
  phase_name: string
  phase_id: string
  zone_name: string
  zone_id: string
  facility_name: string
  plant_count: number | null
  area_m2: number | null
  product_name: string | null
  product_sku: string | null
  order_id: string | null
  order_code: string | null
  order_status: string | null
  parent_batch_id: string | null
  parent_batch_code: string | null
  start_date: string
  expected_end_date: string | null
  yield_wet_kg: number | null
  yield_dry_kg: number | null
  created_at: string
  updated_at: string
  production_order_id: string | null
}

export type OrderPhaseData = {
  id: string
  phase_name: string
  phase_id: string
  sort_order: number
  status: string
  planned_duration_days: number | null
  zone_name: string | null
  planned_start_date: string | null
  planned_end_date: string | null
  actual_start_date: string | null
  actual_end_date: string | null
  expected_input_qty: number | null
  expected_output_qty: number | null
  yield_pct: number | null
}

export type LineageRecord = {
  id: string
  operation: string
  parent_batch_id: string
  parent_batch_code: string
  child_batch_id: string
  child_batch_code: string
  quantity: number | null
  reason: string | null
  created_at: string
}

export type ZoneOption = {
  id: string
  name: string
  facility_name: string
}

type Props = {
  batch: BatchDetailData
  phases: OrderPhaseData[]
  lineage: LineageRecord[]
  zones: ZoneOption[]
  canTransition: boolean
  canHoldCancel: boolean
}

// ---------- Helpers ----------

const formatDate = (d: string | null) => {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const formatDateTime = (d: string) => {
  return new Date(d).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const fmtQty = (v: number | null) => {
  if (v == null) return '—'
  return Number(v).toLocaleString('es-CO')
}

const fmtPct = (v: number | null) => {
  if (v == null) return '—'
  return `${Number(v).toFixed(1)}%`
}

function daysInProduction(startDate: string): number {
  const start = new Date(startDate + 'T00:00:00')
  const now = new Date()
  return Math.max(1, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
}

// ---------- Component ----------

export function BatchDetailClient({
  batch,
  phases,
  lineage,
  zones,
  canTransition,
  canHoldCancel,
}: Props) {
  const router = useRouter()
  const [showTransitionDialog, setShowTransitionDialog] = useState(false)
  const [showHoldDialog, setShowHoldDialog] = useState(false)
  const [showReactivateDialog, setShowReactivateDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [selectedZoneId, setSelectedZoneId] = useState('')

  const isActive = batch.status === 'active'
  const isOnHold = batch.status === 'on_hold'

  // Determine next phase name from phases array
  const currentPhaseIdx = phases.findIndex((p) => p.phase_id === batch.phase_id)
  const nextPhase = currentPhaseIdx >= 0 && currentPhaseIdx < phases.length - 1
    ? phases[currentPhaseIdx + 1]
    : null

  async function handleTransition() {
    setTransitioning(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/transition-batch-phase`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          batch_id: batch.id,
          zone_id: selectedZoneId || null,
        }),
      },
    )

    const result = await response.json()
    setTransitioning(false)
    setShowTransitionDialog(false)

    if (!response.ok) {
      toast.error(result.error ?? 'Error al transicionar fase.')
      return
    }

    if (result.is_final) {
      toast.success('Produccion completada.')
    } else {
      toast.success(`Batch avanzó a fase ${result.new_phase_name}.`)
    }
    router.refresh()
  }

  async function handleStatusChange(newStatus: 'on_hold' | 'active' | 'cancelled') {
    const supabase = createClient()
    const { error } = await supabase
      .from('batches')
      .update({ status: newStatus as 'on_hold' | 'active' | 'cancelled' })
      .eq('id', batch.id)
    if (error) {
      toast.error('Error al actualizar el estado.')
    } else {
      const msgs: Record<string, string> = {
        on_hold: 'Batch puesto en espera.',
        active: 'Batch reactivado.',
        cancelled: 'Batch cancelado.',
      }
      toast.success(msgs[newStatus])
      router.refresh()
    }
    setShowHoldDialog(false)
    setShowReactivateDialog(false)
    setShowCancelDialog(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5 h-8 w-8"
            onClick={() => router.push('/production/batches')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight font-mono">
                {batch.code}
              </h2>
              <Badge
                variant="secondary"
                className={`text-xs ${batchStatusBadgeStyles[batch.status] ?? ''}`}
              >
                {batchStatusLabels[batch.status] ?? batch.status}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {batch.phase_name}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {batch.zone_name}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {batch.cultivar_name} — {batch.crop_type_name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isActive && canTransition && (
            <Button size="sm" onClick={() => setShowTransitionDialog(true)}>
              <ArrowRight className="mr-1 h-3.5 w-3.5" />
              Transicionar fase
            </Button>
          )}
          {isActive && canHoldCancel && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHoldDialog(true)}
              >
                <Pause className="mr-1 h-3.5 w-3.5" />
                En espera
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowCancelDialog(true)}
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Cancelar lote
              </Button>
            </>
          )}
          {isOnHold && canHoldCancel && (
            <Button size="sm" onClick={() => setShowReactivateDialog(true)}>
              <Play className="mr-1 h-3.5 w-3.5" />
              Reactivar
            </Button>
          )}
        </div>
      </div>

      {/* Section 1 — General Info */}
      <div className="rounded-lg border p-4">
        <h3 className="mb-3 text-sm font-semibold">Información general</h3>
        <div className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          <InfoField label="Cultivar" value={`${batch.cultivar_name} (${batch.cultivar_code})`} />
          <InfoField label="Tipo de cultivo" value={batch.crop_type_name} />
          <InfoField label="Fase actual" value={batch.phase_name} />
          <InfoField label="Zona" value={`${batch.zone_name} — ${batch.facility_name}`} />
          <InfoField label="Plantas" value={batch.plant_count != null ? fmtQty(batch.plant_count) : '—'} />
          {batch.area_m2 != null && (
            <InfoField label="Área" value={`${batch.area_m2} m²`} />
          )}
          <InfoField
            label="Producto actual"
            value={batch.product_name ? `${batch.product_name} (${batch.product_sku})` : '—'}
          />
          <InfoField
            label="Orden de producción"
            value={batch.order_code ?? '—'}
            link={batch.order_id ? `/production/orders/${batch.order_id}` : undefined}
          />
          {batch.parent_batch_id && (
            <InfoField
              label="Batch padre"
              value={batch.parent_batch_code ?? '—'}
              link={`/production/batches/${batch.parent_batch_id}`}
            />
          )}
          <InfoField
            label="Fecha inicio → fin esperado"
            value={`${formatDate(batch.start_date)} → ${formatDate(batch.expected_end_date)}`}
          />
          <InfoField
            label="Días en producción"
            value={String(daysInProduction(batch.start_date))}
          />
          {batch.yield_wet_kg != null && (
            <InfoField label="Yield húmedo" value={`${batch.yield_wet_kg} kg`} />
          )}
          {batch.yield_dry_kg != null && (
            <InfoField label="Yield seco" value={`${batch.yield_dry_kg} kg`} />
          )}
          <InfoField label="Creado" value={formatDateTime(batch.created_at)} />
          <InfoField label="Actualizado" value={formatDateTime(batch.updated_at)} />
        </div>
      </div>

      {/* Section 2 — Phase Timeline */}
      {phases.length > 0 && (
        <BatchPhaseCards phases={phases} currentPhaseId={batch.phase_id} />
      )}

      {/* Section 3 — Genealogy */}
      <div className="rounded-lg border p-4">
        <h3 className="mb-3 text-sm font-semibold">Genealogía</h3>
        {lineage.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No hay historial de genealogía.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operación</TableHead>
                  <TableHead>Batch origen</TableHead>
                  <TableHead>Batch destino</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead>Razón</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineage.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {l.operation}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <button
                        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                        onClick={() => router.push(`/production/batches/${l.parent_batch_id}`)}
                      >
                        {l.parent_batch_code}
                      </button>
                    </TableCell>
                    <TableCell>
                      <button
                        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                        onClick={() => router.push(`/production/batches/${l.child_batch_id}`)}
                      >
                        {l.child_batch_code}
                      </button>
                    </TableCell>
                    <TableCell className="text-right text-sm">{fmtQty(l.quantity)}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{l.reason ?? '—'}</TableCell>
                    <TableCell className="text-sm">{formatDateTime(l.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Transition Dialog */}
      <Dialog open={showTransitionDialog} onOpenChange={setShowTransitionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transicionar fase</DialogTitle>
            <DialogDescription>
              El batch avanzará a la siguiente fase de producción.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <p>
                <strong>Fase actual:</strong> {batch.phase_name}
              </p>
              <p>
                <strong>Siguiente fase:</strong>{' '}
                {nextPhase ? nextPhase.phase_name : 'Última fase — producción se completará'}
              </p>
              <p>
                <strong>Plantas:</strong> {fmtQty(batch.plant_count)}
              </p>
            </div>
            <div>
              <Label htmlFor="transition-zone">Zona (opcional)</Label>
              <select
                id="transition-zone"
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(e.target.value)}
                className={selectClass + ' mt-1.5'}
              >
                <option value="">Mantener zona actual ({batch.zone_name})</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} ({z.facility_name})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTransitionDialog(false)}
              disabled={transitioning}
            >
              Cancelar
            </Button>
            <Button onClick={handleTransition} disabled={transitioning}>
              {transitioning ? 'Transicionando...' : 'Confirmar transición'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hold Dialog */}
      <AlertDialog open={showHoldDialog} onOpenChange={setShowHoldDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Poner en espera</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Poner el batch {batch.code} en espera? Podrás reactivarlo después.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleStatusChange('on_hold')}>
              Poner en espera
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reactivate Dialog */}
      <AlertDialog open={showReactivateDialog} onOpenChange={setShowReactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivar batch</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Reactivar el batch {batch.code}? Volverá al estado activo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleStatusChange('active')}>
              Reactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar batch</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Cancelar el batch {batch.code}? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => handleStatusChange('cancelled')}
            >
              Cancelar batch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ---------- Helpers ----------

function InfoField({
  label,
  value,
  className,
  link,
}: {
  label: string
  value: string
  className?: string
  link?: string
}) {
  const router = useRouter()
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">
        {link ? (
          <button
            className="text-blue-600 hover:underline dark:text-blue-400"
            onClick={() => router.push(link)}
          >
            {value}
          </button>
        ) : (
          value
        )}
      </dd>
    </div>
  )
}
