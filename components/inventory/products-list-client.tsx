'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, MoreHorizontal, Package, Search } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

import { DataTablePagination } from '@/components/shared/data-table-pagination'
import { FilterPopover } from '@/components/settings/filter-popover'
import {
  type ProductRow,
  type CategoryOption,
  type UnitOption,
  type CultivarOption,
  type SupplierOption,
  type DocTypeOption,
  procurementTypeLabels,
  procurementTypeBadgeStyles,
  lotTrackingLabels,
  lotTrackingBadgeStyles,
  selectClass,
  ProductDialog,
} from './products-shared'

type Props = {
  products: ProductRow[]
  categories: CategoryOption[]
  units: UnitOption[]
  cultivars: CultivarOption[]
  suppliers: SupplierOption[]
  docTypes: DocTypeOption[]
  canWrite: boolean
  totalPages: number
  totalCount: number
  currentPage: number
  pageSize: number
  statusCounts: { all: number; active: number; inactive: number }
  filters: { category: string; procurement_type: string; status: string; search: string }
}

export function ProductsListClient({
  products,
  categories,
  units,
  cultivars,
  suppliers,
  docTypes,
  canWrite,
  totalPages,
  totalCount,
  currentPage,
  pageSize,
  statusCounts,
  filters,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [searchValue, setSearchValue] = useState(filters.search)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null)
  const [togglingProduct, setTogglingProduct] = useState<ProductRow | null>(null)
  const [toggleRefCount, setToggleRefCount] = useState(0)

  // Update URL search params
  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value)
        else params.delete(key)
      }
      if (!('page' in updates)) params.delete('page')
      router.push(`/inventory/products?${params.toString()}`)
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

  function openNew() {
    setEditingProduct(null)
    setDialogOpen(true)
  }

  function openEdit(p: ProductRow) {
    setEditingProduct(p)
    setDialogOpen(true)
  }

  async function startToggle(p: ProductRow) {
    if (p.is_active) {
      const supabase = createClient()
      const { count } = await supabase
        .from('phase_product_flows')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', p.id)
      setToggleRefCount(count ?? 0)
    } else {
      setToggleRefCount(0)
    }
    setTogglingProduct(p)
  }

  async function handleToggle() {
    if (!togglingProduct) return
    const supabase = createClient()
    const { error } = await supabase
      .from('products')
      .update({ is_active: !togglingProduct.is_active })
      .eq('id', togglingProduct.id)
    if (error) {
      toast.error('Error al cambiar el estado del producto.')
      return
    }
    toast.success(togglingProduct.is_active ? 'Producto desactivado.' : 'Producto reactivado.')
    setTogglingProduct(null)
    router.refresh()
  }

  const activeFilterCount =
    (filters.category ? 1 : 0) +
    (filters.procurement_type ? 1 : 0)

  return (
    <div className="space-y-4">
      {/* Status tabs */}
      <Tabs
        value={filters.status || 'all'}
        onValueChange={(v) => updateParams({ status: v === 'all' ? '' : v })}
      >
        {/* Mobile: Select dropdown */}
        <Select
          value={filters.status || 'all'}
          onValueChange={(v) => updateParams({ status: v === 'all' ? '' : v })}
        >
          <SelectTrigger className="w-fit sm:hidden" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos ({statusCounts.all})</SelectItem>
            <SelectItem value="active">Activos ({statusCounts.active})</SelectItem>
            <SelectItem value="inactive">Inactivos ({statusCounts.inactive})</SelectItem>
          </SelectContent>
        </Select>

        {/* Desktop: TabsList */}
        <TabsList variant="line" className="hidden sm:inline-flex">
          <TabsTrigger value="all">
            Todos
            <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 rounded-full px-1.5 text-xs">
              {statusCounts.all}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="active">
            Activos
            <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 rounded-full px-1.5 text-xs">
              {statusCounts.active}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Inactivos
            <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 rounded-full px-1.5 text-xs">
              {statusCounts.inactive}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Toolbar: search + filters + add button */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-sm:w-full">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por SKU o nombre..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="h-9 w-full pl-8 sm:w-[200px] lg:w-[280px]"
          />
        </div>

        <FilterPopover activeCount={activeFilterCount}>
          <div>
            <label className="mb-1 block text-xs font-medium">Categoría</label>
            <select
              value={filters.category}
              onChange={(e) => updateParams({ category: e.target.value })}
              className={selectClass}
            >
              <option value="">Todas</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon ? `${c.icon} ` : ''}{c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Tipo de adquisición</label>
            <select
              value={filters.procurement_type}
              onChange={(e) => updateParams({ procurement_type: e.target.value })}
              className={selectClass}
            >
              <option value="">Todos</option>
              {Object.entries(procurementTypeLabels).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
        </FilterPopover>

        {canWrite && (
          <Button size="sm" className="ml-auto" onClick={openNew}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nuevo producto</span>
          </Button>
        )}
      </div>

      {/* Products table */}
      <div className="overflow-hidden rounded-lg border">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Package className="mb-3 h-10 w-10" />
            <p className="text-sm">
              {activeFilterCount > 0 || filters.search || filters.status ? 'No se encontraron productos con estos filtros.' : 'No hay productos registrados.'}
            </p>
          </div>
        ) : (
          <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Unidad</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Seguimiento</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead>Estado</TableHead>
                    {canWrite && <TableHead className="w-[50px]" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {p.category_icon ? `${p.category_icon} ` : ''}{p.category_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{p.unit_code}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-xs ${procurementTypeBadgeStyles[p.procurement_type] ?? ''}`}>
                          {procurementTypeLabels[p.procurement_type] ?? p.procurement_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-xs ${lotTrackingBadgeStyles[p.lot_tracking] ?? ''}`}>
                          {lotTrackingLabels[p.lot_tracking] ?? p.lot_tracking}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{p.supplier_name ?? '—'}</TableCell>
                      <TableCell className="text-right text-sm">
                        {p.default_price != null
                          ? `${p.default_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${p.price_currency ?? ''}`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-xs ${p.is_active
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-400'
                        }`}>
                          {p.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      {canWrite && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Acciones</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(p)}>
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => startToggle(p)}>
                                {p.is_active ? 'Desactivar' : 'Reactivar'}
                              </DropdownMenuItem>
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
        onPageSizeChange={changePageSize}
      />

      {/* Product Dialog */}
      <ProductDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          if (!o) { setDialogOpen(false); setEditingProduct(null) }
          else setDialogOpen(true)
        }}
        product={editingProduct}
        categories={categories}
        units={units}
        cultivars={cultivars}
        suppliers={suppliers}
        docTypes={docTypes}
        onSuccess={() => {
          setDialogOpen(false)
          setEditingProduct(null)
          router.refresh()
        }}
      />

      {/* Deactivate/Reactivate confirmation */}
      <AlertDialog open={!!togglingProduct} onOpenChange={(o) => !o && setTogglingProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {togglingProduct?.is_active ? 'Desactivar producto' : 'Reactivar producto'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {togglingProduct?.is_active
                ? toggleRefCount > 0
                  ? `Este producto está referenciado en ${toggleRefCount} flujo${toggleRefCount > 1 ? 's' : ''} de producción activo${toggleRefCount > 1 ? 's' : ''}. ¿Desactivar "${togglingProduct.name}" de todos modos?`
                  : `¿Desactivar "${togglingProduct.name}"? No aparecerá en las búsquedas por defecto.`
                : `¿Reactivar "${togglingProduct?.name}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => await handleToggle()}>
              {togglingProduct?.is_active ? 'Desactivar' : 'Reactivar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
