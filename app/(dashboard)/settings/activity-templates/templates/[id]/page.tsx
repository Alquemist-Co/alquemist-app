import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TemplateDetailClient } from '@/components/settings/template-detail-client'

type Props = {
  params: Promise<{ id: string }>
}

export default async function TemplateDetailPage({ params }: Props) {
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

  // Fetch the template
  const { data: template } = await supabase
    .from('activity_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (!template) {
    notFound()
  }

  // Parallel fetch related data
  const [
    { data: templatePhases },
    { data: templateResources },
    { data: templateChecklist },
    { data: allTemplates },
    { data: activityTypes },
    { data: cropTypes },
    { data: phases },
  ] = await Promise.all([
    supabase.from('activity_template_phases').select('*').eq('template_id', id),
    supabase.from('activity_template_resources').select('*').eq('template_id', id).order('sort_order'),
    supabase.from('activity_template_checklist').select('*').eq('template_id', id).order('step_order'),
    supabase.from('activity_templates').select('*').order('code'),
    supabase.from('activity_types').select('id, name').eq('is_active', true).order('name'),
    supabase.from('crop_types').select('id, name').eq('is_active', true).order('name'),
    supabase.from('production_phases').select('id, crop_type_id, code, name, sort_order, default_duration_days, is_transformation, is_destructive').order('sort_order'),
  ])

  return (
    <TemplateDetailClient
      template={template}
      templatePhases={templatePhases ?? []}
      templateResources={templateResources ?? []}
      templateChecklist={templateChecklist ?? []}
      activityTypes={activityTypes ?? []}
      cropTypes={cropTypes ?? []}
      phases={phases ?? []}
      allTemplates={allTemplates ?? []}
      canWrite={canWrite}
    />
  )
}
