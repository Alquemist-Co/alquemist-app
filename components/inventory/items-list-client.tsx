'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  MoreHorizontal,
  Search,
  Boxes,
  ShieldAlert,
  AlertTriangle,
  Package,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { AdjustDialog } from './adjust-dialog'
import { TransferDialog } from './transfer-dialog'
import { StatusDialog } from './status-dialog'

// ---------- Types ----------

export type ItemRow = {
  id: string
  batch_number: string
  supplier_lot_number: string | null
  quantity_available: number
  quantity_reserved: number
  quantity_committed: number
  cost_per_unit: number | null
  expiration_date: string | null
  source_type: string
  lot_status: string
  created_at: string
  product_id: string
  product_name: string
  product_sku: string
  category_name: string | null
  unit_id: string
  unit_code: string
  zone_id: string
  zone_name: string
  facility_name: string
  shipment_code: string | null
}

export type ProductOption = { id: string; name: string; sku: string }
export type ZoneOption = { id: string; name: string; facility_name: string }
export type FacilityOption = { id: string; name: string }

// ---------- Constants ----------

const lotStatusLabels: Record<string, string> = {
  available: 'Disponible',
  quarantine: 'Cuarentena',
  expired: 'Expirado',
  depleted: 'Agotado',
}

const lotStatusBadgeStyles: Record<string, string> = {
  available: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  quarantine: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  expired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  depleted: 'bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-400',
}

const sourceTypeLabels: Record<string, string> = {
  purchase: 'Compra',
  production: 'Produccion',
  transfer: 'Transferencia',
  transformation: 'Transformacion',
}

const sourceTypeBadgeStyles: Record<string, string> = {
  purchase: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  production: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  transfer: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  transformation: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring'

// ---------- Helpers ----------

function formatExpiration(date: string | null): { label: string; className: string } {
  if (!date) return { label: '\u2014', className: '' }
  const now = new Date()
  const exp = new Date(date)
  const diffMs = exp.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  const formatted = exp.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  if (diffDays < 0) {
    return {
      label: formatted,
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    }
  }
  if (diffDays <= 30) {
    return {
      label: formatted,
      className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    }
  }
  return {
    label: formatted,
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  }
}

// ---------- Props ----------

type Props = {
  items: ItemRow[]
  products: ProductOption[]
  zones: ZoneOption[]
  facilities: FacilityOption[]
  kpis: {
    activeLots: number
    quarantine: number
    expired: number
    distinctProducts: number
  }
  canAdjust: boolean
  canTransfer: boolean
  canChangeStatus: boolean
  totalPages: number
  totalCount: number
  currentPage: number
  pageSize: number
  filters: {
    product_id: string
    zone_id: string
    facility_id: string
    lot_status: string
    source_type: string
    show_depleted: boolean
    search: string
  }
}

// ---------- Component ----------

export function ItemsListClient({
  items,
  products,
  zones,
  facilities,
  kpis,
  canAdjust,
  canTransfer,
  canChangeStatus,
  totalPages,
  totalCount,
  currentPage,
  pageSize,
  filters,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [searchValue, setSearchValue] = useState(filters.search)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Dialog state
  const [adjustItem, setAdjustItem] = useState<ItemRow | null>(null)
  const [transferItem, setTransferItem] = useState<ItemRow | null>(null)
  const [statusItem, setStatusItem] = useState<ItemRow | null>(null)

  const hasAnyAction = canAdjust || canTransfer || canChangeStatus

  // Update URL search params
  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value)
        else params.delete(key)
      }
      if (!('page' in updates)) params.delete('page')
      router.push(`/inventory/items?${params.toString()}`)
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

  const activeFilterCount =
    (filters.product_id ? 1 : 0) +
    (filters.zone_id ? 1 : 0) +
    (filters.source_type ? 1 : 0) +
    (filters.facility_id ? 1 : 0)

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="py-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-0">
            <CardTitle className="text-sm font-medium">Lotes activos</CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 py-0">
            <div className="text-2xl font-bold">{kpis.activeLots}</div>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-0">
            <CardTitle className="text-sm font-medium">En cuarentena</CardTitle>
            <ShieldAlert className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent className="px-4 py-0">
            <div className="text-2xl font-bold">{kpis.quarantine}</div>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-0">
            <CardTitle className="text-sm font-medium">Expirados</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent className="px-4 py-0">
            <div className="text-2xl font-bold">{kpis.expired}</div>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-0">
            <CardTitle className="text-sm font-medium">Productos distintos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 py-0">
            <div className="text-2xl font-bold">{kpis.distinctProducts}</div>
          </CardContent>
        </Card>
      </div>

      {/* Lot status tabs */}
      <Tabs
        value={filters.lot_status || 'all'}
        onValueChange={(v) => updateParams({ lot_status: v === 'all' ? '' : v })}
      >
        {/* Mobile: Select dropdown */}
        <Select
          value={filters.lot_status || 'all'}
          onValueChange={(v) => updateParams({ lot_status: v === 'all' ? '' : v })}
        >
          <SelectTrigger className="w-fit sm:hidden" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="available">Disponible</SelectItem>
            <SelectItem value="quarantine">Cuarentena</SelectItem>
            <SelectItem value="expired">Expirado</SelectItem>
          </SelectContent>
        </Select>

        {/* Desktop: TabsList */}
        <TabsList variant="line" className="hidden sm:inline-flex">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="available">Disponible</TabsTrigger>
          <TabsTrigger value="quarantine">Cuarentena</TabsTrigger>
          <TabsTrigger value="expired">Expirado</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-sm:w-full">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por lote..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="h-9 w-full pl-8 sm:w-[200px] lg:w-[280px]"
          />
        </div>

        <FilterPopover activeCount={activeFilterCount}>
          <div>
            <label className="mb-1 block text-xs font-medium">Producto</label>
            <select
              value={filters.product_id}
              onChange={(e) => updateParams({ product_id: e.target.value })}
              className={selectClass}
            >
              <option value="">Todos</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name}
                </option>
              ))}
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
                  {z.name} ({z.facility_name})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Instalacion</label>
            <select
              value={filters.facility_id}
              onChange={(e) => updateParams({ facility_id: e.target.value })}
              className={selectClass}
            >
              <option value="">Todas</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Origen</label>
            <select
              value={filters.source_type}
              onChange={(e) => updateParams({ source_type: e.target.value })}
              className={selectClass}
            >
              <option value="">Todos</option>
              {Object.entries(sourceTypeLabels).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </FilterPopover>

        {/* Show depleted toggle */}
        <div className="flex items-center gap-2 ml-auto">
          <Label htmlFor="show-depleted" className="text-xs text-muted-foreground">
            Mostrar agotados
          </Label>
          <Switch
            id="show-depleted"
            size="sm"
            checked={filters.show_depleted}
            onCheckedChange={(checked) =>
              updateParams({ show_depleted: checked ? '1' : '' })
            }
          />
        </div>
      </div>

      {/* Items Table */}
      <div className="overflow-hidden rounded-lg border">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Boxes className="mb-3 h-10 w-10" />
            <p className="text-sm">
              {activeFilterCount > 0 || filters.search || filters.lot_status
                ? 'No se encontraron lotes con estos filtros.'
                : 'No hay lotes de inventario registrados.'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Zona</TableHead>
                <TableHead className="hidden lg:table-cell">Instalacion</TableHead>
                <TableHead className="text-right">Disponible</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Reservado</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Comprometido</TableHead>
                <TableHead className="text-right hidden md:table-cell">Costo/u</TableHead>
                <TableHead className="hidden md:table-cell">Vencimiento</TableHead>
                <TableHead className="hidden lg:table-cell">Origen</TableHead>
                <TableHead>Estado</TableHead>
                {hasAnyAction && <TableHead className="w-[50px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const exp = formatExpiration(item.expiration_date)
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium text-sm">{item.product_name}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {item.product_sku}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{item.batch_number}</TableCell>
                    <TableCell className="text-sm">{item.zone_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">
                      {item.facility_name}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {item.quantity_available.toLocaleString()} {item.unit_code}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground tabular-nums hidden sm:table-cell">
                      {item.quantity_reserved.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground tabular-nums hidden sm:table-cell">
                      {item.quantity_committed.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-sm hidden md:table-cell">
                      {item.cost_per_unit != null
                        ? item.cost_per_unit.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : '\u2014'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {exp.className ? (
                        <Badge
                          variant="secondary"
                          className={`text-xs ${exp.className}`}
                        >
                          {exp.label}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">{exp.label}</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${sourceTypeBadgeStyles[item.source_type] ?? ''}`}
                      >
                        {sourceTypeLabels[item.source_type] ?? item.source_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${lotStatusBadgeStyles[item.lot_status] ?? ''}`}
                      >
                        {lotStatusLabels[item.lot_status] ?? item.lot_status}
                      </Badge>
                    </TableCell>
                    {hasAnyAction && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Acciones</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/inventory/transactions?item_id=${item.id}`,
                                )
                              }
                            >
                              Ver transacciones
                            </DropdownMenuItem>
                            {(canAdjust || canTransfer || canChangeStatus) && (
                              <DropdownMenuSeparator />
                            )}
                            {canAdjust && (
                              <DropdownMenuItem onClick={() => setAdjustItem(item)}>
                                Ajustar
                              </DropdownMenuItem>
                            )}
                            {canTransfer && (
                              <DropdownMenuItem onClick={() => setTransferItem(item)}>
                                Transferir
                              </DropdownMenuItem>
                            )}
                            {canChangeStatus && (
                              <DropdownMenuItem onClick={() => setStatusItem(item)}>
                                Cambiar estado
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
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
        onPageSizeChange={changePageSize}
      />

      {/* Dialogs */}
      <AdjustDialog
        open={!!adjustItem}
        onOpenChange={(o) => !o && setAdjustItem(null)}
        item={adjustItem}
        onSuccess={() => {
          setAdjustItem(null)
          router.refresh()
        }}
      />

      <TransferDialog
        open={!!transferItem}
        onOpenChange={(o) => !o && setTransferItem(null)}
        item={transferItem}
        zones={zones}
        onSuccess={() => {
          setTransferItem(null)
          router.refresh()
        }}
      />

      <StatusDialog
        open={!!statusItem}
        onOpenChange={(o) => !o && setStatusItem(null)}
        item={statusItem}
        onSuccess={() => {
          setStatusItem(null)
          router.refresh()
        }}
      />
    </div>
  )
}
