type InviteEmailProps = {
  fullName: string
  email: string
  confirmUrl: string
}

type RecoveryEmailProps = {
  email: string
  confirmUrl: string
}

function layout(content: string, footerEmail: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;">

<!-- Header -->
<tr><td style="background-color:#f0fdf4;padding:24px;text-align:center;">
  <span style="font-size:24px;font-weight:700;color:#16a34a;">Alquemist</span>
</td></tr>

<!-- Body -->
<tr><td style="padding:32px 24px;">
${content}
</td></tr>

<!-- Footer -->
<tr><td style="padding:16px 24px;border-top:1px solid #e4e4e7;text-align:center;">
  <p style="margin:0;font-size:12px;color:#a1a1aa;">
    &copy; Alquemist &middot; alquemist.co<br>
    Este email fue enviado a ${footerEmail}
  </p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

export function inviteEmailTemplate({ fullName, email, confirmUrl }: InviteEmailProps) {
  const content = `
  <p style="margin:0 0 16px;font-size:16px;color:#18181b;">Hola ${fullName},</p>
  <p style="margin:0 0 16px;font-size:15px;color:#3f3f46;">
    Has sido invitado a unirte a <strong>Alquemist</strong>. Haz clic en el bot&oacute;n para activar tu cuenta y establecer tu contrase&ntilde;a.
  </p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr><td align="center">
      <a href="${confirmUrl}" target="_blank" style="display:inline-block;padding:12px 32px;background-color:#16a34a;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:6px;">
        Activar mi cuenta
      </a>
    </td></tr>
  </table>
  <p style="margin:0 0 8px;font-size:13px;color:#71717a;">Si el bot&oacute;n no funciona, copia y pega este enlace en tu navegador:</p>
  <p style="margin:0 0 16px;font-size:13px;color:#a1a1aa;word-break:break-all;">${confirmUrl}</p>
  <p style="margin:0;font-size:13px;color:#71717a;">Este enlace expira en 72 horas.</p>`

  return {
    subject: 'Has sido invitado a Alquemist',
    html: layout(content, email),
  }
}

export function recoveryEmailTemplate({ email, confirmUrl }: RecoveryEmailProps) {
  const content = `
  <p style="margin:0 0 16px;font-size:16px;color:#18181b;">Hola,</p>
  <p style="margin:0 0 16px;font-size:15px;color:#3f3f46;">
    Recibimos una solicitud para restablecer tu contrase&ntilde;a. Haz clic en el bot&oacute;n para continuar.
  </p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr><td align="center">
      <a href="${confirmUrl}" target="_blank" style="display:inline-block;padding:12px 32px;background-color:#16a34a;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:6px;">
        Restablecer contrase&ntilde;a
      </a>
    </td></tr>
  </table>
  <p style="margin:0 0 8px;font-size:13px;color:#71717a;">Si el bot&oacute;n no funciona, copia y pega este enlace en tu navegador:</p>
  <p style="margin:0 0 16px;font-size:13px;color:#a1a1aa;word-break:break-all;">${confirmUrl}</p>
  <p style="margin:0 0 8px;font-size:13px;color:#71717a;">Este enlace expira en 1 hora.</p>
  <p style="margin:0;font-size:13px;color:#71717a;">Si no solicitaste este cambio, puedes ignorar este email.</p>`

  return {
    subject: 'Restablecer contraseña — Alquemist',
    html: layout(content, email),
  }
}
