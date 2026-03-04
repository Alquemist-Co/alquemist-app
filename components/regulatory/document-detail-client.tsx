'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Download, Upload, CheckCircle,
  FileText, ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  docStatusLabels,
  docStatusBadgeStyles,
  categoryLabels,
  categoryBadgeStyles,
} from './regulatory-shared'
import { createClient } from '@/lib/supabase/client'
import type { Json } from '@/types/database'

// ---------- Types ----------

export type DocDetailData = {
  id: string
  doc_type_id: string
  doc_type_name: string
  doc_type_code: string
  category: string
  description: string | null
  valid_for_days: number | null
  issuing_authority: string | null
  document_number: string | null
  issue_date: string
  expiry_date: string | null
  status: string
  field_data: Record<string, unknown>
  file_path: string | null
  file_name: string | null
  file_size_bytes: number | null
  file_mime_type: string | null
  notes: string | null
  verified_by_name: string | null
  verified_at: string | null
  created_by_name: string | null
  created_at: string
  superseded_by_id: string | null
  batch_id: string | null
  batch_code: string | null
  product_id: string | null
  product_name: string | null
  facility_id: string | null
  facility_name: string | null
  shipment_id: string | null
  shipment_code: string | null
  inventory_item_id: string | null
  quality_test_id: string | null
  quality_test_type: string | null
}

type DynamicField = {
  key: string
  label: string
  type: string
  required?: boolean
  options?: string[]
  placeholder?: string
}

type VersionRow = {
  id: string
  document_number: string | null
  issue_date: string
  expiry_date: string | null
  status: string
}

// ---------- Component ----------

type Props = {
  doc: DocDetailData
  dynamicFields: DynamicField[]
  versionHistory: VersionRow[]
  canEdit: boolean
  canVerifyRevoke: boolean
  userId: string
  serverNow: number
}

export function RegulatoryDocDetailClient({
  doc,
  dynamicFields,
  versionHistory,
  canEdit,
  canVerifyRevoke,
  userId,
  serverNow,
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  const isEditable = ['draft', 'valid'].includes(doc.status) && canEdit
  const isDraft = doc.status === 'draft'
  const isValid = doc.status === 'valid'

  // Editable state
  const [docNumber, setDocNumber] = useState(doc.document_number || '')
  const [notes, setNotes] = useState(doc.notes || '')
  const [fieldData, setFieldData] = useState<Record<string, unknown>>(doc.field_data)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  // Dialogs
  const [revokeOpen, setRevokeOpen] = useState(false)
  const [revokeReason, setRevokeReason] = useState('')
  const [supersedeOpen, setSupersedeOpen] = useState(false)
  const [supersedeCopy, setSupersedeCopy] = useState(true)
  const [uploading, setUploading] = useState(false)

  // Expiry helper
  const expiryDays = doc.expiry_date
    ? Math.ceil((new Date(doc.expiry_date + 'T00:00:00').getTime() - serverNow) / 86400000)
    : null

  // ---------- Save ----------
  async function saveChanges() {
    setSaving(true)
    const { error } = await supabase
      .from('regulatory_documents')
      .update({
        document_number: docNumber || null,
        notes: notes || null,
        field_data: fieldData as Json,
      })
      .eq('id', doc.id)
    setSaving(false)
    if (error) { toast.error('Error al guardar.'); return }
    toast.success('Documento actualizado.')
    setDirty(false)
    router.refresh()
  }

  // ---------- Status Transitions ----------
  async function publishDoc() {
    if (!doc.file_path) {
      toast.error('Se requiere un archivo adjunto para publicar.')
      return
    }
    // Validate required fields
    for (const f of dynamicFields) {
      if (f.required && !fieldData[f.key]) {
        toast.error(`${f.label} es requerido para publicar.`)
        return
      }
    }
    const { error } = await supabase
      .from('regulatory_documents')
      .update({ status: 'valid' as const })
      .eq('id', doc.id)
    if (error) { toast.error('Error al publicar.'); return }
    toast.success('Documento publicado.')
    router.refresh()
  }

  async function verifyDoc() {
    const { error } = await supabase
      .from('regulatory_documents')
      .update({ verified_by: userId, verified_at: new Date().toISOString() })
      .eq('id', doc.id)
    if (error) { toast.error('Error al verificar.'); return }
    toast.success('Documento verificado.')
    router.refresh()
  }

  async function revokeDoc() {
    if (!revokeReason.trim()) { toast.error('Ingresa una razón.'); return }
    const updatedNotes = notes ? `${notes}\n\nRevocado: ${revokeReason}` : `Revocado: ${revokeReason}`
    const { error } = await supabase
      .from('regulatory_documents')
      .update({ status: 'revoked' as const, notes: updatedNotes })
      .eq('id', doc.id)
    if (error) { toast.error('Error al revocar.'); return }
    toast.success('Documento revocado.')
    setRevokeOpen(false)
    router.refresh()
  }

  async function supersedeDoc() {
    // Create new doc
    const today = new Date().toISOString().split('T')[0]
    let newExpiry: string | null = null
    if (doc.valid_for_days) {
      const d = new Date(today + 'T00:00:00')
      d.setDate(d.getDate() + doc.valid_for_days)
      newExpiry = d.toISOString().split('T')[0]
    }

    const { data: newDoc, error: insertErr } = await supabase
      .from('regulatory_documents')
      .insert({
        doc_type_id: doc.doc_type_id,
        issue_date: today,
        expiry_date: newExpiry,
        status: 'draft' as const,
        field_data: (supersedeCopy ? fieldData : {}) as Json,
        batch_id: doc.batch_id,
        product_id: doc.product_id,
        facility_id: doc.facility_id,
        shipment_id: doc.shipment_id,
        inventory_item_id: doc.inventory_item_id,
        quality_test_id: doc.quality_test_id,
      })
      .select('id')
      .single()

    if (insertErr || !newDoc) { toast.error('Error al crear nueva versión.'); return }

    // Mark current as superseded
    const { error: updateErr } = await supabase
      .from('regulatory_documents')
      .update({ status: 'superseded' as const, superseded_by_id: newDoc.id })
      .eq('id', doc.id)

    if (updateErr) { toast.error('Nueva versión creada pero error al marcar actual.'); return }

    toast.success('Nueva versión creada.')
    setSupersedeOpen(false)
    router.push(`/regulatory/documents/${newDoc.id}`)
  }

  async function renewDoc() {
    const today = new Date().toISOString().split('T')[0]
    let newExpiry: string | null = null
    if (doc.valid_for_days) {
      const d = new Date(today + 'T00:00:00')
      d.setDate(d.getDate() + doc.valid_for_days)
      newExpiry = d.toISOString().split('T')[0]
    }

    const { data: newDoc, error } = await supabase
      .from('regulatory_documents')
      .insert({
        doc_type_id: doc.doc_type_id,
        issue_date: today,
        expiry_date: newExpiry,
        status: 'draft' as const,
        field_data: fieldData as Json,
        batch_id: doc.batch_id,
        product_id: doc.product_id,
        facility_id: doc.facility_id,
        shipment_id: doc.shipment_id,
        inventory_item_id: doc.inventory_item_id,
        quality_test_id: doc.quality_test_id,
      })
      .select('id')
      .single()

    if (error || !newDoc) { toast.error('Error al renovar.'); return }
    toast.success('Renovación creada.')
    router.push(`/regulatory/documents/${newDoc.id}`)
  }

  // ---------- File ----------
  async function handleFileUpload(file: File) {
    setUploading(true)

    const { data: userData } = await supabase.auth.getUser()
    const { data: userRec } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', userData.user!.id)
      .single()

    if (!userRec) { toast.error('Error de autenticación.'); setUploading(false); return }

    // Delete old file if exists
    if (doc.file_path) {
      await supabase.storage.from('regulatory-documents').remove([doc.file_path])
    }

    const ext = file.name.split('.').pop() || 'bin'
    const path = `${userRec.company_id}/${doc.doc_type_code}/${doc.id}.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from('regulatory-documents')
      .upload(path, file, { upsert: true })

    if (uploadErr) { toast.error('Error al subir archivo.'); setUploading(false); return }

    const { error: updateErr } = await supabase
      .from('regulatory_documents')
      .update({
        file_path: path,
        file_name: file.name,
        file_size_bytes: file.size,
        file_mime_type: file.type,
      })
      .eq('id', doc.id)

    setUploading(false)
    if (updateErr) { toast.error('Archivo subido pero error al actualizar registro.'); return }
    toast.success('Archivo subido.')
    router.refresh()
  }

  async function downloadFile() {
    if (!doc.file_path) return
    const { data, error } = await supabase.storage
      .from('regulatory-documents')
      .createSignedUrl(doc.file_path, 3600)
    if (error || !data?.signedUrl) { toast.error('Error al generar enlace.'); return }
    window.open(data.signedUrl, '_blank')
  }

  function updateField(key: string, val: unknown) {
    setFieldData((prev) => ({ ...prev, [key]: val }))
    setDirty(true)
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/regulatory/documents">Regulatorio</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/regulatory/documents">Documentos</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{doc.doc_type_name} {doc.document_number ? `— ${doc.document_number}` : ''}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold tracking-tight">{doc.doc_type_name}</h2>
            <Badge variant="outline" className={docStatusBadgeStyles[doc.status] || ''}>
              {docStatusLabels[doc.status] || doc.status}
            </Badge>
            <Badge variant="outline" className={categoryBadgeStyles[doc.category] || ''}>
              {categoryLabels[doc.category] || doc.category}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {doc.document_number && (
              <p className="text-sm text-muted-foreground">#{doc.document_number}</p>
            )}
            {expiryDays != null && doc.status === 'valid' && (
              <Badge variant="outline" className={
                expiryDays <= 0 ? 'bg-red-100 text-red-700' :
                expiryDays <= 30 ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-100 text-green-700'
              }>
                {expiryDays <= 0 ? `Vencido hace ${Math.abs(expiryDays)} días` :
                 expiryDays <= 30 ? `Vence en ${expiryDays} días` :
                 `Vigente hasta ${doc.expiry_date}`}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isDraft && canEdit && (
            <Button size="sm" onClick={publishDoc}>Publicar</Button>
          )}
          {isValid && canVerifyRevoke && !doc.verified_by_name && (
            <Button variant="outline" size="sm" onClick={verifyDoc}>
              <CheckCircle className="mr-1 h-4 w-4" /> Verificar
            </Button>
          )}
          {isValid && canVerifyRevoke && (
            <>
              <Button variant="destructive" size="sm" onClick={() => setRevokeOpen(true)}>
                Revocar
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSupersedeOpen(true)}>
                Superseder
              </Button>
            </>
          )}
          {doc.status === 'expired' && canVerifyRevoke && (
            <Button size="sm" onClick={renewDoc}>Renovar</Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => router.push('/regulatory/documents')}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Volver
          </Button>
        </div>
      </div>

      {/* General Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información General</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label className="text-muted-foreground text-xs">Tipo de documento</Label>
              <p className="text-sm">{doc.doc_type_name}</p>
              {doc.description && <p className="text-xs text-muted-foreground">{doc.description}</p>}
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Autoridad emisora</Label>
              <p className="text-sm">{doc.issuing_authority || '—'}</p>
            </div>
            {isEditable ? (
              <div className="grid gap-1">
                <Label className="text-xs">Número de documento</Label>
                <Input
                  value={docNumber}
                  onChange={(e) => { setDocNumber(e.target.value); setDirty(true) }}
                  className="h-8 text-sm"
                />
              </div>
            ) : (
              <div>
                <Label className="text-muted-foreground text-xs">Número de documento</Label>
                <p className="text-sm">{doc.document_number || '—'}</p>
              </div>
            )}
            <div>
              <Label className="text-muted-foreground text-xs">Fecha de emisión</Label>
              <p className="text-sm">{doc.issue_date}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Fecha de vencimiento</Label>
              <p className="text-sm">{doc.expiry_date || 'No expira'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Creado por</Label>
              <p className="text-sm">{doc.created_by_name || '—'} · {new Date(doc.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Verificado por</Label>
              <p className="text-sm">
                {doc.verified_by_name
                  ? `${doc.verified_by_name} · ${doc.verified_at ? new Date(doc.verified_at).toLocaleDateString() : ''}`
                  : 'No verificado'}
              </p>
            </div>
          </div>

          {isEditable ? (
            <div className="mt-4 grid gap-1">
              <Label className="text-xs">Notas</Label>
              <Textarea
                value={notes}
                onChange={(e) => { setNotes(e.target.value); setDirty(true) }}
                rows={2}
                className="text-sm"
              />
            </div>
          ) : doc.notes ? (
            <div className="mt-4">
              <Label className="text-muted-foreground text-xs">Notas</Label>
              <p className="text-sm whitespace-pre-wrap">{doc.notes}</p>
            </div>
          ) : null}

          {dirty && (
            <Button onClick={saveChanges} size="sm" className="mt-3" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Dynamic Fields */}
      {dynamicFields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos del Documento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {dynamicFields.map((field) => (
                <DynField
                  key={field.key}
                  field={field}
                  value={fieldData[field.key]}
                  onChange={(val) => updateField(field.key, val)}
                  editable={isEditable}
                />
              ))}
            </div>
            {dirty && isEditable && (
              <Button onClick={saveChanges} size="sm" className="mt-3" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar datos'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Linked Entities */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vinculación</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {doc.batch_code && (
              <LinkItem label="Lote" value={doc.batch_code} onClick={() => router.push(`/production/batches/${doc.batch_id}`)} />
            )}
            {doc.product_name && (
              <LinkItem label="Producto" value={doc.product_name} />
            )}
            {doc.facility_name && (
              <LinkItem label="Instalación" value={doc.facility_name} />
            )}
            {doc.shipment_code && (
              <LinkItem label="Envío" value={doc.shipment_code} onClick={() => router.push(`/inventory/shipments/${doc.shipment_id}`)} />
            )}
            {doc.quality_test_type && (
              <LinkItem label="Test de calidad" value={doc.quality_test_type} onClick={() => router.push(`/quality/tests/${doc.quality_test_id}`)} />
            )}
            {!doc.batch_code && !doc.product_name && !doc.facility_name && !doc.shipment_code && !doc.quality_test_type && (
              <p className="text-sm text-muted-foreground col-span-full">Sin vinculaciones.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* File Attachment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Archivo Adjunto</CardTitle>
        </CardHeader>
        <CardContent>
          {doc.file_path ? (
            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{doc.file_name || 'Archivo'}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.file_mime_type}{doc.file_size_bytes ? ` · ${(doc.file_size_bytes / 1024).toFixed(0)} KB` : ''}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadFile}>
                  <Download className="mr-1 h-4 w-4" /> Descargar
                </Button>
                {isEditable && (
                  <label>
                    <Button variant="ghost" size="sm" asChild disabled={uploading}>
                      <span>
                        <Upload className="mr-1 h-4 w-4" /> {uploading ? 'Subiendo...' : 'Reemplazar'}
                      </span>
                    </Button>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) handleFileUpload(f)
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-6 text-center">
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-2">Sin archivo adjunto</p>
              {isEditable && (
                <label>
                  <Button size="sm" asChild disabled={uploading}>
                    <span>{uploading ? 'Subiendo...' : 'Subir archivo'}</span>
                  </Button>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleFileUpload(f)
                    }}
                  />
                </label>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Version History */}
      {versionHistory.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historial de Versiones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Fecha emisión</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versionHistory.map((v) => (
                    <TableRow
                      key={v.id}
                      className={`cursor-pointer ${v.id === doc.id ? 'bg-muted/50' : ''}`}
                      onClick={() => { if (v.id !== doc.id) router.push(`/regulatory/documents/${v.id}`) }}
                    >
                      <TableCell className="font-medium">
                        {v.document_number || '—'}
                        {v.id === doc.id && <Badge variant="outline" className="ml-2 text-[10px]">Actual</Badge>}
                      </TableCell>
                      <TableCell>{v.issue_date}</TableCell>
                      <TableCell>{v.expiry_date || 'No expira'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={docStatusBadgeStyles[v.status] || ''}>
                          {docStatusLabels[v.status] || v.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revoke Dialog */}
      <AlertDialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revocar documento</AlertDialogTitle>
            <AlertDialogDescription>
              Un documento revocado no puede ser reactivado. Si necesita reemplazarlo, use &quot;Superseder&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label className="text-xs">Razón de revocación *</Label>
            <Textarea
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="Describe por qué se revoca el documento"
              rows={2}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={revokeDoc} className="bg-destructive text-destructive-foreground">
              Revocar documento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Supersede Dialog */}
      <Dialog open={supersedeOpen} onOpenChange={setSupersedeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Superseder documento</DialogTitle>
            <DialogDescription>
              Se creará una nueva versión de {doc.doc_type_name}. El documento actual se marcará como &quot;Superseded&quot;.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={supersedeCopy}
                onCheckedChange={(v) => setSupersedeCopy(!!v)}
              />
              <Label className="text-sm">Copiar datos del documento actual</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupersedeOpen(false)}>Cancelar</Button>
            <Button onClick={supersedeDoc}>Crear nueva versión</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------- Subcomponents ----------

function LinkItem({ label, value, onClick }: { label: string; value: string; onClick?: () => void }) {
  return (
    <div className="rounded-md border p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      {onClick ? (
        <p className="text-sm text-primary cursor-pointer hover:underline flex items-center gap-1" onClick={onClick}>
          {value} <ExternalLink className="h-3 w-3" />
        </p>
      ) : (
        <p className="text-sm">{value}</p>
      )}
    </div>
  )
}

function DynField({
  field,
  value,
  onChange,
  editable,
}: {
  field: DynamicField
  value: unknown
  onChange: (val: unknown) => void
  editable: boolean
}) {
  const label = `${field.label}${field.required ? ' *' : ''}`

  if (!editable) {
    let display = '—'
    if (value != null && value !== '') {
      if (field.type === 'boolean') display = value ? 'Sí' : 'No'
      else display = String(value)
    }
    return (
      <div>
        <Label className="text-muted-foreground text-xs">{field.label}</Label>
        <p className="text-sm">{display}</p>
      </div>
    )
  }

  switch (field.type) {
    case 'text':
      return (
        <div className="grid gap-1">
          <Label className="text-xs">{label}</Label>
          <Input value={(value as string) || ''} onChange={(e) => onChange(e.target.value)} className="h-8 text-sm" placeholder={field.placeholder} />
        </div>
      )
    case 'textarea':
      return (
        <div className="grid gap-1">
          <Label className="text-xs">{label}</Label>
          <Textarea value={(value as string) || ''} onChange={(e) => onChange(e.target.value)} rows={2} className="text-sm" placeholder={field.placeholder} />
        </div>
      )
    case 'number':
      return (
        <div className="grid gap-1">
          <Label className="text-xs">{label}</Label>
          <Input type="number" value={value != null ? String(value) : ''} onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)} className="h-8 text-sm" step="any" />
        </div>
      )
    case 'date':
      return (
        <div className="grid gap-1">
          <Label className="text-xs">{label}</Label>
          <Input type="date" value={(value as string) || ''} onChange={(e) => onChange(e.target.value)} className="h-8 text-sm" />
        </div>
      )
    case 'boolean':
      return (
        <div className="flex items-center gap-2">
          <Checkbox checked={!!value} onCheckedChange={(v) => onChange(!!v)} />
          <Label className="text-xs">{label}</Label>
        </div>
      )
    case 'select':
      return (
        <div className="grid gap-1">
          <Label className="text-xs">{label}</Label>
          <Select value={(value as string) || ''} onValueChange={onChange}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder={field.placeholder || 'Selecciona'} />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )
    default:
      return null
  }
}
