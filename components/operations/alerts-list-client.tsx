'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Check,
  CheckCircle,
  Bell,
  Thermometer,
  Bug,
  Package,
  FileWarning,
  Calendar,
  Beaker,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { DataTablePagination } from '@/components/shared/data-table-pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  type AlertRow,
  alertTypeLabels,
  alertSeverityLabels,
  alertSeverityBadgeStyles,
  alertStatusLabels,
  alertStatusBadgeStyles,
  alertSeverityBorderStyles,
  entityTypeLabels,
  getEntityLink,
  getRelativeTime,
} from './operations-shared'
import { createClient } from '@/lib/supabase/client'

type Props = {
  alerts: AlertRow[]
  totalPages: number
  totalCount: number
  pageSize: number
  currentPage: number
  canAcknowledge: boolean
  canResolve: boolean
  companyId: string
  userId: string
  kpis: {
    critical: number
    high: number
    warning: number
    info: number
    acknowledged: number
  }
  filters: {
    severity: string
    type: string
    status: string
    show_resolved: boolean
  }
}

const ALERT_TYPES = [
  { group: 'Producción', items: ['overdue_activity', 'stale_batch', 'order_delayed'] },
  { group: 'Inventario', items: ['low_inventory', 'expiring_item'] },
  { group: 'Ambiente', items: ['env_out_of_range'] },
  { group: 'Calidad', items: ['quality_failed'] },
  { group: 'Regulatorio', items: ['regulatory_expiring', 'regulatory_missing'] },
  { group: 'Campo', items: ['pest_detected', 'phi_violation'] },
]

function getAlertIcon(type: string) {
  switch (type) {
    case 'env_out_of_range': return Thermometer
    case 'pest_detected':
    case 'phi_violation': return Bug
    case 'low_inventory':
    case 'expiring_item': return Package
    case 'regulatory_expiring':
    case 'regulatory_missing': return FileWarning
    case 'overdue_activity': return Calendar
    case 'quality_failed': return Beaker
    case 'stale_batch': return Clock
    default: return Bell
  }
}

export function AlertsListClient({
  alerts: initialAlerts,
  totalPages,
  totalCount,
  currentPage,
  canAcknowledge,
  canResolve,
  companyId,
  userId,
  kpis,
  filters,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [realtimeAlerts, setRealtimeAlerts] = useState<AlertRow[]>([])
  const [localUpdates, setLocalUpdates] = useState<Record<string, Partial<AlertRow>>>({})
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Merge: realtime new alerts + server data with local optimistic updates
  const alerts = [
    ...realtimeAlerts.filter((ra) => !initialAlerts.some((ia) => ia.id === ra.id)),
    ...initialAlerts,
  ].map((a) => localUpdates[a.id] ? { ...a, ...localUpdates[a.id] } : a)

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          const newAlert = payload.new as Record<string, unknown>
          const alertRow: AlertRow = {
            id: newAlert.id as string,
            type: newAlert.type as string,
            severity: newAlert.severity as string,
            title: newAlert.title as string | null,
            entity_type: newAlert.entity_type as string,
            entity_id: newAlert.entity_id as string,
            batch_id: newAlert.batch_id as string | null,
            message: newAlert.message as string,
            triggered_at: newAlert.triggered_at as string,
            status: newAlert.status as string,
            acknowledged_by_name: null,
            acknowledged_at: null,
            resolved_at: null,
          }
          setRealtimeAlerts((prev) => [alertRow, ...prev])

          if (newAlert.severity === 'critical') {
            toast.error(`Alerta crítica: ${newAlert.title || newAlert.message}`)
          } else {
            toast.info(`Nueva alerta: ${newAlert.title || newAlert.message}`)
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'alerts',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          const updated = payload.new as Record<string, unknown>
          setLocalUpdates((prev) => ({
            ...prev,
            [updated.id as string]: {
              status: updated.status as string,
              acknowledged_at: updated.acknowledged_at as string | null,
              resolved_at: updated.resolved_at as string | null,
            },
          }))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [companyId])

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value)
        else params.delete(key)
      }
      if (!('page' in updates)) params.delete('page')
      router.push(`/operations/alerts?${params.toString()}`)
    },
    [router, searchParams],
  )

  function goToPage(page: number) {
    updateParams({ page: page > 1 ? String(page) : '' })
  }

  async function handleAcknowledge(alertId: string) {
    setUpdatingIds((prev) => new Set(prev).add(alertId))
    const supabase = createClient()
    const { error } = await supabase
      .from('alerts')
      .update({
        status: 'acknowledged' as const,
        acknowledged_by: userId,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .eq('status', 'pending' as const)

    setUpdatingIds((prev) => {
      const next = new Set(prev)
      next.delete(alertId)
      return next
    })

    if (error) {
      toast.error('Error al reconocer la alerta.')
      return
    }

    setLocalUpdates((prev) => ({
      ...prev,
      [alertId]: { status: 'acknowledged', acknowledged_at: new Date().toISOString(), acknowledged_by_name: 'Tú' },
    }))
    toast.success('Alerta reconocida.')
  }

  async function handleResolve(alertId: string) {
    setUpdatingIds((prev) => new Set(prev).add(alertId))
    const supabase = createClient()
    const { error } = await supabase
      .from('alerts')
      .update({
        status: 'resolved' as const,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .in('status', ['pending', 'acknowledged'] as unknown as ['pending'])

    setUpdatingIds((prev) => {
      const next = new Set(prev)
      next.delete(alertId)
      return next
    })

    if (error) {
      toast.error('Error al resolver la alerta.')
      return
    }

    setLocalUpdates((prev) => ({
      ...prev,
      [alertId]: { status: 'resolved', resolved_at: new Date().toISOString() },
    }))
    toast.success('Alerta resuelta.')
  }

  async function handleBulkAcknowledge() {
    const ids = Array.from(selectedIds)
    const supabase = createClient()
    let count = 0
    for (const id of ids) {
      const { error } = await supabase
        .from('alerts')
        .update({
          status: 'acknowledged' as const,
          acknowledged_by: userId,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('status', 'pending' as const)
      if (!error) count++
    }
    setSelectedIds(new Set())
    toast.success(`${count} alerta(s) reconocida(s).`)
    router.refresh()
  }

  async function handleBulkResolve() {
    const ids = Array.from(selectedIds)
    const supabase = createClient()
    let count = 0
    for (const id of ids) {
      const { error } = await supabase
        .from('alerts')
        .update({
          status: 'resolved' as const,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', id)
        .in('status', ['pending', 'acknowledged'] as unknown as ['pending'])
      if (!error) count++
    }
    setSelectedIds(new Set())
    toast.success(`${count} alerta(s) resuelta(s).`)
    router.refresh()
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const pendingTotal = kpis.critical + kpis.high + kpis.warning + kpis.info

  const kpiCards = [
    { label: 'Críticas', value: kpis.critical, style: 'text-red-600', pulse: kpis.critical > 0 },
    { label: 'Altas', value: kpis.high, style: 'text-orange-600', pulse: false },
    { label: 'Advertencias', value: kpis.warning, style: 'text-yellow-600', pulse: false },
    { label: 'Informativas', value: kpis.info, style: 'text-blue-600', pulse: false },
  ]

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {kpiCards.map((k) => (
          <Card key={k.label} className={k.pulse ? 'ring-2 ring-red-400 animate-pulse' : ''}>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className={`text-2xl font-bold ${k.style}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary line */}
      <p className="text-sm text-muted-foreground">
        {pendingTotal} pendiente{pendingTotal !== 1 ? 's' : ''} &middot; {kpis.acknowledged} reconocida{kpis.acknowledged !== 1 ? 's' : ''}
      </p>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.severity || 'all'}
          onValueChange={(v) => updateParams({ severity: v === 'all' ? '' : v })}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Severidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="critical">Crítica</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="warning">Advertencia</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.type || 'all'}
          onValueChange={(v) => updateParams({ type: v === 'all' ? '' : v })}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {ALERT_TYPES.map((group) => (
              group.items.map((t) => (
                <SelectItem key={t} value={t}>
                  {alertTypeLabels[t] || t}
                </SelectItem>
              ))
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status || 'all'}
          onValueChange={(v) => updateParams({ status: v === 'all' ? '' : v })}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="acknowledged">Reconocida</SelectItem>
            <SelectItem value="resolved">Resuelta</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Switch
            id="show-resolved"
            checked={filters.show_resolved}
            onCheckedChange={(checked) => updateParams({ show_resolved: checked ? 'true' : '' })}
          />
          <Label htmlFor="show-resolved" className="text-sm cursor-pointer">Mostrar resueltas</Label>
        </div>

        {/* Bulk actions */}
        {selectedIds.size > 0 && (canAcknowledge || canResolve) && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{selectedIds.size} seleccionada(s)</span>
            {canAcknowledge && (
              <Button size="sm" variant="outline" onClick={handleBulkAcknowledge}>
                <Check className="mr-1 h-3.5 w-3.5" />
                Reconocer
              </Button>
            )}
            {canResolve && (
              <Button size="sm" variant="outline" onClick={handleBulkResolve}>
                <CheckCircle className="mr-1 h-3.5 w-3.5" />
                Resolver
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Alert Cards */}
      <div className="space-y-2">
        {alerts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Bell className="mx-auto mb-3 h-8 w-8 opacity-50" />
              <p className="font-medium">No hay alertas pendientes.</p>
              <p className="text-sm">Todo en orden.</p>
            </CardContent>
          </Card>
        ) : (
          alerts.map((alert) => {
            const Icon = getAlertIcon(alert.type)
            const time = getRelativeTime(alert.triggered_at)
            const isUpdating = updatingIds.has(alert.id)
            const isSelected = selectedIds.has(alert.id)

            return (
              <Card
                key={alert.id}
                className={`${alertSeverityBorderStyles[alert.severity] || ''} ${
                  alert.status === 'resolved' ? 'opacity-60' : ''
                } ${isSelected ? 'ring-2 ring-primary' : ''}`}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    {alert.status !== 'resolved' && (canAcknowledge || canResolve) && (
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-gray-300"
                        checked={isSelected}
                        onChange={() => toggleSelect(alert.id)}
                      />
                    )}

                    {/* Icon */}
                    <div className="mt-0.5">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">
                          {alert.title || alertTypeLabels[alert.type] || alert.type}
                        </span>
                        <Badge variant="outline" className={`text-xs ${alertSeverityBadgeStyles[alert.severity] || ''}`}>
                          {alertSeverityLabels[alert.severity] || alert.severity}
                        </Badge>
                        <Badge variant="outline" className={`text-xs ${alertStatusBadgeStyles[alert.status] || ''}`}>
                          {alertStatusLabels[alert.status] || alert.status}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>

                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{time.label}</span>
                        <span>&middot;</span>
                        <Link
                          href={getEntityLink(alert.entity_type, alert.entity_id)}
                          className="text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {entityTypeLabels[alert.entity_type] || alert.entity_type}
                        </Link>
                        {alert.status === 'acknowledged' && alert.acknowledged_by_name && (
                          <>
                            <span>&middot;</span>
                            <span>Reconocida por {alert.acknowledged_by_name}</span>
                          </>
                        )}
                        {alert.status === 'resolved' && alert.resolved_at && (
                          <>
                            <span>&middot;</span>
                            <span>Resuelta el {new Date(alert.resolved_at).toLocaleDateString('es-CO')}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {alert.status !== 'resolved' && (
                      <div className="flex items-center gap-1 shrink-0">
                        {alert.status === 'pending' && canAcknowledge && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8"
                            disabled={isUpdating}
                            onClick={() => handleAcknowledge(alert.id)}
                          >
                            <Check className="mr-1 h-3.5 w-3.5" />
                            Reconocer
                          </Button>
                        )}
                        {canResolve && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8"
                            disabled={isUpdating}
                            onClick={() => handleResolve(alert.id)}
                          >
                            <CheckCircle className="mr-1 h-3.5 w-3.5" />
                            Resolver
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Pagination */}
      <DataTablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={20}
        onPageChange={goToPage}
      />
    </div>
  )
}
