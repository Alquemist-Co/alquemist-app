'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  regulatoryDocTypeSchema,
  type RegulatoryDocTypeInput,
  productRequirementSchema,
  type ProductRequirementInput,
  shipmentRequirementSchema,
  type ShipmentRequirementInput,
} from '@/schemas/regulatory'
import { createClient } from '@/lib/supabase/client'
import type { Json } from '@/types/database'
import { toast } from 'sonner'
import {
  Plus,
  Pencil,
  Trash2,
  Power,
  Copy,
  ChevronUp,
  ChevronDown,
  Eye,
  GripVertical,
  AlertTriangle,
  Info,
  Link as LinkIcon,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

// ---------- Types ----------

type FieldType = 'text' | 'textarea' | 'date' | 'number' | 'boolean' | 'select'

type FormFieldDef = {
  key: string
  label: string
  type: FieldType
  required: boolean
  options?: string[]
  placeholder?: string
  help_text?: string
}

type RequiredFieldsJson = {
  fields: FormFieldDef[]
}

type DocTypeRow = {
  id: string
  company_id: string
  code: string
  name: string
  description: string | null
  category: string
  valid_for_days: number | null
  issuing_authority: string | null
  required_fields: RequiredFieldsJson
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

type ProductReqRow = {
  id: string
  product_id: string | null
  category_id: string | null
  doc_type_id: string
  is_mandatory: boolean
  applies_to_scope: string
  frequency: string
  notes: string | null
  sort_order: number
  doc_type: { name: string; code: string } | null
  category: { name: string } | null
}

type ShipmentReqRow = {
  id: string
  product_id: string | null
  category_id: string | null
  doc_type_id: string
  is_mandatory: boolean
  applies_when: string
  notes: string | null
  sort_order: number
  doc_type: { name: string; code: string } | null
  category: { name: string } | null
}

type Category = { id: string; name: string }

// ---------- Constants ----------

const DOC_CATEGORIES: Record<string, { label: string; color: string }> = {
  quality: { label: 'Calidad', color: 'bg-blue-100 text-blue-800' },
  transport: { label: 'Transporte', color: 'bg-yellow-100 text-yellow-800' },
  compliance: { label: 'Cumplimiento', color: 'bg-purple-100 text-purple-800' },
  origin: { label: 'Origen', color: 'bg-green-100 text-green-800' },
  safety: { label: 'Seguridad', color: 'bg-red-100 text-red-800' },
  commercial: { label: 'Comercial', color: 'bg-gray-100 text-gray-800' },
}

const SCOPE_LABELS: Record<string, string> = {
  per_batch: 'Por batch',
  per_lot: 'Por lote',
  per_product: 'Por producto',
  per_facility: 'Por instalación',
}

const FREQUENCY_LABELS: Record<string, string> = {
  once: 'Una vez',
  per_production: 'Cada producción',
  annual: 'Anual',
  per_shipment: 'Cada envío',
}

const APPLIES_WHEN_LABELS: Record<string, string> = {
  always: 'Siempre',
  interstate: 'Interestatal',
  international: 'Internacional',
  regulated_material: 'Material regulado',
}

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: 'Texto',
  textarea: 'Texto largo',
  date: 'Fecha',
  number: 'Numérico',
  boolean: 'Sí/No',
  select: 'Selección',
}

// ---------- Main Component ----------

export function RegulatoryConfigClient({
  docTypes: initialDocTypes,
  productRequirements: initialProductReqs,
  shipmentRequirements: initialShipmentReqs,
  categories,
  canWrite,
  regulatoryEnabled,
}: {
  docTypes: DocTypeRow[]
  productRequirements: ProductReqRow[]
  shipmentRequirements: ShipmentReqRow[]
  categories: Category[]
  canWrite: boolean
  regulatoryEnabled: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'doc-types'

  const effectiveCanWrite = canWrite && regulatoryEnabled

  function setActiveTab(tab: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.push(`?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="space-y-6">
      {!regulatoryEnabled && (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">El módulo regulatorio está deshabilitado.</p>
            <p>
              Actívalo en{' '}
              <a href="/settings/company" className="inline-flex items-center gap-1 font-medium underline">
                Configuración de Empresa
                <LinkIcon className="h-3 w-3" />
              </a>
            </p>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="doc-types">Tipos de Documento</TabsTrigger>
          <TabsTrigger value="product-reqs">Requisitos por Producto</TabsTrigger>
          <TabsTrigger value="shipment-reqs">Requisitos de Envío</TabsTrigger>
        </TabsList>

        <TabsContent value="doc-types" className="mt-6">
          <DocTypesTab
            docTypes={initialDocTypes}
            productReqs={initialProductReqs}
            shipmentReqs={initialShipmentReqs}
            canWrite={effectiveCanWrite}
          />
        </TabsContent>

        <TabsContent value="product-reqs" className="mt-6">
          <ProductReqsTab
            requirements={initialProductReqs}
            docTypes={initialDocTypes}
            categories={categories}
            canWrite={effectiveCanWrite}
          />
        </TabsContent>

        <TabsContent value="shipment-reqs" className="mt-6">
          <ShipmentReqsTab
            requirements={initialShipmentReqs}
            docTypes={initialDocTypes}
            categories={categories}
            canWrite={effectiveCanWrite}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ====================================================================
// TAB 1: DOC TYPES
// ====================================================================

function DocTypesTab({
  docTypes,
  productReqs,
  shipmentReqs,
  canWrite,
}: {
  docTypes: DocTypeRow[]
  productReqs: ProductReqRow[]
  shipmentReqs: ShipmentReqRow[]
  canWrite: boolean
}) {
  const router = useRouter()
  const supabase = createClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDocType, setEditingDocType] = useState<DocTypeRow | null>(null)
  const [previewDocType, setPreviewDocType] = useState<DocTypeRow | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<DocTypeRow | null>(null)
  const [saving, setSaving] = useState(false)

  function getRefCount(dtId: string) {
    return (
      productReqs.filter((r) => r.doc_type_id === dtId).length +
      shipmentReqs.filter((r) => r.doc_type_id === dtId).length
    )
  }

  function openCreate() {
    setEditingDocType(null)
    setDialogOpen(true)
  }

  function openEdit(dt: DocTypeRow) {
    setEditingDocType(dt)
    setDialogOpen(true)
  }

  async function handleDuplicate(dt: DocTypeRow) {
    const { error } = await supabase.from('regulatory_doc_types').insert({
      code: dt.code + '_COPY',
      name: dt.name + ' (copia)',
      description: dt.description,
      category: dt.category as RegulatoryDocTypeInput['category'],
      valid_for_days: dt.valid_for_days,
      issuing_authority: dt.issuing_authority,
      required_fields: dt.required_fields as unknown as Json,
      sort_order: dt.sort_order,
    })
    if (error) {
      toast.error(error.message.includes('idx_rdt_code_company') ? 'Ya existe un tipo con ese código' : error.message)
    } else {
      toast.success('Tipo duplicado')
      router.refresh()
    }
  }

  async function handleToggleActive() {
    if (!deactivateTarget) return
    setSaving(true)
    const { error } = await supabase
      .from('regulatory_doc_types')
      .update({ is_active: !deactivateTarget.is_active })
      .eq('id', deactivateTarget.id)
    setSaving(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success(deactivateTarget.is_active ? 'Tipo desactivado' : 'Tipo reactivado')
      setDeactivateTarget(null)
      router.refresh()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {docTypes.length} tipo{docTypes.length !== 1 ? 's' : ''} de documento
        </p>
        {canWrite && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" /> Nuevo tipo de documento
          </Button>
        )}
      </div>

      {docTypes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No hay tipos de documento configurados.
            {canWrite && ' Crea el primero para empezar.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {docTypes.map((dt) => {
            const cat = DOC_CATEGORIES[dt.category]
            const refCount = getRefCount(dt.id)
            return (
              <Card key={dt.id} className={!dt.is_active ? 'opacity-60' : undefined}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{dt.name}</CardTitle>
                        <Badge variant="outline" className="font-mono text-xs">
                          {dt.code}
                        </Badge>
                        {cat && (
                          <Badge variant="secondary" className={cat.color}>
                            {cat.label}
                          </Badge>
                        )}
                        {!dt.is_active && <Badge variant="secondary">Inactivo</Badge>}
                      </div>
                      {dt.description && (
                        <p className="text-sm text-muted-foreground">{dt.description}</p>
                      )}
                    </div>
                    {canWrite && (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setPreviewDocType(dt)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(dt)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDuplicate(dt)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeactivateTarget(dt)}>
                          <Power className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {!canWrite && (
                      <Button variant="ghost" size="icon" onClick={() => setPreviewDocType(dt)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>
                      Vigencia: {dt.valid_for_days ? `${dt.valid_for_days} días` : 'No vence'}
                    </span>
                    {dt.issuing_authority && <span>Autoridad: {dt.issuing_authority}</span>}
                    <span>Campos: {dt.required_fields.fields.length}</span>
                    {refCount > 0 && (
                      <span>
                        Usado en {refCount} requisito{refCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      {dialogOpen && (
        <DocTypeDialog
          docType={editingDocType}
          onClose={() => setDialogOpen(false)}
        />
      )}

      {/* Preview Dialog */}
      {previewDocType && (
        <FormPreviewDialog
          docType={previewDocType}
          onClose={() => setPreviewDocType(null)}
        />
      )}

      {/* Deactivate Confirm */}
      <AlertDialog
        open={!!deactivateTarget}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deactivateTarget?.is_active ? 'Desactivar' : 'Reactivar'} tipo de documento
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deactivateTarget?.is_active ? (
                <>
                  Se desactivará &quot;{deactivateTarget?.name}&quot;.
                  {getRefCount(deactivateTarget?.id ?? '') > 0 && (
                    <>
                      {' '}
                      Este tipo está referenciado por{' '}
                      {getRefCount(deactivateTarget?.id ?? '')} requisito(s).
                    </>
                  )}
                </>
              ) : (
                <>Se reactivará &quot;{deactivateTarget?.name}&quot;.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleActive} disabled={saving}>
              {deactivateTarget?.is_active ? 'Desactivar' : 'Reactivar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ====================================================================
// DOC TYPE DIALOG (Create / Edit with Form Builder)
// ====================================================================

function DocTypeDialog({
  docType,
  onClose,
}: {
  docType: DocTypeRow | null
  onClose: () => void
}) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)

  const form = useForm<RegulatoryDocTypeInput>({
    resolver: zodResolver(regulatoryDocTypeSchema),
    defaultValues: {
      code: docType?.code ?? '',
      name: docType?.name ?? '',
      description: docType?.description ?? '',
      category: (docType?.category as RegulatoryDocTypeInput['category']) ?? 'quality',
      valid_for_days: docType?.valid_for_days ?? null,
      issuing_authority: docType?.issuing_authority ?? '',
      sort_order: docType?.sort_order ?? 0,
      required_fields: docType?.required_fields ?? { fields: [] },
    },
  })

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'required_fields.fields',
  })

  async function onSubmit(values: RegulatoryDocTypeInput) {
    setSaving(true)
    const payload = {
      code: values.code,
      name: values.name,
      description: values.description || null,
      category: values.category,
      valid_for_days: values.valid_for_days,
      issuing_authority: values.issuing_authority || null,
      sort_order: values.sort_order,
      required_fields: values.required_fields as unknown as Json,
    }

    const { error } = docType
      ? await supabase
          .from('regulatory_doc_types')
          .update(payload)
          .eq('id', docType.id)
      : await supabase.from('regulatory_doc_types').insert(payload)

    setSaving(false)
    if (error) {
      if (error.message.includes('idx_rdt_code_company')) {
        form.setError('code', { message: 'Ya existe un tipo con este código' })
      } else {
        toast.error(error.message)
      }
      return
    }
    toast.success(docType ? 'Tipo actualizado' : 'Tipo creado')
    onClose()
    router.refresh()
  }

  function addField() {
    append({
      key: '',
      label: '',
      type: 'text',
      required: false,
      options: undefined,
      placeholder: undefined,
      help_text: undefined,
    })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {docType ? 'Editar tipo de documento' : 'Nuevo tipo de documento'}
          </DialogTitle>
          <DialogDescription>
            Define los campos del formulario que los operarios completarán al capturar este documento.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* General fields */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input placeholder="COA" {...field} />
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
                      <Input placeholder="Certificado de Análisis" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <textarea
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Para qué sirve y cuándo se requiere"
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
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={field.value}
                        onChange={field.onChange}
                      >
                        {Object.entries(DOC_CATEGORIES).map(([value, { label }]) => (
                          <option key={value} value={value}>
                            {label}
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
                name="valid_for_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vigencia (días)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="365 (vacío = no vence)"
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value === '' ? null : Number(e.target.value))
                        }
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
                name="issuing_authority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Autoridad emisora</FormLabel>
                    <FormControl>
                      <Input placeholder="ICA, INVIMA, Lab acreditado..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sort_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orden</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Form Builder Section */}
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Campos del formulario</h3>
                <Button type="button" variant="outline" size="sm" onClick={addField}>
                  <Plus className="mr-1 h-3 w-3" /> Agregar campo
                </Button>
              </div>

              {fields.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Sin campos configurados. Los operarios no tendrán que completar campos adicionales.
                </p>
              )}

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <FormBuilderField
                    key={field.id}
                    index={index}
                    form={form}
                    onRemove={() => remove(index)}
                    onMoveUp={() => index > 0 && move(index, index - 1)}
                    onMoveDown={() => index < fields.length - 1 && move(index, index + 1)}
                    isFirst={index === 0}
                    isLast={index === fields.length - 1}
                  />
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ====================================================================
// FORM BUILDER FIELD
// ====================================================================

function FormBuilderField({
  index,
  form,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  index: number
  form: ReturnType<typeof useForm<RegulatoryDocTypeInput>>
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  isFirst: boolean
  isLast: boolean
}) {
  const fieldType = form.watch(`required_fields.fields.${index}.type`)
  const options = form.watch(`required_fields.fields.${index}.options`) ?? []

  function addOption() {
    const current = form.getValues(`required_fields.fields.${index}.options`) ?? []
    form.setValue(`required_fields.fields.${index}.options`, [...current, ''])
  }

  function removeOption(optIdx: number) {
    const current = form.getValues(`required_fields.fields.${index}.options`) ?? []
    form.setValue(
      `required_fields.fields.${index}.options`,
      current.filter((_, i) => i !== optIdx)
    )
  }

  function updateOption(optIdx: number, value: string) {
    const current = form.getValues(`required_fields.fields.${index}.options`) ?? []
    const updated = [...current]
    updated[optIdx] = value
    form.setValue(`required_fields.fields.${index}.options`, updated)
  }

  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="flex items-start gap-2">
        <div className="flex flex-col gap-0.5 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={onMoveUp}
            disabled={isFirst}
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={onMoveDown}
            disabled={isLast}
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>

        <div className="flex-1 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <FormField
              control={form.control}
              name={`required_fields.fields.${index}.key`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Key</FormLabel>
                  <FormControl>
                    <Input className="h-8 text-xs" placeholder="lab_name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`required_fields.fields.${index}.label`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Etiqueta</FormLabel>
                  <FormControl>
                    <Input className="h-8 text-xs" placeholder="Nombre del lab" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`required_fields.fields.${index}.type`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Tipo</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={field.value}
                      onChange={(e) => {
                        field.onChange(e.target.value)
                        // Reset options when changing type
                        if (e.target.value !== 'select') {
                          form.setValue(`required_fields.fields.${index}.options`, undefined)
                        } else {
                          form.setValue(`required_fields.fields.${index}.options`, ['', ''])
                        }
                      }}
                    >
                      {Object.entries(FIELD_TYPE_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <FormField
              control={form.control}
              name={`required_fields.fields.${index}.placeholder`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Placeholder</FormLabel>
                  <FormControl>
                    <Input
                      className="h-8 text-xs"
                      placeholder="Texto de ayuda"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`required_fields.fields.${index}.help_text`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Texto de ayuda</FormLabel>
                  <FormControl>
                    <Input
                      className="h-8 text-xs"
                      placeholder="Descripción extra"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`required_fields.fields.${index}.required`}
              render={({ field }) => (
                <FormItem className="flex items-end gap-2 pb-1">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="text-xs">Requerido</FormLabel>
                </FormItem>
              )}
            />
          </div>

          {/* Options for select type */}
          {fieldType === 'select' && (
            <div className="space-y-1.5 rounded border bg-background p-2">
              <p className="text-xs font-medium text-muted-foreground">Opciones</p>
              {options.map((opt, optIdx) => (
                <div key={optIdx} className="flex items-center gap-1">
                  <Input
                    className="h-7 text-xs"
                    placeholder={`Opción ${optIdx + 1}`}
                    value={opt}
                    onChange={(e) => updateOption(optIdx, e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => removeOption(optIdx)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={addOption}>
                <Plus className="mr-1 h-3 w-3" /> Agregar opción
              </Button>
              {form.formState.errors.required_fields?.fields?.[index]?.options && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.required_fields.fields[index]?.options?.message}
                </p>
              )}
            </div>
          )}
        </div>

        <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ====================================================================
// FORM PREVIEW DIALOG
// ====================================================================

function FormPreviewDialog({
  docType,
  onClose,
}: {
  docType: DocTypeRow
  onClose: () => void
}) {
  const fields = docType.required_fields.fields

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Vista previa: {docType.name}</DialogTitle>
          <DialogDescription>
            Así se verá el formulario para el operario al capturar este documento.
          </DialogDescription>
        </DialogHeader>

        {fields.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Este tipo de documento no tiene campos configurados.
          </p>
        ) : (
          <div className="space-y-4">
            {fields.map((f) => (
              <div key={f.key} className="space-y-1">
                <label className="text-sm font-medium">
                  {f.label}
                  {f.required && <span className="ml-1 text-destructive">*</span>}
                </label>

                {f.type === 'text' && (
                  <Input disabled placeholder={f.placeholder ?? ''} />
                )}
                {f.type === 'textarea' && (
                  <textarea
                    disabled
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm"
                    placeholder={f.placeholder ?? ''}
                  />
                )}
                {f.type === 'date' && <Input disabled type="date" />}
                {f.type === 'number' && (
                  <Input disabled type="number" placeholder={f.placeholder ?? ''} />
                )}
                {f.type === 'boolean' && (
                  <div className="flex items-center gap-2">
                    <Checkbox disabled /> <span className="text-sm text-muted-foreground">Sí</span>
                  </div>
                )}
                {f.type === 'select' && (
                  <select
                    disabled
                    className="flex h-10 w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar...</option>
                    {(f.options ?? []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}

                {f.help_text && (
                  <p className="text-xs text-muted-foreground">{f.help_text}</p>
                )}
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ====================================================================
// TAB 2: PRODUCT REQUIREMENTS
// ====================================================================

function ProductReqsTab({
  requirements,
  docTypes,
  categories,
  canWrite,
}: {
  requirements: ProductReqRow[]
  docTypes: DocTypeRow[]
  categories: Category[]
  canWrite: boolean
}) {
  const router = useRouter()
  const supabase = createClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingReq, setEditingReq] = useState<ProductReqRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductReqRow | null>(null)
  const [saving, setSaving] = useState(false)

  const activeDocTypes = useMemo(() => docTypes.filter((dt) => dt.is_active), [docTypes])

  function openCreate() {
    setEditingReq(null)
    setDialogOpen(true)
  }

  function openEdit(req: ProductReqRow) {
    setEditingReq(req)
    setDialogOpen(true)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setSaving(true)
    const { error } = await supabase
      .from('product_regulatory_requirements')
      .delete()
      .eq('id', deleteTarget.id)
    setSaving(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Requisito eliminado')
      setDeleteTarget(null)
      router.refresh()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {requirements.length} requisito{requirements.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canWrite && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" /> Nuevo requisito
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
        <Info className="h-4 w-4 shrink-0" />
        <span>Los requisitos a nivel categoría se heredan a todos los productos de esa categoría.</span>
      </div>

      {requirements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No hay requisitos por producto configurados.
            {canWrite && ' Crea el primero para empezar.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {requirements.map((req) => (
            <Card key={req.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {req.category
                        ? `Categoría: ${req.category.name}`
                        : req.product_id
                          ? `Producto: ${req.product_id}`
                          : '—'}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {req.doc_type?.code ?? '?'} — {req.doc_type?.name ?? '?'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant={req.is_mandatory ? 'default' : 'secondary'} className="text-xs">
                      {req.is_mandatory ? 'Obligatorio' : 'Recomendado'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {SCOPE_LABELS[req.applies_to_scope] ?? req.applies_to_scope}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {FREQUENCY_LABELS[req.frequency] ?? req.frequency}
                    </Badge>
                    {req.notes && <span>{req.notes}</span>}
                  </div>
                </div>
                {canWrite && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(req)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(req)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      {dialogOpen && (
        <ProductReqDialog
          requirement={editingReq}
          docTypes={activeDocTypes}
          categories={categories}
          onClose={() => setDialogOpen(false)}
        />
      )}

      {/* Delete Confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar requisito</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará este requisito de forma permanente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={saving}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ====================================================================
// PRODUCT REQUIREMENT DIALOG
// ====================================================================

function ProductReqDialog({
  requirement,
  docTypes,
  categories,
  onClose,
}: {
  requirement: ProductReqRow | null
  docTypes: DocTypeRow[]
  categories: Category[]
  onClose: () => void
}) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [targetType, setTargetType] = useState<'category' | 'product'>(
    requirement?.category_id ? 'category' : requirement?.product_id ? 'product' : 'category'
  )

  const form = useForm<ProductRequirementInput>({
    resolver: zodResolver(productRequirementSchema),
    defaultValues: {
      product_id: requirement?.product_id ?? null,
      category_id: requirement?.category_id ?? null,
      doc_type_id: requirement?.doc_type_id ?? '',
      is_mandatory: requirement?.is_mandatory ?? true,
      applies_to_scope:
        (requirement?.applies_to_scope as ProductRequirementInput['applies_to_scope']) ?? 'per_batch',
      frequency: (requirement?.frequency as ProductRequirementInput['frequency']) ?? 'once',
      notes: requirement?.notes ?? '',
      sort_order: requirement?.sort_order ?? 0,
    },
  })

  function handleTargetTypeChange(type: 'category' | 'product') {
    setTargetType(type)
    if (type === 'category') {
      form.setValue('product_id', null)
    } else {
      form.setValue('category_id', null)
    }
  }

  async function onSubmit(values: ProductRequirementInput) {
    setSaving(true)
    const payload = {
      product_id: values.product_id,
      category_id: values.category_id,
      doc_type_id: values.doc_type_id,
      is_mandatory: values.is_mandatory,
      applies_to_scope: values.applies_to_scope,
      frequency: values.frequency,
      notes: values.notes || null,
      sort_order: values.sort_order,
    }

    const { error } = requirement
      ? await supabase
          .from('product_regulatory_requirements')
          .update(payload)
          .eq('id', requirement.id)
      : await supabase.from('product_regulatory_requirements').insert(payload)

    setSaving(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(requirement ? 'Requisito actualizado' : 'Requisito creado')
    onClose()
    router.refresh()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {requirement ? 'Editar requisito' : 'Nuevo requisito por producto'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Target type selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Nivel de aplicación</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="targetType"
                    checked={targetType === 'category'}
                    onChange={() => handleTargetTypeChange('category')}
                  />
                  Categoría de productos
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="targetType"
                    checked={targetType === 'product'}
                    onChange={() => handleTargetTypeChange('product')}
                  />
                  Producto específico
                </label>
              </div>
            </div>

            {targetType === 'category' ? (
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      >
                        <option value="">Seleccionar categoría...</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800">
                <p>Sin productos configurados — los productos se crean en Fase 3.</p>
                <p>Usa categorías de recursos para configurar requisitos por ahora.</p>
              </div>
            )}

            {form.formState.errors.product_id?.message && (
              <p className="text-sm text-destructive">{form.formState.errors.product_id.message}</p>
            )}

            <FormField
              control={form.control}
              name="doc_type_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de documento</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={field.value}
                      onChange={field.onChange}
                    >
                      <option value="">Seleccionar...</option>
                      {docTypes.map((dt) => (
                        <option key={dt.id} value={dt.id}>
                          {dt.code} — {dt.name}
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
              name="is_mandatory"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div>
                    <FormLabel>Obligatorio</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Si es false, el documento es recomendado pero no bloqueante
                    </p>
                  </div>
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
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={field.value}
                        onChange={field.onChange}
                      >
                        {Object.entries(SCOPE_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
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
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frecuencia</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={field.value}
                        onChange={field.onChange}
                      >
                        {Object.entries(FREQUENCY_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <textarea
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Requerido para exportación a EU..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sort_order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Orden</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ====================================================================
// TAB 3: SHIPMENT REQUIREMENTS
// ====================================================================

function ShipmentReqsTab({
  requirements,
  docTypes,
  categories,
  canWrite,
}: {
  requirements: ShipmentReqRow[]
  docTypes: DocTypeRow[]
  categories: Category[]
  canWrite: boolean
}) {
  const router = useRouter()
  const supabase = createClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingReq, setEditingReq] = useState<ShipmentReqRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ShipmentReqRow | null>(null)
  const [saving, setSaving] = useState(false)

  const activeDocTypes = useMemo(() => docTypes.filter((dt) => dt.is_active), [docTypes])

  function openCreate() {
    setEditingReq(null)
    setDialogOpen(true)
  }

  function openEdit(req: ShipmentReqRow) {
    setEditingReq(req)
    setDialogOpen(true)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setSaving(true)
    const { error } = await supabase
      .from('shipment_doc_requirements')
      .delete()
      .eq('id', deleteTarget.id)
    setSaving(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Requisito eliminado')
      setDeleteTarget(null)
      router.refresh()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {requirements.length} requisito{requirements.length !== 1 ? 's' : ''} de envío
        </p>
        {canWrite && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" /> Nuevo requisito
          </Button>
        )}
      </div>

      {requirements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No hay requisitos de envío configurados.
            {canWrite && ' Crea el primero para empezar.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {requirements.map((req) => (
            <Card key={req.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {req.category
                        ? `Categoría: ${req.category.name}`
                        : req.product_id
                          ? `Producto: ${req.product_id}`
                          : '—'}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {req.doc_type?.code ?? '?'} — {req.doc_type?.name ?? '?'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant={req.is_mandatory ? 'default' : 'secondary'} className="text-xs">
                      {req.is_mandatory ? 'Obligatorio' : 'Recomendado'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {APPLIES_WHEN_LABELS[req.applies_when] ?? req.applies_when}
                    </Badge>
                    {req.notes && <span>{req.notes}</span>}
                  </div>
                </div>
                {canWrite && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(req)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(req)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      {dialogOpen && (
        <ShipmentReqDialog
          requirement={editingReq}
          docTypes={activeDocTypes}
          categories={categories}
          onClose={() => setDialogOpen(false)}
        />
      )}

      {/* Delete Confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar requisito de envío</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará este requisito de forma permanente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={saving}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ====================================================================
// SHIPMENT REQUIREMENT DIALOG
// ====================================================================

function ShipmentReqDialog({
  requirement,
  docTypes,
  categories,
  onClose,
}: {
  requirement: ShipmentReqRow | null
  docTypes: DocTypeRow[]
  categories: Category[]
  onClose: () => void
}) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [targetType, setTargetType] = useState<'category' | 'product'>(
    requirement?.category_id ? 'category' : requirement?.product_id ? 'product' : 'category'
  )

  const form = useForm<ShipmentRequirementInput>({
    resolver: zodResolver(shipmentRequirementSchema),
    defaultValues: {
      product_id: requirement?.product_id ?? null,
      category_id: requirement?.category_id ?? null,
      doc_type_id: requirement?.doc_type_id ?? '',
      is_mandatory: requirement?.is_mandatory ?? true,
      applies_when:
        (requirement?.applies_when as ShipmentRequirementInput['applies_when']) ?? 'always',
      notes: requirement?.notes ?? '',
      sort_order: requirement?.sort_order ?? 0,
    },
  })

  function handleTargetTypeChange(type: 'category' | 'product') {
    setTargetType(type)
    if (type === 'category') {
      form.setValue('product_id', null)
    } else {
      form.setValue('category_id', null)
    }
  }

  async function onSubmit(values: ShipmentRequirementInput) {
    setSaving(true)
    const payload = {
      product_id: values.product_id,
      category_id: values.category_id,
      doc_type_id: values.doc_type_id,
      is_mandatory: values.is_mandatory,
      applies_when: values.applies_when,
      notes: values.notes || null,
      sort_order: values.sort_order,
    }

    const { error } = requirement
      ? await supabase
          .from('shipment_doc_requirements')
          .update(payload)
          .eq('id', requirement.id)
      : await supabase.from('shipment_doc_requirements').insert(payload)

    setSaving(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(requirement ? 'Requisito actualizado' : 'Requisito creado')
    onClose()
    router.refresh()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {requirement ? 'Editar requisito de envío' : 'Nuevo requisito de envío'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Target type selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Nivel de aplicación</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="shipTargetType"
                    checked={targetType === 'category'}
                    onChange={() => handleTargetTypeChange('category')}
                  />
                  Categoría de productos
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="shipTargetType"
                    checked={targetType === 'product'}
                    onChange={() => handleTargetTypeChange('product')}
                  />
                  Producto específico
                </label>
              </div>
            </div>

            {targetType === 'category' ? (
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      >
                        <option value="">Seleccionar categoría...</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800">
                <p>Sin productos configurados — los productos se crean en Fase 3.</p>
                <p>Usa categorías de recursos para configurar requisitos por ahora.</p>
              </div>
            )}

            {form.formState.errors.product_id?.message && (
              <p className="text-sm text-destructive">{form.formState.errors.product_id.message}</p>
            )}

            <FormField
              control={form.control}
              name="doc_type_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de documento</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={field.value}
                      onChange={field.onChange}
                    >
                      <option value="">Seleccionar...</option>
                      {docTypes.map((dt) => (
                        <option key={dt.id} value={dt.id}>
                          {dt.code} — {dt.name}
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
              name="is_mandatory"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div>
                    <FormLabel>Obligatorio</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Si es false, el documento es recomendado pero no bloqueante
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="applies_when"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aplica cuando</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={field.value}
                      onChange={field.onChange}
                    >
                      {Object.entries(APPLIES_WHEN_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <textarea
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Requerido por ICA para movilización..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sort_order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Orden</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
