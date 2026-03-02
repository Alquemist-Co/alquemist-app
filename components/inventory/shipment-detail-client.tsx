'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Json } from '@/types/database'
import {
  CheckCircle2, Circle, Upload, AlertTriangle, FileText,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  statusLabels,
  statusBadgeStyles,
  directionLabels,
  directionBadgeStyles,
  selectClass,
} from './shipments-shared'

// ---------- Types ----------

type ShipmentDetail = {
  id: string
  company_id: string
  shipment_code: string
  type: string
  status: string
  supplier_name: string | null
  origin_name: string | null
  origin_address: string | null
  facility_name: string
  carrier_name: string | null
  carrier_vehicle: string | null
  carrier_driver: string | null
  carrier_contact: string | null
  dispatch_date: string | null
  estimated_arrival_date: string | null
  actual_arrival_date: string | null
  transport_conditions: Record<string, unknown> | null
  purchase_order_ref: string | null
  received_by_name: string | null
  notes: string | null
}

type ShipmentItemDetail = {
  id: string
  product_name: string
  product_sku: string
  expected_quantity: number
  received_quantity: number | null
  rejected_quantity: number | null
  unit_code: string
  supplier_lot_number: string | null
  cost_per_unit: number | null
  zone_name: string | null
  inspection_result: string | null
  inspection_notes: string | null
  inventory_item_id: string | null
}

type DocRequirement = {
  id: string
  doc_type_id: string
  doc_type_name: string
  is_mandatory: boolean
  applies_when: string
  product_name: string | null
}

type RegDoc = {
  id: string
  doc_type_id: string
  document_number: string | null
  issue_date: string
  file_path: string | null
}

type DocTypeOption = {
  id: string
  name: string
  required_fields: { fields: Array<{ key: string; label: string; type: string; required?: boolean; options?: string[]; placeholder?: string }> }
  valid_for_days: number | null
}

const inspectionResultLabels: Record<string, string> = {
  accepted: 'Aceptado',
  accepted_with_observations: 'Aceptado c/obs.',
  rejected: 'Rechazado',
  quarantine: 'Cuarentena',
}

const inspectionResultStyles: Record<string, string> = {
  accepted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  accepted_with_observations: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  quarantine: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
}

// ---------- Component ----------

export function ShipmentDetailClient({
  shipment,
  items: initialItems,
  docRequirements,
  uploadedDocs: initialDocs,
  docTypes,
  regulatoryMode,
  userId,
}: {
  shipment: ShipmentDetail
  items: ShipmentItemDetail[]
  docRequirements: DocRequirement[]
  uploadedDocs: RegDoc[]
  docTypes: DocTypeOption[]
  regulatoryMode: string
  userId: string
}) {
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [uploadedDocs, setUploadedDocs] = useState(initialDocs)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [docDialogOpen, setDocDialogOpen] = useState(false)
  const [docTypeForUpload, setDocTypeForUpload] = useState<string | null>(null)

  const isInspectable = shipment.status === 'received' || shipment.status === 'inspecting'
  const isConfirmed = ['accepted', 'partial_accepted', 'rejected'].includes(shipment.status)

  // Inspection state (local edits)
  const [editedItems, setEditedItems] = useState<Record<string, {
    received_quantity: number
    rejected_quantity: number
    inspection_result: string
    inspection_notes: string
  }>>({})

  function getItemValue(item: ShipmentItemDetail, field: string) {
    const edited = editedItems[item.id]
    if (edited) return edited[field as keyof typeof edited]
    if (field === 'received_quantity') return item.received_quantity ?? item.expected_quantity
    if (field === 'rejected_quantity') return item.rejected_quantity ?? 0
    if (field === 'inspection_result') return item.inspection_result ?? ''
    if (field === 'inspection_notes') return item.inspection_notes ?? ''
    return ''
  }

  function updateItemField(itemId: string, field: string, value: unknown) {
    setEditedItems((prev) => ({
      ...prev,
      [itemId]: {
        received_quantity: prev[itemId]?.received_quantity ?? (items.find((i) => i.id === itemId)?.received_quantity ?? items.find((i) => i.id === itemId)?.expected_quantity ?? 0),
        rejected_quantity: prev[itemId]?.rejected_quantity ?? (items.find((i) => i.id === itemId)?.rejected_quantity ?? 0),
        inspection_result: prev[itemId]?.inspection_result ?? (items.find((i) => i.id === itemId)?.inspection_result ?? ''),
        inspection_notes: prev[itemId]?.inspection_notes ?? (items.find((i) => i.id === itemId)?.inspection_notes ?? ''),
        [field]: value,
      },
    }))
  }

  // Auto-transition to inspecting
  async function ensureInspecting() {
    if (shipment.status !== 'received') return
    const supabase = createClient()
    await supabase
      .from('shipments')
      .update({ status: 'inspecting' as const, inspected_by: userId, inspected_at: new Date().toISOString() })
      .eq('id', shipment.id)
  }

  async function saveAllInspections() {
    setSaving(true)
    const supabase = createClient()

    await ensureInspecting()

    for (const [itemId, values] of Object.entries(editedItems)) {
      if (!values.inspection_result) continue
      const { error } = await supabase
        .from('shipment_items')
        .update({
          received_quantity: values.inspection_result === 'rejected' ? 0 : values.received_quantity,
          rejected_quantity: values.inspection_result === 'rejected' ? (items.find((i) => i.id === itemId)?.expected_quantity ?? 0) : values.rejected_quantity,
          inspection_result: values.inspection_result as 'accepted',
          inspection_notes: values.inspection_notes || null,
        })
        .eq('id', itemId)
      if (error) {
        toast.error(`Error al guardar inspección de línea.`)
        setSaving(false)
        return
      }
    }
    toast.success('Inspecciones guardadas.')
    setEditedItems({})
    setSaving(false)
    router.refresh()
  }

  // Document upload
  const [docUploading, setDocUploading] = useState(false)
  const [docNumber, setDocNumber] = useState('')
  const [docIssueDate, setDocIssueDate] = useState(new Date().toISOString().slice(0, 10))
  const [docFile, setDocFile] = useState<File | null>(null)
  const [docFieldData, setDocFieldData] = useState<Record<string, unknown>>({})

  function openDocUpload(docTypeId: string) {
    setDocTypeForUpload(docTypeId)
    setDocNumber('')
    setDocIssueDate(new Date().toISOString().slice(0, 10))
    setDocFile(null)
    setDocFieldData({})
    setDocDialogOpen(true)
  }

  async function handleDocUpload() {
    if (!docTypeForUpload || !docIssueDate) return
    setDocUploading(true)
    const supabase = createClient()

    // Upload file if present
    let filePath: string | null = null
    if (docFile) {
      const ext = docFile.name.split('.').pop()
      const path = `${shipment.company_id}/${shipment.id}/${crypto.randomUUID()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('shipment-documents')
        .upload(path, docFile)
      if (uploadErr) {
        toast.error('Error al subir archivo.')
        setDocUploading(false)
        return
      }
      filePath = path
    }

    // Calculate expiry
    const docType = docTypes.find((dt) => dt.id === docTypeForUpload)
    let expiryDate: string | null = null
    if (docType?.valid_for_days && docIssueDate) {
      const d = new Date(docIssueDate)
      d.setDate(d.getDate() + docType.valid_for_days)
      expiryDate = d.toISOString().slice(0, 10)
    }

    const { data: newDoc, error } = await supabase
      .from('regulatory_documents')
      .insert({
        doc_type_id: docTypeForUpload,
        shipment_id: shipment.id,
        document_number: docNumber || null,
        issue_date: docIssueDate,
        expiry_date: expiryDate,
        field_data: docFieldData as Json,
        file_path: filePath,
        status: 'valid',
      })
      .select('id, doc_type_id, document_number, issue_date, file_path')
      .single()

    if (error) {
      toast.error('Error al registrar documento.')
    } else {
      toast.success('Documento registrado.')
      setUploadedDocs((prev) => [...prev, newDoc])
      setDocDialogOpen(false)
    }
    setDocUploading(false)
  }

  // Confirm receipt
  async function handleConfirmReceipt() {
    setConfirming(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/confirm-shipment-receipt`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ shipment_id: shipment.id }),
      },
    )

    const result = await response.json()
    if (!response.ok) {
      toast.error(result.error || 'Error al confirmar recepción.')
    } else {
      toast.success(`Recepción confirmada. ${result.items_created} lotes creados. Estado: ${statusLabels[result.status] ?? result.status}`)
    }
    setConfirming(false)
    setConfirmDialogOpen(false)
    router.refresh()
  }

  // Stepper state
  const allInspected = items.every((i) => i.inspection_result || editedItems[i.id]?.inspection_result)
  const mandatoryDocIds = docRequirements.filter((r) => r.is_mandatory).map((r) => r.doc_type_id)
  const allMandatoryDocsLoaded = mandatoryDocIds.every((dtId) =>
    uploadedDocs.some((d) => d.doc_type_id === dtId),
  )

  const steps = [
    { label: 'Recibido', done: ['received', 'inspecting', 'accepted', 'partial_accepted', 'rejected'].includes(shipment.status) },
    { label: 'Inspeccionado', done: allInspected && shipment.status !== 'received' },
    { label: 'Documentos', done: allMandatoryDocsLoaded || regulatoryMode === 'none' },
    { label: 'Confirmado', done: isConfirmed },
  ]

  // Summary counts
  const totalExpected = items.reduce((s, i) => s + i.expected_quantity, 0)
  const totalReceived = items.reduce((s, i) => s + (Number(getItemValue(i, 'received_quantity')) || 0), 0)
  const totalRejected = items.reduce((s, i) => s + (Number(getItemValue(i, 'rejected_quantity')) || 0), 0)
  const inspectedCount = items.filter((i) => i.inspection_result || editedItems[i.id]?.inspection_result).length
  const pendingInspection = items.length - inspectedCount
  const missingMandatoryDocs = mandatoryDocIds.filter((dtId) => !uploadedDocs.some((d) => d.doc_type_id === dtId)).length

  const canConfirm = allInspected && (regulatoryMode !== 'strict' || allMandatoryDocsLoaded)

  const formatDate = (d: string | null) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const currentDocType = docTypes.find((dt) => dt.id === docTypeForUpload)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold tracking-tight">{shipment.shipment_code}</h2>
        <Badge variant="secondary" className={`text-xs ${directionBadgeStyles[shipment.type] ?? ''}`}>
          {directionLabels[shipment.type]}
        </Badge>
        <Badge variant="secondary" className={`text-xs ${statusBadgeStyles[shipment.status] ?? ''}`}>
          {statusLabels[shipment.status]}
        </Badge>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {steps.map((step, idx) => (
          <div key={step.label} className="flex items-center gap-1.5">
            {step.done
              ? <CheckCircle2 className="h-5 w-5 text-green-600" />
              : <Circle className="h-5 w-5 text-muted-foreground" />}
            <span className={`text-sm ${step.done ? 'font-medium' : 'text-muted-foreground'}`}>{step.label}</span>
            {idx < steps.length - 1 && <div className="h-px w-8 bg-border" />}
          </div>
        ))}
      </div>

      {/* Section 1: Shipment Info */}
      <Card>
        <CardHeader><CardTitle className="text-base">Información del envío</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div><span className="text-muted-foreground">Proveedor:</span> <span className="font-medium">{shipment.supplier_name ?? '—'}</span></div>
            <div><span className="text-muted-foreground">Origen:</span> <span className="font-medium">{shipment.origin_name ?? '—'}</span></div>
            <div><span className="text-muted-foreground">Destino:</span> <span className="font-medium">{shipment.facility_name}</span></div>
            <div><span className="text-muted-foreground">Transportista:</span> <span className="font-medium">{shipment.carrier_name ?? '—'}</span></div>
            <div><span className="text-muted-foreground">Vehículo:</span> <span className="font-medium">{shipment.carrier_vehicle ?? '—'}</span></div>
            <div><span className="text-muted-foreground">Conductor:</span> <span className="font-medium">{shipment.carrier_driver ?? '—'}</span></div>
            <div><span className="text-muted-foreground">Despacho:</span> <span className="font-medium">{formatDate(shipment.dispatch_date)}</span></div>
            <div><span className="text-muted-foreground">Llegada est.:</span> <span className="font-medium">{formatDate(shipment.estimated_arrival_date)}</span></div>
            <div><span className="text-muted-foreground">Llegada real:</span> <span className="font-medium">{formatDate(shipment.actual_arrival_date)}</span></div>
            <div><span className="text-muted-foreground">Recibido por:</span> <span className="font-medium">{shipment.received_by_name ?? '—'}</span></div>
            <div><span className="text-muted-foreground">Ref. PO:</span> <span className="font-medium">{shipment.purchase_order_ref ?? '—'}</span></div>
            {shipment.notes && (
              <div className="col-span-full"><span className="text-muted-foreground">Notas:</span> <span>{shipment.notes}</span></div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Inspection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Líneas e inspección</CardTitle>
            {isInspectable && Object.keys(editedItems).length > 0 && (
              <Button size="sm" onClick={saveAllInspections} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar inspecciones'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">#</TableHead>
                  <TableHead className="text-xs">Producto</TableHead>
                  <TableHead className="text-xs text-right">Esperado</TableHead>
                  <TableHead className="text-xs text-right">Recibido</TableHead>
                  <TableHead className="text-xs text-right">Rechazado</TableHead>
                  <TableHead className="text-xs">Unidad</TableHead>
                  <TableHead className="text-xs">Lote prov.</TableHead>
                  <TableHead className="text-xs">Zona</TableHead>
                  <TableHead className="text-xs">Resultado</TableHead>
                  <TableHead className="text-xs">Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => {
                  const result = getItemValue(item, 'inspection_result') as string
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{item.product_name}</div>
                        <div className="text-muted-foreground">{item.product_sku}</div>
                      </TableCell>
                      <TableCell className="text-xs text-right">{item.expected_quantity}</TableCell>
                      <TableCell className="text-xs text-right">
                        {isInspectable ? (
                          <Input
                            type="number" min="0" step="0.01" className="h-7 w-20 text-xs text-right"
                            value={getItemValue(item, 'received_quantity')}
                            onChange={(e) => {
                              ensureInspecting()
                              updateItemField(item.id, 'received_quantity', e.target.value ? parseFloat(e.target.value) : 0)
                            }}
                          />
                        ) : (
                          item.received_quantity ?? '—'
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        {isInspectable ? (
                          <Input
                            type="number" min="0" step="0.01" className="h-7 w-20 text-xs text-right"
                            value={getItemValue(item, 'rejected_quantity')}
                            onChange={(e) => {
                              ensureInspecting()
                              updateItemField(item.id, 'rejected_quantity', e.target.value ? parseFloat(e.target.value) : 0)
                            }}
                          />
                        ) : (
                          item.rejected_quantity ?? '—'
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{item.unit_code}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{item.supplier_lot_number ?? '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{item.zone_name ?? '—'}</TableCell>
                      <TableCell className="text-xs">
                        {isInspectable ? (
                          <select
                            value={result}
                            onChange={(e) => {
                              ensureInspecting()
                              updateItemField(item.id, 'inspection_result', e.target.value)
                            }}
                            className={selectClass + ' text-xs h-7'}
                          >
                            <option value="">— Pendiente —</option>
                            {Object.entries(inspectionResultLabels).map(([val, label]) => (
                              <option key={val} value={val}>{label}</option>
                            ))}
                          </select>
                        ) : result ? (
                          <Badge variant="secondary" className={`text-xs ${inspectionResultStyles[result] ?? ''}`}>
                            {inspectionResultLabels[result] ?? result}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">Pendiente</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {isInspectable ? (
                          <Textarea
                            rows={1} className="text-xs min-w-[120px]"
                            placeholder="Observaciones..."
                            value={getItemValue(item, 'inspection_notes') as string}
                            onChange={(e) => updateItemField(item.id, 'inspection_notes', e.target.value)}
                          />
                        ) : (
                          <span className="text-muted-foreground">{item.inspection_notes || '—'}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Summary */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm border-t pt-3">
            <div>Total esperado: <strong>{totalExpected}</strong></div>
            <div>Total recibido: <strong>{totalReceived}</strong></div>
            <div>Total rechazado: <strong>{totalRejected}</strong></div>
            <div>Inspeccionadas: <strong>{inspectedCount}/{items.length}</strong></div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Documents */}
      {regulatoryMode !== 'none' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Documentos requeridos</CardTitle></CardHeader>
          <CardContent>
            {docRequirements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay documentos requeridos para este envío.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Tipo de documento</TableHead>
                    <TableHead className="text-xs">Producto/Categoría</TableHead>
                    <TableHead className="text-xs">Obligatorio</TableHead>
                    <TableHead className="text-xs">Aplica</TableHead>
                    <TableHead className="text-xs">Estado</TableHead>
                    <TableHead className="text-xs w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {docRequirements.map((req) => {
                    const isLoaded = uploadedDocs.some((d) => d.doc_type_id === req.doc_type_id)
                    return (
                      <TableRow key={req.id}>
                        <TableCell className="text-xs font-medium">{req.doc_type_name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{req.product_name ?? 'General'}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant={req.is_mandatory ? 'destructive' : 'secondary'} className="text-xs">
                            {req.is_mandatory ? 'Obligatorio' : 'Opcional'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{req.applies_when}</TableCell>
                        <TableCell className="text-xs">
                          {isLoaded ? (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Cargado
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700">
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              Pendiente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {!isLoaded && !isConfirmed && (
                            <Button size="sm" variant="outline" onClick={() => openDocUpload(req.doc_type_id)}>
                              <Upload className="h-3 w-3 mr-1" />
                              Cargar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}

            {/* Compliance status */}
            <div className="mt-3">
              {allMandatoryDocsLoaded ? (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                  Documentos completos
                </Badge>
              ) : (
                <Badge variant="secondary" className={`text-xs ${regulatoryMode === 'strict' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  <AlertTriangle className="mr-1 h-3.5 w-3.5" />
                  Documentos faltantes obligatorios: {missingMandatoryDocs}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 4: Confirm Receipt */}
      {isInspectable && (
        <Card>
          <CardHeader><CardTitle className="text-base">Confirmar recepción</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>Líneas inspeccionadas: <strong>{inspectedCount}/{items.length}</strong></div>
              {regulatoryMode !== 'none' && (
                <div>Docs obligatorios: <strong>{mandatoryDocIds.length - missingMandatoryDocs}/{mandatoryDocIds.length}</strong></div>
              )}
            </div>

            {pendingInspection > 0 && (
              <div className="flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 rounded-md p-2">
                <AlertTriangle className="h-4 w-4" />
                Hay {pendingInspection} líneas sin inspeccionar.
              </div>
            )}

            {regulatoryMode !== 'none' && missingMandatoryDocs > 0 && (
              <div className={`flex items-center gap-2 text-sm rounded-md p-2 ${regulatoryMode === 'strict' ? 'text-red-700 bg-red-50' : 'text-yellow-700 bg-yellow-50'}`}>
                <AlertTriangle className="h-4 w-4" />
                Faltan {missingMandatoryDocs} documentos obligatorios.
                {regulatoryMode === 'strict' && ' La confirmación está bloqueada.'}
              </div>
            )}

            <Button
              onClick={() => setConfirmDialogOpen(true)}
              disabled={!canConfirm || confirming}
            >
              <FileText className="mr-2 h-4 w-4" />
              {confirming ? 'Confirmando...' : 'Confirmar recepción'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Confirm Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar recepción del envío {shipment.shipment_code}</AlertDialogTitle>
            <AlertDialogDescription>
              Esto creará {items.filter((i) => {
                const r = (getItemValue(i, 'inspection_result') as string)
                return r && r !== 'rejected'
              }).length} lotes de inventario. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirming}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReceipt} disabled={confirming}>
              {confirming ? 'Confirmando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Document Upload Dialog */}
      <Dialog open={docDialogOpen} onOpenChange={(o) => { if (!docUploading) setDocDialogOpen(o) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cargar documento</DialogTitle>
            <DialogDescription>
              {currentDocType?.name ?? 'Documento regulatorio'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Número de documento (opt)</label>
              <Input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} placeholder="DOC-001" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Fecha de emisión</label>
              <Input type="date" value={docIssueDate} onChange={(e) => setDocIssueDate(e.target.value)} />
            </div>

            {/* Dynamic fields from doc type */}
            {currentDocType?.required_fields?.fields?.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <label className="text-sm font-medium">{field.label} {field.required && <span className="text-destructive">*</span>}</label>
                {field.type === 'textarea' ? (
                  <Textarea
                    placeholder={field.placeholder ?? ''}
                    value={(docFieldData[field.key] as string) ?? ''}
                    onChange={(e) => setDocFieldData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={(docFieldData[field.key] as string) ?? ''}
                    onChange={(e) => setDocFieldData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    className={selectClass}
                  >
                    <option value="">— Seleccionar —</option>
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.type === 'date' ? (
                  <Input
                    type="date"
                    value={(docFieldData[field.key] as string) ?? ''}
                    onChange={(e) => setDocFieldData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  />
                ) : field.type === 'number' ? (
                  <Input
                    type="number"
                    value={(docFieldData[field.key] as string) ?? ''}
                    onChange={(e) => setDocFieldData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder ?? ''}
                  />
                ) : (
                  <Input
                    value={(docFieldData[field.key] as string) ?? ''}
                    onChange={(e) => setDocFieldData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder ?? ''}
                  />
                )}
              </div>
            ))}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Archivo adjunto (opt)</label>
              <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setDocFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocDialogOpen(false)} disabled={docUploading}>Cancelar</Button>
            <Button onClick={handleDocUpload} disabled={docUploading || !docIssueDate}>
              {docUploading ? 'Subiendo...' : 'Guardar documento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
