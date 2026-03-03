'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ArrowLeft, Pencil, X, CheckCircle2 } from 'lucide-react'

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
  type OrderPhaseRow,
  orderStatusLabels,
  orderStatusBadgeStyles,
  orderPriorityLabels,
  orderPriorityBadgeStyles,
  orderPhaseStatusLabels,
  orderPhaseStatusBadgeStyles,
} from './orders-shared'

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
  planned_start_date: string | null
  planned_end_date: string | null
  assigned_to_name: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

type Props = {
  order: OrderDetailData
  phases: OrderPhaseRow[]
  canWrite: boolean
  canCancel: boolean
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

// ---------- Component ----------

export function OrderDetailClient({ order, phases, canWrite, canCancel }: Props) {
  const router = useRouter()
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  const isDraft = order.status === 'draft'
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
          {isDraft && canCancel && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowCancelDialog(true)}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Cancelar
            </Button>
          )}
          <Button size="sm" disabled title="Próximamente (PRD 24)">
            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
            Aprobar
          </Button>
        </div>
      </div>

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
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel}>Cancelar orden</AlertDialogAction>
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
