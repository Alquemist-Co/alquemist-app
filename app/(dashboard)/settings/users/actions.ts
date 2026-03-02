'use server'

import { inviteUserSchema, editUserSchema } from '@/schemas/users'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type ActionResult =
  | { success: true }
  | { success: false; error: string; field?: string }

async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser) return null

  const admin = createAdminClient()
  const { data } = await admin
    .from('users')
    .select('id, role, company_id')
    .eq('id', authUser.id)
    .single()

  return data
}

export async function inviteUser(raw: unknown): Promise<ActionResult> {
  const parsed = inviteUserSchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { success: false, error: first.message, field: first.path[0] as string }
  }

  const data = parsed.data
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return { success: false, error: 'No autenticado.' }
  }

  // Role guard: only admin or manager
  if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
    return { success: false, error: 'Sin permisos para invitar usuarios.' }
  }

  // Manager cannot assign admin or manager roles
  if (currentUser.role === 'manager' && (data.role === 'admin' || data.role === 'manager')) {
    return { success: false, error: 'No puedes asignar el rol de administrador o manager.', field: 'role' }
  }

  const admin = createAdminClient()
  const companyId = currentUser.company_id

  // Check email uniqueness within company
  const { data: existingUser } = await admin
    .from('users')
    .select('id')
    .eq('email', data.email)
    .eq('company_id', companyId)
    .maybeSingle()

  if (existingUser) {
    return { success: false, error: 'Ya existe un usuario con este email en la empresa.', field: 'email' }
  }

  // 1. Invite via Supabase Auth
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const { data: authData, error: authError } = await admin.auth.admin.inviteUserByEmail(
    data.email,
    {
      data: { full_name: data.full_name },
      redirectTo: `${siteUrl}/auth/confirm?redirect_to=/invite`,
    }
  )

  if (authError) {
    if (authError.message?.includes('already been registered') || authError.message?.includes('already exists')) {
      return { success: false, error: 'Este email ya está registrado en el sistema.', field: 'email' }
    }
    return { success: false, error: 'Error al enviar la invitación. Intenta nuevamente.' }
  }

  const userId = authData.user.id

  // 2. Set app_metadata
  const { error: metaError } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { company_id: companyId, role: data.role },
  })

  if (metaError) {
    await admin.auth.admin.deleteUser(userId)
    return { success: false, error: 'Error al configurar el usuario. Intenta nuevamente.' }
  }

  // 3. Create public.users record
  const { error: userError } = await admin.from('users').insert({
    id: userId,
    company_id: companyId,
    email: data.email,
    full_name: data.full_name,
    role: data.role,
    assigned_facility_id: data.assigned_facility_id ?? null,
    permissions: data.permissions,
    is_active: false,
    created_by: currentUser.id,
  })

  if (userError) {
    await admin.auth.admin.deleteUser(userId)
    return { success: false, error: 'Error al crear el registro de usuario. Intenta nuevamente.' }
  }

  return { success: true }
}

export async function editUser(userId: string, raw: unknown): Promise<ActionResult> {
  const parsed = editUserSchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { success: false, error: first.message, field: first.path[0] as string }
  }

  const data = parsed.data
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return { success: false, error: 'No autenticado.' }
  }

  // Role guard
  if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
    return { success: false, error: 'Sin permisos para editar usuarios.' }
  }

  // Manager cannot assign admin or manager roles
  if (currentUser.role === 'manager' && (data.role === 'admin' || data.role === 'manager')) {
    return { success: false, error: 'No puedes asignar el rol de administrador o manager.', field: 'role' }
  }

  // Self-role-change guard for admin
  if (userId === currentUser.id && data.role !== currentUser.role) {
    return { success: false, error: 'No puedes cambiar tu propio rol.' }
  }

  const admin = createAdminClient()
  const companyId = currentUser.company_id

  // Fetch current user data to detect role change
  const { data: targetUser } = await admin
    .from('users')
    .select('role')
    .eq('id', userId)
    .eq('company_id', companyId)
    .single()

  if (!targetUser) {
    return { success: false, error: 'Usuario no encontrado.' }
  }

  // Update public.users record
  const { error: updateError } = await admin
    .from('users')
    .update({
      full_name: data.full_name,
      role: data.role,
      assigned_facility_id: data.assigned_facility_id ?? null,
      permissions: data.permissions,
      updated_by: currentUser.id,
    })
    .eq('id', userId)
    .eq('company_id', companyId)

  if (updateError) {
    return { success: false, error: 'Error al actualizar el usuario.' }
  }

  // If role changed, update app_metadata
  if (targetUser.role !== data.role) {
    const { error: metaError } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: { role: data.role },
    })
    if (metaError) {
      // Revert the DB change
      await admin
        .from('users')
        .update({ role: targetUser.role, updated_by: currentUser.id })
        .eq('id', userId)
        .eq('company_id', companyId)
      return { success: false, error: 'Error al actualizar el rol en autenticación.' }
    }
  }

  return { success: true }
}

export async function toggleUserActive(
  userId: string,
  isActive: boolean
): Promise<ActionResult> {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return { success: false, error: 'No autenticado.' }
  }

  // Admin only
  if (currentUser.role !== 'admin') {
    return { success: false, error: 'Solo administradores pueden activar/desactivar usuarios.' }
  }

  // Self-deactivation guard
  if (userId === currentUser.id) {
    return { success: false, error: 'No puedes desactivarte a ti mismo.' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('users')
    .update({ is_active: isActive, updated_by: currentUser.id })
    .eq('id', userId)
    .eq('company_id', currentUser.company_id)

  if (error) {
    return { success: false, error: 'Error al cambiar el estado del usuario.' }
  }

  return { success: true }
}

export async function resendInvite(userId: string): Promise<ActionResult> {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return { success: false, error: 'No autenticado.' }
  }

  if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
    return { success: false, error: 'Sin permisos para reenviar invitaciones.' }
  }

  const admin = createAdminClient()

  // Fetch user to get email and verify pending status
  const { data: targetUser } = await admin
    .from('users')
    .select('email, last_login_at')
    .eq('id', userId)
    .eq('company_id', currentUser.company_id)
    .single()

  if (!targetUser) {
    return { success: false, error: 'Usuario no encontrado.' }
  }

  if (targetUser.last_login_at !== null) {
    return { success: false, error: 'Este usuario ya ha aceptado la invitación.' }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const { error } = await admin.auth.admin.inviteUserByEmail(targetUser.email, {
    redirectTo: `${siteUrl}/auth/confirm?redirect_to=/invite`,
  })

  if (error) {
    return { success: false, error: 'Error al reenviar la invitación.' }
  }

  return { success: true }
}
