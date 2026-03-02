'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  productSchema,
  type ProductInput,
  productRegReqSchema,
  type ProductRegReqInput,
} from '@/schemas/products'
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

export type ProductRow = {
  id: string
  sku: string
  name: string
  category_id: string
  category_name: string
  category_icon: string | null
  default_unit_id: string
  unit_code: string
  cultivar_id: string | null
  procurement_type: string
  lot_tracking: string
  preferred_supplier_id: string | null
  supplier_name: string | null
  default_price: number | null
  price_currency: string | null
  requires_regulatory_docs: boolean
  is_active: boolean
}

export type CategoryOption = { id: string; name: string; icon: string | null; is_transformable: boolean }
export type UnitOption = { id: string; code: string; name: string }
export type CultivarOption = { id: string; name: string }
export type SupplierOption = { id: string; name: string }
export type DocTypeOption = { id: string; name: string; code: string }

export type RegReqRow = {
  id: string
  doc_type_id: string
  doc_type_name: string
  is_mandatory: boolean
  applies_to_scope: string
  frequency: string
  notes: string | null
  sort_order: number
}

// ---------- Constants ----------

export const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring'

export const procurementTypeLabels: Record<string, string> = {
  purchased: 'Comprado',
  produced: 'Producido',
  both: 'Comprado y Producido',
}

export const procurementTypeBadgeStyles: Record<string, string> = {
  purchased: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  produced: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  both: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

export const lotTrackingLabels: Record<string, string> = {
  required: 'Requerido',
  optional: 'Opcional',
  none: 'Sin seguimiento',
}

export const lotTrackingBadgeStyles: Record<string, string> = {
  required: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  optional: 'bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400',
  none: 'bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-400',
}

export const scopeLabels: Record<string, string> = {
  per_batch: 'Por batch',
  per_lot: 'Por lote',
  per_product: 'Por producto',
  per_facility: 'Por instalación',
}

export const frequencyLabels: Record<string, string> = {
  once: 'Una vez',
  per_production: 'Por producción',
  annual: 'Anual',
  per_shipment: 'Por envío',
}

// ================================================================
// REG REQ MINI-DIALOG
// ================================================================

function RegReqDialog({
  open,
  onOpenChange,
  reqData,
  docTypes,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  reqData: RegReqRow | null
  docTypes: DocTypeOption[]
  onSave: (values: ProductRegReqInput) => Promise<void>
}) {
  const isEdit = !!reqData
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<ProductRegReqInput>({
    resolver: zodResolver(productRegReqSchema),
    values: {
      doc_type_id: reqData?.doc_type_id ?? '',
      is_mandatory: reqData?.is_mandatory ?? true,
      applies_to_scope: (reqData?.applies_to_scope as ProductRegReqInput['applies_to_scope']) ?? 'per_batch',
      frequency: (reqData?.frequency as ProductRegReqInput['frequency']) ?? 'per_production',
      notes: reqData?.notes ?? '',
    },
  })

  async function onSubmit(values: ProductRegReqInput) {
    setIsSaving(true)
    try {
      await onSave(values)
      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isSaving) onOpenChange(o) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar requerimiento' : 'Nuevo requerimiento'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Modifica el requerimiento regulatorio.' : 'Agrega un requerimiento regulatorio al producto.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="doc_type_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de documento</FormLabel>
                  <FormControl>
                    <select value={field.value} onChange={field.onChange} className={selectClass}>
                      <option value="">— Seleccionar —</option>
                      {docTypes.map((dt) => (
                        <option key={dt.id} value={dt.id}>{dt.name}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="applies_to_scope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alcance</FormLabel>
                    <FormControl>
                      <select value={field.value} onChange={field.onChange} className={selectClass}>
                        {Object.entries(scopeLabels).map(([val, label]) => (
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
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frecuencia</FormLabel>
                    <FormControl>
                      <select value={field.value} onChange={field.onChange} className={selectClass}>
                        {Object.entries(frequencyLabels).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="is_mandatory"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-2 space-y-0 rounded-md border p-3">
                  <FormLabel className="font-normal text-sm">Obligatorio</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Requerido para exportación..." {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Guardando...' : isEdit ? 'Guardar' : 'Agregar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ================================================================
// PRODUCT DIALOG
// ================================================================

export function ProductDialog({
  open,
  onOpenChange,
  product,
  categories,
  units,
  cultivars,
  suppliers,
  docTypes,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: ProductRow | null
  categories: CategoryOption[]
  units: UnitOption[]
  cultivars: CultivarOption[]
  suppliers: SupplierOption[]
  docTypes: DocTypeOption[]
  onSuccess: () => void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const isEdit = !!product

  // Regulatory requirements state
  const [regReqs, setRegReqs] = useState<RegReqRow[]>([])
  const [pendingReqs, setPendingReqs] = useState<(ProductRegReqInput & { _docTypeName: string })[]>([])
  const [showRegSection, setShowRegSection] = useState(product?.requires_regulatory_docs ?? false)
  const [reqDialogOpen, setReqDialogOpen] = useState(false)
  const [editingReq, setEditingReq] = useState<RegReqRow | null>(null)
  const [editingPendingIdx, setEditingPendingIdx] = useState<number | null>(null)
  const [deletingReq, setDeletingReq] = useState<RegReqRow | null>(null)

  const form = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    values: {
      sku: product?.sku ?? '',
      name: product?.name ?? '',
      category_id: product?.category_id ?? '',
      default_unit_id: product?.default_unit_id ?? '',
      cultivar_id: product?.cultivar_id ?? null,
      procurement_type: (product?.procurement_type as ProductInput['procurement_type']) ?? 'purchased',
      lot_tracking: (product?.lot_tracking as ProductInput['lot_tracking']) ?? 'none',
      shelf_life_days: null,
      phi_days: null,
      rei_hours: null,
      default_yield_pct: null,
      density_g_per_ml: null,
      conversion_properties: { ppm_factor: null, dilution_ratio: null },
      default_price: product?.default_price ?? null,
      price_currency: product?.price_currency ?? null,
      preferred_supplier_id: product?.preferred_supplier_id ?? null,
    },
  })

  const selectedCategoryId = form.watch('category_id')
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId)
  const showCultivar = selectedCategory?.is_transformable ?? false

  // Load additional product fields + reqs when editing
  useEffect(() => {
    if (!open) {
      setRegReqs([])
      setPendingReqs([])
      setShowRegSection(false)
      return
    }
    if (isEdit) {
      setShowRegSection(product.requires_regulatory_docs)
      let cancelled = false
      const supabase = createClient()

      // Load full product for extra fields not in list view
      supabase
        .from('products')
        .select('shelf_life_days, phi_days, rei_hours, default_yield_pct, density_g_per_ml, conversion_properties')
        .eq('id', product.id)
        .single()
        .then(({ data }) => {
          if (data && !cancelled) {
            form.setValue('shelf_life_days', data.shelf_life_days)
            form.setValue('phi_days', data.phi_days)
            form.setValue('rei_hours', data.rei_hours)
            form.setValue('default_yield_pct', data.default_yield_pct ? Number(data.default_yield_pct) : null)
            form.setValue('density_g_per_ml', data.density_g_per_ml ? Number(data.density_g_per_ml) : null)
            const cp = data.conversion_properties as { ppm_factor?: number | null; dilution_ratio?: number | null } | null
            form.setValue('conversion_properties', cp
              ? { ppm_factor: cp.ppm_factor ?? null, dilution_ratio: cp.dilution_ratio ?? null }
              : { ppm_factor: null, dilution_ratio: null })
          }
        })

      // Load reg reqs
      supabase
        .from('product_regulatory_requirements')
        .select('*, doc_type:regulatory_doc_types(name)')
        .eq('product_id', product.id)
        .order('sort_order')
        .then(({ data }) => {
          if (data && !cancelled) {
            setRegReqs(data.map((r) => ({
              id: r.id,
              doc_type_id: r.doc_type_id,
              doc_type_name: (r.doc_type as { name: string } | null)?.name ?? '',
              is_mandatory: r.is_mandatory,
              applies_to_scope: r.applies_to_scope,
              frequency: r.frequency,
              notes: r.notes,
              sort_order: r.sort_order,
            })))
          }
        })

      return () => { cancelled = true }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, product?.id])

  // Reg req handlers
  function openNewReq() {
    setEditingReq(null)
    setEditingPendingIdx(null)
    setReqDialogOpen(true)
  }

  function openEditReq(r: RegReqRow) {
    setEditingReq(r)
    setEditingPendingIdx(null)
    setReqDialogOpen(true)
  }

  function openEditPendingReq(idx: number) {
    setEditingReq(null)
    setEditingPendingIdx(idx)
    setReqDialogOpen(true)
  }

  async function handleReqSave(values: ProductRegReqInput) {
    const docTypeName = docTypes.find((dt) => dt.id === values.doc_type_id)?.name ?? ''

    if (isEdit) {
      const supabase = createClient()
      if (editingReq) {
        const { error } = await supabase
          .from('product_regulatory_requirements')
          .update(values)
          .eq('id', editingReq.id)
        if (error) { toast.error('Error al actualizar requerimiento.'); return }
        toast.success('Requerimiento actualizado.')
      } else {
        const { error } = await supabase
          .from('product_regulatory_requirements')
          .insert({ ...values, product_id: product!.id })
        if (error) { toast.error('Error al agregar requerimiento.'); return }
        toast.success('Requerimiento agregado.')
        // Ensure flag is set
        const { error: flagErr } = await supabase.from('products').update({ requires_regulatory_docs: true }).eq('id', product!.id)
        if (flagErr) toast.error('Error al actualizar flag de documentación regulatoria.')
      }
      // Refresh
      const { data } = await supabase
        .from('product_regulatory_requirements')
        .select('*, doc_type:regulatory_doc_types(name)')
        .eq('product_id', product!.id)
        .order('sort_order')
      if (data) {
        setRegReqs(data.map((r) => ({
          id: r.id,
          doc_type_id: r.doc_type_id,
          doc_type_name: (r.doc_type as { name: string } | null)?.name ?? '',
          is_mandatory: r.is_mandatory,
          applies_to_scope: r.applies_to_scope,
          frequency: r.frequency,
          notes: r.notes,
          sort_order: r.sort_order,
        })))
      }
    } else {
      // Create mode: add to pending
      if (editingPendingIdx !== null) {
        setPendingReqs((prev) => prev.map((r, i) => i === editingPendingIdx ? { ...values, _docTypeName: docTypeName } : r))
      } else {
        setPendingReqs((prev) => [...prev, { ...values, _docTypeName: docTypeName }])
      }
    }
  }

  async function handleDeleteReq() {
    if (!deletingReq) return
    const supabase = createClient()
    const { error } = await supabase
      .from('product_regulatory_requirements')
      .delete()
      .eq('id', deletingReq.id)
    if (error) { toast.error('Error al eliminar requerimiento.'); return }
    toast.success('Requerimiento eliminado.')
    setRegReqs((prev) => prev.filter((r) => r.id !== deletingReq.id))
    // Update flag if no more reqs
    const remaining = regReqs.filter((r) => r.id !== deletingReq.id)
    if (remaining.length === 0) {
      const { error: flagErr } = await supabase.from('products').update({ requires_regulatory_docs: false }).eq('id', product!.id)
      if (flagErr) toast.error('Error al actualizar flag de documentación regulatoria.')
    }
    setDeletingReq(null)
  }

  function removePendingReq(idx: number) {
    setPendingReqs((prev) => prev.filter((_, i) => i !== idx))
  }

  // Main form submit
  async function onSubmit(values: ProductInput) {
    setIsLoading(true)
    const supabase = createClient()

    // Clean optional fields
    const cp = values.conversion_properties
    const cleanedCp = (cp?.ppm_factor == null && cp?.dilution_ratio == null) ? null : cp
    const payload = {
      ...values,
      cultivar_id: showCultivar ? values.cultivar_id || null : null,
      preferred_supplier_id: values.preferred_supplier_id || null,
      price_currency: values.price_currency || null,
      conversion_properties: cleanedCp,
      requires_regulatory_docs: isEdit ? product!.requires_regulatory_docs : (showRegSection && pendingReqs.length > 0),
    }

    try {
      if (isEdit) {
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', product.id)
        if (error) {
          if (error.message?.includes('idx_products_sku_company')) {
            form.setError('sku', { message: 'Ya existe un producto con este SKU' })
          } else {
            toast.error('Error al actualizar el producto.')
          }
          return
        }
        toast.success('Producto actualizado.')
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert(payload)
          .select('id')
          .single()
        if (error) {
          if (error.message?.includes('idx_products_sku_company')) {
            form.setError('sku', { message: 'Ya existe un producto con este SKU' })
          } else {
            toast.error('Error al crear el producto.')
          }
          return
        }
        // Insert pending reg reqs
        if (pendingReqs.length > 0) {
          const { error: rErr } = await supabase
            .from('product_regulatory_requirements')
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            .insert(pendingReqs.map(({ _docTypeName, ...r }) => ({ ...r, product_id: data.id })))
          if (rErr) {
            toast.error('Producto creado, pero error al agregar requerimientos.')
          }
        }
        toast.success('Producto creado.')
      }
      onSuccess()
    } catch {
      toast.error('Error inesperado. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  // Build data for RegReqDialog
  const reqDialogData: RegReqRow | null = editingReq
    ?? (editingPendingIdx !== null
      ? {
          id: '',
          doc_type_id: pendingReqs[editingPendingIdx].doc_type_id,
          doc_type_name: pendingReqs[editingPendingIdx]._docTypeName,
          is_mandatory: pendingReqs[editingPendingIdx].is_mandatory,
          applies_to_scope: pendingReqs[editingPendingIdx].applies_to_scope,
          frequency: pendingReqs[editingPendingIdx].frequency,
          notes: pendingReqs[editingPendingIdx].notes ?? null,
          sort_order: 0,
        }
      : null)

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!isLoading) onOpenChange(o) }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
            <DialogDescription>
              {isEdit ? 'Modifica los datos del producto.' : 'Crea un nuevo producto en el catálogo.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Section 1: Basic Data */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU</FormLabel>
                      <FormControl>
                        <Input placeholder="SEM-GELATO-FEM" {...field} />
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
                        <Input placeholder="Semilla Gelato Feminizada" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría</FormLabel>
                      <FormControl>
                        <select value={field.value} onChange={field.onChange} className={selectClass}>
                          <option value="">— Seleccionar —</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.icon ? `${c.icon} ` : ''}{c.name}
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
                  name="default_unit_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidad de medida</FormLabel>
                      <FormControl>
                        <select value={field.value} onChange={field.onChange} className={selectClass}>
                          <option value="">— Seleccionar —</option>
                          {units.map((u) => (
                            <option key={u.id} value={u.id}>{u.code} — {u.name}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {showCultivar && (
                <FormField
                  control={form.control}
                  name="cultivar_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cultivar (opcional)</FormLabel>
                      <FormControl>
                        <select value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} className={selectClass}>
                          <option value="">— Sin cultivar —</option>
                          {cultivars.map((cv) => (
                            <option key={cv.id} value={cv.id}>{cv.name}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="procurement_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de adquisición</FormLabel>
                      <FormControl>
                        <select value={field.value} onChange={field.onChange} className={selectClass}>
                          {Object.entries(procurementTypeLabels).map(([val, label]) => (
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
                  name="lot_tracking"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seguimiento de lote</FormLabel>
                      <FormControl>
                        <select value={field.value} onChange={field.onChange} className={selectClass}>
                          {Object.entries(lotTrackingLabels).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Section 2: Additional Properties */}
              <div className="rounded-md border p-3 space-y-3">
                <p className="text-sm font-medium">Propiedades adicionales (opcional)</p>
                <div className="grid grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="shelf_life_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Vida útil (días)</FormLabel>
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
                    name="phi_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">PHI (días)</FormLabel>
                        <FormControl>
                          <Input
                            type="number" min="0" step="1" placeholder="—"
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
                    name="rei_hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">REI (horas)</FormLabel>
                        <FormControl>
                          <Input
                            type="number" min="0" step="1" placeholder="—"
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="default_yield_pct"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Rendimiento (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number" min="0" max="100" step="0.01" placeholder="—"
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="density_g_per_ml"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Densidad (g/mL)</FormLabel>
                        <FormControl>
                          <Input
                            type="number" min="0" step="0.0001" placeholder="—"
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="conversion_properties.ppm_factor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Factor PPM</FormLabel>
                        <FormControl>
                          <Input
                            type="number" min="0" step="any" placeholder="—"
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="conversion_properties.dilution_ratio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Ratio dilución</FormLabel>
                        <FormControl>
                          <Input
                            type="number" min="0" step="any" placeholder="—"
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Section 3: Price & Supplier */}
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="default_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio (opt)</FormLabel>
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
                <FormField
                  control={form.control}
                  name="price_currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Moneda (opt)</FormLabel>
                      <FormControl>
                        <select value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} className={selectClass}>
                          <option value="">—</option>
                          <option value="COP">COP</option>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="preferred_supplier_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proveedor (opt)</FormLabel>
                      <FormControl>
                        <select value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} className={selectClass}>
                          <option value="">— Sin proveedor —</option>
                          {suppliers.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Section 4: Regulatory Requirements */}
              <div className="rounded-md border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-medium">Requerimientos regulatorios</p>
                    <Switch checked={showRegSection} onCheckedChange={setShowRegSection} />
                  </div>
                  {showRegSection && (
                    <Button type="button" variant="outline" size="sm" onClick={openNewReq}>
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Agregar
                    </Button>
                  )}
                </div>

                {showRegSection && (
                  <>
                    {/* Existing reqs (edit mode) */}
                    {regReqs.length > 0 && (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Documento</TableHead>
                              <TableHead className="text-xs">Obligatorio</TableHead>
                              <TableHead className="text-xs">Alcance</TableHead>
                              <TableHead className="text-xs">Frecuencia</TableHead>
                              <TableHead className="text-xs w-[70px]" />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {regReqs.map((r) => (
                              <TableRow key={r.id}>
                                <TableCell className="text-xs py-1.5">{r.doc_type_name}</TableCell>
                                <TableCell className="text-xs py-1.5">
                                  <Badge variant="secondary" className="text-xs">{r.is_mandatory ? 'Sí' : 'No'}</Badge>
                                </TableCell>
                                <TableCell className="text-xs py-1.5">{scopeLabels[r.applies_to_scope] ?? r.applies_to_scope}</TableCell>
                                <TableCell className="text-xs py-1.5">{frequencyLabels[r.frequency] ?? r.frequency}</TableCell>
                                <TableCell className="text-xs py-1.5">
                                  <div className="flex gap-0.5">
                                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditReq(r)}>
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDeletingReq(r)}>
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

                    {/* Pending reqs (create mode) */}
                    {pendingReqs.length > 0 && (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Documento</TableHead>
                              <TableHead className="text-xs">Obligatorio</TableHead>
                              <TableHead className="text-xs">Alcance</TableHead>
                              <TableHead className="text-xs">Frecuencia</TableHead>
                              <TableHead className="text-xs w-[70px]" />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pendingReqs.map((r, i) => (
                              <TableRow key={i}>
                                <TableCell className="text-xs py-1.5">{r._docTypeName}</TableCell>
                                <TableCell className="text-xs py-1.5">
                                  <Badge variant="secondary" className="text-xs">{r.is_mandatory ? 'Sí' : 'No'}</Badge>
                                </TableCell>
                                <TableCell className="text-xs py-1.5">{scopeLabels[r.applies_to_scope] ?? r.applies_to_scope}</TableCell>
                                <TableCell className="text-xs py-1.5">{frequencyLabels[r.frequency] ?? r.frequency}</TableCell>
                                <TableCell className="text-xs py-1.5">
                                  <div className="flex gap-0.5">
                                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditPendingReq(i)}>
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removePendingReq(i)}>
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

                    {regReqs.length === 0 && pendingReqs.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-3">
                        Sin requerimientos regulatorios configurados.
                      </p>
                    )}
                  </>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Guardando...' : 'Guardar producto'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Reg Req mini-dialog */}
      <RegReqDialog
        open={reqDialogOpen}
        onOpenChange={(o) => { if (!o) { setReqDialogOpen(false); setEditingReq(null); setEditingPendingIdx(null) } else setReqDialogOpen(true) }}
        reqData={reqDialogData}
        docTypes={docTypes}
        onSave={handleReqSave}
      />

      {/* Delete reg req confirmation */}
      <AlertDialog open={!!deletingReq} onOpenChange={(o) => !o && setDeletingReq(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar requerimiento</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar el requerimiento &quot;{deletingReq?.doc_type_name}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteReq}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
