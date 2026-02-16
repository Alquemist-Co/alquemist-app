# F-002: Design System (Componentes Base UI)

## Overview

Implementacion del catalogo de componentes base reutilizables del design system de Alquemist: Button, Card, Input, Badge, Dialog, Table, Toast, Toggle, Progress Bar, Skeleton, Empty State y Bottom Sheet. Todos los componentes siguen la estetica editorial minimalista definida en el documento de requerimientos, con brand colors, tipografia DM Sans/DM Mono y comportamiento responsive mobile-first.

## User Personas

- **Admin**: Necesita componentes consistentes para las pantallas de configuracion.
- **Operador**: Necesita componentes tactiles (touch targets de 44px+) que funcionen en campo con sol directo.
- **Supervisor**: Necesita componentes que muestren datos de forma clara en tablet y celular.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-002-001 | Componente Button (primary, secondary, ghost) | S | P0 | Done |
| US-002-002 | Componente Card y Stat Card | S | P0 | Done |
| US-002-003 | Componente Input Field y Toggle | M | P0 | Done |
| US-002-004 | Componente Badge y Status Badge | S | P1 | Done |
| US-002-005 | Componente Dialog y Bottom Sheet | M | P1 | Planned |
| US-002-006 | Componente Table (responsive) | M | P1 | Planned |
| US-002-007 | Componente Toast / Snackbar | S | P1 | Planned |
| US-002-008 | Componentes Progress Bar, Skeleton y Empty State | M | P1 | Planned |
| US-002-009 | Pagina /design-system con catalogo visual | S | P0 | Planned |

---

# US-002-001: Componente Button (primary, secondary, ghost)

## User Story

**As a** operador,
**I want** botones claros y con areas de toque amplias en la interfaz,
**So that** pueda interactuar con la aplicacion rapidamente en campo, incluso con guantes.

## Acceptance Criteria

### Scenario 1: Button primary renderiza correctamente
- **Given** que el componente Button esta disponible con variant="primary"
- **When** se renderiza en la pagina
- **Then** tiene background #005E42, texto #ECF7A3, border-radius 12px, height 48px en mobile y 40px en desktop, font DM Sans Bold 14px, y al hacer hover el background cambia a #003D2B

### Scenario 2: Button secondary y ghost
- **Given** que el componente Button soporta las variantes "secondary" y "ghost"
- **When** se renderiza Button variant="secondary"
- **Then** tiene background transparente, border 1.5px #005E42, texto #005E42, y al hover el background cambia a #005E42 con texto #ECF7A3
- **When** se renderiza Button variant="ghost"
- **Then** no tiene borde ni background, texto #005E42, y al hover muestra background #F7F8F2

### Scenario 3: Button deshabilitado
- **Given** que el componente Button tiene prop `disabled={true}`
- **When** se renderiza
- **Then** muestra opacity 0.4, el cursor cambia a `not-allowed`, el evento onClick no se dispara, y el boton no es focusable via Tab

### Scenario 4: Button con icono y loading
- **Given** que el componente Button acepta props `icon` y `loading`
- **When** se pasa un icono de Lucide y `loading={true}`
- **Then** el icono se muestra a la izquierda del texto, y en estado loading se muestra un spinner reemplazando el icono con el boton deshabilitado

## Definition of Done
- [ ] Tres variantes: primary, secondary, ghost
- [ ] Props: variant, size, disabled, loading, icon, children, onClick
- [ ] Touch target minimo 44x44px
- [ ] Animacion active: scale(0.98)
- [ ] Accesibilidad: focus visible, aria-disabled
- [ ] Tests unitarios para cada variante
- [ ] Responsive: 48px mobile, 40px desktop

## Technical Notes
- Ubicacion: `src/components/ui/button.tsx`
- Usar `cva` (class-variance-authority) o clases Tailwind condicionales para variantes
- Icono via Lucide React con tamanio 16px inline
- Referencia visual: docs/alquemist-pwa-reqs.md seccion "Componentes Base" > "Button Primary/Secondary/Ghost"

## Dependencies
- US-001-004 (Tailwind configurado con brand tokens)

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-002-002: Componente Card y Stat Card

## User Story

**As a** supervisor,
**I want** tarjetas de informacion con diseno limpio y jerarquia visual clara,
**So that** pueda escanear rapidamente el estado de las zonas y batches en mi dashboard.

## Acceptance Criteria

### Scenario 1: Card base renderiza correctamente
- **Given** que el componente Card esta disponible
- **When** se renderiza con contenido hijo
- **Then** tiene background white, border 1px #D4DDD6, border-radius 16px, padding 16px, sin shadow (flat editorial), y al hover el border-color transiciona a #005E42

### Scenario 2: Stat Card con datos numericos
- **Given** que el componente StatCard esta disponible
- **When** se pasa `value={42}`, `label="Batches activos"`, `color="success"`
- **Then** el numero se muestra en DM Mono 24-32px Bold, el label en overline 11px, tiene un border-left de 4px con el color semantico indicado, y al hacer tap navega a la URL pasada como prop

### Scenario 3: Card sin contenido
- **Given** que el componente Card se renderiza sin children
- **When** se muestra en la pagina
- **Then** mantiene las dimensiones minimas del padding, no colapsa visualmente, y no genera errores en consola

## Definition of Done
- [ ] Card base con estilos del design system
- [ ] StatCard con value (DM Mono), label (overline), color (border-left), href opcional
- [ ] Hover state en Card
- [ ] Accesibilidad: Card como `article`, StatCard con link accesible
- [ ] Tests unitarios
- [ ] Responsive

## Technical Notes
- Ubicacion: `src/components/ui/card.tsx` y `src/components/data/stat-card.tsx`
- Card no tiene shadow por diseno (estilo flat editorial)
- StatCard usa DM Mono para el valor numerico y DM Sans para el label
- Referencia: docs/alquemist-pwa-reqs.md seccion "Card" y "Stat Card"

## Dependencies
- US-001-004 (Tailwind configurado con brand tokens)

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-002-003: Componente Input Field y Toggle

## User Story

**As a** operador,
**I want** campos de entrada claros con labels siempre visibles y areas de interaccion amplias,
**So that** pueda llenar formularios rapidamente en campo sin confusiones.

## Acceptance Criteria

### Scenario 1: Input Field renderiza correctamente
- **Given** que el componente Input esta disponible
- **When** se renderiza con `label="Cantidad"` y `type="number"`
- **Then** tiene background #FFFFFF, border 1.5px #D4DDD6, border-radius 12px, height 48px, label en estilo overline arriba del campo, y al focus el border cambia a #005E42 con shadow `0 0 0 3px #ECF7A340`

### Scenario 2: Input con estado de error
- **Given** que el componente Input tiene prop `error="Cantidad requerida"`
- **When** se renderiza
- **Then** el border cambia a #DC2626, el mensaje de error se muestra debajo del campo en rojo, y el campo tiene `aria-invalid="true"` con `aria-describedby` apuntando al mensaje de error

### Scenario 3: Toggle renderiza y cambia estado
- **Given** que el componente Toggle esta disponible
- **When** el operador hace tap en el toggle
- **Then** el track cambia de #D4DDD6 a #005E42, el thumb se desplaza con transicion de 200ms ease, el width es 44px, y el estado `checked` cambia de false a true disparando el callback `onChange`

### Scenario 4: Input con teclado numerico
- **Given** que el componente Input tiene `type="number"` o `inputMode="decimal"`
- **When** el operador hace tap en el campo en un dispositivo movil
- **Then** el teclado numerico se abre automaticamente en lugar del teclado alfanumerico

## Definition of Done
- [ ] Input Field con todos los estados: default, focus, error, disabled
- [ ] Label siempre visible (no desaparece como placeholder)
- [ ] Toggle con animacion y estados on/off
- [ ] Props: label, type, placeholder, error, disabled, inputMode, onChange
- [ ] Accesibilidad: labels asociados, aria-invalid, aria-describedby
- [ ] Teclado numerico para inputs de cantidad
- [ ] Tests unitarios

## Technical Notes
- Ubicacion: `src/components/ui/input.tsx` y `src/components/ui/toggle.tsx`
- Usar `React.forwardRef` para compatibilidad con React Hook Form
- Input soporta `inputMode='decimal'` para teclado numerico en movil
- Referencia: docs/alquemist-pwa-reqs.md seccion "Input Field" y "Toggle / Switch"

## Dependencies
- US-001-004 (Tailwind configurado con brand tokens)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-002-004: Componente Badge y Status Badge

## User Story

**As a** supervisor,
**I want** badges de estado con colores semanticos claros,
**So that** pueda identificar rapidamente el estado de batches, actividades y alertas sin leer texto detallado.

## Acceptance Criteria

### Scenario 1: Badge variantes renderizadas
- **Given** que el componente Badge esta disponible
- **When** se renderiza con variant="filled"
- **Then** tiene background #005E42, texto #ECF7A3, border-radius 8px, padding 4px 10px, font 11px Bold
- **When** se renderiza con variant="outlined"
- **Then** tiene border #005E42, texto #005E42, sin background

### Scenario 2: Status Badge con colores semanticos
- **Given** que el componente Badge acepta prop `status`
- **When** se pasa `status="success"`
- **Then** muestra background verde (#059669) con texto blanco
- **When** se pasa `status="warning"`
- **Then** muestra background ambar (#D97706) con texto blanco
- **When** se pasa `status="error"`
- **Then** muestra background rojo (#DC2626) con texto blanco

### Scenario 3: Badge con texto largo
- **Given** que el texto del badge es muy largo (mas de 20 caracteres)
- **When** se renderiza
- **Then** el texto se trunca con ellipsis, el badge mantiene una altura consistente, y el tooltip muestra el texto completo al hover

## Definition of Done
- [ ] Variantes: filled, outlined, status (success/warning/error/info)
- [ ] Props: variant, status, children
- [ ] Consistencia de tamano independiente del contenido
- [ ] Truncado con tooltip para textos largos
- [ ] Accesibilidad: texto legible, contraste AA minimo
- [ ] Tests unitarios

## Technical Notes
- Ubicacion: `src/components/ui/badge.tsx`
- Referencia: docs/alquemist-pwa-reqs.md seccion "Badge / Tag"
- Usar para: estados de batch, fases, prioridades, tipos de actividad, roles

## Dependencies
- US-001-004 (Tailwind configurado con brand tokens)

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-002-005: Componente Dialog y Bottom Sheet

## User Story

**As a** operador,
**I want** dialogos de confirmacion que aparezcan como bottom sheets en mobile y modals centrados en desktop,
**So that** pueda confirmar acciones criticas sin perder el contexto de la pantalla actual.

## Acceptance Criteria

### Scenario 1: Bottom Sheet en mobile
- **Given** que el viewport es menor a 640px (mobile)
- **When** se abre el componente Dialog
- **Then** se muestra como bottom sheet desde abajo con pill indicator arriba, border-radius 20px en la parte superior, overlay #1A1A1A40, max-height 85vh, y animacion de slide-up con spring

### Scenario 2: Modal centrado en desktop
- **Given** que el viewport es mayor a 640px (desktop)
- **When** se abre el componente Dialog
- **Then** se muestra como modal centrado, max-width 480px, border-radius 20px, overlay #1A1A1A40, y animacion de fade + scale

### Scenario 3: Cerrar dialog con acciones multiples
- **Given** que el Dialog esta abierto
- **When** el operador hace tap fuera del dialog (overlay), presiona Escape, o toca el boton de cerrar
- **Then** el dialog se cierra con animacion de salida, el callback `onClose` se ejecuta, y el foco regresa al elemento que abrio el dialog

### Scenario 4: Dialog con contenido scrollable
- **Given** que el contenido del dialog excede la altura maxima
- **When** se renderiza
- **Then** el contenido interno es scrollable, el header y footer del dialog permanecen fijos, y el scroll no se propaga al body de la pagina

## Definition of Done
- [ ] Bottom sheet en mobile, modal centrado en desktop
- [ ] Props: open, onClose, title, children, footer
- [ ] Animaciones de entrada y salida
- [ ] Cierre por overlay, Escape y boton
- [ ] Focus trap dentro del dialog
- [ ] Scroll lock en el body cuando esta abierto
- [ ] Accesibilidad: role="dialog", aria-modal, aria-labelledby
- [ ] Tests unitarios

## Technical Notes
- Ubicacion: `src/components/ui/dialog.tsx`
- Considerar usar Radix UI Dialog primitive como base para accesibilidad
- Bottom sheet en mobile debe ser deslizable (drag-to-dismiss)
- Referencia: docs/alquemist-pwa-reqs.md seccion "Modal / Bottom Sheet"

## Dependencies
- US-001-004 (Tailwind configurado con brand tokens)

## Estimation
- **Size**: M
- **Complexity**: High

---

# US-002-006: Componente Table (responsive)

## User Story

**As a** gerente,
**I want** tablas de datos con ordenamiento y que se adapten a mobile,
**So that** pueda analizar listas de ordenes, transacciones y productos en cualquier dispositivo.

## Acceptance Criteria

### Scenario 1: Table renderiza en desktop
- **Given** que el componente Table se renderiza en viewport lg+
- **When** se pasan columnas y datos
- **Then** muestra una tabla completa con header sticky, bordes #D4DDD6, celdas con padding 12px, texto en DM Sans 14px, y numeros en DM Mono

### Scenario 2: Table en mobile se convierte a cards
- **Given** que el viewport es menor a 640px (mobile)
- **When** se renderizan los mismos datos
- **Then** cada fila se transforma en una card compacta con los campos mas relevantes visibles y los secundarios colapsables, manteniendo la legibilidad en pantallas pequenas

### Scenario 3: Table vacia
- **Given** que no hay datos para mostrar
- **When** se renderiza la tabla
- **Then** muestra un empty state con el mensaje pasado como prop `emptyMessage`, centrado en el area de la tabla, con estilo coherente con el componente Empty State

### Scenario 4: Table con ordenamiento
- **Given** que una columna tiene `sortable={true}`
- **When** el gerente hace click en el header de la columna
- **Then** los datos se ordenan ascendente, un segundo click cambia a descendente, un tercer click quita el ordenamiento, y se muestra un indicador visual de la direccion del sort

## Definition of Done
- [ ] Table con header, rows, responsive
- [ ] Transformacion a cards en mobile
- [ ] Ordenamiento por columna
- [ ] Header sticky en scroll
- [ ] Empty state integrado
- [ ] Props: columns, data, sortable, emptyMessage, onRowClick
- [ ] Accesibilidad: table semantica, role, aria-sort
- [ ] Tests unitarios

## Technical Notes
- Ubicacion: `src/components/ui/table.tsx`
- Referencia: docs/alquemist-pwa-reqs.md seccion "Componentes Base"
- Usar DM Mono para columnas de datos numericos (cantidades, precios, porcentajes)
- En mobile, definir `mobileColumns` para seleccionar que campos mostrar en la card

## Dependencies
- US-002-002 (Card disponible para vista mobile)
- US-001-004 (Tailwind configurado)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-002-007: Componente Toast / Snackbar

## User Story

**As a** operador,
**I want** notificaciones breves que confirmen mis acciones sin interrumpir mi flujo de trabajo,
**So that** sepa que mi accion se completo correctamente sin necesidad de buscar confirmacion visual.

## Acceptance Criteria

### Scenario 1: Toast de exito
- **Given** que se dispara un toast con `type="success"` y `message="Actividad completada"`
- **When** se muestra en pantalla
- **Then** aparece bottom-center, background #1A1A1A, texto blanco, border-radius 12px, con checkmark verde #059669, y se auto-dismiss despues de 4 segundos con animacion de fade-out

### Scenario 2: Toast de error
- **Given** que se dispara un toast con `type="error"` y `message="Error al guardar"`
- **When** se muestra en pantalla
- **Then** muestra un icono de error #DC2626, NO se auto-dismiss (requiere accion del operador para cerrar), y tiene un boton de cierre visible

### Scenario 3: Multiples toasts simultaneos
- **Given** que se disparan 3 toasts seguidos
- **When** se muestran en pantalla
- **Then** se apilan verticalmente con 8px de separacion, el mas reciente aparece arriba, y al cerrarse un toast los demas se reposicionan con animacion suave

## Definition of Done
- [ ] Tipos: success, error, warning, info
- [ ] Auto-dismiss configurable (default 4s para success/info, sin dismiss para error)
- [ ] Posicion bottom-center
- [ ] Stack de multiples toasts
- [ ] Animaciones de entrada y salida
- [ ] API: `toast.success()`, `toast.error()`, `toast.warning()`, `toast.info()`
- [ ] Tests unitarios

## Technical Notes
- Ubicacion: `src/components/ui/toast.tsx` y `src/lib/utils/toast-store.ts`
- Usar Zustand para el store de toasts (estado UI local)
- ToastProvider en el layout raiz
- Referencia: docs/alquemist-pwa-reqs.md seccion "Toast / Snackbar"

## Dependencies
- US-001-004 (Tailwind configurado)

## Estimation
- **Size**: S
- **Complexity**: Medium

---

# US-002-008: Componentes Progress Bar, Skeleton y Empty State

## User Story

**As a** supervisor,
**I want** indicadores visuales claros del progreso de carga y estados vacios,
**So that** sepa si la aplicacion esta cargando datos, cuanto progreso hay en un proceso, o cuando no hay datos disponibles.

## Acceptance Criteria

### Scenario 1: Progress Bar con porcentaje
- **Given** que el componente ProgressBar tiene `value={72}`
- **When** se renderiza
- **Then** muestra una barra de 6px de height, background #D4DDD6, fill #005E42, border-radius 3px, y label "72%" en DM Mono arriba-derecha

### Scenario 2: Skeleton loader replica layout
- **Given** que el componente Skeleton se usa como placeholder de una Card
- **When** los datos estan cargando
- **Then** muestra shapes que replican el layout real de la Card (rectangulo para titulo, lineas para texto, circulo para avatar), con shimmer gradient de #F7F8F2 a #ECF7A340 a #F7F8F2 animado

### Scenario 3: Empty State con CTA
- **Given** que una lista no tiene datos
- **When** se renderiza el componente EmptyState con `title`, `description` y `action`
- **Then** muestra una ilustracion sutil en line-art verde, titulo centrado ("No hay batches activos"), descripcion contextual, y un boton secundario como CTA ("Ir a Ordenes"), todo centrado vertical y horizontalmente

### Scenario 4: Progress Bar con valor cero
- **Given** que el componente ProgressBar tiene `value={0}`
- **When** se renderiza
- **Then** la barra de fill no se muestra (width 0), el label muestra "0%", y la barra de background es visible indicando que el proceso no ha iniciado

## Definition of Done
- [ ] ProgressBar con value, label, color semantico
- [ ] Skeleton con variantes: text, circle, card, table-row
- [ ] EmptyState con title, description, icon/illustration, CTA
- [ ] Shimmer animation en Skeleton
- [ ] Accesibilidad: ProgressBar con role="progressbar", aria-valuenow
- [ ] Tests unitarios

## Technical Notes
- Ubicacion: `src/components/ui/progress-bar.tsx`, `src/components/shared/skeleton.tsx`, `src/components/shared/empty-state.tsx`
- Referencia: docs/alquemist-pwa-reqs.md secciones "Progress Bar", "Skeleton Loader", "Empty State"
- Skeleton shimmer usa CSS animation con linear-gradient
- Empty State usa ilustraciones line-art en SVG con color brand

## Dependencies
- US-001-004 (Tailwind configurado)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-002-009: Pagina /design-system con catalogo visual

## User Story

**As a** admin,
**I want** una pagina dedicada `/design-system` que muestre todos los componentes del sistema en sus diferentes estados y variantes,
**So that** el equipo pueda verificar la consistencia visual y usar los componentes como referencia durante el desarrollo.

## Acceptance Criteria

### Scenario 1: Pagina muestra todos los componentes
- **Given** que el operador navega a `/design-system`
- **When** la pagina se carga
- **Then** se muestran secciones organizadas por tipo: Botones (primary, secondary, ghost en estados normal, hover, disabled, loading), Cards (base y StatCard), Inputs (normal, focus, error, disabled), Badges (filled, outlined, status variants), Dialog/Bottom Sheet (demo interactivo), Table (con datos de ejemplo), Toast (botones para disparar cada tipo), Progress Bar, Skeleton y Empty State

### Scenario 2: Componentes interactivos
- **Given** que la pagina /design-system esta cargada
- **When** el operador interactua con los botones de demo (ej: "Abrir Dialog", "Disparar Toast")
- **Then** los componentes se comportan interactivamente, mostrando animaciones, estados y transiciones en tiempo real

### Scenario 3: Pagina responsive
- **Given** que la pagina /design-system se visualiza en mobile (< 640px)
- **When** se hace scroll
- **Then** los componentes se muestran en una sola columna, la Table muestra su version mobile (cards), y el Dialog se muestra como bottom sheet

## Definition of Done
- [ ] Ruta `/design-system` accesible
- [ ] Todos los componentes de F-002 renderizados con variantes
- [ ] Secciones organizadas con headers claros
- [ ] Componentes interactivos (Dialog, Toast, Toggle)
- [ ] Responsive
- [ ] Build exitoso

## Technical Notes
- Ubicacion: `src/app/design-system/page.tsx`
- Esta pagina sirve como documentacion viva del design system
- Considerar proteger con middleware (solo accesible en desarrollo o para rol admin)
- Referencia: docs/alquemist-proyecto.md seccion "Fase 0" > "Design system" criterio de completitud

## Dependencies
- US-002-001 a US-002-008 (todos los componentes implementados)

## Estimation
- **Size**: S
- **Complexity**: Low
