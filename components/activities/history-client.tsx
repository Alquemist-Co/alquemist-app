'use client'

import { useState, useCallback, useEffect, useRef, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search, History, ChevronDown, ChevronRight, Download,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { DataTablePagination } from '@/components/shared/data-table-pagination'
import { FilterPopover } from '@/components/settings/filter-popover'
import { createClient } from '@/lib/supabase/client'
import {
  type ActivityRow,
  type FacilityOption,
  type ZoneOption,
  type BatchOption,
  type ActivityTypeOption,
  type PhaseOption,
  type CultivarOption,
  type OperatorOption,
  selectClass,
  activityStatusLabels,
  activityStatusBadgeStyles,
  observationTypeLabels,
  observationTypeBadgeStyles,
  severityLabels,
  severityBadgeStyles,
  plantPartLabels,
  formatDateTime,
} from './activities-shared'

type Props = {
  activities: ActivityRow[]
  facilities: FacilityOption[]
  zones: ZoneOption[]
  batches: BatchOption[]
  activityTypes: ActivityTypeOption[]
  cultivars: CultivarOption[]
  phases: PhaseOption[]
  operators: OperatorOption[]
  totalPages: number
  totalCount: number
  pageSize: number
  currentPage: number
  filters: {
    status: string
    facility: string
    zone: string
    batch: string
    type: string
    cultivar: string
    phase: string
    operator: string
    search: string
    date_from: string
    date_to: string
  }
  canExport: boolean
  isOperator: boolean
}

type ActivityDetail = {
  resources: {
    product_name: string
    quantity_planned: number | null
    quantity_actual: number
    unit_code: string
    lot_number: string | null
    cost_total: number | null
  }[]
  observations: {
    id: string
    type: string
    agent_name: string | null
    plant_part: string | null
    severity: string
    incidence_value: number | null
    incidence_unit: string | null
    sample_size: number | null
    affected_plants: number | null
    description: string
    action_taken: string | null
  }[]
  measurement_data: Record<string, unknown> | null
  notes: string | null
}

export function HistoryClient({
  activities,
  facilities,
  zones,
  batches,
  activityTypes,
  cultivars,
  phases,
  operators,
  totalPages,
  totalCount,
  pageSize,
  currentPage,
  filters,
  canExport,
  isOperator,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const [searchValue, setSearchValue] = useState(filters.search)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detailCache, setDetailCache] = useState<Record<string, ActivityDetail>>({})
  const [detailLoading, setDetailLoading] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value)
        else params.delete(key)
      }
      if (!('page' in updates)) params.delete('page')
      startTransition(() => {
        router.push(`/activities/history?${params.toString()}`)
      })
    },
    [router, searchParams, startTransition],
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

  async function toggleExpand(activityId: string) {
    if (expandedId === activityId) {
      setExpandedId(null)
      return
    }

    setExpandedId(activityId)

    if (detailCache[activityId]) return

    setDetailLoading(activityId)
    try {
      const supabase = createClient()

      const [resourcesRes, observationsRes, activityRes] = await Promise.all([
        supabase
          .from('activity_resources')
          .select('*, product:products(name, sku), item:inventory_items(batch_number), unit:units_of_measure(code, name)')
          .eq('activity_id', activityId),
        supabase
          .from('activity_observations')
          .select('*, agent:phytosanitary_agents(common_name, scientific_name)')
          .eq('activity_id', activityId)
          .order('created_at'),
        supabase
          .from('activities')
          .select('measurement_data, notes')
          .eq('id', activityId)
          .single(),
      ])

      const resources = (resourcesRes.data ?? []).map((r) => {
        const product = r.product as { name: string; sku: string } | null
        const item = r.item as { batch_number: string } | null
        const unit = r.unit as { code: string; name: string } | null
        return {
          product_name: product?.name ?? '—',
          quantity_planned: r.quantity_planned,
          quantity_actual: r.quantity_actual,
          unit_code: unit?.code ?? '',
          lot_number: item?.batch_number ?? null,
          cost_total: r.cost_total,
        }
      })

      const observations = (observationsRes.data ?? []).map((o) => {
        const agent = o.agent as { common_name: string; scientific_name: string | null } | null
        return {
          id: o.id,
          type: o.type,
          agent_name: agent ? `${agent.common_name}${agent.scientific_name ? ` (${agent.scientific_name})` : ''}` : null,
          plant_part: o.plant_part,
          severity: o.severity,
          incidence_value: o.incidence_value,
          incidence_unit: o.incidence_unit,
          sample_size: o.sample_size,
          affected_plants: o.affected_plants,
          description: o.description,
          action_taken: o.action_taken,
        }
      })

      setDetailCache((prev) => ({
        ...prev,
        [activityId]: {
          resources,
          observations,
          measurement_data: activityRes.data?.measurement_data as Record<string, unknown> | null,
          notes: activityRes.data?.notes ?? null,
        },
      }))
    } catch {
      toast.error('Error al cargar el detalle de la actividad')
    } finally {
      setDetailLoading(null)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const supabase = createClient()
      let exportQuery = supabase
        .from('activities')
        .select(`
          performed_at, crop_day, status, duration_minutes, notes,
          type:activity_types(name),
          template:activity_templates(name),
          batch:batches(code, cultivar:cultivars(name), phase:production_phases!batches_current_phase_id_fkey(name)),
          zone:zones(name),
          user:users!activities_performed_by_fkey(full_name),
          resources:activity_resources(count),
          observations:activity_observations(count)
        `)

      // Apply the same filters as the main query
      if (filters.status) exportQuery = exportQuery.eq('status', filters.status as 'completed')
      if (filters.batch) exportQuery = exportQuery.eq('batch_id', filters.batch)
      if (filters.type) exportQuery = exportQuery.eq('activity_type_id', filters.type)
      if (filters.zone) exportQuery = exportQuery.eq('zone_id', filters.zone)
      if (filters.operator) exportQuery = exportQuery.eq('performed_by', filters.operator)
      if (filters.date_from) exportQuery = exportQuery.gte('performed_at', filters.date_from)
      if (filters.date_to) exportQuery = exportQuery.lte('performed_at', filters.date_to + 'T23:59:59')
      if (filters.search?.trim()) {
        const term = `%${filters.search.trim()}%`
        exportQuery = exportQuery.or(`notes.ilike.${term}`)
      }

      const { data, error } = await exportQuery
        .order('performed_at', { ascending: false })
        .limit(5000)

      if (error) throw error
      if (!data || data.length === 0) {
        toast.error('No hay datos para exportar')
        return
      }

      const rows = data.map((a) => {
        const type = a.type as { name: string } | null
        const template = a.template as { name: string } | null
        const batch = a.batch as { code: string; cultivar: { name: string } | null; phase: { name: string } | null } | null
        const zone = a.zone as { name: string } | null
        const user = a.user as { full_name: string } | null
        const resources = a.resources as { count: number }[]
        const observations = a.observations as { count: number }[]
        return [
          a.performed_at, a.crop_day ?? '', type?.name ?? '', template?.name ?? '',
          batch?.code ?? '', batch?.cultivar?.name ?? '', batch?.phase?.name ?? '',
          zone?.name ?? '', user?.full_name ?? '', a.duration_minutes ?? '',
          resources?.[0]?.count ?? 0, observations?.[0]?.count ?? 0,
          a.status, a.notes ?? '',
        ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')
      })

      const header = 'Fecha,Día,Tipo,Template,Batch,Cultivar,Fase,Zona,Operario,Duración,#Recursos,#Observaciones,Status,Notas'
      const csv = [header, ...rows].join('\n')
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `actividades_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Exportación completada')
    } catch {
      toast.error('Error al exportar')
    } finally {
      setExporting(false)
    }
  }

  const activeFilterCount =
    (filters.status ? 1 : 0) + (filters.facility ? 1 : 0) +
    (filters.zone ? 1 : 0) + (filters.batch ? 1 : 0) +
    (filters.type ? 1 : 0) + (filters.cultivar ? 1 : 0) +
    (filters.phase ? 1 : 0) + (filters.operator ? 1 : 0) +
    (filters.date_from ? 1 : 0) + (filters.date_to ? 1 : 0)

  const filteredZones = filters.facility
    ? zones.filter((z) => z.facility_id === filters.facility)
    : zones

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-sm:w-full">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar actividad..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="h-9 w-full pl-8 sm:w-[200px] lg:w-[240px]"
          />
        </div>

        <FilterPopover activeCount={activeFilterCount}>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium">Estado</label>
              <select value={filters.status} onChange={(e) => updateParams({ status: e.target.value })} className={selectClass}>
                <option value="">Todos</option>
                <option value="completed">Completada</option>
                <option value="cancelled">Cancelada</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Instalación</label>
              <select value={filters.facility} onChange={(e) => updateParams({ facility: e.target.value, zone: '', batch: '' })} className={selectClass}>
                <option value="">Todas</option>
                {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Zona</label>
              <select value={filters.zone} onChange={(e) => updateParams({ zone: e.target.value })} className={selectClass}>
                <option value="">Todas</option>
                {filteredZones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Lote</label>
              <select value={filters.batch} onChange={(e) => updateParams({ batch: e.target.value })} className={selectClass}>
                <option value="">Todos</option>
                {batches.map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Tipo de actividad</label>
              <select value={filters.type} onChange={(e) => updateParams({ type: e.target.value })} className={selectClass}>
                <option value="">Todos</option>
                {activityTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Cultivar</label>
              <select value={filters.cultivar} onChange={(e) => updateParams({ cultivar: e.target.value })} className={selectClass}>
                <option value="">Todos</option>
                {cultivars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Fase</label>
              <select value={filters.phase} onChange={(e) => updateParams({ phase: e.target.value })} className={selectClass}>
                <option value="">Todas</option>
                {phases.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            {!isOperator && (
              <div>
                <label className="mb-1 block text-xs font-medium">Operario</label>
                <select value={filters.operator} onChange={(e) => updateParams({ operator: e.target.value })} className={selectClass}>
                  <option value="">Todos</option>
                  {operators.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs font-medium">Desde</label>
                <Input type="date" value={filters.date_from} onChange={(e) => updateParams({ date_from: e.target.value })} className="h-9" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Hasta</label>
                <Input type="date" value={filters.date_to} onChange={(e) => updateParams({ date_to: e.target.value })} className="h-9" />
              </div>
            </div>
          </div>
        </FilterPopover>

        {canExport && (
          <Button variant="outline" size="sm" className="ml-auto h-9" onClick={handleExport} disabled={exporting}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            {exporting ? 'Exportando...' : 'Exportar CSV'}
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <History className="mb-3 h-10 w-10" />
            <p className="text-sm">No se encontraron actividades con estos filtros.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Día</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Actividad</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Fase</TableHead>
                <TableHead>Zona</TableHead>
                <TableHead>Operario</TableHead>
                <TableHead className="text-right">Duración</TableHead>
                <TableHead className="text-center">Rec.</TableHead>
                <TableHead className="text-center">Obs.</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((a) => (
                <>
                  <TableRow
                    key={a.id}
                    className="cursor-pointer"
                    onClick={() => toggleExpand(a.id)}
                  >
                    <TableCell className="w-8 px-2">
                      {expandedId === a.id
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      }
                    </TableCell>
                    <TableCell className="text-sm">{formatDateTime(a.performed_at)}</TableCell>
                    <TableCell className="text-sm">{a.crop_day ?? '—'}</TableCell>
                    <TableCell className="text-sm">{a.activity_type_name}</TableCell>
                    <TableCell className="text-sm font-medium">
                      {a.template_name}
                      {a.template_code && (
                        <span className="ml-1 font-mono text-xs text-muted-foreground">{a.template_code}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <button
                        className="text-primary underline-offset-2 hover:underline"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/production/batches/${a.batch_id}`)
                        }}
                      >
                        {a.batch_code}
                      </button>
                    </TableCell>
                    <TableCell className="text-sm">{a.phase_name}</TableCell>
                    <TableCell className="text-sm">
                      <div>{a.zone_name}</div>
                      <div className="text-xs text-muted-foreground">{a.facility_name}</div>
                    </TableCell>
                    <TableCell className="text-sm">{a.operator_name}</TableCell>
                    <TableCell className="text-right text-sm">
                      {a.duration_minutes ? `${a.duration_minutes} min` : '—'}
                    </TableCell>
                    <TableCell className="text-center text-sm">{a.resources_count}</TableCell>
                    <TableCell className="text-center text-sm">
                      <span className="inline-flex items-center gap-1">
                        {a.observations_count}
                        {a.has_high_severity && (
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-xs ${activityStatusBadgeStyles[a.status] ?? ''}`}>
                        {activityStatusLabels[a.status] ?? a.status}
                      </Badge>
                    </TableCell>
                  </TableRow>

                  {/* Expandable detail row */}
                  {expandedId === a.id && (
                    <TableRow key={`${a.id}-detail`}>
                      <TableCell colSpan={13} className="bg-muted/30 p-4">
                        {detailLoading === a.id ? (
                          <p className="text-sm text-muted-foreground">Cargando detalle...</p>
                        ) : detailCache[a.id] ? (
                          <ActivityDetailPanel detail={detailCache[a.id]} />
                        ) : null}
                      </TableCell>
                    </TableRow>
                  )}
                </>
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
        onPageChange={(p) => updateParams({ page: p > 1 ? String(p) : '' })}
      />
    </div>
  )
}

function ActivityDetailPanel({ detail }: { detail: ActivityDetail }) {
  return (
    <div className="space-y-4">
      {/* Notes */}
      {detail.notes && (
        <div>
          <h4 className="mb-1 text-xs font-medium text-muted-foreground">Notas</h4>
          <p className="text-sm">{detail.notes}</p>
        </div>
      )}

      {/* Measurement data */}
      {detail.measurement_data && Object.keys(detail.measurement_data).length > 0 && (
        <div>
          <h4 className="mb-1 text-xs font-medium text-muted-foreground">Mediciones</h4>
          <div className="flex flex-wrap gap-3">
            {Object.entries(detail.measurement_data).map(([key, value]) => (
              <div key={key} className="rounded border px-2 py-1 text-sm">
                <span className="text-muted-foreground">{key}: </span>
                <span className="font-medium">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resources */}
      {detail.resources.length > 0 && (
        <div>
          <h4 className="mb-1 text-xs font-medium text-muted-foreground">Recursos consumidos</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-1 pr-4">Producto</th>
                  <th className="pb-1 pr-4 text-right">Planificado</th>
                  <th className="pb-1 pr-4 text-right">Real</th>
                  <th className="pb-1 pr-4">Unidad</th>
                  <th className="pb-1 pr-4">Lote</th>
                  <th className="pb-1 text-right">Costo</th>
                </tr>
              </thead>
              <tbody>
                {detail.resources.map((r, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-1 pr-4">{r.product_name}</td>
                    <td className="py-1 pr-4 text-right">{r.quantity_planned?.toLocaleString('es-CO') ?? '—'}</td>
                    <td className="py-1 pr-4 text-right font-medium">{r.quantity_actual.toLocaleString('es-CO')}</td>
                    <td className="py-1 pr-4">{r.unit_code}</td>
                    <td className="py-1 pr-4 font-mono text-xs">{r.lot_number ?? '—'}</td>
                    <td className="py-1 text-right">{r.cost_total != null ? `$${r.cost_total.toLocaleString('es-CO')}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
              {detail.resources.some((r) => r.cost_total != null) && (
                <tfoot>
                  <tr className="font-medium">
                    <td colSpan={5} className="py-1 text-right">Total:</td>
                    <td className="py-1 text-right">
                      ${detail.resources.reduce((sum, r) => sum + (r.cost_total ?? 0), 0).toLocaleString('es-CO')}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Observations */}
      {detail.observations.length > 0 && (
        <div>
          <h4 className="mb-1 text-xs font-medium text-muted-foreground">Observaciones</h4>
          <div className="space-y-2">
            {detail.observations.map((o) => (
              <div key={o.id} className="rounded border p-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className={`text-[10px] ${observationTypeBadgeStyles[o.type] ?? ''}`}>
                    {observationTypeLabels[o.type] ?? o.type}
                  </Badge>
                  <Badge variant="secondary" className={`text-[10px] ${severityBadgeStyles[o.severity] ?? ''}`}>
                    {severityLabels[o.severity] ?? o.severity}
                  </Badge>
                  {o.agent_name && (
                    <span className="text-xs text-muted-foreground">{o.agent_name}</span>
                  )}
                  {o.plant_part && (
                    <span className="text-xs text-muted-foreground">· {plantPartLabels[o.plant_part] ?? o.plant_part}</span>
                  )}
                </div>
                {(o.incidence_value != null || o.sample_size != null || o.affected_plants != null) && (
                  <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                    {o.incidence_value != null && (
                      <span>Incidencia: {o.incidence_value} {o.incidence_unit === 'percentage' ? '%' : 'ind.'}</span>
                    )}
                    {o.sample_size != null && <span>Muestra: {o.sample_size} plantas</span>}
                    {o.affected_plants != null && <span>Afectadas: {o.affected_plants}</span>}
                  </div>
                )}
                <p className="mt-1 text-sm">{o.description}</p>
                {o.action_taken && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    <span className="font-medium">Acción: </span>{o.action_taken}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {detail.resources.length === 0 && detail.observations.length === 0 && !detail.notes && (
        <p className="text-sm text-muted-foreground">Sin detalles adicionales registrados.</p>
      )}
    </div>
  )
}
