'use client'

import { useState } from 'react'
import { CheckCircle2, Circle, CircleDashed, ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  orderPhaseStatusLabels,
  orderPhaseStatusBadgeStyles,
} from './orders-shared'
import type { OrderPhaseData } from './batch-detail-client'

// ---------- Helpers ----------

const formatDate = (d: string | null) => {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
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

// ---------- Types ----------

type Props = {
  phases: OrderPhaseData[]
  currentPhaseId: string
}

// ---------- Component ----------

export function BatchPhaseCards({ phases, currentPhaseId }: Props) {
  // Track which cards are open; current phase starts open
  const [openCards, setOpenCards] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    const currentPhase = phases.find((p) => p.phase_id === currentPhaseId)
    if (currentPhase) initial.add(currentPhase.id)
    return initial
  })

  const toggleCard = (id: string) => {
    setOpenCards((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const completedCount = phases.filter((p) => p.status === 'completed').length

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Timeline de fases</h3>
        <span className="text-xs text-muted-foreground">
          {completedCount} de {phases.length} fases completadas
        </span>
      </div>

      <div className="space-y-2">
        {phases.map((phase) => {
          const isCurrent = phase.phase_id === currentPhaseId
          const isCompleted = phase.status === 'completed'
          const isSkipped = phase.status === 'skipped'
          const isPending = phase.status === 'pending' || phase.status === 'ready'
          const isOpen = openCards.has(phase.id)

          // Status icon
          let StatusIcon = CircleDashed
          let iconColor = 'text-muted-foreground'
          if (isCompleted) {
            StatusIcon = CheckCircle2
            iconColor = 'text-green-600 dark:text-green-400'
          } else if (isCurrent) {
            StatusIcon = Circle
            iconColor = 'text-blue-600 dark:text-blue-400'
          } else if (isSkipped) {
            StatusIcon = CircleDashed
            iconColor = 'text-muted-foreground'
          }

          return (
            <Collapsible
              key={phase.id}
              open={isOpen}
              onOpenChange={() => toggleCard(phase.id)}
            >
              <div
                className={cn(
                  'rounded-lg border transition-colors',
                  isCurrent && 'border-l-2 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20',
                  isPending && !isCurrent && 'opacity-70',
                )}
              >
                <CollapsibleTrigger className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/50">
                  <StatusIcon className={cn('h-5 w-5 flex-shrink-0', iconColor)} />
                  <span
                    className={cn(
                      'flex-1 font-medium text-sm',
                      isSkipped && 'line-through text-muted-foreground',
                    )}
                  >
                    {phase.phase_name}
                    {isCurrent && (
                      <span className="ml-2 text-xs font-normal text-blue-600 dark:text-blue-400">
                        (actual)
                      </span>
                    )}
                  </span>
                  <Badge
                    variant="secondary"
                    className={cn('text-xs', orderPhaseStatusBadgeStyles[phase.status] ?? '')}
                  >
                    {orderPhaseStatusLabels[phase.status] ?? phase.status}
                  </Badge>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 text-muted-foreground transition-transform',
                      isOpen && 'rotate-180',
                    )}
                  />
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="border-t px-3 py-3">
                    <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                      <InfoRow label="Duración" value={phase.planned_duration_days != null ? `${phase.planned_duration_days} días` : '—'} />
                      <InfoRow label="Zona" value={phase.zone_name ?? '—'} />
                      <InfoRow
                        label="Rendimiento"
                        value={
                          phase.expected_input_qty != null || phase.expected_output_qty != null
                            ? `${fmtQty(phase.expected_input_qty)} → ${fmtQty(phase.expected_output_qty)} (${fmtPct(phase.yield_pct)})`
                            : '—'
                        }
                      />
                      <InfoRow
                        label="Planificado"
                        value={`${formatDate(phase.planned_start_date)} — ${formatDate(phase.planned_end_date)}`}
                      />
                      <InfoRow
                        label="Real"
                        value={`${formatDate(phase.actual_start_date)} — ${formatDate(phase.actual_end_date)}`}
                        className="sm:col-span-2"
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )
        })}
      </div>
    </div>
  )
}

// ---------- Sub-components ----------

function InfoRow({
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
      <span className="text-muted-foreground">{label}:</span>{' '}
      <span className="font-medium">{value}</span>
    </div>
  )
}
