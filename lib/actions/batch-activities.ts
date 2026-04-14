'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// ---------- Types ----------

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

type ScheduleActivityInput = {
  batchId: string
  templateId: string
  plannedDate: string
  phaseId: string
}

type RescheduleActivityInput = {
  scheduledActivityId: string
  batchId: string
  plannedDate: string
}

type SkipActivityInput = {
  scheduledActivityId: string
  batchId: string
}

// ---------- Actions ----------

export async function scheduleActivity(
  input: ScheduleActivityInput
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'No autenticado' }
  }

  // Verify role (admin, manager, supervisor can schedule)
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userData || !['admin', 'manager', 'supervisor'].includes(userData.role)) {
    return { success: false, error: 'No tiene permisos para programar actividades' }
  }

  // Get batch start_date to calculate crop_day
  const { data: batch } = await supabase
    .from('batches')
    .select('start_date')
    .eq('id', input.batchId)
    .single()

  if (!batch) {
    return { success: false, error: 'Lote no encontrado' }
  }

  // Calculate crop_day
  const startDate = new Date(batch.start_date + 'T00:00:00')
  const plannedDate = new Date(input.plannedDate + 'T00:00:00')
  const cropDay = Math.ceil((plannedDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

  // Get template snapshot
  const { data: template } = await supabase
    .from('activity_templates')
    .select(`
      id, name, code, activity_type_id, frequency, estimated_duration_min,
      triggers_phase_change_id, triggers_transformation, metadata,
      checklist:activity_template_checklist(step_order, instruction, is_critical, requires_photo, expected_value, tolerance),
      resources:activity_template_resources(product_id, quantity, quantity_basis, is_optional, sort_order, notes)
    `)
    .eq('id', input.templateId)
    .single()

  if (!template) {
    return { success: false, error: 'Template no encontrado' }
  }

  // Create template snapshot
  const templateSnapshot = {
    id: template.id,
    name: template.name,
    code: template.code,
    activity_type_id: template.activity_type_id,
    frequency: template.frequency,
    estimated_duration_min: template.estimated_duration_min,
    triggers_phase_change_id: template.triggers_phase_change_id,
    triggers_transformation: template.triggers_transformation,
    metadata: template.metadata,
    checklist: template.checklist ?? [],
    resources: template.resources ?? [],
  }

  // Insert scheduled activity
  const { data: scheduled, error } = await supabase
    .from('scheduled_activities')
    .insert({
      batch_id: input.batchId,
      template_id: input.templateId,
      planned_date: input.plannedDate,
      crop_day: cropDay,
      phase_id: input.phaseId,
      template_snapshot: templateSnapshot,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error scheduling activity:', error)
    return { success: false, error: 'Error al programar la actividad' }
  }

  revalidatePath(`/production/batches/${input.batchId}`)
  return { success: true, data: { id: scheduled.id } }
}

export async function rescheduleActivity(
  input: RescheduleActivityInput
): Promise<ActionResult> {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'No autenticado' }
  }

  // Verify role
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userData || !['admin', 'manager', 'supervisor'].includes(userData.role)) {
    return { success: false, error: 'No tiene permisos para re-agendar actividades' }
  }

  // Verify scheduled activity exists and is pending/overdue
  const { data: scheduled } = await supabase
    .from('scheduled_activities')
    .select('status, batch_id')
    .eq('id', input.scheduledActivityId)
    .single()

  if (!scheduled) {
    return { success: false, error: 'Actividad programada no encontrada' }
  }

  if (!['pending', 'overdue'].includes(scheduled.status)) {
    return { success: false, error: 'Solo se pueden re-agendar actividades pendientes o vencidas' }
  }

  // Get batch start_date to recalculate crop_day
  const { data: batch } = await supabase
    .from('batches')
    .select('start_date')
    .eq('id', scheduled.batch_id)
    .single()

  if (!batch) {
    return { success: false, error: 'Lote no encontrado' }
  }

  // Calculate new crop_day
  const startDate = new Date(batch.start_date + 'T00:00:00')
  const plannedDate = new Date(input.plannedDate + 'T00:00:00')
  const cropDay = Math.ceil((plannedDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

  // Update scheduled activity
  const { error } = await supabase
    .from('scheduled_activities')
    .update({
      planned_date: input.plannedDate,
      crop_day: cropDay,
      status: 'pending', // Reset to pending if was overdue
    })
    .eq('id', input.scheduledActivityId)

  if (error) {
    console.error('Error rescheduling activity:', error)
    return { success: false, error: 'Error al re-agendar la actividad' }
  }

  revalidatePath(`/production/batches/${input.batchId}`)
  return { success: true, data: undefined }
}

export async function skipActivity(
  input: SkipActivityInput
): Promise<ActionResult> {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'No autenticado' }
  }

  // Verify role
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userData || !['admin', 'manager', 'supervisor'].includes(userData.role)) {
    return { success: false, error: 'No tiene permisos para omitir actividades' }
  }

  // Verify scheduled activity exists and is pending/overdue
  const { data: scheduled } = await supabase
    .from('scheduled_activities')
    .select('status')
    .eq('id', input.scheduledActivityId)
    .single()

  if (!scheduled) {
    return { success: false, error: 'Actividad programada no encontrada' }
  }

  if (!['pending', 'overdue'].includes(scheduled.status)) {
    return { success: false, error: 'Solo se pueden omitir actividades pendientes o vencidas' }
  }

  // Update status to skipped
  const { error } = await supabase
    .from('scheduled_activities')
    .update({ status: 'skipped' })
    .eq('id', input.scheduledActivityId)

  if (error) {
    console.error('Error skipping activity:', error)
    return { success: false, error: 'Error al omitir la actividad' }
  }

  revalidatePath(`/production/batches/${input.batchId}`)
  return { success: true, data: undefined }
}
