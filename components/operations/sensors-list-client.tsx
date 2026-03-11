'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Plus, Pencil, Power } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { DataTablePagination } from '@/components/shared/data-table-pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  type SensorRow,
  type ZoneOption,
  sensorTypeLabels,
  sensorTypeBadgeStyles,
  getRelativeTime,
  isCalibrationExpired,
} from './operations-shared'
import { createSensorSchema, updateSensorSchema } from '@/schemas/sensors'
import { createClient } from '@/lib/supabase/client'

type Props = {
  sensors: SensorRow[]
  zones: ZoneOption[]
  totalPages: number
  totalCount: number
  pageSize: number
  currentPage: number
  canCreate: boolean
  canToggle: boolean
  kpis: {
    active: number
    inactive: number
    stale: number
    calibration_expired: number
  }
  filters: {
    facility: string
    zone: string
    type: string
    status: string
    search: string
  }
}

const SENSOR_TYPES = [
  'temperature', 'humidity', 'co2', 'light', 'ec', 'ph', 'soil_moisture', 'vpd',
] as const

export function SensorsListClient({
  sensors,
  zones,
  totalPages,
  totalCount,
  currentPage,
  canCreate,
  canToggle,
  kpis,
  filters,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [searchValue, setSearchValue] = useState(filters.search)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Edit mode
  const [editingSensor, setEditingSensor] = useState<SensorRow | null>(null)

  // Deactivate confirmation
  const [deactivateSensor, setDeactivateSensor] = useState<SensorRow | null>(null)

  // Form state
  const [formZoneId, setFormZoneId] = useState('')
  const [formType, setFormType] = useState<string>('')
  const [formBrandModel, setFormBrandModel] = useState('')
  const [formSerial, setFormSerial] = useState('')
  const [formCalDate, setFormCalDate] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value)
        else params.delete(key)
      }
      if (!('page' in updates)) params.delete('page')
      router.push(`/operations/sensors?${params.toString()}`)
    },
    [router, searchParams],
  )

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

  function resetForm() {
    setFormZoneId('')
    setFormType('')
    setFormBrandModel('')
    setFormSerial('')
    setFormCalDate('')
    setFormIsActive(true)
    setEditingSensor(null)
  }

  function openCreate() {
    resetForm()
    setDialogOpen(true)
  }

  function openEdit(sensor: SensorRow) {
    setEditingSensor(sensor)
    setFormZoneId(sensor.zone_id)
    setFormType(sensor.type)
    setFormBrandModel(sensor.brand_model ?? '')
    setFormSerial(sensor.serial_number ?? '')
    setFormCalDate(sensor.calibration_date ?? '')
    setFormIsActive(sensor.is_active)
    setDialogOpen(true)
  }

  async function handleSave() {
    const isEdit = !!editingSensor

    if (isEdit) {
      const parsed = updateSensorSchema.safeParse({
        zone_id: formZoneId,
        type: formType,
        brand_model: formBrandModel,
        serial_number: formSerial,
        calibration_date: formCalDate,
        is_active: formIsActive,
      })
      if (!parsed.success) {
        toast.error(parsed.error.issues[0].message)
        return
      }
      setSaving(true)
      const supabase = createClient()
      const { error } = await supabase
        .from('sensors')
        .update({
          zone_id: parsed.data.zone_id,
          type: parsed.data.type as 'temperature',
          brand_model: parsed.data.brand_model || null,
          serial_number: parsed.data.serial_number || null,
          calibration_date: parsed.data.calibration_date || null,
          is_active: parsed.data.is_active,
        })
        .eq('id', editingSensor.id)
      setSaving(false)

      if (error) {
        toast.error('Error al actualizar el sensor.')
        return
      }
      toast.success('Sensor actualizado.')
    } else {
      const parsed = createSensorSchema.safeParse({
        zone_id: formZoneId,
        type: formType,
        brand_model: formBrandModel,
        serial_number: formSerial,
        calibration_date: formCalDate,
        is_active: formIsActive,
      })
      if (!parsed.success) {
        toast.error(parsed.error.issues[0].message)
        return
      }
      setSaving(true)
      const supabase = createClient()
      const { error } = await supabase
        .from('sensors')
        .insert({
          zone_id: parsed.data.zone_id,
          type: parsed.data.type as 'temperature',
          brand_model: parsed.data.brand_model || null,
          serial_number: parsed.data.serial_number || null,
          calibration_date: parsed.data.calibration_date || null,
          is_active: parsed.data.is_active,
        })
        .select('id')
        .single()
      setSaving(false)

      if (error) {
        toast.error('Error al registrar el sensor.')
        return
      }
      toast.success('Sensor registrado exitosamente.')
    }

    setDialogOpen(false)
    resetForm()
    router.refresh()
  }

  async function handleToggleActive(sensor: SensorRow) {
    if (sensor.is_active) {
      setDeactivateSensor(sensor)
      return
    }
    // Activate directly
    const supabase = createClient()
    const { error } = await supabase
      .from('sensors')
      .update({ is_active: true })
      .eq('id', sensor.id)

    if (error) {
      toast.error('Error al activar el sensor.')
      return
    }
    toast.success('Sensor activado.')
    router.refresh()
  }

  async function confirmDeactivate() {
    if (!deactivateSensor) return
    const supabase = createClient()
    const { error } = await supabase
      .from('sensors')
      .update({ is_active: false })
      .eq('id', deactivateSensor.id)

    setDeactivateSensor(null)

    if (error) {
      toast.error('Error al desactivar el sensor.')
      return
    }
    toast.success('Sensor desactivado.')
    router.refresh()
  }

  // Unique facilities for filter
  const facilities = Array.from(
    new Map(zones.map((z) => [z.facility_id, { id: z.facility_id, name: z.facility_name }])).values(),
  )
  const filteredZones = filters.facility
    ? zones.filter((z) => z.facility_id === filters.facility)
    : zones

  const kpiCards = [
    { label: 'Activos', value: kpis.active, style: 'text-green-600' },
    { label: 'Inactivos', value: kpis.inactive, style: 'text-muted-foreground' },
    { label: 'Sin señal (>30m)', value: kpis.stale, style: kpis.stale > 0 ? 'text-red-600' : 'text-muted-foreground' },
    { label: 'Calibración vencida', value: kpis.calibration_expired, style: kpis.calibration_expired > 0 ? 'text-yellow-600' : 'text-muted-foreground' },
  ]

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {kpiCards.map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className={`text-2xl font-bold ${k.style}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters + Create */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por marca, serial..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-8"
          />
        </div>

        <Select
          value={filters.facility || 'all'}
          onValueChange={(v) => updateParams({ facility: v === 'all' ? '' : v, zone: '' })}
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Instalación" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {facilities.map((f) => (
              <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.zone || 'all'}
          onValueChange={(v) => updateParams({ zone: v === 'all' ? '' : v })}
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Zona" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {filteredZones.map((z) => (
              <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.type || 'all'}
          onValueChange={(v) => updateParams({ type: v === 'all' ? '' : v })}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {SENSOR_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{sensorTypeLabels[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status || 'all'}
          onValueChange={(v) => updateParams({ status: v === 'all' ? '' : v })}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activo</SelectItem>
            <SelectItem value="inactive">Inactivo</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto">
          {canCreate && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1 h-4 w-4" />
              Nuevo sensor
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Marca / Modelo</TableHead>
              <TableHead>Serial</TableHead>
              <TableHead>Zona</TableHead>
              <TableHead>Instalación</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Última lectura</TableHead>
              <TableHead>Calibración</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sensors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No hay sensores registrados.
                </TableCell>
              </TableRow>
            ) : (
              sensors.map((s) => {
                const reading = getRelativeTime(s.last_reading_at)
                const calExpired = isCalibrationExpired(s.calibration_date)
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Badge variant="outline" className={sensorTypeBadgeStyles[s.type] || ''}>
                        {sensorTypeLabels[s.type] || s.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{s.brand_model || '—'}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{s.serial_number || '—'}</TableCell>
                    <TableCell>
                      <button
                        className="text-primary hover:underline text-left"
                        onClick={() => router.push(`/areas/zones/${s.zone_id}`)}
                      >
                        {s.zone_name}
                      </button>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{s.facility_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={s.is_active
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                      }>
                        {s.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={reading.isStale && s.is_active ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                        {s.is_active ? reading.label : '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {s.calibration_date ? (
                        <span className={calExpired ? 'text-yellow-600 font-medium' : ''}>
                          {s.calibration_date}
                          {calExpired && ' ⚠'}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canCreate && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(s)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {canToggle && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleToggleActive(s)}
                          >
                            <Power className={`h-3.5 w-3.5 ${s.is_active ? 'text-green-600' : 'text-muted-foreground'}`} />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <DataTablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={20}
        onPageChange={goToPage}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm() }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{editingSensor ? 'Editar Sensor' : 'Nuevo Sensor'}</DialogTitle>
            <DialogDescription>
              {editingSensor
                ? 'Modifica los datos del sensor.'
                : 'Registra un nuevo sensor IoT.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Tipo de sensor *</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {SENSOR_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{sensorTypeLabels[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Zona *</Label>
              <Select value={formZoneId} onValueChange={setFormZoneId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una zona" />
                </SelectTrigger>
                <SelectContent>
                  {zones.map((z) => (
                    <SelectItem key={z.id} value={z.id}>
                      {z.facility_name} &gt; {z.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Marca / Modelo</Label>
                <Input
                  value={formBrandModel}
                  onChange={(e) => setFormBrandModel(e.target.value)}
                  placeholder="Trolmaster HCS-1"
                />
              </div>
              <div className="grid gap-2">
                <Label>Número de serie</Label>
                <Input
                  value={formSerial}
                  onChange={(e) => setFormSerial(e.target.value)}
                  placeholder="TM-HCS1-001"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Fecha de calibración</Label>
              <Input
                type="date"
                value={formCalDate}
                onChange={(e) => setFormCalDate(e.target.value)}
              />
            </div>
            {editingSensor && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_active"
                  checked={formIsActive}
                  onCheckedChange={(checked) => setFormIsActive(!!checked)}
                />
                <Label htmlFor="is_active" className="cursor-pointer">Activo</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : editingSensor ? 'Guardar' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation */}
      <AlertDialog open={!!deactivateSensor} onOpenChange={(open) => { if (!open) setDeactivateSensor(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar sensor?</AlertDialogTitle>
            <AlertDialogDescription>
              {deactivateSensor && (
                <>
                  El sensor <strong>{deactivateSensor.brand_model || deactivateSensor.type}</strong>
                  {deactivateSensor.serial_number && ` (${deactivateSensor.serial_number})`} dejará de registrar lecturas
                  y no generará alertas ambientales.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeactivate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
