'use client'

import { useState } from 'react'
import { ChevronDown, Play, Calendar, SkipForward, AlertTriangle, CheckCircle2, Clock, CircleDashed, Plus } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { OrderPhaseData, ScheduledActivityData, ActivityData, ZoneOption } from '../batch-detail-client'
import { ScheduleActivityDialog } from './schedule-activity-dialog'
import { RescheduleDialog } from './reschedule-dialog'
import { SkipDialog } from './skip-dialog'
import { ExecuteActivityWizard } from './execute-activity-wizard'

// ---------- Helpers ----------

const formatDate = (d: string | null) => {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
  })
}

const formatDateTime = (d: string) => {
  return new Date(d).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const scheduledStatusLabels: Record<string, string> = {
  pending: 'Pendiente',
  completed: 'Completada',
  skipped: 'Omitida',
  overdue: 'Vencida',
}

const scheduledStatusStyles: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  skipped: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

const activityStatusLabels: Record<string, string> = {
  in_progress: 'En progreso',
  completed: 'Completada',
  cancelled: 'Cancelada',
}

const activityStatusStyles: Record<string, string> = {
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

// ---------- Types ----------

type Props = {
  phases: OrderPhaseData[]
  scheduledActivities: ScheduledActivityData[]
  activities: ActivityData[]
  currentPhaseId: string
  batchId: string
  batchStartDate: string
  zoneId: string
  zones: ZoneOption[]
  canSchedule: boolean
  canExecute: boolean
}

// ---------- Component ----------

export function ActivitiesTab({
  phases,
  scheduledActivities,
  activities,
  currentPhaseId,
  batchId,
  batchStartDate,
  zoneId,
  zones,
  canSchedule,
  canExecute,
}: Props) {
  // Track which phase sections are open - default current phase open
  const [openPhases, setOpenPhases] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    initial.add(currentPhaseId)
    return initial
  })

  // Dialog states
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [schedulePhase, setSchedulePhase] = useState<{ id: string; name: string } | null>(null)

  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false)
  const [rescheduleActivity, setRescheduleActivity] = useState<ScheduledActivityData | null>(null)

  const [skipDialogOpen, setSkipDialogOpen] = useState(false)
  const [skipActivity, setSkipActivity] = useState<ScheduledActivityData | null>(null)

  const [executeDialogOpen, setExecuteDialogOpen] = useState(false)
  const [executeActivity, setExecuteActivity] = useState<ScheduledActivityData | null>(null)

  const togglePhase = (phaseId: string) => {
    setOpenPhases((prev) => {
      const next = new Set(prev)
      if (next.has(phaseId)) {
        next.delete(phaseId)
      } else {
        next.add(phaseId)
      }
      return next
    })
  }

  const handleScheduleClick = (phaseId: string, phaseName: string) => {
    setSchedulePhase({ id: phaseId, name: phaseName })
    setScheduleDialogOpen(true)
  }

  const handleRescheduleClick = (sa: ScheduledActivityData) => {
    setRescheduleActivity(sa)
    setRescheduleDialogOpen(true)
  }

  const handleSkipClick = (sa: ScheduledActivityData) => {
    setSkipActivity(sa)
    setSkipDialogOpen(true)
  }

  const handleExecuteClick = (sa: ScheduledActivityData) => {
    setExecuteActivity(sa)
    setExecuteDialogOpen(true)
  }

  // Group scheduled and activities by phase
  const scheduledByPhase = new Map<string, ScheduledActivityData[]>()
  const activitiesByPhase = new Map<string, ActivityData[]>()

  for (const sa of scheduledActivities) {
    const phaseId = sa.phase_id ?? 'unassigned'
    if (!scheduledByPhase.has(phaseId)) {
      scheduledByPhase.set(phaseId, [])
    }
    scheduledByPhase.get(phaseId)!.push(sa)
  }

  for (const a of activities) {
    const phaseId = a.phase_id ?? 'unassigned'
    if (!activitiesByPhase.has(phaseId)) {
      activitiesByPhase.set(phaseId, [])
    }
    activitiesByPhase.get(phaseId)!.push(a)
  }

  // Calculate stats for each phase
  const getPhaseStats = (phaseId: string) => {
    const scheduled = scheduledByPhase.get(phaseId) ?? []
    const executed = activitiesByPhase.get(phaseId) ?? []
    const completed = scheduled.filter((s) => s.status === 'completed').length + executed.filter((a) => a.status === 'completed').length
    const pending = scheduled.filter((s) => s.status === 'pending').length
    const overdue = scheduled.filter((s) => s.status === 'overdue').length
    return { completed, pending, overdue }
  }

  // If no phases, show empty state
  if (phases.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No hay fases definidas en la orden de producción.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {phases.map((phase) => {
          const isCurrent = phase.phase_id === currentPhaseId
          const isOpen = openPhases.has(phase.phase_id)
          const stats = getPhaseStats(phase.phase_id)
          const scheduled = scheduledByPhase.get(phase.phase_id) ?? []
          const executed = activitiesByPhase.get(phase.phase_id) ?? []
          const hasContent = scheduled.length > 0 || executed.length > 0

          return (
            <Collapsible
              key={phase.id}
              open={isOpen}
              onOpenChange={() => togglePhase(phase.phase_id)}
            >
              <div
                className={cn(
                  'rounded-lg border transition-colors',
                  isCurrent && 'border-l-2 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20',
                )}
              >
                <CollapsibleTrigger className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/50">
                  {isCurrent ? (
                    <Clock className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                  ) : phase.status === 'completed' ? (
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
                  ) : (
                    <CircleDashed className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                  )}
                  <span className="flex-1 font-medium text-sm">
                    {phase.phase_name}
                    {isCurrent && (
                      <span className="ml-2 text-xs font-normal text-blue-600 dark:text-blue-400">
                        (actual)
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {stats.completed > 0 && (
                      <span className="text-green-600 dark:text-green-400">
                        {stats.completed} completadas
                      </span>
                    )}
                    {stats.pending > 0 && (
                      <span className="text-yellow-600 dark:text-yellow-400">
                        {stats.pending} pendientes
                      </span>
                    )}
                    {stats.overdue > 0 && (
                      <span className="text-red-600 dark:text-red-400">
                        {stats.overdue} vencidas
                      </span>
                    )}
                    {!hasContent && (
                      <span>Sin actividades</span>
                    )}
                  </div>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 text-muted-foreground transition-transform',
                      isOpen && 'rotate-180',
                    )}
                  />
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="border-t p-4 space-y-6">
                    {/* Scheduled Activities */}
                    {scheduled.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3">Actividades programadas</h4>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Actividad</TableHead>
                                <TableHead>Fecha planificada</TableHead>
                                <TableHead>Día</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {scheduled.map((sa) => (
                                <TableRow key={sa.id}>
                                  <TableCell>
                                    <div>
                                      <span className="font-medium text-sm">
                                        {sa.template_name ?? 'Actividad sin template'}
                                      </span>
                                      {sa.activity_type_name && (
                                        <span className="ml-2 text-xs text-muted-foreground">
                                          ({sa.activity_type_name})
                                        </span>
                                      )}
                                      {sa.triggers_phase_change_name && (
                                        <Badge variant="outline" className="ml-2 text-xs">
                                          Transiciona a {sa.triggers_phase_change_name}
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {formatDate(sa.planned_date)}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {sa.crop_day != null ? `D${sa.crop_day}` : '—'}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="secondary"
                                      className={cn('text-xs', scheduledStatusStyles[sa.status] ?? '')}
                                    >
                                      {scheduledStatusLabels[sa.status] ?? sa.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {(sa.status === 'pending' || sa.status === 'overdue') && (
                                      <div className="flex items-center justify-end gap-1">
                                        {canExecute && (
                                          <Button
                                            size="sm"
                                            variant="default"
                                            className="h-7 px-2 text-xs"
                                            onClick={() => handleExecuteClick(sa)}
                                          >
                                            <Play className="mr-1 h-3 w-3" />
                                            Ejecutar
                                          </Button>
                                        )}
                                        {canSchedule && (
                                          <>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-7 px-2 text-xs"
                                              onClick={() => handleRescheduleClick(sa)}
                                            >
                                              <Calendar className="mr-1 h-3 w-3" />
                                              Re-agendar
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-7 px-2 text-xs"
                                              onClick={() => handleSkipClick(sa)}
                                            >
                                              <SkipForward className="mr-1 h-3 w-3" />
                                              Omitir
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    {/* Executed Activities */}
                    {executed.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3">Actividades ejecutadas</h4>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Duración</TableHead>
                                <TableHead>Ejecutor</TableHead>
                                <TableHead>Origen</TableHead>
                                <TableHead>Obs.</TableHead>
                                <TableHead>Estado</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {executed.map((a) => (
                                <TableRow key={a.id}>
                                  <TableCell>
                                    <div>
                                      <span className="font-medium text-sm">
                                        {a.activity_type_name}
                                      </span>
                                      {a.template_name && (
                                        <span className="ml-2 text-xs text-muted-foreground">
                                          ({a.template_name})
                                        </span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {formatDateTime(a.performed_at)}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {a.duration_minutes != null ? `${a.duration_minutes} min` : '—'}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {a.performer_name}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        'text-xs',
                                        a.scheduled_activity_id
                                          ? 'border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400'
                                          : 'border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-400',
                                      )}
                                    >
                                      {a.scheduled_activity_id ? 'Programada' : 'Ad-hoc'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {a.observations_count > 0 ? (
                                      <div className="flex items-center gap-1">
                                        <span className="text-sm">{a.observations_count}</span>
                                        {a.has_high_severity && (
                                          <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-sm text-muted-foreground">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="secondary"
                                      className={cn('text-xs', activityStatusStyles[a.status] ?? '')}
                                    >
                                      {activityStatusLabels[a.status] ?? a.status}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    {!hasContent && (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        No hay actividades registradas para esta fase.
                      </p>
                    )}

                    {/* Schedule button */}
                    {canSchedule && (
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleScheduleClick(phase.phase_id, phase.phase_name)}
                        >
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          Programar actividad
                        </Button>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )
        })}
      </div>

      {/* Dialogs */}
      {schedulePhase && (
        <ScheduleActivityDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          batchId={batchId}
          batchStartDate={batchStartDate}
          phaseId={schedulePhase.id}
          phaseName={schedulePhase.name}
        />
      )}

      {rescheduleActivity && (
        <RescheduleDialog
          open={rescheduleDialogOpen}
          onOpenChange={setRescheduleDialogOpen}
          scheduledActivityId={rescheduleActivity.id}
          activityName={rescheduleActivity.template_name ?? 'Actividad'}
          currentPlannedDate={rescheduleActivity.planned_date}
          batchId={batchId}
          batchStartDate={batchStartDate}
        />
      )}

      {skipActivity && (
        <SkipDialog
          open={skipDialogOpen}
          onOpenChange={setSkipDialogOpen}
          scheduledActivityId={skipActivity.id}
          activityName={skipActivity.template_name ?? 'Actividad'}
          batchId={batchId}
        />
      )}

      {executeActivity && (
        <ExecuteActivityWizard
          open={executeDialogOpen}
          onOpenChange={setExecuteDialogOpen}
          scheduledActivity={executeActivity}
          batchId={batchId}
          currentPhaseId={currentPhaseId}
          zoneId={zoneId}
          zones={zones}
        />
      )}
    </>
  )
}
