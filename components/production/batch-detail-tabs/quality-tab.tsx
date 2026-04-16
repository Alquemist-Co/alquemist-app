'use client'

import { Fragment, useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Plus, FlaskConical, FileText, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { rejectQualityTest } from '@/lib/actions/quality-tests'
import { CreateTestDialog } from './create-test-dialog'
import { CaptureResultsDialog } from './capture-results-dialog'

// ---------- Types ----------

export type QualityTestResultData = {
  id: string
  parameter: string
  value: string
  numeric_value: number | null
  unit: string | null
  min_threshold: number | null
  max_threshold: number | null
  passed: boolean | null
}

export type QualityTestData = {
  id: string
  test_type: string
  lab_name: string | null
  lab_reference: string | null
  sample_date: string
  result_date: string | null
  status: string
  overall_pass: boolean | null
  notes: string | null
  performed_by: string | null
  performer_name: string | null
  phase_id: string | null
  phase_name: string | null
  results: QualityTestResultData[]
}

type PhaseGroup = {
  id: string
  name: string
  sort_order: number
}

type Props = {
  phases: PhaseGroup[]
  tests: QualityTestData[]
  batchId: string
  currentPhaseId: string
  canCreate: boolean
  canCapture: boolean
  canReject: boolean
}

// ---------- Helpers ----------

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  completed: 'Completado',
  failed: 'Fallido',
  rejected: 'Rechazado',
}

const statusBadgeStyles: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  rejected: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
}

function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Date(date + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function OverallPassBadge({ value }: { value: boolean | null }) {
  if (value === null) {
    return (
      <Badge variant="outline" className="gap-1">
        <Clock className="h-3 w-3" />
        Pendiente
      </Badge>
    )
  }
  if (value) {
    return (
      <Badge className="gap-1 bg-green-600">
        <CheckCircle2 className="h-3 w-3" />
        APROBADO
      </Badge>
    )
  }
  return (
    <Badge className="gap-1 bg-red-600">
      <XCircle className="h-3 w-3" />
      FALLIDO
    </Badge>
  )
}

function ResultPassedBadge({ value }: { value: boolean | null }) {
  if (value === null) {
    return <Badge variant="outline">—</Badge>
  }
  if (value) {
    return <Badge className="bg-green-600">OK</Badge>
  }
  return <Badge className="bg-red-600">FALLO</Badge>
}

// ---------- Component ----------

export function QualityTab({
  phases,
  tests,
  batchId,
  currentPhaseId,
  canCreate,
  canCapture,
  canReject,
}: Props) {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set([currentPhaseId]))
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set())
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [captureTest, setCaptureTest] = useState<QualityTestData | null>(null)

  // Group tests by phase
  const testsByPhase = useMemo(() => {
    const map = new Map<string, QualityTestData[]>()

    // Initialize all phases
    for (const p of phases) {
      map.set(p.id, [])
    }
    // Add "sin fase" group for tests without phase
    map.set('no-phase', [])

    for (const test of tests) {
      const phaseId = test.phase_id ?? 'no-phase'
      const list = map.get(phaseId)
      if (list) {
        list.push(test)
      } else {
        // Phase not in production order phases - add to no-phase
        const noPhaseList = map.get('no-phase')!
        noPhaseList.push(test)
      }
    }

    return map
  }, [phases, tests])

  // Calculate stats per phase
  const phaseStats = useMemo(() => {
    const stats = new Map<string, { total: number; pending: number; failed: number }>()

    for (const [phaseId, phaseTests] of testsByPhase) {
      stats.set(phaseId, {
        total: phaseTests.length,
        pending: phaseTests.filter((t) => ['pending', 'in_progress'].includes(t.status)).length,
        failed: phaseTests.filter((t) => t.status === 'failed').length,
      })
    }

    return stats
  }, [testsByPhase])

  const togglePhase = (phaseId: string) => {
    const next = new Set(expandedPhases)
    if (next.has(phaseId)) {
      next.delete(phaseId)
    } else {
      next.add(phaseId)
    }
    setExpandedPhases(next)
  }

  const toggleTest = (testId: string) => {
    const next = new Set(expandedTests)
    if (next.has(testId)) {
      next.delete(testId)
    } else {
      next.add(testId)
    }
    setExpandedTests(next)
  }

  // Build display phases (sorted)
  const displayPhases = useMemo(() => {
    const result: Array<{ id: string; name: string; sort_order: number }> = []

    // Add actual phases
    for (const p of phases) {
      result.push(p)
    }

    // Add "sin fase" if there are tests without phase
    if ((testsByPhase.get('no-phase')?.length ?? 0) > 0) {
      result.push({ id: 'no-phase', name: 'Sin fase asignada', sort_order: 9999 })
    }

    return result.sort((a, b) => a.sort_order - b.sort_order)
  }, [phases, testsByPhase])

  if (tests.length === 0 && !canCreate) {
    return (
      <div className="rounded-lg border p-6 text-center">
        <FlaskConical className="mx-auto h-10 w-10 text-muted-foreground" />
        <h3 className="mt-3 text-lg font-medium">Sin tests de calidad</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          No hay tests de calidad registrados para este lote.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with create button */}
      {canCreate && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Crear test
          </Button>
        </div>
      )}

      {/* Empty state when no tests */}
      {tests.length === 0 && (
        <div className="rounded-lg border p-6 text-center">
          <FlaskConical className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-3 text-lg font-medium">Sin tests de calidad</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Usa el botón &ldquo;Crear test&rdquo; para registrar un nuevo test de calidad.
          </p>
        </div>
      )}

      {/* Phase groups */}
      {displayPhases.map((phase) => {
        const phaseTests = testsByPhase.get(phase.id) ?? []
        const stats = phaseStats.get(phase.id) ?? { total: 0, pending: 0, failed: 0 }

        if (stats.total === 0) return null

        const isExpanded = expandedPhases.has(phase.id)

        return (
          <Collapsible
            key={phase.id}
            open={isExpanded}
            onOpenChange={() => togglePhase(phase.id)}
          >
            <CollapsibleTrigger asChild>
              <button className="flex w-full items-center gap-2 rounded-md border bg-muted/50 px-4 py-3 text-left hover:bg-muted/80 transition-colors">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-medium">{phase.name}</span>
                <span className="text-sm text-muted-foreground">
                  — {stats.total} test{stats.total !== 1 ? 's' : ''}
                </span>
                {stats.pending > 0 && (
                  <Badge variant="outline" className="ml-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                    {stats.pending} pendiente{stats.pending !== 1 ? 's' : ''}
                  </Badge>
                )}
                {stats.failed > 0 && (
                  <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    {stats.failed} fallido{stats.failed !== 1 ? 's' : ''}
                  </Badge>
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Laboratorio</TableHead>
                      <TableHead>Ref.</TableHead>
                      <TableHead>Fecha muestra</TableHead>
                      <TableHead>Fecha resultado</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Resultado</TableHead>
                      <TableHead>Params</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {phaseTests.map((test) => {
                      const isTestExpanded = expandedTests.has(test.id)
                      const canCaptureThis = canCapture && ['pending', 'in_progress'].includes(test.status)
                      const canRejectThis = canReject && ['pending', 'in_progress'].includes(test.status)

                      return (
                        <Fragment key={test.id}>
                          <TableRow className="group">
                            <TableCell>
                              {test.results.length > 0 && (
                                <button
                                  onClick={() => toggleTest(test.id)}
                                  className="p-1 hover:bg-muted rounded"
                                >
                                  {isTestExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </button>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{test.test_type}</TableCell>
                            <TableCell>{test.lab_name ?? '—'}</TableCell>
                            <TableCell>{test.lab_reference ?? '—'}</TableCell>
                            <TableCell>{formatDate(test.sample_date)}</TableCell>
                            <TableCell>{formatDate(test.result_date)}</TableCell>
                            <TableCell>
                              <Badge className={statusBadgeStyles[test.status] ?? ''}>
                                {statusLabels[test.status] ?? test.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <OverallPassBadge value={test.overall_pass} />
                            </TableCell>
                            <TableCell>{test.results.length}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {canCaptureThis && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setCaptureTest(test)}
                                  >
                                    <FileText className="mr-1 h-3.5 w-3.5" />
                                    Capturar
                                  </Button>
                                )}
                                {canRejectThis && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    onClick={async () => {
                                      const res = await rejectQualityTest({ testId: test.id, batchId })
                                      if (res.success) {
                                        toast.success('Test rechazado')
                                      } else {
                                        toast.error(res.error ?? 'Error al rechazar')
                                      }
                                    }}
                                  >
                                    <XCircle className="mr-1 h-3.5 w-3.5" />
                                    Rechazar
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                          {isTestExpanded && test.results.length > 0 && (
                            <TableRow key={`${test.id}-results`}>
                              <TableCell colSpan={10} className="bg-muted/30 p-0">
                                <div className="p-4">
                                  <h4 className="text-sm font-medium mb-2">Resultados del test</h4>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Parámetro</TableHead>
                                        <TableHead>Valor</TableHead>
                                        <TableHead>Valor numérico</TableHead>
                                        <TableHead>Unidad</TableHead>
                                        <TableHead>Mín</TableHead>
                                        <TableHead>Máx</TableHead>
                                        <TableHead>Resultado</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {test.results.map((result) => (
                                        <TableRow key={result.id}>
                                          <TableCell className="font-medium">{result.parameter}</TableCell>
                                          <TableCell>{result.value}</TableCell>
                                          <TableCell>
                                            {result.numeric_value != null ? result.numeric_value : '—'}
                                          </TableCell>
                                          <TableCell>{result.unit ?? '—'}</TableCell>
                                          <TableCell>
                                            {result.min_threshold != null ? result.min_threshold : '—'}
                                          </TableCell>
                                          <TableCell>
                                            {result.max_threshold != null ? result.max_threshold : '—'}
                                          </TableCell>
                                          <TableCell>
                                            <ResultPassedBadge value={result.passed} />
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                  {test.notes && (
                                    <div className="mt-3 text-sm">
                                      <strong>Notas:</strong> {test.notes}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )
      })}

      {/* Create Test Dialog */}
      <CreateTestDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        batchId={batchId}
        currentPhaseId={currentPhaseId}
        phases={phases}
      />

      {/* Capture Results Dialog */}
      {captureTest && (
        <CaptureResultsDialog
          open={true}
          onOpenChange={(open) => !open && setCaptureTest(null)}
          test={captureTest}
          batchId={batchId}
        />
      )}
    </div>
  )
}
