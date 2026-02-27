'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { forgotPasswordSchema } from '@/schemas/auth'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

type ActionResult =
  | { success: true }
  | { success: false; error: string }

export async function requestPasswordReset(raw: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: 'Email inválido.' }

  const admin = createAdminClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  // Generate recovery link (doesn't send email)
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: parsed.data.email,
  })

  if (error || !data) {
    // Always return success to prevent email enumeration
    return { success: true }
  }

  // Build our own URL pointing to auth/confirm with the correct redirect
  const confirmUrl = `${siteUrl}/auth/confirm?token_hash=${data.properties.hashed_token}&type=recovery&redirect_to=/reset-password`

  // Send via Resend
  await resend.emails.send({
    from: 'Alquemist <onboarding@resend.dev>',
    to: parsed.data.email,
    subject: 'Restablecer contraseña — Alquemist',
    html: `<h2>Restablecer contraseña</h2>
      <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
      <p><a href="${confirmUrl}">Restablecer contraseña</a></p>
      <p>Si no solicitaste este cambio, ignora este email.</p>
      <p>Este enlace expira en 1 hora.</p>`,
  })

  return { success: true }
}
