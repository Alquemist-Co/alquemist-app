'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supplierSchema, type SupplierInput } from '@/schemas/suppliers'
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

// ---------- Types ----------

export type SupplierRow = {
  id: string
  name: string
  contact_info: SupplierContactInfoData | null
  payment_terms: string | null
  is_active: boolean
  product_count: number
}

export type SupplierContactInfoData = {
  contact_name?: string
  email?: string
  phone?: string
  phone_secondary?: string
  address?: string
  city?: string
  country?: string
  website?: string
  notes?: string
}

// ---------- Constants ----------

export const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring'

// ---------- Dialog ----------

export function SupplierDialog({
  open,
  onOpenChange,
  supplier,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier: SupplierRow | null
  onSuccess: () => void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const isEdit = !!supplier

  const form = useForm<SupplierInput>({
    resolver: zodResolver(supplierSchema),
    values: {
      name: supplier?.name ?? '',
      contact_info: {
        contact_name: supplier?.contact_info?.contact_name ?? '',
        email: supplier?.contact_info?.email ?? '',
        phone: supplier?.contact_info?.phone ?? '',
        phone_secondary: supplier?.contact_info?.phone_secondary ?? '',
        address: supplier?.contact_info?.address ?? '',
        city: supplier?.contact_info?.city ?? '',
        country: supplier?.contact_info?.country ?? '',
        website: supplier?.contact_info?.website ?? '',
        notes: supplier?.contact_info?.notes ?? '',
      },
      payment_terms: supplier?.payment_terms ?? '',
    },
  })

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) return
    form.reset({
      name: supplier?.name ?? '',
      contact_info: {
        contact_name: supplier?.contact_info?.contact_name ?? '',
        email: supplier?.contact_info?.email ?? '',
        phone: supplier?.contact_info?.phone ?? '',
        phone_secondary: supplier?.contact_info?.phone_secondary ?? '',
        address: supplier?.contact_info?.address ?? '',
        city: supplier?.contact_info?.city ?? '',
        country: supplier?.contact_info?.country ?? '',
        website: supplier?.contact_info?.website ?? '',
        notes: supplier?.contact_info?.notes ?? '',
      },
      payment_terms: supplier?.payment_terms ?? '',
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, supplier?.id])

  async function onSubmit(values: SupplierInput) {
    setIsLoading(true)
    const supabase = createClient()

    // Clean empty strings from contact_info — omit empty fields per RNF-03
    const rawInfo = values.contact_info ?? {}
    const contactInfo: Record<string, string> = {}
    for (const [k, v] of Object.entries(rawInfo)) {
      if (typeof v === 'string' && v.trim()) {
        contactInfo[k] = v.trim()
      }
    }

    const payload = {
      name: values.name.trim(),
      contact_info: Object.keys(contactInfo).length > 0 ? contactInfo : null,
      payment_terms: values.payment_terms?.trim() || null,
    }

    try {
      if (isEdit) {
        const { error } = await supabase
          .from('suppliers')
          .update(payload)
          .eq('id', supplier.id)
        if (error) {
          if (error.message?.includes('suppliers_company_name')) {
            form.setError('name', { message: 'Ya existe un proveedor con este nombre' })
          } else {
            toast.error('Error al actualizar el proveedor.')
          }
          return
        }
        toast.success('Proveedor actualizado.')
      } else {
        const { error } = await supabase
          .from('suppliers')
          .insert(payload)
        if (error) {
          if (error.message?.includes('suppliers_company_name')) {
            form.setError('name', { message: 'Ya existe un proveedor con este nombre' })
          } else {
            toast.error('Error al crear el proveedor.')
          }
          return
        }
        toast.success('Proveedor creado.')
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar proveedor' : 'Nuevo proveedor'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Modifica los datos del proveedor.' : 'Crea un nuevo proveedor en el catálogo.'}
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
                    <Input placeholder="Nombre del proveedor" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Contact info sub-section */}
            <div className="rounded-md border p-3 space-y-3">
              <p className="text-sm font-medium">Información de contacto</p>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="contact_info.contact_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Nombre de contacto</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre del contacto" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contact_info.email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@ejemplo.com" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="contact_info.phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Teléfono</FormLabel>
                      <FormControl>
                        <Input placeholder="+57 300 000 0000" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contact_info.phone_secondary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Teléfono secundario</FormLabel>
                      <FormControl>
                        <Input placeholder="Opcional" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="contact_info.address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Dirección</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Dirección completa" rows={2} {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="contact_info.city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Ciudad</FormLabel>
                      <FormControl>
                        <Input placeholder="Ciudad" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contact_info.country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">País</FormLabel>
                      <FormControl>
                        <Input placeholder="País" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="contact_info.website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Sitio web</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://ejemplo.com" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contact_info.notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Notas de contacto</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Notas adicionales sobre el contacto" rows={2} {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="payment_terms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condiciones de pago</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: 30 días neto, Contado" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Guardando...' : isEdit ? 'Guardar' : 'Crear proveedor'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
