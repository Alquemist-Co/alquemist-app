'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// ---------- Types ----------

type CreateTestInput = {
  batchId: string
  testType: string
  phaseId: string | null
  labName: string | null
  labReference: string | null
  sampleDate: string
  notes: string | null
}

type TestResultInput = {
  id: string | null
  parameter: string
  value: string
  numeric_value: number | null
  unit: string | null
  min_threshold: number | null
  max_threshold: number | null
}

type CaptureResultsInput = {
  testId: string
  batchId: string
  resultDate: string
  results: TestResultInput[]
}

type CompleteTestInput = {
  testId: string
  batchId: string
}

type RejectTestInput = {
  testId: string
  batchId: string
}

// ---------- Helpers ----------

async function verifyRole(allowedRoles: string[]): Promise<{ userId: string; role: string } | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: currentUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (!currentUser || !allowedRoles.includes(currentUser.role)) return null

  return { userId: currentUser.id, role: currentUser.role }
}

// ---------- Actions ----------

export async function createQualityTest(input: CreateTestInput): Promise<{ success: boolean; error?: string; testId?: string }> {
  // Operators can create tests per spec
  const auth = await verifyRole(['admin', 'manager', 'supervisor', 'operator'])
  if (!auth) {
    return { success: false, error: 'No tienes permiso para crear tests de calidad' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('quality_tests')
    .insert({
      batch_id: input.batchId,
      test_type: input.testType,
      phase_id: input.phaseId,
      lab_name: input.labName,
      lab_reference: input.labReference,
      sample_date: input.sampleDate,
      notes: input.notes,
      status: 'pending',
      performed_by: auth.userId,
      created_by: auth.userId,
      updated_by: auth.userId,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating quality test:', error)
    return { success: false, error: 'Error al crear el test de calidad' }
  }

  revalidatePath(`/production/batches/${input.batchId}`)
  return { success: true, testId: data.id }
}

export async function captureTestResults(input: CaptureResultsInput): Promise<{ success: boolean; error?: string }> {
  // Operators can capture results per spec
  const auth = await verifyRole(['admin', 'manager', 'supervisor', 'operator'])
  if (!auth) {
    return { success: false, error: 'No tienes permiso para capturar resultados' }
  }

  const supabase = await createClient()

  // First, update the test to in_progress and set result_date
  const { error: updateError } = await supabase
    .from('quality_tests')
    .update({
      status: 'in_progress',
      result_date: input.resultDate,
      updated_by: auth.userId,
    })
    .eq('id', input.testId)

  if (updateError) {
    console.error('Error updating test:', updateError)
    return { success: false, error: 'Error al actualizar el test' }
  }

  // Delete existing results that are not in the new list
  const existingIds = input.results.filter((r) => r.id).map((r) => r.id)
  if (existingIds.length > 0) {
    await supabase
      .from('quality_test_results')
      .delete()
      .eq('test_id', input.testId)
      .not('id', 'in', `(${existingIds.join(',')})`)
  } else {
    // Delete all existing if no IDs preserved
    await supabase
      .from('quality_test_results')
      .delete()
      .eq('test_id', input.testId)
  }

  // Upsert results
  for (const result of input.results) {
    // Calculate passed based on thresholds
    let passed: boolean | null = null
    if (result.numeric_value !== null) {
      const minOk = result.min_threshold === null || result.numeric_value >= result.min_threshold
      const maxOk = result.max_threshold === null || result.numeric_value <= result.max_threshold
      passed = minOk && maxOk
    }

    if (result.id) {
      // Update existing
      const { error } = await supabase
        .from('quality_test_results')
        .update({
          parameter: result.parameter,
          value: result.value,
          numeric_value: result.numeric_value,
          unit: result.unit,
          min_threshold: result.min_threshold,
          max_threshold: result.max_threshold,
          passed,
          updated_by: auth.userId,
        })
        .eq('id', result.id)

      if (error) {
        console.error('Error updating result:', error)
        return { success: false, error: 'Error al actualizar resultado' }
      }
    } else {
      // Insert new
      const { error } = await supabase
        .from('quality_test_results')
        .insert({
          test_id: input.testId,
          parameter: result.parameter,
          value: result.value,
          numeric_value: result.numeric_value,
          unit: result.unit,
          min_threshold: result.min_threshold,
          max_threshold: result.max_threshold,
          passed,
          created_by: auth.userId,
          updated_by: auth.userId,
        })

      if (error) {
        console.error('Error inserting result:', error)
        return { success: false, error: 'Error al insertar resultado' }
      }
    }
  }

  revalidatePath(`/production/batches/${input.batchId}`)
  return { success: true }
}

export async function completeQualityTest(input: CompleteTestInput): Promise<{ success: boolean; error?: string; overallPass?: boolean }> {
  // Operators can complete tests per spec
  const auth = await verifyRole(['admin', 'manager', 'supervisor', 'operator'])
  if (!auth) {
    return { success: false, error: 'No tienes permiso para completar tests' }
  }

  const supabase = await createClient()

  // Get all results for this test
  const { data: results, error: resultsError } = await supabase
    .from('quality_test_results')
    .select('passed')
    .eq('test_id', input.testId)

  if (resultsError) {
    console.error('Error fetching results:', resultsError)
    return { success: false, error: 'Error al obtener resultados' }
  }

  if (!results || results.length === 0) {
    return { success: false, error: 'El test no tiene resultados capturados' }
  }

  // Calculate overall pass: all must pass (where passed is not null)
  const overallPass = results.every((r) => r.passed === true || r.passed === null)
  const hasFailed = results.some((r) => r.passed === false)
  const finalStatus = hasFailed ? 'failed' : 'completed'

  const { error: updateError } = await supabase
    .from('quality_tests')
    .update({
      status: finalStatus,
      overall_pass: !hasFailed,
      updated_by: auth.userId,
    })
    .eq('id', input.testId)

  if (updateError) {
    console.error('Error completing test:', updateError)
    return { success: false, error: 'Error al completar el test' }
  }

  revalidatePath(`/production/batches/${input.batchId}`)
  return { success: true, overallPass: !hasFailed }
}

export async function rejectQualityTest(input: RejectTestInput): Promise<{ success: boolean; error?: string }> {
  // Only admin/manager can reject per spec
  const auth = await verifyRole(['admin', 'manager'])
  if (!auth) {
    return { success: false, error: 'Solo administradores y managers pueden rechazar tests' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('quality_tests')
    .update({
      status: 'rejected',
      updated_by: auth.userId,
    })
    .eq('id', input.testId)

  if (error) {
    console.error('Error rejecting test:', error)
    return { success: false, error: 'Error al rechazar el test' }
  }

  revalidatePath(`/production/batches/${input.batchId}`)
  return { success: true }
}
