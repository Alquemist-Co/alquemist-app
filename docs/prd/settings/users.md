# Gestión de Usuarios

## Metadata

- **Ruta**: `/settings/users`
- **Roles con acceso**: admin (CRUD completo), manager (invitar supervisor/operator/viewer, leer todos)
- **Tipo componente**: Mixto (Server Component para listado, Client Component para dialogs de invitación/edición)
- **Edge Functions**: Ninguna — invitación via Server Action con `admin.ts` (service role) para crear auth.users + PostgREST para users

## Objetivo

Permitir al admin gestionar los usuarios de su empresa: ver listado, invitar nuevos usuarios por email, asignar roles y permisos, asignar facility, reenviar invitaciones y desactivar usuarios. Los managers pueden invitar usuarios con roles inferiores (supervisor, operator, viewer) pero no pueden crear admins ni otros managers.

Usuarios principales: admin y manager de la empresa.

## Tablas del modelo involucradas

| Tabla      | Operaciones | Notas                                                                                                                                        |
| ---------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| users      | R/W         | Listar todos los usuarios de la empresa; crear registro al invitar; actualizar role, permissions, assigned_facility_id, is_active            |
| auth.users | W           | Crear cuenta via Supabase Admin API al invitar (`auth.admin.createUser` o `auth.admin.inviteUserByEmail`). Actualizar al reenviar invitación |
| companies  | R           | Nombre de empresa para contexto                                                                                                              |
| facilities | R           | Lista de facilities para asignar al usuario (FK assigned_facility_id)                                                                        |

## ENUMs utilizados

| ENUM      | Valores                                              | Tabla.campo |
| --------- | ---------------------------------------------------- | ----------- |
| user_role | admin \| manager \| supervisor \| operator \| viewer | users.role  |

## Layout y componentes principales

Página dentro del layout de dashboard con sidebar.

- **Header de página** — Título "Usuarios" + breadcrumb (Settings > Usuarios) + botón "Invitar usuario" (variant="primary")
- **Barra de filtros** — Inline
  - Select: Filtrar por rol (Todos / admin / manager / supervisor / operator / viewer)
  - Select: Filtrar por estado (Todos / Activos / Inactivos)
  - Input: Buscar por nombre o email
- **Tabla de usuarios** — Server Component con datos paginados
  - Columnas: Nombre, Email, Rol (badge con color por rol), Instalación asignada, Estado (badge: Activo verde / Inactivo gris / Pendiente amarillo), Último acceso (fecha relativa), Acciones
  - Acciones por fila (dropdown menu):
    - "Editar" → abre dialog de edición
    - "Reenviar invitación" → visible solo si usuario nunca ha iniciado sesión (last_login_at IS NULL)
    - "Desactivar" / "Reactivar" → toggle is_active con confirmación
  - Paginación server-side (20 por página)
  - El usuario actual no puede editarse a sí mismo desde esta tabla (debe ir a `/settings/profile`)
- **Dialog: Invitar usuario** — Modal
  - Input: Email (req, type="email")
  - Input: Nombre completo (req)
  - Select: Rol (req) — opciones filtradas según rol del invitador (admin ve todos; manager ve supervisor/operator/viewer)
  - Select: Instalación asignada (opt) — lista de facilities de la empresa
  - Fieldset: Permisos adicionales (checkboxes dentro de permissions JSONB):
    - Puede aprobar órdenes (can_approve_orders)
    - Puede ajustar inventario (can_adjust_inventory)
    - Puede eliminar registros (can_delete)
  - Botón "Enviar invitación" (variant="primary")
- **Dialog: Editar usuario** — Modal
  - Mismos campos que invitación excepto email (read-only)
  - Botón "Guardar cambios" (variant="primary")

**Responsive**: Tabla con scroll horizontal en móvil. Dialogs full-screen en móvil.

## Requisitos funcionales

- **RF-01**: Al cargar, obtener lista de usuarios via Server Component: `supabase.from('users').select('*, facility:facilities(name)').eq('is_active', true).order('full_name')` con paginación `.range(offset, offset + limit - 1)`
- **RF-02**: Filtros de rol, estado y búsqueda se aplican como query params en la URL para permitir deep-linking y navegación con botones atrás/adelante
- **RF-03**: Búsqueda por nombre o email usa filtro PostgREST: `.or('full_name.ilike.%term%,email.ilike.%term%')`
- **RF-04**: El estado "Pendiente" se deriva de `last_login_at IS NULL` — indica que el usuario fue invitado pero no ha activado su cuenta
- **RF-05**: Al invitar usuario, ejecutar Server Action transaccional (usa `admin.ts` con service role):
  1. Verificar que el email no existe en la empresa
  2. Crear usuario en auth.users via `auth.admin.inviteUserByEmail({ email, options: { data: { full_name } } })` — Supabase envía email de invitación automáticamente
  3. Setear `app_metadata = { company_id, role }` en auth.users
  4. Crear registro en `users`: company_id, email, full_name, role, assigned_facility_id, permissions, is_active=true
  5. Si falla → rollback (eliminar registros creados)
- **RF-06**: Admin puede asignar cualquier rol. Manager solo puede asignar supervisor, operator o viewer
- **RF-07**: Admin no puede degradar su propio rol ni desactivarse a sí mismo
- **RF-08**: Al editar usuario, ejecutar `supabase.from('users').update({ role, assigned_facility_id, permissions, full_name }).eq('id', userId)` + actualizar `app_metadata.role` via Server Action si el rol cambió
- **RF-09**: Desactivar usuario: `supabase.from('users').update({ is_active: false }).eq('id', userId)`. No elimina auth.users — el usuario simplemente no puede iniciar sesión (verificado en post-login, ver PRD auth-login RF-05)
- **RF-10**: Reactivar usuario: `supabase.from('users').update({ is_active: true }).eq('id', userId)`
- **RF-11**: Reenviar invitación: invocar `auth.admin.inviteUserByEmail()` nuevamente para el email — Supabase genera nuevo token y reenvía email
- **RF-12**: Mostrar dialog de confirmación antes de desactivar un usuario: "¿Desactivar a {nombre}? El usuario no podrá iniciar sesión."
- **RF-13**: Tras cualquier operación exitosa (invitar, editar, desactivar, reactivar), invalidar query cache `['users-list']` y mostrar toast de éxito
- **RF-14**: Validar campos del dialog de invitación con Zod antes de enviar

## Requisitos no funcionales

- **RNF-01**: RLS Pattern 1 (company_id) para lectura + Pattern 3 (admin/manager) para escritura
- **RNF-02**: El service role key solo se usa server-side en Server Actions (import "server-only")
- **RNF-03**: La lista de usuarios no muestra el password hash ni datos sensibles de auth.users
- **RNF-04**: La paginación server-side evita cargar todos los usuarios en memoria
- **RNF-05**: El email de invitación lo envía Supabase Auth — no se implementa envío de emails custom
- **RNF-06**: Facility es un campo opcional que referencia a la tabla facilities (Fase 3). Si no hay facilities creadas, el select muestra "Sin instalaciones configuradas" y permite continuar sin asignar

## Flujos principales

### Happy path — Invitar usuario

1. Admin navega a `/settings/users`
2. Click "Invitar usuario" → se abre dialog
3. Llena email, nombre, selecciona rol (ej: operator), selecciona facility (opt), marca permisos
4. Click "Enviar invitación" → validación Zod pasa → botón loading
5. Server Action crea auth.users + users → email de invitación enviado automáticamente
6. Dialog se cierra → toast "Invitación enviada a {email}" → lista se refresca
7. Nuevo usuario aparece con estado "Pendiente"

### Invitar como manager (rol limitado)

1. Manager click "Invitar usuario"
2. Select de rol muestra solo: supervisor, operator, viewer (no admin ni manager)
3. Resto del flujo igual

### Email ya existe

1. Admin intenta invitar con un email que ya existe en la empresa
2. Server Action detecta duplicado ANTES de crear registros
3. Dialog muestra error inline en campo email: "Ya existe un usuario con este email"

### Desactivar usuario

1. Admin click en menú de acciones de un usuario → "Desactivar"
2. Dialog de confirmación: "¿Desactivar a Juan Pérez? El usuario no podrá iniciar sesión."
3. Admin confirma → `users.update({ is_active: false })` → toast "Usuario desactivado"
4. El badge del usuario cambia a "Inactivo"

### Reenviar invitación

1. Admin ve usuario con estado "Pendiente" (last_login_at IS NULL)
2. Click en menú de acciones → "Reenviar invitación"
3. Server Action invoca `auth.admin.inviteUserByEmail()` nuevamente
4. Toast "Invitación reenviada a {email}"

### Editar rol y permisos

1. Admin click en "Editar" de un usuario
2. Dialog con datos actuales pre-llenados
3. Cambia rol de operator a supervisor, marca permiso can_approve_orders
4. Click "Guardar cambios" → update en users + update app_metadata.role via Server Action
5. Dialog se cierra → toast "Usuario actualizado"

## Estados y validaciones

### Estados de UI — Listado

| Estado  | Descripción                                                           |
| ------- | --------------------------------------------------------------------- |
| loading | Skeleton de tabla mientras carga                                      |
| loaded  | Tabla con datos, filtros activos                                      |
| empty   | Sin usuarios que coincidan con filtros — "No se encontraron usuarios" |
| error   | Error al cargar — "Error al cargar usuarios. Intenta nuevamente"      |

### Estados de UI — Dialog de Invitación

| Estado     | Descripción                      |
| ---------- | -------------------------------- |
| idle       | Campos vacíos, listo para llenar |
| submitting | Botón loading, campos read-only  |
| success    | Dialog se cierra, toast éxito    |
| error      | Error inline o toast según tipo  |

### Validaciones Zod — Invitación

```
email: z.string().min(1, 'El email es requerido').email('Formato de email inválido')
full_name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres')
role: z.enum(['admin', 'manager', 'supervisor', 'operator', 'viewer'], { message: 'Selecciona un rol' })
assigned_facility_id: z.string().uuid().nullable().optional()
permissions: z.object({
  can_approve_orders: z.boolean().default(false),
  can_adjust_inventory: z.boolean().default(false),
  can_delete: z.boolean().default(false),
}).default({})
```

### Validaciones Zod — Edición

Mismo schema que invitación pero sin `email` (read-only).

### Errores esperados

| Escenario                                      | Mensaje al usuario                                          |
| ---------------------------------------------- | ----------------------------------------------------------- |
| Email duplicado                                | "Ya existe un usuario con este email" (inline)              |
| Email inválido                                 | "Formato de email inválido" (inline)                        |
| Nombre vacío                                   | "El nombre es requerido" (inline)                           |
| Rol no seleccionado                            | "Selecciona un rol" (inline)                                |
| Permiso denegado (manager intenta crear admin) | "No tienes permisos para asignar este rol" (toast)          |
| Auto-desactivación                             | "No puedes desactivar tu propia cuenta" (toast)             |
| Error de red                                   | "Error de conexión. Intenta nuevamente" (toast)             |
| Error de servidor                              | "Error al enviar la invitación. Intenta nuevamente" (toast) |

## Dependencias

- **Páginas relacionadas**:
  - `/settings/profile` — el usuario edita su propia info allí, no aquí
  - `/invite/[token]` — página donde el usuario invitado activa su cuenta
  - `/settings/company` — la empresa debe existir (Fase 1)
- **Server Action**: Operación transaccional que usa `src/lib/supabase/admin.ts` (service role) para crear auth.users
- **Supabase Auth**: `auth.admin.inviteUserByEmail()` para envío de invitaciones
- **React Query**: Cache key `['users-list']` para invalidación
- **Facilities** (Fase 3): El select de facility referencia a `facilities` — si no hay facilities creadas, el campo es opcional y muestra estado vacío apropiado

## Implementation Notes

- **Implemented**: 2026-02-26
- **Schemas**: `packages/schemas/src/users.ts` — `inviteUserSchema`, `editUserSchema`
- **Server Actions**: `app/(dashboard)/settings/users/actions.ts` — `inviteUser`, `editUser`, `toggleUserActive`, `resendInvite`
- **Page**: `app/(dashboard)/settings/users/page.tsx` — Server Component with URL search param filters + pagination
- **Client Component**: `components/settings/users-client.tsx` — single client component orchestrating filters, table, invite/edit dialogs, toggle active alert dialog
- **Shared roles**: `lib/data/roles.ts` — extracted `roleBadgeStyles`, `roleLabels`, `allRoles` from `profile-info-form.tsx`
- **Facility field**: Omitted from dialogs since `facilities` table doesn't exist yet (Phase 3). `assigned_facility_id` defaults to `null`. Will be added when Phase 3 is implemented
- **Facility column**: Omitted from table for same reason — column will be added in Phase 3
- **Invite sets `is_active: false`**: Invited users start inactive; they become active upon accepting the invitation (handled in invite activation flow)
- **Cache invalidation**: Uses `router.refresh()` to re-trigger Server Component after mutations instead of React Query `['users-list']` key (page is a Server Component, not client-side fetched)
- **Debounced search**: 300ms debounce on search input before updating URL params
