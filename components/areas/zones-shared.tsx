'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  zoneSchema,
  type ZoneInput,
  zoneStructureSchema,
  type ZoneStructureInput,
} from '@/schemas/zones'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// ---------- Types ----------

export type ZoneRow = {
  id: string
  facility_id: string
  facility_name: string
  name: string
  purpose: string
  environment: string
  area_m2: number
  effective_growing_area_m2: number
  plant_capacity: number
  height_m: number | null
  climate_config: ClimateConfig | null
  status: string
  structure_count: number
}

export type StructureRow = {
  id: string
  zone_id: string
  name: string
  type: string
  length_m: number
  width_m: number
  is_mobile: boolean
  num_levels: number
  positions_per_level: number | null
  max_positions: number | null
  spacing_cm: number | null
  pot_size_l: number | null
}

type ClimateConfig = {
  temperature?: number | null
  humidity?: number | null
  co2?: number | null
  photoperiod?: string | null
}

type FacilityOption = { id: string; name: string }

// ---------- Constants ----------

export const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring'

export const purposeLabels: Record<string, string> = {
  propagation: 'Propagación',
  vegetation: 'Vegetativo',
  flowering: 'Floración',
  drying: 'Secado',
  processing: 'Procesamiento',
  storage: 'Almacenamiento',
  multipurpose: 'Multipropósito',
}

export const environmentLabels: Record<string, string> = {
  indoor_controlled: 'Indoor controlado',
  greenhouse: 'Invernadero',
  tunnel: 'Túnel',
  open_field: 'Campo abierto',
}

export const statusLabels: Record<string, string> = {
  active: 'Activa',
  maintenance: 'Mantenimiento',
  inactive: 'Inactiva',
}

export const structureTypeLabels: Record<string, string> = {
  mobile_rack: 'Rack móvil',
  fixed_rack: 'Rack fijo',
  rolling_bench: 'Mesa rolling',
  row: 'Hilera',
  bed: 'Cama',
  trellis_row: 'Hilera de enrejado',
  nft_channel: 'Canal NFT',
}

export const purposeBadgeStyles: Record<string, string> = {
  propagation: 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400',
  vegetation: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  flowering: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  drying: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  storage: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
  multipurpose: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

export const statusBadgeStyles: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  maintenance: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  inactive: 'bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-400',
}

// ================================================================
// STRUCTURE DIALOG (mini-dialog for add/edit structure)
// ================================================================

function StructureDialog({
  open,
  onOpenChange,
  structure,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  structure: StructureRow | null
  onSave: (values: ZoneStructureInput) => void
}) {
  const isEdit = !!structure

  const form = useForm<ZoneStructureInput>({
    resolver: zodResolver(zoneStructureSchema),
    values: {
      name: structure?.name ?? '',
      type: (structure?.type as ZoneStructureInput['type']) ?? 'fixed_rack',
      length_m: structure?.length_m ?? ('' as unknown as number),
      width_m: structure?.width_m ?? ('' as unknown as number),
      is_mobile: structure?.is_mobile ?? false,
      num_levels: structure?.num_levels ?? 1,
      positions_per_level: structure?.positions_per_level ?? null,
      spacing_cm: structure?.spacing_cm ?? null,
      pot_size_l: structure?.pot_size_l ?? null,
    },
  })

  function onSubmit(values: ZoneStructureInput) {
    onSave(values)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar estructura' : 'Nueva estructura'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Modifica los datos de la estructura.' : 'Agrega una estructura a la zona.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Rack A1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <FormControl>
                      <select value={field.value} onChange={field.onChange} className={selectClass}>
                        {Object.entries(structureTypeLabels).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="length_m"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Largo (m)</FormLabel>
                    <FormControl>
                      <Input
                        type="number" min="0" step="0.01" placeholder="6"
                        value={field.value === ('' as unknown as number) ? '' : field.value}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="width_m"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ancho (m)</FormLabel>
                    <FormControl>
                      <Input
                        type="number" min="0" step="0.01" placeholder="1.2"
                        value={field.value === ('' as unknown as number) ? '' : field.value}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="num_levels"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Niveles</FormLabel>
                    <FormControl>
                      <Input
                        type="number" min="1" step="1" placeholder="1"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="positions_per_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pos/nivel (opt)</FormLabel>
                    <FormControl>
                      <Input
                        type="number" min="1" step="1" placeholder="—"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="spacing_cm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Espac. (cm, opt)</FormLabel>
                    <FormControl>
                      <Input
                        type="number" min="0" step="0.1" placeholder="—"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="is_mobile"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-2 space-y-0 rounded-md border p-3">
                    <FormLabel className="font-normal text-sm">Es móvil</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pot_size_l"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maceta (L, opt)</FormLabel>
                    <FormControl>
                      <Input
                        type="number" min="0" step="0.1" placeholder="—"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {isEdit ? 'Guardar' : 'Agregar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ================================================================
// ZONE DIALOG
// ================================================================

export function ZoneDialog({
  open,
  onOpenChange,
  zone,
  facilities,
  defaultFacilityId,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  zone: ZoneRow | null
  facilities: FacilityOption[]
  defaultFacilityId?: string
  onSuccess: () => void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const isEdit = !!zone

  // Structure state
  const [structures, setStructures] = useState<StructureRow[]>([])
  const [pendingStructures, setPendingStructures] = useState<ZoneStructureInput[]>([])
  const [structDialogOpen, setStructDialogOpen] = useState(false)
  const [editingStruct, setEditingStruct] = useState<StructureRow | null>(null)
  const [editingPendingIdx, setEditingPendingIdx] = useState<number | null>(null)
  const [deletingStruct, setDeletingStruct] = useState<StructureRow | null>(null)

  // Climate config as plain state (avoids nested object issues with react-hook-form)
  const [climateTemp, setClimateTemp] = useState<number | null>(zone?.climate_config?.temperature ?? null)
  const [climateHR, setClimateHR] = useState<number | null>(zone?.climate_config?.humidity ?? null)
  const [climateCO2, setClimateCO2] = useState<number | null>(zone?.climate_config?.co2 ?? null)
  const [climatePhoto, setClimatePhoto] = useState(zone?.climate_config?.photoperiod ?? '')

  const form = useForm<ZoneInput>({
    resolver: zodResolver(zoneSchema),
    values: {
      facility_id: zone?.facility_id ?? defaultFacilityId ?? '',
      name: zone?.name ?? '',
      purpose: (zone?.purpose as ZoneInput['purpose']) ?? 'vegetation',
      environment: (zone?.environment as ZoneInput['environment']) ?? 'indoor_controlled',
      area_m2: zone?.area_m2 ?? ('' as unknown as number),
      height_m: zone?.height_m ?? null,
      status: (zone?.status as ZoneInput['status']) ?? 'active',
    },
  })

  // Reset climate state when zone changes
  useEffect(() => {
    setClimateTemp(zone?.climate_config?.temperature ?? null)
    setClimateHR(zone?.climate_config?.humidity ?? null)
    setClimateCO2(zone?.climate_config?.co2 ?? null)
    setClimatePhoto(zone?.climate_config?.photoperiod ?? '')
  }, [zone?.id, zone?.climate_config])

  // Load structures when editing
  useEffect(() => {
    if (!open) {
      setStructures([])
      setPendingStructures([])
      return
    }
    if (isEdit) {
      const supabase = createClient()
      supabase
        .from('zone_structures')
        .select('*')
        .eq('zone_id', zone.id)
        .order('name')
        .then(({ data }) => {
          if (data) {
            setStructures(data.map((s) => ({
              ...s,
              length_m: Number(s.length_m),
              width_m: Number(s.width_m),
              spacing_cm: s.spacing_cm ? Number(s.spacing_cm) : null,
              pot_size_l: s.pot_size_l ? Number(s.pot_size_l) : null,
            })))
          }
        })
    }
  }, [open, isEdit, zone?.id])

  // Open structure dialog for new
  function openNewStruct() {
    setEditingStruct(null)
    setEditingPendingIdx(null)
    setStructDialogOpen(true)
  }

  // Open structure dialog for edit (existing)
  function openEditStruct(s: StructureRow) {
    setEditingStruct(s)
    setEditingPendingIdx(null)
    setStructDialogOpen(true)
  }

  // Open structure dialog for edit (pending - create mode)
  function openEditPending(idx: number) {
    setEditingStruct(null)
    setEditingPendingIdx(idx)
    setStructDialogOpen(true)
  }

  // Handle structure save from dialog
  async function handleStructSave(values: ZoneStructureInput) {
    if (isEdit) {
      const supabase = createClient()
      if (editingStruct) {
        // Update existing
        const { error } = await supabase
          .from('zone_structures')
          .update(values)
          .eq('id', editingStruct.id)
        if (error) {
          toast.error('Error al actualizar estructura.')
          return
        }
        toast.success('Estructura actualizada.')
        // Refresh structures
        const { data } = await supabase
          .from('zone_structures')
          .select('*')
          .eq('zone_id', zone!.id)
          .order('name')
        if (data) setStructures(data.map((s) => ({
          ...s,
          length_m: Number(s.length_m),
          width_m: Number(s.width_m),
          spacing_cm: s.spacing_cm ? Number(s.spacing_cm) : null,
          pot_size_l: s.pot_size_l ? Number(s.pot_size_l) : null,
        })))
      } else {
        // Insert new structure
        const { error } = await supabase
          .from('zone_structures')
          .insert({ ...values, zone_id: zone!.id })
        if (error) {
          toast.error('Error al agregar estructura.')
          return
        }
        toast.success('Estructura agregada.')
        const { data } = await supabase
          .from('zone_structures')
          .select('*')
          .eq('zone_id', zone!.id)
          .order('name')
        if (data) setStructures(data.map((s) => ({
          ...s,
          length_m: Number(s.length_m),
          width_m: Number(s.width_m),
          spacing_cm: s.spacing_cm ? Number(s.spacing_cm) : null,
          pot_size_l: s.pot_size_l ? Number(s.pot_size_l) : null,
        })))
      }
    } else {
      // Create mode: add to pending list
      if (editingPendingIdx !== null) {
        setPendingStructures((prev) => prev.map((s, i) => i === editingPendingIdx ? values : s))
      } else {
        setPendingStructures((prev) => [...prev, values])
      }
    }
  }

  // Delete existing structure
  async function handleDeleteStruct() {
    if (!deletingStruct) return
    const supabase = createClient()
    const { error } = await supabase
      .from('zone_structures')
      .delete()
      .eq('id', deletingStruct.id)
    if (error) {
      toast.error('Error al eliminar estructura.')
      return
    }
    toast.success('Estructura eliminada.')
    setStructures((prev) => prev.filter((s) => s.id !== deletingStruct.id))
    setDeletingStruct(null)
  }

  // Delete pending structure (create mode)
  function removePending(idx: number) {
    setPendingStructures((prev) => prev.filter((_, i) => i !== idx))
  }

  // Main form submit
  async function onSubmit(values: ZoneInput) {
    setIsLoading(true)
    const supabase = createClient()

    // Build climate_config from state (omit empty fields)
    const hasClimate = climateTemp != null || climateHR != null || climateCO2 != null || climatePhoto !== ''
    const climateConfig = hasClimate
      ? {
          ...(climateTemp != null ? { temperature: climateTemp } : {}),
          ...(climateHR != null ? { humidity: climateHR } : {}),
          ...(climateCO2 != null ? { co2: climateCO2 } : {}),
          ...(climatePhoto !== '' ? { photoperiod: climatePhoto } : {}),
        }
      : null

    const payload = {
      facility_id: values.facility_id,
      name: values.name,
      purpose: values.purpose,
      environment: values.environment,
      area_m2: values.area_m2,
      height_m: values.height_m ?? null,
      climate_config: climateConfig,
      status: values.status,
    }

    try {
      if (isEdit) {
        const { error } = await supabase
          .from('zones')
          .update(payload)
          .eq('id', zone.id)
        if (error) {
          if (error.message?.includes('idx_zones_name_facility')) {
            form.setError('name', { message: 'Ya existe una zona con este nombre en esta instalación' })
          } else {
            toast.error('Error al actualizar la zona.')
          }
          return
        }
        toast.success('Zona actualizada.')
      } else {
        const { data, error } = await supabase
          .from('zones')
          .insert(payload)
          .select('id')
          .single()
        if (error) {
          if (error.message?.includes('idx_zones_name_facility')) {
            form.setError('name', { message: 'Ya existe una zona con este nombre en esta instalación' })
          } else {
            toast.error('Error al crear la zona.')
          }
          return
        }
        // Insert pending structures
        if (pendingStructures.length > 0) {
          const { error: sErr } = await supabase
            .from('zone_structures')
            .insert(pendingStructures.map((s) => ({ ...s, zone_id: data.id })))
          if (sErr) {
            toast.error('Zona creada, pero error al agregar estructuras.')
          }
        }
        toast.success('Zona creada.')
      }
      onSuccess()
    } catch {
      toast.error('Error inesperado. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  // Get the structure being edited for StructureDialog
  const structDialogData: StructureRow | null = editingStruct
    ?? (editingPendingIdx !== null
      ? {
          id: '',
          zone_id: '',
          name: pendingStructures[editingPendingIdx].name,
          type: pendingStructures[editingPendingIdx].type,
          length_m: pendingStructures[editingPendingIdx].length_m,
          width_m: pendingStructures[editingPendingIdx].width_m,
          is_mobile: pendingStructures[editingPendingIdx].is_mobile,
          num_levels: pendingStructures[editingPendingIdx].num_levels,
          positions_per_level: pendingStructures[editingPendingIdx].positions_per_level ?? null,
          max_positions: null,
          spacing_cm: pendingStructures[editingPendingIdx].spacing_cm ?? null,
          pot_size_l: pendingStructures[editingPendingIdx].pot_size_l ?? null,
        }
      : null)

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!isLoading) onOpenChange(o) }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Editar zona' : 'Nueva zona'}</DialogTitle>
            <DialogDescription>
              {isEdit ? 'Modifica los datos de la zona y sus estructuras.' : 'Crea una nueva zona dentro de una instalación.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Section 1: Zone data */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="facility_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instalación</FormLabel>
                      <FormControl>
                        <select value={field.value} onChange={field.onChange} className={selectClass}>
                          <option value="">— Seleccionar —</option>
                          {facilities.map((f) => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Sala Vegetativo A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="purpose"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Propósito</FormLabel>
                      <FormControl>
                        <select value={field.value} onChange={field.onChange} className={selectClass}>
                          {Object.entries(purposeLabels).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="environment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ambiente</FormLabel>
                      <FormControl>
                        <select value={field.value} onChange={field.onChange} className={selectClass}>
                          {Object.entries(environmentLabels).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <FormControl>
                        <select value={field.value} onChange={field.onChange} className={selectClass}>
                          {Object.entries(statusLabels).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="area_m2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Área de piso (m²)</FormLabel>
                      <FormControl>
                        <Input
                          type="number" min="0" step="0.01" placeholder="100"
                          value={field.value === ('' as unknown as number) ? '' : field.value}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="height_m"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Altura (m, opt)</FormLabel>
                      <FormControl>
                        <Input
                          type="number" min="0" step="0.01" placeholder="—"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Climate config (plain state, not part of Zod schema) */}
              <div className="rounded-md border p-3 space-y-3">
                <p className="text-sm font-medium">Configuración climática (opcional)</p>
                <div className="grid grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Temp (°C)</label>
                    <Input
                      type="number" step="0.1" placeholder="—"
                      value={climateTemp ?? ''}
                      onChange={(e) => setClimateTemp(e.target.value ? parseFloat(e.target.value) : null)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">HR (%)</label>
                    <Input
                      type="number" step="1" min="0" max="100" placeholder="—"
                      value={climateHR ?? ''}
                      onChange={(e) => setClimateHR(e.target.value ? parseFloat(e.target.value) : null)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">CO₂ (ppm)</label>
                    <Input
                      type="number" step="1" min="0" placeholder="—"
                      value={climateCO2 ?? ''}
                      onChange={(e) => setClimateCO2(e.target.value ? parseFloat(e.target.value) : null)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Foto (h)</label>
                    <Input
                      placeholder="18/6"
                      value={climatePhoto}
                      onChange={(e) => setClimatePhoto(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Structures */}
              <div className="rounded-md border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Estructuras</p>
                    <p className="text-xs text-muted-foreground">
                      Las estructuras definen la capacidad de cultivo de la zona.
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={openNewStruct}>
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Agregar
                  </Button>
                </div>

                {/* Existing structures (edit mode) */}
                {structures.length > 0 && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Nombre</TableHead>
                          <TableHead className="text-xs">Tipo</TableHead>
                          <TableHead className="text-xs">L×A (m)</TableHead>
                          <TableHead className="text-xs">Niveles</TableHead>
                          <TableHead className="text-xs">Capacidad</TableHead>
                          <TableHead className="text-xs w-[70px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {structures.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="text-xs py-1.5">{s.name}</TableCell>
                            <TableCell className="text-xs py-1.5">
                              <Badge variant="secondary" className="text-xs">{structureTypeLabels[s.type] ?? s.type}</Badge>
                            </TableCell>
                            <TableCell className="text-xs py-1.5">{s.length_m}×{s.width_m}</TableCell>
                            <TableCell className="text-xs py-1.5">{s.num_levels}</TableCell>
                            <TableCell className="text-xs py-1.5">{s.max_positions ?? '—'}</TableCell>
                            <TableCell className="text-xs py-1.5">
                              <div className="flex gap-0.5">
                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditStruct(s)}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDeletingStruct(s)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Pending structures (create mode) */}
                {pendingStructures.length > 0 && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Nombre</TableHead>
                          <TableHead className="text-xs">Tipo</TableHead>
                          <TableHead className="text-xs">L×A (m)</TableHead>
                          <TableHead className="text-xs">Niveles</TableHead>
                          <TableHead className="text-xs">Capacidad</TableHead>
                          <TableHead className="text-xs w-[70px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingStructures.map((s, i) => {
                          const cap = s.positions_per_level ? s.num_levels * s.positions_per_level : null
                          return (
                            <TableRow key={i}>
                              <TableCell className="text-xs py-1.5">{s.name}</TableCell>
                              <TableCell className="text-xs py-1.5">
                                <Badge variant="secondary" className="text-xs">{structureTypeLabels[s.type] ?? s.type}</Badge>
                              </TableCell>
                              <TableCell className="text-xs py-1.5">{s.length_m}×{s.width_m}</TableCell>
                              <TableCell className="text-xs py-1.5">{s.num_levels}</TableCell>
                              <TableCell className="text-xs py-1.5">{cap ?? '—'}</TableCell>
                              <TableCell className="text-xs py-1.5">
                                <div className="flex gap-0.5">
                                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditPending(i)}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removePending(i)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {structures.length === 0 && pendingStructures.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    Sin estructuras. La capacidad se calculará desde el área de piso.
                  </p>
                )}

                {/* Calculated totals (edit mode) */}
                {isEdit && (
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground border-t pt-2">
                    <span>Área cultivo efectiva: <strong className="text-foreground">{zone.effective_growing_area_m2.toLocaleString()} m²</strong></span>
                    <span>Capacidad plantas: <strong className="text-foreground">{zone.plant_capacity.toLocaleString()}</strong></span>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Guardando...' : 'Guardar zona'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Structure mini-dialog */}
      <StructureDialog
        open={structDialogOpen}
        onOpenChange={(o) => { if (!o) { setStructDialogOpen(false); setEditingStruct(null); setEditingPendingIdx(null) } else setStructDialogOpen(true) }}
        structure={structDialogData}
        onSave={handleStructSave}
      />

      {/* Delete structure confirmation */}
      <AlertDialog open={!!deletingStruct} onOpenChange={(o) => !o && setDeletingStruct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar estructura</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar &quot;{deletingStruct?.name}&quot;? Esto recalculará la capacidad de la zona.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStruct}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
