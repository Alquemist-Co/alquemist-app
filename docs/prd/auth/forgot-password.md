# Recuperar Contraseña

## Metadata

- **Ruta**: `/forgot-password`
- **Roles con acceso**: Público (sin autenticación)
- **Tipo componente**: Client Component (`'use client'`)
- **Edge Functions**: Ninguna — usa Server Action con `generateLink()` + Resend (per CLAUDE.md mandate: never use GoTrue's built-in mailer)

## Objetivo

Permitir a un usuario que olvidó su contraseña solicitar un link de restablecimiento por email. Es el primer paso del flujo de recuperación (forgot → email → reset). Usa `admin.auth.admin.generateLink({ type: 'recovery' })` para generar el token y Resend para enviar el email (nunca GoTrue built-in mailer, que rompe `redirect_to` en producción).

Usuarios principales: cualquier usuario registrado que no recuerda su contraseña.

## Tablas del modelo involucradas

| Tabla      | Operaciones | Notas                                                                     |
| ---------- | ----------- | ------------------------------------------------------------------------- |
| auth.users | R           | `generateLink()` verifica internamente si el email existe y genera recovery token |

No se accede directamente a tablas del modelo de Alquemist. El token se genera via Supabase Admin API y el email se envía via Resend.

## ENUMs utilizados

Ninguno.

## Layout y componentes principales

Página pública fuera del layout de dashboard. Diseño minimalista.

- **Logo** — Identidad de Alquemist
- **Título** — "Recuperar contraseña"
- **Descripción** — "Ingresa tu email y te enviaremos un link para restablecer tu contraseña"
- **Formulario**:
  - Input: Email (type="email", autocomplete="email", req)
  - Botón "Enviar link" (variant="primary", full-width)
- **Estado de éxito** — Reemplaza el formulario:
  - Ícono de email enviado
  - Mensaje: "Revisa tu bandeja de entrada"
  - Texto: "Si existe una cuenta con ese email, recibirás un link de restablecimiento"
  - Link "Volver a iniciar sesión" → `/login`
- **Footer** — Link "Volver a iniciar sesión" → `/login`

**Responsive**: Formulario max-width ~400px centrado en desktop, full-width en móvil.

## Requisitos funcionales

- **RF-01**: El usuario ingresa su email y envía el formulario
- **RF-02**: Validar formato de email con Zod antes de enviar
- **RF-03**: Server Action llama `admin.auth.admin.generateLink({ type: 'recovery', email })` para obtener el token, construye URL de confirmación (`/auth/confirm?token_hash=...&type=recovery&redirect_to=/reset-password`), y envía el email via Resend con template branded en español
- **RF-04**: Mostrar SIEMPRE el mismo mensaje de éxito, independientemente de si el email existe o no (prevenir enumeración de usuarios)
- **RF-05**: El link enviado por email apunta a `/auth/confirm` con `token_hash`, `type=recovery` y `redirect_to=/reset-password`
- **RF-06**: `/auth/confirm` intercambia el token por una sesión y redirige a `/reset-password`
- **RF-07**: Si el usuario ya tiene sesión activa, permitir el acceso (puede querer cambiar su contraseña) pero mostrar nota: "Tienes una sesión activa. También puedes cambiar tu contraseña desde tu perfil"

## Requisitos no funcionales

- **RNF-01**: NUNCA revelar si el email existe en el sistema — el mensaje de éxito es siempre el mismo
- **RNF-02**: Rate limiting delegado a Supabase Auth (built-in, ~5 requests por hora por email)
- **RNF-03**: El token de recovery tiene expiración (configurable en Supabase, default 1 hora)
- **RNF-04**: El email se envía via Resend (`noreply@alquemist.co`), nunca via GoTrue built-in mailer

## Flujos principales

### Happy path

1. Usuario navega a `/forgot-password`
2. Ingresa su email → click "Enviar link"
3. Validación Zod pasa → botón se deshabilita, muestra loading
4. Server Action genera link via `generateLink()` y envía email via Resend
5. UI cambia a estado de éxito: "Revisa tu bandeja de entrada"
6. Usuario revisa email → click en link → navega a `/reset-password`

### Email no registrado

1. Usuario ingresa email que no existe
2. `generateLink()` retorna error (email not found), Server Action ignora el error
3. UI muestra el MISMO mensaje de éxito (no revela que el email no existe)
4. No se envía ningún email

### Error de red

1. Server Action falla por error de conexión
2. Mostrar toast: "Error de conexión. Intenta nuevamente"
3. Formulario se re-habilita

### Rate limited

1. Usuario envía múltiples requests
2. Supabase retorna error de rate limit
3. Mostrar toast: "Demasiados intentos. Espera unos minutos"

## Estados y validaciones

### Estados de UI

| Estado     | Descripción                                                   |
| ---------- | ------------------------------------------------------------- |
| idle       | Formulario visible, campo vacío                               |
| submitting | Botón deshabilitado, spinner                                  |
| success    | Formulario reemplazado por mensaje de éxito y link a login    |
| error      | Toast con error de red o rate limit, formulario re-habilitado |

### Validaciones Zod

```
email: z.string().min(1, 'El email es requerido').email('Formato de email inválido')
```

### Errores esperados

| Escenario              | Mensaje al usuario                               |
| ---------------------- | ------------------------------------------------ |
| Email formato inválido | "Formato de email inválido"                      |
| Network error          | "Error de conexión. Intenta nuevamente"          |
| Rate limited           | "Demasiados intentos. Espera unos minutos"       |
| Email no existe        | (NO se muestra error — misma respuesta de éxito) |

## Dependencias

- **Páginas relacionadas**:
  - `/login` — link de regreso, origen típico del flujo
  - `/reset-password` — destino del link enviado por email
  - `/settings/profile` (Fase 2) — alternativa para cambiar contraseña estando autenticado
- **Server Action**: `app/(auth)/forgot-password/actions.ts` — `requestPasswordReset()` via `generateLink()` + Resend
- **Admin client**: `lib/supabase/admin.ts` — service role for `generateLink()`
- **Email template**: `lib/email/templates.ts` — `recoveryEmailTemplate()` (branded, Spanish)
- **Auth confirm**: `app/auth/confirm/route.ts` — exchanges token_hash for session
