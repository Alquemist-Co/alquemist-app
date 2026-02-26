'use server'

import { inviteActivationSchema } from '@/schemas/auth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type ActivateResult =
  | { success: true }
  | { success: false; error: string }

export async function activateInvite(raw: unknown): Promise<ActivateResult> {
  const parsed = inviteActivationSchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { success: false, error: first.message }
  }

  const data = parsed.data

  // Get current user from session
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: 'Sesión inválida. Intenta con un nuevo link de invitación.' }
  }

  const admin = createAdminClient()

  // Verify user is still inactive
  const { data: userData, error: fetchError } = await admin
    .from('users')
    .select('is_active')
    .eq('id', user.id)
    .single()

  if (fetchError || !userData) {
    return { success: false, error: 'No se encontró tu cuenta.' }
  }

  if (userData.is_active) {
    return { success: false, error: 'Tu cuenta ya fue activada.' }
  }

  // Update password via admin API
  const { error: pwError } = await admin.auth.admin.updateUserById(user.id, {
    password: data.password,
  })

  if (pwError) {
    return { success: false, error: 'Error al establecer la contraseña. Intenta nuevamente.' }
  }

  // Activate user and update profile
  const { error: updateError } = await admin
    .from('users')
    .update({
      is_active: true,
      full_name: data.full_name,
      phone: data.phone || null,
    })
    .eq('id', user.id)

  if (updateError) {
    return { success: false, error: 'Error al activar la cuenta. Intenta nuevamente.' }
  }

  return { success: true }
}
