# Recuperar Contraseña

## Metadata

- **Ruta**: `/forgot-password`
- **Roles con acceso**: Público (sin autenticación)
- **Tipo componente**: Client Component (`'use client'`)
- **Edge Functions**: Ninguna — usa `supabase.auth.resetPasswordForEmail()` (built-in)

## Objetivo

Permitir a un usuario que olvidó su contraseña solicitar un link de restablecimiento por email. Es el primer paso del flujo de recuperación (forgot → email → reset). Usa el mecanismo nativo de Supabase Auth para generar y enviar el token de recovery.

Usuarios principales: cualquier usuario registrado que no recuerda su contraseña.

## Tablas del modelo involucradas

| Tabla | Operaciones | Notas |
|---|---|---|
| auth.users | R | Supabase verifica internamente si el email existe y genera recovery token |

No se accede directamente a tablas del modelo de Alquemist. Todo el flujo es manejado por Supabase Auth.

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
- **RF-03**: Llamar `supabase.auth.resetPasswordForEmail(email, { redirectTo })` donde `redirectTo` apunta a `/reset-password`
- **RF-04**: Mostrar SIEMPRE el mismo mensaje de éxito, independientemente de si el email existe o no (prevenir enumeración de usuarios)
- **RF-05**: El link enviado por email incluye un token de recovery que Supabase genera automáticamente
- **RF-06**: El link de recovery redirige a `/reset-password` con los parámetros de sesión en el URL fragment
- **RF-07**: Si el usuario ya tiene sesión activa, permitir el acceso (puede querer cambiar su contraseña) pero mostrar nota: "Tienes una sesión activa. También puedes cambiar tu contraseña desde tu perfil"

## Requisitos no funcionales

- **RNF-01**: NUNCA revelar si el email existe en el sistema — el mensaje de éxito es siempre el mismo
- **RNF-02**: Rate limiting delegado a Supabase Auth (built-in, ~5 requests por hora por email)
- **RNF-03**: El token de recovery tiene expiración (configurable en Supabase, default 1 hora)
- **RNF-04**: El email se envía via el servicio de email configurado en Supabase (built-in o custom SMTP)

## Flujos principales

### Happy path

1. Usuario navega a `/forgot-password`
2. Ingresa su email → click "Enviar link"
3. Validación Zod pasa → botón se deshabilita, muestra loading
4. `resetPasswordForEmail()` se ejecuta exitosamente
5. UI cambia a estado de éxito: "Revisa tu bandeja de entrada"
6. Usuario revisa email → click en link → navega a `/reset-password`

### Email no registrado

1. Usuario ingresa email que no existe
2. `resetPasswordForEmail()` se ejecuta (Supabase no genera email pero no retorna error)
3. UI muestra el MISMO mensaje de éxito (no revela que el email no existe)
4. No se envía ningún email

### Error de red

1. `resetPasswordForEmail()` falla por error de conexión
2. Mostrar toast: "Error de conexión. Intenta nuevamente"
3. Formulario se re-habilita

### Rate limited

1. Usuario envía múltiples requests
2. Supabase retorna error de rate limit
3. Mostrar toast: "Demasiados intentos. Espera unos minutos"

## Estados y validaciones

### Estados de UI

| Estado | Descripción |
|---|---|
| idle | Formulario visible, campo vacío |
| submitting | Botón deshabilitado, spinner |
| success | Formulario reemplazado por mensaje de éxito y link a login |
| error | Toast con error de red o rate limit, formulario re-habilitado |

### Validaciones Zod

```
email: z.string().min(1, 'El email es requerido').email('Formato de email inválido')
```

### Errores esperados

| Escenario | Mensaje al usuario |
|---|---|
| Email formato inválido | "Formato de email inválido" |
| Network error | "Error de conexión. Intenta nuevamente" |
| Rate limited | "Demasiados intentos. Espera unos minutos" |
| Email no existe | (NO se muestra error — misma respuesta de éxito) |

## Dependencias

- **Páginas relacionadas**:
  - `/login` — link de regreso, origen típico del flujo
  - `/reset-password` — destino del link enviado por email
  - `/settings/profile` (Fase 2) — alternativa para cambiar contraseña estando autenticado
- **Supabase client**: `src/lib/supabase/browser.ts` — `resetPasswordForEmail()`
- **Configuración Supabase**: Template de email de recovery (configurable en Supabase dashboard), redirect URL permitida
