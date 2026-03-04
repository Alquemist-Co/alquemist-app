'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Plus, Paperclip, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTablePagination } from '@/components/shared/data-table-pagination'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  type RegulatoryDocRow,
  type DocTypeOption,
  type BatchOption,
  type ProductOption,
  type FacilityOption,
  type ShipmentOption,
  type QualityTestOption,
  docStatusLabels,
  docStatusBadgeStyles,
  categoryLabels,
  categoryBadgeStyles,
} from './regulatory-shared'
import { createClient } from '@/lib/supabase/client'
import type { Json } from '@/types/database'

type DocTypeField = {
  key: string
  label: string
  type: string
  required?: boolean
  options?: string[]
  placeholder?: string
}

type Props = {
  docs: RegulatoryDocRow[]
  docTypes: DocTypeOption[]
  batches: BatchOption[]
  products: ProductOption[]
  facilities: FacilityOption[]
  shipments: ShipmentOption[]
  qualityTests: QualityTestOption[]
  totalPages: number
  totalCount: number
  currentPage: number
  canCreate: boolean
  serverNow: number
  kpis: {
    valid: number
    expiring: number
    expired: number
    drafts: number
  }
  filters: {
    status: string
    category: string
    doc_type: string
    search: string
  }
}

export function RegulatoryDocsListClient({
  docs,
  docTypes,
  batches,
  products,
  facilities,
  shipments,
  qualityTests,
  totalPages,
  totalCount,
  currentPage,
  canCreate,
  serverNow,
  kpis,
  filters,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [searchValue, setSearchValue] = useState(filters.search)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)

  // Step 1 state
  const [selectedDocTypeId, setSelectedDocTypeId] = useState('')

  // Step 2 state
  const [formDocNumber, setFormDocNumber] = useState('')
  const [formIssueDate, setFormIssueDate] = useState(new Date().toISOString().split('T')[0])
  const [formNotes, setFormNotes] = useState('')
  const [formBatchId, setFormBatchId] = useState('')
  const [formProductId, setFormProductId] = useState('')
  const [formFacilityId, setFormFacilityId] = useState('')
  const [formShipmentId, setFormShipmentId] = useState('')
  const [formQualityTestId, setFormQualityTestId] = useState('')
  const [formFieldData, setFormFieldData] = useState<Record<string, unknown>>({})
  const [formFile, setFormFile] = useState<File | null>(null)

  const selectedDocType = docTypes.find((dt) => dt.id === selectedDocTypeId)
  const dynamicFields = (selectedDocType?.required_fields as { fields: DocTypeField[] })?.fields ?? []

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value)
        else params.delete(key)
      }
      if (!('page' in updates)) params.delete('page')
      router.push(`/regulatory/documents?${params.toString()}`)
    },
    [router, searchParams],
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (searchValue !== filters.search) {
        updateParams({ search: searchValue })
      }
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchValue, filters.search, updateParams])

  function goToPage(page: number) {
    updateParams({ page: page > 1 ? String(page) : '' })
  }

  function resetDialog() {
    setStep(1)
    setSelectedDocTypeId('')
    setFormDocNumber('')
    setFormIssueDate(new Date().toISOString().split('T')[0])
    setFormNotes('')
    setFormBatchId('')
    setFormProductId('')
    setFormFacilityId('')
    setFormShipmentId('')
    setFormQualityTestId('')
    setFormFieldData({})
    setFormFile(null)
  }

  // Calculate expiry date
  function getExpiryDate(): string | null {
    if (!selectedDocType?.valid_for_days || !formIssueDate) return null
    const d = new Date(formIssueDate + 'T00:00:00')
    d.setDate(d.getDate() + selectedDocType.valid_for_days)
    return d.toISOString().split('T')[0]
  }

  async function handleCreate() {
    if (!selectedDocTypeId) { toast.error('Selecciona un tipo de documento.'); return }
    if (!formIssueDate) { toast.error('La fecha de emisión es requerida.'); return }

    // Validate required dynamic fields
    for (const field of dynamicFields) {
      if (field.required && !formFieldData[field.key]) {
        toast.error(`${field.label} es requerido.`)
        return
      }
    }

    setCreating(true)
    const supabase = createClient()

    // Upload file if provided
    let filePath: string | null = null
    let fileName: string | null = null
    let fileSize: number | null = null
    let fileMime: string | null = null

    if (formFile) {
      const { data: userData } = await supabase.auth.getUser()
      const { data: userRec } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', userData.user!.id)
        .single()

      if (!userRec) { toast.error('Error de autenticación.'); setCreating(false); return }

      const ext = formFile.name.split('.').pop() || 'bin'
      const path = `${userRec.company_id}/${selectedDocType?.code || 'DOC'}/${crypto.randomUUID()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('regulatory-documents')
        .upload(path, formFile)

      if (uploadError) {
        toast.error('Error al subir el archivo.')
        setCreating(false)
        return
      }

      filePath = path
      fileName = formFile.name
      fileSize = formFile.size
      fileMime = formFile.type
    }

    const expiryDate = getExpiryDate()
    const hasFile = !!filePath

    const { data, error } = await supabase
      .from('regulatory_documents')
      .insert({
        doc_type_id: selectedDocTypeId,
        document_number: formDocNumber || null,
        issue_date: formIssueDate,
        expiry_date: expiryDate,
        status: hasFile ? 'valid' as const : 'draft' as const,
        field_data: formFieldData as Json,
        file_path: filePath,
        file_name: fileName,
        file_size_bytes: fileSize,
        file_mime_type: fileMime,
        batch_id: formBatchId || null,
        product_id: formProductId || null,
        facility_id: formFacilityId || null,
        shipment_id: formShipmentId || null,
        quality_test_id: formQualityTestId || null,
        notes: formNotes || null,
      })
      .select('id')
      .single()

    setCreating(false)

    if (error) {
      toast.error('Error al crear el documento.')
      return
    }

    toast.success('Documento creado exitosamente.')
    setDialogOpen(false)
    resetDialog()
    router.push(`/regulatory/documents/${data.id}`)
  }

  // Expiry visual helpers
  function getExpiryStyle(expiryDate: string | null, status: string) {
    if (status !== 'valid' || !expiryDate) return ''
    const diff = (new Date(expiryDate + 'T00:00:00').getTime() - serverNow) / 86400000
    if (diff <= 0) return 'text-red-600 font-medium'
    if (diff <= 30) return 'text-yellow-600'
    return ''
  }

  const kpiCards = [
    { label: 'Válidos', value: kpis.valid, icon: CheckCircle, style: 'text-green-600' },
    { label: 'Por vencer (30d)', value: kpis.expiring, icon: AlertTriangle, style: 'text-yellow-600' },
    { label: 'Vencidos', value: kpis.expired, icon: XCircle, style: 'text-red-600' },
    { label: 'Borradores', value: kpis.drafts, icon: null, style: 'text-muted-foreground' },
  ]

  const complianceTotal = kpis.valid + kpis.expired
  const compliancePct = complianceTotal > 0 ? Math.round((kpis.valid / complianceTotal) * 100) : 100

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        {kpiCards.map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className={`text-2xl font-bold ${k.style}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Compliance</p>
            <p className={`text-2xl font-bold ${compliancePct >= 80 ? 'text-green-600' : compliancePct >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
              {compliancePct}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Create */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número de documento..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-8"
          />
        </div>

        <Select
          value={filters.status || 'all'}
          onValueChange={(v) => updateParams({ status: v === 'all' ? '' : v })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="draft">Borrador</SelectItem>
            <SelectItem value="valid">Válido</SelectItem>
            <SelectItem value="expired">Vencido</SelectItem>
            <SelectItem value="revoked">Revocado</SelectItem>
            <SelectItem value="superseded">Superado</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.doc_type || 'all'}
          onValueChange={(v) => updateParams({ doc_type: v === 'all' ? '' : v })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {docTypes.map((dt) => (
              <SelectItem key={dt.id} value={dt.id}>{dt.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto">
          {canCreate && (
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetDialog() }}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-1 h-4 w-4" />
                  Nuevo documento
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {step === 1 ? 'Nuevo Documento — Tipo' : `Nuevo Documento — ${selectedDocType?.name}`}
                  </DialogTitle>
                  <DialogDescription>
                    {step === 1 ? 'Selecciona el tipo de documento regulatorio.' : 'Completa la información del documento.'}
                  </DialogDescription>
                </DialogHeader>

                {step === 1 ? (
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>Tipo de documento *</Label>
                      <Select value={selectedDocTypeId} onValueChange={setSelectedDocTypeId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {docTypes.map((dt) => (
                            <SelectItem key={dt.id} value={dt.id}>
                              {dt.name} ({categoryLabels[dt.category] || dt.category})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedDocType && (
                      <div className="rounded-md border p-3 text-sm space-y-1">
                        {selectedDocType.description && <p className="text-muted-foreground">{selectedDocType.description}</p>}
                        <p>Categoría: <Badge variant="outline" className={categoryBadgeStyles[selectedDocType.category] || ''}>{categoryLabels[selectedDocType.category]}</Badge></p>
                        <p>Vigencia: {selectedDocType.valid_for_days ? `${selectedDocType.valid_for_days} días` : 'No expira'}</p>
                        {selectedDocType.issuing_authority && <p>Autoridad: {selectedDocType.issuing_authority}</p>}
                      </div>
                    )}
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                      <Button onClick={() => setStep(2)} disabled={!selectedDocTypeId}>Siguiente</Button>
                    </DialogFooter>
                  </div>
                ) : (
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Número de documento</Label>
                        <Input value={formDocNumber} onChange={(e) => setFormDocNumber(e.target.value)} placeholder="DOC-2026-001" />
                      </div>
                      <div className="grid gap-2">
                        <Label>Fecha de emisión *</Label>
                        <Input type="date" value={formIssueDate} onChange={(e) => setFormIssueDate(e.target.value)} />
                      </div>
                    </div>
                    {selectedDocType?.valid_for_days && (
                      <p className="text-xs text-muted-foreground">
                        Fecha de vencimiento: {getExpiryDate() || '—'}
                      </p>
                    )}

                    {/* Linking */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Vincular a</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <Select value={formBatchId || 'none'} onValueChange={(v) => setFormBatchId(v === 'none' ? '' : v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Lote" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin lote</SelectItem>
                            {batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.code}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Select value={formProductId || 'none'} onValueChange={(v) => setFormProductId(v === 'none' ? '' : v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Producto" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin producto</SelectItem>
                            {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Select value={formFacilityId || 'none'} onValueChange={(v) => setFormFacilityId(v === 'none' ? '' : v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Instalación" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin instalación</SelectItem>
                            {facilities.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Select value={formShipmentId || 'none'} onValueChange={(v) => setFormShipmentId(v === 'none' ? '' : v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Envío" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin envío</SelectItem>
                            {shipments.map((s) => <SelectItem key={s.id} value={s.id}>{s.shipment_code}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Select value={formQualityTestId || 'none'} onValueChange={(v) => setFormQualityTestId(v === 'none' ? '' : v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Test de calidad" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin test</SelectItem>
                            {qualityTests.map((qt) => <SelectItem key={qt.id} value={qt.id}>{qt.test_type}{qt.batch_code ? ` — ${qt.batch_code}` : ''}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Dynamic Fields */}
                    {dynamicFields.length > 0 && (
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Datos del documento</Label>
                        {dynamicFields.map((field) => (
                          <DynamicField
                            key={field.key}
                            field={field}
                            value={formFieldData[field.key]}
                            onChange={(val) => setFormFieldData((prev) => ({ ...prev, [field.key]: val }))}
                          />
                        ))}
                      </div>
                    )}

                    {/* File Upload */}
                    <div className="grid gap-2">
                      <Label>Archivo adjunto</Label>
                      <Input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setFormFile(e.target.files?.[0] ?? null)}
                      />
                      <p className="text-xs text-muted-foreground">
                        PDF, JPEG o PNG. Máx 10MB. {!formFile && 'Sin archivo = borrador.'}
                      </p>
                    </div>

                    <div className="grid gap-2">
                      <Label>Notas</Label>
                      <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} />
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setStep(1)}>Atrás</Button>
                      <Button onClick={handleCreate} disabled={creating}>
                        {creating ? 'Creando...' : 'Crear documento'}
                      </Button>
                    </DialogFooter>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Número</TableHead>
              <TableHead>Vinculado a</TableHead>
              <TableHead>Fecha emisión</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10">Archivo</TableHead>
              <TableHead className="w-10">Verificado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No se encontraron documentos regulatorios.
                </TableCell>
              </TableRow>
            ) : (
              docs.map((d) => (
                <TableRow
                  key={d.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/regulatory/documents/${d.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{d.doc_type_name}</span>
                      <Badge variant="outline" className={`text-[10px] ${categoryBadgeStyles[d.category] || ''}`}>
                        {categoryLabels[d.category] || d.category}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{d.document_number || '—'}</TableCell>
                  <TableCell>{d.linked_to}</TableCell>
                  <TableCell>{d.issue_date}</TableCell>
                  <TableCell className={getExpiryStyle(d.expiry_date, d.status)}>
                    {d.expiry_date || 'No expira'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={docStatusBadgeStyles[d.status] || ''}>
                      {docStatusLabels[d.status] || d.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {d.has_file && <Paperclip className="h-4 w-4 text-muted-foreground" />}
                  </TableCell>
                  <TableCell>
                    {d.verified && <CheckCircle className="h-4 w-4 text-green-600" />}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={20}
        onPageChange={goToPage}
      />
    </div>
  )
}

// ---------- Dynamic Field Renderer ----------

function DynamicField({
  field,
  value,
  onChange,
}: {
  field: DocTypeField
  value: unknown
  onChange: (val: unknown) => void
}) {
  const label = `${field.label}${field.required ? ' *' : ''}`

  switch (field.type) {
    case 'text':
      return (
        <div className="grid gap-1">
          <Label className="text-xs">{label}</Label>
          <Input
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="h-8 text-sm"
          />
        </div>
      )
    case 'textarea':
      return (
        <div className="grid gap-1">
          <Label className="text-xs">{label}</Label>
          <Textarea
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={2}
            className="text-sm"
          />
        </div>
      )
    case 'number':
      return (
        <div className="grid gap-1">
          <Label className="text-xs">{label}</Label>
          <Input
            type="number"
            value={value != null ? String(value) : ''}
            onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)}
            placeholder={field.placeholder}
            className="h-8 text-sm"
            step="any"
          />
        </div>
      )
    case 'date':
      return (
        <div className="grid gap-1">
          <Label className="text-xs">{label}</Label>
          <Input
            type="date"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      )
    case 'boolean':
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={!!value}
            onCheckedChange={(checked) => onChange(!!checked)}
          />
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
              {(field.options ?? []).map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    default:
      return null
  }
}
