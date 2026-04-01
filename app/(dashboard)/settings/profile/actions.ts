'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { changePasswordSchema } from '@/schemas/settings'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

type ActionResult =
  | { success: true }
  | { success: false; error: string; field?: string }

export async function changePassword(raw: unknown): Promise<ActionResult> {
  const parsed = changePasswordSchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { success: false, error: first.message, field: first.path[0] as string }
  }

  const { current_password, new_password } = parsed.data

  // Get the authenticated user
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user?.email) {
    return { success: false, error: 'Sesión inválida. Inicia sesión nuevamente.' }
  }

  // Verify current password with a throwaway client (doesn't affect the user's session)
  const verifyClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
  const { error: signInError } = await verifyClient.auth.signInWithPassword({
    email: user.email,
    password: current_password,
  })

  if (signInError) {
    return { success: false, error: 'La contraseña actual es incorrecta.', field: 'current_password' }
  }

  // Update password via admin API (doesn't touch the user's active session)
  const admin = createAdminClient()
  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    password: new_password,
  })

  if (updateError) {
    return { success: false, error: 'Error al cambiar la contraseña. Intenta nuevamente.' }
  }

  return { success: true }
}
