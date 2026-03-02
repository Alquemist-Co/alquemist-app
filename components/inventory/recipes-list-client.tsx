'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, MoreHorizontal, BookOpen, Search } from 'lucide-react'

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
import { FilterPopover } from '@/components/settings/filter-popover'
import {
  type RecipeRow,
  type ProductOption,
  type UnitOption,
  selectClass,
  RecipeDialog,
  ExecuteRecipeDialog,
  ExecutionHistoryDialog,
  DeactivateRecipeDialog,
} from './recipes-shared'

type Props = {
  recipes: RecipeRow[]
  products: ProductOption[]
  units: UnitOption[]
  canWrite: boolean
  canExecute: boolean
  totalPages: number
  totalCount: number
  pageSize: number
  currentPage: number
  filters: { status: string; search: string }
}

export function RecipesListClient({
  recipes,
  products,
  units,
  canWrite,
  canExecute,
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
  const [editingRecipe, setEditingRecipe] = useState<RecipeRow | null>(null)
  const [executeOpen, setExecuteOpen] = useState(false)
  const [executingRecipe, setExecutingRecipe] = useState<RecipeRow | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyRecipe, setHistoryRecipe] = useState<RecipeRow | null>(null)
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [deactivatingRecipe, setDeactivatingRecipe] = useState<RecipeRow | null>(null)

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value)
        else params.delete(key)
      }
      if (!('page' in updates)) params.delete('page')
      router.push(`/inventory/recipes?${params.toString()}`)
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

  const activeFilterCount = filters.status ? 1 : 0

  const formatDate = (d: string | null) => {
    if (!d) return 'Nunca'
    return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-sm:w-full">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Nombre o código..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="h-9 w-full pl-8 sm:w-[200px] lg:w-[280px]"
          />
        </div>

        <FilterPopover activeCount={activeFilterCount}>
          <div>
            <label className="mb-1 block text-xs font-medium">Estado</label>
            <select
              value={filters.status}
              onChange={(e) => updateParams({ status: e.target.value })}
              className={selectClass}
            >
              <option value="">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
        </FilterPopover>

        {canWrite && (
          <Button size="sm" className="ml-auto" onClick={() => { setEditingRecipe(null); setDialogOpen(true) }}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nueva receta</span>
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border">
        {recipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <BookOpen className="mb-3 h-10 w-10" />
            <p className="text-sm">
              {activeFilterCount > 0 || filters.search
                ? 'No se encontraron recetas con estos filtros.'
                : 'No hay recetas registradas.'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Producto resultante</TableHead>
                <TableHead className="text-right">Cantidad base</TableHead>
                <TableHead className="text-right">Ingredientes</TableHead>
                <TableHead>Última ejecución</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipes.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium font-mono text-xs">{r.code}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{r.output_product_name}</TableCell>
                  <TableCell className="text-right">{r.base_quantity} {r.base_unit_code}</TableCell>
                  <TableCell className="text-right">{r.items_count}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.last_execution)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`text-xs ${r.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-400'}`}>
                      {r.is_active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Acciones</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canWrite && (
                          <DropdownMenuItem onClick={() => { setEditingRecipe(r); setDialogOpen(true) }}>
                            Editar
                          </DropdownMenuItem>
                        )}
                        {canExecute && r.is_active && (
                          <DropdownMenuItem onClick={() => { setExecutingRecipe(r); setExecuteOpen(true) }}>
                            Ejecutar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => { setHistoryRecipe(r); setHistoryOpen(true) }}>
                          Ver ejecuciones
                        </DropdownMenuItem>
                        {canWrite && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => { setDeactivatingRecipe(r); setDeactivateOpen(true) }}>
                              {r.is_active ? 'Desactivar' : 'Reactivar'}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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

      {/* Create/Edit Dialog */}
      <RecipeDialog
        open={dialogOpen}
        onOpenChange={(o) => { if (!o) { setDialogOpen(false); setEditingRecipe(null) } else setDialogOpen(true) }}
        recipe={editingRecipe}
        products={products}
        units={units}
        onSuccess={() => { setDialogOpen(false); setEditingRecipe(null); router.refresh() }}
      />

      {/* Execute Dialog */}
      <ExecuteRecipeDialog
        open={executeOpen}
        onOpenChange={(o) => { if (!o) { setExecuteOpen(false); setExecutingRecipe(null) } else setExecuteOpen(true) }}
        recipe={executingRecipe}
        products={products}
        units={units}
        onSuccess={() => { setExecuteOpen(false); setExecutingRecipe(null); router.refresh() }}
      />

      {/* History Dialog */}
      <ExecutionHistoryDialog
        open={historyOpen}
        onOpenChange={(o) => { if (!o) { setHistoryOpen(false); setHistoryRecipe(null) } else setHistoryOpen(true) }}
        recipe={historyRecipe}
      />

      {/* Deactivate Dialog */}
      <DeactivateRecipeDialog
        open={deactivateOpen}
        onOpenChange={(o) => { if (!o) { setDeactivateOpen(false); setDeactivatingRecipe(null) } else setDeactivateOpen(true) }}
        recipe={deactivatingRecipe}
        onSuccess={() => { setDeactivateOpen(false); setDeactivatingRecipe(null); router.refresh() }}
      />
    </div>
  )
}
