# F-086: Edicion de Perfil de Usuario

## Overview

Permite a cualquier usuario autenticado ver y editar su perfil personal (nombre, telefono) y cambiar su contrasena. Actualmente no existe una pantalla de perfil — el UserMenu dropdown muestra nombre y rol pero no permite edicion. El email es de solo lectura por restriccion de Supabase Auth (cambio de email requiere flujo de verificacion que se difiere a una feature futura). Este feature implementa el flujo "Ver perfil propio" de la seccion Sistema del documento de flujos de usuario.

## User Personas

- **Todos los roles** (operator, supervisor, manager, admin, viewer): Pueden ver y editar su propio nombre y telefono. Pueden cambiar su contrasena.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-086-001 | Ver y editar datos del perfil | M | P0 | Planned |
| US-086-002 | Cambiar contrasena | S | P0 | Planned |

---

# US-086-001: Ver y editar datos del perfil

## User Story

**As a** usuario de cualquier rol,
**I want** ver mi perfil con mis datos actuales y editar mi nombre y telefono,
**So that** pueda mantener mi informacion de contacto actualizada sin depender del administrador.

## Acceptance Criteria

### Scenario 1: Ver perfil con datos actuales
- **Given** el usuario "Carlos Martinez" esta autenticado con email carlos@empresa.com, telefono "+57 3001234567", rol "operator", facility "Invernadero Principal"
- **When** navega a /profile (accesible desde el UserMenu dropdown)
- **Then** ve una pagina con sus datos: nombre (editable), email (read-only con icono de candado), telefono (editable), rol (read-only badge), facility asignada (read-only), y fecha de ultimo login

### Scenario 2: Editar nombre exitosamente
- **Given** el usuario ve su perfil con nombre "Carlos Martinez"
- **When** cambia el nombre a "Carlos A. Martinez" y toca "Guardar cambios"
- **Then** el sistema actualiza `users.full_name` y `auth.users.raw_user_meta_data.full_name`, muestra toast "Perfil actualizado", y el nombre se actualiza en el UserMenu y en el auth store

### Scenario 3: Editar telefono
- **Given** el usuario ve su perfil sin telefono registrado
- **When** ingresa "+57 3009876543" en el campo telefono y guarda
- **Then** el sistema actualiza `users.phone`, muestra toast "Perfil actualizado"

### Scenario 4: Validacion de nombre
- **Given** el usuario intenta guardar con el campo nombre vacio
- **When** toca "Guardar cambios"
- **Then** el sistema muestra error inline "El nombre es obligatorio" y no realiza la actualizacion

### Scenario 5: Email es read-only
- **Given** el usuario ve su perfil
- **When** intenta editar el campo de email
- **Then** el campo esta deshabilitado con estilo muted y un tooltip o texto helper: "El email no se puede cambiar desde aqui. Contacta al administrador."

### Scenario 6: Acceso desde UserMenu
- **Given** el usuario esta en cualquier pagina de la aplicacion
- **When** abre el UserMenu dropdown en la top bar y selecciona "Mi perfil"
- **Then** navega a /profile donde ve y puede editar su perfil

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Validacion Zod compartida client/server
- [ ] `users` table y `auth.users.raw_user_meta_data` actualizados atomicamente
- [ ] Auth store actualizado despues de guardar
- [ ] Criterios de aceptacion verificados
- [ ] Accesibilidad: labels, focus visible, contraste AA

## Technical Notes
- **Server Action**: `updateProfile(data)` en `src/lib/actions/profile.ts` con `requireAuth()` (todos los roles). Actualiza 2 lugares: 1) `users` table (full_name, phone) via Drizzle, 2) `auth.users.raw_user_meta_data.full_name` via `supabase.auth.admin.updateUserById()` usando admin client.
- **Zod Schema**: `profileSchema` en `src/lib/schemas/profile.ts`
  - full_name: string min(2) max(100)
  - phone: string optional, regex para formato telefono internacional (permite vacío)
- **Ruta**: `/profile` — Server Component que carga datos del usuario + Client Component con formulario RHF
- **Auth store update**: Despues de guardar, el auth store de Zustand debe actualizarse con el nuevo `fullName`. Usar `useAuthStore.getState().setFullName(newName)` o trigger re-fetch desde AuthProvider.
- **Query de datos**: Obtener datos del usuario desde `users` table (full_name, phone, role, email) + `auth.users` (last_sign_in_at). El Server Component puede hacer ambas queries.
- **UserMenu link**: Agregar item "Mi perfil" en el UserMenu dropdown existente (`src/components/layout/user-menu.tsx`) con href="/profile" e icono User de Lucide.

## UI/UX Notes
- Layout: pagina simple con titulo "Mi perfil", card central con formulario
- Campos: nombre (Input text), email (Input text disabled con icono Lock), telefono (Input tel), rol (Badge read-only), facility (texto read-only)
- Seccion informativa (no editable): rol, facility, ultimo login (formateado como "hace 2 horas" o fecha completa)
- Boton "Guardar cambios" primary, deshabilitado si no hay cambios (dirty check)
- Mobile: full-width card. Desktop: max-width 600px centrado
- Avatar: iniciales del nombre en circulo (bg-primary, texto blanco) como header visual

## Dependencies
- F-004 (auth y middleware)
- F-005 (layout con UserMenu dropdown)
- F-007 (admin client para actualizar auth.users)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-086-002: Cambiar contrasena

## User Story

**As a** usuario de cualquier rol,
**I want** cambiar mi contrasena desde la pagina de perfil verificando primero mi contrasena actual,
**So that** pueda mantener la seguridad de mi cuenta de forma autonoma.

## Acceptance Criteria

### Scenario 1: Cambiar contrasena exitosamente
- **Given** el usuario esta en /profile y su contrasena actual es "Admin123!"
- **When** ingresa contrasena actual "Admin123!", nueva contrasena "NuevaPass456!" y confirmacion "NuevaPass456!", y toca "Cambiar contrasena"
- **Then** el sistema verifica la contrasena actual, actualiza la contrasena via Supabase Auth, muestra toast "Contrasena actualizada", y limpia los campos del formulario

### Scenario 2: Contrasena actual incorrecta
- **Given** el usuario intenta cambiar su contrasena
- **When** ingresa una contrasena actual incorrecta
- **Then** el sistema muestra error "La contrasena actual es incorrecta" y no realiza el cambio

### Scenario 3: Nueva contrasena no cumple requisitos
- **Given** el usuario ingresa contrasena actual correcta
- **When** ingresa nueva contrasena "123" (muy corta, sin mayusculas, sin caracteres especiales)
- **Then** el sistema muestra errores de validacion inline: "La contrasena debe tener al menos 8 caracteres", "Debe incluir al menos una mayuscula y un numero"

### Scenario 4: Confirmacion no coincide
- **Given** el usuario ingresa nueva contrasena "NuevaPass456!"
- **When** ingresa confirmacion "NuevaPass457!" (diferente)
- **Then** el sistema muestra error "Las contrasenas no coinciden" en el campo de confirmacion

### Scenario 5: Formulario separado del perfil basico
- **Given** el usuario esta en /profile
- **When** ve la pagina
- **Then** la seccion de cambio de contrasena esta separada visualmente (card aparte) debajo de los datos del perfil, con titulo "Cambiar contrasena" y sus propios 3 campos + boton independiente

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Verificacion de contrasena actual antes de permitir cambio
- [ ] Validacion de complejidad de contrasena (min 8 chars, mayuscula, numero)
- [ ] Criterios de aceptacion verificados
- [ ] Campos de contrasena limpiados despues de cambio exitoso

## Technical Notes
- **Verificacion de contrasena actual**: Usar `supabase.auth.signInWithPassword({ email, password: currentPassword })` desde el client-side para verificar. Si retorna error → contrasena incorrecta. No expone la contrasena al server.
- **Cambio de contrasena**: Usar `supabase.auth.updateUser({ password: newPassword })` desde el client-side (usa la sesion activa del usuario). No requiere Server Action ni admin client — Supabase Auth maneja el cambio directamente.
- **Zod Schema**: `changePasswordSchema` en `src/lib/schemas/profile.ts`
  - currentPassword: string min(1) (solo para validar no vacio)
  - newPassword: string min(8), regex: al menos 1 mayuscula + 1 numero
  - confirmPassword: string — `.refine()` que coincida con newPassword
- **Componente**: Formulario separado dentro de la pagina /profile, con su propio `useForm` y submit handler
- **Seguridad**: La verificacion de la contrasena actual se hace via `signInWithPassword` que es rate-limited por Supabase Auth. No se necesita rate limiting adicional en la app.

## UI/UX Notes
- Card separada debajo del formulario de perfil, con titulo "Cambiar contrasena" e icono Shield de Lucide
- 3 campos: Contrasena actual (password input con toggle visibility), Nueva contrasena (password input con toggle + indicador de fortaleza), Confirmar contrasena (password input)
- Indicador de fortaleza de contrasena: barra de progreso con 4 niveles (debil/regular/fuerte/muy fuerte) basado en longitud + complejidad
- Toggle de visibilidad (icono Eye/EyeOff de Lucide) en cada campo de contrasena
- Boton "Cambiar contrasena" con estilo secondary (no primary, para diferenciarlo del guardar perfil)
- Despues de cambio exitoso: todos los campos se limpian y se muestra un checkmark temporal

## Dependencies
- US-086-001 (pagina /profile donde se integra este formulario)
- F-004 (auth — Supabase client-side auth para updateUser)

## Estimation
- **Size**: S
- **Complexity**: Medium
