'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { adjustInventorySchema, type AdjustInventoryInput } from '@/schemas/inventory'
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

import type { ItemRow } from './items-list-client'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: ItemRow | null
  onSuccess: () => void
}

export function AdjustDialog({ open, onOpenChange, item, onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<AdjustInventoryInput>({
    resolver: zodResolver(adjustInventorySchema),
    values: {
      inventory_item_id: item?.id ?? '',
      quantity: 0,
      reason: '',
    },
  })

  const watchedQty = form.watch('quantity')
  const currentQty = item?.quantity_available ?? 0
  const newQty = currentQty + (watchedQty || 0)

  async function onSubmit(values: AdjustInventoryInput) {
    if (!item) return
    if (values.quantity < 0 && Math.abs(values.quantity) > item.quantity_available) {
      form.setError('quantity', {
        message: `No puedes retirar más de ${item.quantity_available.toLocaleString()} ${item.unit_code}`,
      })
      return
    }
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.functions.invoke('adjust-inventory', {
        body: {
          inventory_item_id: item.id,
          quantity: values.quantity,
          reason: values.reason,
        },
      })
      if (error) {
        let message = 'Error al ajustar el inventario.'
        try {
          const body = await (error as { context?: Response }).context?.json()
          if (body?.error) message = body.error
        } catch { /* use default message */ }
        toast.error(message)
        return
      }
      toast.success('Ajuste de inventario registrado.')
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
          <DialogTitle>Ajustar inventario</DialogTitle>
          <DialogDescription>
            Registra un ajuste positivo o negativo en la cantidad disponible del lote.
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
              <span className="text-muted-foreground">Zona</span>
              <span>{item.zone_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Disponible actual</span>
              <span className="font-medium">
                {currentQty.toLocaleString()} {item.unit_code}
              </span>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cantidad de ajuste</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      placeholder="Ej: 10 o -5"
                      value={field.value || ''}
                      onChange={(e) =>
                        field.onChange(e.target.value ? parseFloat(e.target.value) : 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                  {watchedQty !== 0 && item && (
                    <p className={`text-xs ${newQty < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {currentQty.toLocaleString()} {watchedQty > 0 ? '+' : ''}{' '}
                      {watchedQty.toLocaleString()} = {newQty.toLocaleString()} {item.unit_code}
                      {newQty < 0 && ' (excede disponible)'}
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
                  <FormLabel>Razon del ajuste</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe el motivo del ajuste..."
                      rows={3}
                      {...field}
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
                {isLoading ? 'Guardando...' : 'Registrar ajuste'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
