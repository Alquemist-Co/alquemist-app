# F-001: Setup del Proyecto y Deploy

## Overview

Configuracion inicial del proyecto Alquemist: creacion del proyecto Next.js 14 con TypeScript y Tailwind CSS, conexion con Supabase, configuracion de variables de entorno, y deploy automatico en Vercel con CI/CD. Este feature establece la base tecnica sobre la que se construira toda la aplicacion.

## User Personas

- **Admin**: Necesita que el proyecto este disponible en produccion para iniciar la configuracion del sistema.
- **Gerente**: Se beneficia de tener una URL publica donde verificar el avance del desarrollo.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-001-001 | Crear proyecto Next.js 14 con TypeScript y Tailwind | S | P0 | Planned |
| US-001-002 | Instalar y configurar dependencias core del proyecto | S | P0 | Planned |
| US-001-003 | Configurar Supabase project y variables de entorno | S | P0 | Planned |
| US-001-004 | Configurar Tailwind con brand tokens y tipografia | M | P0 | Planned |
| US-001-005 | Deploy en Vercel con CI/CD automatico | S | P0 | Planned |

---

# US-001-001: Crear proyecto Next.js 14 con TypeScript y Tailwind

## User Story

**As a** admin,
**I want** que el proyecto Next.js 14 este creado con TypeScript, Tailwind CSS, App Router y estructura de carpetas definida,
**So that** el equipo de desarrollo tenga una base solida y estandarizada para construir la aplicacion.

## Acceptance Criteria

### Scenario 1: Proyecto creado correctamente
- **Given** que no existe el proyecto Next.js
- **When** se ejecuta la creacion del proyecto con las opciones `--typescript --tailwind --app --src-dir --import-alias '@/*'`
- **Then** el proyecto se crea con App Router habilitado, TypeScript configurado, Tailwind CSS integrado, alias `@/*` apuntando a `./src/*`, y la estructura base `src/app/` existe

### Scenario 2: Estructura de carpetas inicial
- **Given** que el proyecto Next.js esta creado
- **When** se verifica la estructura del directorio `src/`
- **Then** existen las carpetas: `src/app/`, `src/components/`, `src/lib/`, `src/hooks/`, `src/stores/`, `src/types/`, `src/styles/` y el archivo `src/app/layout.tsx` renderiza sin errores

### Scenario 3: Dev server arranca sin errores
- **Given** que el proyecto esta creado con todas las opciones
- **When** se ejecuta `npm run dev`
- **Then** el servidor de desarrollo arranca en menos de 30 segundos, la pagina principal responde con HTTP 200 en `localhost:3000`, y no hay errores de TypeScript en la consola

## Definition of Done
- [ ] Proyecto creado con Next.js 14+ App Router
- [ ] TypeScript configurado con strict mode
- [ ] Tailwind CSS integrado
- [ ] Alias `@/*` funcional
- [ ] Estructura de carpetas creada segun docs/alquemist-proyecto.md
- [ ] `npm run dev` arranca sin errores
- [ ] `npm run build` completa sin errores

## Technical Notes
- Usar `npx create-next-app@latest` con las flags especificadas en docs/alquemist-proyecto.md seccion "Setup Dia 1" paso 1
- Crear las carpetas vacias con archivos `.gitkeep` donde aplique: `src/components/ui/`, `src/components/layout/`, `src/lib/supabase/`, `src/lib/db/`, `src/lib/offline/`, `src/lib/auth/`, `src/lib/validations/`, `src/lib/utils/`, `src/hooks/`, `src/stores/`, `src/types/`
- Configurar `tsconfig.json` con `strict: true` y path alias `@/*`

## Dependencies
- Ninguna (es la primera story del proyecto)

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-001-002: Instalar y configurar dependencias core del proyecto

## User Story

**As a** admin,
**I want** que todas las dependencias core del stack esten instaladas y configuradas,
**So that** el proyecto tenga las herramientas necesarias para desarrollar todas las funcionalidades planificadas.

## Acceptance Criteria

### Scenario 1: Dependencias instaladas correctamente
- **Given** que el proyecto Next.js esta creado
- **When** se instalan las dependencias: `@supabase/supabase-js`, `@supabase/ssr`, `drizzle-orm`, `drizzle-kit`, `zustand`, `@tanstack/react-query`, `react-hook-form`, `zod`, `lucide-react`, `recharts`, `dexie`
- **Then** todas las dependencias aparecen en `package.json`, `npm install` completa sin errores de peer dependencies, y `npm run build` completa exitosamente

### Scenario 2: Dependencias de desarrollo configuradas
- **Given** que las dependencias de produccion estan instaladas
- **When** se verifican las devDependencies
- **Then** estan instalados `drizzle-kit`, ESLint esta configurado con reglas de Next.js y TypeScript, y `npm run lint` ejecuta sin errores criticos

### Scenario 3: Conflicto de versiones
- **Given** que se instalan todas las dependencias
- **When** una dependencia tiene conflicto de version con otra
- **Then** el conflicto se resuelve usando versiones compatibles documentadas, no se usan flags `--legacy-peer-deps` ni `--force`, y las versiones quedan fijadas en `package.json`

## Definition of Done
- [ ] Todas las dependencias de produccion instaladas
- [ ] Todas las dependencias de desarrollo instaladas
- [ ] Cero errores de peer dependencies
- [ ] `npm run build` exitoso
- [ ] `npm run lint` sin errores

## Technical Notes
- Lista completa de dependencias en docs/alquemist-proyecto.md seccion "Setup Dia 1" paso 3
- Configurar ESLint con `eslint-config-next` y reglas de TypeScript
- Asegurar que `drizzle-kit` se instale como devDependency
- Verificar compatibilidad de `@tanstack/react-query` v5 con Next.js 14

## Dependencies
- US-001-001 (proyecto creado)

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-001-003: Configurar Supabase project y variables de entorno

## User Story

**As a** admin,
**I want** que el proyecto Supabase este creado y conectado al proyecto Next.js mediante variables de entorno,
**So that** la aplicacion pueda autenticarse y comunicarse con la base de datos PostgreSQL en la nube.

## Acceptance Criteria

### Scenario 1: Proyecto Supabase creado y conectado
- **Given** que se ha creado un proyecto en supabase.com en la region South America (Sao Paulo)
- **When** se configuran las variables de entorno en `.env.local`
- **Then** el archivo `.env.local` contiene `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`, y el archivo esta en `.gitignore`

### Scenario 2: Supabase client helpers creados
- **Given** que las variables de entorno estan configuradas
- **When** se crean los helpers de Supabase
- **Then** existen los archivos `src/lib/supabase/client.ts` (browser), `src/lib/supabase/server.ts` (SSR con cookies), y `src/lib/supabase/middleware.ts`, cada uno exporta una funcion `createClient` que retorna un cliente Supabase tipado

### Scenario 3: Variable de entorno faltante
- **Given** que el proyecto esta configurado
- **When** falta alguna variable de entorno requerida (por ejemplo `NEXT_PUBLIC_SUPABASE_URL`)
- **Then** la aplicacion muestra un error claro al iniciar indicando que variable falta, en lugar de fallar silenciosamente en runtime

## Definition of Done
- [ ] Proyecto Supabase creado en region South America
- [ ] Variables de entorno configuradas en `.env.local`
- [ ] `.env.local` incluido en `.gitignore`
- [ ] Archivo `.env.example` creado con las claves sin valores
- [ ] Supabase client helpers creados y tipados
- [ ] Conexion verificada con un health check basico
- [ ] Build exitoso

## Technical Notes
- Seguir docs/alquemist-proyecto.md seccion "Setup Dia 1" pasos 2, 5 y 6
- `client.ts` usa `createBrowserClient` de `@supabase/ssr`
- `server.ts` usa `createServerClient` de `@supabase/ssr` con cookies de Next.js
- `middleware.ts` se usa dentro del middleware de Next.js para refrescar tokens
- Pantallas de referencia: N/A (infraestructura)

## Dependencies
- US-001-001 (proyecto creado)
- US-001-002 (dependencias instaladas)

## Estimation
- **Size**: S
- **Complexity**: Medium

---

# US-001-004: Configurar Tailwind con brand tokens y tipografia

## User Story

**As a** admin,
**I want** que Tailwind CSS este configurado con los colores de marca, tipografia DM Sans/DM Mono y spacing del design system de Alquemist,
**So that** todos los componentes se construyan con tokens consistentes desde el inicio.

## Acceptance Criteria

### Scenario 1: Brand colors configurados
- **Given** que Tailwind CSS esta instalado
- **When** se configura `tailwind.config.ts` con los brand tokens
- **Then** estan disponibles las clases: `bg-brand` (#005E42), `bg-brand-light` (#ECF7A3), `bg-brand-dark` (#003D2B), `bg-surface` (#F7F8F2), `border-border` (#D4DDD6), y los colores semanticos `text-success` (#059669), `text-warning` (#D97706), `text-error` (#DC2626), `text-info` (#0891B2)

### Scenario 2: Tipografia DM Sans y DM Mono configurada
- **Given** que las fuentes DM Sans y DM Mono estan instaladas via `next/font`
- **When** se renderizan textos con las clases `font-sans` y `font-mono`
- **Then** `font-sans` aplica DM Sans con fallback a system-ui, `font-mono` aplica DM Mono con fallback a monospace, y las fuentes se cargan como variable-weight self-hosted para funcionar offline

### Scenario 3: CSS variables y globals configurados
- **Given** que los brand tokens estan definidos
- **When** se revisa `src/styles/globals.css`
- **Then** contiene las CSS variables del design system, `border-radius: card` (16px) y `button` (12px) estan configurados, el spacing base de 4px esta establecido, y `npm run build` compila sin errores de Tailwind

## Definition of Done
- [ ] `tailwind.config.ts` con brand colors, fonts y border-radius
- [ ] `globals.css` con CSS variables del design system
- [ ] DM Sans y DM Mono configuradas via `next/font`
- [ ] Fuentes self-hosted en `public/fonts/` para offline
- [ ] Colores semanticos (success, warning, error, info) configurados
- [ ] Build exitoso con los tokens
- [ ] Los tokens corresponden exactamente a docs/alquemist-pwa-reqs.md seccion "Design System"

## Technical Notes
- Configuracion de referencia en docs/alquemist-proyecto.md seccion "Tailwind Config: Brand Colors"
- Tokens de color completos en docs/alquemist-pwa-reqs.md seccion "Paleta de Colores"
- Tipografia detallada en docs/alquemist-pwa-reqs.md seccion "Tipografia"
- Usar `next/font/google` para DM Sans y DM Mono con subsets optimizados
- Configurar breakpoints responsive: sm (0-639px), md (640-1023px), lg (1024-1279px), xl (1280+)

## Dependencies
- US-001-001 (proyecto creado)
- US-001-002 (dependencias instaladas)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-001-005: Deploy en Vercel con CI/CD automatico

## User Story

**As a** admin,
**I want** que el proyecto este deployado en Vercel con CI/CD automatico vinculado al repositorio GitHub,
**So that** cada push a la rama principal genere un deploy de produccion y cada PR genere un preview deploy.

## Acceptance Criteria

### Scenario 1: Deploy inicial exitoso
- **Given** que el repositorio esta en GitHub y Vercel esta conectado
- **When** se realiza el deploy inicial
- **Then** la aplicacion esta accesible en una URL `*.vercel.app`, responde con HTTP 200, muestra la pagina principal sin errores, y las variables de entorno de Supabase estan configuradas en Vercel

### Scenario 2: CI/CD automatico funcional
- **Given** que Vercel esta vinculado al repositorio GitHub
- **When** se hace push a la rama `main`
- **Then** Vercel detecta el push automaticamente, ejecuta el build, y si el build es exitoso el deploy se publica en produccion en menos de 5 minutos

### Scenario 3: Build falla en Vercel
- **Given** que se hace push con un error de TypeScript
- **When** Vercel ejecuta el build
- **Then** el deploy NO se publica, Vercel muestra el error del build en el dashboard, la version anterior sigue funcionando en produccion, y el equipo puede ver el log de error para corregir

## Definition of Done
- [ ] Proyecto conectado a Vercel via GitHub
- [ ] Variables de entorno configuradas en Vercel (URL, ANON_KEY, SERVICE_KEY)
- [ ] Deploy de produccion accesible en URL publica
- [ ] CI/CD automatico funcionando (push a main = deploy)
- [ ] Preview deploys funcionando para PRs
- [ ] Framework preset: Next.js detectado
- [ ] Node version: 20.x configurado

## Technical Notes
- Seguir docs/alquemist-proyecto.md seccion "Setup Dia 1" pasos 12-13 y seccion "Vercel: Configuracion de Deploy"
- Variables de entorno en Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Build command: `next build`, Output: `.next`
- Configurar dominio custom es opcional para esta fase (paso 13)

## Dependencies
- US-001-001 (proyecto creado)
- US-001-002 (dependencias instaladas)
- US-001-003 (variables de entorno configuradas)

## Estimation
- **Size**: S
- **Complexity**: Low
