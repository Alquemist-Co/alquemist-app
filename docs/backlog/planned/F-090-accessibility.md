# F-090: Accesibilidad y UX Mejorada

## Overview

Mejora la accesibilidad (a11y) de la PWA para cumplir con WCAG 2.1 nivel AA en todos los componentes interactivos. Cubre focus management en dialogs, landmarks ARIA para actualizaciones realtime, navegacion por teclado en componentes complejos (Gantt, genealogy tree, position grid), soporte para reduced motion y high contrast. Estas mejoras son transversales a toda la app y benefician a todos los usuarios, no solo a quienes usan tecnologias asistivas.

## User Personas

- **Todos los roles**: Navegacion por teclado, focus visible, reduced motion.
- **Usuarios con discapacidad visual**: Screen readers, high contrast, ARIA landmarks.
- **Usuarios con discapacidad motriz**: Focus traps en modals, skip links, teclado completo.
- **Supervisor / Operador (campo)**: Pueden usar la app con guantes, en pantallas sucias, o con luz solar intensa — high contrast y targets grandes ayudan.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-090-001 | Focus traps y navegacion por teclado en dialogs y componentes complejos | M | P0 | Planned |
| US-090-002 | ARIA landmarks y live regions para actualizaciones realtime | M | P1 | Planned |
| US-090-003 | Soporte para reduced motion | S | P1 | Planned |
| US-090-004 | Modo high contrast | M | P2 | Planned |

---

# US-090-001: Focus traps y navegacion por teclado en dialogs y componentes complejos

## User Story

**As a** usuario que navega exclusivamente con teclado,
**I want** que el focus quede atrapado dentro de los dialogs abiertos y que los componentes complejos (Gantt, genealogy, position grid) sean navegables con teclas de flecha,
**So that** pueda operar toda la funcionalidad de la app sin necesidad de un mouse.

## Acceptance Criteria

### Scenario 1: Focus trap en Dialog
- **Given** un Dialog esta abierto (modal desktop o bottom sheet mobile)
- **When** el usuario presiona Tab repetidamente
- **Then** el focus cicla entre los elementos interactivos del dialog sin salir al contenido detras
- **And** Shift+Tab navega en orden inverso
- **And** al abrir el dialog, el focus se mueve automaticamente al primer elemento interactivo

### Scenario 2: Escape cierra Dialog y restaura focus
- **Given** un Dialog esta abierto
- **When** el usuario presiona Escape
- **Then** el dialog se cierra
- **And** el focus retorna al elemento que lo abrio (trigger element)

### Scenario 3: Navegacion por teclado en Gantt chart
- **Given** el usuario esta en la vista de ocupacion planificada (Gantt)
- **When** presiona flechas izquierda/derecha
- **Then** navega entre barras de batches en la misma fila
- **And** flechas arriba/abajo mueven entre zonas
- **And** Enter abre el detalle del batch seleccionado
- **And** la barra activa tiene un indicador visual de focus (outline 2px)

### Scenario 4: Navegacion por teclado en Position Grid
- **Given** el usuario esta en el grid de posiciones de planta
- **When** presiona flechas de direccion
- **Then** navega celda por celda en la direccion correspondiente
- **And** la celda activa tiene focus visible (ring)
- **And** Enter muestra el detalle de la posicion (planta/vacia)
- **And** Home/End van a la primera/ultima celda de la fila

### Scenario 5: Skip-to-content link
- **Given** el usuario carga cualquier pagina de la app
- **When** presiona Tab como primera accion (antes de cualquier otro elemento)
- **Then** aparece un link "Ir al contenido principal" visualmente oculto pero visible al recibir focus
- **And** al presionar Enter, el focus salta al area de contenido principal (`<main>`)

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Focus trap funcional en Dialog component
- [ ] Navegacion por teclado en Gantt, Position Grid, Genealogy Tree
- [ ] Skip-to-content link en el layout principal
- [ ] Criterios de aceptacion verificados con NVDA o VoiceOver
- [ ] Tab order logico en todas las pantallas

## Technical Notes
- **Focus trap**: Implementar en `src/components/ui/dialog.tsx` usando `querySelectorAll` de focusable elements + keydown listener para Tab/Shift+Tab
- **Trigger ref**: Guardar `document.activeElement` al abrir dialog, restaurar al cerrar
- **Gantt keyboard**: Agregar `tabIndex={0}` al contenedor SVG, `onKeyDown` handler con arrow key navigation entre barras
- **Position Grid keyboard**: Grid cells con `tabIndex` gestionado (roving tabindex pattern), arrow keys mueven focus
- **Skip link**: `<a href="#main-content" className="sr-only focus:not-sr-only">` en root layout, `id="main-content"` en `<main>`

## UI/UX Notes
- Focus ring: usar `ring-2 ring-brand ring-offset-2` consistente en toda la app
- Focus visible solo por teclado (`:focus-visible`), no por click
- En Gantt/Grid: la barra o celda con focus tiene outline distinguible del hover

## Dependencies
- F-002 (Dialog component base)
- F-044 (Gantt chart)
- F-043 (Position grid)
- F-035 (Genealogy tree)

## Estimation
- **Size**: M
- **Complexity**: High

---

# US-090-002: ARIA landmarks y live regions para actualizaciones realtime

## User Story

**As a** usuario de screen reader,
**I want** que las actualizaciones de datos en tiempo real (alertas nuevas, cambios ambientales, estado de batches) se anuncien automaticamente,
**So that** pueda estar informado de cambios criticos sin tener que navegar manualmente a cada seccion.

## Acceptance Criteria

### Scenario 1: Nueva alerta anunciada por live region
- **Given** el usuario esta en cualquier pantalla de la app
- **When** se genera una nueva alerta critica via Realtime
- **Then** el screen reader anuncia "Nueva alerta critica: [titulo]" via `aria-live="assertive"`
- **And** el badge del icono de alertas en la navegacion se actualiza

### Scenario 2: Actualizacion ambiental anunciada suavemente
- **Given** el usuario esta en la pantalla de monitoreo ambiental
- **When** llega una nueva lectura de sensor que cambia el dial de verde a rojo
- **Then** el screen reader anuncia "Temperatura en Sala Floracion A: 35C — fuera de rango" via `aria-live="polite"`

### Scenario 3: ARIA landmarks correctos en todas las pantallas
- **Given** un usuario de screen reader navega la app
- **When** lista los landmarks de la pagina
- **Then** encuentra: `banner` (TopBar), `navigation` (Sidebar/BottomBar), `main` (contenido), `contentinfo` (footer si existe)
- **And** cada landmark tiene un `aria-label` descriptivo cuando hay multiples del mismo tipo

### Scenario 4: Toast notifications accesibles
- **Given** una accion del usuario genera un toast (exito o error)
- **When** el toast aparece
- **Then** el screen reader lo anuncia automaticamente via `role="status"` (exito) o `role="alert"` (error)
- **And** el toast no roba el focus del elemento actual

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] ARIA landmarks en layout principal (banner, navigation, main)
- [ ] Live regions para alertas realtime y toasts
- [ ] Criterios de aceptacion verificados con NVDA o VoiceOver
- [ ] Audit con axe-core DevTools: 0 violations criticas

## Technical Notes
- **Landmarks**: Agregar `role` y `aria-label` en AppShell: `<header role="banner">`, `<nav role="navigation" aria-label="Menu principal">`, `<main id="main-content" role="main">`
- **Live regions**: Componente `AriaLiveAnnouncer` global en layout — Zustand store con queue de mensajes, `<div aria-live="polite">` y `<div aria-live="assertive">` que renderizan el ultimo mensaje
- **Realtime integration**: Los hooks de Realtime (`useRealtimeAlerts`, etc.) despachan anuncios al `AriaLiveAnnouncer` cuando llegan updates criticos
- **Toast**: Verificar que `ToastContainer` ya tiene `role="status"`/`role="alert"` — si no, agregar

## UI/UX Notes
- Live region no debe ser visualmente visible (usar `sr-only`)
- No anunciar cada update de Realtime — solo cambios de estado significativos (critical alerts, status changes)
- Throttle de anuncios: maximo 1 cada 5 segundos para no saturar screen readers

## Dependencies
- F-050 (Supabase Realtime hooks)
- F-047 (Alert center)
- F-002 (Toast system)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-090-003: Soporte para reduced motion

## User Story

**As a** usuario con sensibilidad al movimiento (vestibular disorders),
**I want** que las animaciones de la app se reduzcan o eliminen cuando tengo activada la preferencia de sistema `prefers-reduced-motion`,
**So that** pueda usar la app sin experimentar mareos o malestar.

## Acceptance Criteria

### Scenario 1: Animaciones deshabilitadas con reduced motion
- **Given** el usuario tiene `prefers-reduced-motion: reduce` activo en su sistema operativo
- **When** carga la app
- **Then** las animaciones de slide-up/slide-down en Dialog se reemplazan por fade simple (opacity 0→1)
- **And** la animacion shimmer de Skeleton se detiene (static placeholder)
- **And** las transiciones de sidebar expand/collapse son instantaneas

### Scenario 2: Transiciones suaves sin reduced motion
- **Given** el usuario NO tiene reduced motion activado
- **When** interactua con la app normalmente
- **Then** todas las animaciones funcionan como estan definidas (slide-up, shimmer, etc.)

### Scenario 3: Progress bar sin animacion continua
- **Given** reduced motion esta activo
- **When** se muestra un progress bar indeterminado
- **Then** se muestra una barra estatica al 50% en lugar de la animacion de ida y vuelta

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Media query `prefers-reduced-motion: reduce` aplicada a todas las animaciones
- [ ] Criterios de aceptacion verificados en Chrome (DevTools > Rendering > Emulate CSS media feature)
- [ ] Funcionalidad intacta — solo se reducen las animaciones, no se elimina funcionalidad

## Technical Notes
- **CSS approach**: Agregar regla global en `globals.css`:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```
- **Excepciones**: Progress bars determinados (width transition) pueden mantener una transicion minima de 200ms
- **Dialog**: Reemplazar `keyframes slide-up` por `keyframes fade-in` cuando reduced motion esta activo
- **No JS needed**: Toda la logica via CSS media queries — no requiere hook React

## UI/UX Notes
- No agregar toggle manual en la UI — respetar la preferencia del sistema operativo
- Verificar que los skeleton loaders con reduced motion aun se distinguen del contenido real (usar fondo ligeramente diferente)

## Dependencies
- F-002 (Dialog, Skeleton, ProgressBar con animaciones)

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-090-004: Modo high contrast

## User Story

**As a** usuario con vision reducida o que trabaja en condiciones de alta luminosidad (invernadero, campo),
**I want** que la app ofrezca un modo de alto contraste con bordes mas marcados, colores mas saturados y texto mas oscuro,
**So that** pueda distinguir los elementos de la interfaz en condiciones adversas.

## Acceptance Criteria

### Scenario 1: Activar high contrast automaticamente
- **Given** el usuario tiene `prefers-contrast: more` activo en su sistema operativo
- **When** carga la app
- **Then** los bordes de cards, inputs y buttons son 2px solid en lugar de 1px
- **And** el texto body usa color-text puro (#1a1a1a) sin opacidad reducida
- **And** los badges y status indicators tienen bordes adicionales (no solo color de fondo)

### Scenario 2: Toggle manual de high contrast
- **Given** el usuario esta en su perfil o settings
- **When** activa el toggle "Alto contraste"
- **Then** el modo high contrast se aplica inmediatamente
- **And** la preferencia se guarda en localStorage
- **And** persiste entre sesiones y prevalece sobre `prefers-contrast`

### Scenario 3: Dials y graficos con alto contraste
- **Given** el modo high contrast esta activo
- **When** el usuario ve los dials de monitoreo ambiental o graficos Recharts
- **Then** los colores de status (ok/warning/critical) son mas saturados y tienen patron o borde adicional
- **And** las lineas de graficos tienen 3px de grosor (en lugar de 2px)
- **And** los data points tienen marcadores visibles

### Scenario 4: Navegacion con alto contraste
- **Given** high contrast esta activo
- **When** el usuario navega la app
- **Then** el item de navegacion activo tiene borde lateral de 4px (en lugar de background sutil)
- **And** los hover states de botones tienen borde visible (no solo cambio de opacity)

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Media query `prefers-contrast: more` funcional
- [ ] Toggle manual en perfil/settings que persiste en localStorage
- [ ] Criterios de aceptacion verificados
- [ ] Contraste minimo AA (4.5:1 para texto normal, 3:1 para texto grande) verificado con herramienta

## Technical Notes
- **CSS approach**: Custom class `high-contrast` en `<html>` element, toggleada via:
  1. `prefers-contrast: more` media query (auto)
  2. localStorage `alquemist-high-contrast` (manual override)
- **Hook**: `useHighContrast()` que lee media query + localStorage, retorna boolean y toggle function
- **Token overrides**: En `globals.css`, bajo `.high-contrast`:
  - `--color-border: #333` (mas oscuro)
  - `--border-width: 2px`
  - Badges: agregar `border: 1px solid currentColor`
- **Graficos**: Recharts acepta `strokeWidth` y `dot` props — configurar condicionalmente
- **Storage key**: `alquemist-high-contrast` en localStorage

## UI/UX Notes
- Toggle en pagina de perfil (F-086) bajo seccion "Accesibilidad"
- No cambiar la paleta de colores base — solo intensificar bordes, grosores y contrastes
- Verificar que el modo high contrast no rompe el layout (bordes mas gruesos pueden afectar spacing)

## Dependencies
- F-086 (perfil de usuario — donde va el toggle)
- F-002 (componentes UI base)
- F-045 (dials de monitoreo)

## Estimation
- **Size**: M
- **Complexity**: Medium
