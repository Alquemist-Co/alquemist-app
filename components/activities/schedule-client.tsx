'use client'

import { useState, useCallback, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  CalendarDays, List, ChevronLeft, ChevronRight,
  Search, Clock, AlertTriangle, Play, CalendarOff,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { DataTablePagination } from '@/components/shared/data-table-pagination'
import { FilterPopover } from '@/components/settings/filter-popover'
import { createClient } from '@/lib/supabase/client'
import {
  type ScheduledActivityRow,
  type FacilityOption,
  type ZoneOption,
  type BatchOption,
  type ActivityTypeOption,
  selectClass,
  scheduledStatusLabels,
  scheduledStatusBadgeStyles,
  formatDate,
} from './activities-shared'

type Props = {
  activities: ScheduledActivityRow[]
  facilities: FacilityOption[]
  zones: ZoneOption[]
  batches: BatchOption[]
  activityTypes: ActivityTypeOption[]
  totalPages: number
  totalCount: number
  pageSize: number
  currentPage: number
  weekStart: string
  kpis: {
    pending: number
    completed: number
    overdue: number
    skipped: number
  }
  filters: {
    status: string
    facility: string
    zone: string
    batch: string
    type: string
    search: string
    view: string
  }
  canManage: boolean
  userRole: string
}

export function ScheduleClient({
  activities,
  facilities,
  zones,
  batches,
  activityTypes,
  totalPages,
  totalCount,
  pageSize,
  currentPage,
  weekStart,
  kpis,
  filters,
  canManage,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [searchValue, setSearchValue] = useState(filters.search)
  const [selectedActivity, setSelectedActivity] = useState<ScheduledActivityRow | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [showSkipDialog, setShowSkipDialog] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const isCalendarView = filters.view !== 'list'

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value)
        else params.delete(key)
      }
      if (!('page' in updates)) params.delete('page')
      startTransition(() => {
        router.push(`/activities/schedule?${params.toString()}`)
      })
    },
    [router, searchParams, startTransition],
  )

  // Filter activities client-side for search and cascading facility→zone→batch
  const filteredActivities = activities.filter((a) => {
    if (filters.search) {
      const term = filters.search.toLowerCase()
      if (
        !a.template_name.toLowerCase().includes(term) &&
        !a.batch_code.toLowerCase().includes(term) &&
        !a.cultivar_name.toLowerCase().includes(term)
      ) return false
    }
    if (filters.facility) {
      const facilityZones = zones.filter((z) => z.facility_id === filters.facility)
      const zoneNames = facilityZones.map((z) => z.name)
      if (!zoneNames.includes(a.zone_name)) return false
    }
    if (filters.zone) {
      const zone = zones.find((z) => z.id === filters.zone)
      if (zone && a.zone_name !== zone.name) return false
    }
    if (filters.type) {
      const atype = activityTypes.find((t) => t.id === filters.type)
      if (atype && a.activity_type_name !== atype.name) return false
    }
    return true
  })

  // Group activities by date for calendar view
  const activitiesByDate: Record<string, ScheduledActivityRow[]> = {}
  for (const a of filteredActivities) {
    const date = a.planned_date
    if (!activitiesByDate[date]) activitiesByDate[date] = []
    activitiesByDate[date].push(a)
  }

  // Generate week days
  const weekDays = getWeekDays(weekStart)

  function navigateWeek(direction: number) {
    const d = new Date(weekStart + 'T00:00:00')
    d.setDate(d.getDate() + direction * 7)
    updateParams({ week_start: d.toISOString().split('T')[0] })
  }

  function goToToday() {
    updateParams({ week_start: '' })
  }

  async function handleReschedule() {
    if (!selectedActivity || !rescheduleDate) return
    setActionLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('scheduled_activities')
        .update({ planned_date: rescheduleDate })
        .eq('id', selectedActivity.id)
        .in('status', ['pending', 'overdue'])

      if (error) throw error
      toast.success(`Actividad re-programada al ${formatDate(rescheduleDate)}`)
      setSelectedActivity(null)
      setRescheduleDate('')
      router.refresh()
    } catch {
      toast.error('Error al re-programar la actividad')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleSkip() {
    if (!selectedActivity) return
    setActionLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('scheduled_activities')
        .update({ status: 'skipped' as const })
        .eq('id', selectedActivity.id)
        .in('status', ['pending', 'overdue'])

      if (error) throw error
      toast.success('Actividad omitida')
      setShowSkipDialog(false)
      setSelectedActivity(null)
      router.refresh()
    } catch {
      toast.error('Error al omitir la actividad')
    } finally {
      setActionLoading(false)
    }
  }

  const activeFilterCount =
    (filters.status ? 1 : 0) + (filters.facility ? 1 : 0) +
    (filters.zone ? 1 : 0) + (filters.batch ? 1 : 0) + (filters.type ? 1 : 0)

  // Filtered zones/batches for cascading
  const filteredZones = filters.facility
    ? zones.filter((z) => z.facility_id === filters.facility)
    : zones
  const filteredBatches = filters.zone
    ? batches.filter((b) => b.zone_id === filters.zone)
    : batches

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Pendientes" value={kpis.pending} />
        <KpiCard label="Completadas" value={kpis.completed} />
        <KpiCard label="Vencidas" value={kpis.overdue} color="text-red-600" />
        <KpiCard label="Omitidas" value={kpis.skipped} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-sm:w-full">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar actividad..."
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value)
              // Debounce would be nice but for now just update
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') updateParams({ search: searchValue })
            }}
            onBlur={() => {
              if (searchValue !== filters.search) updateParams({ search: searchValue })
            }}
            className="h-9 w-full pl-8 sm:w-[200px] lg:w-[240px]"
          />
        </div>

        <FilterPopover activeCount={activeFilterCount}>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium">Estado</label>
              <select value={filters.status} onChange={(e) => updateParams({ status: e.target.value })} className={selectClass}>
                <option value="">Todos</option>
                <option value="pending">Pendiente</option>
                <option value="completed">Completada</option>
                <option value="skipped">Omitida</option>
                <option value="overdue">Vencida</option>
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
              <select value={filters.zone} onChange={(e) => updateParams({ zone: e.target.value, batch: '' })} className={selectClass}>
                <option value="">Todas</option>
                {filteredZones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Lote</label>
              <select value={filters.batch} onChange={(e) => updateParams({ batch: e.target.value })} className={selectClass}>
                <option value="">Todos</option>
                {filteredBatches.map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Tipo de actividad</label>
              <select value={filters.type} onChange={(e) => updateParams({ type: e.target.value })} className={selectClass}>
                <option value="">Todos</option>
                {activityTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
        </FilterPopover>

        {/* View toggle */}
        <div className="ml-auto flex items-center gap-1 rounded-md border p-0.5">
          <Button
            variant={isCalendarView ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-2"
            onClick={() => updateParams({ view: '' })}
          >
            <CalendarDays className="mr-1 h-3.5 w-3.5" />
            Calendario
          </Button>
          <Button
            variant={!isCalendarView ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-2"
            onClick={() => updateParams({ view: 'list' })}
          >
            <List className="mr-1 h-3.5 w-3.5" />
            Lista
          </Button>
        </div>
      </div>

      {/* Calendar view */}
      {isCalendarView ? (
        <div className="space-y-3">
          {/* Week navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateWeek(-1)} disabled={isPending}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday} disabled={isPending}>
              Hoy
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateWeek(1)} disabled={isPending}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="ml-2 text-sm font-medium">
              {formatDate(weekDays[0])} — {formatDate(weekDays[6])}
            </span>
          </div>

          {/* Weekly grid */}
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border">
            {weekDays.map((day) => {
              const dayActivities = activitiesByDate[day] ?? []
              const isToday = day === new Date().toISOString().split('T')[0]
              return (
                <div
                  key={day}
                  className={`min-h-[140px] bg-background p-2 ${isToday ? 'ring-2 ring-primary ring-inset' : ''}`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className={`text-xs font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                      {new Date(day + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' })}
                    </span>
                    {dayActivities.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">{dayActivities.length}</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {dayActivities.slice(0, 4).map((a) => (
                      <button
                        key={a.id}
                        onClick={() => setSelectedActivity(a)}
                        className={`w-full rounded px-1.5 py-1 text-left text-[11px] leading-tight transition-colors hover:opacity-80 ${
                          a.status === 'overdue'
                            ? 'border border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400'
                            : a.status === 'completed'
                              ? 'border border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400'
                              : a.status === 'skipped'
                                ? 'border border-gray-300 bg-gray-50 text-gray-500 line-through dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500'
                                : 'border border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400'
                        }`}
                      >
                        <div className="truncate font-medium">{a.template_name}</div>
                        <div className="truncate text-[10px] opacity-75">{a.batch_code}</div>
                      </button>
                    ))}
                    {dayActivities.length > 4 && (
                      <div className="text-center text-[10px] text-muted-foreground">
                        +{dayActivities.length - 4} más
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* List view */
        <>
          <div className="overflow-hidden rounded-lg border">
            {filteredActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <CalendarOff className="mb-3 h-10 w-10" />
                <p className="text-sm">No hay actividades programadas para este periodo.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Día</TableHead>
                    <TableHead>Actividad</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Fase</TableHead>
                    <TableHead>Zona</TableHead>
                    <TableHead>Duración est.</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivities.map((a) => (
                    <TableRow
                      key={a.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedActivity(a)}
                    >
                      <TableCell className="text-sm">{formatDate(a.planned_date)}</TableCell>
                      <TableCell className="text-sm">{a.crop_day ?? '—'}</TableCell>
                      <TableCell className="text-sm font-medium">{a.template_name}</TableCell>
                      <TableCell className="text-sm">{a.activity_type_name}</TableCell>
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
                      <TableCell className="text-sm">
                        {a.estimated_duration_min ? `${a.estimated_duration_min} min` : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-xs ${scheduledStatusBadgeStyles[a.status] ?? ''}`}>
                          {scheduledStatusLabels[a.status] ?? a.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {canManage && (a.status === 'pending' || a.status === 'overdue') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/activities/execute/${a.id}`)
                            }}
                          >
                            <Play className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={(p) => updateParams({ page: p > 1 ? String(p) : '' })}
          />
        </>
      )}

      {/* Detail sidebar / dialog */}
      <Dialog open={!!selectedActivity && !showSkipDialog} onOpenChange={(open) => { if (!open) { setSelectedActivity(null); setRescheduleDate('') } }}>
        <DialogContent className="sm:max-w-md">
          {selectedActivity && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedActivity.template_name}</DialogTitle>
                <DialogDescription>
                  {selectedActivity.batch_code} · {selectedActivity.cultivar_name} · {selectedActivity.phase_name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Estado</span>
                  <Badge variant="secondary" className={`text-xs ${scheduledStatusBadgeStyles[selectedActivity.status] ?? ''}`}>
                    {scheduledStatusLabels[selectedActivity.status] ?? selectedActivity.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Fecha planificada</span>
                  <span>{formatDate(selectedActivity.planned_date)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Día de cultivo</span>
                  <span>{selectedActivity.crop_day ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tipo</span>
                  <span>{selectedActivity.activity_type_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Zona</span>
                  <span>{selectedActivity.zone_name} ({selectedActivity.facility_name})</span>
                </div>
                {selectedActivity.estimated_duration_min && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Duración estimada</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {selectedActivity.estimated_duration_min} min
                    </span>
                  </div>
                )}

                {/* Reschedule */}
                {canManage && (selectedActivity.status === 'pending' || selectedActivity.status === 'overdue') && (
                  <div className="space-y-2 rounded-md border p-3">
                    <label className="text-xs font-medium">Re-programar</label>
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={rescheduleDate}
                        onChange={(e) => setRescheduleDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="h-8 flex-1"
                      />
                      <Button
                        size="sm"
                        className="h-8"
                        disabled={!rescheduleDate || actionLoading}
                        onClick={handleReschedule}
                      >
                        {actionLoading ? 'Guardando...' : 'Guardar'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row">
                {canManage && (selectedActivity.status === 'pending' || selectedActivity.status === 'overdue') && (
                  <>
                    <Button
                      variant="default"
                      onClick={() => router.push(`/activities/execute/${selectedActivity.id}`)}
                    >
                      <Play className="mr-1.5 h-4 w-4" />
                      Ejecutar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowSkipDialog(true)}
                    >
                      Omitir
                    </Button>
                  </>
                )}
                {selectedActivity.status === 'completed' && selectedActivity.completed_activity_id && (
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/activities/history`)}
                  >
                    Ver en historial
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Skip confirmation dialog */}
      <Dialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Omitir actividad
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas omitir &ldquo;{selectedActivity?.template_name}&rdquo;?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSkipDialog(false)} disabled={actionLoading}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleSkip} disabled={actionLoading}>
              {actionLoading ? 'Omitiendo...' : 'Omitir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function KpiCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color ?? ''}`}>{value}</p>
    </div>
  )
}

function getWeekDays(weekStart: string): string[] {
  const start = new Date(weekStart + 'T00:00:00')
  const days: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}
