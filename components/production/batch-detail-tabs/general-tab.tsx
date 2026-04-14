'use client'

import { useRouter } from 'next/navigation'
import { BatchPhaseCards } from '../batch-phase-cards'
import type { BatchDetailData, OrderPhaseData } from '../batch-detail-client'

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

function daysInProduction(startDate: string): number {
  const start = new Date(startDate + 'T00:00:00')
  const now = new Date()
  return Math.max(1, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
}

// ---------- Types ----------

type Props = {
  batch: BatchDetailData
  phases: OrderPhaseData[]
}

// ---------- Component ----------

export function GeneralTab({ batch, phases }: Props) {
  return (
    <div className="space-y-6">
      {/* General Info */}
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

      {/* Phase Timeline */}
      {phases.length > 0 && (
        <BatchPhaseCards phases={phases} currentPhaseId={batch.phase_id} />
      )}
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
