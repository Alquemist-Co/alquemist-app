'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, MoreHorizontal, ClipboardList, Search } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTablePagination } from '@/components/shared/data-table-pagination'
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
import { FilterPopover } from '@/components/settings/filter-popover'
import {
  type OrderRow,
  type CultivarOption,
  selectClass,
  orderStatusLabels,
  orderStatusBadgeStyles,
  orderPriorityLabels,
  orderPriorityBadgeStyles,
} from './orders-shared'

const VALID_STATUSES = ['draft', 'approved', 'in_progress', 'completed', 'cancelled']
const VALID_PRIORITIES = ['low', 'normal', 'high', 'urgent']

type Props = {
  orders: OrderRow[]
  cultivars: CultivarOption[]
  canWrite: boolean
  canCancel: boolean
  totalPages: number
  totalCount: number
  pageSize: number
  currentPage: number
  filters: {
    status: string
    priority: string
    cultivar: string
    search: string
    date_from: string
    date_to: string
  }
}

export function OrdersListClient({
  orders,
  cultivars,
  canWrite,
  canCancel,
  totalPages,
  totalCount,
  pageSize,
  currentPage,
  filters,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [searchValue, setSearchValue] = useState(filters.search)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const [cancellingOrder, setCancellingOrder] = useState<OrderRow | null>(null)

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value)
        else params.delete(key)
      }
      if (!('page' in updates)) params.delete('page')
      router.push(`/production/orders?${params.toString()}`)
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
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchValue, filters.search, updateParams])

  function goToPage(page: number) {
    updateParams({ page: page > 1 ? String(page) : '' })
  }

  async function handleCancel() {
    if (!cancellingOrder) return
    const supabase = createClient()
    const { error } = await supabase
      .from('production_orders')
      .update({ status: 'cancelled' as const })
      .eq('id', cancellingOrder.id)
    if (error) toast.error('Error al cancelar la orden.')
    else {
      toast.success('Orden cancelada.')
      router.refresh()
    }
    setCancellingOrder(null)
  }

  const activeFilterCount =
    (filters.status ? 1 : 0) +
    (filters.priority ? 1 : 0) +
    (filters.cultivar ? 1 : 0) +
    (filters.date_from ? 1 : 0) +
    (filters.date_to ? 1 : 0)

  const formatDate = (d: string | null) => {
    if (!d) return '—'
    return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative max-sm:w-full">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Código o notas..."
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
                  <option key={s} value={s}>{orderStatusLabels[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Prioridad</label>
              <select
                value={filters.priority}
                onChange={(e) => updateParams({ priority: e.target.value })}
                className={selectClass}
              >
                <option value="">Todas</option>
                {VALID_PRIORITIES.map((p) => (
                  <option key={p} value={p}>{orderPriorityLabels[p]}</option>
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
                  <option key={c.id} value={c.id}>{c.name} ({c.crop_type_name})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Inicio desde</label>
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) => updateParams({ date_from: e.target.value })}
                className="h-9"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Inicio hasta</label>
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) => updateParams({ date_to: e.target.value })}
                className="h-9"
              />
            </div>
          </div>
        </FilterPopover>

        {canWrite && (
          <Button size="sm" className="ml-auto" onClick={() => router.push('/production/orders/new')}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nueva orden</span>
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ClipboardList className="mb-3 h-10 w-10" />
            <p className="text-sm">
              {activeFilterCount > 0 || filters.search
                ? 'No se encontraron órdenes con estos filtros.'
                : 'No hay órdenes de producción.'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Cultivar</TableHead>
                <TableHead>Fases</TableHead>
                <TableHead className="text-right">Cant. inicial</TableHead>
                <TableHead className="text-right">Salida esperada</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Inicio plan.</TableHead>
                <TableHead>Asignado a</TableHead>
                {(canWrite || canCancel) && <TableHead className="w-[50px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow
                  key={o.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/production/orders/${o.id}`)}
                >
                  <TableCell className="font-medium font-mono text-xs">{o.code}</TableCell>
                  <TableCell className="text-sm">
                    <div>{o.cultivar_name}</div>
                    <div className="text-xs text-muted-foreground">{o.crop_type_name}</div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {o.entry_phase_name} → {o.exit_phase_name}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {Number(o.initial_quantity).toLocaleString('es-CO')} {o.initial_unit_code}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {o.expected_output_quantity != null
                      ? `${Number(o.expected_output_quantity).toLocaleString('es-CO')} ${o.expected_output_unit_code ?? ''}`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`text-xs ${orderPriorityBadgeStyles[o.priority] ?? ''}`}>
                      {orderPriorityLabels[o.priority] ?? o.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`text-xs ${orderStatusBadgeStyles[o.status] ?? ''}`}>
                      {orderStatusLabels[o.status] ?? o.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(o.planned_start_date)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {o.assigned_to_name ?? '—'}
                  </TableCell>
                  {(canWrite || canCancel) && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Acciones</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/production/orders/${o.id}`) }}>
                            Ver detalle
                          </DropdownMenuItem>
                          {o.status === 'draft' && canWrite && (
                            <>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/production/orders/new?edit=${o.id}`) }}>
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {o.status === 'draft' && canCancel && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => { e.stopPropagation(); setCancellingOrder(o) }}
                              >
                                Cancelar orden
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
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

      {/* Cancel confirmation */}
      <AlertDialog open={!!cancellingOrder} onOpenChange={(o) => !o && setCancellingOrder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar orden</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Cancelar la orden {cancellingOrder?.code}? Esta acción no se puede deshacer.
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
