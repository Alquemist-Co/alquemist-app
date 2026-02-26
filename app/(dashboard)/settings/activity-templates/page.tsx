import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ActivityTemplatesClient } from '@/components/settings/activity-templates-client'

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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Templates de Actividad</h2>
        <p className="text-sm text-muted-foreground">
          Configura templates de actividad reutilizables y planes de cultivo.
        </p>
      </div>

      <ActivityTemplatesClient
        templates={templates ?? []}
        templatePhases={templatePhases ?? []}
        templateResources={templateResources ?? []}
        templateChecklist={templateChecklist ?? []}
        schedules={(schedules ?? []).map((s) => ({
          ...s,
          phase_config: s.phase_config as PhaseConfigItem[] | null,
          cultivar: s.cultivar as { name: string; crop_type_id: string } | null,
        }))}
        activityTypes={activityTypes ?? []}
        cropTypes={cropTypes ?? []}
        phases={phases ?? []}
        cultivars={(cultivars ?? []).map((c) => ({
          ...c,
          phase_durations: c.phase_durations as Record<string, number> | null,
        }))}
        canWrite={canWrite}
      />
    </div>
  )
}

type PhaseConfigItem = {
  phase_id: string
  duration_days: number
  templates: { template_id: string }[]
}
