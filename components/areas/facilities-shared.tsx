'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { facilitySchema, type FacilityInput } from '@/schemas/facilities'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Warehouse,
  TreePine,
  Triangle,
  Sun,
  Building2,
  type LucideIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

// ---------- Types ----------

export type FacilityRow = {
  id: string
  name: string
  type: string
  total_footprint_m2: number
  total_growing_area_m2: number
  total_plant_capacity: number
  address: string
  latitude: number | null
  longitude: number | null
  is_active: boolean
  zone_count: number
}

// ---------- Constants ----------

export const facilityTypeLabels: Record<string, string> = {
  indoor_warehouse: 'Bodega / Indoor',
  greenhouse: 'Invernadero',
  tunnel: 'Túnel',
  open_field: 'Campo abierto',
  vertical_farm: 'Granja vertical',
}

export const facilityTypeIcons: Record<string, LucideIcon> = {
  indoor_warehouse: Warehouse,
  greenhouse: TreePine,
  tunnel: Triangle,
  open_field: Sun,
  vertical_farm: Building2,
}

export const facilityTypeBadgeStyles: Record<string, string> = {
  indoor_warehouse: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
  greenhouse: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  tunnel: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  open_field: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  vertical_farm: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

// ================================================================
// FACILITY DIALOG
// ================================================================

export function FacilityDialog({
  open,
  onOpenChange,
  facility,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  facility: FacilityRow | null
  onSuccess: () => void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const isEdit = !!facility

  const form = useForm<FacilityInput>({
    resolver: zodResolver(facilitySchema),
    values: {
      name: facility?.name ?? '',
      type: (facility?.type as FacilityInput['type']) ?? 'greenhouse',
      total_footprint_m2: facility?.total_footprint_m2 ?? ('' as unknown as number),
      address: facility?.address ?? '',
      latitude: facility?.latitude ?? null,
      longitude: facility?.longitude ?? null,
    },
  })

  async function onSubmit(values: FacilityInput) {
    setIsLoading(true)
    const supabase = createClient()

    const payload = {
      name: values.name,
      type: values.type,
      total_footprint_m2: values.total_footprint_m2,
      address: values.address,
      latitude: values.latitude ?? null,
      longitude: values.longitude ?? null,
    }

    try {
      if (isEdit) {
        const { error } = await supabase
          .from('facilities')
          .update(payload)
          .eq('id', facility.id)
        if (error) {
          if (error.message?.includes('idx_facilities_name_company')) {
            form.setError('name', { message: 'Ya existe una instalación con este nombre' })
          } else {
            toast.error('Error al actualizar la instalación.')
          }
          return
        }
        toast.success('Instalación actualizada.')
      } else {
        const { error } = await supabase
          .from('facilities')
          .insert(payload)
        if (error) {
          if (error.message?.includes('idx_facilities_name_company')) {
            form.setError('name', { message: 'Ya existe una instalación con este nombre' })
          } else {
            toast.error('Error al crear la instalación.')
          }
          return
        }
        toast.success('Instalación creada.')
      }
      onSuccess()
    } catch {
      toast.error('Error inesperado. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isLoading) onOpenChange(o) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar instalación' : 'Nueva instalación'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Modifica los datos de la instalación.' : 'Crea una nueva instalación.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Invernadero Principal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <FormControl>
                      <select
                        value={field.value}
                        onChange={field.onChange}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="indoor_warehouse">Bodega / Indoor</option>
                        <option value="greenhouse">Invernadero</option>
                        <option value="tunnel">Túnel</option>
                        <option value="open_field">Campo abierto</option>
                        <option value="vertical_farm">Granja vertical</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="total_footprint_m2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Superficie (m²)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="500"
                        value={field.value === ('' as unknown as number) ? '' : field.value}
                        onChange={(e) => {
                          const v = e.target.value
                          field.onChange(v ? parseFloat(v) : '')
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Calle 123, Ciudad, Provincia"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitud (opt)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="-34.6037"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const v = e.target.value
                          field.onChange(v ? parseFloat(v) : null)
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="longitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitud (opt)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="-58.3816"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const v = e.target.value
                          field.onChange(v ? parseFloat(v) : null)
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Read-only totals in edit mode */}
            {isEdit && (facility.total_growing_area_m2 > 0 || facility.total_plant_capacity > 0) && (
              <div className="rounded-md border p-3 space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Totales calculados (desde zonas)</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span>Área de cultivo: <strong>{facility.total_growing_area_m2.toLocaleString('es-CO')} m²</strong></span>
                  <span>Capacidad: <strong>{facility.total_plant_capacity.toLocaleString('es-CO')} plantas</strong></span>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
