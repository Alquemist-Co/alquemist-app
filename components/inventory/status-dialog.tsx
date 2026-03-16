'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { changeLotStatusSchema, type ChangeLotStatusInput } from '@/schemas/inventory'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
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

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring'

const statusOptions: { value: string; label: string }[] = [
  { value: 'available', label: 'Disponible' },
  { value: 'quarantine', label: 'Cuarentena' },
  { value: 'expired', label: 'Expirado' },
]

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: ItemRow | null
  onSuccess: () => void
}

export function StatusDialog({ open, onOpenChange, item, onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false)

  const availableStatuses = statusOptions.filter((s) => s.value !== item?.lot_status)

  const form = useForm<ChangeLotStatusInput>({
    resolver: zodResolver(changeLotStatusSchema),
    values: {
      lot_status: availableStatuses[0]?.value as ChangeLotStatusInput['lot_status'] ?? 'available',
      reason: '',
    },
  })

  async function onSubmit(values: ChangeLotStatusInput) {
    if (!item) return
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('inventory_items')
        .update({ lot_status: values.lot_status })
        .eq('id', item.id)

      if (error) {
        toast.error('Error al cambiar el estado del lote.')
        return
      }

      toast.success('Estado del lote actualizado.')
      onSuccess()
    } catch {
      toast.error('Error inesperado. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const currentStatusLabel =
    statusOptions.find((s) => s.value === item?.lot_status)?.label ?? item?.lot_status ?? ''

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!isLoading) onOpenChange(o)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar estado del lote</DialogTitle>
          <DialogDescription>
            Cambia el estado del lote de inventario.
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
              <span className="text-muted-foreground">Estado actual</span>
              <span className="font-medium">{currentStatusLabel}</span>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="lot_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nuevo estado</FormLabel>
                  <FormControl>
                    <select
                      value={field.value}
                      onChange={field.onChange}
                      className={selectClass}
                    >
                      {availableStatuses.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
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
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Razón *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Motivo del cambio de estado..."
                      rows={2}
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
                {isLoading ? 'Guardando...' : 'Cambiar estado'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
