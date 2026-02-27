import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ScheduleDetailClient } from '@/components/settings/schedule-detail-client'

type PhaseConfigItem = {
  phase_id: string
  duration_days: number
  templates: { template_id: string }[]
}

type Props = {
  params: Promise<{ id: string }>
}

export default async function ScheduleDetailPage({ params }: Props) {
  const { id } = await params
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

  // Fetch the schedule
  const { data: scheduleRaw } = await supabase
    .from('cultivation_schedules')
    .select('*, cultivar:cultivars(name, crop_type_id)')
    .eq('id', id)
    .single()

  if (!scheduleRaw) {
    notFound()
  }

  const schedule = {
    ...scheduleRaw,
    phase_config: scheduleRaw.phase_config as PhaseConfigItem[] | null,
    cultivar: scheduleRaw.cultivar as { name: string; crop_type_id: string } | null,
  }

  // Parallel fetch related data
  const [
    { data: templates },
    { data: templatePhases },
    { data: phases },
    { data: cultivars },
  ] = await Promise.all([
    supabase.from('activity_templates').select('*').order('code'),
    supabase.from('activity_template_phases').select('*'),
    supabase.from('production_phases').select('id, crop_type_id, code, name, sort_order, default_duration_days, is_transformation, is_destructive').order('sort_order'),
    supabase.from('cultivars').select('id, crop_type_id, code, name, phase_durations').eq('is_active', true).order('name'),
  ])

  const cultivarsData = (cultivars ?? []).map((c) => ({
    ...c,
    phase_durations: c.phase_durations as Record<string, number> | null,
  }))

  return (
    <ScheduleDetailClient
      schedule={schedule}
      cultivars={cultivarsData}
      phases={phases ?? []}
      templates={templates ?? []}
      templatePhases={templatePhases ?? []}
      canWrite={canWrite}
    />
  )
}
