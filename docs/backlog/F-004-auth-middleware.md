# F-004: Autenticacion y Middleware de Roles

## Overview

Implementacion del sistema de autenticacion basado en Supabase Auth con JWT y custom claims (company_id, role, facility_id). Incluye el middleware de Next.js que protege rutas por rol, redirige a /login cuando no hay sesion, inyecta company_id en el contexto, y las pantallas de login/logout funcionales. Los 5 roles (operator, supervisor, manager, admin, viewer) se almacenan en app_metadata y determinan que modulos y acciones son visibles.

## User Personas

- **Admin**: Necesita poder iniciar sesion y acceder a todos los modulos del sistema.
- **Operador**: Necesita un login rapido y acceso limitado solo a sus modulos (Inicio, Actividades, Inventario, Batches).
- **Supervisor**: Necesita acceso a modulos de gestion sin ver configuracion avanzada.
- **Viewer**: Necesita acceso de solo lectura a datos de produccion.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-004-001 | Pantalla de login con Supabase Auth | M | P0 | Planned |
| US-004-002 | Middleware de Next.js para proteccion de rutas | M | P0 | Planned |
| US-004-003 | Sistema de permisos por rol en el frontend | M | P0 | Planned |
| US-004-004 | Logout y manejo de sesion expirada | S | P0 | Planned |

---

# US-004-001: Pantalla de login con Supabase Auth

## User Story

**As a** operador,
**I want** una pantalla de login sencilla donde pueda autenticarme con email y contrasena,
**So that** pueda acceder a la aplicacion de forma segura y rapida desde mi celular en campo.

## Acceptance Criteria

### Scenario 1: Login exitoso
- **Given** que el operador esta en la pantalla `/login`
- **When** ingresa un email y contrasena validos de un usuario registrado en Supabase Auth
- **Then** se autentica exitosamente, se redirige al dashboard correspondiente a su rol (operador -> dash-operator), y el JWT contiene los claims company_id, role y facility_id en app_metadata

### Scenario 2: Login con credenciales invalidas
- **Given** que el operador esta en la pantalla `/login`
- **When** ingresa un email o contrasena incorrectos
- **Then** se muestra un mensaje de error "Credenciales invalidas" debajo del formulario, el formulario no se limpia (el email permanece), y el foco va al campo de contrasena para reintentar

### Scenario 3: Login sin conexion
- **Given** que el operador no tiene conexion a internet
- **When** intenta hacer login
- **Then** se muestra un mensaje "Sin conexion a internet. Verifica tu red e intenta nuevamente", el boton de login no se queda en estado loading indefinido, y no hay crash de la aplicacion

### Scenario 4: Pantalla de login responsive
- **Given** que el operador abre `/login` en un dispositivo movil
- **When** la pantalla se carga
- **Then** el formulario esta centrado, el logo de Alquemist es visible arriba, los inputs tienen height 48px con touch targets amplios, y el layout no usa sidebar ni bottom bar (layout auth independiente)

## Definition of Done
- [ ] Pantalla `/login` funcional con formulario de email + contrasena
- [ ] Validacion con Zod: email valido, contrasena minimo 6 caracteres
- [ ] Integracion con Supabase Auth `signInWithPassword`
- [ ] Redirect al dashboard por rol despues del login
- [ ] Layout auth centrado sin sidebar/bottombar
- [ ] Manejo de errores: credenciales invalidas, sin conexion, error de servidor
- [ ] Logo Alquemist y brand colors
- [ ] Responsive: funciona en mobile y desktop
- [ ] `npm run build` exitoso

## Technical Notes
- Ubicacion: `src/app/(auth)/login/page.tsx` y `src/app/(auth)/layout.tsx`
- Usar `@supabase/ssr` createBrowserClient para auth en client
- Validar con React Hook Form + Zod schema: `loginSchema = z.object({ email: z.string().email(), password: z.string().min(6) })`
- El JWT de Supabase contiene app_metadata con claims custom: `{ company_id, role, facility_id }`
- Referencia estructura: docs/alquemist-proyecto.md seccion "Estructura del Proyecto" > (auth) route group
- Pantallas relacionadas: docs/alquemist-pwa-reqs.md > no hay pantalla especifica de login documentada, seguir design system

## Dependencies
- US-001-003 (Supabase client helpers)
- US-001-004 (Tailwind con brand tokens)
- US-003-008 (seed data con usuarios de prueba)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-004-002: Middleware de Next.js para proteccion de rutas

## User Story

**As a** admin,
**I want** que las rutas de la aplicacion esten protegidas por un middleware que verifique la sesion y el rol del usuario,
**So that** usuarios no autenticados sean redirigidos al login y cada rol solo pueda acceder a los modulos permitidos.

## Acceptance Criteria

### Scenario 1: Redireccion a login sin sesion
- **Given** que un usuario no autenticado intenta acceder a `/batches`
- **When** el middleware intercepta el request
- **Then** redirige a `/login` con el path original como parametro de retorno (`/login?redirectTo=/batches`), y despues del login exitoso el usuario es redirigido al path original

### Scenario 2: Acceso permitido segun rol
- **Given** que un usuario con rol `operator` esta autenticado
- **When** intenta acceder a `/activities`
- **Then** el middleware permite el acceso porque el operador tiene permiso al modulo Actividades

### Scenario 3: Acceso denegado por rol
- **Given** que un usuario con rol `operator` esta autenticado
- **When** intenta acceder a `/settings` (modulo Configuracion)
- **Then** el middleware redirige a `/` (dashboard) porque el operador no tiene acceso al modulo Configuracion, y se muestra un toast informando "No tienes acceso a esta seccion"

### Scenario 4: Refresh de token JWT
- **Given** que un usuario autenticado tiene un JWT proximo a expirar
- **When** el middleware intercepta un request
- **Then** refresca el token automaticamente usando `@supabase/ssr`, la sesion se mantiene activa sin que el usuario tenga que re-autenticarse, y el nuevo JWT tiene los mismos claims

## Definition of Done
- [ ] Middleware en `middleware.ts` (raiz del proyecto)
- [ ] Verifica sesion de Supabase en cada request a rutas protegidas
- [ ] Redirect a `/login` si no hay sesion
- [ ] Redirect preserva el path original (redirectTo)
- [ ] Verificacion de rol para rutas de cada modulo
- [ ] Refresh automatico de JWT
- [ ] Rutas publicas excluidas: /login, /api/webhooks/*, assets estaticos
- [ ] Inyeccion de company_id en headers para Server Components

## Technical Notes
- Ubicacion: `middleware.ts` en raiz + `src/lib/auth/middleware.ts` con logica de roles
- Usar `updateSession` de `@supabase/ssr` para refresh de token
- Matriz de acceso por rol en docs/alquemist-pwa-reqs.md seccion "Matriz de Acceso por Rol"
- Claims JWT: docs/alquemist-proyecto.md seccion "Auth Claims y Roles"
- Referencia: docs/alquemist-proyecto.md seccion "Setup Dia 1" paso 7
- Server Action auth pattern: docs/alquemist-features.md seccion "Server Actions" > verificar user y role

## Dependencies
- US-001-003 (Supabase client helpers, especialmente middleware.ts)
- US-004-001 (pantalla de login disponible para redirect)

## Estimation
- **Size**: M
- **Complexity**: High

---

# US-004-003: Sistema de permisos por rol en el frontend

## User Story

**As a** supervisor,
**I want** que la interfaz me muestre solo los modulos y acciones a los que tengo acceso segun mi rol,
**So that** no me confunda con opciones que no puedo usar y tenga una experiencia optimizada para mi trabajo.

## Acceptance Criteria

### Scenario 1: Modulos visibles por rol
- **Given** que un usuario con rol `operator` esta autenticado
- **When** se carga la aplicacion
- **Then** la barra de navegacion (bottombar mobile / sidebar desktop) muestra solo 4 modulos: Inicio, Actividades, Inventario, Batches + "Mas"

### Scenario 2: Acciones ocultas por rol
- **Given** que un usuario con rol `viewer` esta en la pantalla de detalle de un batch
- **When** se carga la pantalla
- **Then** los botones de accion ("Avanzar fase", "Split batch", "Registrar observacion") NO se muestran porque viewer es solo lectura

### Scenario 3: Helper de permisos funcional
- **Given** que existe un hook `usePermissions()` o utilidad `hasPermission(action)`
- **When** un componente consulta `hasPermission('create_order')`
- **Then** retorna `true` para roles manager y admin, `false` para operator, supervisor y viewer, basado en la matriz de acceso definida

### Scenario 4: Permisos consistentes entre client y server
- **Given** que el frontend oculta un boton de accion para un rol
- **When** el usuario manipula el DOM o hace un request directo al Server Action
- **Then** el Server Action tambien valida el rol y rechaza la operacion con error "Forbidden: role operator", asegurando que el backend es la fuente de verdad de permisos

## Definition of Done
- [ ] Mapa de roles a modulos implementado segun la matriz de acceso
- [ ] Hook `usePermissions()` o `useAuth()` que expone: role, permissions, hasPermission()
- [ ] Componente wrapper `<RoleGate role={[...]} />` para ocultar secciones por rol
- [ ] Constantes de permisos por modulo y accion en `src/lib/auth/permissions.ts`
- [ ] Validacion de rol en Server Actions (pattern documentado)
- [ ] Tests unitarios para el sistema de permisos

## Technical Notes
- Referencia principal: docs/alquemist-pwa-reqs.md seccion "Matriz de Acceso por Rol"
- Bottom bar por rol: docs/alquemist-pwa-reqs.md seccion "Navegacion Mobile" > tabla de bottom bar por rol
- Policies de rol en DB: docs/alquemist-features.md seccion "Policies de Rol (Component-Level)"
- Pattern de validacion en Server Actions: docs/alquemist-features.md seccion "Convenciones de Codigo" > Server Actions
- Ubicacion: `src/lib/auth/permissions.ts`, `src/hooks/use-permissions.ts`
- El frontend NUNCA confia solo en ocultar UI: el backend es la fuente de verdad

## Dependencies
- US-004-002 (middleware con informacion de rol disponible)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-004-004: Logout y manejo de sesion expirada

## User Story

**As a** operador,
**I want** poder cerrar sesion de forma segura y que la aplicacion me redirija al login si mi sesion expira,
**So that** mi cuenta este protegida cuando comparto dispositivo y no pierda trabajo en progreso si la sesion caduca.

## Acceptance Criteria

### Scenario 1: Logout exitoso
- **Given** que el operador esta autenticado y en cualquier pantalla
- **When** hace tap en "Cerrar sesion" desde el menu "Mas" (mobile) o el dropdown de avatar (desktop)
- **Then** la sesion se cierra en Supabase, se eliminan las cookies de sesion, se redirige a `/login`, y los datos cacheados en TanStack Query se limpian

### Scenario 2: Sesion expirada durante uso
- **Given** que el token JWT del operador ha expirado y el refresh token tambien
- **When** el operador intenta navegar o ejecutar una accion
- **Then** el middleware detecta la sesion invalida, redirige a `/login` con un mensaje "Tu sesion ha expirado, por favor inicia sesion nuevamente", y si habia datos offline pendientes de sincronizar, estos se conservan en IndexedDB para sincronizar despues del re-login

### Scenario 3: Logout limpia estado local
- **Given** que el operador hace logout
- **When** la sesion se cierra
- **Then** el store de Zustand se reinicia, los caches de TanStack Query se invalidan, las cookies de sesion se eliminan, y al hacer login con otro usuario no se muestran datos del usuario anterior

## Definition of Done
- [ ] Boton de logout accesible desde menu "Mas" y dropdown de usuario
- [ ] Llamada a `supabase.auth.signOut()`
- [ ] Limpieza de cookies de sesion
- [ ] Limpieza de TanStack Query cache
- [ ] Limpieza de Zustand stores
- [ ] Redirect a `/login`
- [ ] Manejo de sesion expirada en middleware
- [ ] Datos offline preservados al expirar sesion
- [ ] Mensaje claro al operador sobre sesion expirada
- [ ] No hay data leaks entre sesiones de diferentes usuarios

## Technical Notes
- Usar `supabase.auth.signOut()` de `@supabase/ssr`
- Limpiar `queryClient.clear()` de TanStack Query
- Considerar un evento `onAuthStateChange` para detectar sesion expirada proactivamente
- Los datos offline en Dexie (IndexedDB) NO se borran al logout por diseno (el sync queue se procesara al re-login)
- Referencia: docs/alquemist-proyecto.md seccion "Auth Claims y Roles"
- El refresh token de Supabase tiene duracion configurable (default 1 semana)

## Dependencies
- US-004-001 (pantalla de login para redirect)
- US-004-002 (middleware para detectar sesion expirada)

## Estimation
- **Size**: S
- **Complexity**: Medium
