'use server'

import { signupSchema } from '@/schemas/auth'
import { createAdminClient } from '@/lib/supabase/admin'

type SignupResult =
  | { success: true }
  | { success: false; error: string; field?: string }

export async function signup(raw: unknown): Promise<SignupResult> {
  const parsed = signupSchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { success: false, error: first.message, field: first.path[0] as string }
  }

  const data = parsed.data
  const admin = createAdminClient()

  // 1. Create auth user (duplicate-email check is implicit)
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    app_metadata: { role: 'admin' },
  })

  if (authError) {
    if (authError.message?.includes('already been registered') || authError.message?.includes('already exists')) {
      return { success: false, error: 'Este email ya está registrado', field: 'email' }
    }
    return { success: false, error: 'Error al crear la cuenta. Intenta nuevamente.' }
  }

  const userId = authData.user.id

  // 2. Create company
  const { data: companyData, error: companyError } = await admin
    .from('companies')
    .insert({
      name: data.name,
      legal_id: data.legal_id || null,
      country: data.country,
      timezone: data.timezone,
      currency: data.currency,
      created_by: userId,
    })
    .select('id')
    .single()

  if (companyError || !companyData) {
    // Rollback: delete auth user
    await admin.auth.admin.deleteUser(userId)
    return { success: false, error: 'Error al crear la empresa. Intenta nuevamente.' }
  }

  const companyId = companyData.id

  // 3. Update auth metadata with company_id
  const { error: metaError } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { company_id: companyId, role: 'admin' },
  })

  if (metaError) {
    // Rollback: delete company + auth user
    await admin.from('companies').delete().eq('id', companyId)
    await admin.auth.admin.deleteUser(userId)
    return { success: false, error: 'Error al configurar la cuenta. Intenta nuevamente.' }
  }

  // 4. Create public.users record
  const { error: userError } = await admin.from('users').insert({
    id: userId,
    company_id: companyId,
    email: data.email,
    full_name: data.full_name,
    phone: data.phone || null,
    role: 'admin',
    created_by: userId,
  })

  if (userError) {
    // Rollback: delete company + auth user
    await admin.from('companies').delete().eq('id', companyId)
    await admin.auth.admin.deleteUser(userId)
    return { success: false, error: 'Error al crear el usuario. Intenta nuevamente.' }
  }

  return { success: true }
}
