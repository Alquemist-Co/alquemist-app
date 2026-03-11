'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { createOverheadCostSchema } from '@/schemas/overhead-costs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

// ---------- Types ----------

type Facility = { id: string; name: string }
type Zone = { id: string; name: string; facility_id: string }

type CostRow = {
  id: string
  cost_type: string
  description: string
  amount: number
  currency: string
  period_start: string
  period_end: string
  allocation_basis: string
  notes: string | null
  facility_id: string
  facility_name: string
  zone_id: string | null
  zone_name: string | null
}

type COGSRow = {
  batch_id: string
  batch_code: string
  direct_cost: number
  overhead_allocated: number
  total_cogs: number
}

// ---------- Labels ----------

const costTypeLabels: Record<string, string> = {
  energy: 'Energía',
  rent: 'Renta/Arriendo',
  depreciation: 'Depreciación',
  insurance: 'Seguros',
  maintenance: 'Mantenimiento',
  labor_fixed: 'Mano de obra fija',
  other: 'Otro',
}

const costTypeBadgeStyles: Record<string, string> = {
  energy: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  rent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  depreciation: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  insurance: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  maintenance: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  labor_fixed: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  other: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
}

const allocationLabels: Record<string, string> = {
  per_m2: 'Por m²',
  per_plant: 'Por planta',
  per_batch: 'Por batch',
  per_zone: 'Por zona',
  even_split: 'Equitativo',
}

const allocationDescriptions: Record<string, string> = {
  per_m2: 'Proporcional al área del batch',
  per_plant: 'Proporcional al conteo de plantas',
  per_batch: 'Reparto proporcional entre batches activos',
  per_zone: 'Solo a batches en la zona especificada',
  even_split: 'Mismo monto para todos los batches',
}

// ---------- Props ----------

type Props = {
  costs: CostRow[]
  facilities: Facility[]
  zones: Zone[]
  currency: string
  canEdit: boolean
  companyId: string
  userId: string
  totalPages: number
  totalCount: number
  currentPage: number
  pageSize: number
  kpis: {
    currentMonthTotal: number
    prevMonthTotal: number
    costByType: Record<string, number>
  }
  filters: {
    facility: string
    zone: string
    type: string
    from: string
    to: string
  }
  initialView: 'costs' | 'cogs'
}

export function CostsClient({
  costs,
  facilities,
  zones,
  currency,
  canEdit,
  companyId,
  userId,
  totalPages,
  totalCount,
  currentPage,
  pageSize,
  kpis,
  filters,
  initialView,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [view, setView] = useState<'costs' | 'cogs'>(initialView)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCost, setEditingCost] = useState<CostRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CostRow | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // COGS state
  const [cogsData, setCogsData] = useState<COGSRow[]>([])
  const [cogsLoading, setCogsLoading] = useState(false)
  const [cogsFacility, setCogsFacility] = useState('')
  const [cogsStatus, setCogsStatus] = useState<'active' | 'completed'>('active')

  const supabase = createClient()

  // ---------- Formatting ----------

  const formatCurrency = useCallback(
    (amount: number) => {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount)
    },
    [currency],
  )

  const variation = useMemo(() => {
    if (kpis.prevMonthTotal === 0) return null
    return ((kpis.currentMonthTotal - kpis.prevMonthTotal) / kpis.prevMonthTotal) * 100
  }, [kpis.currentMonthTotal, kpis.prevMonthTotal])

  // ---------- Navigation ----------

  function updateUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams()
    const current = { ...filters, page: String(currentPage), view }
    for (const [k, v] of Object.entries({ ...current, ...overrides })) {
      if (v) params.set(k, v)
    }
    startTransition(() => {
      router.push(`/operations/costs?${params.toString()}`)
    })
  }

  function goToPage(p: number) {
    updateUrl({ page: String(p) })
  }

  function handleFilterChange(key: string, value: string) {
    updateUrl({ [key]: value, page: '1' })
  }

  function clearFilters() {
    startTransition(() => {
      router.push('/operations/costs')
    })
  }

  // ---------- CRUD ----------

  async function handleSave(formData: FormData) {
    setSubmitting(true)

    const raw = {
      facility_id: formData.get('facility_id') as string,
      zone_id: (formData.get('zone_id') as string) || undefined,
      cost_type: formData.get('cost_type') as string,
      description: formData.get('description') as string,
      amount: Number(formData.get('amount')),
      currency,
      period_start: formData.get('period_start') as string,
      period_end: formData.get('period_end') as string,
      allocation_basis: formData.get('allocation_basis') as string,
      notes: (formData.get('notes') as string) || '',
    }

    const result = createOverheadCostSchema.safeParse(raw)
    if (!result.success) {
      const firstError = result.error.issues[0]?.message ?? 'Datos inválidos'
      toast.error(firstError)
      setSubmitting(false)
      return
    }

    const payload = {
      ...result.data,
      zone_id: result.data.zone_id || null,
      company_id: companyId,
      created_by: userId,
      updated_by: userId,
    }

    if (editingCost) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { company_id: _cid, created_by: _cb, ...updatePayload } = payload
      const { error } = await supabase
        .from('overhead_costs')
        .update(updatePayload)
        .eq('id', editingCost.id)

      if (error) {
        toast.error('Error al actualizar el costo')
        setSubmitting(false)
        return
      }
      toast.success('Costo actualizado')
    } else {
      const { error } = await supabase
        .from('overhead_costs')
        .insert(payload)

      if (error) {
        toast.error('Error al registrar el costo')
        setSubmitting(false)
        return
      }
      toast.success('Costo registrado')
    }

    setSubmitting(false)
    setDialogOpen(false)
    setEditingCost(null)
    router.refresh()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setSubmitting(true)

    const { error } = await supabase
      .from('overhead_costs')
      .delete()
      .eq('id', deleteTarget.id)

    if (error) {
      toast.error('Error al eliminar el costo')
    } else {
      toast.success('Costo eliminado')
    }

    setSubmitting(false)
    setDeleteTarget(null)
    router.refresh()
  }

  // ---------- COGS ----------

  const fetchCOGS = useCallback(async () => {
    setCogsLoading(true)

    const { data, error } = await supabase.rpc('calculate_batch_cogs', {
      p_company_id: companyId,
      ...(cogsFacility ? { p_facility_id: cogsFacility } : {}),
      ...(cogsStatus ? { p_batch_status: cogsStatus as 'active' } : {}),
    })

    if (error) {
      toast.error('Error al calcular COGS')
      setCogsData([])
    } else {
      setCogsData(
        (data ?? []).map((d: { batch_id: string; batch_code: string; direct_cost: number; overhead_allocated: number; total_cogs: number }) => ({
          batch_id: d.batch_id,
          batch_code: d.batch_code,
          direct_cost: Number(d.direct_cost),
          overhead_allocated: Number(d.overhead_allocated),
          total_cogs: Number(d.total_cogs),
        })),
      )
    }
    setCogsLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, cogsFacility, cogsStatus])

  useEffect(() => {
    if (view === 'cogs') fetchCOGS()
  }, [view, fetchCOGS])

  // ---------- Render ----------

  return (
    <div className="space-y-6">
      {/* View toggle + actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Tabs
          value={view}
          onValueChange={(v) => setView(v as 'costs' | 'cogs')}
        >
          <TabsList>
            <TabsTrigger value="costs">Costos</TabsTrigger>
            <TabsTrigger value="cogs">COGS por Batch</TabsTrigger>
          </TabsList>
        </Tabs>

        {canEdit && view === 'costs' && (
          <Button
            size="sm"
            onClick={() => {
              setEditingCost(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Nuevo costo
          </Button>
        )}
      </div>

      {/* Costs view */}
      {view === 'costs' && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total mes actual</p>
                <p className="mt-1 text-xl font-bold tabular-nums">
                  {formatCurrency(kpis.currentMonthTotal)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Mes anterior</p>
                <p className="mt-1 text-xl font-bold tabular-nums">
                  {formatCurrency(kpis.prevMonthTotal)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Variación</p>
                <p
                  className={cn(
                    'mt-1 text-xl font-bold tabular-nums',
                    variation === null
                      ? 'text-muted-foreground'
                      : variation > 0
                        ? 'text-red-600'
                        : 'text-green-600',
                  )}
                >
                  {variation === null
                    ? '—'
                    : `${variation > 0 ? '+' : ''}${variation.toFixed(1)}%`}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">
                  Distribución por tipo
                </p>
                <div className="mt-2 space-y-1">
                  {Object.entries(kpis.costByType)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 3)
                    .map(([type, amount]) => (
                      <div
                        key={type}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-muted-foreground">
                          {costTypeLabels[type] || type}
                        </span>
                        <span className="font-medium tabular-nums">
                          {formatCurrency(amount)}
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Facility</Label>
              <Select
                value={filters.facility}
                onValueChange={(v) =>
                  handleFilterChange('facility', v === '__all__' ? '' : v)
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas</SelectItem>
                  {facilities.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <Select
                value={filters.type}
                onValueChange={(v) =>
                  handleFilterChange('type', v === '__all__' ? '' : v)
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {Object.entries(costTypeLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Desde</Label>
              <Input
                type="date"
                value={filters.from}
                className="w-[150px]"
                onChange={(e) => handleFilterChange('from', e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Hasta</Label>
              <Input
                type="date"
                value={filters.to}
                className="w-[150px]"
                onChange={(e) => handleFilterChange('to', e.target.value)}
              />
            </div>

            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          </div>

          {/* Costs table */}
          {costs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No hay costos registrados
                {canEdit && '. Registra tu primer costo overhead.'}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Facility</TableHead>
                        <TableHead>Zona</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                        <TableHead>Periodo</TableHead>
                        <TableHead>Prorrateo</TableHead>
                        {canEdit && <TableHead className="w-20" />}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {costs.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={cn(
                                'text-xs whitespace-nowrap',
                                costTypeBadgeStyles[c.cost_type],
                              )}
                            >
                              {costTypeLabels[c.cost_type] || c.cost_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm">
                            {c.description}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {c.facility_name}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {c.zone_name || 'Toda la facility'}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {formatCurrency(c.amount)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            {c.period_start} — {c.period_end}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {allocationLabels[c.allocation_basis] ||
                                c.allocation_basis}
                            </Badge>
                          </TableCell>
                          {canEdit && (
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => {
                                    setEditingCost(c)
                                    setDialogOpen(true)
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive"
                                  onClick={() => setDeleteTarget(c)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {(currentPage - 1) * pageSize + 1}–
                {Math.min(currentPage * pageSize, totalCount)} de {totalCount}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage <= 1 || isPending}
                  onClick={() => goToPage(currentPage - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage >= totalPages || isPending}
                  onClick={() => goToPage(currentPage + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* COGS view */}
      {view === 'cogs' && (
        <COGSView
          data={cogsData}
          loading={cogsLoading}
          facilities={facilities}
          facility={cogsFacility}
          status={cogsStatus}
          onFacilityChange={setCogsFacility}
          onStatusChange={setCogsStatus}
          formatCurrency={formatCurrency}
        />
      )}

      {/* Create/Edit dialog */}
      <CostDialog
        key={editingCost?.id ?? 'new'}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditingCost(null)
        }}
        cost={editingCost}
        facilities={facilities}
        zones={zones}
        currency={currency}
        submitting={submitting}
        onSave={handleSave}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar costo</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar &quot;{deleteTarget?.description}&quot; por{' '}
              {deleteTarget ? formatCurrency(deleteTarget.amount) : ''}? Esta
              acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ---------- COGS View ----------

function COGSView({
  data,
  loading,
  facilities,
  facility,
  status,
  onFacilityChange,
  onStatusChange,
  formatCurrency,
}: {
  data: COGSRow[]
  loading: boolean
  facilities: Facility[]
  facility: string
  status: 'active' | 'completed'
  onFacilityChange: (v: string) => void
  onStatusChange: (v: 'active' | 'completed') => void
  formatCurrency: (n: number) => string
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Facility</Label>
          <Select
            value={facility || '__all__'}
            onValueChange={(v) => onFacilityChange(v === '__all__' ? '' : v)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas</SelectItem>
              {facilities.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Estado batch</Label>
          <Select value={status} onValueChange={(v) => onStatusChange(v as 'active' | 'completed')}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="completed">Completados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Calculando COGS...
          </CardContent>
        </Card>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No hay batches {status === 'active' ? 'activos' : 'completados'} para calcular COGS.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              COGS por Batch — {data.length} batch
              {data.length !== 1 ? 'es' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch</TableHead>
                    <TableHead className="text-right">Costos directos</TableHead>
                    <TableHead className="text-right">Overhead</TableHead>
                    <TableHead className="text-right">COGS total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row) => (
                    <TableRow key={row.batch_id}>
                      <TableCell>
                        <Link
                          href={`/production/batches/${row.batch_id}`}
                          className="font-mono text-sm text-primary hover:underline"
                        >
                          {row.batch_code}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(row.direct_cost)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(row.overhead_allocated)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(row.total_cogs)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals row */}
                  <TableRow className="border-t-2 font-medium">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(data.reduce((s, r) => s + r.direct_cost, 0))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(data.reduce((s, r) => s + r.overhead_allocated, 0))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(data.reduce((s, r) => s + r.total_cogs, 0))}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ---------- Cost Dialog ----------

function CostDialog({
  open,
  onOpenChange,
  cost,
  facilities,
  zones,
  currency,
  submitting,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  cost: CostRow | null
  facilities: Facility[]
  zones: Zone[]
  currency: string
  submitting: boolean
  onSave: (formData: FormData) => void
}) {
  const [facilityId, setFacilityId] = useState(cost?.facility_id || '')
  const [allocationBasis, setAllocationBasis] = useState(cost?.allocation_basis || 'even_split')

  const filteredZones = useMemo(
    () => zones.filter((z) => z.facility_id === facilityId),
    [zones, facilityId],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {cost ? 'Editar costo' : 'Nuevo costo overhead'}
          </DialogTitle>
          <DialogDescription>
            {cost
              ? 'Modifica los datos del costo.'
              : 'Registra un costo indirecto para prorrateo a batches.'}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSave(new FormData(e.currentTarget))
          }}
          className="space-y-4"
        >
          {/* Facility */}
          <div className="space-y-1.5">
            <Label htmlFor="facility_id">Facility *</Label>
            <Select
              name="facility_id"
              value={facilityId}
              onValueChange={(v) => setFacilityId(v)}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar facility" />
              </SelectTrigger>
              <SelectContent>
                {facilities.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="facility_id" value={facilityId} />
          </div>

          {/* Zone */}
          <div className="space-y-1.5">
            <Label htmlFor="zone_id">Zona (opcional)</Label>
            <Select
              name="zone_id"
              defaultValue={cost?.zone_id || ''}
            >
              <SelectTrigger>
                <SelectValue placeholder="Toda la facility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Toda la facility</SelectItem>
                {filteredZones.map((z) => (
                  <SelectItem key={z.id} value={z.id}>
                    {z.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cost type */}
          <div className="space-y-1.5">
            <Label htmlFor="cost_type">Tipo de costo *</Label>
            <Select name="cost_type" defaultValue={cost?.cost_type || ''} required>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(costTypeLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Descripción *</Label>
            <Input
              name="description"
              defaultValue={cost?.description || ''}
              placeholder="Ej: Electricidad Febrero 2026"
              required
            />
          </div>

          {/* Amount + Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="amount">Monto *</Label>
              <Input
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                defaultValue={cost?.amount || ''}
                placeholder="0"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Moneda</Label>
              <Input value={currency} disabled />
            </div>
          </div>

          {/* Period */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="period_start">Fecha inicio *</Label>
              <Input
                name="period_start"
                type="date"
                defaultValue={cost?.period_start || ''}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="period_end">Fecha fin *</Label>
              <Input
                name="period_end"
                type="date"
                defaultValue={cost?.period_end || ''}
                required
              />
            </div>
          </div>

          {/* Allocation basis */}
          <div className="space-y-1.5">
            <Label htmlFor="allocation_basis">Base de prorrateo *</Label>
            <Select
              name="allocation_basis"
              value={allocationBasis}
              onValueChange={setAllocationBasis}
              required
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(allocationLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v} — {allocationDescriptions[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="allocation_basis" value={allocationBasis} />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              name="notes"
              defaultValue={cost?.notes || ''}
              placeholder="Notas adicionales..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              {cost ? 'Guardar cambios' : 'Registrar costo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
