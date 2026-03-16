'use client'

import { useState, useCallback, useEffect, useRef, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowUpDown,
  Download,
  Search,
  X,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  DollarSign,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination } from '@/components/shared/data-table-pagination'
import { FilterPopover } from '@/components/settings/filter-popover'
import { cn } from '@/lib/utils'
import { exportTransactionsCsv } from '@/app/(dashboard)/inventory/transactions/actions'

// ─── Types ──────────────────────────────────────────────────────────────────

type TransactionRow = {
  id: string
  type: string
  quantity: number
  cost_per_unit: number | null
  cost_total: number | null
  timestamp: string
  reason: string | null
  item_batch_number: string | null
  item_product_name: string | null
  item_product_sku: string | null
  unit_code: string | null
  zone_id: string | null
  zone_name: string | null
  batch_id: string | null
  batch_code: string | null
  user_name: string | null
  related_id: string | null
  related_type: string | null
  target_item_batch: string | null
  target_item_zone: string | null
}

type ZoneOption = { id: string; name: string }
type BatchOption = { id: string; code: string }

type KPIs = {
  entriesCount: number
  entriesCost: number
  exitsCount: number
  exitsCost: number
  adjustCount: number
  adjustCost: number
  periodCost: number
}

type Filters = {
  type: string
  item_id: string
  zone_id: string
  batch_id: string
  from: string
  to: string
  search: string
}

type Props = {
  transactions: TransactionRow[]
  zones: ZoneOption[]
  batches: BatchOption[]
  canExport: boolean
  totalPages: number
  totalCount: number
  currentPage: number
  pageSize: number
  kpis: KPIs
  filters: Filters
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ENTRY_TYPES = ['receipt', 'transfer_in', 'transformation_in', 'return']
const EXIT_TYPES = ['consumption', 'application', 'transfer_out', 'transformation_out', 'waste']
const ADJUST_TYPES = ['adjustment', 'reservation', 'release']

const typeLabels: Record<string, string> = {
  receipt: 'Recepcion',
  consumption: 'Consumo',
  application: 'Aplicacion',
  transfer_out: 'Transfer. salida',
  transfer_in: 'Transfer. entrada',
  transformation_out: 'Transf. salida',
  transformation_in: 'Transf. entrada',
  adjustment: 'Ajuste',
  waste: 'Desperdicio',
  return: 'Devolucion',
  reservation: 'Reserva',
  release: 'Liberacion',
}

const typeBadgeStyles: Record<string, string> = {
  // entries: green
  receipt: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  transfer_in: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  transformation_in: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  return: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  // exits: red/orange
  consumption: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  application: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  transfer_out: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  transformation_out: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  waste: 'bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-400',
  // adjustments: yellow/cyan
  adjustment: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  reservation: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  release: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
}

const selectClass =
  'w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTimestamp(ts: string): string {
  const d = new Date(ts)
  return d.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatCurrency(val: number): string {
  return val.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })
}

function formatQuantity(qty: number, type: string, unitCode: string | null): string {
  const abs = Math.abs(qty).toLocaleString('es-CL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
  const unit = unitCode ? ` ${unitCode}` : ''
  if (ENTRY_TYPES.includes(type)) return `+${abs}${unit}`
  if (EXIT_TYPES.includes(type)) return `-${abs}${unit}`
  // Adjustments: show sign based on actual quantity value
  const sign = qty > 0 ? '+' : qty < 0 ? '-' : ''
  return `${sign}${abs}${unit}`
}

function quantityColor(type: string): string {
  if (ENTRY_TYPES.includes(type)) return 'text-green-600 dark:text-green-400'
  if (EXIT_TYPES.includes(type)) return 'text-red-600 dark:text-red-400'
  return 'text-yellow-600 dark:text-yellow-400'
}

function downloadCsv(rows: Array<Record<string, unknown>>, filename: string) {
  if (rows.length === 0) return
  const headers = [
    'Fecha',
    'Tipo',
    'Producto',
    'SKU',
    'Lote',
    'Cantidad',
    'Unidad',
    'Zona',
    'Batch',
    'Usuario',
    'Costo unitario',
    'Costo total',
    'Razon',
  ]
  const csvRows = rows.map((r) =>
    [
      r.timestamp,
      typeLabels[r.type as string] ?? r.type,
      r.product_name,
      r.product_sku,
      r.batch_number,
      r.quantity,
      r.unit_code,
      r.zone_name,
      r.batch_code,
      r.user_name,
      r.cost_per_unit ?? '',
      r.cost_total ?? '',
      r.reason,
    ]
      .map((v) => {
        const s = String(v ?? '')
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"`
          : s
      })
      .join(','),
  )
  const csv = [headers.join(','), ...csvRows].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Component ──────────────────────────────────────────────────────────────

export function TransactionsListClient({
  transactions,
  zones,
  batches,
  canExport,
  totalPages,
  totalCount,
  currentPage,
  pageSize,
  kpis,
  filters,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [searchValue, setSearchValue] = useState(filters.search)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const [exporting, startExport] = useTransition()

  // Update URL search params
  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value)
        else params.delete(key)
      }
      // Reset page when filters change (unless explicitly setting page)
      if (!('page' in updates)) params.delete('page')
      router.push(`/inventory/transactions?${params.toString()}`)
    },
    [router, searchParams],
  )

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (searchValue !== filters.search) {
        updateParams({ search: searchValue })
      }
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchValue, filters.search, updateParams])

  function goToPage(page: number) {
    updateParams({ page: page > 1 ? String(page) : '' })
  }

  function changePageSize(size: number) {
    updateParams({ pageSize: String(size), page: '' })
  }

  function clearFilters() {
    setSearchValue('')
    router.push('/inventory/transactions')
  }

  function handleExport() {
    startExport(async () => {
      if (totalCount > 10000) {
        toast.info(`Exportando ${totalCount} registros (max 10000). Esto puede tomar un momento.`)
      }
      const result = await exportTransactionsCsv({
        type: filters.type || undefined,
        item_id: filters.item_id || undefined,
        zone_id: filters.zone_id || undefined,
        batch_id: filters.batch_id || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        search: filters.search || undefined,
      })
      if (result.error || !result.data) {
        toast.error(result.error ?? 'Error al exportar.')
        return
      }
      const fromDate = filters.from || 'inicio'
      const toDate = filters.to || 'hoy'
      downloadCsv(
        result.data as unknown as Array<Record<string, unknown>>,
        `transacciones-inventario-${fromDate}-${toDate}.csv`,
      )
      toast.success('CSV exportado.')
    })
  }

  const activeFilterCount =
    (filters.type ? 1 : 0) +
    (filters.zone_id ? 1 : 0) +
    (filters.batch_id ? 1 : 0) +
    (filters.from ? 1 : 0) +
    (filters.to ? 1 : 0) +
    (filters.item_id ? 1 : 0)

  const hasAnyFilter = activeFilterCount > 0 || filters.search

  return (
    <div className="space-y-4">
      {/* KPI bar */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="py-4">
          <CardContent className="flex items-center gap-3 px-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Entradas</p>
              <p className="text-lg font-semibold leading-tight">{kpis.entriesCount}</p>
              {kpis.entriesCost > 0 && (
                <p className="text-xs text-muted-foreground">{formatCurrency(kpis.entriesCost)}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardContent className="flex items-center gap-3 px-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
              <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Salidas</p>
              <p className="text-lg font-semibold leading-tight">{kpis.exitsCount}</p>
              {kpis.exitsCost > 0 && (
                <p className="text-xs text-muted-foreground">{formatCurrency(kpis.exitsCost)}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardContent className="flex items-center gap-3 px-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <RefreshCw className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Ajustes</p>
              <p className="text-lg font-semibold leading-tight">{kpis.adjustCount}</p>
              {kpis.adjustCost !== 0 && (
                <p className="text-xs text-muted-foreground">{formatCurrency(kpis.adjustCost)}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardContent className="flex items-center gap-3 px-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <DollarSign className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Costo periodo</p>
              <p className="text-lg font-semibold leading-tight">
                {formatCurrency(kpis.periodCost)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar: search + filters + export */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-sm:w-full">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por producto, lote o razón..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="h-9 w-full pl-8 sm:w-[200px] lg:w-[280px]"
          />
        </div>

        <FilterPopover activeCount={activeFilterCount}>
          <div>
            <label className="mb-1 block text-xs font-medium">Tipo</label>
            <select
              value={filters.type}
              onChange={(e) => updateParams({ type: e.target.value })}
              className={selectClass}
            >
              <option value="">Todos</option>
              <optgroup label="Entradas">
                {ENTRY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {typeLabels[t]}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Salidas">
                {EXIT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {typeLabels[t]}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Ajustes">
                {ADJUST_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {typeLabels[t]}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Zona</label>
            <select
              value={filters.zone_id}
              onChange={(e) => updateParams({ zone_id: e.target.value })}
              className={selectClass}
            >
              <option value="">Todas</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Batch</label>
            <select
              value={filters.batch_id}
              onChange={(e) => updateParams({ batch_id: e.target.value })}
              className={selectClass}
            >
              <option value="">Todos</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Desde</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => updateParams({ from: e.target.value })}
              className={selectClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Hasta</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => updateParams({ to: e.target.value })}
              className={selectClass}
            />
          </div>
        </FilterPopover>

        {hasAnyFilter && (
          <Button variant="ghost" size="sm" className="h-9" onClick={clearFilters}>
            <X className="mr-1 h-3.5 w-3.5" />
            Limpiar
          </Button>
        )}

        {canExport && (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto h-9"
            disabled={exporting || totalCount === 0}
            onClick={handleExport}
          >
            <Download className="mr-1 h-3.5 w-3.5" />
            {exporting ? 'Exportando...' : 'Exportar CSV'}
          </Button>
        )}
      </div>

      {/* Transactions table */}
      <div className="overflow-hidden rounded-lg border">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ArrowUpDown className="mb-3 h-10 w-10" />
            <p className="text-sm">
              {hasAnyFilter
                ? 'No se encontraron transacciones con estos filtros.'
                : 'No hay transacciones registradas.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead>Zona</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Razon</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatTimestamp(t.timestamp)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn('text-xs', typeBadgeStyles[t.type] ?? '')}
                      >
                        {typeLabels[t.type] ?? t.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {t.item_product_name ?? '—'}
                        </p>
                        {t.item_product_sku && (
                          <p className="truncate text-xs text-muted-foreground">
                            {t.item_product_sku}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {t.item_batch_number ?? '—'}
                    </TableCell>
                    <TableCell
                      className={cn('text-right font-mono text-sm', quantityColor(t.type))}
                    >
                      {formatQuantity(t.quantity, t.type, t.unit_code)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.zone_name ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.batch_code ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.user_name ?? '—'}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      {t.reason ? (
                        <span
                          className="block truncate text-xs text-muted-foreground"
                          title={t.reason}
                        >
                          {t.reason}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Pagination */}
      <DataTablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={goToPage}
        onPageSizeChange={changePageSize}
      />
    </div>
  )
}
