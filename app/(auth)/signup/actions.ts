'use server'

import { signupSchema } from '@/schemas/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { seedCompanyData } from '@/lib/seed/company-seed'

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

  // 1. Create company first (with service role — no auth user yet)
  const { data: companyData, error: companyError } = await admin
    .from('companies')
    .insert({
      name: data.name,
      legal_id: data.legal_id || null,
      country: data.country,
      timezone: data.timezone,
      currency: data.currency,
    })
    .select('id')
    .single()

  if (companyError || !companyData) {
    return { success: false, error: 'Error al crear la empresa. Intenta nuevamente.' }
  }

  const companyId = companyData.id

  // 2. Create auth user with company_id already in metadata
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    app_metadata: { role: 'admin', company_id: companyId },
  })

  if (authError) {
    // Rollback: delete company
    await admin.from('companies').delete().eq('id', companyId)

    if (authError.message?.includes('already been registered') || authError.message?.includes('already exists')) {
      return { success: false, error: 'Este email ya está registrado', field: 'email' }
    }
    return { success: false, error: 'Error al crear la cuenta. Intenta nuevamente.' }
  }

  const userId = authData.user.id

  // 3. Update company created_by now that we have the user id
  await admin
    .from('companies')
    .update({ created_by: userId })
    .eq('id', companyId)

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
    // Rollback: delete auth user + company
    await admin.auth.admin.deleteUser(userId)
    await admin.from('companies').delete().eq('id', companyId)
    return { success: false, error: 'Error al crear el usuario. Intenta nuevamente.' }
  }

  // 5. Seed company with default catalog data
  await seedCompanyData(admin, companyId, userId)

  return { success: true }
}
