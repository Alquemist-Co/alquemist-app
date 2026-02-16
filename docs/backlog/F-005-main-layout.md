# F-005: Layout Principal Responsive

## Overview

Implementacion del layout principal de la aplicacion: Sidebar vertical para desktop (64px collapsed, 240px expanded), Bottom Tab Bar para mobile (4 tabs + "Mas" configurados por rol), Top Bar con breadcrumbs, busqueda y avatar, y navegacion funcional entre todos los modulos vacios. El layout se adapta responsivamente y muestra/oculta modulos segun el rol del usuario autenticado.

## User Personas

- **Operador**: Usa bottom bar en mobile con 4 modulos rapidos (Inicio, Actividades, Inventario, Batches).
- **Supervisor**: Usa bottom bar con modulos de visibilidad (Inicio, Batches, Actividades, Alertas).
- **Gerente**: Usa sidebar expandida en desktop con acceso a Ordenes, Batches y Analitica.
- **Admin**: Tiene acceso a todos los 9 modulos incluyendo Configuracion.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-005-001 | Sidebar desktop (collapsed y expanded) | M | P0 | Planned |
| US-005-002 | Bottom Tab Bar mobile con configuracion por rol | M | P0 | Planned |
| US-005-003 | Top Bar con breadcrumbs, busqueda y avatar | M | P1 | Planned |
| US-005-004 | Menu "Mas" con modulos restantes y opciones | S | P1 | Planned |
| US-005-005 | Paginas de modulos vacios con navegacion funcional | M | P0 | Planned |

---

# US-005-001: Sidebar desktop (collapsed y expanded)

## User Story

**As a** gerente,
**I want** una sidebar vertical en desktop que pueda colapsar para ganar espacio o expandir para ver los nombres de los modulos,
**So that** pueda navegar entre modulos rapidamente sin perder area de contenido cuando trabajo con datos.

## Acceptance Criteria

### Scenario 1: Sidebar colapsada (64px)
- **Given** que el viewport es lg (1024-1279px)
- **When** se carga la aplicacion
- **Then** la sidebar se muestra colapsada con 64px de ancho, solo iconos visibles, background #005E42, y al hover sobre un icono se muestra un tooltip con el nombre del modulo

### Scenario 2: Sidebar expandida (240px)
- **Given** que el viewport es xl (1280+) o el gerente hace click en el boton hamburger
- **When** la sidebar se expande
- **Then** muestra icono + label por cada modulo, ancho 240px, items activos con pill background #ECF7A320 y border-left 3px #ECF7A3 con texto #ECF7A3, items inactivos con texto #FFFFFF80, y logo "ALQUEMIST" en la parte superior

### Scenario 3: Toggle de sidebar
- **Given** que el gerente presiona Cmd+B o hace click en el boton hamburger
- **When** la sidebar cambia de estado
- **Then** transiciona suavemente entre collapsed (64px) y expanded (240px) con animacion de 250ms, el contenido principal se reajusta al nuevo ancho disponible, y el estado se persiste en localStorage

### Scenario 4: Sidebar muestra solo modulos del rol
- **Given** que un usuario con rol `operator` esta autenticado
- **When** la sidebar se renderiza
- **Then** solo muestra los modulos permitidos para el operador (Inicio, Actividades, Inventario, Batches), los demas modulos no aparecen en el listado

## Definition of Done
- [ ] Sidebar con estados collapsed (64px) y expanded (240px)
- [ ] Background #005E42, items con estilos activo/inactivo del design system
- [ ] Logo ALQUEMIST en la parte superior
- [ ] Perfil de usuario en la parte inferior
- [ ] Toggle con Cmd+B y boton hamburger
- [ ] Estado persistido en localStorage
- [ ] Transicion animada entre estados
- [ ] Tooltips en modo colapsado
- [ ] Modulos filtrados por rol
- [ ] Accesibilidad: nav landmark, aria-current para item activo
- [ ] Solo visible en breakpoints lg+

## Technical Notes
- Ubicacion: `src/components/layout/sidebar.tsx`
- Iconos: Lucide React, 20px, outlined, 1.5px stroke
- Estado del sidebar en Zustand store (`src/stores/sidebar-store.ts`) con persistencia en localStorage
- Modulos por rol: usar constantes de `src/lib/auth/permissions.ts`
- Referencia visual: docs/alquemist-pwa-reqs.md seccion "Navegacion Desktop" > "Sidebar vertical izquierda"
- Usar `next/link` para navegacion entre modulos

## Dependencies
- US-004-003 (sistema de permisos por rol)
- US-001-004 (Tailwind con brand tokens)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-005-002: Bottom Tab Bar mobile con configuracion por rol

## User Story

**As a** operador,
**I want** una barra de navegacion inferior en mobile que me muestre los 4 modulos mas relevantes para mi rol,
**So that** pueda acceder a mis tareas diarias con un solo tap desde cualquier pantalla.

## Acceptance Criteria

### Scenario 1: Bottom bar para operador
- **Given** que un usuario con rol `operator` usa la app en mobile (< 1024px)
- **When** la bottom bar se renderiza
- **Then** muestra 5 items: Inicio | Actividades | Inventario | Batches | Mas, con iconos Lucide de 20px, height 64px + safe area, background white, border-top 1px #D4DDD6

### Scenario 2: Item activo indicado visualmente
- **Given** que el operador esta en la seccion Actividades
- **When** mira la bottom bar
- **Then** el item Actividades muestra icono + label en color #005E42 con un dot indicator arriba del icono, los items inactivos estan en #5A6B5E

### Scenario 3: Bottom bar para supervisor
- **Given** que un usuario con rol `supervisor` usa la app en mobile
- **When** la bottom bar se renderiza
- **Then** muestra: Inicio | Batches | Actividades | Alertas | Mas, diferente al operador, adaptada a las prioridades del supervisor

### Scenario 4: Bottom bar oculta en desktop
- **Given** que el viewport es lg+ (1024px o mas)
- **When** la pagina se renderiza
- **Then** la bottom bar NO se muestra y la sidebar toma su lugar para navegacion

## Definition of Done
- [ ] Bottom bar con 4 items + "Mas" configurable por rol
- [ ] 5 configuraciones: operator, supervisor, manager, admin, viewer
- [ ] Height 64px + safe area inferior (env(safe-area-inset-bottom))
- [ ] Item activo con color #005E42 + dot indicator
- [ ] Items inactivos en #5A6B5E
- [ ] Background white con border-top
- [ ] Semi-transparente con backdrop-blur
- [ ] Solo visible en breakpoints < lg
- [ ] Accesibilidad: role="navigation", aria-label, aria-current

## Technical Notes
- Ubicacion: `src/components/layout/bottom-bar.tsx`
- Configuracion de tabs por rol: docs/alquemist-pwa-reqs.md seccion "Navegacion Mobile" > tabla de Bottom Bar
- Roles y tabs:
  - Operador: Inicio | Actividades | Inventario | Batches | Mas
  - Supervisor: Inicio | Batches | Actividades | Alertas | Mas
  - Gerente: Inicio | Ordenes | Batches | Analitica | Mas
  - Admin: Inicio | Config | Usuarios | Batches | Mas
  - Viewer: Inicio | Batches | Ordenes | Calidad | Mas
- Usar `usePathname()` de Next.js para detectar item activo
- Safe area para iOS: `pb-[env(safe-area-inset-bottom)]`

## Dependencies
- US-004-003 (sistema de permisos por rol)
- US-001-004 (Tailwind con brand tokens)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-005-003: Top Bar con breadcrumbs, busqueda y avatar

## User Story

**As a** supervisor,
**I want** una barra superior que muestre donde estoy en la aplicacion, acceso rapido a busqueda y mis notificaciones,
**So that** siempre tenga contexto de mi ubicacion y pueda buscar cualquier entidad rapidamente.

## Acceptance Criteria

### Scenario 1: Top bar renderiza en desktop
- **Given** que el viewport es lg+ (desktop)
- **When** el supervisor esta en la pagina de detalle de un batch (ej: `/batches/LOT-001`)
- **Then** la top bar tiene height 56px, background surface (#F7F8F2), breadcrumbs "Inicio > Batches > LOT-001", icono de busqueda (Cmd+K), campanita de notificaciones con badge de conteo, y avatar del usuario con dropdown

### Scenario 2: Top bar en mobile
- **Given** que el viewport es < lg (mobile)
- **When** se renderiza la top bar
- **Then** muestra un header simplificado: titulo de la pagina actual, icono de busqueda, y campanita de notificaciones, sin breadcrumbs completos (solo titulo), height 48px

### Scenario 3: Avatar dropdown
- **Given** que el supervisor hace click en su avatar
- **When** se abre el dropdown
- **Then** muestra: nombre completo, email, rol badge, facility actual, separador, link a "Mi perfil", "Preferencias", separador, "Cerrar sesion"

### Scenario 4: Breadcrumbs navegables
- **Given** que el supervisor esta en Batches > LOT-001 > Costos
- **When** hace click en "Batches" en el breadcrumb
- **Then** navega a la lista de batches `/batches`, el breadcrumb se actualiza, y la navegacion es instantanea (client-side)

## Definition of Done
- [ ] Top bar con height 56px desktop, 48px mobile
- [ ] Breadcrumbs dinamicos basados en la ruta actual
- [ ] Icono de busqueda (placeholder para Cmd+K, funcionalidad en Fase 4)
- [ ] Campanita de notificaciones con badge (placeholder, funcionalidad en Fase 3)
- [ ] Avatar con dropdown: nombre, email, rol, facility, logout
- [ ] Background surface (#F7F8F2)
- [ ] Responsive: simplificado en mobile

## Technical Notes
- Ubicacion: `src/components/layout/top-bar.tsx`, `src/components/layout/breadcrumbs.tsx`
- Breadcrumbs generados automaticamente desde el pathname de Next.js
- Referencia: docs/alquemist-pwa-reqs.md seccion "Navegacion Desktop" > "Top bar"
- El icono de busqueda (Cmd+K) y notificaciones son placeholders en Fase 0; la funcionalidad completa se implementa en Fases 3-4
- Avatar con dropdown puede usar el componente Dialog/BottomSheet de F-002

## Dependencies
- US-004-001 (datos de usuario disponibles: nombre, email, rol)
- US-002-001 (Button para acciones del dropdown)
- US-002-004 (Badge para rol y notificaciones)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-005-004: Menu "Mas" con modulos restantes y opciones

## User Story

**As a** operador,
**I want** un menu "Mas" en la bottom bar que me muestre los modulos adicionales y opciones de configuracion personal,
**So that** pueda acceder a funcionalidades menos frecuentes sin saturar mi barra de navegacion principal.

## Acceptance Criteria

### Scenario 1: Menu "Mas" abre como bottom sheet
- **Given** que el operador hace tap en "Mas" en la bottom bar (mobile)
- **When** el menu se abre
- **Then** se muestra un bottom sheet con animacion spring desde abajo, background verde profundo (#005E42), items en grid de iconos con label en color lime (#ECF7A3), mostrando los modulos que no estan en la bottom bar

### Scenario 2: Opciones personales incluidas
- **Given** que el menu "Mas" esta abierto
- **When** el operador mira el contenido
- **Then** ademas de los modulos extra, incluye: perfil del usuario, preferencias, cambiar facility (si aplica), y "Cerrar sesion", separados visualmente de los modulos

### Scenario 3: Menu en desktop es innecesario
- **Given** que el viewport es lg+ (desktop)
- **When** se usa la sidebar
- **Then** el menu "Mas" no se muestra porque todos los modulos estan accesibles directamente desde la sidebar

## Definition of Done
- [ ] Bottom sheet activado desde tab "Mas"
- [ ] Background #005E42 con items en #ECF7A3
- [ ] Grid de modulos restantes (los que no caben en bottom bar)
- [ ] Opciones personales: perfil, preferencias, cambiar facility, cerrar sesion
- [ ] Animacion spring
- [ ] Solo en mobile (< lg)
- [ ] Cierre al seleccionar item o swipe down

## Technical Notes
- Ubicacion: `src/components/layout/more-menu.tsx`
- Reutilizar componente Dialog/BottomSheet de F-002
- Referencia: docs/alquemist-pwa-reqs.md seccion "Navegacion Mobile" > "Menu 'Mas'"
- Los modulos a mostrar se calculan como: todos_modulos_del_rol - modulos_en_bottom_bar

## Dependencies
- US-005-002 (bottom bar con tab "Mas")
- US-002-005 (componente Bottom Sheet)
- US-004-003 (permisos por rol)

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-005-005: Paginas de modulos vacios con navegacion funcional

## User Story

**As a** admin,
**I want** que cada modulo tenga una pagina placeholder con titulo y descripcion,
**So that** pueda navegar entre todos los modulos y verificar que la estructura de rutas y el layout funcionan correctamente antes de implementar las funcionalidades.

## Acceptance Criteria

### Scenario 1: Todos los modulos tienen pagina
- **Given** que el admin navega por la aplicacion
- **When** accede a cada modulo desde la sidebar o bottom bar
- **Then** cada modulo muestra una pagina con: titulo del modulo, descripcion breve de su funcion, icono representativo, y un Empty State indicando "Proximamente" o "En construccion"

### Scenario 2: Rutas creadas correctamente
- **Given** que se definen las rutas de todos los modulos
- **When** se accede a `/batches`, `/orders`, `/activities`, `/inventory`, `/areas`, `/quality`, `/operations`, `/settings`
- **Then** cada ruta responde con HTTP 200, usa el layout principal (sidebar + topbar en desktop, bottombar + topbar en mobile), y los breadcrumbs se actualizan correctamente

### Scenario 3: Dashboard por rol redirige correctamente
- **Given** que un operador accede a `/` (raiz del dashboard)
- **When** el middleware detecta su rol
- **Then** se muestra el dashboard placeholder del operador, diferente al del supervisor, gerente o admin, con un titulo personalizado "Bienvenido, [nombre]"

### Scenario 4: Ruta inexistente
- **Given** que un usuario navega a una ruta que no existe (ej: `/modulo-falso`)
- **When** Next.js procesa la ruta
- **Then** muestra una pagina 404 personalizada con design system de Alquemist, link para volver al dashboard, y no rompe el layout

## Definition of Done
- [ ] Paginas placeholder para los 9 modulos + dashboard
- [ ] Rutas: `/`, `/batches`, `/orders`, `/activities`, `/inventory`, `/areas`, `/quality`, `/operations`, `/settings`
- [ ] Cada pagina usa el layout principal
- [ ] Breadcrumbs funcionales en cada ruta
- [ ] Dashboard con saludo personalizado
- [ ] Pagina 404 personalizada
- [ ] Navegacion entre modulos funcional
- [ ] Build exitoso
- [ ] Responsive en todos los breakpoints

## Technical Notes
- Ubicacion: `src/app/(dashboard)/page.tsx`, `src/app/(dashboard)/batches/page.tsx`, etc.
- Layout principal: `src/app/(dashboard)/layout.tsx` que incluye Sidebar, BottomBar y TopBar
- Referencia estructura: docs/alquemist-proyecto.md seccion "Estructura del Proyecto" > (dashboard) route group
- Referencia modulos: docs/alquemist-pwa-reqs.md seccion "Especificacion de Pantallas" (9 modulos)
- Pagina 404: `src/app/not-found.tsx`
- Usar EmptyState de F-002 para los placeholders

## Dependencies
- US-005-001 (sidebar)
- US-005-002 (bottom bar)
- US-005-003 (top bar)
- US-002-008 (componente Empty State)

## Estimation
- **Size**: M
- **Complexity**: Low
