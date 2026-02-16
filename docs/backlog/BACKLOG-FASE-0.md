# Product Backlog -- Fase 0: Fundacion

> Last updated: 2026-02-16

## Resumen de Fase

**Fase 0** establece los cimientos tecnicos del proyecto Alquemist: proyecto configurado, design system, base de datos con 43 tablas y RLS, autenticacion con 5 roles, layout responsive con navegacion completa, y PWA instalable. Al completar esta fase, la aplicacion esta live en produccion con auth funcional, DB poblada, y deploy automatico.

**Semanas:** 1-2
**Dependencias cross-fase:** Ninguna (esta es la fase base)

## Summary
- **Total features**: 7
- **Total stories**: 37
- **Planned**: 6 | **In Progress**: 5 | **Done**: 26

## Features

| ID | Feature | Stories | Priority | Status | Doc |
|----|---------|---------|----------|--------|-----|
| F-001 | Setup del proyecto y deploy | 5 | P0 - Critical | Done | [F-001](./done/F-001-project-setup.md) |
| F-002 | Design system (componentes base UI) | 9 | P0 - Critical | Done | [F-002](./done/F-002-design-system.md) |
| F-003 | Schema de base de datos | 8 | P0 - Critical | Done | [F-003](./done/F-003-database-schema.md) |
| F-004 | Autenticacion y middleware de roles | 4 | P0 - Critical | Done | [F-004](./done/F-004-auth-middleware.md) |
| F-005 | Layout principal responsive | 5 | P0 - Critical | In Progress | [F-005](./in-progress/F-005-main-layout.md) |
| F-006 | PWA basica | 4 | P0 - Critical | Planned | [F-006](./planned/F-006-pwa-basic.md) |
| F-007 | Provisioning basico de usuarios | 3 | P0 - Critical | Planned | [F-007](./planned/F-007-basic-user-provisioning.md) |

## Indice de Stories

### F-001: Setup del proyecto y deploy

| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-001-001 | Crear proyecto Next.js 14 con TypeScript y Tailwind | S | P0 |
| US-001-002 | Instalar y configurar dependencias core del proyecto | S | P0 |
| US-001-003 | Configurar Supabase project y variables de entorno | S | P0 |
| US-001-004 | Configurar Tailwind con brand tokens y tipografia | M | P0 |
| US-001-005 | Deploy en Vercel con CI/CD automatico | S | P0 |

### F-002: Design system (componentes base UI)

| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-002-001 | Componente Button (primary, secondary, ghost) | S | P0 |
| US-002-002 | Componente Card y Stat Card | S | P0 |
| US-002-003 | Componente Input Field y Toggle | M | P0 |
| US-002-004 | Componente Badge y Status Badge | S | P1 |
| US-002-005 | Componente Dialog y Bottom Sheet | M | P1 |
| US-002-006 | Componente Table (responsive) | M | P1 |
| US-002-007 | Componente Toast / Snackbar | S | P1 |
| US-002-008 | Componentes Progress Bar, Skeleton y Empty State | M | P1 |
| US-002-009 | Pagina /design-system con catalogo visual | S | P0 |

### F-003: Schema de base de datos

| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-003-001 | Crear helper functions de auth para RLS | S | P0 |
| US-003-002 | SQL de tablas del dominio Sistema y Produccion | M | P0 |
| US-003-003 | SQL de tablas del dominio Areas e Inventario | M | P0 |
| US-003-004 | SQL de tablas del dominio Actividades | L | P0 |
| US-003-005 | SQL de tablas de Nexo, Ordenes, Calidad y Operaciones | M | P0 |
| US-003-006 | Configurar RLS policies tipo A, B, C y D | L | P0 |
| US-003-007 | Generar Drizzle schema y configurar drizzle-kit | M | P0 |
| US-003-008 | Seed data de ejemplo | M | P1 |

### F-004: Autenticacion y middleware de roles

| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-004-001 | Pantalla de login con Supabase Auth | M | P0 |
| US-004-002 | Middleware de Next.js para proteccion de rutas | M | P0 |
| US-004-003 | Sistema de permisos por rol en el frontend | M | P0 |
| US-004-004 | Logout y manejo de sesion expirada | S | P0 |

### F-005: Layout principal responsive

| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-005-001 | Sidebar desktop (collapsed y expanded) | M | P0 |
| US-005-002 | Bottom Tab Bar mobile con configuracion por rol | M | P0 |
| US-005-003 | Top Bar con breadcrumbs, busqueda y avatar | M | P1 |
| US-005-004 | Menu "Mas" con modulos restantes y opciones | S | P1 |
| US-005-005 | Paginas de modulos vacios con navegacion funcional | M | P0 |

### F-006: PWA basica

| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-006-001 | Configurar Serwist y service worker con precache | M | P0 |
| US-006-002 | Manifest PWA dinamico con branding Alquemist | S | P0 |
| US-006-003 | App instalable en Android e iOS | S | P0 |
| US-006-004 | Indicador permanente de estado de conexion | M | P1 |

### F-007: Provisioning basico de usuarios

| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-007-001 | Supabase Admin client helper | S | P0 |
| US-007-002 | Server Action createUser | S | P0 |
| US-007-003 | Pagina minima de creacion de usuario | S | P0 |

## Orden de Implementacion Sugerido

Las features pueden trabajarse en paralelo pero existen dependencias internas:

```
Semana 1:
  F-001 (setup) ──────────┬──► F-002 (design system) ──────────────┐
                           ├──► F-003 (database schema)             │
                           └──► F-006 (PWA - manifest, SW config)   │
                                                                     │
Semana 2:                                                            │
  F-004 (auth + middleware) ◄── F-001, F-003                        │
  F-005 (layout principal) ◄── F-002, F-004 ◄───────────────────────┘
  F-006 (PWA - instalable, offline banner) ◄── F-005
  F-007 (user provisioning) ◄── F-004
```

**Camino critico:** F-001 -> F-003 (RLS + seed) -> F-004 (auth) -> F-005 (layout) -> F-006 (PWA completa)

## Criterio de Completitud de Fase

La Fase 0 se considera completa cuando:

- [ ] App live en `*.vercel.app` con CI/CD automatico (F-001)
- [ ] Pagina `/design-system` con todos los componentes renderizados (F-002)
- [ ] DB con 43 tablas, RLS funcional, Drizzle schema tipado, seed data (F-003)
- [ ] Login funcional, navegacion segun rol, logout (F-004)
- [ ] Navegacion completa responsive entre modulos (F-005)
- [ ] App instalable como PWA, funciona sin conexion (shell vacio) (F-006)
- [ ] `npm run lint` con cero errores
- [ ] `npm run build` con cero errores

## Priority Definitions

| Priority | Label | Description |
|----------|-------|-------------|
| P0 | Critical | Must-have para completar la Fase 0 / bloqueante para Fase 1 |
| P1 | High | Funcionalidad core, necesaria pronto pero no bloqueante |
| P2 | Medium | Importante pero no bloquea avance |
| P3 | Low | Nice-to-have, consideracion futura |

## Status Definitions

| Status | Description |
|--------|-------------|
| Planned | Definida y lista para desarrollo |
| In Progress | Actualmente siendo implementada |
| Done | Completada y verificada |
| Deferred | Pospuesta a una iteracion futura |
