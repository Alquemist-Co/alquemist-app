'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Plus,
  Pencil,
  Power,
  Copy,
  ChevronDown,
  ChevronRight,
  Trash2,
  AlertTriangle,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
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

import { DetailPageHeader } from './detail-page-header'
import {
  type CultivarRow,
  type PhaseRow,
  type FlowRow,
  type Category,
  type Unit,
  type CultivarSummary,
  roleLabels,
  roleBadgeStyles,
  selectClass,
  CultivarDialog,
  CopyFlowsDialog,
} from './cultivars-shared'

type Props = {
  cultivar: CultivarRow
  cropTypeName: string
  phases: PhaseRow[]
  flows: FlowRow[]
  allCultivars: CultivarSummary[]
  categories: Category[]
  units: Unit[]
  canWrite: boolean
}

export function CultivarDetailClient({
  cultivar,
  cropTypeName,
  phases,
  flows,
  allCultivars,
  categories,
  units,
  canWrite,
}: Props) {
  const router = useRouter()
  const [ctDialogOpen, setCtDialogOpen] = useState(false)
  const [deactivating, setDeactivating] = useState(false)

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    general: true,
    durations: false,
    profile: false,
    conditions: false,
    flows: true,
  })

  function toggle(key: string) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleToggle() {
    const supabase = createClient()
    const { error } = await supabase
      .from('cultivars')
      .update({ is_active: !cultivar.is_active })
      .eq('id', cultivar.id)
    if (error) {
      toast.error('Error al cambiar el estado.')
      return
    }
    toast.success(cultivar.is_active ? 'Cultivar desactivado.' : 'Cultivar reactivado.')
    if (cultivar.is_active) {
      router.push('/settings/cultivars')
    } else {
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <DetailPageHeader
        backHref="/settings/cultivars"
        backLabel="Cultivares"
        title={cultivar.name}
        subtitle={`${cropTypeName} · ${cultivar.code}`}
        badges={
          !cultivar.is_active ? (
            <Badge variant="secondary" className="bg-gray-100 text-gray-500 text-xs">
              Inactivo
            </Badge>
          ) : undefined
        }
        actions={
          canWrite ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setCtDialogOpen(true)}>
                <Pencil className="mr-1.5 h-4 w-4" />
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (cultivar.is_active) setDeactivating(true)
                  else handleToggle()
                }}
              >
                <Power className="mr-1.5 h-4 w-4" />
                {cultivar.is_active ? 'Desactivar' : 'Reactivar'}
              </Button>
            </>
          ) : undefined
        }
      />

      {/* Collapsible sections */}
      <CollapsibleSection title="Datos Generales" sectionKey="general" open={openSections.general} onToggle={toggle}>
        <GeneralSection cultivar={cultivar} />
      </CollapsibleSection>

      <CollapsibleSection title="Duración por Fase" sectionKey="durations" open={openSections.durations} onToggle={toggle}>
        <PhaseDurationsSection cultivar={cultivar} phases={phases} canWrite={canWrite} />
      </CollapsibleSection>

      <CollapsibleSection title="Perfil Objetivo" sectionKey="profile" open={openSections.profile} onToggle={toggle}>
        <TargetProfileSection cultivar={cultivar} canWrite={canWrite} />
      </CollapsibleSection>

      <CollapsibleSection title="Condiciones Óptimas" sectionKey="conditions" open={openSections.conditions} onToggle={toggle}>
        <OptimalConditionsSection cultivar={cultivar} canWrite={canWrite} />
      </CollapsibleSection>

      <CollapsibleSection title="Flujos de Producción por Fase" sectionKey="flows" open={openSections.flows} onToggle={toggle}>
        <PhaseFlowsSection
          cultivar={cultivar}
          phases={phases}
          flows={flows}
          allCultivars={allCultivars}
          categories={categories}
          units={units}
          canWrite={canWrite}
        />
      </CollapsibleSection>

      {/* Edit dialog */}
      <CultivarDialog
        open={ctDialogOpen}
        onOpenChange={(o) => { if (!o) setCtDialogOpen(false); else setCtDialogOpen(true) }}
        cultivar={cultivar}
        cropTypeId={cultivar.crop_type_id}
        onSuccess={() => {
          setCtDialogOpen(false)
          router.refresh()
        }}
      />

      {/* Deactivate confirm */}
      <AlertDialog open={deactivating} onOpenChange={(o) => !o && setDeactivating(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar cultivar</AlertDialogTitle>
            <AlertDialogDescription>
              Desactivar &quot;{cultivar.name}&quot; impedirá crear nuevas órdenes de producción con este cultivar. ¿Continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { handleToggle(); setDeactivating(false) }}>
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ================================================================
// COLLAPSIBLE SECTION
// ================================================================

function CollapsibleSection({
  title,
  sectionKey,
  open,
  onToggle,
  children,
}: {
  title: string
  sectionKey: string
  open: boolean
  onToggle: (key: string) => void
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader
        className="cursor-pointer flex flex-row items-center justify-between space-y-0 py-3 px-4"
        onClick={() => onToggle(sectionKey)}
      >
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </CardHeader>
      {open && <CardContent className="px-4 pb-4 pt-0">{children}</CardContent>}
    </Card>
  )
}

// ================================================================
// SECTION 1: GENERAL
// ================================================================

function GeneralSection({ cultivar }: { cultivar: CultivarRow }) {
  const fields: [string, string | number | null][] = [
    ['Código', cultivar.code],
    ['Nombre', cultivar.name],
    ['Breeder', cultivar.breeder],
    ['Genetics', cultivar.genetics],
    ['Ciclo total', cultivar.default_cycle_days ? `${cultivar.default_cycle_days} días` : null],
    ['Yield/planta', cultivar.expected_yield_per_plant_g ? `${cultivar.expected_yield_per_plant_g} g` : null],
    ['Ratio seco', cultivar.expected_dry_ratio != null ? `${cultivar.expected_dry_ratio}` : null],
    ['Quality grade', cultivar.quality_grade],
    ['Densidad', cultivar.density_plants_per_m2 ? `${cultivar.density_plants_per_m2} pl/m²` : null],
  ]

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
      {fields.map(([label, value]) => (
        <div key={label}>
          <span className="text-muted-foreground">{label}:</span>{' '}
          <span className="font-medium">{value || '—'}</span>
        </div>
      ))}
      {cultivar.notes && (
        <div className="col-span-full mt-2">
          <span className="text-muted-foreground">Notas:</span>{' '}
          <span>{cultivar.notes}</span>
        </div>
      )}
    </div>
  )
}

// ================================================================
// SECTION 2: PHASE DURATIONS
// ================================================================

function PhaseDurationsSection({
  cultivar,
  phases,
  canWrite,
}: {
  cultivar: CultivarRow
  phases: PhaseRow[]
  canWrite: boolean
}) {
  const router = useRouter()
  const [durations, setDurations] = useState<Record<string, number | null>>(
    () => {
      const d: Record<string, number | null> = {}
      for (const p of phases) {
        d[p.id] = cultivar.phase_durations?.[p.id] ?? null
      }
      return d
    }
  )
  const [saving, setSaving] = useState(false)

  const total = phases.reduce((sum, p) => {
    const val = durations[p.id] ?? p.default_duration_days
    return sum + (val ?? 0)
  }, 0)

  async function save() {
    setSaving(true)
    const supabase = createClient()
    const clean: Record<string, number> = {}
    for (const [key, val] of Object.entries(durations)) {
      if (val != null) clean[key] = val
    }
    const { error } = await supabase
      .from('cultivars')
      .update({ phase_durations: clean, default_cycle_days: total || null })
      .eq('id', cultivar.id)
    setSaving(false)
    if (error) {
      toast.error('Error al guardar duraciones.')
      return
    }
    toast.success('Duraciones guardadas.')
    router.refresh()
  }

  if (phases.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay fases configuradas para este tipo de cultivo.</p>
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 font-medium">Fase</th>
              <th className="pb-2 font-medium">Default (días)</th>
              <th className="pb-2 font-medium">Cultivar (días)</th>
            </tr>
          </thead>
          <tbody>
            {phases.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="py-2">{p.name}</td>
                <td className="py-2 text-muted-foreground">
                  {p.default_duration_days ?? 'Indefinida'}
                </td>
                <td className="py-2">
                  {canWrite ? (
                    <Input
                      type="number"
                      min="1"
                      className="h-8 w-24"
                      placeholder={p.default_duration_days?.toString() ?? '—'}
                      value={durations[p.id] ?? ''}
                      onChange={(e) =>
                        setDurations((prev) => ({
                          ...prev,
                          [p.id]: e.target.value ? parseInt(e.target.value, 10) || null : null,
                        }))
                      }
                    />
                  ) : (
                    <span>{durations[p.id] ?? '—'}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-medium">
              <td className="pt-2">Total</td>
              <td className="pt-2" />
              <td className="pt-2">{total > 0 ? `${total} días` : '—'}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {canWrite && (
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar duraciones'}
        </Button>
      )}
    </div>
  )
}

// ================================================================
// SECTION 3: TARGET PROFILE
// ================================================================

function TargetProfileSection({
  cultivar,
  canWrite,
}: {
  cultivar: CultivarRow
  canWrite: boolean
}) {
  const router = useRouter()
  const [entries, setEntries] = useState<{ key: string; value: string }[]>(
    () => {
      const tp = cultivar.target_profile
      if (!tp || Object.keys(tp).length === 0) return []
      return Object.entries(tp).map(([key, value]) => ({ key, value }))
    }
  )
  const [saving, setSaving] = useState(false)

  function addEntry() {
    setEntries((prev) => [...prev, { key: '', value: '' }])
  }

  function removeEntry(idx: number) {
    setEntries((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateEntry(idx: number, field: 'key' | 'value', val: string) {
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, [field]: val } : e)))
  }

  async function save() {
    setSaving(true)
    const supabase = createClient()
    const profile: Record<string, string> = {}
    for (const e of entries) {
      if (e.key.trim()) profile[e.key.trim()] = e.value
    }
    const { error } = await supabase
      .from('cultivars')
      .update({ target_profile: profile })
      .eq('id', cultivar.id)
    setSaving(false)
    if (error) {
      toast.error('Error al guardar perfil.')
      return
    }
    toast.success('Perfil guardado.')
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin parámetros configurados.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                className="h-8 w-40"
                placeholder="Clave (ej: THC)"
                value={entry.key}
                onChange={(e) => updateEntry(idx, 'key', e.target.value)}
                disabled={!canWrite}
              />
              <Input
                className="h-8 flex-1"
                placeholder="Valor (ej: 20-25%)"
                value={entry.value}
                onChange={(e) => updateEntry(idx, 'value', e.target.value)}
                disabled={!canWrite}
              />
              {canWrite && (
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeEntry(idx)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
      {canWrite && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addEntry}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Agregar parámetro
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar perfil'}
          </Button>
        </div>
      )}
    </div>
  )
}

// ================================================================
// SECTION 4: OPTIMAL CONDITIONS
// ================================================================

function OptimalConditionsSection({
  cultivar,
  canWrite,
}: {
  cultivar: CultivarRow
  canWrite: boolean
}) {
  const router = useRouter()
  type ConditionEntry = { key: string; min: string; max: string; unit: string }
  const [entries, setEntries] = useState<ConditionEntry[]>(
    () => {
      const oc = cultivar.optimal_conditions
      if (!oc || Object.keys(oc).length === 0) return []
      return Object.entries(oc).map(([key, val]) => ({
        key,
        min: val.min != null ? String(val.min) : '',
        max: val.max != null ? String(val.max) : '',
        unit: val.unit ?? '',
      }))
    }
  )
  const [saving, setSaving] = useState(false)

  function addEntry() {
    setEntries((prev) => [...prev, { key: '', min: '', max: '', unit: '' }])
  }

  function removeEntry(idx: number) {
    setEntries((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateEntry(idx: number, field: keyof ConditionEntry, val: string) {
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, [field]: val } : e)))
  }

  async function save() {
    setSaving(true)
    const supabase = createClient()
    const conditions: Record<string, { min: number | null; max: number | null; unit: string }> = {}
    for (const e of entries) {
      if (e.key.trim()) {
        conditions[e.key.trim()] = {
          min: e.min ? parseFloat(e.min) : null,
          max: e.max ? parseFloat(e.max) : null,
          unit: e.unit,
        }
      }
    }
    const { error } = await supabase
      .from('cultivars')
      .update({ optimal_conditions: conditions })
      .eq('id', cultivar.id)
    setSaving(false)
    if (error) {
      toast.error('Error al guardar condiciones.')
      return
    }
    toast.success('Condiciones guardadas.')
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin condiciones configuradas.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, idx) => (
            <div key={idx} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <Input
                className="h-8 w-32"
                placeholder="Clave (ej: Temp)"
                value={entry.key}
                onChange={(e) => updateEntry(idx, 'key', e.target.value)}
                disabled={!canWrite}
              />
              <Input
                type="number"
                className="h-8 w-20"
                placeholder="Min"
                value={entry.min}
                onChange={(e) => updateEntry(idx, 'min', e.target.value)}
                disabled={!canWrite}
              />
              <span className="text-muted-foreground text-sm">–</span>
              <Input
                type="number"
                className="h-8 w-20"
                placeholder="Max"
                value={entry.max}
                onChange={(e) => updateEntry(idx, 'max', e.target.value)}
                disabled={!canWrite}
              />
              <Input
                className="h-8 w-20"
                placeholder="Unidad"
                value={entry.unit}
                onChange={(e) => updateEntry(idx, 'unit', e.target.value)}
                disabled={!canWrite}
              />
              {canWrite && (
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeEntry(idx)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
      {canWrite && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addEntry}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Agregar condición
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar condiciones'}
          </Button>
        </div>
      )}
    </div>
  )
}

// ================================================================
// SECTION 5: PHASE PRODUCT FLOWS
// ================================================================

function PhaseFlowsSection({
  cultivar,
  phases,
  flows,
  allCultivars,
  categories,
  units,
  canWrite,
}: {
  cultivar: CultivarRow
  phases: PhaseRow[]
  flows: FlowRow[]
  allCultivars: CultivarSummary[]
  categories: Category[]
  units: Unit[]
  canWrite: boolean
}) {
  const router = useRouter()
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>(
    () => {
      const m: Record<string, boolean> = {}
      for (const p of phases) m[p.id] = true
      return m
    }
  )

  function togglePhase(id: string) {
    setExpandedPhases((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const flowsByPhase = useMemo(() => {
    const map: Record<string, FlowRow[]> = {}
    for (const f of flows) {
      if (!map[f.phase_id]) map[f.phase_id] = []
      map[f.phase_id].push(f)
    }
    return map
  }, [flows])

  if (phases.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay fases configuradas para este tipo de cultivo.</p>
  }

  return (
    <div className="space-y-3">
      {canWrite && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setCopyDialogOpen(true)}>
            <Copy className="mr-1.5 h-3.5 w-3.5" /> Copiar flujos de otro cultivar
          </Button>
        </div>
      )}

      {flows.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Configura los flujos de producción para cada fase.
        </p>
      )}

      {phases.map((phase) => {
        const phaseFlows = flowsByPhase[phase.id] ?? []
        const inputs = phaseFlows.filter((f) => f.direction === 'input')
        const outputs = phaseFlows.filter((f) => f.direction === 'output')
        const isExpanded = expandedPhases[phase.id]

        return (
          <div key={phase.id} className="rounded-md border">
            <button
              type="button"
              className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50"
              onClick={() => togglePhase(phase.id)}
            >
              <div className="flex items-center gap-2">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span className="font-medium text-sm">{phase.name}</span>
                <span className="text-xs text-muted-foreground">({phase.code})</span>
                {phase.is_transformation && (
                  <Badge variant="outline" className="text-xs">Transforma</Badge>
                )}
                {phase.is_destructive && (
                  <Badge variant="outline" className="text-xs text-red-600 border-red-200">Destructiva</Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {phaseFlows.length} flow{phaseFlows.length !== 1 ? 's' : ''}
              </span>
            </button>

            {isExpanded && (
              <div className="border-t px-3 pb-3 space-y-3">
                <FlowSubSection
                  label="Inputs"
                  direction="input"
                  flows={inputs}
                  cultivarId={cultivar.id}
                  phaseId={phase.id}
                  categories={categories}
                  units={units}
                  canWrite={canWrite}
                />
                <FlowSubSection
                  label="Outputs"
                  direction="output"
                  flows={outputs}
                  cultivarId={cultivar.id}
                  phaseId={phase.id}
                  categories={categories}
                  units={units}
                  canWrite={canWrite}
                />
              </div>
            )}
          </div>
        )
      })}

      <CopyFlowsDialog
        open={copyDialogOpen}
        onOpenChange={setCopyDialogOpen}
        cultivar={cultivar}
        allCultivars={allCultivars}
        existingFlowCount={flows.length}
        onSuccess={() => {
          setCopyDialogOpen(false)
          router.refresh()
        }}
      />
    </div>
  )
}

// ================================================================
// FLOW SUB-SECTION
// ================================================================

function FlowSubSection({
  label,
  direction,
  flows,
  cultivarId,
  phaseId,
  categories,
  units,
  canWrite,
}: {
  label: string
  direction: 'input' | 'output'
  flows: FlowRow[]
  cultivarId: string
  phaseId: string
  categories: Category[]
  units: Unit[]
  canWrite: boolean
}) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)

  async function handleAdd() {
    setAdding(true)
    const supabase = createClient()
    const nextSort = flows.length > 0 ? Math.max(...flows.map((f) => f.sort_order)) + 1 : 0
    const { error } = await supabase.from('phase_product_flows').insert({
      cultivar_id: cultivarId,
      phase_id: phaseId,
      direction,
      product_role: 'primary',
      is_required: true,
      sort_order: nextSort,
    })
    setAdding(false)
    if (error) {
      toast.error('Error al agregar flow.')
      return
    }
    router.refresh()
  }

  async function handleDelete(flowId: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('phase_product_flows')
      .delete()
      .eq('id', flowId)
    if (error) {
      toast.error('Error al eliminar flow.')
      return
    }
    router.refresh()
  }

  async function handleUpdateField(flowId: string, field: string, value: unknown) {
    const supabase = createClient()
    const { error } = await supabase
      .from('phase_product_flows')
      .update({ [field]: value })
      .eq('id', flowId)
    if (error) {
      toast.error('Error al actualizar.')
      return
    }
    router.refresh()
  }

  return (
    <div className="pt-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        {canWrite && (
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleAdd} disabled={adding}>
            <Plus className="mr-1 h-3 w-3" /> Agregar {direction === 'input' ? 'input' : 'output'}
          </Button>
        )}
      </div>

      {flows.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Sin {label.toLowerCase()}.</p>
      ) : (
        <div className="space-y-2">
          {flows.map((flow) => {
            const hasMissing = !flow.product_id && !flow.product_category_id
            return (
              <div
                key={flow.id}
                className={`flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm ${
                  hasMissing ? 'border-yellow-300 bg-yellow-50/50 dark:border-yellow-700 dark:bg-yellow-900/10' : ''
                }`}
              >
                {/* Role */}
                {canWrite ? (
                  <select
                    className={selectClass + ' w-28 h-8 text-xs'}
                    value={flow.product_role}
                    onChange={(e) => handleUpdateField(flow.id, 'product_role', e.target.value)}
                  >
                    <option value="primary">Primario</option>
                    <option value="secondary">Secundario</option>
                    <option value="byproduct">Subproducto</option>
                    <option value="waste">Desecho</option>
                  </select>
                ) : (
                  <Badge variant="secondary" className={`text-xs ${roleBadgeStyles[flow.product_role] ?? ''}`}>
                    {roleLabels[flow.product_role] ?? flow.product_role}
                  </Badge>
                )}

                {/* Category select */}
                {canWrite ? (
                  <select
                    className={selectClass + ' w-40 h-8 text-xs'}
                    value={flow.product_category_id ?? ''}
                    onChange={(e) => {
                      const val = e.target.value || null
                      handleUpdateField(flow.id, 'product_category_id', val)
                      if (val) handleUpdateField(flow.id, 'product_id', null)
                    }}
                  >
                    <option value="">Categoría...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs">
                    {flow.product_category_id
                      ? categories.find((c) => c.id === flow.product_category_id)?.name ?? '—'
                      : '—'}
                  </span>
                )}

                {/* Yield % */}
                {canWrite ? (
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    className="h-8 w-20 text-xs"
                    placeholder="Yield %"
                    value={flow.expected_yield_pct ?? ''}
                    onBlur={(e) =>
                      handleUpdateField(
                        flow.id,
                        'expected_yield_pct',
                        e.target.value ? parseFloat(e.target.value) : null
                      )
                    }
                    defaultValue={flow.expected_yield_pct ?? ''}
                  />
                ) : (
                  flow.expected_yield_pct != null && (
                    <span className="text-xs">{flow.expected_yield_pct}%</span>
                  )
                )}

                {/* Qty per input */}
                {canWrite ? (
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className="h-8 w-20 text-xs"
                    placeholder="Cant/input"
                    value={flow.expected_quantity_per_input ?? ''}
                    onBlur={(e) =>
                      handleUpdateField(
                        flow.id,
                        'expected_quantity_per_input',
                        e.target.value ? parseFloat(e.target.value) : null
                      )
                    }
                    defaultValue={flow.expected_quantity_per_input ?? ''}
                  />
                ) : (
                  flow.expected_quantity_per_input != null && (
                    <span className="text-xs">{flow.expected_quantity_per_input}</span>
                  )
                )}

                {/* Unit */}
                {canWrite ? (
                  <select
                    className={selectClass + ' w-24 h-8 text-xs'}
                    value={flow.unit_id ?? ''}
                    onChange={(e) => handleUpdateField(flow.id, 'unit_id', e.target.value || null)}
                  >
                    <option value="">Unidad</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.code}
                      </option>
                    ))}
                  </select>
                ) : (
                  flow.unit_id && (
                    <span className="text-xs">
                      {units.find((u) => u.id === flow.unit_id)?.code ?? ''}
                    </span>
                  )
                )}

                {/* Required toggle */}
                {canWrite ? (
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={flow.is_required}
                      onCheckedChange={(v) => handleUpdateField(flow.id, 'is_required', v)}
                      className="scale-75"
                    />
                    <span className="text-xs text-muted-foreground">Req</span>
                  </div>
                ) : (
                  !flow.is_required && (
                    <Badge variant="outline" className="text-xs">Opcional</Badge>
                  )
                )}

                {hasMissing && (
                  <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 shrink-0" />
                )}

                {canWrite && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 ml-auto"
                    onClick={() => handleDelete(flow.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {canWrite && flows.length > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          Los productos se configuran en Inventario &gt; Productos. Puedes usar categorías mientras tanto.
        </p>
      )}
    </div>
  )
}
