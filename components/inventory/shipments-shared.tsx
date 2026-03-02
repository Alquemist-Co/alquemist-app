'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { shipmentSchema, type ShipmentInput, markReceivedSchema, type MarkReceivedInput } from '@/schemas/shipments'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// ---------- Types ----------

export type ShipmentRow = {
  id: string
  shipment_code: string
  type: string
  status: string
  supplier_id: string | null
  supplier_name: string | null
  origin_name: string | null
  destination_facility_id: string
  facility_name: string
  estimated_arrival_date: string | null
  actual_arrival_date: string | null
  purchase_order_ref: string | null
  items_count: number
  carrier_name: string | null
  carrier_vehicle: string | null
  carrier_driver: string | null
  carrier_contact: string | null
  dispatch_date: string | null
  origin_address: string | null
  transport_conditions: TransportConditions | null
  notes: string | null
}

export type TransportConditions = {
  temperature_controlled?: boolean
  temperature_range_c?: string
  packaging_type?: string
  duration_hours?: number | null
  distance_km?: number | null
  cold_chain_maintained?: boolean
}

export type SupplierOption = { id: string; name: string }
export type FacilityOption = { id: string; name: string }
export type ProductOption = { id: string; name: string; sku: string; default_unit_id: string | null; shelf_life_days: number | null }
export type UnitOption = { id: string; code: string; name: string }
export type ZoneOption = { id: string; name: string; facility_id: string }

// ---------- Constants ----------

export const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring'

export const directionLabels: Record<string, string> = {
  inbound: 'Entrada',
  outbound: 'Salida',
}

export const statusLabels: Record<string, string> = {
  scheduled: 'Programado',
  in_transit: 'En tránsito',
  received: 'Recibido',
  inspecting: 'Inspeccionando',
  accepted: 'Aceptado',
  partial_accepted: 'Parcial',
  rejected: 'Rechazado',
  cancelled: 'Cancelado',
}

export const statusBadgeStyles: Record<string, string> = {
  scheduled: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  in_transit: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  received: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  inspecting: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  accepted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  partial_accepted: 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-gray-200 text-gray-500 dark:bg-gray-800/30 dark:text-gray-500',
}

export const directionBadgeStyles: Record<string, string> = {
  inbound: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  outbound: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
}

// ---------- Shipment Dialog ----------

type ShipmentItemRow = {
  id: string
  product_id: string
  expected_quantity: number
  unit_id: string
  supplier_lot_number: string | null
  supplier_batch_ref: string | null
  cost_per_unit: number | null
  destination_zone_id: string | null
  expiration_date: string | null
}

export function ShipmentDialog({
  open,
  onOpenChange,
  shipment,
  suppliers,
  facilities,
  products,
  units,
  zones,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  shipment: (ShipmentRow & { items?: ShipmentItemRow[] }) | null
  suppliers: SupplierOption[]
  facilities: FacilityOption[]
  products: ProductOption[]
  units: UnitOption[]
  zones: ZoneOption[]
  onSuccess: () => void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const isEdit = !!shipment

  // Transport conditions as plain state
  const [tempControlled, setTempControlled] = useState(shipment?.transport_conditions?.temperature_controlled ?? false)
  const [tempRange, setTempRange] = useState(shipment?.transport_conditions?.temperature_range_c ?? '')
  const [packagingType, setPackagingType] = useState(shipment?.transport_conditions?.packaging_type ?? '')
  const [durationHours, setDurationHours] = useState<number | null>(shipment?.transport_conditions?.duration_hours ?? null)
  const [distanceKm, setDistanceKm] = useState<number | null>(shipment?.transport_conditions?.distance_km ?? null)
  const [coldChain, setColdChain] = useState(shipment?.transport_conditions?.cold_chain_maintained ?? false)

  const form = useForm<ShipmentInput>({
    resolver: zodResolver(shipmentSchema),
    values: {
      type: (shipment?.type as ShipmentInput['type']) ?? 'inbound',
      supplier_id: shipment?.supplier_id ?? null,
      origin_name: shipment?.origin_name ?? '',
      origin_address: shipment?.origin_address ?? '',
      destination_facility_id: shipment?.destination_facility_id ?? '',
      carrier_name: shipment?.carrier_name ?? '',
      carrier_vehicle: shipment?.carrier_vehicle ?? '',
      carrier_driver: shipment?.carrier_driver ?? '',
      carrier_contact: shipment?.carrier_contact ?? '',
      dispatch_date: shipment?.dispatch_date?.slice(0, 16) ?? '',
      estimated_arrival_date: shipment?.estimated_arrival_date?.slice(0, 16) ?? '',
      transport_conditions: null,
      purchase_order_ref: shipment?.purchase_order_ref ?? '',
      notes: shipment?.notes ?? '',
      items: shipment?.items?.map((i) => ({
        product_id: i.product_id,
        expected_quantity: Number(i.expected_quantity),
        unit_id: i.unit_id,
        supplier_lot_number: i.supplier_lot_number ?? '',
        supplier_batch_ref: i.supplier_batch_ref ?? '',
        cost_per_unit: i.cost_per_unit ? Number(i.cost_per_unit) : null,
        destination_zone_id: i.destination_zone_id ?? null,
        expiration_date: i.expiration_date ?? '',
      })) ?? [{ product_id: '', expected_quantity: '' as unknown as number, unit_id: '', supplier_lot_number: '', supplier_batch_ref: '', cost_per_unit: null, destination_zone_id: null, expiration_date: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' })

  const watchType = form.watch('type')
  const watchFacility = form.watch('destination_facility_id')

  const filteredZones = zones.filter((z) => z.facility_id === watchFacility)

  // Reset transport condition state when dialog opens
  useEffect(() => {
    if (open) {
      setTempControlled(shipment?.transport_conditions?.temperature_controlled ?? false)
      setTempRange(shipment?.transport_conditions?.temperature_range_c ?? '')
      setPackagingType(shipment?.transport_conditions?.packaging_type ?? '')
      setDurationHours(shipment?.transport_conditions?.duration_hours ?? null)
      setDistanceKm(shipment?.transport_conditions?.distance_km ?? null)
      setColdChain(shipment?.transport_conditions?.cold_chain_maintained ?? false)
    }
  }, [open, shipment])

  function handleProductChange(idx: number, productId: string) {
    form.setValue(`items.${idx}.product_id`, productId)
    const product = products.find((p) => p.id === productId)
    if (product?.default_unit_id) {
      form.setValue(`items.${idx}.unit_id`, product.default_unit_id)
    }
  }

  async function onSubmit(values: ShipmentInput) {
    setIsLoading(true)
    const supabase = createClient()

    // Build transport conditions
    const hasTransport = tempControlled || tempRange || packagingType || durationHours != null || distanceKm != null || coldChain
    const tc = hasTransport ? {
      ...(tempControlled ? { temperature_controlled: true } : {}),
      ...(tempRange ? { temperature_range_c: tempRange } : {}),
      ...(packagingType ? { packaging_type: packagingType } : {}),
      ...(durationHours != null ? { duration_hours: durationHours } : {}),
      ...(distanceKm != null ? { distance_km: distanceKm } : {}),
      ...(coldChain ? { cold_chain_maintained: true } : {}),
    } : null

    const payload = {
      type: values.type,
      supplier_id: values.type === 'inbound' ? values.supplier_id : null,
      origin_name: values.origin_name || null,
      origin_address: values.origin_address || null,
      destination_facility_id: values.destination_facility_id,
      carrier_name: values.carrier_name || null,
      carrier_vehicle: values.carrier_vehicle || null,
      carrier_driver: values.carrier_driver || null,
      carrier_contact: values.carrier_contact || null,
      dispatch_date: values.dispatch_date || null,
      estimated_arrival_date: values.estimated_arrival_date || null,
      transport_conditions: tc,
      purchase_order_ref: values.purchase_order_ref || null,
      notes: values.notes || null,
    }

    try {
      if (isEdit) {
        const { error } = await supabase
          .from('shipments')
          .update(payload)
          .eq('id', shipment.id)
        if (error) { toast.error('Error al actualizar el envío.'); return }

        // Sync items: delete existing and re-insert
        await supabase.from('shipment_items').delete().eq('shipment_id', shipment.id)
        const itemsPayload = values.items.map((item, idx) => ({
          shipment_id: shipment.id,
          product_id: item.product_id,
          expected_quantity: item.expected_quantity,
          unit_id: item.unit_id,
          supplier_lot_number: item.supplier_lot_number || null,
          supplier_batch_ref: item.supplier_batch_ref || null,
          cost_per_unit: item.cost_per_unit ?? null,
          destination_zone_id: item.destination_zone_id || null,
          expiration_date: item.expiration_date || null,
          sort_order: idx,
        }))
        const { error: itemErr } = await supabase.from('shipment_items').insert(itemsPayload)
        if (itemErr) { toast.error('Envío actualizado, pero error en las líneas.'); return }
        toast.success('Envío actualizado.')
      } else {
        const { data, error } = await supabase
          .from('shipments')
          .insert(payload)
          .select('id')
          .single()
        if (error) { toast.error('Error al crear el envío.'); return }

        const itemsPayload = values.items.map((item, idx) => ({
          shipment_id: data.id,
          product_id: item.product_id,
          expected_quantity: item.expected_quantity,
          unit_id: item.unit_id,
          supplier_lot_number: item.supplier_lot_number || null,
          supplier_batch_ref: item.supplier_batch_ref || null,
          cost_per_unit: item.cost_per_unit ?? null,
          destination_zone_id: item.destination_zone_id || null,
          expiration_date: item.expiration_date || null,
          sort_order: idx,
        }))
        const { error: itemErr } = await supabase.from('shipment_items').insert(itemsPayload)
        if (itemErr) { toast.error('Envío creado, pero error en las líneas.') }
        else { toast.success('Envío creado.') }
      }
      onSuccess()
    } catch {
      toast.error('Error inesperado.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isLoading) onOpenChange(o) }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar envío' : 'Nuevo envío'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Modifica los datos del envío ${shipment.shipment_code}.`
              : 'Registra un nuevo envío de entrada o salida.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Section 1: Shipment data */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <FormControl>
                      <select value={field.value} onChange={field.onChange} className={selectClass} disabled={isEdit}>
                        <option value="inbound">Entrada (compra/recepción)</option>
                        <option value="outbound">Salida (venta/envío)</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="destination_facility_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instalación destino</FormLabel>
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
            </div>

            {watchType === 'inbound' && (
              <FormField
                control={form.control}
                name="supplier_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proveedor</FormLabel>
                    <FormControl>
                      <select value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} className={selectClass}>
                        <option value="">— Seleccionar —</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {watchType === 'outbound' && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="origin_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Origen</FormLabel>
                      <FormControl><Input placeholder="Nombre del origen" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="origin_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección origen (opt)</FormLabel>
                      <FormControl><Input placeholder="Dirección" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="purchase_order_ref"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ref. orden de compra (opt)</FormLabel>
                  <FormControl><Input placeholder="PO-2026-001" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Section 2: Transport */}
            <div className="rounded-md border p-3 space-y-3">
              <p className="text-sm font-medium">Transporte (opcional)</p>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="carrier_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transportista</FormLabel>
                    <FormControl><Input placeholder="Empresa transportadora" {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="carrier_vehicle" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehículo/placa</FormLabel>
                    <FormControl><Input placeholder="ABC-123" {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="carrier_driver" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conductor</FormLabel>
                    <FormControl><Input placeholder="Nombre del conductor" {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="carrier_contact" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contacto</FormLabel>
                    <FormControl><Input placeholder="Teléfono" {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="dispatch_date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Despacho</FormLabel>
                    <FormControl><Input type="datetime-local" {...field} value={field.value ?? ''} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="estimated_arrival_date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Llegada estimada</FormLabel>
                    <FormControl><Input type="datetime-local" {...field} value={field.value ?? ''} /></FormControl>
                  </FormItem>
                )} />
              </div>

              {/* Transport conditions */}
              <div className="border-t pt-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Condiciones de transporte</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between gap-2 rounded-md border p-2">
                    <label className="text-xs">Temp. controlada</label>
                    <Switch checked={tempControlled} onCheckedChange={setTempControlled} />
                  </div>
                  {tempControlled && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Rango (°C)</label>
                      <Input placeholder="2-8" value={tempRange} onChange={(e) => setTempRange(e.target.value)} />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Empaque</label>
                    <Input placeholder="Cajas" value={packagingType} onChange={(e) => setPackagingType(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Duración (h)</label>
                    <Input type="number" min="0" step="0.5" placeholder="—" value={durationHours ?? ''} onChange={(e) => setDurationHours(e.target.value ? parseFloat(e.target.value) : null)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Distancia (km)</label>
                    <Input type="number" min="0" step="1" placeholder="—" value={distanceKm ?? ''} onChange={(e) => setDistanceKm(e.target.value ? parseFloat(e.target.value) : null)} />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-md border p-2 w-fit">
                  <label className="text-xs">Cadena de frío</label>
                  <Switch checked={coldChain} onCheckedChange={setColdChain} />
                </div>
              </div>
            </div>

            {/* Section 3: Items */}
            <div className="rounded-md border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Líneas del envío</p>
                  <p className="text-xs text-muted-foreground">Productos y cantidades esperadas.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ product_id: '', expected_quantity: '' as unknown as number, unit_id: '', supplier_lot_number: '', supplier_batch_ref: '', cost_per_unit: null, destination_zone_id: null, expiration_date: '' })}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Agregar
                </Button>
              </div>
              {form.formState.errors.items?.root && (
                <p className="text-sm text-destructive">{form.formState.errors.items.root.message}</p>
              )}

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs min-w-[160px]">Producto</TableHead>
                      <TableHead className="text-xs min-w-[80px]">Cantidad</TableHead>
                      <TableHead className="text-xs min-w-[100px]">Unidad</TableHead>
                      <TableHead className="text-xs min-w-[100px]">Lote prov.</TableHead>
                      <TableHead className="text-xs min-w-[80px]">Costo/u</TableHead>
                      <TableHead className="text-xs min-w-[130px]">Zona destino</TableHead>
                      <TableHead className="text-xs w-[40px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, idx) => (
                      <TableRow key={field.id}>
                        <TableCell className="py-1.5">
                          <select
                            value={form.watch(`items.${idx}.product_id`)}
                            onChange={(e) => handleProductChange(idx, e.target.value)}
                            className={selectClass + ' text-xs'}
                          >
                            <option value="">— Producto —</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                            ))}
                          </select>
                          {form.formState.errors.items?.[idx]?.product_id && (
                            <p className="text-xs text-destructive mt-0.5">{form.formState.errors.items[idx].product_id?.message}</p>
                          )}
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Input
                            type="number" min="0" step="0.01" className="h-8 text-xs"
                            value={form.watch(`items.${idx}.expected_quantity`) === ('' as unknown as number) ? '' : form.watch(`items.${idx}.expected_quantity`)}
                            onChange={(e) => form.setValue(`items.${idx}.expected_quantity`, e.target.value ? parseFloat(e.target.value) : '' as unknown as number)}
                          />
                          {form.formState.errors.items?.[idx]?.expected_quantity && (
                            <p className="text-xs text-destructive mt-0.5">{form.formState.errors.items[idx].expected_quantity?.message}</p>
                          )}
                        </TableCell>
                        <TableCell className="py-1.5">
                          <select
                            value={form.watch(`items.${idx}.unit_id`)}
                            onChange={(e) => form.setValue(`items.${idx}.unit_id`, e.target.value)}
                            className={selectClass + ' text-xs'}
                          >
                            <option value="">— Und —</option>
                            {units.map((u) => (
                              <option key={u.id} value={u.id}>{u.code}</option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Input
                            className="h-8 text-xs" placeholder="—"
                            {...form.register(`items.${idx}.supplier_lot_number`)}
                          />
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Input
                            type="number" min="0" step="0.01" className="h-8 text-xs" placeholder="—"
                            value={form.watch(`items.${idx}.cost_per_unit`) ?? ''}
                            onChange={(e) => form.setValue(`items.${idx}.cost_per_unit`, e.target.value ? parseFloat(e.target.value) : null)}
                          />
                        </TableCell>
                        <TableCell className="py-1.5">
                          <select
                            value={form.watch(`items.${idx}.destination_zone_id`) ?? ''}
                            onChange={(e) => form.setValue(`items.${idx}.destination_zone_id`, e.target.value || null)}
                            className={selectClass + ' text-xs'}
                          >
                            <option value="">— Zona —</option>
                            {filteredZones.map((z) => (
                              <option key={z.id} value={z.id}>{z.name}</option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(idx)} disabled={fields.length === 1}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Notes */}
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notas (opt)</FormLabel>
                <FormControl><Textarea placeholder="Observaciones del envío..." rows={2} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Guardando...' : isEdit ? 'Guardar envío' : 'Crear envío'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Mark Received Dialog ----------

export function MarkReceivedDialog({
  open,
  onOpenChange,
  shipment,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  shipment: ShipmentRow | null
  onSuccess: () => void
}) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<MarkReceivedInput>({
    resolver: zodResolver(markReceivedSchema),
    values: {
      actual_arrival_date: new Date().toISOString().slice(0, 16),
      received_by: '',
    },
  })

  async function onSubmit(values: MarkReceivedInput) {
    if (!shipment) return
    setIsLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('shipments')
      .update({
        status: 'received' as const,
        actual_arrival_date: values.actual_arrival_date,
        received_by: values.received_by,
      })
      .eq('id', shipment.id)

    if (error) {
      toast.error('Error al marcar como recibido.')
    } else {
      toast.success('Envío marcado como recibido.')
      onSuccess()
    }
    setIsLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isLoading) onOpenChange(o) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Marcar recibido</DialogTitle>
          <DialogDescription>
            Confirma la recepción del envío {shipment?.shipment_code}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="actual_arrival_date" render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de llegada</FormLabel>
                <FormControl><Input type="datetime-local" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="received_by" render={({ field }) => (
              <FormItem>
                <FormLabel>Recibido por (ID usuario)</FormLabel>
                <FormControl><Input placeholder="UUID del usuario" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Guardando...' : 'Confirmar recepción'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
