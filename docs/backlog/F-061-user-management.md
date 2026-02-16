# F-061: Gestion de Usuarios e Invitaciones (CFG-02)

## Overview

Modulo de administracion de usuarios accesible solo para el rol admin. Permite listar todos los usuarios de la empresa, editar datos y roles, invitar nuevos usuarios por email, y desactivar cuentas. Incluye validaciones de negocio criticas: maximo de admins por empresa, proteccion del ultimo admin, deteccion de email duplicado, y reasignacion de actividades al desactivar un usuario.

## User Personas

- **Admin**: Gestiona el equipo de la empresa. Invita nuevos usuarios, asigna roles y facilities, y desactiva cuentas cuando un empleado deja la organizacion.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-061-001 | Lista de usuarios con filtros y busqueda | M | P0 | Planned |
| US-061-002 | Editor de usuario: datos, rol, facility y permisos | M | P0 | Planned |
| US-061-003 | Invitar usuario por email | M | P0 | Planned |
| US-061-004 | Desactivar usuario con reasignacion | M | P1 | Planned |
| US-061-005 | Validaciones de negocio de roles | S | P0 | Planned |

---

# US-061-001: Lista de usuarios con filtros y busqueda

## User Story

**As a** admin,
**I want** ver una lista de todos los usuarios de mi empresa con su nombre, email, rol, facility, ultimo login y estado,
**So that** pueda gestionar el equipo y detectar usuarios inactivos o mal configurados.

## Acceptance Criteria

### Scenario 1: Lista completa de usuarios
- **Given** la empresa tiene 15 usuarios registrados
- **When** el admin accede a la pantalla de usuarios
- **Then** ve una tabla con columnas: nombre, email, rol (badge coloreado), facility asignada, ultimo login y estado activo/inactivo

### Scenario 2: Filtrar por rol
- **Given** el admin quiere ver solo operadores
- **When** selecciona el filtro de rol "Operador"
- **Then** la tabla muestra solo usuarios con rol 'operator'

### Scenario 3: Buscar por nombre o email
- **Given** el admin busca "juan"
- **When** escribe en el campo de busqueda
- **Then** la tabla se filtra mostrando usuarios cuyo nombre o email contengan "juan"

### Scenario 4: Sin usuarios
- **Given** la empresa no tiene usuarios ademas del admin actual
- **When** accede a la lista
- **Then** ve empty state "No hay otros usuarios. Invita a tu equipo para comenzar." con CTA "Invitar usuario"

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Accessibility requirements met
- [ ] Performance within acceptable thresholds

## Technical Notes
- Query: `users WHERE company_id = auth.company_id() ORDER BY full_name`
- RLS policy: solo admin puede ver todos los usuarios de su empresa
- Tabla con `DataTable` component, sortable y filtrable
- Pantalla: `cfg-users`

## UI/UX Notes
- Tabla responsive: collapsa a cards en mobile
- Rol como badge coloreado: admin=brand, manager=info, supervisor=warning, operator=success, viewer=gris
- Ultimo login en formato relativo: "hace 2h", "hace 3 dias"
- Estado: toggle visual activo/inactivo

## Dependencies
- Requiere tabla `users` con datos (Fase 0)
- Requiere componente `DataTable` (Fase 0)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-061-002: Editor de usuario: datos, rol, facility y permisos

## User Story

**As a** admin,
**I want** editar los datos de un usuario incluyendo nombre, rol, facility asignada y permisos granulares,
**So that** pueda ajustar el acceso y la configuracion de cada miembro del equipo.

## Acceptance Criteria

### Scenario 1: Editar rol de usuario
- **Given** el admin abre el editor del usuario "Maria Lopez" que es operadora
- **When** cambia su rol a "Supervisor" y guarda
- **Then** el rol se actualiza en `auth.users.raw_app_meta_data.role`, se muestra toast "Rol actualizado. Aplicara en el proximo inicio de sesion." y la tabla refleja el nuevo rol

### Scenario 2: Cambiar facility asignada
- **Given** el admin cambia la facility de un operador de "Invernadero Norte" a "Invernadero Sur"
- **When** guarda los cambios
- **Then** el `assigned_facility_id` se actualiza y se muestra confirmacion

### Scenario 3: Editar permisos granulares
- **Given** el admin abre los permisos de un supervisor
- **When** activa "Puede aprobar ordenes" y desactiva "Puede ajustar inventario"
- **Then** el campo `permissions` JSONB se actualiza con `{can_approve_orders: true, can_adjust_inventory: false}`

### Scenario 4: Intento de editar sin permisos
- **Given** un usuario que no es admin intenta acceder a `/settings/users/[id]`
- **When** el middleware procesa la request
- **Then** redirige al dashboard con toast "Acceso denegado"

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Accessibility requirements met
- [ ] Performance within acceptable thresholds

## Technical Notes
- Server Action: `updateUserRole(userId, newRole)` que actualiza `auth.users.raw_app_meta_data.role` via Supabase Admin API
- Server Action: `updateUser(userId, data)` para datos generales y permisos
- Zod schema: `updateUserSchema` con validacion de roles validos y facility existente
- El token JWT actual del usuario editado sigue valido hasta expiracion (1h default). El nuevo rol aplica al siguiente refresh.
- Pantalla: `cfg-users`

## UI/UX Notes
- Form con React Hook Form + Zod resolver
- Rol como dropdown con descripcion de permisos por cada rol
- Permisos granulares como grid de checkboxes agrupados por modulo
- Boton "Guardar cambios" primary, "Cancelar" secondary

## Dependencies
- Requiere Supabase Admin API para modificar `raw_app_meta_data`
- Requiere middleware de proteccion de rutas (Fase 0)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-061-003: Invitar usuario por email

## User Story

**As a** admin,
**I want** invitar a un nuevo usuario ingresando su email, rol y facility,
**So that** pueda incorporar nuevos miembros al equipo de forma rapida y segura.

## Acceptance Criteria

### Scenario 1: Invitacion exitosa
- **Given** el admin llena el formulario con email "nuevo@empresa.com", rol "Operador" y facility "Invernadero Norte"
- **When** toca "Enviar invitacion"
- **Then** se crea el usuario en Supabase Auth con `app_metadata {role, company_id, facility_id}`, se envia email de invitacion y muestra toast "Invitacion enviada a nuevo@empresa.com"

### Scenario 2: Email ya registrado en la misma empresa
- **Given** el admin intenta invitar "existente@empresa.com" que ya es usuario de la empresa
- **When** toca "Enviar invitacion"
- **Then** muestra error "Usuario ya existe en esta organizacion" con link al perfil del usuario existente

### Scenario 3: Email registrado en otra empresa
- **Given** el admin intenta invitar "otro@otraempresa.com" que existe en otro company
- **When** toca "Enviar invitacion"
- **Then** muestra error "Este email ya esta registrado en otra organizacion"

### Scenario 4: Email invalido
- **Given** el admin escribe "noesunmail" en el campo de email
- **When** el campo pierde focus o intenta enviar
- **Then** muestra error de validacion "Ingresa un email valido" inline bajo el campo

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Acceptance criteria verified
- [ ] Accessibility requirements met
- [ ] Performance within acceptable thresholds

## Technical Notes
- Server Action: `inviteUser(email, role, facilityId)`
- Usa Supabase Admin API `auth.admin.inviteUserByEmail()` con `app_metadata`
- Validacion previa: `users WHERE email = input.email` para detectar duplicados
- Zod schema: `inviteUserSchema = z.object({ email: z.string().email(), role: z.enum(['operator','supervisor','manager','admin','viewer']), facility_id: z.string().uuid() })`
- RLS: solo admin puede ejecutar esta accion
- Pantalla: `cfg-users`

## UI/UX Notes
- Modal o bottom sheet con 3 campos: email, rol (dropdown), facility (dropdown)
- Boton "Enviar invitacion" primary
- Loading state durante envio
- Success: toast verde con email

## Dependencies
- Requiere Supabase Auth con invitaciones habilitadas
- Requiere SMTP configurado en Supabase para envio de emails

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-061-004: Desactivar usuario con reasignacion

## User Story

**As a** admin,
**I want** desactivar la cuenta de un usuario que ya no trabaja en la organizacion,
**So that** el ex-empleado no pueda acceder al sistema y sus actividades pendientes se reasignen.

## Acceptance Criteria

### Scenario 1: Desactivar usuario sin actividades pendientes
- **Given** el admin selecciona desactivar al usuario "Pedro Garcia" que no tiene actividades pendientes
- **When** confirma la desactivacion
- **Then** el campo `is_active` se marca false, las sesiones se revocan, y muestra toast "Usuario desactivado. No podra iniciar sesion."

### Scenario 2: Desactivar usuario con actividades pendientes
- **Given** el admin intenta desactivar a un operador que tiene 5 actividades pendientes
- **When** inicia la desactivacion
- **Then** muestra warning "Este usuario tiene 5 actividades pendientes que seran reasignadas" con opcion de seleccionar operador sustituto antes de confirmar

### Scenario 3: Desactivar ultimo admin
- **Given** la empresa tiene 1 solo admin y ese admin intenta desactivarse a si mismo
- **When** toca "Desactivar"
- **Then** muestra error "No puedes desactivar el ultimo administrador de la organizacion. Asigna otro admin primero."

### Scenario 4: Reactivar usuario desactivado
- **Given** el admin ve un usuario desactivado en la lista
- **When** toca "Reactivar"
- **Then** el usuario vuelve a `is_active=true` y puede iniciar sesion nuevamente

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Accessibility requirements met
- [ ] Performance within acceptable thresholds

## Technical Notes
- Server Action: `deactivateUser(userId)` que marca `is_active=false` y revoca sesiones via Supabase Admin API
- Check previo: `COUNT(scheduled_activities WHERE assigned_to=userId AND status='pending')`
- Check previo: `COUNT(users WHERE company_id=company AND role='admin' AND is_active=true)` para proteger ultimo admin
- Reasignacion: `UPDATE scheduled_activities SET assigned_to=newUserId WHERE assigned_to=oldUserId AND status='pending'`
- Pantalla: `cfg-users`

## UI/UX Notes
- Modal de confirmacion con warning destructivo
- Si hay actividades pendientes: mostrar lista resumida + selector de sustituto
- Boton destructivo en rojo: "Desactivar usuario"
- Toast de confirmacion al completar

## Dependencies
- Requiere Supabase Admin API para revocar sesiones
- Requiere `scheduled_activities` con datos (Fase 1)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-061-005: Validaciones de negocio de roles

## User Story

**As a** admin,
**I want** que el sistema valide las reglas de negocio al cambiar roles: maximo de admins, proteccion del ultimo admin y restricciones por tipo de cambio,
**So that** se eviten configuraciones invalidas que comprometan la seguridad o la operacion.

## Acceptance Criteria

### Scenario 1: Maximo de admins alcanzado
- **Given** la empresa tiene 3 admins (maximo configurado) y el admin intenta asignar rol admin a otro usuario
- **When** selecciona "Admin" en el dropdown de rol
- **Then** muestra error "Se alcanzo el maximo de administradores (3). Desasigna un admin primero." y no permite guardar

### Scenario 2: Degradar ultimo admin
- **Given** hay 1 solo admin en la empresa
- **When** el admin intenta cambiar su propio rol a "Manager"
- **Then** muestra error "Eres el unico administrador. No puedes cambiar tu rol." con sugerencia "Asigna otro admin antes de cambiar tu rol."

### Scenario 3: Cambio de rol valido
- **Given** hay 2 admins y uno quiere degradarse a gerente
- **When** cambia su rol a "Manager" y guarda
- **Then** el cambio se procesa exitosamente y muestra confirmacion

### Scenario 4: Email duplicado al editar
- **Given** el admin edita el email de un usuario a uno que ya existe
- **When** intenta guardar
- **Then** muestra error "Este email ya esta en uso por otro usuario"

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Accessibility requirements met
- [ ] Performance within acceptable thresholds

## Technical Notes
- Validaciones server-side en Server Actions (no confiar solo en UI)
- Max admins: configurable en `companies.settings.max_admins` (default 3)
- Check ultimo admin: `COUNT(users WHERE company_id AND role='admin' AND is_active=true)`
- Check email duplicado: `users WHERE email = input.email AND id != userId`
- Todas las validaciones lanzan `AppError` con codigo y mensaje descriptivo
- Pantalla: `cfg-users`

## UI/UX Notes
- Errores mostrados inline en el formulario junto al campo afectado
- Warning preventivo: al seleccionar admin en dropdown, mostrar conteo actual "2/3 admins"
- Sugerencias claras en mensajes de error para guiar al admin

## Dependencies
- Requiere tabla `users` y `companies` con configuracion (Fase 0)

## Estimation
- **Size**: S
- **Complexity**: Medium
