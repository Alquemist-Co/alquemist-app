'use client'

import type { Json } from '@/types/database'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Plus,
  Pencil,
  Power,
  Copy,
  ClipboardList,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  type ScheduleRow,
  type TemplateRow,
  type TemplatePhaseRow,
  type CultivarRef,
  type PhaseRow,
  ScheduleDialog,
} from './templates-shared'

type Props = {
  schedules: ScheduleRow[]
  cultivars: CultivarRef[]
  phases: PhaseRow[]
  templates: TemplateRow[]
  templatePhases: TemplatePhaseRow[]
  canWrite: boolean
}

export function SchedulesListClient({
  schedules,
  cultivars,
  phases,
  templates,
  templatePhases,
  canWrite,
}: Props) {
  const router = useRouter()
  const [showInactive, setShowInactive] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<ScheduleRow | null>(null)
  const [deactivating, setDeactivating] = useState<ScheduleRow | null>(null)

  const filtered = showInactive ? schedules : schedules.filter((s) => s.is_active)

  function openNew() {
    setEditingSchedule(null)
    setDialogOpen(true)
  }

  function openEdit(s: ScheduleRow) {
    setEditingSchedule(s)
    setDialogOpen(true)
  }

  async function handleToggle(s: ScheduleRow) {
    const supabase = createClient()
    const { error } = await supabase
      .from('cultivation_schedules')
      .update({ is_active: !s.is_active })
      .eq('id', s.id)
    if (error) { toast.error('Error al cambiar el estado.'); return }
    toast.success(s.is_active ? 'Plan desactivado.' : 'Plan reactivado.')
    router.refresh()
  }

  async function handleDuplicate(s: ScheduleRow) {
    const supabase = createClient()
    const { data: newS, error } = await supabase
      .from('cultivation_schedules')
      .insert({
        name: `${s.name} (Copia)`,
        cultivar_id: s.cultivar_id,
        total_days: s.total_days,
        phase_config: s.phase_config as unknown as Json,
      })
      .select('id')
      .single()
    if (error) { toast.error('Error al duplicar plan.'); return }
    toast.success('Plan duplicado.')
    router.push(`/settings/activity-templates/schedules/${newS.id}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Tabs
          value={showInactive ? 'all' : 'active'}
          onValueChange={(v) => setShowInactive(v === 'all')}
        >
          <TabsList variant="line">
            <TabsTrigger value="active">Activos</TabsTrigger>
            <TabsTrigger value="all">Todos</TabsTrigger>
          </TabsList>
        </Tabs>
        {canWrite && (
          <Button size="sm" className="ml-auto" onClick={openNew}>
            <Plus className="mr-1.5 h-4 w-4" /> Nuevo plan
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ClipboardList className="mb-3 h-10 w-10" />
            <p className="text-sm text-center">Crea tu primer plan de cultivo.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => {
            const phaseCount = s.phase_config?.length ?? 0
            return (
              <Card
                key={s.id}
                className={`cursor-pointer transition-colors hover:border-primary/40 ${!s.is_active ? 'opacity-50' : ''}`}
                onClick={() => router.push(`/settings/activity-templates/schedules/${s.id}`)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-sm">{s.name}</span>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{s.cultivar?.name ?? '\u2014'}</span>
                        {s.total_days && <><span>&middot;</span><span>{s.total_days} d&iacute;as</span></>}
                        <span>&middot;</span>
                        <span>{phaseCount} fases</span>
                      </div>
                    </div>
                    {!s.is_active && (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-500 text-xs">Inactivo</Badge>
                    )}
                  </div>

                  {canWrite && (
                    <div className="mt-2 flex gap-1 border-t pt-2" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar" onClick={() => openEdit(s)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Duplicar" onClick={() => handleDuplicate(s)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title={s.is_active ? 'Desactivar' : 'Reactivar'}
                        onClick={() => s.is_active ? setDeactivating(s) : handleToggle(s)}
                      >
                        <Power className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Schedule Dialog */}
      <ScheduleDialog
        open={dialogOpen}
        onOpenChange={(o) => { if (!o) { setDialogOpen(false); setEditingSchedule(null) } else setDialogOpen(true) }}
        schedule={editingSchedule}
        cultivars={cultivars}
        phases={phases}
        templates={templates}
        templatePhases={templatePhases}
        onSuccess={(newId) => {
          setDialogOpen(false)
          setEditingSchedule(null)
          if (newId) {
            router.push(`/settings/activity-templates/schedules/${newId}`)
          } else {
            router.refresh()
          }
        }}
      />

      {/* Deactivate confirm */}
      <AlertDialog open={!!deactivating} onOpenChange={(o) => !o && setDeactivating(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar plan</AlertDialogTitle>
            <AlertDialogDescription>
              &iquest;Desactivar &quot;{deactivating?.name}&quot;? No se podr&aacute; usar para nuevos batches.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deactivating) handleToggle(deactivating); setDeactivating(null) }}>
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
