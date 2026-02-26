# Restablecer Contraseña

## Metadata

- **Ruta**: `/reset-password/[token]`
- **Roles con acceso**: Público (acceso controlado por token de recovery)
- **Tipo componente**: Client Component (`'use client'`)
- **Edge Functions**: Ninguna — usa `supabase.auth.updateUser({ password })` (built-in)

## Objetivo

Permitir a un usuario establecer una nueva contraseña usando el token de recovery recibido por email. Es el segundo paso del flujo de recuperación iniciado en `/forgot-password`. Supabase Auth maneja la validación del token y la actualización de la contraseña.

Usuarios principales: cualquier usuario que solicitó un restablecimiento de contraseña.

## Tablas del modelo involucradas

| Tabla      | Operaciones | Notas                                                         |
| ---------- | ----------- | ------------------------------------------------------------- |
| auth.users | W           | Actualizar password (manejado internamente por Supabase Auth) |

No se accede directamente a tablas del modelo de Alquemist. Todo el flujo es manejado por Supabase Auth.

## ENUMs utilizados

Ninguno.

## Layout y componentes principales

Página pública fuera del layout de dashboard. Diseño minimalista.

- **Logo** — Identidad de Alquemist
- **Título** — "Nueva contraseña"
- **Formulario** (visible solo si token válido):
  - Input: Nueva contraseña (type="password", req, min 8)
  - Input: Confirmar contraseña (type="password", req, must match)
  - Botón "Restablecer contraseña" (variant="primary", full-width)
- **Estado de éxito** — Reemplaza el formulario:
  - Ícono de check
  - Mensaje: "Contraseña actualizada correctamente"
  - Botón "Iniciar sesión" → `/login`
- **Estado de error (token inválido)** — Reemplaza todo:
  - Mensaje: "El link ha expirado o no es válido"
  - Link "Solicitar nuevo link" → `/forgot-password`

**Responsive**: Formulario max-width ~400px centrado en desktop, full-width en móvil.

## Requisitos funcionales

- **RF-01**: Al cargar la página, Supabase procesa el token del URL fragment (hash parameters). Supabase SSR intercambia el token por una sesión de recovery automáticamente
- **RF-02**: Si el intercambio de token falla (token inválido, expirado, ya usado) → mostrar pantalla de error con link a `/forgot-password`
- **RF-03**: Si el token es válido, mostrar formulario de nueva contraseña
- **RF-04**: Validar campos con Zod: password min 8 chars, confirm debe coincidir
- **RF-05**: Al submit, llamar `supabase.auth.updateUser({ password })` — Supabase usa la sesión de recovery para autorizar el cambio
- **RF-06**: En éxito:
  - Cerrar la sesión de recovery (`supabase.auth.signOut()`)
  - Mostrar pantalla de éxito con botón para ir a `/login`
- **RF-07**: El usuario debe iniciar sesión manualmente con la nueva contraseña (no auto-login, por seguridad)

## Requisitos no funcionales

- **RNF-01**: El token de recovery es de un solo uso — después de actualizar password, queda invalidado automáticamente por Supabase
- **RNF-02**: La sesión de recovery es temporal y limitada — solo permite updateUser, no acceso completo al sistema
- **RNF-03**: Password se transmite via HTTPS, hasheado por GoTrue (bcrypt)
- **RNF-04**: Si el token ya fue usado, Supabase retorna error — mostrar pantalla de token inválido

## Flujos principales

### Happy path

1. Usuario hace click en link del email de recovery
2. Navega a `/reset-password` con token en URL fragment
3. Supabase SSR procesa el token → establece sesión de recovery
4. Página renderiza formulario de nueva contraseña
5. Usuario ingresa nueva contraseña + confirmación → click "Restablecer"
6. Validación Zod pasa → botón se deshabilita, muestra loading
7. `updateUser({ password })` exitoso
8. `signOut()` limpia sesión de recovery
9. UI cambia a estado de éxito: "Contraseña actualizada"
10. Click "Iniciar sesión" → redirect a `/login`

### Token expirado

1. Usuario hace click en link viejo (> 1 hora)
2. Supabase no puede intercambiar token → error
3. Página muestra: "El link ha expirado o no es válido"
4. Link: "Solicitar nuevo link" → `/forgot-password`
5. No se muestra formulario

### Token ya usado

1. Usuario hace click en link por segunda vez
2. Token ya fue consumido → Supabase retorna error
3. Mismo comportamiento que token expirado

### Passwords no coinciden

1. Token válido, formulario visible
2. Usuario ingresa passwords diferentes
3. Validación Zod falla → mensaje inline: "Las contraseñas no coinciden"
4. No se envía request

### Error de servidor

1. Token válido, passwords válidos
2. `updateUser()` falla por error del servidor
3. Toast: "Error al actualizar la contraseña. Intenta nuevamente"
4. Formulario se re-habilita

## Estados y validaciones

### Estados de UI

| Estado        | Descripción                                                            |
| ------------- | ---------------------------------------------------------------------- |
| loading       | Procesando token (spinner mientras Supabase intercambia)               |
| invalid-token | Token inválido/expirado — pantalla de error con link a forgot-password |
| ready         | Token válido — formulario visible                                      |
| submitting    | Botón deshabilitado, spinner                                           |
| error         | Error de servidor — toast, formulario re-habilitado                    |
| success       | Contraseña actualizada — mensaje de éxito con link a login             |

### Validaciones Zod

```
password: z.string().min(8, 'Mínimo 8 caracteres')
confirm_password: z.string().min(1, 'Confirma la contraseña')
```

Con refinamiento: `confirm_password` debe coincidir con `password`.

### Errores esperados

| Escenario              | Mensaje al usuario                                      |
| ---------------------- | ------------------------------------------------------- |
| Token expirado         | "El link ha expirado. Solicita uno nuevo"               |
| Token inválido         | "El link no es válido"                                  |
| Token ya usado         | "Este link ya fue utilizado"                            |
| Password < 8 chars     | "La contraseña debe tener al menos 8 caracteres"        |
| Passwords no coinciden | "Las contraseñas no coinciden"                          |
| Error de servidor      | "Error al actualizar la contraseña. Intenta nuevamente" |

## Dependencias

- **Páginas relacionadas**:
  - `/forgot-password` — origen del flujo, destino si token expirado
  - `/login` — destino post-reset exitoso
- **Supabase client**: `src/lib/supabase/browser.ts` — `updateUser()`, `signOut()`
- **Supabase SSR**: Intercambio automático del token de recovery en el URL fragment
- **Configuración Supabase**: Redirect URL permitida para recovery flow, expiración de token
