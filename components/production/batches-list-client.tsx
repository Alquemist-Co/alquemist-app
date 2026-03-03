'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FlaskConical, Search } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { DataTablePagination } from '@/components/shared/data-table-pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { FilterPopover } from '@/components/settings/filter-popover'
import {
  type BatchRow,
  type CultivarOption,
  type PhaseOption,
  type ZoneOption,
  selectClass,
  batchStatusLabels,
  batchStatusBadgeStyles,
} from './batches-shared'

const VALID_STATUSES = ['active', 'phase_transition', 'completed', 'cancelled', 'on_hold']

type Props = {
  batches: BatchRow[]
  cultivars: CultivarOption[]
  phases: PhaseOption[]
  zones: ZoneOption[]
  totalPages: number
  totalCount: number
  pageSize: number
  currentPage: number
  kpis: {
    active: number
    in_transition: number
    on_hold: number
    completed_month: number
  }
  filters: {
    status: string
    cultivar: string
    phase: string
    zone: string
    search: string
    show_all: string
  }
}

export function BatchesListClient({
  batches,
  cultivars,
  phases,
  zones,
  totalPages,
  totalCount,
  pageSize,
  currentPage,
  kpis,
  filters,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [searchValue, setSearchValue] = useState(filters.search)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value)
        else params.delete(key)
      }
      if (!('page' in updates)) params.delete('page')
      router.push(`/production/batches?${params.toString()}`)
    },
    [router, searchParams],
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (searchValue !== filters.search) {
        updateParams({ search: searchValue })
      }
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchValue, filters.search, updateParams])

  function goToPage(page: number) {
    updateParams({ page: page > 1 ? String(page) : '' })
  }

  const activeFilterCount =
    (filters.status ? 1 : 0) +
    (filters.cultivar ? 1 : 0) +
    (filters.phase ? 1 : 0) +
    (filters.zone ? 1 : 0)

  const formatDate = (d: string | null) => {
    if (!d) return '—'
    return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Activos" value={kpis.active} />
        <KpiCard label="En transición" value={kpis.in_transition} />
        <KpiCard label="En espera" value={kpis.on_hold} />
        <KpiCard label="Completados (mes)" value={kpis.completed_month} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative max-sm:w-full">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Código de lote..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="h-9 w-full pl-8 sm:w-[200px] lg:w-[240px]"
          />
        </div>

        {/* Filters */}
        <FilterPopover activeCount={activeFilterCount}>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium">Estado</label>
              <select
                value={filters.status}
                onChange={(e) => updateParams({ status: e.target.value })}
                className={selectClass}
              >
                <option value="">Todos</option>
                {VALID_STATUSES.map((s) => (
                  <option key={s} value={s}>{batchStatusLabels[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Cultivar</label>
              <select
                value={filters.cultivar}
                onChange={(e) => updateParams({ cultivar: e.target.value })}
                className={selectClass}
              >
                <option value="">Todos</option>
                {cultivars.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Fase actual</label>
              <select
                value={filters.phase}
                onChange={(e) => updateParams({ phase: e.target.value })}
                className={selectClass}
              >
                <option value="">Todas</option>
                {phases.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Zona</label>
              <select
                value={filters.zone}
                onChange={(e) => updateParams({ zone: e.target.value })}
                className={selectClass}
              >
                <option value="">Todas</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>{z.name} ({z.facility_name})</option>
                ))}
              </select>
            </div>
          </div>
        </FilterPopover>

        {/* Show all toggle */}
        <label className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={filters.show_all === 'true'}
            onChange={(e) => updateParams({ show_all: e.target.checked ? 'true' : '' })}
            className="h-3.5 w-3.5 rounded border-input"
          />
          Mostrar completados/cancelados
        </label>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border">
        {batches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FlaskConical className="mb-3 h-10 w-10" />
            <p className="text-sm">
              {activeFilterCount > 0 || filters.search
                ? 'No se encontraron lotes con estos filtros.'
                : 'No hay batches de producción. Aprueba una orden para crear el primero.'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Cultivar</TableHead>
                <TableHead>Fase</TableHead>
                <TableHead>Zona</TableHead>
                <TableHead className="text-right">Plantas</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Orden</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Fin esp.</TableHead>
                <TableHead className="text-right">Días</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((b) => (
                <TableRow
                  key={b.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/production/batches/${b.id}`)}
                >
                  <TableCell className="font-medium font-mono text-xs">{b.code}</TableCell>
                  <TableCell className="text-sm">{b.cultivar_name}</TableCell>
                  <TableCell className="text-sm">{b.phase_name}</TableCell>
                  <TableCell className="text-sm">
                    <div>{b.zone_name}</div>
                    <div className="text-xs text-muted-foreground">{b.facility_name}</div>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {b.plant_count != null ? b.plant_count.toLocaleString('es-CO') : '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {b.current_product_name ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {b.order_code ? (
                      <button
                        className="text-primary underline-offset-2 hover:underline"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/production/orders/${b.order_id}`)
                        }}
                      >
                        {b.order_code}
                      </button>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(b.start_date)}</TableCell>
                  <TableCell className="text-sm">{formatDate(b.expected_end_date)}</TableCell>
                  <TableCell className="text-right text-sm">{b.days_in_production}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`text-xs ${batchStatusBadgeStyles[b.status] ?? ''}`}>
                      {batchStatusLabels[b.status] ?? b.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      <DataTablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={goToPage}
      />
    </div>
  )
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  )
}
