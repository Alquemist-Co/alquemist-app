'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

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
import { Textarea } from '@/components/ui/textarea'
import { createQualityTest } from '@/lib/actions/quality-tests'

// ---------- Types ----------

type PhaseOption = {
  id: string
  name: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  batchId: string
  currentPhaseId: string
  phases: PhaseOption[]
}

// Input style matching existing select style
const inputClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

// Common test types for autocomplete suggestions
const TEST_TYPE_SUGGESTIONS = [
  'Potencia (THC/CBD)',
  'Perfil de terpenos',
  'Contaminantes microbiológicos',
  'Metales pesados',
  'Pesticidas',
  'Solventes residuales',
  'Micotoxinas',
  'Humedad',
  'Densidad',
  'pH',
]

// ---------- Component ----------

export function CreateTestDialog({
  open,
  onOpenChange,
  batchId,
  currentPhaseId,
  phases,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Form state
  const [testType, setTestType] = useState('')
  const [phaseId, setPhaseId] = useState(currentPhaseId)
  const [labName, setLabName] = useState('')
  const [labReference, setLabReference] = useState('')
  const [sampleDate, setSampleDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')

  // Handle dialog open - reset form
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setTestType('')
      setPhaseId(currentPhaseId)
      setLabName('')
      setLabReference('')
      setSampleDate(new Date().toISOString().split('T')[0])
      setNotes('')
    }
    onOpenChange(newOpen)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!testType.trim()) {
      toast.error('Ingresa el tipo de test')
      return
    }

    if (!sampleDate) {
      toast.error('Selecciona la fecha de muestra')
      return
    }

    setLoading(true)

    const result = await createQualityTest({
      batchId,
      testType: testType.trim(),
      phaseId: phaseId || null,
      labName: labName.trim() || null,
      labReference: labReference.trim() || null,
      sampleDate,
      notes: notes.trim() || null,
    })

    setLoading(false)

    if (result.success) {
      toast.success('Test de calidad creado exitosamente')
      onOpenChange(false)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear test de calidad</DialogTitle>
          <DialogDescription>
            Registra un nuevo test de calidad para este lote.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <Label htmlFor="test-type">Tipo de test *</Label>
            <input
              id="test-type"
              type="text"
              value={testType}
              onChange={(e) => setTestType(e.target.value)}
              placeholder="Ej: Potencia (THC/CBD)"
              className={inputClass + ' mt-1.5'}
              list="test-type-suggestions"
              autoComplete="off"
            />
            <datalist id="test-type-suggestions">
              {TEST_TYPE_SUGGESTIONS.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          </div>

          <div>
            <Label htmlFor="phase">Fase</Label>
            <select
              id="phase"
              value={phaseId}
              onChange={(e) => setPhaseId(e.target.value)}
              className={inputClass + ' mt-1.5'}
            >
              <option value="">Sin fase asignada</option>
              {phases.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lab-name">Laboratorio</Label>
              <input
                id="lab-name"
                type="text"
                value={labName}
                onChange={(e) => setLabName(e.target.value)}
                placeholder="Nombre del laboratorio"
                className={inputClass + ' mt-1.5'}
              />
            </div>
            <div>
              <Label htmlFor="lab-ref">Referencia lab.</Label>
              <input
                id="lab-ref"
                type="text"
                value={labReference}
                onChange={(e) => setLabReference(e.target.value)}
                placeholder="# de muestra"
                className={inputClass + ' mt-1.5'}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="sample-date">Fecha de muestra *</Label>
            <input
              id="sample-date"
              type="date"
              value={sampleDate}
              onChange={(e) => setSampleDate(e.target.value)}
              className={inputClass + ' mt-1.5'}
            />
          </div>

          <div>
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionales..."
              className="mt-1.5 min-h-[80px]"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creando...' : 'Crear test'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
