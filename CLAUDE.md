# Alquemist — Instrucciones para Claude Code

## Proyecto

PWA de gestión agrícola integral: offline-first, multi-tenant, 5 roles, 43 tablas, 48 pantallas.

**Stack**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, Supabase (PostgreSQL + Auth + Realtime + Storage), Drizzle ORM, Dexie.js, Zustand, TanStack Query v5, React Hook Form + Zod, Serwist (PWA), Lucide icons, Recharts
**Hosting**: Vercel | **Testing**: Vitest + Playwright | **Monitoreo**: Sentry

## Documentación de referencia

Consultar estos documentos **antes** de tomar decisiones de arquitectura o implementación:

| Documento | Contenido |
|---|---|
| `docs/alquemist-proyecto.md` | Arquitectura, stack, estructura del proyecto, roadmap 20 semanas, setup día 1 |
| `docs/alquemist-features.md` | RLS policies, Zod schemas, Dexie offline schema, sync queue, features por módulo, API routes, convenciones de código |
| `docs/alquemist-pwa-reqs.md` | Roles y permisos, design system, 48 pantallas, catálogo de componentes, navegación, accesibilidad, performance |
| `docs/alquemist-modelo-definitivo.md` | 43 tablas en 8 dominios, relaciones cross-domain, diccionario de campos, flujos operativos |

## Sistema de desarrollo — Plan-First

**Regla central: toda tarea comienza con un plan. Sin excepción.**

```
1. Entender → 2. Planificar → 3. Ejecutar (con skills) → 4. Verificar
```

### Matriz de skills por tipo de tarea

| Tarea | Flujo de skills |
|---|---|
| Feature nueva (idea o descripción) | `/product-owner` → implementar |
| Feature con stories existentes | Implementar directamente |
| Descomponer requisitos en historias | `/product-owner` |
| Código React / Next.js | Aplicar `vercel-react-best-practices` |
| Código de base de datos (queries, schema, RLS) | Aplicar `supabase-postgres-best-practices` |
| Bug fix | Plan → diagnóstico → fix → verificar |
| Crear nueva skill o capacidad | `/skill-creator` |

### Regla de best practices

Las skills `vercel-react-best-practices` y `supabase-postgres-best-practices` se aplican **siempre** que se escriba o revise código en su dominio — no solo cuando se invoquen explícitamente.

## Estructura del proyecto

```
src/
├── app/              → Rutas, layouts, pages (App Router)
├── components/
│   ├── ui/           → Componentes base reutilizables
│   └── [module]/     → Componentes específicos por módulo
├── lib/
│   ├── schemas/      → Zod schemas (compartidos client/server)
│   ├── actions/      → Server Actions
│   ├── db/           → Drizzle schema, queries, migrations
│   ├── offline/      → Dexie schemas, sync queue
│   └── utils/        → Utilidades compartidas
├── hooks/            → Custom React hooks
├── stores/           → Zustand stores
├── types/            → TypeScript types e interfaces
└── styles/           → Estilos globales

docs/
├── *.md              → Documentación fuente del proyecto
└── backlog/          → Feature docs y BACKLOG.md (vía /product-owner)

public/               → Assets estáticos, PWA manifest, icons
```

## Convenciones de código

- **Archivos**: `kebab-case.ts` / `kebab-case.tsx`
- **Funciones / variables**: `camelCase`
- **Componentes React**: `PascalCase`
- **Tablas / columnas DB**: `snake_case`
- **Path alias**: `@/*` → `./src/*`
- **Mutaciones**: Server Actions (nunca API routes para mutaciones internas)
- **Validación**: Zod schemas compartidos entre client y server
- **Formularios**: React Hook Form + Zod resolver
- **Errores**: Clase `AppError` con código, mensaje y contexto
- **Updates optimistas**: TanStack Query `onMutate` / `onError` / `onSettled`
- **Estado**: Zustand (UI local) + TanStack Query (server state) + Dexie (offline)

## Design system

- **Colores**: `#005E42` primary (Cinnabar Green), `#ECF7A3` accent (Green Pea Lime), `#F7F8F2` surface
- **Fonts**: DM Sans (headings y body, Bold 800 para títulos), DM Mono (datos numéricos)
- **Icons**: Lucide (outlined, 1.5px stroke, 20px en navegación)
- **Spacing**: base 4px
- **Enfoque**: Mobile-first, responsive (sm / md / lg / xl)
- **Componentes**: Seguir el catálogo definido en `docs/alquemist-pwa-reqs.md`

## Git workflow

### Commits — Conventional Commits

Formato: `tipo(alcance): descripción breve`

**Tipos**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
**Alcance**: nombre del módulo — `ordenes`, `batches`, `inventario`, `calidad`, `actividades`, `areas`, `operaciones`, `config`, `auth`, `core`, `ui`

Ejemplos:
```
feat(batches): agregar avance de fase con validación de yield
fix(sync): corregir retry en cola de sincronización offline
docs(prd): documentar módulo de inventario
refactor(ui): extraer componente StatCard reutilizable
```

### Branches

Formato: `tipo/descripción-corta`

Ejemplos: `feat/batch-phase-advance`, `fix/sync-queue-retry`, `docs/prd-inventory`

### Pull Requests

- Título descriptivo (< 70 caracteres)
- Resumen de cambios en el body
- Checklist de verificación (lint, build, tests si aplican)

## Verificación

Ejecutar **antes** de considerar cualquier tarea completa:

```bash
npm run lint        # ESLint — cero errores
npm run build       # Build de producción — cero errores
```

Cuando aplique:
```bash
npm run dev         # Verificación visual en el navegador
npm test            # Tests unitarios e integración (cuando se configuren)
```
