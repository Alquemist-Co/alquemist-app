'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { captureTestResults, completeQualityTest } from '@/lib/actions/quality-tests'
import type { QualityTestData } from './quality-tab'

// ---------- Types ----------

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  test: QualityTestData
  batchId: string
}

type ResultRow = {
  id: string | null // null for new rows
  parameter: string
  value: string
  numeric_value: string
  unit: string
  min_threshold: string
  max_threshold: string
}

// Input style
const inputClass =
  'flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

// Preset templates for common test types
const PRESETS: Record<string, Array<Omit<ResultRow, 'id'>>> = {
  potency: [
    { parameter: 'THC Total', value: '', numeric_value: '', unit: '%', min_threshold: '', max_threshold: '30' },
    { parameter: 'CBD Total', value: '', numeric_value: '', unit: '%', min_threshold: '', max_threshold: '' },
    { parameter: 'THCA', value: '', numeric_value: '', unit: '%', min_threshold: '', max_threshold: '' },
    { parameter: 'CBDA', value: '', numeric_value: '', unit: '%', min_threshold: '', max_threshold: '' },
    { parameter: 'CBN', value: '', numeric_value: '', unit: '%', min_threshold: '', max_threshold: '1' },
  ],
  terpenes: [
    { parameter: 'Terpenos totales', value: '', numeric_value: '', unit: '%', min_threshold: '', max_threshold: '' },
    { parameter: 'Mirceno', value: '', numeric_value: '', unit: '%', min_threshold: '', max_threshold: '' },
    { parameter: 'Limoneno', value: '', numeric_value: '', unit: '%', min_threshold: '', max_threshold: '' },
    { parameter: 'Cariofileno', value: '', numeric_value: '', unit: '%', min_threshold: '', max_threshold: '' },
    { parameter: 'Pineno', value: '', numeric_value: '', unit: '%', min_threshold: '', max_threshold: '' },
  ],
  microbiology: [
    { parameter: 'Mesófilos aerobios', value: '', numeric_value: '', unit: 'UFC/g', min_threshold: '', max_threshold: '10000' },
    { parameter: 'Coliformes totales', value: '', numeric_value: '', unit: 'UFC/g', min_threshold: '', max_threshold: '100' },
    { parameter: 'E. coli', value: '', numeric_value: '', unit: 'UFC/g', min_threshold: '', max_threshold: '0' },
    { parameter: 'Salmonella', value: 'Ausente', numeric_value: '', unit: '/25g', min_threshold: '', max_threshold: '' },
    { parameter: 'Mohos y levaduras', value: '', numeric_value: '', unit: 'UFC/g', min_threshold: '', max_threshold: '1000' },
  ],
  heavyMetals: [
    { parameter: 'Plomo (Pb)', value: '', numeric_value: '', unit: 'ppm', min_threshold: '', max_threshold: '0.5' },
    { parameter: 'Arsénico (As)', value: '', numeric_value: '', unit: 'ppm', min_threshold: '', max_threshold: '0.2' },
    { parameter: 'Cadmio (Cd)', value: '', numeric_value: '', unit: 'ppm', min_threshold: '', max_threshold: '0.2' },
    { parameter: 'Mercurio (Hg)', value: '', numeric_value: '', unit: 'ppm', min_threshold: '', max_threshold: '0.1' },
  ],
}

// ---------- Component ----------

export function CaptureResultsDialog({
  open,
  onOpenChange,
  test,
  batchId,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [resultDate, setResultDate] = useState(
    test.result_date || new Date().toISOString().split('T')[0]
  )

  // Initialize rows from existing results or empty
  const initializeRows = useCallback((): ResultRow[] => {
    if (test.results.length > 0) {
      return test.results.map((r) => ({
        id: r.id,
        parameter: r.parameter,
        value: r.value,
        numeric_value: r.numeric_value?.toString() ?? '',
        unit: r.unit ?? '',
        min_threshold: r.min_threshold?.toString() ?? '',
        max_threshold: r.max_threshold?.toString() ?? '',
      }))
    }
    return []
  }, [test.results])

  const [rows, setRows] = useState<ResultRow[]>(initializeRows)

  const addRow = () => {
    setRows([
      ...rows,
      {
        id: null,
        parameter: '',
        value: '',
        numeric_value: '',
        unit: '',
        min_threshold: '',
        max_threshold: '',
      },
    ])
  }

  const removeRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index))
  }

  const updateRow = (index: number, field: keyof ResultRow, value: string) => {
    setRows(
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    )
  }

  const loadPreset = (presetKey: string) => {
    const preset = PRESETS[presetKey]
    if (preset) {
      setRows(preset.map((p) => ({ ...p, id: null })))
    }
  }

  async function handleSave() {
    // Validate at least one row
    const validRows = rows.filter((r) => r.parameter.trim() && r.value.trim())
    if (validRows.length === 0) {
      toast.error('Agrega al menos un resultado')
      return
    }

    setLoading(true)

    const result = await captureTestResults({
      testId: test.id,
      batchId,
      resultDate,
      results: validRows.map((r) => ({
        id: r.id,
        parameter: r.parameter.trim(),
        value: r.value.trim(),
        numeric_value: r.numeric_value ? parseFloat(r.numeric_value) : null,
        unit: r.unit.trim() || null,
        min_threshold: r.min_threshold ? parseFloat(r.min_threshold) : null,
        max_threshold: r.max_threshold ? parseFloat(r.max_threshold) : null,
      })),
    })

    setLoading(false)

    if (result.success) {
      toast.success('Resultados guardados exitosamente')
      onOpenChange(false)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  async function handleComplete() {
    // First save, then complete
    const validRows = rows.filter((r) => r.parameter.trim() && r.value.trim())
    if (validRows.length === 0) {
      toast.error('Agrega al menos un resultado antes de completar')
      return
    }

    setLoading(true)

    // Save results first
    const saveResult = await captureTestResults({
      testId: test.id,
      batchId,
      resultDate,
      results: validRows.map((r) => ({
        id: r.id,
        parameter: r.parameter.trim(),
        value: r.value.trim(),
        numeric_value: r.numeric_value ? parseFloat(r.numeric_value) : null,
        unit: r.unit.trim() || null,
        min_threshold: r.min_threshold ? parseFloat(r.min_threshold) : null,
        max_threshold: r.max_threshold ? parseFloat(r.max_threshold) : null,
      })),
    })

    if (!saveResult.success) {
      toast.error(saveResult.error)
      setLoading(false)
      return
    }

    // Then complete
    const completeResult = await completeQualityTest({
      testId: test.id,
      batchId,
    })

    setLoading(false)

    if (completeResult.success) {
      toast.success(
        completeResult.overallPass
          ? 'Test completado - APROBADO'
          : 'Test completado - FALLIDO'
      )
      onOpenChange(false)
      router.refresh()
    } else {
      toast.error(completeResult.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Capturar resultados</DialogTitle>
          <DialogDescription>
            Test: {test.test_type}
            {test.lab_reference && ` — Ref: ${test.lab_reference}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Result date */}
          <div className="flex items-center gap-4">
            <div>
              <Label htmlFor="result-date">Fecha de resultado</Label>
              <input
                id="result-date"
                type="date"
                value={resultDate}
                onChange={(e) => setResultDate(e.target.value)}
                className={inputClass + ' mt-1.5 w-40'}
              />
            </div>

            {/* Preset buttons */}
            <div className="flex-1">
              <Label>Presets</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => loadPreset('potency')}
                >
                  Potencia
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => loadPreset('terpenes')}
                >
                  Terpenos
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => loadPreset('microbiology')}
                >
                  Microbiología
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => loadPreset('heavyMetals')}
                >
                  Metales pesados
                </Button>
              </div>
            </div>
          </div>

          {/* Results table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Parámetro *</TableHead>
                  <TableHead className="w-[120px]">Valor *</TableHead>
                  <TableHead className="w-[100px]">Numérico</TableHead>
                  <TableHead className="w-[80px]">Unidad</TableHead>
                  <TableHead className="w-[80px]">Mín</TableHead>
                  <TableHead className="w-[80px]">Máx</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Sin resultados. Agrega parámetros manualmente o usa un preset.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, index) => (
                    <TableRow key={row.id ?? `new-${index}`}>
                      <TableCell>
                        <input
                          type="text"
                          value={row.parameter}
                          onChange={(e) => updateRow(index, 'parameter', e.target.value)}
                          placeholder="Parámetro"
                          className={inputClass}
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          type="text"
                          value={row.value}
                          onChange={(e) => updateRow(index, 'value', e.target.value)}
                          placeholder="Valor"
                          className={inputClass}
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          type="number"
                          step="any"
                          value={row.numeric_value}
                          onChange={(e) => updateRow(index, 'numeric_value', e.target.value)}
                          placeholder="0.00"
                          className={inputClass}
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          type="text"
                          value={row.unit}
                          onChange={(e) => updateRow(index, 'unit', e.target.value)}
                          placeholder="%"
                          className={inputClass}
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          type="number"
                          step="any"
                          value={row.min_threshold}
                          onChange={(e) => updateRow(index, 'min_threshold', e.target.value)}
                          placeholder="Min"
                          className={inputClass}
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          type="number"
                          step="any"
                          value={row.max_threshold}
                          onChange={(e) => updateRow(index, 'max_threshold', e.target.value)}
                          placeholder="Max"
                          className={inputClass}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRow(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Agregar parámetro
          </Button>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Guardando...' : 'Guardar borrador'}
          </Button>
          <Button type="button" onClick={handleComplete} disabled={loading}>
            {loading ? 'Completando...' : 'Guardar y completar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
