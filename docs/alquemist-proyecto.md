# ALQUEMIST

Sistema de Gestión Agrícola

**Documento Técnico del Proyecto**

Arquitectura · Stack · Estructura · Roadmap · Setup

**Next.js 14 · Supabase · Vercel · Tailwind · PWA Offline-First**

Febrero 2026 · v1.0

## Tabla de Contenidos

## Resumen Ejecutivo

**Alquemist** es una Progressive Web Application para la gestión
integral del ciclo de producción agrícola. Cubre desde la semilla hasta
el producto final empacado, con soporte para cualquier tipo de cultivo
mediante fases configurables.

| **Aspecto** | **Detalle** |
| --- | --- |
| **Producto** | PWA mobile-first con soporte offline completo para operaciones de campo |
| **Modelo de datos** | 43 tablas en 8 dominios + nexo central (batches), 9 tablas CORE |
| **Usuarios | 5 roles: operador, supervisor, gerente, admin, |
| objetivo** | viewer (50-200 usuarios) |
| **Pantallas** | 48 pantallas en 9 módulos con progressive disclosure por rol |
| **Stack** | Next.js 14 + Supabase + Vercel + Tailwind CSS + Serwist (PWA) |
| **Costo | \$0/mes (free tiers) → \$45/mes al escalar con |
| infraestructura** | clientes pagando |
| **Diferenciador | Offline-first real: operador completa jornada sin |
| clave** | internet y sincroniza al reconectar |
| **Design system** | Editorial minimalista: #005E42 (verde profundo) + #ECF7A3 (lime) + DM Sans/Mono |

## Documentos Complementarios

Este documento se apoya en y complementa:

**alquemist-modelo-definitivo.md** — Modelo de datos completo: 43
tablas, relaciones cross-domain, flujos operativos, diccionario de
campos

**alquemist-pwa-reqs.md** — Requerimientos de UX/UI: design system,
especificación de 48 pantallas, patrones transversales, matriz de acceso

## Stack Tecnológico Definitivo

Stack seleccionado por: máxima productividad para dev solo, \$0/mes en
desarrollo y early traction, free tiers que cubren 50-200 users, y
mínimo vendor lock-in (PostgreSQL estándar migrable en 2-3 días).

## Capas del Sistema

| **Capa** | **Tecnología** | **Tipo** | **Detalle y Justificación** |
| --- | --- | --- | --- |
| **Frontend** | **Next.js 14+ (App Router)** | Framework | SSR + SSG + API Routes + React Server Components. File-based routing. Middleware para auth y roles. Image optimization built-in. Turbopack para dev server rápido. |
| **Styling** | **Tailwind CSS 3.4** | UI | Utility-first CSS con design tokens como CSS variables. Componentes custom construidos con Radix UI primitives para accesibilidad, 100% customizables con brand colors. |
| **Tipografía** | **DM Sans + DM Mono (next/font)** | Assets | Variable-weight, auto-optimizado por Next.js, self-hosted para funcionar offline. DM Sans: geométrica-humanista para UI. DM Mono: monospace para datos y códigos. |
| **Iconos** | **Lucide React** | Assets | Outlined, 1.5px stroke, tree-shakeable (\~20KB gzipped). Consistente con la estética editorial. |
| **Charts** | **Recharts + SVG custom** | Visualización | Recharts para barras/líneas/áreas. SVG custom para dials circulares y gauges (estilo del diseño de referencia). |
| **Formularios** | **React Hook Form + Zod** | Validación | Uncontrolled inputs (performance). Zod schemas compartidos entre client y server para validación type-safe end-to-end. |
| **Estado client** | **Zustand** | State mgmt | Minimal boilerplate, sin providers. Para UI state: filters, modals, sidebar state, active tab. |
| **Server state** | **TanStack Query v5** | Cache/Sync | Fetch, cache, refetch automático, optimistic updates, offline persistence. Reemplaza la necesidad de Redux para data fetching. |
| **PWA** | **Serwist (sucesor de next-pwa)** | Offline | Workbox under the hood. Precache del shell, runtime cache de API responses, background sync para cola offline. |
| **Offline store** | **Dexie.js (IndexedDB)** | Storage local | API tipo ORM para IndexedDB. Schema tipado con TypeScript. Sync queue custom para encolar mutaciones offline. |
| **Base de datos** | **Supabase (PostgreSQL 15)** | Backend | Managed PostgreSQL con extensions (pg_trgm, uuid-ossp). Dashboard SQL. Row Level Security para multi-tenancy. Free: 500MB DB, 50K MAU. |
| **ORM** | **Drizzle ORM + drizzle-kit** | Data access | Type-safe, SQL-like API, zero overhead en runtime. drizzle-kit para migrations y pull de schema existente. Adaptador oficial para Supabase. |
| **Auth** | **Supabase Auth** | Autenticación | JWT + refresh tokens. Custom claims para roles (app_metadata.role). Magic link o email/password. 50K MAU en free tier. |
| **Realtime** | **Supabase Realtime** | Push | Postgres Changes: escucha INSERTs/UPDATEs y pushea a clientes. Para: alertas ambientales, sync entre tabs, notificaciones live. |
| **Storage** | **Supabase Storage** | Archivos | 1GB free. Para: fotos de actividades, certificados de calidad, attachments. Policies por bucket (public/private). Image transformation built-in. |
| **Edge | **Supabase Edge | Serverless | Para: webhooks de IoT (sensores), |
| Functions** | Functions (Deno)** |  | scheduled jobs (alertas de vencimiento), integraciones externas. 2M invocaciones/mes free. |
| **Deploy** | **Vercel** | Hosting | Deploy automático con git push. Preview por PR. CDN global. Edge Runtime para middleware. Analytics. Free: 100GB bandwidth. |
| **DNS + CDN** | **Cloudflare (DNS proxy)** | Infra | DDoS protection, DNS rápido, cache de assets estáticos. Free tier ilimitado. |
| **Monitoring** | **Sentry + Vercel Analytics** | Observabilidad | Sentry free: 5K errors/mes, performance monitoring. Vercel Analytics: Web Vitals, server timing. |
| **Testing** | **Vitest + Playwright** | QA | Vitest: unit tests rápidos (compatible con Jest API). Playwright: E2E cross-browser. Visual regression para design system. |

Costos de Infraestructura

| **Fase** | **Costo** | **Detalle** |
| --- | --- | --- |
| **Desarrollo** | **\$0/mes** | Supabase Free + Vercel Free + Cloudflare Free + Sentry Free |
| **MVP (1-50 | **\$0/mes** | Los free tiers cubren completamente. |
| users)** |  | Supabase pausa tras 7d inactivo (no pasa con users reales). |
| **Early traction | **\$0-10/mes** | Free tiers aún cubren. Supabase puede |
| (50-200)** |  | necesitar Pro (\$25) si se supera 500MB de DB. |
| **Producción | **\$45/mes** | Supabase Pro (\$25): 8GB DB, backups |
| estable (200+)** |  | diarios, no pausa. Vercel Pro (\$20): 1TB bandwidth. |
| **Escala (500+)** | **\$70-100/mes** | Supabase Pro + compute addons. Vercel Pro + edge middleware. Sentry paid (\$26). |
| **Dominio | **\$10-15/año** | Cloudflare Registrar o Namecheap. SSL |
| alquemist.app** |  | incluido en Vercel. |

Plan de Escape (Anti Lock-in)

Si Supabase se vuelve limitante o cambia pricing, la migración es viable
en 2-3 días porque el core es PostgreSQL estándar:

**Base de datos:** pg_dump → importar en Neon, RDS, o cualquier
PostgreSQL. Drizzle ORM no cambia.

**Auth:** Migrar a Auth.js (NextAuth v5) + \@auth/drizzle-adapter. Tabla
de usuarios exportable.

**Storage:** Migrar a Cloudflare R2 (0 egress fees) o S3. URLs de
archivos se actualizan en DB.

**Realtime:** Reemplazar con Server-Sent Events desde API Routes de
Next.js, o Pusher/Ably free tier.

**Edge Functions:** Mover a Vercel Serverless Functions o API Routes.
Cambiar de Deno a Node (mínimo).

**Frontend:** Next.js + Tailwind no cambian. Solo se actualizan los
imports de \@supabase/\*.

## Arquitectura del Sistema

## Diagrama de Capas

El sistema opera en 5 capas con responsabilidades claras:

| **Capa** | **Tecnología** | **Responsabilidad** |
| --- | --- | --- |
| **1. Presentation | React components + | Lo que el usuario ve y toca. |
| Layer** | Tailwind | Responsive (mobile → desktop). Progressive disclosure por rol. Skeletons, error boundaries, empty states. |
| **2. Application | Next.js App Router | Routing, layouts, middleware |
| Layer** | (Server Components + Client Components) | de auth, Server Actions para mutaciones, API Routes para webhooks. Server Components para data fetching sin bundle client. |
| **3. State & Sync | TanStack Query + | Cache de server state, sync |
| Layer** | Zustand + Dexie.js + Serwist | queue offline, service worker para precache. TanStack Query como puente entre server y client con optimistic updates. |
| **4. Data Access | Drizzle ORM + | Queries type-safe, migrations, |
| Layer** | Supabase Client | RLS policies. Supabase client para auth, realtime subscriptions, storage uploads. |
| **5. Infrastructure | Supabase | Managed services. PostgreSQL |
| Layer** | (PostgreSQL + Auth + Realtime + Storage) + Vercel + Cloudflare | con RLS para multi-tenancy. Vercel CDN + Edge para performance global. |

## Flujo de Datos: Request Lifecycle

Cómo viaja un request desde el usuario hasta la base de datos y de
vuelta:

| **\#** | **Paso** | **Detalle** |
| --- | --- | --- |
| **1** | **Usuario interactúa** | Tap en card de actividad en el dashboard del operador. |
| **2** | **Router client-side** | Next.js App Router navega a /activities/\[id\]/execute. Prefetch del layout ya hecho. |
| **3** | **Server Component carga datos** | El layout de la página ejecuta un Server Component que hace SELECT via Drizzle con RLS (el usuario solo ve datos de su company_id). |
| **4** | **Client Component renderiza** | Los datos pasan como props al Client Component interactivo (formulario de ejecución con checklist, recursos, fotos). |
| **5** | **Usuario completa acción** | El operador llena recursos, completa checklist, toma foto. State local en React Hook Form + Zustand. |
| **6a** | **Online: Server Action** | Si hay conexión: Server Action via 'use server' → Drizzle INSERT en activities, activity_resources, inventory_transactions. Supabase Realtime notifica al supervisor. |
| **6b** | **Offline: Dexie queue** | Si NO hay conexión: la mutación se serializa en IndexedDB via Dexie.js con timestamp. El UI muestra feedback optimista. |
| **7** | **Background sync** | Cuando vuelve la conexión: Serwist dispara sync event. La cola de Dexie se procesa FIFO. Conflictos se resuelven last-write-wins. |
| **8** | **Cache invalidation** | TanStack Query invalida las queries afectadas → refetch automático → UI actualizada. |

Multi-Tenancy con Row Level Security

Supabase RLS permite que la base de datos MISMA enforce el aislamiento
por empresa. Cada tabla con datos de tenant tiene una policy:

ALTER TABLE batches ENABLE ROW LEVEL SECURITY; CREATE POLICY
\"tenant_isolation\" ON batches USING (company_id = (auth.jwt() ->>
'company_id')::uuid);

Esto significa que un SELECT \* FROM batches retorna SOLO los batches de
la empresa del usuario autenticado, sin WHERE clause en el código. El
ORM (Drizzle) no necesita saber de multi-tenancy — RLS lo maneja en la
capa de DB.

**Tablas con RLS:** Todas las que tengan company_id directo o derivado
(via facility → company, o zone → facility → company). Las tablas de
catálogo global (units_of_measure, crop_types compartidos) NO llevan
RLS.

Estrategia Offline-First

El operador en campo es el caso de uso más exigente: Android gama media,
sol directo, guantes, y sin WiFi. La arquitectura offline se diseña para
este worst-case:

| **Mecanismo** | **Implementación** | **Comportamiento** |
| --- | --- | --- |
| **Precache del | Serwist + Workbox | HTML, CSS, JS, fonts, iconos. La app |
| shell** |  | carga instantáneamente siempre, aún sin red. |
| **Runtime cache | Workbox | Respuestas de API se sirven desde cache |
| de API** | stale-while-revalidate | y se actualizan en background. El usuario ve datos inmediatamente. |
| **Store local | Dexie.js (IndexedDB) | Al iniciar sesión: se descargan |
| de datos** |  | actividades del día, batches asignados, catálogos (productos, templates, checklists). Schema tipado con versionamiento. |
| **Cola de | Custom sync queue en | Cada mutación offline se serializa: |
| mutaciones** | Dexie | {id, timestamp, action, payload, status}. FIFO processing al reconectar. |
| **Background | Serwist sync event | Cuando el browser detecta red: dispara |
| sync** |  | evento sync → procesa cola → marca como enviado. |
| **Conflicto | Last-write-wins + server | Si dos dispositivos editan el mismo |
| resolution** | reconcile | recurso offline, el server acepta el último timestamp. Para datos críticos (inventario): el server recalcula desde el log de transacciones. |
| **Fotos | Compresión client-side + | Fotos se comprimen a max 1200px JPEG |
| offline** | Dexie blob | 80% (de \~4MB a \~200KB). Se guardan como blob en IndexedDB. Upload se encola en la sync queue. |
| **Indicador de | Banner permanente | Verde: 'Conectado'. Amarillo: 'Sin |
| estado** |  | conexión --- datos de HH:MM'. Siempre visible. No modal, no intrusivo. |
| **Descarga | Sync al conectar WiFi | Cuando detecta WiFi |
| proactiva** |  | (navigator.connection.type === 'wifi'): descarga datos de las próximas 24h. No consume datos móviles. |

## Estructura del Proyecto

Organización de carpetas siguiendo el patrón de Next.js App Router con
feature-based modules:

| **Archivo / Carpeta** | **Tipo** | **Descripción** |
| --- | --- | --- |
| **alquemist/** |  | Raíz del proyecto |
| ├── app/ |  | Next.js App Router --- routes y layouts |
| │ ├── (auth)/ | Route Group | Login, register, forgot-password (sin layout de app) |
| │ │ ├── login/page.tsx |  |  |
| │ │ └── layout.tsx |  | Layout centrado, sin sidebar/bottombar |
| │ ├── (dashboard)/ | Route Group | App principal con auth middleware |
| │ │ ├── layout.tsx |  | Layout principal: sidebar (desktop) + bottombar (mobile) + topbar |
| │ │ ├── page.tsx |  | Dashboard (redirect por rol) |
| │ │ ├── batches/ | Modul |  |
| │ │ │ ├── page.tsx |  | Lista de batches |
| │ │ │ ├── \[id\]/page.tsx |  | Detalle de batch (tabs: timeline, actividades, inventario, costos, calidad) |
| │ │ │ ├── \[id\]/split/pa | e.tsx | Wizard de split |
| │ │ │ └── |  | Árbol genealógico |
| \[id\]/genealogy/page.tsx |  |  |
| │ │ ├── orders/ | Modul | Órdenes de producción |
| │ │ │ ├── page.tsx |  | Lista / Kanban |
| │ │ │ ├── new/page.tsx |  | Wizard de creación (5 pasos) |
| │ │ │ └── \[id\]/page.tsx |  | Detalle + yield waterfall |
| │ │ ├── activities/ | Modul |  |
| │ │ │ ├── page.tsx |  | Actividades de hoy (timeline) |
| │ │ │ ├── |  | Pantalla de ejecución (4 |
| \[id\]/execute/page.tsx |  | pasos, fullscreen) |
| │ │ │ ├── calendar/page.t | x | Calendario semanal/mensual |
| │ │ │ └── templates/page. | sx | Gestión de templates |
| │ │ ├── inventory/ | Modul |  |
| │ │ │ ├── page.tsx |  | Stock actual (por producto o por zona) |
| │ │ │ ├── transactions/pa | e.tsx | Log de movimientos |
| │ │ │ ├── products/page.t | x | Catálogo de productos |
| │ │ │ ├── recipes/page.ts |  | Recetas / BOM |
| │ │ │ └── receive/page.ts |  | Recepción de compras |
| │ │ ├── areas/ | Modul |  |
| │ │ ├── quality/ | Modul |  |
| │ │ ├── operations/ | Modul | Ambiente, alertas, costos overhead, sensores |
| │ │ └── settings/ | Modul | Configuración: crop types, cultivars, users, company |
| │ ├── api/ |  | API Routes para webhooks e integraciones |
| │ │ ├── webhooks/iot/route | ts | Recibe lecturas de sensores |
| │ │ └── cron/alerts/route. | s | Genera alertas programadas (Vercel Cron) |
| │ └── manifest.ts |  | PWA manifest dinámico |
| ├── components/ |  | Componentes reutilizables |
| │ ├── ui/ | Core U | Button, Card, Input, Badge, Dialog, Sheet, Table, Tabs, Toast\... |
| │ ├── layout/ |  | Sidebar, BottomBar, TopBar, Breadcrumbs, PageHeader |
| │ ├── data/ |  | DataTable, StatCard, DialGauge, ProgressStepper, Timeline |
| │ ├── forms/ |  | ActivityExecutor, OrderWizard, RecipeScaler, BatchSplitter |
| │ └── shared/ |  | RoleBadge, StatusBadge, OfflineBanner, EmptyState, Skeleton |
| ├── lib/ |  | Lógica de negocio y utilidades |
| │ ├── supabase/ |  | client.ts (browser), server.ts (SSR), middleware.ts, admin.ts |
| │ ├── db/ |  | Drizzle schema, queries, migrations |
| │ │ ├── schema/ |  | Un archivo por dominio: batches.ts, inventory.ts, activities.ts\... |
| │ │ ├── queries/ |  | Queries reutilizables: getBatchWithDetails, getStockByProduct\... |
| │ │ └── migrations/ |  | drizzle-kit migrations versionadas |
| │ ├── offline/ |  | dexie-schema.ts, sync-queue.ts, conflict-resolver.ts |
| │ ├── auth/ |  | middleware.ts, roles.ts, permissions.ts |
| │ ├── hooks/ |  | useBatch, useActivities, useInventory, useOfflineStatus\... |
| │ ├── utils/ |  | formatters, yield-calculator, cost-allocator, date-helpers |
| │ └── validations/ |  | Zod schemas compartidos: batch.schema.ts, activity.schema.ts\... |
| ├── public/ |  | Assets estáticos |
| │ ├── icons/ |  | PWA icons (192, 512), favicon, apple-touch-icon |
| │ └── fonts/ |  | DM Sans, DM Mono (woff2) para offline |
| ├── styles/ |  | globals.css con CSS variables del design system |
| ├── drizzle.config.ts |  | Configuración de Drizzle Kit |
| ├── next.config.ts |  | Next.js config con Serwist plugin |
| ├── tailwind.config.ts |  | Brand colors, fonts, custom spacing |
| ├── middleware.ts |  | Auth middleware: protege routes, inject company_id |
| **└── .env.local** |  | SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY |

## Configuraciones Clave

Supabase: Estructura de Buckets (Storage)

| **Bucket** | **Acceso** | **Contenido** |
| --- | --- | --- |
| **activity-photos** | **Privado** | Fotos tomadas durante ejecución de actividades. Acceso via signed URLs. Max 5MB/foto. Naming: {batch_id}/{activity_id}/{timestamp}.jpg |
| **quality-certificates** | **Privado** | PDFs de certificados de laboratorio. Acceso solo para supervisor+. Naming: {test_id}/{lab_reference}.pdf |
| **attachments** | **Privado** | Adjuntos genéricos vinculados a cualquier entidad. Naming: {entity_type}/{entity_id}/{filename} |
| **company-assets** | **Privado** | Logos, documentos regulatorios. Acceso admin only. Naming: {company_id}/{type}/{filename} |

Supabase: Auth — Claims y Roles

Los roles se almacenan en auth.users.raw_app_meta_data como claims JWT.
Esto permite que el middleware de Next.js y las RLS policies de
PostgreSQL lean el rol sin query adicional:

```typescript
// En el JWT del usuario: { \"sub\": \"uuid-del-user\",
\"app_metadata\": { \"company_id\": \"uuid-de-la-empresa\", \"role\":
\"operator\", \"facility_id\": \"uuid-de-facility\" } }
```

El middleware de Next.js lee estos claims y decide: qué routes son
accesibles, qué módulos del sidebar/bottombar mostrar, y qué acciones
habilitar en la UI.

Supabase Realtime: Canales

| **Canal** | **Evento** | **Consumidores** | **Trigger** |
| --- | --- | --- | --- |
| **alerts:{company_id}** | Nuevas alertas del sistema | Dashboard, centro de alertas | INSERT en alerts WHERE company_id |
| **env:{zone_id}** | Lecturas de sensores en tiempo real | Panel ambiental, zona detalle | INSERT en environmental_readings WHERE zone_id |
| **activities:{user_id}** | Actividades asignadas/reprogramadas | Dashboard operador | UPDATE en scheduled_activities WHERE assigned_to |
| **batches:{company_id}** | Cambios de fase, splits, completions | Lista de batches, dashboard supervisor | UPDATE en batches WHERE company_id |

Vercel: Configuración de Deploy

**Framework preset:** Next.js (auto-detectado). **Build command:** next
build. **Output:** .next (standalone). **Node:** 20.x.

**Environment variables en Vercel:**

| **Variable** | **Descripción** | **Public** |
| --- | --- | --- |
| **NEXT_PUBLIC_SUPABASE_URL** | URL del proyecto Supabase | **Sí (public)** |
| **NEXT_PUBLIC_SUPABASE_ANON_KEY** | Anon key (safe para client, RLS protege datos) | **Sí (public)** |
| **SUPABASE_SERVICE_ROLE_KEY** | Service key para server-side admin operations | **No (solo server)** |
| **SENTRY_DSN** | URL de Sentry para error tracking | **Sí (public)** |
| **CRON_SECRET** | Secret para proteger Vercel Cron endpoints | **No (solo server)** |

## Roadmap de Implementación

Plan de 20 semanas dividido en 5 fases. Cada fase produce un entregable
funcional. Las fases son secuenciales pero los módulos dentro de cada
fase pueden paralelizarse.

Fase 0: Fundación

### **Semanas 1-2**

| **Entregable** | **Alcance** | **Criterio de Completitud** |
| --- | --- | --- |
| **Setup del | Next.js + Tailwind + | *App vacía live en |
| proyecto** | Supabase project + Vercel deploy | vercel.app* |
| **Design system** | Configurar brand colors, tipografía, componentes base UI (Button, Card, Input, Badge, Dialog, Table, Toast) | *Storybook o page /design-system con todos los componentes* |
| **Schema de base de | SQL completo de las 43 | *DB poblada con seed |
| datos** | tablas en Supabase. Drizzle schema generado con drizzle-kit pull. RLS policies básicas. | data de ejemplo* |
| **Auth + | Supabase Auth configurado. | *Puede loguear, |
| middleware** | Middleware de Next.js que protege routes por rol. Login/logout funcional. | navegar según rol, y logout* |
| **Layout | Sidebar (desktop), BottomBar | *Navegación completa |
| principal** | (mobile), TopBar, Breadcrumbs. Responsive. Navegación entre módulos vacíos. | funcionando responsive* |
| **PWA básico** | Serwist configurado. manifest.json. Service worker con precache del shell. Installable en Android/iOS. | *App instalable como PWA* |

Fase 1: Core Loop (Producción)

### **Semanas 3-7**

| **Entregable** | **Alcance** | **Criterio de Completitud** |
| --- | --- | --- |
| **Módulo: | crop_types, | *Admin puede |
| Configuración | production_phases, | configurar tipos de |
| base** | phase_product_flows, cultivars. CRUD completo para admin. | cultivo con fases* |
| **Módulo: Órdenes** | Crear orden (wizard 5 pasos), listar, detalle con yield waterfall, aprobar. Cálculo de yield en cascada. | *Gerente crea orden y ve yield esperado* |
| **Módulo: Batches** | Crear batch desde orden aprobada, listar con filtros, detalle con tabs (timeline, costos), phase stepper. | *Batch se crea al aprobar orden y avanza de fase* |
| **Módulo: | activity_templates, | *Operador ve sus |
| Actividades | scheduled_activities, | actividades del día* |
| (base)** | activities. Programar actividades desde cultivation_schedule. Lista de hoy para operador. |  |
| **Ejecutar | Pantalla de ejecución: | *Operador completa |
| actividad** | recursos escalados, checklist, observaciones, confirmar. Genera inventory_transactions. | actividad y el inventario se actualiza* |

Fase 2: Inventario y Calidad

### **Semanas 8-11**

| **Entregable** | **Alcance** | **Criterio de Completitud** |
| --- | --- | --- |
| **Módulo: Inventario** | Stock actual, catálogo de productos, recepción de compras, movimientos. Transacciones inmutables. | *Stock en tiempo real con historial de movimientos* |
| **Recetas / BOM** | Crear receta, escalar, ejecutar. Genera transacciones de consumo automáticas. | *Preparar solución nutritiva con escalado automático* |
| **Transformaciones** | Cosecha multi-output via phase_product_flows. transformation_out/in. Waste tracking. | *Cosecha genera flor húmeda + trim + waste automáticamente* |
| **Módulo: Calidad** | Crear test, registrar resultados con thresholds, historial. Pass/fail automático. | *Registrar análisis de lab con auto-aprobación* |
| **Batch split/merge** | Wizard de split, batch_lineage, genealogía visual. | *Supervisor separa plantas problemáticas manteniendo trazabilidad* |

Fase 3: Operaciones y Offline

### **Semanas 12-16**

| **Entregable** | **Alcance** | **Criterio de Completitud** |
| --- | --- | --- |
| **Módulo: Áreas** | Mapa de facility, zonas con clima actual, estructuras, posiciones, ocupación. | *Vista espacial de la operación con batches por zona* |
| **Módulo: | Sensores, lecturas | *Dashboard ambiental |
| Operaciones** | ambientales, panel de monitoreo real-time, comparación vs óptimo. | con dials por zona* |
| **Alertas** | Generación automática (overdue, env_out_of_range, low_stock, quality_failed). Centro de alertas. Push notifications. | *Sistema proactivo de alertas con notificaciones* |
| **Overhead costs** | Registro de costos indirectos, asignación a batches por base. COGS completo. | *Costeo real incluyendo energía, renta, depreciación* |
| **Offline | Dexie schema, sync queue, | *Operador completa |
| completo** | background sync, conflict resolution, foto compression, optimistic UI. | jornada sin internet y sincroniza* |
| **Supabase | Canales por | *Supervisor ve cambios |
| Realtime** | company/zone/user. Alertas live, sync entre tabs, notificaciones. | en tiempo real sin refresh* |

Fase 4: Polish y Lanzamiento

### **Semanas 17-20**

| **Entregable** | **Alcance** | **Criterio de Completitud** |
| --- | --- | --- |
| **Dashboards** | Dashboard por rol: operador (actividades), supervisor (zonas + equipo), gerente (KPIs + órdenes), viewer (read-only). | *Cada rol ve su dashboard optimizado* |
| **Búsqueda global** | Cmd+K search: batches, productos, órdenes, zonas, usuarios. Resultados agrupados. | *Buscar cualquier cosa desde cualquier pantalla* |
| **Usuarios y | CRUD de usuarios, | *Admin gestiona equipo |
| permisos** | invitaciones por email, permisos granulares. | con roles y permisos* |
| **Performance** | Lighthouse audit. Code splitting, lazy loading, virtual scrolling, image optimization. Target: TTI \< 3s en 3G. | *Score Lighthouse \> 90 en mobile* |
| **Testing** | Unit tests para lógica de negocio (yield calc, cost allocation). E2E para flujos críticos (crear orden → ejecutar actividad → ver inventario). | *CI/CD con tests automáticos en cada PR* |
| **Documentación** | README, onboarding guide, API docs (si aplica), runbook de operaciones. | *Cualquier dev puede levantar el proyecto en \< 30min* |

## Setup Día 1

Guía paso a paso para tener la PWA live en producción con auth, DB y
deploy automático en \~80 minutos.

| **Paso** | **Tiempo** | **Comando / Acción** |
| --- | --- | --- |
| **1. Crear proyecto | **2 min** | npx create-next-app@latest alquemist |
| Next.js** |  | \--typescript \--tailwind \--app \--src-dir \--import-alias '@/\*' |
| **2. Crear proyecto | **3 min** | supabase.com → New Project → Region: South |
| Supabase** |  | America (São Paulo). Copiar URL + anon key + service role key. |
| **3. Instalar | **2 min** | npm i \@supabase/supabase-js |
| dependencias** |  | \@supabase/ssr drizzle-orm drizzle-kit zustand \@tanstack/react-query react-hook-form zod lucide-react recharts dexie |
| **4. Configurar | **5 min** | Configurar brand colors, fonts y spacing |
| Tailwind** |  | custom en tailwind.config.ts. Crear CSS variables en globals.css. |
| **5. Variables de | **1 min** | Crear .env.local con |
| entorno** |  | NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY. |
| **6. Supabase client | **10 min** | Crear lib/supabase/client.ts (browser), |
| helpers** |  | server.ts (SSR con cookies), middleware.ts (para auth en middleware de Next.js). |
| **7. Auth middleware** | **10 min** | middleware.ts en raíz: verificar sesión, redirect a /login si no auth, inyectar company_id en headers. |
| **8. Schema SQL** | **20 min** | Ejecutar SQL de las 43 tablas en Supabase SQL Editor. Habilitar RLS. Crear policies básicas. |
| **9. Drizzle schema** | **5 min** | drizzle-kit pull → genera schema TypeScript desde DB existente. Configurar drizzle.config.ts. |
| **10. Layout | **15 min** | Crear layout.tsx con Sidebar/BottomBar |
| principal** |  | responsive. Drawer/Sheet para mobile menu. |
| **11. PWA con | **10 min** | npm i \@serwist/next. Configurar |
| Serwist** |  | next.config.ts con withSerwist. Crear manifest.ts y service worker. |
| **12. Deploy en | **5 min** | Conectar repo GitHub → Vercel auto-detecta |
| Vercel** |  | Next.js → configurar env vars → Deploy. Live en alquemist.vercel.app. |
| **13. Dominio | **5 min** | Comprar dominio → configurar DNS en |
| (opcional)** |  | Cloudflare → agregar custom domain en Vercel. |
| **14. Seed data** | **5 min** | SQL con datos de ejemplo: 2 crop_types (cannabis, arándano), 3 cultivars, 7 fases, 10 productos, 2 zonas, 1 batch. |

Tailwind Config: Brand Colors

// tailwind.config.ts module.exports = { theme: { extend: { colors: {
brand: { DEFAULT: '#005E42', light: '#ECF7A3', dark: '#003D2B',
surface: '#F7F8F2', }, surface: '#F7F8F2', border: '#D4DDD6', },
fontFamily: { sans: ['DM Sans', 'system-ui', 'sans-serif'],
mono: ['DM Mono', 'monospace'], }, borderRadius: { card: '16px',
button: '12px', }, }, }, };

## Resultado del Día 1

Al finalizar el setup (\~80 minutos) tienes: PWA instalable live en
producción con auth funcional (login/logout), DB con las 43 tablas y
RLS, layout responsive con sidebar/bottombar, navegación entre módulos
vacíos, service worker cacheando el shell, y deploy automático con cada
git push. A partir de aquí, cada feature que construyas está live en
minutos.
