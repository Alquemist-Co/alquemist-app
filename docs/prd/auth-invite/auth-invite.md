# Activación de Cuenta por Invitación

## Metadata

- **Ruta**: `/invite/[token]`
- **Roles con acceso**: Público (acceso controlado por token)
- **Tipo componente**: Client Component (`'use client'`)
- **Edge Functions**: Ninguna — usa Server Action con `admin.ts` (service role) para activar cuenta

## Objetivo

Permitir que un usuario invitado active su cuenta, establezca su contraseña y complete su perfil. No hay registro libre en Alquemist — los usuarios solo pueden unirse al sistema cuando un admin los invita desde `/settings/users`. Esta página consume el token de invitación y convierte una cuenta pendiente en una cuenta activa.

Usuarios principales: cualquier persona invitada a una empresa (cualquier rol).

## Tablas del modelo involucradas

| Tabla | Operaciones | Notas |
|---|---|---|
| users | R/W | R: verificar estado actual del usuario (email, role, company_id, is_active). W: activar cuenta (is_active=true), guardar full_name y phone |
| auth.users | W | Establecer password definitivo via Supabase Admin API |
| companies | R | Mostrar nombre de la empresa al usuario invitado |

## ENUMs utilizados

| ENUM | Valores | Tabla.campo |
|---|---|---|
| user_role | admin \| manager \| supervisor \| operator \| viewer | users.role — asignado por el admin al invitar, mostrado como info |

## Layout y componentes principales

Página pública fuera del layout de dashboard. Diseño de activación de cuenta.

- **Logo** — Identidad de Alquemist
- **Mensaje de bienvenida** — "Has sido invitado a [nombre empresa]" con el rol asignado
- **Info read-only**:
  - Email (pre-llenado desde el token/usuario, no editable)
  - Empresa (nombre de la company)
  - Rol asignado (badge visual)
- **Formulario de activación**:
  - Input: Nombre completo (req — puede venir pre-llenado si el admin lo puso)
  - Input: Teléfono (opt)
  - Input: Contraseña (req, min 8)
  - Input: Confirmar contraseña (req, must match)
  - Botón "Activar cuenta" (variant="primary", full-width)
- **Estado de error**: Pantalla dedicada si token inválido/expirado, con link para contactar admin

**Responsive**: Formulario max-width ~450px centrado en desktop, full-width en móvil.

## Requisitos funcionales

- **RF-01**: Al cargar la página, validar el token:
  - Usar el flujo de Supabase: el token es un recovery/invite token de Supabase Auth
  - Verificar que corresponde a un usuario con `is_active = false` en la tabla `users`
  - Si token inválido o expirado → mostrar pantalla de error (no formulario)
- **RF-02**: Extraer del token/usuario: email, company_id, role. Cargar company.name para mostrar
- **RF-03**: Mostrar formulario con datos pre-llenados (email read-only, nombre si el admin lo ingresó)
- **RF-04**: Validar campos con Zod antes de enviar
- **RF-05**: Al submit, ejecutar Server Action con service role:
  1. Verificar token aún válido
  2. Actualizar password en auth.users via Admin API
  3. Asegurar que `app_metadata` contiene `{ company_id, role }` correctos
  4. Actualizar `users`: `is_active = true`, `full_name`, `phone` (si fueron editados)
  5. Si cualquier paso falla → mostrar error (no hay rollback necesario — el usuario pre-existe)
- **RF-06**: Post-activación, auto-login: `signInWithPassword({ email, password })` en el cliente
- **RF-07**: Hidratar auth-store
- **RF-08**: Redirect según rol:
  - admin, manager, viewer → `/` (dashboard)
  - supervisor → `/activities/schedule`
  - operator → `/field/today`
- **RF-09**: Si el usuario ya tiene sesión activa y navega a `/invite/[token]`, mostrar mensaje: "Ya tienes una sesión activa" con opción de cerrar sesión y continuar, o ir al dashboard

## Requisitos no funcionales

- **RNF-01**: El token debe tener expiración (configurable, default 72 horas)
- **RNF-02**: Un token solo puede ser usado una vez — después de activación, queda invalidado
- **RNF-03**: La página NO revela información de la empresa si el token es inválido (prevenir enumeración)
- **RNF-04**: Password se transmite via HTTPS, hasheado por GoTrue (bcrypt)
- **RNF-05**: El admin que envía la invitación es quien define el rol — el usuario invitado NO puede cambiar su rol

## Flujos principales

### Happy path

1. Admin invita usuario desde `/settings/users` (Fase 2 — crea auth.users + users con is_active=false)
2. Supabase envía email con link de invitación conteniendo token
3. Usuario hace click en el link → navega a `/invite/[token]`
4. Página carga: token válido, extrae datos del usuario
5. Muestra: "Has sido invitado a AgroTech Colombia como Manager"
6. Email read-only pre-llenado, nombre completo editable
7. Usuario llena contraseña + confirmación → click "Activar cuenta"
8. Validación Zod pasa → submit
9. Server Action: password seteado, user activado, app_metadata confirmado
10. Auto-login exitoso → redirect por rol

### Token expirado

1. Usuario hace click en link días después
2. Página carga: validación de token falla (expirado)
3. Muestra pantalla de error: "El link de invitación ha expirado"
4. Instrucción: "Contacta a tu administrador para recibir una nueva invitación"
5. No se muestra formulario ni datos de la empresa

### Token ya usado (cuenta ya activa)

1. Usuario hace click en link por segunda vez
2. Página carga: busca usuario → `is_active = true`
3. Muestra mensaje: "Tu cuenta ya fue activada"
4. Link: "Ir a iniciar sesión" → `/login`

### Usuario ya autenticado con otra cuenta

1. Usuario tiene sesión activa (cuenta diferente) y abre link de invitación
2. Página detecta sesión activa
3. Muestra: "Tienes una sesión activa como [email]. ¿Deseas cerrar sesión para activar la invitación?"
4. Opciones: "Cerrar sesión y continuar" | "Ir al dashboard"

## Estados y validaciones

### Estados de UI

| Estado | Descripción |
|---|---|
| loading | Verificando token (spinner) |
| invalid-token | Token inválido o expirado — pantalla de error |
| already-active | Cuenta ya activada — mensaje con link a login |
| ready | Token válido — formulario de activación visible |
| submitting | Botón deshabilitado, spinner |
| error | Error de servidor — toast con mensaje |
| success | Activación exitosa → auto-login → redirect |

### Validaciones Zod

```
full_name: z.string().min(1, 'El nombre es requerido').max(200)
phone: z.string().max(20).optional()
password: z.string().min(8, 'Mínimo 8 caracteres')
confirm_password: z.string().min(1, 'Confirma la contraseña')
```

Con refinamiento: `confirm_password` debe coincidir con `password`.

### Errores esperados

| Escenario | Mensaje al usuario |
|---|---|
| Token inválido | "El link de invitación no es válido" |
| Token expirado | "El link de invitación ha expirado. Contacta a tu administrador" |
| Cuenta ya activa | "Tu cuenta ya fue activada. Inicia sesión" |
| Password < 8 chars | "La contraseña debe tener al menos 8 caracteres" |
| Passwords no coinciden | "Las contraseñas no coinciden" |
| Error de servidor | "Error al activar la cuenta. Intenta nuevamente" |

## Dependencias

- **Páginas relacionadas**:
  - `/settings/users` (Fase 2) — origen de la invitación. El admin crea el usuario pendiente y dispara el email
  - `/login` — destino si la cuenta ya está activa
  - `/forgot-password` — alternativa si el usuario olvidó su contraseña después de activar
- **Server Action**: Usa `src/lib/supabase/admin.ts` (service role) para setear password y activar usuario
- **Supabase client**: `src/lib/supabase/browser.ts` — auto-login post-activación
- **Store**: `src/stores/auth-store.ts` — hidratado post-login
- **Email**: Enviado por Supabase Auth al invitar (configurable vía Supabase dashboard o custom SMTP)
