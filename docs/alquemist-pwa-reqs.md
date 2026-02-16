# ALQUEMIST

Progressive Web Application

**Documento de Requerimientos**

Arquitectura de Navegación · Especificación de Pantallas · Design System

9 módulos · 48 pantallas · 5 roles

Febrero 2026 · v1.0

## Tabla de Contenidos

## Visión del Producto

Propósito

Alquemist es una Progressive Web Application para la gestión integral de
producción agrícola. La aplicación permite a equipos de campo,
supervisores y gerentes controlar el ciclo completo de producción desde
cualquier dispositivo, con soporte offline para operaciones en campo.

## Principios de Experiencia

**Mobile-first, desktop-enhanced:** Diseño para 360px primero. Desktop
amplía, no reinventa. Touch targets de 44px mínimo. Gestos naturales
(swipe, pull-to-refresh, long-press).

**Offline como ciudadano de primera clase:** El operador puede completar
su jornada completa sin conexión. Sincronización transparente al
reconectar. Indicador permanente de estado de conexión.

**Progressive disclosure por rol:** Cada usuario ve SOLO lo que
necesita. El operador ve 4 módulos; el admin ve 9. La complejidad se
revela gradualmente.

**Ejecución en 3 taps:** Cualquier actividad diaria debe poder
completarse en 3-4 interacciones máximo. Sin formularios innecesarios,
sin confirmaciones redundantes.

**Datos, no decoración:** Cada pixel debe comunicar información.
Gráficos funcionales, no decorativos. Espacios blancos intencionales
para legibilidad en campo (sol directo).

**Contexto siempre visible:** El usuario nunca debe preguntarse 'dónde
estoy' ni 'para qué batch es esto'. Breadcrumbs, headers contextuales
y color-coding permanente.

## Usuarios Objetivo

| **Rol** |  | **Perfil y Contexto** | **Acceso** |
| --- | --- | --- | --- |
| **Operador** | 👷 | Ejecuta actividades diarias en campo. Necesita una app rápida, simple, que funcione sin internet. Interactúa mayoritariamente desde su celular Android de gama media. Prioridad: velocidad de ejecución y offline. | **4 módulos visibles** |
| **Supervisor** | 📋 | Gestiona 2-5 zonas con 10-20 batches. Revisa avances, aprueba actividades, detecta desviaciones. Usa tablet y celular. Prioridad: visibilidad del estado global. | **7 módulos visibles** |
| **Gerente** | 📊 | Crea órdenes de producción, analiza rendimientos, toma decisiones estratégicas. Usa laptop y tablet. Prioridad: analítica y control de costos. | **8 módulos visibles** |
| **Admin** | ⚙️ | Configura el sistema: usuarios, cultivos, fases, catálogos. Usa laptop. Prioridad: configuración completa sin fricción. | **9 módulos visibles** |
| **Viewer** | 👁️ | Solo lectura: inversionistas, auditores, consultores. Cualquier dispositivo. Prioridad: datos claros sin posibilidad de modificar. | **8 módulos (read-only)** |

## Design System

## Dirección Estética

El diseño de Alquemist se inspira en una estética **editorial
minimalista** con raíces en el diseño industrial suizo. La interfaz
prioriza la **tipografía como elemento principal**, superficies limpias
con bordes suaves, y un uso restringido del color donde cada tono
comunica significado.

**Referencia visual:** UI estilo wireframe editorial con fondo off-white
cálido (#F7F8F2), tipografía gruesa para títulos, cards con bordes
sutiles y esquinas generosamente redondeadas (16-20px), controles
circulares/radiales para datos, gráficos de barras limpios con una sola
tinta, y composición asimétrica con columnas de distinto peso.

## Paleta de Colores

| **Token** | **Hex** | **Nombre** | **Uso** |
| --- | --- | --- | --- |
| **Brand | #005E42 | Cinnabar | Headers, sidebar, botones primarios, |
| Primary** |  | Green | links, iconos activos. El verde profundo comunica naturaleza, profesionalismo agrícola. |
| **Brand | #ECF7A3 | Green Pea | Highlights, badges, estados activos |
| Accent** |  | Lime | sobre fondo oscuro, hover states, tags. Aporta vitalidad y contraste sobre el verde oscuro. |
| **Surface** | #F7F8F2 | Warm Off-White | Fondo principal de toda la aplicación. No es blanco puro --- tiene un tinte cálido verdoso que reduce fatiga visual en campo. |
| **Surface | #FFFFFF | White | Fondo de cards y elementos elevados |
| Card** |  |  | sobre el surface. |
| **Text | #1A1A1A | Near Black | Títulos, datos importantes, números. |
| Primary** |  |  | Negro profundo para máximo contraste en luz solar directa. |
| **Text | #5A6B5E | Muted | Subtítulos, timestamps, metadata, |
| Secondary** |  | Green-Gray | placeholders. |
| **Border** | #D4DDD6 | Light Green-Gray | Bordes de cards, divisores, separadores de tabla. |
| **Success** | #059669 | Emerald | Actividades completadas, yields en rango, status 'active'. |
| **Warning** | #D97706 | Amber | Alertas ambientales, actividades vencidas, stock bajo. |
| **Error** | #DC2626 | Red | Alertas críticas, fallos de calidad, cancelaciones. |
| **Info** | #0891B2 | Cyan | Lecturas ambientales, información contextual, tips. |
| **Gold | #C4A35A | Warm Gold | Premium indicators, ratings, badges |
| Accent** |  |  | especiales. Uso muy limitado. |

**Regla de color:** El verde profundo (#005E42) domina los elementos
estructurales (sidebar, headers, botones primarios). El lime (#ECF7A3)
aparece SOLO como acento: textos sobre fondo oscuro, badges de estado
activo, hover highlights. El 90% de la interfaz es surface off-white +
tipografía negra. El color informa, no decora.

## Tipografía

La tipografía es el elemento principal del diseño — no los iconos ni
los colores.

| **Rol** | **Fuente** | **Peso** | **Tamaño** | **Uso** |
| --- | --- | --- | --- | --- |
| **Display / | DM Sans | Bold 800 | 28-32px | Títulos de sección principales. |
| Page Title** |  |  |  | Tracking -0.02em. |
| **Section | DM Sans | Bold 700 | 20-24px | Nombres de módulo, títulos de |
| Title** |  |  |  | card. |
| **Card | DM Sans | SemiBold | 16-18px | Nombres de batch, actividad, |
| Title** |  | 600 |  | producto. |
| **Body** | DM Sans | Regular 400 | 14-15px | Texto general, descripciones. |
| **Caption / | DM Sans | Regular | 11-12px | Timestamps, IDs, secondary info. |
| Metadata** |  | 400 |  | Color: text-secondary. |
| **Data / | DM Mono | Medium 500 | 14-20px | Cantidades, porcentajes, |
| Numbers** |  |  |  | precios, KPIs. Monospace para alineación. |
| **Code / | DM Mono | Regular | 12-13px | SKUs, batch codes, field names. |
| IDs** |  | 400 |  |  |
| **Overline / | DM Sans | Bold 700 | 10-11px | Labels de form, categorías, |
| Label** |  |  |  | UPPERCASE con tracking +0.08em. |

**Fallback:** Si DM Sans / DM Mono no cargan (offline sin cache), el
sistema usa 'system-ui, -apple-system, sans-serif'. DM Sans se eligió
por ser variable-weight, con una personalidad geométrica-humanista que
funciona bien en tamaños pequeños (mobile) y grandes (desktop headers).

## Componentes Base

**Card**

Contenedor principal. Background: white. Border: 1px #D4DDD6.
Border-radius: 16px. Shadow: none (estilo flat editorial). Padding:
16px. Hover: border-color transitions a #005E42. Active: shadow 0 0 0
2px #ECF7A320.

**Button Primary**

Background: #005E42. Text: #ECF7A3. Border-radius: 12px. Height: 48px
(mobile), 40px (desktop). Font: DM Sans Bold 14px. Hover: background
#003D2B. Active: scale(0.98). Disabled: opacity 0.4.

**Button Secondary**

Background: transparent. Border: 1.5px #005E42. Text: #005E42. Mismas
dimensiones. Hover: background #005E42 + text #ECF7A3.

**Button Ghost**

Sin borde ni background. Text: #005E42. Hover: background #F7F8F2. Para
acciones terciarias.

**Input Field**

Background: #FFFFFF. Border: 1.5px #D4DDD6. Border-radius: 12px. Height:
48px. Label: overline style arriba. Focus: border #005E42 + shadow 0 0 0
3px #ECF7A340. Error: border #DC2626.

**Badge / Tag**

Border-radius: 8px. Padding: 4px 10px. Font: 11px Bold. Variants: filled
(#005E42 bg + #ECF7A3 text), outlined (#005E42 border + text), status
(color-coded: success/warning/error).

**Bottom Tab Bar**

Height: 64px + safe area. Background: white. Border-top: 1px #D4DDD6. 4
items + 'Más'. Active: icon + label en #005E42 con dot indicator
arriba. Inactive: #5A6B5E.

**Sidebar (Desktop)**

Width: 64px collapsed, 240px expanded. Background: #005E42. Items:
icon + label en #ECF7A3 (active) o #FFFFFF80 (inactive). Active
indicator: pill #ECF7A320 con borde-left #ECF7A3.

**Stat Card**

Dentro de un Card. Número grande (DM Mono 24-32px Bold) + label pequeño
(11px overline). Border-left 4px color semántico. Tap → navega al
detalle.

**List Item**

Height: 64-72px. Left: color indicator bar (4px). Center: título (16px
bold) + subtitle (12px secondary). Right: chevron o badge. Swipe right:
acción rápida (completar). Divider: 1px #D4DDD650.

**Toggle / Switch**

Track: #D4DDD6 → #005E42. Thumb: white. Width: 44px. Transition: 200ms
ease.

**Progress Bar**

Height: 6px. Background: #D4DDD6. Fill: #005E42. Border-radius: 3px. Con
label: '72%' en DM Mono arriba-derecha.

**Dial / Gauge**

Inspirado en imagen 1: arco circular con ticks radiantes. Número grande
centrado (DM Mono Bold). Label debajo. Para: yield%, ocupación, EC, pH.

**Chart Area**

Fondo: transparent sobre surface. Ejes: #D4DDD6. Labels: DM Mono 10px
#5A6B5E. Barras: fill #005E42 con hover #ECF7A3. Líneas: stroke #005E42
2px.

**Empty State**

Ilustración sutil (line-art verde). Título: 'No hay actividades
pendientes'. Subtítulo: contexto. CTA: botón secundario.

**Skeleton Loader**

Shapes que replican el layout real. Shimmer gradient de #F7F8F2 a
#ECF7A340 a #F7F8F2.

**Toast / Snackbar**

Bottom-center. Background: #1A1A1A. Text: white. Border-radius: 12px.
Auto-dismiss: 4s. Success: con checkmark #059669. Error: con icon
#DC2626.

**Modal / Bottom Sheet**

Mobile: bottom sheet deslizable con pill indicator arriba. Desktop:
modal centered con overlay #1A1A1A40. Max-width: 480px. Border-radius:
20px top.

## Iconografía

**Librería:** Lucide Icons (outlined, 1.5px stroke). Tamaño: 20px en
navegación, 16px inline. Color: hereda del texto. Los iconos **nunca**
se usan solos como CTA — siempre con label de texto accesible. Emojis
(🌱📋⚡📦) se usan como decoración en headers y cards, no como elementos
funcionales.

## Spacing y Grid

**Base unit: 4px.** Todo el spacing usa múltiplos: 4, 8, 12, 16, 20, 24,
32, 40, 48, 64. Mobile: padding horizontal 16px. Desktop: content
max-width 1280px centered. Grid: 12 columnas desktop, 4 columnas mobile.
Gap: 16px mobile, 24px desktop.

## Motion

**Filosofía:** Movimiento funcional, no decorativo. Cada animación tiene
propósito: confirmar acción (scale 0.98 → 1), revelar contenido (fade +
translate-y), transicionar estado (color transition 200ms).
**Durations:** micro-interactions 100-200ms, page transitions 250-350ms,
complex reveals 400-500ms. **Easing:** ease-out para entradas, ease-in
para salidas, spring para bounces sutiles.

## Responsive Breakpoints

| **BP** | **Rango** | **Dispositivo** | **Layout** |
| --- | --- | --- | --- |
| **sm** | 0-639px | Mobile phone | Bottom bar, cards full-width, single column |
| **md** | 640-1023px | Tablet | Bottom bar aún, 2 columnas en dashboard, cards side-by-side |
| **lg** | 1024-1279px | Laptop | Sidebar colapsada (64px), 2-3 columnas, tables |
| **xl** | 1280+ | Desktop | Sidebar expandida (240px), 3-4 columnas, full tables |

## Arquitectura de Navegación

## Navegación Mobile

**Bottom Tab Bar (fija):** 4 módulos principales + 'Más'. Los 4
módulos visibles se determinan por el ROL del usuario para maximizar la
relevancia. La barra es semi-transparente con backdrop-blur para no
perder espacio visual.

| **Rol** | **Bottom Bar (izq → der)** | **Criterio** |
| --- | --- | --- |
| **Operador** | Inicio \&#124; Actividades \&#124; Inventario \&#124; Batches \&#124; Más | Prioriza ejecución rápida |
| **Supervisor** | Inicio \&#124; Batches \&#124; Actividades \&#124; Alertas \&#124; Más | Prioriza visibilidad |
| **Gerente** | Inicio \&#124; Órdenes \&#124; Batches \&#124; Analítica \&#124; Más | Prioriza decisiones |
| **Admin** | Inicio \&#124; Config \&#124; Usuarios \&#124; Batches \&#124; Más | Prioriza administración |
| **Viewer** | Inicio \&#124; Batches \&#124; Órdenes \&#124; Calidad \&#124; Más | Prioriza consulta |

**Menú 'Más':** Bottom sheet que sube con animación spring. Muestra
los módulos restantes como grid de iconos con label. Incluye: perfil del
usuario, preferencias, cambiar facility, modo oscuro, y 'Cerrar
sesión'. El menú usa el verde profundo como background con items en
lime.

## Navegación Desktop

**Sidebar vertical izquierda.** Colapsada (64px): solo iconos con
tooltip on hover. Expandida (240px): icon + label + badge count. Toggle
con botón hamburger o Cmd+B. Background: #005E42. Items activos: pill
background #ECF7A320, border-left 3px #ECF7A3, texto #ECF7A3. Items
inactivos: texto #FFFFFF80. Logo 'ALQUEMIST' en la parte superior.
Perfil del usuario en la parte inferior.

**Top bar:** Height 56px. Background: surface. Contiene: breadcrumbs
(Home > Batches > LOT-001), búsqueda global (Cmd+K), campanita de
notificaciones con badge, y avatar del usuario con dropdown.

Búsqueda Global

Accesible via Cmd+K (desktop) o icono de lupa en top bar (mobile). Modal
centered con input grande (20px font). Busca en: batches (por código),
productos (por SKU/nombre), órdenes (por código), zonas (por nombre),
actividades (por tipo), y usuarios (por nombre). Resultados agrupados
por categoría con highlight del match. Seleccionar → navega al detalle.
Historial de búsquedas recientes.

Notificaciones

Centro de notificaciones accesible desde campanita en top bar. Panel
lateral (desktop) o bottom sheet (mobile). Agrupa por: hoy, ayer, esta
semana. Tipos: actividades vencidas (warning), alertas ambientales
(error/warning), resultados de calidad (info/error), stock bajo
(warning). Tap → navega al contexto. Mark as read individual o bulk.
Push notifications para: critical alerts, actividades asignadas,
resultados de calidad.

Matriz de Acceso por Rol

| **Módulo** | **Operador** | **Supervisor** | **Gerente** | **Admin** | **Viewer** |
| --- | --- | --- | --- | --- | --- |
| **Dashboard** | Propio | Por zona | Global | Global | Global (R/O) |
| **Batches** | Consulta | Gestiona | **Completo** | **Completo** | Consulta |
| **Órdenes** | --- | Consulta | **Completo** | **Completo** | Consulta |
| **Actividades** | Ejecuta | Gestiona | Consulta | **Completo** | Consulta |
| **Inventario** | Consume | Gestiona | **Completo** | **Completo** | Consulta |
| **Áreas** | Consulta | Consulta | Gestiona | **Completo** | Consulta |
| **Calidad** | Registra | Gestiona | **Completo** | **Completo** | Consulta |
| **Operaciones** | Consulta | Gestiona | **Completo** | **Completo** | Consulta |
| **Configuración** | --- | Limitado | Limitado | **Completo** | --- |

**Implementación:** Route-level guards impiden navegación.
Component-level: botones/acciones se ocultan via directive
v-if='hasPermission(action)'. API-level: middleware valida rol+permiso
en cada request. El frontend NUNCA confía solo en ocultar UI — el
backend es la fuente de verdad de permisos.

## Especificación de Pantallas

Detalle de cada pantalla con elementos requeridos, interacciones,
estados y datos del modelo que consume. Organizadas por módulo.

## Módulo: Dashboard

*🏠 Pantalla de inicio adaptada por rol. El dashboard es la primera
impresión — debe comunicar inmediatamente el estado de la producción.*

Dashboard Operador

**ID:** dash-operator **Roles:** operator

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Header contextual** | Saludo personalizado ('Buenos días, Carlos'), fecha actual, clima local (integración API weather opcional). Facility actual del operador. | users.full_name, facilities.name |
| **Stats strip | 3 stat cards en fila: Pendientes (count | COUNT(scheduled_activities |
| (horizontal scroll)** | naranja), Completadas hoy (count verde), Alertas activas (count rojo). Tap en cada stat → filtra la lista debajo. | WHERE status, date=today) |
| **Lista de | Cards ordenadas por hora planificada. Cada | scheduled_activities JOIN |
| actividades de hoy** | card: barra de color izquierda (por tipo), título (tipo + batch code), subtítulo (zona + hora planificada), chevron derecho. Tap → pantalla de ejecución. Swipe derecha → marcar completada rápido. | batches JOIN zones WHERE planned_date=today AND assigned_to=current_user |
| **Sección de | Banner compacto con severity icon + | alerts WHERE entity_id IN |
| alertas** | mensaje + tap para expandir. Solo alertas relevantes al operador (sus zonas/batches). Max 3 visibles, 'Ver todas' para más. | (user's batches/zones) AND resolved_at IS NULL |
| **Indicador offline** | Banner fijo top: verde 'Conectado' o amarillo 'Sin conexión --- datos sincronizados a las HH:MM'. Siempre visible. | Service worker status |
| **Pull-to-refresh** | Al tirar hacia abajo: sincroniza actividades, actualiza alertas. Timestamp de última sincronización visible. | --- |
| **FAB (Floating | Bottom-right, sobre el bottom bar. Icono | --- |
| Action Button)** | '+'. Tap → bottom sheet: 'Nueva observación', 'Actividad ad-hoc', 'Foto rápida'. |  |

Dashboard Supervisor

**ID:** dash-supervisor **Roles:** supervisor

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Header** | Título 'Supervisión', subtitle con zonas activas y total batches. Dropdown para filtrar por facility. | COUNT(zones WHERE status='active'), COUNT(batches WHERE status='active') |
| **Stats strip** | 4 stats: Batches activos, Actividades hoy, Completadas, Vencidas. Colores semánticos. Tap → filtra. | Aggregations from batches, scheduled_activities |
| **Grid de | Cards por zona asignada. Cada card: | zones JOIN batches, |
| zonas** | nombre, health indicator (🟢🟡🔴 basado en alertas), count de batches, fase dominante, mini-chart de condiciones ambientales (sparkline temp/HR últimas 12h). Tap → detalle de zona. | environmental_readings (últimas 12h) |
| **Panel de | Lista de operadores asignados: avatar, | users JOIN |
| equipo** | nombre, progreso de tareas (2/6 completadas), status indicator (activo/ausente). Tap → ver actividades del operador. | scheduled_activities WHERE date=today |
| **Timeline de | Vista cronológica horizontal: actividades | scheduled_activities |
| actividades** | del día por hora. Cada slot coloreado por estado. Permite detectar vacíos y sobrecargas. | GROUP BY hour |
| **Quick | Row de botones: 'Reprogramar actividad', | --- |
| actions** | 'Crear observación', 'Split batch'. Los más usados por el supervisor. |  |

Dashboard Gerente

**ID:** dash-manager **Roles:** manager

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Header** | Título 'Producción', selector de periodo (Mes/Trimestre/Año), selector de facility. | --- |
| **KPIs | 4 stat cards grandes: Órdenes activas (con | production_orders, batches, |
| principales** | mini sparkline de progreso), Batches en producción, Yield promedio (% con comparación vs esperado), COGS promedio por gramo (con tendencia). Cada stat con flecha de tendencia vs periodo anterior. | production_order_phases.yield_pct, inventory_transactions cost aggregation |
| **Gráfico de | Bar chart: yield real vs esperado por | production_order_phases.yield_pct vs |
| rendimiento** | orden activa. Barras verde profundo (#005E42) para real, lime outline (#ECF7A3) para esperado. Tooltip con detalle al hover. | phase_product_flows.expected_yield_pct |
| **Órdenes en | Cards con: código, cultivar, barra de | production_orders JOIN |
| progreso** | progreso (% fases completadas), fase actual, días restantes estimados. Ordenadas por prioridad. Tap → detalle de orden. | production_order_phases |
| **Mini-panel de | Donut chart o treemap: distribución de | inventory_transactions + overhead_costs |
| costos** | costos (insumos directos, labor, overhead). Total COGS del periodo. Comparación vs presupuesto. | aggregated |
| **Acciones | Botones: 'Nueva orden', 'Exportar | --- |
| rápidas** | reporte', 'Ver proyecciones'. |  |

Dashboard Viewer

**ID:** dash-viewer **Roles:** viewer

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Header** | Título 'Resumen de Producción', periodo y facility (read-only). | --- |
| **KPIs | Mismos KPIs que gerente pero sin acciones. | Same as |
| (read-only)** | Datos agregados sin drill-down a costos detallados. | manager, filtered |
| **Estado de | Vista simplificada: tabla de órdenes con | Aggregated |
| producción** | estado, barra de rendimiento general, indicadores de calidad (pass rate %). Sin links a acciones. | read-only views |

## Módulo: Batches

*🌱 El batch es el nexo central. Estas pantallas permiten ver, gestionar
y analizar cada lote de producción desde todas las dimensiones.*

Lista de Batches

**ID:** batch-list **Roles:** all

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Header + | Título 'Batches' con badge count total. | batches con JOINs a |
| filtros** | Barra de filtros: chips removibles para estado (active, completed, on_hold, cancelled), fase actual (dropdown con fases del crop_type seleccionado), zona, cultivar. Search bar para código de batch. | production_phases, zones, cultivars |
| **Selector de | Toggle icon: lista (default mobile) o grid | --- |
| vista** | (default desktop). En grid: cards 2-3 columnas. |  |
| **Batch cards** | Card por batch: código en monospace bold, cultivar name, fase actual como badge (coloreado por fase), zona, plant_count, días en producción, mini progress bar (fase actual / total fases), health indicator basado en alertas activas. Swipe left → acciones rápidas (ver, observación). Tap → detalle. | batches JOIN cultivars, production_phases, zones, alerts |
| **Sorting** | Opciones: más recientes, código A-Z, fase, zona, cultivar. Sticky cuando se scrollea. | --- |
| **Empty state** | Ilustración de planta germinando. 'No hay batches activos. Crea una orden de producción para comenzar.' CTA: 'Ir a Órdenes'. | --- |
| **FAB (solo | Botón para crear batch manual (sin orden) | --- |
| sup/mgr)** | --- caso raro pero necesario. |  |

Detalle de Batch

**ID:** batch-detail **Roles:** all

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Header hero** | Código grande (DM Mono Bold 24px). Debajo: cultivar, zona actual, plant_count, status badge. Background sutil con gradiente del color de fase. | batches.\* JOIN cultivars, zones, production_phases |
| **Phase | Horizontal stepper visual: cada fase como | production_order_phases o |
| stepper** | círculo/rectángulo conectado por línea. Fase completada: llena en verde. Actual: pulsing con color de fase. Futuras: outline gris. Tap en fase → filtra las tabs debajo a esa fase. | production_phases del crop_type |
| **Tabs de | 5 tabs: Timeline, Actividades, Inventario, | --- |
| contenido** | Costos, Calidad. Cada tab carga su contenido independiente con lazy loading. |  |
| **Tab: | Cronología vertical: eventos del batch en | UNION de activities, |
| Timeline** | orden temporal. Tipos: fase iniciada (verde), actividad ejecutada (naranja), transacción de inventario (morado), alerta (amarillo/rojo), test de calidad (cyan). Cada evento: timestamp, tipo icon, descripción, actor. Expandible para ver detalle. | inventory_transactions, alerts, quality_tests WHERE batch_id |
| **Tab: | Lista de actividades ejecutadas + | activities + scheduled_activities WHERE |
| Actividades** | pendientes. Filtro: todas/pendientes/completadas/vencidas. Card: tipo, operador, fecha, duración, link al detalle. | batch_id |
| **Tab: | Transacciones del batch: consumos, | inventory_transactions WHERE batch_id |
| Inventario** | transformaciones, waste. Agrupable por tipo o por fase. Cada transacción: tipo icon, producto, cantidad, costo, operador, timestamp. |  |
| **Tab: Costos** | COGS breakdown: tabla con categorías (insumos, labor, overhead) y subtotales. Barra de comparación: costo actual vs estimado de la orden. Costo por planta y costo por gramo calculados. | SUM(inventory_transactions.cost_total WHERE batch_id) + overhead_costs allocation |
| **Tab: Calidad** | Tests del batch: cards con tipo, lab, fecha, estado (pending/completed/failed), resultado overall (pass/fail). Tap → detalle con parámetros individuales. | quality_tests + quality_test_results WHERE batch_id |
| **Quick actions | Bottom bar fija con acciones según estado: | --- |
| (contextual)** | 'Avanzar fase', 'Registrar observación', 'Split batch', 'Crear test de calidad'. Solo visible para roles con permiso. |  |

Timeline de Batch

**ID:** batch-timeline **Roles:** all

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Timeline | Vista full-screen de la cronología. | All related |
| visual | Formato Gantt simplificado: fases como | entities |
| expandida** | barras horizontales, actividades como puntos dentro de cada barra, transformaciones como flechas entre fases. |  |
| **Filtros de | Checkboxes para mostrar/ocultar: | --- |
| evento** | actividades, transacciones, alertas, tests, cambios de fase. |  |
| **Zoom | Pinch-to-zoom o slider: vista por día, | --- |
| temporal** | semana, o ciclo completo. |  |

Split / Merge de Batch

**ID:** batch-split **Roles:** supervisor, manager, admin

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Wizard de split | Paso 1: Seleccionar cantidad a separar | batches, |
| (3 pasos)** | (slider + input numérico, muestra 'X de Y plantas'). Paso 2: Asignar zona y razón (texto obligatorio). Paso 3: Revisar y confirmar. Preview del batch hijo con código generado. | batch_lineage, zones |
| **Wizard de | Solo para batches hijos del mismo padre en | batch_lineage WHERE |
| merge** | la misma fase. Seleccionar batches a reunificar, confirmar cantidades, generar batch consolidado. | operation='split' |
| **Confirmación** | Modal de confirmación con resumen: 'Vas a separar 8 plantas de LOT-001 en LOT-001-B. ¿Continuar?' Botón destructivo estilo warning. | --- |

Costos del Batch

**ID:** batch-costs **Roles:** supervisor, manager, admin

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Resumen COGS** | Card hero: costo total, costo/planta, costo/gramo. Con comparación vs estimado de la orden. | Calculated from transactions + overhead |
| **Desglose por | Donut chart + tabla: insumos directos, | inventory_transactions |
| categoría** | labor (horas × tarifa), overhead prorrateado. Cada fila expandible para ver detalle. | grouped by resource_categories + overhead_costs |
| **Desglose por | Bar chart: costo por fase. Permite | inventory_transactions |
| fase** | identificar qué fases son más costosas. | grouped by phase_id |
| **Comparativa** | Si hay batches históricos del mismo cultivar: tabla comparativa de costos. Highlight si este batch está fuera de rango. | Historical batch costs |

Genealogía de Batch

**ID:** batch-genealogy **Roles:** all

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Árbol | Diagrama de árbol: batch original como | batch_lineage |
| genealógico | raíz, splits como ramas, merges como | recursive query |
| visual** | convergencias. Cada nodo: código, plant_count, estado. Coloreado por estado. Tap en nodo → navega al detalle. |  |
| **Tabla de | Lista cronológica de splits/merges: fecha, | batch_lineage |
| operaciones** | operación, cantidad, razón, responsable. | ORDER BY performed_at |

## Módulo: Órdenes de Producción

*📋 Planificación de producción. Una orden define QUÉ cultivar, CUÁNTAS
fases, CUÁNTO producir.*

Lista de Órdenes

**ID:** order-list **Roles:** supervisor (R/O), manager, admin

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Filtros** | Chips: estado (draft, approved, in_progress, completed, cancelled), prioridad, cultivar. Search por código. | production_orders |
| **Kanban | Vista kanban por estado: columnas draft → | production_orders grouped |
| opcional | approved → in_progress → completed. Drag & | by status |
| (desktop)** | drop para cambiar estado (solo draft → approved requiere confirmación). |  |
| **Order cards** | Código, cultivar, progreso (% fases completadas como barra), fase actual, fechas, prioridad badge, asignado a. | production_orders JOIN production_order_phases |

Crear Orden (Wizard)

**ID:** order-create **Roles:** manager, admin

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Paso 1: | Selector visual de cultivares con cards: | cultivars JOIN crop_types |
| Cultivar** | nombre, foto/icon, ciclo estimado, rendimiento esperado. Filtro por crop_type. Tap → selecciona. |  |
| **Paso 2: Fases** | Stepper editable: fases del crop_type preseleccionadas. Entry point (dropdown, solo fases con can_be_entry_point=true) y exit point (solo can_be_exit_point=true). Toggle para incluir/excluir fases opcionales (can_skip=true). Preview visual de la cadena seleccionada. | production_phases WHERE crop_type_id |
| **Paso 3: Cantidad | Input: cantidad inicial + unidad + | phase_product_flows chain calculation |
| y producto** | producto de entrada (si entry_phase no es la primera). Cálculo automático de yield en cascada visible: '50 semillas → 45 plántulas (90%) → 42 plantas (95%) → \... → 4.7kg producto final'. Cada paso muestra la fase y su expected_yield_pct desde phase_product_flows. |  |
| **Paso 4: Zona y | Selector de zona para cada fase (o | zones, |
| fechas** | asignación automática por purpose). Fecha de inicio planificada. Cálculo automático de fecha fin desde duraciones de fases. Asignar a (supervisor/manager). | production_phases.default_duration_days |
| **Paso 5: | Resumen completo de la orden: cultivar, | All collected data |
| Revisión** | fases, cantidad, yields esperados, zonas, fechas, responsable. Botón 'Guardar como borrador' o 'Aprobar directamente'. |  |
| **Validaciones** | Warnings si: zona no tiene capacidad suficiente, fechas se solapan con otra orden en la misma zona, cultivar no tiene phase_product_flows completos. | Zone capacity check, schedule overlap check |

Detalle de Orden

**ID:** order-detail **Roles:** supervisor (R/O), manager, admin

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Header** | Código, cultivar, status badge, prioridad, fechas, asignado a. Acciones: Aprobar (si draft), Editar (si draft/approved), Cancelar. | production_orders.\* |
| **Phase | Tabla/stepper: cada fase con estado, | production_order_phases.\* |
| progress** | fechas plan vs real, zona asignada, batch (si ya existe), input/output/yield real. Fases completadas en verde, actual pulsing, futuras en gris. |  |
| **Yield | Diagrama waterfall: cantidad input → | production_order_phases + |
| waterfall** | yield% → output por cada fase. Comparación real vs esperado. Barra verde si yield ≥ esperado, roja si \< 80% del esperado. | phase_product_flows |
| **Batch | Link al batch creado por esta orden. Si | batches WHERE |
| vinculado** | aún no existe: 'Batch se creará al aprobar la orden'. | production_order_id |

## Módulo: Actividades

*⚡ El módulo más usado por el operador. Ejecución diaria, checklists,
recursos consumidos.*

Actividades de Hoy

**ID:** act-today **Roles:** operator, supervisor

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Header** | Fecha actual, count total del día, filtro rápido: 'Pendientes' \&#124; 'Completadas' \&#124; 'Todas'. | --- |
| **Timeline visual** | Eje vertical con horas del día. Cards posicionadas en su hora planificada. Actividades completadas: checkmark + muted. Pendientes: coloreadas por tipo. Vencidas: borde rojo pulsante. | scheduled_activities WHERE planned_date=today |
| **Activity cards | Componente card estándar: barra izquierda | scheduled_activities |
| (reutilizable)** | color por tipo (fertirrigación=verde, poda=naranja, cosecha=rojo, transplante=azul), título (tipo + batch code), subtítulo (zona + hora), badge de estado, chevron. Tap → ejecutar. | JOIN activity_templates, batches, zones |
| **Quick-complete** | Swipe derecha en card: completa la actividad con valores por defecto del template. Para actividades rutinarias sin cambios. Undo disponible por 5 segundos. | --- |
| **Actividades | Si hay actividades overdue: sección sticky | scheduled_activities |
| vencidas (sticky)** | al top con background warning. Se mantiene visible hasta que se completen o reprogramen. | WHERE status='overdue' |

Ejecutar Actividad

**ID:** act-execute **Roles:** operator, supervisor

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Header de | Nombre de actividad, batch (tap → ver), zona, | activity info + batch context |
| contexto** | fase, crop_day. Siempre visible durante toda la ejecución. |  |
| **Step 1: Info y | Recursos planificados del template (ya escalados): | activity_template_resources |
| recursos** | tabla con producto, cantidad calculada, unidad. Cada fila: input editable para cantidad real (pre-llenado con planeado). Toggle 'usar lote específico' para seleccionar inventory_item. Botón 'Añadir recurso' para extras no planificados. | scaled by batch.plant_count |
| **Step 2: | Items del template_checklist en orden. Cada item: | activity_template_checklist |
| Checklist** | instrucción, checkbox (si no requiere valor), input de valor (si expected_value existe, con indicación de tolerance), indicador is_critical (bloquea si no se completa), botón de foto (si requires_photo). Items críticos se marcan en rojo si fuera de rango. |  |
| **Step 3: | Tipo | activity_observations schema |
| Observaciones** | (pest/disease/deficiency/environmental/general), severity selector (info → critical), texto libre, conteo de plantas afectadas, foto(s). Opcional --- se puede saltar. |  |
| **Step 4: | Resumen: recursos consumidos, checklist status | All collected data → |
| Confirmar** | (X/Y completados), observaciones registradas, duración. Botón grande 'Completar Actividad' (verde, 56px height). Solo activo si todos los items is_critical están cumplidos. | activities + activity_resources + inventory_transactions |
| **Modo offline** | Todo el flujo funciona offline. Los datos se guardan en IndexedDB. Al reconectar: sincronización automática con resolución de conflictos. Fotos se comprimen y encolan para upload. | IndexedDB + sync queue |
| **Timer de | Timer automático desde que se inicia la actividad. | activities.duration_minutes |
| duración** | Pausa disponible. Se registra como duration_minutes al completar. |  |

Calendario de Actividades

**ID:** act-calendar **Roles:** supervisor, manager

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Vista semanal | Grid: columnas = días, filas = batches. | scheduled_activities pivoted by |
| (default)** | Celdas coloreadas por tipo de actividad. Tap en celda → lista de actividades de ese batch/día. | date × batch |
| **Vista | Calendar grid con dots de color indicando | scheduled_activities COUNT by date |
| mensual** | densidad de actividades. Tap en día → vista del día. |  |
| **Filtros** | Por batch, zona, tipo de actividad, operador asignado, estado. | --- |
| **Drag & drop | Arrastrar actividad a otra fecha → | UPDATE |
| (desktop)** | reprogramar con confirmación. | scheduled_activities.planned_date |

Templates de Actividad

**ID:** act-templates **Roles:** manager, admin

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Lista de | Cards con: código, nombre, tipo, | activity_templates JOIN |
| templates** | frecuencia, fases aplicables (badges), count de recursos, indica si triggers phase change. Filtro por tipo y fase. | activity_template_phases |
| **Editor de | Form completo: datos base + tabla editable | activity_templates + |
| template** | de recursos (con quantity_basis selector) + lista editable de checklist items (con drag-to-reorder) + fases aplicables (multi-select). Preview de cómo se verá al ejecutar. | related tables |

## Módulo: Inventario

*📦 Control de stock, movimientos, recetas. El alma contable del
sistema.*

Stock Actual

**ID:** inv-stock **Roles:** all

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Vista por | Tabla/cards: SKU, nombre, categoría icon, | inventory_items |
| producto** | cantidad disponible (bold), reservado (naranja), comprometido (rojo), total. Unidad en DM Mono. Indicador visual si bajo mínimo (configurable). Ordenable por nombre, stock, categoría. | GROUP BY product_id |
| **Vista por | Agrupación alternativa: qué hay en cada | inventory_items |
| zona** | zona. Útil para el supervisor que gestiona zonas específicas. | GROUP BY zone_id |
| **Detalle de | Tap en producto → lista de inventory_items | inventory_items |
| producto** | (lotes): batch_number, supplier_lot, cantidad, expiration_date, cost_per_unit, lot_status badge. Gráfico de movimiento: stock over time (últimos 30 días). | WHERE product_id |
| **Alertas de | Sección destacada o tab: productos bajo | inventory_items |
| stock** | mínimo con sugerencia de cantidad a reordenar, proveedor preferido, último costo. | WHERE quantity_available \< threshold |

Movimientos

**ID:** inv-transactions **Roles:** supervisor, manager, admin

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Log de | Tabla scrollable: timestamp, tipo (badge | inventory_transactions |
| transacciones** | coloreado), producto, cantidad (+/-), batch, zona, actividad, usuario. Filtros: tipo, producto, batch, zona, rango de fechas. Exportar a CSV. | ORDER BY timestamp DESC |
| **Detalle de | Tap → vista completa: todos los campos, | inventory_transactions.\* |
| transacción** | links a batch/actividad/receta, transacción relacionada (para transformation_out/in). | with JOINs |

Catálogo de Productos

**ID:** inv-products **Roles:** manager, admin (edit), all (view)

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Lista de | Tabla con: SKU, nombre, categoría, unidad, | products JOIN |
| productos** | tipo (purchased/produced/both), precio, proveedor. Filtro por categoría, tipo. Search por SKU/nombre. | resource_categories, suppliers |
| **Editor de | Form: SKU, nombre, categoría (hierarchical | products + related |
| producto** | picker), unidad (dropdown), cultivar (si aplica), lot_tracking, shelf_life, PHI, REI, yields, densidad, precio, proveedor. |  |

Recetas / BOM

**ID:** inv-recipes **Roles:** supervisor, manager, admin

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Lista de | Cards: nombre, producto output, base | recipes |
| recetas** | quantity, count de ingredientes. Badge 'activa'. |  |
| **Detalle de | Ingredientes en tabla: producto, cantidad, | recipes.items |
| receta** | unidad. Base quantity visible. Preview de escalado. |  |

Ejecutar Receta

**ID:** inv-execute-recipe **Roles:** operator, supervisor

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Selector de | Dropdown o search. | recipes WHERE is_active |
| receta** |  |  |
| **Escalar** | Input: cantidad deseada de output. El sistema calcula scale_factor y muestra todos los ingredientes escalados. Validación: highlight si algún ingrediente no tiene stock suficiente. | recipes.items × scale_factor vs inventory_items |
| **Confirmar** | Tabla final: ingrediente, cantidad, de qué lote se tomará. Botón ejecutar. Genera recipe_execution + inventory_transactions. | recipe_executions + inventory_transactions |

Recepción de Compras

**ID:** inv-receive **Roles:** supervisor, manager, admin

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Form de | Producto (search/select), cantidad, | inventory_items + |
| recepción** | unidad, proveedor (search/select), lote del proveedor, costo por unidad, zona de almacenamiento, fecha de vencimiento (auto-calculada si shelf_life_days). Botón 'Recibir'. | inventory_transactions type='receipt' |
| **Batch de | Opción de recibir múltiples productos a la | Multiple |
| recepción** | vez (de la misma orden de compra). Tabla editable de líneas. | inventory_transactions |

## Módulo: Áreas

*🏭 Infraestructura física. Dónde ocurre la producción.*

Mapa de Facility

**ID:** area-map **Roles:** all

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Selector de | Dropdown si la empresa tiene múltiples | facilities |
| facility** | facilities. Muestra nombre, tipo, dirección. | WHERE company_id |
| **Grid visual | Representación visual tipo plano: zonas | zones JOIN |
| de zonas** | como rectángulos proporcionales al área. Color por purpose (propagación=verde claro, vegetativo=verde, floración=morado, secado=naranja, storage=gris). Overlay: count de batches, ocupación %. Tap → detalle de zona. | batches (count, occupancy) |
| **Stats de | Cards superiores: área total, capacidad | facilities.\* |
| facility** | total, plantas actuales, % ocupación global. | calculated |

Detalle de Zona

**ID:** area-zone-detail **Roles:** all

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Header** | Nombre, purpose badge, environment badge, área, capacidad (efectiva/total), status. | zones.\* |
| **Clima | Cards con dial/gauge (estilo imagen 1): | environmental_readings |
| actual** | temperatura, humedad, CO₂, VPD. Cada uno con valor actual vs rango óptimo del cultivar principal. Verde si en rango, amarillo si borderline, rojo si fuera. | (latest) vs cultivars.optimal_conditions |
| **Batches en | Lista de batches actualmente en esta zona. | batches WHERE zone_id |
| zona** | Card por batch con fase y salud. |  |
| **Estructuras | Tabla de zone_structures: nombre, tipo, | zone_structures WHERE zone_id |
| (si existen)** | dimensiones, niveles, capacidad. Expandible para ver posiciones. |  |
| **Historial | Gráfico de líneas: temp, HR, CO₂ últimos 7 | environmental_readings time |
| ambiental** | días. Banda sombreada del rango óptimo. Puntos fuera de rango resaltados. | series |

Posiciones de Planta

**ID:** area-positions **Roles:** supervisor, manager, admin

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Grid visual** | Representación de la zona como grid: cada celda = posición. Coloreada por estado: vacía (gris), plantada (verde con batch code), cosechada (naranja), mantenimiento (rojo). Tap → detalle de posición/batch. | plant_positions WHERE zone_id |
| **Stats de | Resumen: total, ocupadas, vacías, en | plant_positions |
| posiciones** | mantenimiento. % ocupación. | grouped by status |

Ocupación Planificada

**ID:** area-occupancy **Roles:** supervisor, manager

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Timeline de | Gantt por zona: cada barra = batch con | batches + |
| ocupación** | fase y duración planificada. Permite detectar solapamientos y planificar rotaciones. | production_order_phases scheduled dates |
| **Proyección** | Vista futura: qué zonas estarán disponibles en las próximas 4-8 semanas basado en órdenes activas. | Calculated from active orders |

## Módulo: Calidad

*🔬 Control de calidad: tests de laboratorio, resultados, aprobaciones.*

Tests Pendientes

**ID:** qual-pending **Roles:** supervisor, manager

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Lista de | Cards ordenadas por urgencia: batch, tipo | quality_tests |
| tests** | de test, lab, fecha de muestra, días en espera. Badge 'pending' o 'in_progress'. Tap → registrar resultados. | WHERE status IN ('pending', 'in_progress') |
| **Crear test** | Botón → form: batch (search), fase, tipo de test, lab, referencia de muestra, fecha de muestra. | quality_tests INSERT |

Registrar Resultados

**ID:** qual-results **Roles:** supervisor, manager

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Form de | Tabla editable: parámetro, valor (input), | quality_test_results INSERT |
| resultados** | unidad, thresholds (min/max mostrados como referencia), auto-cálculo de passed. Indicador visual: verde si pasa, rojo si no. Overall pass calculado automáticamente. |  |
| **Adjuntos** | Upload de certificado del lab (PDF) → attachments. | attachments WHERE entity_type='quality_test' |

Historial de Calidad

**ID:** qual-history **Roles:** all

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Tabla de | Todos los tests con filtros: batch, | quality_tests + |
| tests** | cultivar, tipo, estado, rango de fechas. Columnas: batch, tipo, lab, fecha, overall pass badge. | quality_test_results |
| **Tendencias** | Gráfico: evolución de parámetros clave (ej: THC%, moisture%) a lo largo de batches del mismo cultivar. Identifica tendencias de mejora o degradación. | quality_test_results aggregated by cultivar |

## Módulo: Operaciones

*📡 Soporte transversal: sensores, alertas, costos indirectos.*

Ambiente en Tiempo Real

**ID:** ops-env **Roles:** supervisor, manager

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Dashboard de | Grid de cards, una por zona monitoreada. | environmental_readings (latest |
| zonas** | Cada card: nombre de zona, dials circulares (estilo imagen 1 de referencia) para cada parámetro (temp, HR, CO₂, VPD). Verde/amarillo/rojo según rango. Tap → historial de esa zona. | per zone per parameter) vs cultivars.optimal_conditions |
| **Refresh | Polling cada 30-60 segundos | WebSocket o polling |
| automático** | (configurable). Animación sutil cuando un valor cambia. |  |

Centro de Alertas

**ID:** ops-alerts **Roles:** all

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Tabs** | Pendientes \&#124; Reconocidas \&#124; Resueltas. Count badge por tab. | alerts grouped by state |
| **Alert cards** | Severity icon + color, tipo, mensaje, entidad vinculada (batch/sensor/item), timestamp. Acciones: Reconocer, Resolver, Ir a entidad. | alerts.\* |
| **Filtros** | Por tipo, severity, entidad, rango de fechas. | --- |

Costos Overhead

**ID:** ops-costs **Roles:** manager, admin

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Registro de | Form: facility, zona (opt), tipo | overhead_costs |
| costos** | (energy/rent/etc), descripción, monto, moneda, periodo, base de asignación. Lista de costos registrados por periodo. |  |
| **Asignación a | Vista: cómo se distribuyó el overhead a | overhead_costs |
| batches** | cada batch según el allocation_basis. Tabla: batch, base (m², plantas, etc), proporción, monto asignado. | allocation calculation |

Gestión de Sensores

**ID:** ops-sensors **Roles:** admin

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Lista de | Tabla: zona, tipo, marca/modelo, serial, | sensors |
| sensores** | fecha calibración, estado activo. Indicador si calibración vencida. |  |
| **Configuración** | Form por sensor: zona, tipo, datos del dispositivo, fecha de calibración. | sensors INSERT/UPDATE |

## Módulo: Configuración

*⚙️ Setup del sistema: tipos de cultivo, fases, cultivares, usuarios,
empresa.*

Tipos de Cultivo y Fases

**ID:** cfg-crop-phases **Roles:** admin

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Lista de | Cards: nombre, categoría, count de fases, | crop_types |
| crop_types** | count de cultivares. Tap → ver fases. |  |
| **Editor de | Lista drag-to-reorder de fases para el | production_phases |
| fases** | crop_type seleccionado. Cada fase: nombre, código, sort_order, toggles (is_transformation, is_destructive, requires_zone_change, can_be_entry/exit_point), duración default. Inline edit. | WHERE crop_type_id |
| **Phase flows** | Por cada fase: tabla de inputs y outputs (phase_product_flows). Dirección, rol, producto/categoría, yield esperado. Editor inline con validación: cada output de fase N debe matchear un input de fase N+1. | phase_product_flows WHERE phase_id |

Cultivares

**ID:** cfg-cultivars **Roles:** manager, admin

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Lista** | Cards: nombre, crop_type, breeder, ciclo, yield esperado, quality grade. | cultivars |
| **Editor** | Form completo: datos base + phase_durations (JSON editor friendly) + optimal_conditions (JSON con UI de rangos) + density + notas. | cultivars INSERT/UPDATE |
| **Cultivar | Tabla de SKUs asociados: producto, fase | cultivar_products |
| Products** | donde se produce, is_primary. | WHERE cultivar_id |

Usuarios y Roles

**ID:** cfg-users **Roles:** admin

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Lista de | Tabla: nombre, email, rol badge, facility | users |
| usuarios** | asignada, último login, estado activo. |  |
| **Editor de | Form: datos personales, rol (dropdown con | users |
| usuario** | descripción de permisos), facility asignada, permisos granulares (JSON editor con checkboxes). | INSERT/UPDATE |
| **Invitar | Form simplificado: email, rol, facility. | User invitation |
| usuario** | Envía invitación por email. | flow |

Planes de Cultivo

**ID:** cfg-schedules **Roles:** manager, admin

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Lista de | Cards: nombre, cultivar, total días, count | cultivation_schedules |
| planes** | de actividades. Badge 'activo'. |  |
| **Editor | Timeline builder: eje X = días del ciclo. | cultivation_schedules.phase_config |
| visual** | Cada fase como sección. Dentro de cada fase: bloques de activity_templates arrastrados desde un panel lateral. Configurar: día inicio/fin de cada template, frecuencia. |  |

Empresa

**ID:** cfg-company **Roles:** admin

| **Elemento** | **Especificación** | **Datos / Modelo** |
| --- | --- | --- |
| **Configuración | Form: nombre, NIT/legal_id, país, | companies |
| general** | timezone, moneda, logo upload. |  |
| **Facilities** | Lista de instalaciones con editor: nombre, tipo, dirección, coordenadas, área. | facilities |
| **Categorías de | Árbol jerárquico editable: drag to nest, | resource_categories |
| recurso** | inline rename, toggle consumable/depreciable/transformable. |  |
| **Unidades de | Tabla de unidades con factores de | units_of_measure |
| medida** | conversión. Dimensiones predefinidas, extensible. |  |

## Patrones Transversales

## Offline-First Architecture

▸ Service Worker con Workbox: precache de shell + runtime cache de API
responses

▸ IndexedDB como store local: actividades del día, catálogos, templates,
batches asignados

▸ Cola de sincronización (background sync): acciones offline se encolan
con timestamp y se envían al reconectar

▸ Conflict resolution: last-write-wins basado en timestamp del
dispositivo. Conflictos detectados → notificación al usuario

▸ Pre-carga inteligente: al conectar WiFi, descarga datos de las
próximas 24h automáticamente

▸ Fotos: compresión client-side (max 1200px, JPEG 80%) antes de encolar
para upload

▸ Indicador permanente: banner verde 'Conectado' o amarillo 'Sin
conexión — última sync: HH:MM'

## Estado y Loading

▸ Skeleton loaders que replican el layout real (no spinners genéricos)

▸ Shimmer animation: gradiente de surface → lime 20% → surface

▸ Optimistic updates para acciones comunes (completar actividad =
actualiza UI inmediatamente, rollback si falla)

▸ Pull-to-refresh en todas las listas con timestamp de última
actualización

▸ Empty states con ilustración, mensaje contextual y CTA

▸ Error states con retry automático (exponential backoff) y botón manual

## Formularios

▸ Labels siempre visibles (no solo como placeholder que desaparece)

▸ Validación inline en real-time (no solo al submit)

▸ Auto-save en formularios largos (wizard) — cada paso se persiste

▸ Teclado numérico automático para inputs de cantidad
(inputMode='decimal')

▸ Dropdowns con search integrado para listas largas (productos, zonas)

▸ Selectors jerárquicos para categorías (padre → hijo → nieto)

▸ Undo disponible por 5 segundos después de acciones destructivas

## Accesibilidad

▸ Contraste AA mínimo en todos los textos (WCAG 2.1)

▸ Touch targets 44×44px mínimo (48px preferido)

▸ Labels en todos los inputs, aria-labels en iconos funcionales

▸ Focus visible con outline #005E42 para navegación por teclado

▸ Modo de alto contraste: detecta prefers-contrast y ajusta bordes

▸ No depender solo del color: siempre incluir icon o texto
complementario

▸ Soporte de screen reader para elementos dinámicos (aria-live regions)

## Performance

▸ Time to Interactive < 3s en 3G (Lighthouse target)

▸ Code splitting por módulo — solo cargar JavaScript del módulo activo

▸ Lazy loading de imágenes y componentes pesados (charts)

▸ Virtual scrolling para listas > 50 items

▸ API responses cacheadas en Service Worker con stale-while-revalidate

▸ Imágenes: WebP con fallback, responsive sizes, lazy loading nativo

▸ Bundle size target: < 200KB initial JS (gzipped)

## Internacionalización

▸ Arquitectura i18n-ready desde el inicio (aunque v1 es solo español)

▸ Formatos de fecha, hora y moneda según locale del tenant
(companies.timezone, companies.currency)

▸ Unidades de medida flexibles (kg/lb, °C/°F) según configuración

▸ Textos en constantes extraíbles, no hardcoded en componentes

## Flujos de Navegación Clave

Los recorridos más frecuentes por rol. Cada flujo indica las pantallas
involucradas y el número mínimo de interacciones.

| **Flujo** | **Taps** | **Recorrido** |
| --- | --- | --- |
| **Operador ejecuta | **3-4 | dash-operator → act-today → card tap → |
| actividad diaria** | taps** | act-execute (step 1→2→3→4) → confirmar → dash-operator (updated). Total: abrir app → completar actividad en \~90 segundos. |
| **Operador registra | **2-3 | FAB (+) → 'Nueva observación' → |
| observación rápida** | taps** | seleccionar batch → tipo + severity + descripción + foto → guardar. Total: \~60 segundos. |
| **Supervisor revisa | **5-6 | dash-supervisor → zone-card tap → |
| estado matutino** | taps** | area-zone-detail (clima + batches) → back → next zone. Review de 3 zonas en \~3 minutos. |
| **Supervisor hace split | **5 taps** | batch-list → batch-detail → 'Split |
| de batch** |  | batch' action → batch-split wizard (3 pasos) → confirmar. Total: \~2 minutos. |
| **Gerente crea orden de | **7-8 | order-list → 'Nueva orden' → |
| producción** | taps** | order-create wizard (5 pasos: cultivar → fases → cantidad → zona → revisión) → aprobar. Total: \~5 minutos con yield auto-calculado. |
| **Gerente analiza | **3-4 | dash-manager → orden card tap → |
| rendimiento** | taps** | order-detail → yield waterfall. Análisis en \~60 segundos. |
| **Operador recibe | **3-4 | inv-stock → 'Recibir' → inv-receive |
| compra** | taps** | form (producto, cantidad, proveedor, costo) → confirmar. Total: \~90 segundos. |
| **Supervisor ejecuta | **4 taps** | inv-recipes → receta tap → |
| receta** |  | inv-execute-recipe → escalar → confirmar. Total: \~2 minutos. |
| **Supervisor registra | **4-5 | qual-pending → test tap → qual-results |
| resultados de calidad** | taps** | form (parámetros) → adjuntar certificado → guardar. Total: \~3 minutos. |
| **Admin configura nuevo | **6-8 | cfg-crop-phases → 'Nuevo tipo' → |
| cultivo** | taps** | nombre + fases (drag order) → phase flows por fase → cfg-cultivars → 'Nuevo cultivar' → datos completos. Total: \~10 minutos. |

Stack Tecnológico

| **Capa** | **Tecnología** | **Justificación** |
| --- | --- | --- |
| **Framework** | Next.js 14+ (App Router) | SSR/SSG, API routes, middleware, file-based routing |
| **Styling** | Tailwind CSS 3.4+ | Design tokens como CSS variables, dark mode, responsive utilities |
| **Tipografía** | Google Fonts: DM Sans + DM Mono | Variable-weight, subsetted para performance |
| **Iconos** | Lucide React | Outlined, 1.5px stroke, tree-shakeable |
| **Charts** | Recharts + custom SVG dials | Gauges/dials circulares custom para temp/HR/pH |
| **Estado | Zustand + React Query | Zustand para UI state, React Query |
| global** |  | para server state + cache + offline |
| **Forms** | React Hook Form + Zod | Validación type-safe, performance optimizada |
| **PWA** | next-pwa + Workbox | Service worker, precaching, background sync |
| **Offline | IndexedDB via Dexie.js | Schema tipado, sync queue, bulk |
| Storage** |  | operations |
| **Database** | PostgreSQL 16 + Drizzle ORM | Type-safe queries, migrations, connection pooling |
| **Auth** | Auth.js (NextAuth) v5 | JWT + refresh tokens, role-based middleware |
| **Hosting** | Vercel o self-hosted | Edge functions, ISR, image optimization |
| **Testing** | Vitest + Playwright | Unit + E2E, visual regression para design system |
| **Monitoring** | Sentry + Vercel Analytics | Error tracking, Web Vitals, performance monitoring |

