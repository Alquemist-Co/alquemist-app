'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ArrowLeft, Pencil, X, CheckCircle2, FlaskConical } from 'lucide-react'

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
import {
  type OrderPhaseRow,
  orderStatusLabels,
  orderStatusBadgeStyles,
  orderPriorityLabels,
  orderPriorityBadgeStyles,
  orderPhaseStatusLabels,
  orderPhaseStatusBadgeStyles,
} from './orders-shared'
import { batchStatusLabels, batchStatusBadgeStyles } from './batches-shared'

// ---------- Types ----------

export type OrderDetailData = {
  id: string
  code: string
  status: string
  priority: string
  cultivar_name: string
  crop_type_name: string
  entry_phase_name: string
  exit_phase_name: string
  initial_quantity: number
  initial_unit_code: string
  initial_product_name: string | null
  initial_product_sku: string | null
  expected_output_quantity: number | null
  expected_output_unit_code: string | null
  expected_output_product_name: string | null
  expected_output_product_sku: string | null
  zone_name: string | null
  zone_id: string | null
  planned_start_date: string | null
  planned_end_date: string | null
  assigned_to_name: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type BatchInfo = {
  id: string
  code: string
  status: string
  plant_count: number | null
  start_date: string
}

export type ZoneOption = {
  id: string
  name: string
  facility_id: string
  facility_name: string
}

type Props = {
  order: OrderDetailData
  phases: OrderPhaseRow[]
  canWrite: boolean
  canCancel: boolean
  canApprove: boolean
  zones: ZoneOption[]
  batch: BatchInfo | null
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

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring'

// ---------- Component ----------

export function OrderDetailClient({ order, phases, canWrite, canCancel, canApprove, zones, batch }: Props) {
  const router = useRouter()
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [approving, setApproving] = useState(false)
  const [selectedZoneId, setSelectedZoneId] = useState(order.zone_id ?? '')

  const isDraft = order.status === 'draft'
  const isApproved = order.status === 'approved'
  const completedPhases = phases.filter((p) => p.status === 'completed').length

  async function handleCancel() {
    const supabase = createClient()
    const { error } = await supabase
      .from('production_orders')
      .update({ status: 'cancelled' as const })
      .eq('id', order.id)
    if (error) {
      toast.error('Error al cancelar la orden.')
    } else {
      toast.success('Orden cancelada.')
      router.refresh()
    }
    setShowCancelDialog(false)
  }

  async function handleApprove() {
    if (!selectedZoneId) {
      toast.error('Selecciona una zona para el lote.')
      return
    }
    setApproving(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/approve-production-order`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          order_id: order.id,
          zone_id: selectedZoneId,
        }),
      },
    )

    const result = await response.json()
    setApproving(false)
    setShowApproveDialog(false)

    if (!response.ok) {
      toast.error(result.error ?? 'Error al aprobar la orden.')
      return
    }

    if (result.scheduled_activities_count > 0) {
      toast.success(`Orden aprobada. Batch ${result.batch_code} creado con ${result.scheduled_activities_count} actividades programadas.`)
    } else {
      toast.success(`Batch ${result.batch_code} creado. No se programaron actividades.`)
    }
    router.refresh()
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
            onClick={() => router.push('/production/orders')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight font-mono">
                {order.code}
              </h2>
              <Badge
                variant="secondary"
                className={`text-xs ${orderStatusBadgeStyles[order.status] ?? ''}`}
              >
                {orderStatusLabels[order.status] ?? order.status}
              </Badge>
              <Badge
                variant="secondary"
                className={`text-xs ${orderPriorityBadgeStyles[order.priority] ?? ''}`}
              >
                {orderPriorityLabels[order.priority] ?? order.priority}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {order.cultivar_name} — {order.crop_type_name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDraft && canWrite && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/production/orders/new?edit=${order.id}`)}
            >
              <Pencil className="mr-1 h-3.5 w-3.5" />
              Editar
            </Button>
          )}
          {(isDraft || isApproved) && canCancel && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowCancelDialog(true)}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Cancelar
            </Button>
          )}
          {isDraft && canApprove && (
            <Button size="sm" onClick={() => setShowApproveDialog(true)}>
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
              Aprobar
            </Button>
          )}
        </div>
      </div>

      {/* Batch Info (shown when order has batch) */}
      {batch && (
        <div className="rounded-lg border border-green-200 bg-green-50/50 p-4 dark:border-green-900/50 dark:bg-green-950/20">
          <div className="flex items-center gap-2 mb-3">
            <FlaskConical className="h-4 w-4 text-green-600 dark:text-green-400" />
            <h3 className="text-sm font-semibold">Lote creado</h3>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
            <InfoField label="Código" value={batch.code} />
            <div>
              <dt className="text-xs text-muted-foreground">Estado</dt>
              <dd className="mt-0.5">
                <Badge variant="secondary" className={`text-xs ${batchStatusBadgeStyles[batch.status] ?? ''}`}>
                  {batchStatusLabels[batch.status] ?? batch.status}
                </Badge>
              </dd>
            </div>
            <InfoField label="Plantas" value={batch.plant_count != null ? fmtQty(batch.plant_count) : '—'} />
            <InfoField label="Inicio" value={formatDate(batch.start_date)} />
          </div>
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/production/batches/${batch.id}`)}
            >
              Ver lote
            </Button>
          </div>
        </div>
      )}

      {/* Section 1 — General Info */}
      <div className="rounded-lg border p-4">
        <h3 className="mb-3 text-sm font-semibold">Información general</h3>
        <div className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          <InfoField label="Cultivar" value={order.cultivar_name} />
          <InfoField label="Tipo de cultivo" value={order.crop_type_name} />
          <InfoField
            label="Fases"
            value={`${order.entry_phase_name} → ${order.exit_phase_name}`}
          />
          <InfoField
            label="Cantidad inicial"
            value={`${fmtQty(order.initial_quantity)} ${order.initial_unit_code}`}
          />
          <InfoField
            label="Producto inicial"
            value={
              order.initial_product_name
                ? `${order.initial_product_name} (${order.initial_product_sku})`
                : '—'
            }
          />
          <InfoField
            label="Salida esperada"
            value={
              order.expected_output_quantity != null
                ? `${fmtQty(order.expected_output_quantity)} ${order.expected_output_unit_code ?? ''}`
                : '—'
            }
          />
          <InfoField
            label="Producto salida"
            value={
              order.expected_output_product_name
                ? `${order.expected_output_product_name} (${order.expected_output_product_sku})`
                : '—'
            }
          />
          <InfoField label="Zona" value={order.zone_name ?? '—'} />
          <InfoField
            label="Fecha inicio → fin"
            value={`${formatDate(order.planned_start_date)} → ${formatDate(order.planned_end_date)}`}
          />
          <InfoField label="Asignado a" value={order.assigned_to_name ?? '—'} />
          <InfoField label="Notas" value={order.notes ?? '—'} className="sm:col-span-2" />
          <InfoField label="Creado" value={formatDateTime(order.created_at)} />
          <InfoField label="Actualizado" value={formatDateTime(order.updated_at)} />
        </div>
      </div>

      {/* Section 2 — Phases */}
      <div className="rounded-lg border p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Fases</h3>
          <span className="text-xs text-muted-foreground">
            {completedPhases} de {phases.length} fases completadas
          </span>
        </div>
        {phases.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No hay fases configuradas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">#</TableHead>
                  <TableHead>Fase</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Duración (días)</TableHead>
                  <TableHead>Zona</TableHead>
                  <TableHead>Inicio plan.</TableHead>
                  <TableHead>Fin plan.</TableHead>
                  <TableHead className="text-right">Entrada</TableHead>
                  <TableHead className="text-right">Salida</TableHead>
                  <TableHead className="text-right">Rend.%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {phases.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.sort_order}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{p.phase_name}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${orderPhaseStatusBadgeStyles[p.status] ?? ''}`}
                      >
                        {orderPhaseStatusLabels[p.status] ?? p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {p.planned_duration_days ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm">{p.zone_name ?? '—'}</TableCell>
                    <TableCell className="text-sm">{formatDate(p.planned_start_date)}</TableCell>
                    <TableCell className="text-sm">{formatDate(p.planned_end_date)}</TableCell>
                    <TableCell className="text-right text-sm">
                      {fmtQty(p.expected_input_qty)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {fmtQty(p.expected_output_qty)}
                    </TableCell>
                    <TableCell className="text-right text-sm">{fmtPct(p.yield_pct)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Section 3 — Yield Cascade */}
      {phases.length > 0 && (
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-semibold">Rendimiento esperado</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fase</TableHead>
                  <TableHead className="text-right">Entrada</TableHead>
                  <TableHead className="text-right">Rend.%</TableHead>
                  <TableHead className="text-right">Salida</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {phases.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{p.phase_name}</TableCell>
                    <TableCell className="text-right text-sm">
                      {fmtQty(p.expected_input_qty)}
                    </TableCell>
                    <TableCell className="text-right text-sm">{fmtPct(p.yield_pct)}</TableCell>
                    <TableCell className="text-right text-sm">
                      {fmtQty(p.expected_output_qty)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Summary row */}
          <div className="mt-3 flex items-center justify-end gap-2 border-t pt-3 text-sm font-medium">
            <span className="text-muted-foreground">Salida final esperada:</span>
            <span>
              {fmtQty(phases[phases.length - 1].expected_output_qty)}{' '}
              {order.expected_output_unit_code ?? order.initial_unit_code}
            </span>
          </div>
        </div>
      )}

      {/* Cancel Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar orden</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Cancelar la orden {order.code}? Esta acción no se puede deshacer.
            </AlertDialogDescription>
            {batch && (
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                Esta orden tiene un lote asociado ({batch.code}). Cancelar la orden no cancela automáticamente el lote.
              </p>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel}>Cancelar orden</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar orden y crear lote</DialogTitle>
            <DialogDescription>
              Se creará un lote de producción para la orden {order.code}.
              Selecciona la zona inicial donde se ubicará el lote.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="approve-zone">Zona</Label>
              <select
                id="approve-zone"
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(e.target.value)}
                className={selectClass + ' mt-1.5'}
              >
                <option value="">Seleccionar zona...</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} ({z.facility_name})
                  </option>
                ))}
              </select>
            </div>
            <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
              <p><strong>Cultivar:</strong> {order.cultivar_name}</p>
              <p><strong>Cantidad:</strong> {fmtQty(order.initial_quantity)} {order.initial_unit_code}</p>
              <p><strong>Fases:</strong> {order.entry_phase_name} → {order.exit_phase_name}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)} disabled={approving}>
              Cancelar
            </Button>
            <Button onClick={handleApprove} disabled={approving || !selectedZoneId}>
              {approving ? 'Aprobando...' : 'Aprobar y crear lote'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------- Helpers ----------

function InfoField({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  )
}
