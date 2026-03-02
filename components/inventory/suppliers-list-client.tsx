'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, MoreHorizontal, Truck, Search } from 'lucide-react'

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
import { type SupplierRow, SupplierDialog } from './suppliers-shared'

type Props = {
  suppliers: SupplierRow[]
  canWrite: boolean
  totalPages: number
  totalCount: number
  currentPage: number
  pageSize: number
  statusCounts: { all: number; active: number; inactive: number }
  filters: { status: string; search: string }
}

export function SuppliersListClient({
  suppliers,
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
  const [editingSupplier, setEditingSupplier] = useState<SupplierRow | null>(null)
  const [togglingSupplier, setTogglingSupplier] = useState<SupplierRow | null>(null)

  // Update URL search params
  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value)
        else params.delete(key)
      }
      if (!('page' in updates)) params.delete('page')
      router.push(`/inventory/suppliers?${params.toString()}`)
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
    setEditingSupplier(null)
    setDialogOpen(true)
  }

  function openEdit(s: SupplierRow) {
    setEditingSupplier(s)
    setDialogOpen(true)
  }

  function startToggle(s: SupplierRow) {
    setTogglingSupplier(s)
  }

  async function handleToggle() {
    if (!togglingSupplier) return
    const supabase = createClient()
    const { error } = await supabase
      .from('suppliers')
      .update({ is_active: !togglingSupplier.is_active })
      .eq('id', togglingSupplier.id)
    if (error) {
      toast.error('Error al cambiar el estado del proveedor.')
      return
    }
    toast.success(togglingSupplier.is_active ? 'Proveedor desactivado.' : 'Proveedor reactivado.')
    setTogglingSupplier(null)
    router.refresh()
  }

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

      {/* Toolbar: search + add button */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-sm:w-full">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Nombre, contacto o email..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="h-9 w-full pl-8 sm:w-[200px] lg:w-[280px]"
          />
        </div>

        {canWrite && (
          <Button size="sm" className="ml-auto" onClick={openNew}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nuevo proveedor</span>
          </Button>
        )}
      </div>

      {/* Suppliers table */}
      <div className="overflow-hidden rounded-lg border">
        {suppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Truck className="mb-3 h-10 w-10" />
            <p className="text-sm">
              {filters.search || filters.status ? 'No se encontraron proveedores con estos filtros.' : 'No hay proveedores registrados. Crea el primero.'}
            </p>
          </div>
        ) : (
          <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Cond. de pago</TableHead>
                    <TableHead className="text-center">Productos</TableHead>
                    <TableHead>Estado</TableHead>
                    {canWrite && <TableHead className="w-[50px]" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {s.contact_info?.contact_name ?? '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {s.contact_info?.phone ?? '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {s.contact_info?.email ?? '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {s.payment_terms ?? '—'}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {s.product_count}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-xs ${s.is_active
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-400'
                        }`}>
                          {s.is_active ? 'Activo' : 'Inactivo'}
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
                              <DropdownMenuItem onClick={() => openEdit(s)}>
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => startToggle(s)}>
                                {s.is_active ? 'Desactivar' : 'Reactivar'}
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

      {/* Supplier Dialog */}
      <SupplierDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          if (!o) { setDialogOpen(false); setEditingSupplier(null) }
          else setDialogOpen(true)
        }}
        supplier={editingSupplier}
        onSuccess={() => {
          setDialogOpen(false)
          setEditingSupplier(null)
          router.refresh()
        }}
      />

      {/* Deactivate/Reactivate confirmation */}
      <AlertDialog open={!!togglingSupplier} onOpenChange={(o) => !o && setTogglingSupplier(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {togglingSupplier?.is_active ? 'Desactivar proveedor' : 'Reactivar proveedor'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {togglingSupplier?.is_active
                ? `¿Desactivar a "${togglingSupplier.name}"? El proveedor no estará disponible para nuevos envíos.`
                : `¿Reactivar "${togglingSupplier?.name}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => await handleToggle()}>
              {togglingSupplier?.is_active ? 'Desactivar' : 'Reactivar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
