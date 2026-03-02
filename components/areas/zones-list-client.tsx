'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, MoreHorizontal, MapPin, Search } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTablePagination } from '@/components/shared/data-table-pagination'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
  type ZoneRow,
  purposeLabels,
  environmentLabels,
  statusLabels,
  purposeBadgeStyles,
  statusBadgeStyles,
  selectClass,
  ZoneDialog,
} from './zones-shared'

type FacilityOption = { id: string; name: string }

type Props = {
  zones: ZoneRow[]
  facilities: FacilityOption[]
  canWrite: boolean
  totalPages: number
  totalCount: number
  pageSize: number
  currentPage: number
  filters: { facility: string; purpose: string; status: string; search: string }
}

export function ZonesListClient({
  zones,
  facilities,
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
  const [editingZone, setEditingZone] = useState<ZoneRow | null>(null)

  // Update URL search params
  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value)
        else params.delete(key)
      }
      if (!('page' in updates)) params.delete('page')
      router.push(`/areas/zones?${params.toString()}`)
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

  function openNew() {
    setEditingZone(null)
    setDialogOpen(true)
  }

  function openEdit(z: ZoneRow) {
    setEditingZone(z)
    setDialogOpen(true)
  }

  async function handleStatusChange(z: ZoneRow, newStatus: 'active' | 'maintenance' | 'inactive') {
    const supabase = createClient()
    const { error } = await supabase
      .from('zones')
      .update({ status: newStatus })
      .eq('id', z.id)
    if (error) {
      toast.error('Error al cambiar el estado.')
      return
    }
    toast.success(`Estado cambiado a "${statusLabels[newStatus] ?? newStatus}".`)
    router.refresh()
  }

  const activeFilterCount =
    (filters.facility ? 1 : 0) +
    (filters.purpose ? 1 : 0) +
    (filters.status ? 1 : 0)

  return (
    <div className="space-y-4">
      {/* Toolbar: search + filters + add button */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-sm:w-full">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Nombre de zona..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="h-9 w-full pl-8 sm:w-[200px] lg:w-[280px]"
          />
        </div>

        <FilterPopover activeCount={activeFilterCount}>
          <div>
            <label className="mb-1 block text-xs font-medium">Instalación</label>
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
          <div>
            <label className="mb-1 block text-xs font-medium">Propósito</label>
            <select
              value={filters.purpose}
              onChange={(e) => updateParams({ purpose: e.target.value })}
              className={selectClass}
            >
              <option value="">Todos</option>
              {Object.entries(purposeLabels).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Estado</label>
            <select
              value={filters.status}
              onChange={(e) => updateParams({ status: e.target.value })}
              className={selectClass}
            >
              <option value="">Todos</option>
              {Object.entries(statusLabels).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
        </FilterPopover>

        {canWrite && (
          <Button size="sm" className="ml-auto" onClick={openNew}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nueva zona</span>
          </Button>
        )}
      </div>

      {/* Zones table */}
      <div className="overflow-hidden rounded-lg border">
        {zones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <MapPin className="mb-3 h-10 w-10" />
            <p className="text-sm">
              {activeFilterCount > 0 || filters.search ? 'No se encontraron zonas con estos filtros.' : 'No hay zonas registradas.'}
            </p>
          </div>
        ) : (
          <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Instalación</TableHead>
                    <TableHead>Propósito</TableHead>
                    <TableHead>Ambiente</TableHead>
                    <TableHead className="text-right">Área (m²)</TableHead>
                    <TableHead className="text-right">Cultivo (m²)</TableHead>
                    <TableHead className="text-right">Capacidad</TableHead>
                    <TableHead className="text-right">Estr.</TableHead>
                    <TableHead>Estado</TableHead>
                    {canWrite && <TableHead className="w-[50px]" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zones.map((z) => (
                    <TableRow
                      key={z.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/areas/zones/${z.id}`)}
                    >
                      <TableCell className="font-medium">{z.name}</TableCell>
                      <TableCell className="text-muted-foreground">{z.facility_name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-xs ${purposeBadgeStyles[z.purpose] ?? ''}`}>
                          {purposeLabels[z.purpose] ?? z.purpose}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {environmentLabels[z.environment] ?? z.environment}
                      </TableCell>
                      <TableCell className="text-right">{z.area_m2.toLocaleString('es-CO')}</TableCell>
                      <TableCell className="text-right">{z.effective_growing_area_m2.toLocaleString('es-CO')}</TableCell>
                      <TableCell className="text-right">{z.plant_capacity.toLocaleString('es-CO')}</TableCell>
                      <TableCell className="text-right">{z.structure_count}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-xs ${statusBadgeStyles[z.status] ?? ''}`}>
                          {statusLabels[z.status] ?? z.status}
                        </Badge>
                      </TableCell>
                      {canWrite && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Acciones</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(z) }}>
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger onClick={(e) => e.stopPropagation()}>
                                  Cambiar estado
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                  {(Object.entries(statusLabels) as [('active' | 'maintenance' | 'inactive'), string][]).map(([val, label]) => (
                                    <DropdownMenuItem
                                      key={val}
                                      disabled={z.status === val}
                                      onClick={(e) => { e.stopPropagation(); handleStatusChange(z, val) }}
                                    >
                                      {label}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
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

      {/* Zone Dialog */}
      <ZoneDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          if (!o) { setDialogOpen(false); setEditingZone(null) }
          else setDialogOpen(true)
        }}
        zone={editingZone}
        facilities={facilities}
        defaultFacilityId={filters.facility || undefined}
        onSuccess={() => {
          setDialogOpen(false)
          setEditingZone(null)
          router.refresh()
        }}
      />
    </div>
  )
}
