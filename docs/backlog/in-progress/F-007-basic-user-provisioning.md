# F-007: Provisioning Basico de Usuarios

## Overview

Capacidad minima para que un admin pueda crear usuarios nuevos desde la app, sin depender del SQL Editor de Supabase Dashboard. Incluye un Supabase Admin client (service_role_key), un Server Action para crear usuarios, y una pagina simple con formulario. No incluye listado, edicion ni desactivacion de usuarios — eso es F-061 (Fase 4).

## Justificacion

F-061 (Gestion completa de usuarios) esta en Fase 4 (semana 17+). Las fases 1-3 necesitan poder crear usuarios de prueba facilmente. Sin F-007, cada usuario nuevo requiere SQL manual en Supabase Dashboard. Este feature es el minimo viable que desbloquea el desarrollo de las fases siguientes.

## User Personas

- **Admin**: Necesita crear cuentas para su equipo (operadores, supervisores, managers) sin acceso al Dashboard de Supabase.

## Dependencies

- **Requiere**: F-004 (auth + requireAuth + route-access)
- **Requerido por**: F-061 (hereda `admin.ts` y `createUser` como base)
- **NO depende de**: F-005 (layout) ni F-006 (PWA) — se puede implementar en paralelo

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-007-001 | Supabase Admin client helper | S | P0 | Done |
| US-007-002 | Server Action createUser | S | P0 | Done |
| US-007-003 | Pagina minima de creacion de usuario | S | P0 | Planned |

---

# US-007-001: Supabase Admin client helper

## User Story

**As a** developer,
**I want** un helper que cree un Supabase client con `service_role_key` para operaciones administrativas,
**So that** pueda usar la Admin API de Supabase desde Server Actions de forma segura.

## Acceptance Criteria

### Scenario 1: Admin client funcional
- **Given** que `SUPABASE_SERVICE_ROLE_KEY` esta configurada en `.env.local`
- **When** un Server Action llama a `createAdminClient()`
- **Then** retorna un Supabase client con permisos de service_role que puede crear usuarios via `auth.admin.createUser()`

### Scenario 2: Error si falta la key
- **Given** que `SUPABASE_SERVICE_ROLE_KEY` NO esta configurada
- **When** se intenta crear el admin client
- **Then** lanza un error descriptivo "SUPABASE_SERVICE_ROLE_KEY is not set"

### Scenario 3: Server-only
- **Given** que el archivo `admin.ts` existe
- **When** se intenta importar desde un Client Component
- **Then** el build falla con error de server-only boundary (usa `import 'server-only'`)

## Definition of Done
- [ ] Archivo `src/lib/supabase/admin.ts` creado con `createAdminClient()`
- [ ] Usa `import 'server-only'` para prevenir uso en client
- [ ] `SUPABASE_SERVICE_ROLE_KEY` agregada a `.env.example`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` agregada a `.env.local`
- [ ] Key configurada en Vercel env vars

## Technical Notes
- Ubicacion: `src/lib/supabase/admin.ts`
- Usa `createClient` de `@supabase/supabase-js` con `service_role` key
- NUNCA importar desde client components — usar `import 'server-only'`
- La `service_role` key bypasea RLS — usarla SOLO en Server Actions protegidas con `requireAuth()`
- Agregar `server-only` package si no esta instalado: `npm i server-only`

## Dependencies
- US-001-003 (Supabase client helpers existentes)

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-007-002: Server Action createUser

## User Story

**As a** admin,
**I want** un Server Action que cree un usuario nuevo en Supabase Auth y en la tabla `public.users`,
**So that** el nuevo usuario pueda iniciar sesion inmediatamente con las credenciales proporcionadas.

## Acceptance Criteria

### Scenario 1: Crear usuario exitosamente
- **Given** el admin esta autenticado y tiene rol `admin`
- **When** llama a `createUser` con email, fullName, role "operator" y facilityId
- **Then** se crea el usuario en `auth.users` con `app_metadata {role, company_id, facility_id}`, se crea la fila en `public.users`, y retorna `{ success: true, userId, temporaryPassword }`

### Scenario 2: Password generado automaticamente
- **Given** el admin no proporciona password
- **When** se ejecuta `createUser`
- **Then** se genera un password temporal aleatorio (12+ caracteres, alfanumerico) y se retorna para que el admin lo comparta manualmente

### Scenario 3: Password proporcionado
- **Given** el admin proporciona un password especifico
- **When** se ejecuta `createUser`
- **Then** se usa ese password para crear el usuario

### Scenario 4: Email duplicado
- **Given** ya existe un usuario con email "juan@empresa.com"
- **When** el admin intenta crear otro usuario con el mismo email
- **Then** retorna error "Ya existe un usuario con este email"

### Scenario 5: Sin permisos
- **Given** un usuario con rol `operator` intenta ejecutar `createUser`
- **When** el middleware verifica permisos
- **Then** retorna error "No autorizado" sin crear ningun usuario

## Definition of Done
- [ ] Archivo `src/lib/actions/create-user.ts` creado
- [ ] Usa `requireAuth(['admin'])` para verificar permisos
- [ ] Valida input con Zod schema
- [ ] Crea usuario en `auth.users` via `admin.auth.admin.createUser()`
- [ ] Crea fila en `public.users` con company_id del admin actual
- [ ] Retorna password temporal al admin
- [ ] Maneja errores: email duplicado, error de DB

## Technical Notes
- Ubicacion: `src/lib/actions/create-user.ts`
- Flujo: `requireAuth(['admin'])` -> validar Zod -> `admin.auth.admin.createUser()` -> INSERT `public.users` -> return password
- Zod schema `createUserSchema`:
  - `email`: `z.string().email()`
  - `fullName`: `z.string().min(2).max(100)`
  - `role`: `z.enum(['admin', 'manager', 'supervisor', 'operator', 'viewer'])`
  - `facilityId`: `z.string().uuid().optional()`
  - `password`: `z.string().min(8).optional()` (si no se provee, se genera)
- `admin.auth.admin.createUser()` con `email_confirm: true` (no requiere verificacion por email)
- El `company_id` se toma del admin que ejecuta la accion (no del input)
- Sin dependencia de SMTP: el admin comparte credenciales manualmente

## Dependencies
- US-007-001 (admin client)
- US-004-003 (requireAuth helper)

## Estimation
- **Size**: S
- **Complexity**: Medium

---

# US-007-003: Pagina minima de creacion de usuario

## User Story

**As a** admin,
**I want** una pagina simple con formulario para crear un usuario nuevo,
**So that** pueda agregar miembros al equipo desde la app sin necesidad de SQL manual.

## Acceptance Criteria

### Scenario 1: Formulario de creacion
- **Given** el admin navega a `/settings/users/new`
- **When** la pagina carga
- **Then** ve un formulario con campos: email, nombre completo, rol (dropdown), facility (dropdown opcional), y password (opcional con hint de que se genera automaticamente)

### Scenario 2: Crear usuario exitoso
- **Given** el admin llena el formulario con datos validos
- **When** toca "Crear usuario"
- **Then** se muestra un dialog con el password temporal para copiar, con boton "Copiar password" y "Cerrar"

### Scenario 3: Error de validacion
- **Given** el admin deja el email vacio o ingresa un email invalido
- **When** intenta enviar el formulario
- **Then** se muestran errores de validacion inline bajo los campos correspondientes

### Scenario 4: Error de servidor
- **Given** el admin intenta crear un usuario con email duplicado
- **When** el server action retorna error
- **Then** se muestra toast de error con el mensaje del servidor

### Scenario 5: Acceso restringido
- **Given** un usuario con rol `operator` intenta acceder a `/settings/users/new`
- **When** el middleware procesa la request
- **Then** se redirige al dashboard (la ruta `/settings` ya esta protegida por route-access)

## Definition of Done
- [ ] Ruta `/settings/users/new` con pagina funcional
- [ ] Form con React Hook Form + Zod (patron del login)
- [ ] Dropdown de roles con los 5 roles
- [ ] Dropdown de facilities (query a public.facilities del company del admin)
- [ ] Dialog mostrando password temporal con boton copiar
- [ ] Validacion client-side y server-side
- [ ] Toast de error en caso de fallo
- [ ] Accesible solo para admin (ruta protegida)

## Technical Notes
- Ruta: `src/app/(dashboard)/settings/users/new/page.tsx`
- Usa componentes existentes: `Input`, `Button`, `Dialog`, toast store
- React Hook Form + zodResolver con `createUserSchema`
- Dropdown de facilities: server component que pasa facilities como props, o client fetch
- On success: abrir `Dialog` con password temporal + boton copiar (`navigator.clipboard.writeText`)
- Sin lista de usuarios, sin editar, sin desactivar — eso es F-061
- La ruta `/settings` ya esta protegida como admin-only en `route-access.ts`

## UI/UX Notes
- Layout simple: titulo "Crear usuario" + formulario centrado
- Campos en stack vertical, ancho maximo ~480px
- Boton "Crear usuario" primary, full width en mobile
- Dialog de exito con icono de check, password en `DM Mono` para legibilidad
- Boton "Copiar" con feedback visual (cambia a "Copiado!" por 2s)

## Dependencies
- US-007-002 (server action createUser)
- US-002-001 (Button), US-002-003 (Input), US-002-005 (Dialog)
- US-004-002 (middleware protege /settings como admin-only)

## Estimation
- **Size**: S
- **Complexity**: Medium
