'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Check, X, Minus, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  type QualityTestRow,
  type BatchOption,
  type PhaseOption,
  testStatusLabels,
  testStatusBadgeStyles,
  TEST_TYPE_SUGGESTIONS,
} from './quality-shared'
import { createQualityTestSchema } from '@/schemas/quality'
import { createClient } from '@/lib/supabase/client'

type Props = {
  tests: QualityTestRow[]
  batches: BatchOption[]
  phases: PhaseOption[]
  totalPages: number
  totalCount: number
  pageSize: number
  currentPage: number
  canCreate: boolean
  userId: string
  kpis: {
    pending: number
    in_progress: number
    completed_month: number
    failed_month: number
  }
  filters: {
    status: string
    test_type: string
    batch: string
    cultivar: string
    facility: string
    date_from: string
    date_to: string
    result: string
    search: string
  }
}

export function QualityTestsListClient({
  tests,
  batches,
  phases,
  totalPages,
  totalCount,
  currentPage,
  canCreate,
  userId,
  kpis,
  filters,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [searchValue, setSearchValue] = useState(filters.search)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  // Create form state
  const [formBatchId, setFormBatchId] = useState('')
  const [formPhaseId, setFormPhaseId] = useState('')
  const [formTestType, setFormTestType] = useState('')
  const [formLabName, setFormLabName] = useState('')
  const [formLabRef, setFormLabRef] = useState('')
  const [formSampleDate, setFormSampleDate] = useState(new Date().toISOString().split('T')[0])
  const [formNotes, setFormNotes] = useState('')

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value)
        else params.delete(key)
      }
      if (!('page' in updates)) params.delete('page')
      router.push(`/quality/tests?${params.toString()}`)
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
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchValue, filters.search, updateParams])

  function goToPage(page: number) {
    updateParams({ page: page > 1 ? String(page) : '' })
  }

  // When batch changes, pre-select its phase
  function handleBatchChange(batchId: string) {
    setFormBatchId(batchId)
    const batch = batches.find((b) => b.id === batchId)
    if (batch?.phase_id) setFormPhaseId(batch.phase_id)
  }

  async function handleCreate() {
    const parsed = createQualityTestSchema.safeParse({
      batch_id: formBatchId,
      phase_id: formPhaseId,
      test_type: formTestType,
      lab_name: formLabName,
      lab_reference: formLabRef,
      sample_date: formSampleDate,
      notes: formNotes,
    })

    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message)
      return
    }

    setCreating(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('quality_tests')
      .insert({
        batch_id: parsed.data.batch_id,
        phase_id: parsed.data.phase_id,
        test_type: parsed.data.test_type,
        lab_name: parsed.data.lab_name || null,
        lab_reference: parsed.data.lab_reference || null,
        sample_date: parsed.data.sample_date,
        notes: parsed.data.notes || null,
        status: 'pending',
        performed_by: userId,
      })
      .select('id')
      .single()

    setCreating(false)

    if (error) {
      toast.error('Error al crear el test de calidad.')
      return
    }

    toast.success('Test de calidad creado exitosamente.')
    setDialogOpen(false)
    resetForm()
    router.push(`/quality/tests/${data.id}`)
  }

  function resetForm() {
    setFormBatchId('')
    setFormPhaseId('')
    setFormTestType('')
    setFormLabName('')
    setFormLabRef('')
    setFormSampleDate(new Date().toISOString().split('T')[0])
    setFormNotes('')
  }

  const kpiCards = [
    { label: 'Pendientes', value: kpis.pending, style: 'text-yellow-600' },
    { label: 'En progreso', value: kpis.in_progress, style: 'text-blue-600' },
    { label: 'Completados (mes)', value: kpis.completed_month, style: 'text-green-600' },
    { label: 'Fallidos (mes)', value: kpis.failed_month, style: 'text-red-600' },
  ]

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {kpiCards.map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className={`text-2xl font-bold ${k.style}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters + Create */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por tipo, referencia lab..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-8"
          />
        </div>

        <Select
          value={filters.status || 'all'}
          onValueChange={(v) => updateParams({ status: v === 'all' ? '' : v })}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="in_progress">En progreso</SelectItem>
            <SelectItem value="completed">Completado</SelectItem>
            <SelectItem value="failed">Fallido</SelectItem>
            <SelectItem value="rejected">Rechazado</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.result || 'all'}
          onValueChange={(v) => updateParams({ result: v === 'all' ? '' : v })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Resultado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pass">Aprobado</SelectItem>
            <SelectItem value="fail">Fallido</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto">
          {canCreate && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-1 h-4 w-4" />
                  Nuevo test
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Nuevo Test de Calidad</DialogTitle>
                  <DialogDescription>
                    Crea un nuevo test de calidad vinculado a un lote.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="batch">Lote *</Label>
                    <Select value={formBatchId} onValueChange={handleBatchChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un lote" />
                      </SelectTrigger>
                      <SelectContent>
                        {batches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.code} — {b.cultivar_name} ({b.phase_name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phase">Fase de muestreo *</Label>
                    <Select value={formPhaseId} onValueChange={setFormPhaseId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una fase" />
                      </SelectTrigger>
                      <SelectContent>
                        {phases.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="test_type">Tipo de test *</Label>
                    <Select value={formTestType} onValueChange={setFormTestType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona o escribe" />
                      </SelectTrigger>
                      <SelectContent>
                        {TEST_TYPE_SUGGESTIONS.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="lab_name">Laboratorio</Label>
                      <Input
                        id="lab_name"
                        value={formLabName}
                        onChange={(e) => setFormLabName(e.target.value)}
                        placeholder="Nombre del lab"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="lab_ref">Referencia lab</Label>
                      <Input
                        id="lab_ref"
                        value={formLabRef}
                        onChange={(e) => setFormLabRef(e.target.value)}
                        placeholder="Nro. muestra"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sample_date">Fecha de muestreo *</Label>
                    <Input
                      id="sample_date"
                      type="date"
                      value={formSampleDate}
                      onChange={(e) => setFormSampleDate(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="notes">Notas</Label>
                    <Textarea
                      id="notes"
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="Observaciones adicionales"
                      rows={2}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreate} disabled={creating}>
                    {creating ? 'Creando...' : 'Crear test'}
                  </Button>
                </DialogFooter>
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
              <TableHead>Lote</TableHead>
              <TableHead>Cultivar</TableHead>
              <TableHead>Fase</TableHead>
              <TableHead>Laboratorio</TableHead>
              <TableHead>Fecha muestreo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead className="text-right">Parámetros</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No se encontraron tests de calidad.
                </TableCell>
              </TableRow>
            ) : (
              tests.map((t) => (
                <TableRow
                  key={t.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/quality/tests/${t.id}`)}
                >
                  <TableCell className="font-medium">{t.test_type}</TableCell>
                  <TableCell>
                    <span className="text-primary hover:underline">{t.batch_code}</span>
                  </TableCell>
                  <TableCell>{t.cultivar_name}</TableCell>
                  <TableCell>{t.phase_name}</TableCell>
                  <TableCell className="text-muted-foreground">{t.lab_name || '—'}</TableCell>
                  <TableCell>{t.sample_date}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={testStatusBadgeStyles[t.status] || ''}>
                      {testStatusLabels[t.status] || t.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {t.overall_pass === true && <Check className="h-4 w-4 text-green-600" />}
                    {t.overall_pass === false && <X className="h-4 w-4 text-red-600" />}
                    {t.overall_pass == null && <Minus className="h-4 w-4 text-muted-foreground" />}
                  </TableCell>
                  <TableCell className="text-right">{t.results_count}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
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
