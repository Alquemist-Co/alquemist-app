import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TemplatesListClient } from '@/components/settings/templates-list-client'
import { SchedulesListClient } from '@/components/settings/schedules-list-client'
import { ActivityTemplatesTabs } from './tabs-wrapper'

type PhaseConfigItem = {
  phase_id: string
  duration_days: number
  templates: { template_id: string }[]
}

export default async function ActivityTemplatesPage() {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  const { data: currentUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', authUser.id)
    .single()

  if (!currentUser) {
    redirect('/login')
  }

  const canWrite = currentUser.role === 'admin' || currentUser.role === 'manager'

  // Parallel fetch all needed data
  const [
    { data: templates },
    { data: templatePhases },
    { data: templateResources },
    { data: templateChecklist },
    { data: schedules },
    { data: activityTypes },
    { data: cropTypes },
    { data: phases },
    { data: cultivars },
  ] = await Promise.all([
    supabase.from('activity_templates').select('*').order('code'),
    supabase.from('activity_template_phases').select('*'),
    supabase.from('activity_template_resources').select('*').order('sort_order'),
    supabase.from('activity_template_checklist').select('*').order('step_order'),
    supabase.from('cultivation_schedules').select('*, cultivar:cultivars(name, crop_type_id)'),
    supabase.from('activity_types').select('id, name').eq('is_active', true).order('name'),
    supabase.from('crop_types').select('id, name').eq('is_active', true).order('name'),
    supabase.from('production_phases').select('id, crop_type_id, code, name, sort_order, default_duration_days, is_transformation, is_destructive').order('sort_order'),
    supabase.from('cultivars').select('id, crop_type_id, code, name, phase_durations').eq('is_active', true).order('name'),
  ])

  const templatesData = templates ?? []
  const templatePhasesData = templatePhases ?? []
  const templateResourcesData = templateResources ?? []
  const templateChecklistData = templateChecklist ?? []
  const activityTypesData = activityTypes ?? []
  const cropTypesData = cropTypes ?? []
  const phasesData = phases ?? []

  const schedulesData = (schedules ?? []).map((s) => ({
    ...s,
    phase_config: s.phase_config as PhaseConfigItem[] | null,
    cultivar: s.cultivar as { name: string; crop_type_id: string } | null,
  }))

  const cultivarsData = (cultivars ?? []).map((c) => ({
    ...c,
    phase_durations: c.phase_durations as Record<string, number> | null,
  }))

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Templates de Actividad</h2>
        <p className="text-sm text-muted-foreground">
          Configura templates de actividad reutilizables y planes de cultivo.
        </p>
      </div>

      <ActivityTemplatesTabs
        templatesTab={
          <TemplatesListClient
            templates={templatesData}
            templatePhases={templatePhasesData}
            templateResources={templateResourcesData}
            templateChecklist={templateChecklistData}
            activityTypes={activityTypesData}
            cropTypes={cropTypesData}
            phases={phasesData}
            allTemplates={templatesData}
            canWrite={canWrite}
          />
        }
        schedulesTab={
          <SchedulesListClient
            schedules={schedulesData}
            cultivars={cultivarsData}
            phases={phasesData}
            templates={templatesData}
            templatePhases={templatePhasesData}
            canWrite={canWrite}
          />
        }
      />
    </div>
  )
}
