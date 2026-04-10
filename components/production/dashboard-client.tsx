'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { FlaskConical, Sprout } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FilterPopover } from '@/components/settings/filter-popover'
import { batchStatusLabels, batchStatusBadgeStyles } from './batches-shared'
import type {
  DashboardBatchRow,
  DashboardPhase,
  DashboardCropType,
} from './dashboard-shared'

// ---------- Default phase colors ----------

const PHASE_COLORS = [
  '#22c55e', '#3b82f6', '#a855f7', '#f59e0b',
  '#ef4444', '#06b6d4', '#ec4899', '#78716c',
]

function phaseColor(phase: DashboardPhase, index: number): string {
  return phase.color ?? PHASE_COLORS[index % PHASE_COLORS.length]
}

// ---------- Types ----------

type Props = {
  batches: DashboardBatchRow[]
  phases: DashboardPhase[]
  cropTypes: DashboardCropType[]
  kpis: {
    active: number
    transition: number
    hold: number
    completedMonth: number
    avgDuration: number
    totalPlants: number
  }
  filterOptions: {
    facilities: string[]
    cultivars: { id: string; name: string; crop_type_id: string }[]
  }
}

// ---------- Component ----------

export function ProductionDashboardClient({
  batches,
  phases,
  cropTypes,
  kpis,
  filterOptions,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // URL state
  const selectedCropTypeId = searchParams.get('crop_type') ?? cropTypes[0]?.id ?? ''
  const facilityFilter = searchParams.get('facility') ?? ''
  const statusFilter = searchParams.get('status') ?? 'active,phase_transition,on_hold'
  const statusSet = new Set(statusFilter.split(',').filter(Boolean))
  const cultivarFilter = searchParams.get('cultivar') ?? ''

  // Local state
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set())

  // Derived data
  const filteredPhases = useMemo(
    () =>
      phases
        .filter((p) => p.crop_type_id === selectedCropTypeId)
        .sort((a, b) => a.sort_order - b.sort_order),
    [phases, selectedCropTypeId],
  )

  const phaseIdSet = useMemo(
    () => new Set(filteredPhases.map((p) => p.id)),
    [filteredPhases],
  )

  const filteredBatches = useMemo(
    () =>
      batches.filter((b) => {
        if (!phaseIdSet.has(b.phase_id)) return false
        if (facilityFilter && b.facility_name !== facilityFilter) return false
        if (!statusSet.has(b.status)) return false
        if (cultivarFilter && b.cultivar_id !== cultivarFilter) return false
        return true
      }),
    [batches, phaseIdSet, facilityFilter, statusSet, cultivarFilter],
  )

  const phaseBatchMap = useMemo(() => {
    const map = new Map<string, DashboardBatchRow[]>()
    for (const phase of filteredPhases) {
      map.set(phase.id, [])
    }
    for (const batch of filteredBatches) {
      map.get(batch.phase_id)?.push(batch)
    }
    // Sort within each phase: overdue first, then by days desc
    for (const [, arr] of map) {
      arr.sort((a, b) => b.days_in_phase - a.days_in_phase)
    }
    return map
  }, [filteredPhases, filteredBatches])

  const phaseDurationMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const phase of phases) {
      if (phase.default_duration_days) map.set(phase.id, phase.default_duration_days)
    }
    return map
  }, [phases])

  const summaryStats = useMemo(() => {
    const facilities = new Set(filteredBatches.map((b) => b.facility_name).filter(Boolean))
    return { batchCount: filteredBatches.length, facilityCount: facilities.size }
  }, [filteredBatches])

  const filteredCultivarOptions = useMemo(
    () => filterOptions.cultivars.filter((c) => c.crop_type_id === selectedCropTypeId),
    [filterOptions.cultivars, selectedCropTypeId],
  )

  // Active filter count
  const activeFilterCount =
    (facilityFilter ? 1 : 0) +
    (statusSet.size < 3 ? 1 : 0) +
    (cultivarFilter ? 1 : 0)

  // URL helpers
  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    }
    router.push(`/production?${params.toString()}`)
  }

  const handleCropTypeChange = (value: string) => {
    updateParams({
      crop_type: value === cropTypes[0]?.id ? null : value,
      cultivar: null,
    })
  }

  const handleFacilityChange = (value: string) => {
    updateParams({ facility: value === '_all' ? null : value })
  }

  const handleCultivarChange = (value: string) => {
    updateParams({ cultivar: value === '_all' ? null : value })
  }

  const handleStatusToggle = (status: string) => {
    const newSet = new Set(statusSet)
    if (newSet.has(status)) newSet.delete(status)
    else newSet.add(status)
    const newValue = Array.from(newSet).join(',')
    updateParams({ status: newValue === 'active,phase_transition,on_hold' ? null : newValue })
  }

  const togglePhaseExpand = (phaseId: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev)
      if (next.has(phaseId)) next.delete(phaseId)
      else next.add(phaseId)
      return next
    })
  }

  // No batches at all
  if (batches.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Panel de Producción</h1>
        <EmptyState />
      </div>
    )
  }

  const selectedCropTypeName =
    cropTypes.find((ct) => ct.id === selectedCropTypeId)?.name ?? ''

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-semibold tracking-tight">Panel de Producción</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label="Lotes activos"
          value={kpis.active}
          subtitle={`${kpis.totalPlants.toLocaleString('es-CO')} plantas`}
          href="/production/batches?status=active"
        />
        <KpiCard
          label="En transición"
          value={kpis.transition}
          subtitle="pendientes de avanzar"
          href="/production/batches?status=phase_transition"
          variant={kpis.transition > 0 ? 'warning' : 'default'}
        />
        <KpiCard
          label="En espera"
          value={kpis.hold}
          subtitle="requieren atención"
          href="/production/batches?status=on_hold"
          variant={kpis.hold > 0 ? 'danger' : 'default'}
        />
        <KpiCard
          label="Completados"
          value={kpis.completedMonth}
          subtitle="este mes"
          href="/production/batches?status=completed&show_all=true"
          variant={kpis.completedMonth > 0 ? 'success' : 'default'}
        />
        <KpiCard
          label="Duración prom."
          value={kpis.avgDuration}
          subtitle="días en producción"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Crop type dropdown */}
          {cropTypes.length > 1 && (
            <Select value={selectedCropTypeId} onValueChange={handleCropTypeChange}>
              <SelectTrigger className="h-9 w-[200px]">
                <Sprout className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Tipo de cultivo" />
              </SelectTrigger>
              <SelectContent>
                {cropTypes.map((ct) => (
                  <SelectItem key={ct.id} value={ct.id}>
                    {ct.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {cropTypes.length === 1 && (
            <div className="flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm">
              <Sprout className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">{cropTypes[0].name}</span>
            </div>
          )}

          {/* Filters */}
          <FilterPopover activeCount={activeFilterCount}>
            {/* Facility */}
            {filterOptions.facilities.length > 1 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium">Instalación</p>
                <Select value={facilityFilter || '_all'} onValueChange={handleFacilityChange}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Todas</SelectItem>
                    {filterOptions.facilities.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Status */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium">Estado</p>
              <div className="flex flex-col gap-1.5">
                {(['active', 'phase_transition', 'on_hold'] as const).map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={statusSet.has(s)}
                      onChange={() => handleStatusToggle(s)}
                      className="h-4 w-4 rounded border-input"
                    />
                    {batchStatusLabels[s]}
                  </label>
                ))}
              </div>
            </div>

            {/* Cultivar */}
            {filteredCultivarOptions.length > 1 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium">Cultivar</p>
                <Select value={cultivarFilter || '_all'} onValueChange={handleCultivarChange}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Todos</SelectItem>
                    {filteredCultivarOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </FilterPopover>
        </div>

        <p className="text-xs text-muted-foreground sm:text-sm">
          {summaryStats.batchCount} lote{summaryStats.batchCount !== 1 ? 's' : ''}
          {' · '}
          {summaryStats.facilityCount} instalaci{summaryStats.facilityCount !== 1 ? 'ones' : 'ón'}
        </p>
      </div>

      {/* Phase Stepper */}
      {filteredBatches.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No hay lotes activos para <span className="font-medium">{selectedCropTypeName}</span> con los filtros actuales.
          </p>
        </div>
      ) : (
        <div>
          {filteredPhases.map((phase, idx) => {
            const phaseBatches = phaseBatchMap.get(phase.id) ?? []
            const isLast = idx === filteredPhases.length - 1
            const color = phaseColor(phase, idx)

            return (
              <div key={phase.id} className="flex">
                {/* Stepper column */}
                <div className="flex flex-col items-center" style={{ width: 36 }}>
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-content-center rounded-full border-2 text-xs font-semibold"
                    style={{
                      borderColor: color,
                      color: color,
                      backgroundColor: `${color}1a`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {idx + 1}
                  </div>
                  {!isLast && (
                    <div
                      className="w-0.5 flex-1"
                      style={{
                        background: `linear-gradient(to bottom, ${color}, hsl(var(--border)))`,
                        minHeight: 20,
                      }}
                    />
                  )}
                </div>

                {/* Phase card */}
                <div className="mb-3 ml-3 flex-1">
                  <PhaseCard
                    phase={phase}
                    batches={phaseBatches}
                    color={color}
                    expectedDays={phaseDurationMap.get(phase.id) ?? null}
                    isExpanded={expandedPhases.has(phase.id)}
                    onToggleExpand={() => togglePhaseExpand(phase.id)}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------- Sub-components ----------

function KpiCard({
  label,
  value,
  subtitle,
  href,
  variant = 'default',
}: {
  label: string
  value: number
  subtitle?: string
  href?: string
  variant?: 'default' | 'warning' | 'danger' | 'success'
}) {
  const content = (
    <div
      className={cn(
        'rounded-lg border p-3 transition-colors',
        href && 'hover:bg-muted/50',
        variant === 'warning' && 'border-l-2 border-l-yellow-500',
        variant === 'danger' && 'border-l-2 border-l-red-500',
        variant === 'success' && 'border-l-2 border-l-green-500',
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  )

  if (href) return <Link href={href}>{content}</Link>
  return content
}

function PhaseCard({
  phase,
  batches,
  color,
  expectedDays,
  isExpanded,
  onToggleExpand,
}: {
  phase: DashboardPhase
  batches: DashboardBatchRow[]
  color: string
  expectedDays: number | null
  isExpanded: boolean
  onToggleExpand: () => void
}) {
  const totalPlants = batches.reduce((sum, b) => sum + (b.plant_count ?? 0), 0)
  const avgDays =
    batches.length > 0
      ? Math.round(batches.reduce((sum, b) => sum + b.days_in_phase, 0) / batches.length)
      : 0

  return (
    <div className="overflow-hidden rounded-lg border">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b p-3">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-sm font-semibold">{phase.name}</span>
        <Badge variant="secondary" className="text-[10px] text-muted-foreground">
          {phase.code}
        </Badge>
        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            <span className="font-medium text-foreground">{batches.length}</span> lote{batches.length !== 1 ? 's' : ''}
          </span>
          <span className="hidden sm:inline">
            <span className="font-medium text-foreground">{totalPlants.toLocaleString('es-CO')}</span> plantas
          </span>
          <span className="hidden sm:inline">
            <span className="font-medium text-foreground">{avgDays > 0 ? avgDays : '—'}</span>
            {' / '}
            {expectedDays ?? '—'} días
          </span>
        </div>
      </div>

      {/* Batch list */}
      {batches.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          Sin lotes en esta fase
        </p>
      ) : (
        <div>
          {batches.slice(0, 2).map((batch) => (
            <BatchRow key={batch.id} batch={batch} expectedDays={expectedDays} />
          ))}
          {batches.length > 2 && (
            <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
              <CollapsibleContent>
                {batches.slice(2).map((batch) => (
                  <BatchRow key={batch.id} batch={batch} expectedDays={expectedDays} />
                ))}
              </CollapsibleContent>
              <CollapsibleTrigger asChild>
                <button className="flex w-full items-center justify-center py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
                  {isExpanded ? 'Mostrar menos' : `+${batches.length - 2} lotes más`}
                </button>
              </CollapsibleTrigger>
            </Collapsible>
          )}
        </div>
      )}
    </div>
  )
}

function BatchRow({
  batch,
  expectedDays,
}: {
  batch: DashboardBatchRow
  expectedDays: number | null
}) {
  const isOverdue = expectedDays != null && batch.days_in_phase > expectedDays
  const isOnHold = batch.status === 'on_hold'
  const isTransition = batch.status === 'phase_transition'

  // Status dot color
  const dotColor = isOverdue || isOnHold
    ? 'bg-red-500'
    : isTransition
      ? 'bg-yellow-500'
      : 'bg-green-500'

  // Progress
  const progressPct = expectedDays ? (batch.days_in_phase / expectedDays) * 100 : 0
  const progressColor =
    progressPct > 100
      ? 'bg-red-500'
      : progressPct >= 80
        ? 'bg-yellow-500'
        : 'bg-green-500'

  return (
    <Link
      href={`/production/batches/${batch.id}`}
      className="flex flex-wrap items-center gap-x-3 gap-y-0.5 border-t px-3 py-2 transition-colors hover:bg-muted/50"
    >
      {/* Line 1: dot + code + cultivar + badge */}
      <span className={cn('h-[7px] w-[7px] shrink-0 rounded-full', dotColor)} />
      <span className="font-mono text-xs font-medium">{batch.code}</span>
      <span className="max-w-[100px] truncate text-xs text-muted-foreground sm:max-w-[140px] lg:max-w-[180px]">
        {batch.cultivar_name}
      </span>
      {batch.status !== 'active' && (
        <Badge
          variant="secondary"
          className={cn('text-[10px] leading-tight', batchStatusBadgeStyles[batch.status] ?? '')}
        >
          {batchStatusLabels[batch.status] ?? batch.status}
        </Badge>
      )}

      {/* Spacer (desktop only) */}
      <span className="hidden flex-1 sm:block" />

      {/* Line 2 on mobile, same line on desktop */}
      <div className="flex w-full items-center gap-3 pl-[19px] sm:w-auto sm:pl-0">
        <span className="text-xs text-muted-foreground">
          {batch.plant_count?.toLocaleString('es-CO') ?? '—'}{' '}
          <span className="opacity-60">pl</span>
        </span>
        <span className="max-w-[80px] truncate text-xs text-muted-foreground sm:max-w-[100px] lg:max-w-[140px]">
          {batch.zone_name}
        </span>
        <span className={cn('text-xs tabular-nums', isOverdue && 'font-medium text-red-600 dark:text-red-400')}>
          {batch.days_in_phase}
          {expectedDays != null && (
            <span className="text-muted-foreground"> / {expectedDays}</span>
          )}
          <span className="text-muted-foreground"> d</span>
        </span>
        {expectedDays != null && (
          <div className="h-1 w-12 overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full rounded-full transition-all', progressColor)}
              style={{ width: `${Math.min(progressPct, 100)}%` }}
            />
          </div>
        )}
      </div>
    </Link>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border py-16 text-center">
      <FlaskConical className="mb-4 h-12 w-12 text-muted-foreground/50" />
      <h3 className="mb-2 text-lg font-medium">No hay lotes activos</h3>
      <p className="mb-4 max-w-sm text-sm text-muted-foreground">
        Aprueba una orden de producción para crear tu primer lote.
      </p>
      <Button asChild>
        <Link href="/production/orders">Ver órdenes</Link>
      </Button>
    </div>
  )
}
