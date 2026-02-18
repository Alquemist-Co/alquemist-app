# F-062: Optimizacion de Performance

## Overview

Conjunto de optimizaciones tecnicas para alcanzar un Lighthouse score > 90 en mobile. Incluye code splitting por modulo, lazy loading de componentes pesados (charts, imagenes), virtual scrolling para listas grandes (> 50 items), optimizacion de imagenes (WebP, responsive sizes) y reduccion del bundle inicial a < 200KB JS gzipped. El objetivo es que el Time to Interactive sea < 3s en conexion 3G.

## User Personas

- **Operador**: Se beneficia de carga rapida en celular Android de gama media con conexion lenta. TTI < 3s permite empezar a trabajar inmediatamente.
- **Supervisor**: Se beneficia de scroll fluido en listas largas de batches y actividades.
- **Gerente**: Se beneficia de carga diferida de graficos complejos que no bloquean la interactividad inicial.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-062-001 | Lighthouse audit inicial y baseline | S | P0 | Planned |
| US-062-002 | Code splitting por modulo | M | P0 | Planned |
| US-062-003 | Lazy loading de charts e imagenes | M | P0 | Planned |
| US-062-004 | Virtual scrolling para listas grandes | M | P1 | Planned |
| US-062-005 | Optimizacion de imagenes y bundle | M | P0 | Planned |

---

# US-062-001: Lighthouse audit inicial y baseline

## User Story

**As a** admin,
**I want** que se ejecute un audit de Lighthouse en mobile y se documente el baseline actual,
**So that** tengamos metricas claras de donde partimos y podamos medir la mejora.

## Acceptance Criteria

### Scenario 1: Audit exitoso
- **Given** la aplicacion esta deployada en Vercel
- **When** se ejecuta Lighthouse en modo mobile con throttling 3G
- **Then** se documentan los scores de Performance, Accessibility, Best Practices y SEO, junto con metricas clave: FCP, LCP, TBT, CLS y TTI

### Scenario 2: Identificar problemas principales
- **Given** el audit de Lighthouse genera un reporte
- **When** se analizan los resultados
- **Then** se documenta una lista priorizada de oportunidades de mejora con impacto estimado en puntos de score

### Scenario 3: Score objetivo definido
- **Given** el baseline esta documentado
- **When** se definen los objetivos
- **Then** el target es: Performance > 90, Accessibility > 95, Best Practices > 90, TTI < 3s en 3G, bundle < 200KB JS gzipped

## Definition of Done
- [ ] Audit ejecutado y reporte documentado
- [ ] Baseline de metricas registrado
- [ ] Lista de oportunidades priorizada
- [ ] Targets definidos y documentados

## Technical Notes
- Ejecutar `npx lighthouse https://alquemist.vercel.app --view --preset=desktop --form-factor=mobile`
- Tambien: `npx @next/bundle-analyzer` para analizar composicion del bundle
- Documentar resultados en `/docs/performance-baseline.md`
- Usar Vercel Analytics Web Vitals como monitoreo continuo

## UI/UX Notes
- N/A (tarea tecnica de auditoria)

## Dependencies
- Requiere app deployada con funcionalidad de Fases 0-3

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-062-002: Code splitting por modulo

## User Story

**As a** operador,
**I want** que la aplicacion solo cargue el JavaScript del modulo que estoy usando,
**So that** la carga inicial sea rapida y no desperdicie datos moviles descargando codigo de modulos que no necesito.

## Acceptance Criteria

### Scenario 1: Solo se carga JS del modulo activo
- **Given** el operador accede al dashboard
- **When** la pagina carga
- **Then** solo se descarga el JavaScript del dashboard y componentes compartidos, no el codigo de ordenes, inventario, calidad ni configuracion

### Scenario 2: Navegacion a otro modulo carga incrementalmente
- **Given** el operador esta en el dashboard y navega a actividades
- **When** la pagina de actividades carga
- **Then** solo se descarga el chunk de actividades adicional, los componentes compartidos ya cacheados no se re-descargan

### Scenario 3: Bundle inicial bajo threshold
- **Given** la optimizacion de code splitting esta implementada
- **When** se mide el bundle inicial
- **Then** el JavaScript inicial (shared + framework + pagina actual) es < 200KB gzipped

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Bundle analysis documenta mejora
- [ ] Build de produccion sin errores
- [ ] Lighthouse Performance score mejorado vs baseline

## Technical Notes
- Next.js App Router hace code splitting automatico por route
- Verificar que no hay imports dinamicos que arrastren modulos completos
- Usar `next/dynamic` con `loading` component para componentes pesados
- Analizar con `@next/bundle-analyzer` que no hay cross-imports entre modulos
- Configurar `next.config.ts` para optimizar el output

## UI/UX Notes
- Los usuarios ven skeleton loaders mientras se carga un chunk de modulo nuevo
- La navegacion entre modulos debe sentirse fluida (< 500ms para mostrar contenido)

## Dependencies
- Requiere estructura de proyecto con modulos separados (Fase 0)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-062-003: Lazy loading de charts e imagenes

## User Story

**As a** gerente,
**I want** que los graficos y componentes pesados se carguen solo cuando son visibles en pantalla,
**So that** la interactividad de la pagina no se bloquee esperando a que carguen elementos que aun no veo.

## Acceptance Criteria

### Scenario 1: Chart se carga al hacer scroll
- **Given** el gerente accede al dashboard y los graficos estan debajo del fold
- **When** la pagina carga inicialmente
- **Then** se muestran placeholders/skeletons para los graficos y estos se cargan cuando el usuario scrollea cerca de ellos (intersection observer)

### Scenario 2: Imagenes con lazy loading nativo
- **Given** una pagina tiene 20 fotos de actividades
- **When** la pagina carga
- **Then** solo se descargan las imagenes visibles en viewport, las demas usan `loading="lazy"` nativo del browser

### Scenario 3: Recharts no se incluye en el bundle inicial
- **Given** la libreria Recharts pesa ~200KB
- **When** se analiza el bundle
- **Then** Recharts esta en un chunk separado que solo se descarga cuando una pagina con graficos se visita

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Bundle analysis confirma que Recharts no esta en el initial bundle
- [ ] Lighthouse TTI mejorado vs baseline
- [ ] Build de produccion sin errores

## Technical Notes
- `next/dynamic` para componentes de Recharts: `const Chart = dynamic(() => import('./YieldChart'), { loading: () => <ChartSkeleton /> })`
- `next/image` con `loading="lazy"` y `sizes` responsive para fotos
- Intersection Observer API para cargar componentes al entrar en viewport
- Componentes pesados a lazy-load: `BarChart`, `PieChart`, `Sparkline`, `GanttTimeline`, `GenealogyTree`

## UI/UX Notes
- Skeletons que replican dimensiones reales del grafico
- Shimmer animation durante carga: gradient de surface a lime 20% a surface
- Transicion fade-in de 200ms cuando el componente real reemplaza al skeleton

## Dependencies
- Requiere componentes de charts implementados (Fases 1-3)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-062-004: Virtual scrolling para listas grandes

## User Story

**As a** supervisor,
**I want** que las listas con mas de 50 items usen virtual scrolling,
**So that** pueda navegar listas de cientos de batches o transacciones sin lag ni problemas de memoria.

## Acceptance Criteria

### Scenario 1: Lista de batches con virtual scroll
- **Given** hay 200 batches en el sistema
- **When** el supervisor abre la lista de batches
- **Then** solo se renderizan los ~15 items visibles en el viewport, los demas se renderizan al hacer scroll sin causar lag perceptible

### Scenario 2: Scroll fluido
- **Given** la lista tiene 500 transacciones de inventario
- **When** el supervisor hace scroll rapido
- **Then** los items se renderizan suavemente a 60fps sin saltos ni flickering visible

### Scenario 3: Listas pequenas no usan virtual scroll
- **Given** una lista tiene solo 20 items
- **When** se renderiza
- **Then** se usa renderizado normal (no virtual) para evitar complejidad innecesaria

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Performance medida: scroll a 60fps con 500+ items
- [ ] Build de produccion sin errores
- [ ] Tests de rendering para listas virtualizadas

## Technical Notes
- Libreria: `@tanstack/react-virtual` (mismo ecosistema que TanStack Query)
- Threshold: activar virtual scrolling solo para listas con > 50 items
- Listas que lo necesitan: `batch-list`, `inv-transactions`, `inv-stock`, `act-today` (si muchas actividades), `cfg-users`
- Componente wrapper: `VirtualList` que detecta count y decide si virtualizar

## UI/UX Notes
- La barra de scroll debe reflejar el tamano total de la lista (no solo los items visibles)
- Mantener smooth scrolling en mobile con momentum scroll
- Skeleton items al inicio/fin como buffer de pre-renderizado

## Dependencies
- Requiere listas de datos existentes (Fases 1-3)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-062-005: Optimizacion de imagenes y bundle

## User Story

**As a** operador,
**I want** que las imagenes se sirvan en formato WebP con tamanos responsive y que el bundle total sea lo mas pequeno posible,
**So that** la app cargue rapido incluso con conexion movil limitada y no consuma datos innecesariamente.

## Acceptance Criteria

### Scenario 1: Imagenes en WebP
- **Given** hay fotos de actividades almacenadas en Supabase Storage
- **When** se renderizan en la app
- **Then** se sirven en formato WebP con fallback a JPEG para browsers que no soporten WebP, usando `next/image` con optimizacion automatica

### Scenario 2: Imagenes responsive
- **Given** una foto se muestra en mobile (360px) y desktop (1280px)
- **When** el browser solicita la imagen
- **Then** recibe un tamano apropiado al viewport via `sizes` y `srcSet`, no la imagen full-size

### Scenario 3: Bundle analysis limpio
- **Given** las optimizaciones de bundle estan implementadas
- **When** se ejecuta `@next/bundle-analyzer`
- **Then** no hay dependencias duplicadas, no hay imports innecesarios de librerias completas (tree shaking verificado), y el total JS gzipped es < 200KB initial

### Scenario 4: Lighthouse score target
- **Given** todas las optimizaciones de performance estan implementadas
- **When** se ejecuta Lighthouse mobile con throttling 3G
- **Then** el Performance score es > 90 y TTI < 3s

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Bundle < 200KB JS gzipped initial
- [ ] Lighthouse Performance > 90
- [ ] Build de produccion sin errores

## Technical Notes
- `next/image` para todas las imagenes con `quality={80}` y `format="webp"`
- Supabase Storage image transformation para generar tamanios on-the-fly
- Tree shaking: verificar imports nombrados de lucide-react (`import { Search } from 'lucide-react'` no `import * as icons`)
- Eliminar dependencias no usadas del `package.json`
- Comprimir fotos offline: max 1200px JPEG 80% antes de upload (ya definido en Fase 3)

## UI/UX Notes
- Placeholder blur para imagenes mientras cargan (blur hash o dominant color)
- Las imagenes no causan layout shift (width y height definidos o aspect-ratio CSS)

## Dependencies
- Requiere fotos en Supabase Storage (Fase 3)
- Requiere todas las fases previas completadas para audit final

## Estimation
- **Size**: M
- **Complexity**: Medium
