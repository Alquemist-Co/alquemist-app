'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, MoreHorizontal, Package, Search, Truck, ArrowDownToLine } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  type ShipmentRow,
  type SupplierOption,
  type FacilityOption,
  type ProductOption,
  type UnitOption,
  type ZoneOption,
  selectClass,
  statusLabels,
  statusBadgeStyles,
  directionLabels,
  directionBadgeStyles,
  ShipmentDialog,
  MarkReceivedDialog,
} from './shipments-shared'

type ShipmentItemRow = {
  id: string
  product_id: string
  expected_quantity: number
  unit_id: string
  supplier_lot_number: string | null
  supplier_batch_ref: string | null
  cost_per_unit: number | null
  destination_zone_id: string | null
  expiration_date: string | null
}

type Props = {
  shipments: ShipmentRow[]
  suppliers: SupplierOption[]
  facilities: FacilityOption[]
  products: ProductOption[]
  units: UnitOption[]
  zones: ZoneOption[]
  canWrite: boolean
  totalPages: number
  totalCount: number
  pageSize: number
  currentPage: number
  filters: {
    tab: string
    status: string
    supplier: string
    facility: string
    search: string
  }
}

const VALID_STATUSES = ['scheduled', 'in_transit', 'received', 'inspecting', 'accepted', 'partial_accepted', 'rejected', 'cancelled']

export function ShipmentsListClient({
  shipments,
  suppliers,
  facilities,
  products,
  units,
  zones,
  canWrite,
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

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingShipment, setEditingShipment] = useState<(ShipmentRow & { items?: ShipmentItemRow[] }) | null>(null)
  const [receivedDialogOpen, setReceivedDialogOpen] = useState(false)
  const [receivingShipment, setReceivingShipment] = useState<ShipmentRow | null>(null)
  const [cancellingShipment, setCancellingShipment] = useState<ShipmentRow | null>(null)

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value)
        else params.delete(key)
      }
      if (!('page' in updates)) params.delete('page')
      router.push(`/inventory/shipments?${params.toString()}`)
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

  function openNew() {
    setEditingShipment(null)
    setDialogOpen(true)
  }

  async function openEdit(s: ShipmentRow) {
    // Fetch items for this shipment
    const supabase = createClient()
    const { data: items } = await supabase
      .from('shipment_items')
      .select('id, product_id, expected_quantity, unit_id, supplier_lot_number, supplier_batch_ref, cost_per_unit, destination_zone_id, expiration_date')
      .eq('shipment_id', s.id)
      .order('sort_order')
    setEditingShipment({
      ...s,
      items: (items ?? []).map((i) => ({
        ...i,
        expected_quantity: Number(i.expected_quantity),
        cost_per_unit: i.cost_per_unit ? Number(i.cost_per_unit) : null,
      })),
    })
    setDialogOpen(true)
  }

  async function handleTransit(s: ShipmentRow) {
    const supabase = createClient()
    const { error } = await supabase
      .from('shipments')
      .update({ status: 'in_transit' as const })
      .eq('id', s.id)
    if (error) toast.error('Error al cambiar el estado.')
    else {
      toast.success('Envío marcado en tránsito.')
      router.refresh()
    }
  }

  function openReceived(s: ShipmentRow) {
    setReceivingShipment(s)
    setReceivedDialogOpen(true)
  }

  async function handleCancel() {
    if (!cancellingShipment) return
    const supabase = createClient()
    const { error } = await supabase
      .from('shipments')
      .update({ status: 'cancelled' as const })
      .eq('id', cancellingShipment.id)
    if (error) toast.error('Error al cancelar el envío.')
    else {
      toast.success('Envío cancelado.')
      router.refresh()
    }
    setCancellingShipment(null)
  }

  const activeFilterCount =
    (filters.status ? 1 : 0) +
    (filters.supplier ? 1 : 0) +
    (filters.facility ? 1 : 0)

  const formatDate = (d: string | null) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <Tabs value={filters.tab || 'inbound'} onValueChange={(v) => updateParams({ tab: v, page: '' })}>
        <div className="flex flex-wrap items-center gap-2">
          <TabsList>
            <TabsTrigger value="inbound" className="gap-1.5">
              <ArrowDownToLine className="h-3.5 w-3.5" />
              Entrada
            </TabsTrigger>
            <TabsTrigger value="outbound" className="gap-1.5">
              <Truck className="h-3.5 w-3.5" />
              Salida
            </TabsTrigger>
          </TabsList>

          {/* Search */}
          <div className="relative max-sm:w-full">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Código o PO..."
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
                    <option key={s} value={s}>{statusLabels[s]}</option>
                  ))}
                </select>
              </div>
              {(filters.tab || 'inbound') === 'inbound' && (
                <div>
                  <label className="mb-1 block text-xs font-medium">Proveedor</label>
                  <select
                    value={filters.supplier}
                    onChange={(e) => updateParams({ supplier: e.target.value })}
                    className={selectClass}
                  >
                    <option value="">Todos</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-medium">Instalación destino</label>
                <select
                  value={filters.facility}
                  onChange={(e) => updateParams({ facility: e.target.value })}
                  className={selectClass}
                >
                  <option value="">Todas</option>
                  {facilities.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </FilterPopover>

          {canWrite && (
            <Button size="sm" className="ml-auto" onClick={openNew}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nuevo envío</span>
            </Button>
          )}
        </div>
      </Tabs>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border">
        {shipments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Package className="mb-3 h-10 w-10" />
            <p className="text-sm">
              {activeFilterCount > 0 || filters.search
                ? 'No se encontraron envíos con estos filtros.'
                : 'No hay envíos registrados.'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Proveedor / Origen</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Llegada est.</TableHead>
                <TableHead>Llegada real</TableHead>
                <TableHead className="text-right">Líneas</TableHead>
                <TableHead>Estado</TableHead>
                {canWrite && <TableHead className="w-[50px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipments.map((s) => (
                <TableRow
                  key={s.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/inventory/shipments/${s.id}`)}
                >
                  <TableCell className="font-medium font-mono text-xs">{s.shipment_code}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`text-xs ${directionBadgeStyles[s.type] ?? ''}`}>
                      {directionLabels[s.type] ?? s.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {s.supplier_name || s.origin_name || '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{s.facility_name}</TableCell>
                  <TableCell className="text-sm">{formatDate(s.estimated_arrival_date)}</TableCell>
                  <TableCell className="text-sm">{formatDate(s.actual_arrival_date)}</TableCell>
                  <TableCell className="text-right">{s.items_count}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`text-xs ${statusBadgeStyles[s.status] ?? ''}`}>
                      {statusLabels[s.status] ?? s.status}
                    </Badge>
                  </TableCell>
                  {canWrite && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Acciones</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/inventory/shipments/${s.id}`) }}>
                            Ver detalle
                          </DropdownMenuItem>
                          {(s.status === 'scheduled' || s.status === 'in_transit') && (
                            <>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(s) }}>
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {s.status === 'scheduled' && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleTransit(s) }}>
                              Marcar en tránsito
                            </DropdownMenuItem>
                          )}
                          {s.status === 'in_transit' && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openReceived(s) }}>
                              Marcar recibido
                            </DropdownMenuItem>
                          )}
                          {(s.status === 'scheduled' || s.status === 'in_transit') && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => { e.stopPropagation(); setCancellingShipment(s) }}
                              >
                                Cancelar envío
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

      {/* Create/Edit Dialog */}
      <ShipmentDialog
        open={dialogOpen}
        onOpenChange={(o) => { if (!o) { setDialogOpen(false); setEditingShipment(null) } else setDialogOpen(true) }}
        shipment={editingShipment}
        suppliers={suppliers}
        facilities={facilities}
        products={products}
        units={units}
        zones={zones}
        onSuccess={() => { setDialogOpen(false); setEditingShipment(null); router.refresh() }}
      />

      {/* Mark Received Dialog */}
      <MarkReceivedDialog
        open={receivedDialogOpen}
        onOpenChange={(o) => { if (!o) { setReceivedDialogOpen(false); setReceivingShipment(null) } else setReceivedDialogOpen(true) }}
        shipment={receivingShipment}
        onSuccess={() => { setReceivedDialogOpen(false); setReceivingShipment(null); router.refresh() }}
      />

      {/* Cancel confirmation */}
      <AlertDialog open={!!cancellingShipment} onOpenChange={(o) => !o && setCancellingShipment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar envío</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Cancelar el envío {cancellingShipment?.shipment_code}? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel}>Cancelar envío</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
