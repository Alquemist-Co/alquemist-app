# Login

## Metadata

- **Ruta**: `/login`
- **Roles con acceso**: Público (sin autenticación)
- **Tipo componente**: Client Component (`'use client'`)
- **Edge Functions**: Ninguna — usa Supabase Auth SDK directamente

## Objetivo

Permitir a usuarios registrados iniciar sesión con email y contraseña. El login es la puerta de entrada al sistema: valida credenciales via Supabase Auth, establece la sesión JWT en cookies, y redirige al usuario a la vista apropiada según su rol.

Usuarios principales: todos los roles (admin, manager, supervisor, operator, viewer).

## Tablas del modelo involucradas

| Tabla           | Operaciones | Notas                                                                              |
| --------------- | ----------- | ---------------------------------------------------------------------------------- |
| auth.users      | R           | Validación de credenciales (manejado internamente por Supabase Auth)               |
| auth.identities | R           | Requerido para que `signInWithPassword` funcione                                   |
| users           | R           | Post-login: obtener perfil (role, company_id, permissions, is_active)              |
| companies       | R           | Post-login: verificar empresa activa, cargar config (timezone, currency, settings) |

## ENUMs utilizados

| ENUM      | Valores                                              | Tabla.campo |
| --------- | ---------------------------------------------------- | ----------- |
| user_role | admin \| manager \| supervisor \| operator \| viewer | users.role  |

## Layout y componentes principales

Página pública fuera del layout de dashboard. Sin sidebar ni topbar.

- **Logo** — Identidad visual de Alquemist centrada en la parte superior
- **Formulario de login** — Centrado vertical y horizontalmente
  - Input email (type="email", autocomplete="email")
  - Input password (type="password", autocomplete="current-password")
  - Botón submit "Iniciar sesión" (variant="primary", full-width)
  - Link "¿Olvidaste tu contraseña?" → `/forgot-password`
- **Footer** — Link "¿No tienes cuenta? Registra tu empresa" → `/signup`
- **Toast** — Mensajes de error (credenciales inválidas, cuenta suspendida)

**Responsive**: Formulario ocupa max-width ~400px en desktop, full-width con padding en móvil.

## Requisitos funcionales

- **RF-01**: El usuario ingresa email y password y envía el formulario
- **RF-02**: Validar campos con Zod antes de enviar (email formato válido, password no vacío)
- **RF-03**: Llamar `supabase.auth.signInWithPassword({ email, password })` con el cliente browser
- **RF-04**: En éxito, Supabase establece cookies de sesión automáticamente (`sb-*-auth-token`)
- **RF-05**: Consultar `users` para verificar `is_active = true`. Si inactivo, cerrar sesión inmediatamente y mostrar error
- **RF-06**: Consultar `companies` via `users.company_id` para verificar `is_active = true`. Si empresa inactiva, cerrar sesión y mostrar error
- **RF-07**: Actualizar `users.last_login_at` con timestamp actual (fire-and-forget, `.catch(() => {})`)
- **RF-08**: Hidratar el Zustand `auth-store` con datos del usuario y empresa
- **RF-09**: Redirect post-login según rol:
  - admin, manager, viewer → `/` (dashboard)
  - supervisor → `/activities/schedule`
  - operator → `/field/today`
- **RF-10**: Si el usuario ya tiene sesión activa válida al acceder a `/login`, redirect automático a la ruta correspondiente por rol (middleware)

## Requisitos no funcionales

- **RNF-01**: El formulario debe funcionar sin JavaScript habilitado a nivel de validación HTML básica (required, type="email")
- **RNF-02**: Tiempo de respuesta del login < 2s en condiciones normales
- **RNF-03**: No revelar si el email existe o no en mensajes de error de credenciales — usar mensaje genérico "Credenciales inválidas"
- **RNF-04**: Rate limiting delegado a Supabase Auth (built-in)
- **RNF-05**: Password nunca se loguea ni se almacena en estado del cliente más allá del formulario
- **RNF-06**: Cookies de sesión son httpOnly, secure, SameSite=Lax (manejado por Supabase SSR)

## Flujos principales

### Happy path

1. Usuario navega a `/login`
2. Middleware verifica: no hay sesión → muestra página de login
3. Usuario llena email y password
4. Validación Zod pasa → botón se deshabilita, muestra loading
5. `signInWithPassword()` retorna éxito
6. Verificación post-login: user.is_active y company.is_active son true
7. Actualiza last_login_at (fire-and-forget)
8. Hydrata auth-store
9. Redirect según rol

### Usuario ya autenticado

1. Usuario navega a `/login`
2. Middleware detecta sesión válida → redirect a ruta por rol
3. La página de login nunca se renderiza

### Credenciales inválidas

1. `signInWithPassword()` retorna error
2. Mostrar toast: "Credenciales inválidas"
3. Formulario se re-habilita, campos mantienen valores, password se limpia

### Cuenta desactivada

1. `signInWithPassword()` retorna éxito (Supabase Auth no sabe de is_active)
2. Query a `users` retorna `is_active = false`
3. Llamar `supabase.auth.signOut()` para limpiar sesión
4. Mostrar toast: "Tu cuenta ha sido desactivada. Contacta al administrador"

### Empresa suspendida

1. Login exitoso, user activo, pero `companies.is_active = false`
2. Llamar `supabase.auth.signOut()`
3. Mostrar toast: "La cuenta de tu empresa ha sido suspendida"

### Sesión expirada (redirect desde middleware)

1. Usuario intenta acceder a ruta protegida con sesión expirada
2. Middleware redirige a `/login?expired=true`
3. Login muestra toast: "Tu sesión ha expirado. Inicia sesión nuevamente"

## Estados y validaciones

### Estados de UI

| Estado     | Descripción                                                  |
| ---------- | ------------------------------------------------------------ |
| idle       | Formulario visible, campos vacíos o con valores previos      |
| validating | Validación Zod en curso (instantánea, no visible)            |
| submitting | Botón deshabilitado, spinner, campos read-only               |
| error      | Toast visible con mensaje de error, formulario re-habilitado |
| success    | Redirect en curso (el usuario no ve este estado)             |

### Validaciones Zod

```
email: z.string().min(1, 'El email es requerido').email('Formato de email inválido')
password: z.string().min(1, 'La contraseña es requerida')
```

Nota: No se valida longitud mínima de password en login (solo en signup/reset). El usuario puede tener passwords legacy.

### Errores esperados

| Código Supabase       | Mensaje al usuario                          |
| --------------------- | ------------------------------------------- |
| `invalid_credentials` | "Credenciales inválidas"                    |
| `email_not_confirmed` | "Confirma tu email antes de iniciar sesión" |
| `user_banned`         | "Tu cuenta ha sido suspendida"              |
| Network error         | "Error de conexión. Intenta nuevamente"     |
| Rate limited          | "Demasiados intentos. Espera un momento"    |

## Dependencias

- **Páginas relacionadas**:
  - `/forgot-password` — link desde formulario
  - `/signup` — link desde footer
  - `/invite/[token]` — flujo alternativo que también termina en sesión activa
- **Middleware**: `src/lib/auth/middleware.ts` — redirect de usuarios autenticados y sesiones expiradas
- **Supabase client**: `src/lib/supabase/browser.ts` — cliente para auth en browser
- **Store**: `src/stores/auth-store.ts` — Zustand store hidratado post-login
- **Proxy**: `src/lib/supabase/proxy.ts` — server-side auth, auto-limpieza de cookies stale
