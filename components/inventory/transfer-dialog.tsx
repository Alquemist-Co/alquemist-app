'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { transferInventorySchema, type TransferInventoryInput } from '@/schemas/inventory'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

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

import type { ItemRow, ZoneOption } from './items-list-client'

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: ItemRow | null
  zones: ZoneOption[]
  onSuccess: () => void
}

export function TransferDialog({ open, onOpenChange, item, zones, onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false)

  const availableZones = zones.filter((z) => z.id !== item?.zone_id)

  const form = useForm<TransferInventoryInput>({
    resolver: zodResolver(transferInventorySchema),
    values: {
      inventory_item_id: item?.id ?? '',
      destination_zone_id: '',
      quantity: 0,
      reason: '',
    },
  })

  const watchedQty = form.watch('quantity')
  const watchedZoneId = form.watch('destination_zone_id')
  const destinationZone = zones.find((z) => z.id === watchedZoneId)

  async function onSubmit(values: TransferInventoryInput) {
    if (!item) return
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.functions.invoke('transfer-inventory', {
        body: {
          inventory_item_id: item.id,
          destination_zone_id: values.destination_zone_id,
          quantity: values.quantity,
          reason: values.reason || undefined,
        },
      })
      if (error) {
        let message = 'Error al transferir inventario.'
        try {
          const body = await (error as { context?: Response }).context?.json()
          if (body?.error) message = body.error
        } catch { /* use default message */ }
        toast.error(message)
        return
      }
      toast.success('Transferencia registrada.')
      onSuccess()
    } catch {
      toast.error('Error inesperado. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!isLoading) onOpenChange(o)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transferir inventario</DialogTitle>
          <DialogDescription>
            Mueve una cantidad de este lote a otra zona.
          </DialogDescription>
        </DialogHeader>

        {item && (
          <div className="rounded-md border p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Producto</span>
              <span className="font-medium">{item.product_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lote</span>
              <span className="font-mono text-xs">{item.batch_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Zona origen</span>
              <span>{item.zone_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Disponible</span>
              <span className="font-medium">
                {item.quantity_available.toLocaleString()} {item.unit_code}
              </span>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="destination_zone_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zona destino</FormLabel>
                  <FormControl>
                    <select
                      value={field.value}
                      onChange={field.onChange}
                      className={selectClass}
                    >
                      <option value="">— Seleccionar zona —</option>
                      {availableZones.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.name} ({z.facility_name})
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cantidad a transferir</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      max={item?.quantity_available ?? 0}
                      placeholder="0"
                      value={field.value || ''}
                      onChange={(e) =>
                        field.onChange(e.target.value ? parseFloat(e.target.value) : 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                  {watchedQty > 0 && item && destinationZone && (
                    <p className="text-xs text-muted-foreground">
                      {watchedQty.toLocaleString()} {item.unit_code} de {item.zone_name}{' '}
                      &rarr; {destinationZone.name}
                    </p>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Razon (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Motivo de la transferencia..."
                      rows={2}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Transfiriendo...' : 'Transferir'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
