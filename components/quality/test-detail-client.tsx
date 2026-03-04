'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, X, Minus, Trash2, Plus, Download } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { testStatusLabels, testStatusBadgeStyles } from './quality-shared'
import { createClient } from '@/lib/supabase/client'

// ---------- Types ----------

export type TestDetailData = {
  id: string
  test_type: string
  status: string
  overall_pass: boolean | null
  batch_id: string
  batch_code: string
  cultivar_name: string
  cultivar_code: string
  phase_name: string
  zone_name: string
  facility_name: string
  product_name: string | null
  lab_name: string | null
  lab_reference: string | null
  sample_date: string
  result_date: string | null
  performed_by_name: string | null
  notes: string | null
  created_at: string
}

export type TestResultRow = {
  id: string
  parameter: string
  value: string
  numeric_value: number | null
  unit: string | null
  min_threshold: number | null
  max_threshold: number | null
  passed: boolean | null
}

type CoaDoc = {
  id: string
  doc_type_name: string
  document_number: string | null
  issue_date: string
  expiry_date: string | null
  status: string
  file_path: string | null
}

// ---------- Parameter Presets ----------

const PRESETS: Record<string, { parameter: string; unit: string; min: number | null; max: number | null }[]> = {
  potency: [
    { parameter: 'THC', unit: '%', min: 0, max: 35 },
    { parameter: 'CBD', unit: '%', min: 0, max: 30 },
    { parameter: 'CBN', unit: '%', min: 0, max: 5 },
    { parameter: 'CBG', unit: '%', min: 0, max: 5 },
  ],
  terpenes: [
    { parameter: 'Limonene', unit: 'mg/g', min: null, max: null },
    { parameter: 'Myrcene', unit: 'mg/g', min: null, max: null },
    { parameter: 'Caryophyllene', unit: 'mg/g', min: null, max: null },
    { parameter: 'Linalool', unit: 'mg/g', min: null, max: null },
  ],
  contaminants: [
    { parameter: 'E.coli', unit: 'CFU/g', min: null, max: 100 },
    { parameter: 'Salmonella', unit: 'presence', min: null, max: 0 },
    { parameter: 'Total coliforms', unit: 'CFU/g', min: null, max: 10000 },
  ],
  heavy_metals: [
    { parameter: 'Lead', unit: 'ppm', min: null, max: 0.5 },
    { parameter: 'Arsenic', unit: 'ppm', min: null, max: 0.2 },
    { parameter: 'Cadmium', unit: 'ppm', min: null, max: 0.2 },
    { parameter: 'Mercury', unit: 'ppm', min: null, max: 0.1 },
  ],
  pesticides: [
    { parameter: 'Total pesticides', unit: 'ppm', min: null, max: 0.01 },
  ],
  moisture: [
    { parameter: 'Moisture', unit: '%', min: null, max: 15 },
  ],
}

// ---------- Auto-calc helper ----------

function calcPassed(numericValue: number | null, min: number | null, max: number | null): boolean | null {
  if (numericValue == null) return null
  if (min != null && max != null) return numericValue >= min && numericValue <= max
  if (min != null) return numericValue >= min
  if (max != null) return numericValue <= max
  return null
}

// ---------- Component ----------

type Props = {
  test: TestDetailData
  results: TestResultRow[]
  coaDocs: CoaDoc[]
  canEdit: boolean
  canChangeStatus: boolean
}

export function QualityTestDetailClient({
  test,
  results: initialResults,
  coaDocs,
  canEdit,
  canChangeStatus,
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [results, setResults] = useState<TestResultRow[]>(initialResults)
  const [saving, setSaving] = useState(false)

  // Editable test fields
  const [labName, setLabName] = useState(test.lab_name || '')
  const [labRef, setLabRef] = useState(test.lab_reference || '')
  const [resultDate, setResultDate] = useState(test.result_date || '')
  const [notes, setNotes] = useState(test.notes || '')
  const [testDirty, setTestDirty] = useState(false)

  // Dialogs
  const [completeOpen, setCompleteOpen] = useState(false)
  const [failOpen, setFailOpen] = useState(false)
  const [failReason, setFailReason] = useState('')

  const isEditable = ['pending', 'in_progress'].includes(test.status) && canEdit
  const canComplete = test.status === 'in_progress' && canEdit
  const canFail = test.status === 'in_progress' && canEdit
  const canStart = test.status === 'pending' && canEdit
  const canReject = ['completed', 'failed'].includes(test.status) && canChangeStatus

  // ---------- Test Info Save ----------
  async function saveTestInfo() {
    setSaving(true)
    const { error } = await supabase
      .from('quality_tests')
      .update({
        lab_name: labName || null,
        lab_reference: labRef || null,
        result_date: resultDate || null,
        notes: notes || null,
      })
      .eq('id', test.id)
    setSaving(false)
    if (error) { toast.error('Error al guardar.'); return }
    toast.success('Test actualizado.')
    setTestDirty(false)
    router.refresh()
  }

  // ---------- Status Transitions ----------
  async function startCapture() {
    const { error } = await supabase
      .from('quality_tests')
      .update({ status: 'in_progress' as const })
      .eq('id', test.id)
    if (error) { toast.error('Error al iniciar captura.'); return }
    toast.success('Captura iniciada.')
    router.refresh()
  }

  async function completeTest() {
    const nonNull = results.filter((r) => r.passed !== null)
    const allPass = nonNull.length > 0 && nonNull.every((r) => r.passed === true)
    const overallPass = nonNull.length === 0 ? null : allPass
    const finalResultDate = resultDate || new Date().toISOString().split('T')[0]

    const { error } = await supabase
      .from('quality_tests')
      .update({
        status: 'completed' as const,
        overall_pass: overallPass,
        result_date: finalResultDate,
      })
      .eq('id', test.id)
    if (error) { toast.error('Error al completar el test.'); return }
    toast.success('Test completado.')
    setCompleteOpen(false)
    router.refresh()
  }

  async function markFailed() {
    if (!failReason.trim()) { toast.error('Ingresa una razón.'); return }
    const currentNotes = notes ? `${notes}\n\nFailed: ${failReason}` : `Failed: ${failReason}`
    const { error } = await supabase
      .from('quality_tests')
      .update({ status: 'failed' as const, notes: currentNotes })
      .eq('id', test.id)
    if (error) { toast.error('Error al marcar como fallido.'); return }
    toast.success('Test marcado como fallido.')
    setFailOpen(false)
    router.refresh()
  }

  async function rejectTest() {
    const { error } = await supabase
      .from('quality_tests')
      .update({ status: 'rejected' as const })
      .eq('id', test.id)
    if (error) { toast.error('Error al rechazar.'); return }
    toast.success('Test rechazado.')
    router.refresh()
  }

  // ---------- Results CRUD ----------
  async function addResult() {
    const { data, error } = await supabase
      .from('quality_test_results')
      .insert({
        test_id: test.id,
        parameter: '',
        value: '',
      })
      .select()
      .single()
    if (error || !data) { toast.error('Error al agregar parámetro.'); return }
    setResults((prev) => [...prev, {
      id: data.id,
      parameter: '',
      value: '',
      numeric_value: null,
      unit: null,
      min_threshold: null,
      max_threshold: null,
      passed: null,
    }])
  }

  async function updateResult(resultId: string, field: string, rawValue: string | number | null) {
    const idx = results.findIndex((r) => r.id === resultId)
    if (idx === -1) return

    const updated = { ...results[idx], [field]: rawValue }
    // Recalculate passed
    updated.passed = calcPassed(updated.numeric_value, updated.min_threshold, updated.max_threshold)

    const newResults = [...results]
    newResults[idx] = updated
    setResults(newResults)

    // Debounce save — save immediately for now
    const { error } = await supabase
      .from('quality_test_results')
      .update({
        parameter: updated.parameter,
        value: updated.value,
        numeric_value: updated.numeric_value,
        unit: updated.unit || null,
        min_threshold: updated.min_threshold,
        max_threshold: updated.max_threshold,
        passed: updated.passed,
      })
      .eq('id', resultId)
    if (error) toast.error('Error al guardar resultado.')
  }

  async function deleteResult(resultId: string) {
    const { error } = await supabase
      .from('quality_test_results')
      .delete()
      .eq('id', resultId)
    if (error) { toast.error('Error al eliminar.'); return }
    setResults((prev) => prev.filter((r) => r.id !== resultId))
  }

  async function loadPreset(presetKey: string) {
    const preset = PRESETS[presetKey]
    if (!preset) return

    const inserts = preset.map((p) => ({
      test_id: test.id,
      parameter: p.parameter,
      value: '',
      unit: p.unit,
      min_threshold: p.min,
      max_threshold: p.max,
    }))

    const { data, error } = await supabase
      .from('quality_test_results')
      .insert(inserts)
      .select()

    if (error || !data) { toast.error('Error al cargar preset.'); return }

    const newRows: TestResultRow[] = data.map((r) => ({
      id: r.id,
      parameter: r.parameter,
      value: r.value,
      numeric_value: r.numeric_value != null ? Number(r.numeric_value) : null,
      unit: r.unit,
      min_threshold: r.min_threshold != null ? Number(r.min_threshold) : null,
      max_threshold: r.max_threshold != null ? Number(r.max_threshold) : null,
      passed: null,
    }))

    setResults((prev) => [...prev, ...newRows])
    toast.success(`Preset "${presetKey}" cargado.`)
  }

  // Results summary
  const totalParams = results.length
  const passedCount = results.filter((r) => r.passed === true).length
  const failedCount = results.filter((r) => r.passed === false).length
  const pendingCount = results.filter((r) => r.passed === null).length

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/quality/tests">Calidad</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/quality/tests">Tests</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{test.test_type} — {test.batch_code}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold tracking-tight capitalize">
              Test de {test.test_type}
            </h2>
            <Badge variant="outline" className={testStatusBadgeStyles[test.status] || ''}>
              {testStatusLabels[test.status] || test.status}
            </Badge>
            {test.overall_pass === true && (
              <Badge className="bg-green-100 text-green-700">
                <Check className="mr-1 h-3 w-3" /> PASS
              </Badge>
            )}
            {test.overall_pass === false && (
              <Badge className="bg-red-100 text-red-700">
                <X className="mr-1 h-3 w-3" /> FAIL
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Lote{' '}
            <span
              className="text-primary cursor-pointer hover:underline"
              onClick={() => router.push(`/production/batches/${test.batch_id}`)}
            >
              {test.batch_code}
            </span>
            {' · '}{test.cultivar_name}{' · '}{test.phase_name}
          </p>
        </div>
        <div className="flex gap-2">
          {canStart && (
            <Button onClick={startCapture} size="sm">
              Iniciar captura
            </Button>
          )}
          {canComplete && (
            <Button onClick={() => setCompleteOpen(true)} size="sm">
              Completar test
            </Button>
          )}
          {canFail && (
            <Button variant="destructive" onClick={() => setFailOpen(true)} size="sm">
              Marcar fallido
            </Button>
          )}
          {canReject && (
            <Button variant="outline" onClick={rejectTest} size="sm">
              Rechazar
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => router.push('/quality/tests')}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Volver
          </Button>
        </div>
      </div>

      {/* Test Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información del Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label className="text-muted-foreground text-xs">Tipo de test</Label>
              <p className="text-sm capitalize">{test.test_type}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Lote</Label>
              <p className="text-sm">{test.batch_code}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Fase de muestreo</Label>
              <p className="text-sm">{test.phase_name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Fecha muestreo</Label>
              <p className="text-sm">{test.sample_date}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Realizado por</Label>
              <p className="text-sm">{test.performed_by_name || '—'}</p>
            </div>
            {isEditable ? (
              <>
                <div className="grid gap-1">
                  <Label className="text-xs" htmlFor="lab_name">Laboratorio</Label>
                  <Input
                    id="lab_name"
                    value={labName}
                    onChange={(e) => { setLabName(e.target.value); setTestDirty(true) }}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs" htmlFor="lab_ref">Referencia lab</Label>
                  <Input
                    id="lab_ref"
                    value={labRef}
                    onChange={(e) => { setLabRef(e.target.value); setTestDirty(true) }}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs" htmlFor="result_date">Fecha resultado</Label>
                  <Input
                    id="result_date"
                    type="date"
                    value={resultDate}
                    onChange={(e) => { setResultDate(e.target.value); setTestDirty(true) }}
                    className="h-8 text-sm"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label className="text-muted-foreground text-xs">Laboratorio</Label>
                  <p className="text-sm">{test.lab_name || '—'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Referencia lab</Label>
                  <p className="text-sm">{test.lab_reference || '—'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Fecha resultado</Label>
                  <p className="text-sm">{test.result_date || '—'}</p>
                </div>
              </>
            )}
          </div>

          {isEditable && (
            <div className="mt-4">
              <div className="grid gap-1">
                <Label className="text-xs" htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => { setNotes(e.target.value); setTestDirty(true) }}
                  rows={2}
                  className="text-sm"
                />
              </div>
              {testDirty && (
                <Button onClick={saveTestInfo} size="sm" className="mt-2" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              )}
            </div>
          )}

          {!isEditable && test.notes && (
            <div className="mt-4">
              <Label className="text-muted-foreground text-xs">Notas</Label>
              <p className="text-sm whitespace-pre-wrap">{test.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Resultados por Parámetro</CardTitle>
              <CardDescription>
                {totalParams} parámetros · {passedCount} aprobados · {failedCount} fallidos · {pendingCount} pendientes
              </CardDescription>
            </div>
            {isEditable && (
              <div className="flex gap-2">
                <Select onValueChange={loadPreset}>
                  <SelectTrigger className="w-[160px] h-8 text-xs">
                    <SelectValue placeholder="Cargar preset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="potency">Potencia</SelectItem>
                    <SelectItem value="terpenes">Terpenos</SelectItem>
                    <SelectItem value="contaminants">Contaminantes</SelectItem>
                    <SelectItem value="heavy_metals">Metales pesados</SelectItem>
                    <SelectItem value="pesticides">Pesticidas</SelectItem>
                    <SelectItem value="moisture">Humedad</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={addResult}>
                  <Plus className="mr-1 h-3 w-3" /> Agregar
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parámetro</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Numérico</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead>Mín</TableHead>
                  <TableHead>Máx</TableHead>
                  <TableHead>Resultado</TableHead>
                  {isEditable && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isEditable ? 8 : 7} className="h-16 text-center text-muted-foreground">
                      Sin parámetros. Usa &quot;Cargar preset&quot; o agrega uno manualmente.
                    </TableCell>
                  </TableRow>
                ) : (
                  results.map((r) =>
                    isEditable ? (
                      <TableRow key={r.id}>
                        <TableCell>
                          <Input
                            value={r.parameter}
                            onChange={(e) => updateResult(r.id, 'parameter', e.target.value)}
                            className="h-7 text-xs w-32"
                            placeholder="Ej: THC"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={r.value}
                            onChange={(e) => updateResult(r.id, 'value', e.target.value)}
                            className="h-7 text-xs w-24"
                            placeholder="23.5"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={r.numeric_value ?? ''}
                            onChange={(e) => updateResult(r.id, 'numeric_value', e.target.value ? parseFloat(e.target.value) : null)}
                            className="h-7 text-xs w-20"
                            step="any"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={r.unit || ''}
                            onChange={(e) => updateResult(r.id, 'unit', e.target.value)}
                            className="h-7 text-xs w-16"
                            placeholder="%"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={r.min_threshold ?? ''}
                            onChange={(e) => updateResult(r.id, 'min_threshold', e.target.value ? parseFloat(e.target.value) : null)}
                            className="h-7 text-xs w-16"
                            step="any"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={r.max_threshold ?? ''}
                            onChange={(e) => updateResult(r.id, 'max_threshold', e.target.value ? parseFloat(e.target.value) : null)}
                            className="h-7 text-xs w-16"
                            step="any"
                          />
                        </TableCell>
                        <TableCell>
                          <ResultBadge passed={r.passed} />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => deleteResult(r.id)} className="h-7 w-7 p-0">
                            <Trash2 className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow key={r.id} className={r.passed === false ? 'bg-red-50/50 dark:bg-red-950/10' : r.passed === true ? 'bg-green-50/50 dark:bg-green-950/10' : ''}>
                        <TableCell className="font-medium">{r.parameter}</TableCell>
                        <TableCell>{r.value}</TableCell>
                        <TableCell>{r.numeric_value != null ? r.numeric_value : '—'}</TableCell>
                        <TableCell>{r.unit || '—'}</TableCell>
                        <TableCell>{r.min_threshold != null ? r.min_threshold : '—'}</TableCell>
                        <TableCell>{r.max_threshold != null ? r.max_threshold : '—'}</TableCell>
                        <TableCell>
                          <ResultBadge passed={r.passed} />
                        </TableCell>
                      </TableRow>
                    ),
                  )
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* CoA Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Certificado de Análisis (CoA)</CardTitle>
        </CardHeader>
        <CardContent>
          {coaDocs.length > 0 ? (
            <div className="space-y-2">
              {coaDocs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">{doc.doc_type_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.document_number || 'Sin número'} · {doc.issue_date}
                      {doc.expiry_date && ` · Expira: ${doc.expiry_date}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{doc.status}</Badge>
                    {doc.file_path && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/regulatory/documents/${doc.id}`)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/regulatory/documents/${doc.id}`)}
                    >
                      Ver documento
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No hay CoA vinculado a este test.{' '}
              {canEdit && (
                <span
                  className="text-primary cursor-pointer hover:underline"
                  onClick={() => router.push('/regulatory/documents')}
                >
                  Crear desde documentos regulatorios
                </span>
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Complete Test Dialog */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Completar test de calidad</DialogTitle>
            <DialogDescription>
              {totalParams} parámetros evaluados: {passedCount} aprobados, {failedCount} fallidos
              {pendingCount > 0 && `, ${pendingCount} sin evaluación automática`}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">
              Resultado general:{' '}
              {failedCount > 0 ? (
                <Badge className="bg-red-100 text-red-700">FAIL</Badge>
              ) : pendingCount > 0 ? (
                <span className="text-muted-foreground">Hay parámetros sin evaluación — se marcarán como aprobados</span>
              ) : (
                <Badge className="bg-green-100 text-green-700">PASS</Badge>
              )}
            </p>
            {!resultDate && (
              <div className="mt-3 grid gap-1">
                <Label className="text-xs">Fecha de resultado *</Label>
                <Input
                  type="date"
                  value={resultDate}
                  onChange={(e) => setResultDate(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteOpen(false)}>Cancelar</Button>
            <Button onClick={completeTest}>Completar test</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Failed Dialog */}
      <AlertDialog open={failOpen} onOpenChange={setFailOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar test como fallido</AlertDialogTitle>
            <AlertDialogDescription>
              Esto indica que el análisis no se pudo completar correctamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label className="text-xs">Razón *</Label>
            <Textarea
              value={failReason}
              onChange={(e) => setFailReason(e.target.value)}
              placeholder="Describe por qué el test falló"
              rows={2}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={markFailed} className="bg-destructive text-destructive-foreground">
              Marcar fallido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ---------- Subcomponent ----------

function ResultBadge({ passed }: { passed: boolean | null }) {
  if (passed === true) return <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><Check className="mr-1 h-3 w-3" /> Pass</Badge>
  if (passed === false) return <Badge variant="outline" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"><X className="mr-1 h-3 w-3" /> Fail</Badge>
  return <Badge variant="outline" className="bg-gray-100 text-gray-500"><Minus className="mr-1 h-3 w-3" /> —</Badge>
}
