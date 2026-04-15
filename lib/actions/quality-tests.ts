'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// ---------- Zod Schemas ----------

const createTestSchema = z.object({
  batchId: z.string().uuid(),
  testType: z.string().min(1).max(100),
  phaseId: z.string().uuid().nullable(),
  labName: z.string().max(200).nullable(),
  labReference: z.string().max(100).nullable(),
  sampleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(2000).nullable(),
})

const testResultSchema = z.object({
  id: z.string().uuid().nullable(),
  parameter: z.string().min(1).max(200),
  value: z.string().min(1).max(200),
  numeric_value: z.number().nullable(),
  unit: z.string().max(50).nullable(),
  min_threshold: z.number().nullable(),
  max_threshold: z.number().nullable(),
})

const captureResultsSchema = z.object({
  testId: z.string().uuid(),
  batchId: z.string().uuid(),
  resultDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  results: z.array(testResultSchema).max(100),
})

const completeTestSchema = z.object({
  testId: z.string().uuid(),
  batchId: z.string().uuid(),
})

const rejectTestSchema = z.object({
  testId: z.string().uuid(),
  batchId: z.string().uuid(),
})

// ---------- Types ----------

type CreateTestInput = z.infer<typeof createTestSchema>
type TestResultInput = z.infer<typeof testResultSchema>
type CaptureResultsInput = z.infer<typeof captureResultsSchema>
type CompleteTestInput = z.infer<typeof completeTestSchema>
type RejectTestInput = z.infer<typeof rejectTestSchema>

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
  // Validate input
  const parsed = createTestSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Datos inválidos' }
  }
  const data = parsed.data

  // Operators can create tests per spec
  const auth = await verifyRole(['admin', 'manager', 'supervisor', 'operator'])
  if (!auth) {
    return { success: false, error: 'No tienes permiso para crear tests de calidad' }
  }

  const supabase = await createClient()

  const { data: insertedData, error } = await supabase
    .from('quality_tests')
    .insert({
      batch_id: data.batchId,
      test_type: data.testType,
      phase_id: data.phaseId,
      lab_name: data.labName,
      lab_reference: data.labReference,
      sample_date: data.sampleDate,
      notes: data.notes,
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

  revalidatePath(`/production/batches/${data.batchId}`)
  return { success: true, testId: insertedData.id }
}

export async function captureTestResults(input: CaptureResultsInput): Promise<{ success: boolean; error?: string }> {
  // Validate input
  const parsed = captureResultsSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Datos inválidos' }
  }
  const data = parsed.data

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
      result_date: data.resultDate,
      updated_by: auth.userId,
    })
    .eq('id', data.testId)

  if (updateError) {
    console.error('Error updating test:', updateError)
    return { success: false, error: 'Error al actualizar el test' }
  }

  // Delete existing results that are not in the new list
  // IDs are validated as UUIDs by Zod schema, preventing SQL injection
  const existingIds = data.results.filter((r) => r.id).map((r) => r.id as string)
  if (existingIds.length > 0) {
    await supabase
      .from('quality_test_results')
      .delete()
      .eq('test_id', data.testId)
      .not('id', 'in', `(${existingIds.join(',')})`)
  } else {
    // Delete all existing if no IDs preserved
    await supabase
      .from('quality_test_results')
      .delete()
      .eq('test_id', data.testId)
  }

  // Upsert results
  for (const result of data.results) {
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
        .eq('id', result.id as string)

      if (error) {
        console.error('Error updating result:', error)
        return { success: false, error: 'Error al actualizar resultado' }
      }
    } else {
      // Insert new
      const { error } = await supabase
        .from('quality_test_results')
        .insert({
          test_id: data.testId,
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

  revalidatePath(`/production/batches/${data.batchId}`)
  return { success: true }
}

export async function completeQualityTest(input: CompleteTestInput): Promise<{ success: boolean; error?: string; overallPass?: boolean }> {
  // Validate input
  const parsed = completeTestSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Datos inválidos' }
  }
  const data = parsed.data

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
    .eq('test_id', data.testId)

  if (resultsError) {
    console.error('Error fetching results:', resultsError)
    return { success: false, error: 'Error al obtener resultados' }
  }

  if (!results || results.length === 0) {
    return { success: false, error: 'El test no tiene resultados capturados' }
  }

  // Calculate overall pass: hasFailed if any result explicitly failed
  const hasFailed = results.some((r) => r.passed === false)
  const finalStatus = hasFailed ? 'failed' : 'completed'

  const { error: updateError } = await supabase
    .from('quality_tests')
    .update({
      status: finalStatus,
      overall_pass: !hasFailed,
      updated_by: auth.userId,
    })
    .eq('id', data.testId)

  if (updateError) {
    console.error('Error completing test:', updateError)
    return { success: false, error: 'Error al completar el test' }
  }

  revalidatePath(`/production/batches/${data.batchId}`)
  return { success: true, overallPass: !hasFailed }
}

export async function rejectQualityTest(input: RejectTestInput): Promise<{ success: boolean; error?: string }> {
  // Validate input
  const parsed = rejectTestSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Datos inválidos' }
  }
  const data = parsed.data

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
    .eq('id', data.testId)

  if (error) {
    console.error('Error rejecting test:', error)
    return { success: false, error: 'Error al rechazar el test' }
  }

  revalidatePath(`/production/batches/${data.batchId}`)
  return { success: true }
}
