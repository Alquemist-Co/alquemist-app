# F-064: Documentacion

## Overview

Documentacion esencial para el proyecto: README con setup rapido (< 30 minutos), guia de onboarding para nuevos desarrolladores, y runbook de operaciones para resolver problemas comunes en produccion. El objetivo es que cualquier desarrollador pueda levantar el proyecto localmente, entender la arquitectura y resolver incidentes sin depender de conocimiento tribal.

## User Personas

- **Admin**: Se beneficia del runbook para resolver problemas de produccion sin necesidad de soporte externo.
- **Gerente**: Se beneficia de documentacion clara que permite incorporar nuevos miembros al equipo de desarrollo rapidamente.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-064-001 | README con setup rapido | M | P0 | Planned |
| US-064-002 | Guia de onboarding para desarrolladores | M | P1 | Planned |
| US-064-003 | Runbook de operaciones | M | P1 | Planned |

---

# US-064-001: README con setup rapido

## User Story

**As a** admin,
**I want** un README completo que permita a cualquier desarrollador levantar el proyecto en menos de 30 minutos,
**So that** nuevas incorporaciones al equipo sean productivas desde el primer dia.

## Acceptance Criteria

### Scenario 1: Setup exitoso siguiendo el README
- **Given** un desarrollador con Node.js 20+ y git instalado
- **When** sigue los pasos del README secuencialmente
- **Then** tiene la app corriendo en localhost:3000 con datos de ejemplo en menos de 30 minutos

### Scenario 2: Requisitos previos claros
- **Given** un desarrollador nuevo revisa el README
- **When** lee la seccion de requisitos
- **Then** ve claramente: Node.js 20+, npm 9+, cuenta de Supabase (free), cuenta de Vercel (free), y git

### Scenario 3: Variables de entorno documentadas
- **Given** un desarrollador necesita configurar `.env.local`
- **When** consulta el README
- **Then** encuentra una tabla con TODAS las variables necesarias, su descripcion, si son publicas o privadas, y un ejemplo de `.env.local.example`

### Scenario 4: Seed data incluido
- **Given** un desarrollador tiene la DB vacia
- **When** ejecuta el comando de seed documentado
- **Then** la DB se puebla con datos de ejemplo: 2 crop_types, 3 cultivars, fases, productos, zonas, 1 orden y 1 batch

## Definition of Done
- [ ] README actualizado y completo
- [ ] Verificado por alguien que no conoce el proyecto
- [ ] Setup completado en < 30 minutos
- [ ] `.env.local.example` creado

## Technical Notes
- Archivo: `README.md` en raiz del proyecto
- Secciones: Vision general, Stack, Requisitos, Setup paso a paso, Variables de entorno, Comandos disponibles, Estructura del proyecto, Contribucion
- Seed script: `npm run db:seed` que ejecuta SQL con datos de ejemplo
- Ref: `docs/alquemist-proyecto.md` seccion "Setup Dia 1"

## UI/UX Notes
- N/A (documentacion)

## Dependencies
- Requiere proyecto funcional completo (Fases 0-3)

## Estimation
- **Size**: M
- **Complexity**: Low

---

# US-064-002: Guia de onboarding para desarrolladores

## User Story

**As a** admin,
**I want** una guia de onboarding que explique la arquitectura, patrones de codigo y flujos principales del sistema,
**So that** nuevos desarrolladores entiendan como contribuir correctamente al proyecto.

## Acceptance Criteria

### Scenario 1: Arquitectura entendible
- **Given** un desarrollador nuevo lee la guia de onboarding
- **When** revisa la seccion de arquitectura
- **Then** entiende las 5 capas del sistema, como fluyen los datos desde la UI hasta la DB y de vuelta, y donde vive cada tipo de logica

### Scenario 2: Patrones de codigo claros
- **Given** un desarrollador necesita crear una nueva feature
- **When** consulta la guia
- **Then** encuentra ejemplos de: como crear un Server Action, como escribir un Zod schema compartido, como usar React Hook Form con Zod, como hacer optimistic updates con TanStack Query, y como manejar offline con Dexie

### Scenario 3: Flujo de trabajo documentado
- **Given** un desarrollador va a hacer su primer PR
- **When** consulta la seccion de flujo de trabajo
- **Then** entiende: branch naming, conventional commits, criterios de PR, y como ejecutar lint/build/tests antes de enviar

## Definition of Done
- [ ] Guia creada y revisada
- [ ] Ejemplos de codigo incluidos
- [ ] Verificada por desarrollador nuevo

## Technical Notes
- Archivo: `docs/onboarding-guide.md`
- Secciones: Arquitectura del sistema (con diagrama), Patrones de codigo (con ejemplos), Flujo de datos (request lifecycle), Estado y sincronizacion (Zustand + TanStack Query + Dexie), Git workflow, Como crear una nueva feature (step by step)
- Referenciar `CLAUDE.md` para convenciones de codigo

## UI/UX Notes
- N/A (documentacion)

## Dependencies
- Requiere proyecto funcional con patrones establecidos (Fases 0-3)

## Estimation
- **Size**: M
- **Complexity**: Low

---

# US-064-003: Runbook de operaciones

## User Story

**As a** admin,
**I want** un runbook que documente como resolver problemas comunes de produccion,
**So that** pueda diagnosticar y resolver incidentes sin depender de un desarrollador especifico.

## Acceptance Criteria

### Scenario 1: Problema de sincronizacion offline
- **Given** un operador reporta que sus datos no se sincronizaron
- **When** el admin consulta el runbook
- **Then** encuentra pasos claros: como verificar la sync queue en IndexedDB, como forzar sincronizacion manual, como identificar items en estado 'failed' o 'conflict', y como resolverlos

### Scenario 2: Error de base de datos
- **Given** la app muestra error 500 en produccion
- **When** el admin consulta el runbook
- **Then** encuentra: como revisar logs en Vercel, como verificar el estado de Supabase, como verificar RLS policies, y como hacer rollback de una migracion si es necesario

### Scenario 3: Problema de performance
- **Given** los usuarios reportan lentitud
- **When** el admin consulta el runbook
- **Then** encuentra: como ejecutar Lighthouse audit, como revisar Vercel Analytics, como identificar queries lentas en Supabase, y como limpiar cache del service worker

### Scenario 4: Alertas no se generan
- **Given** los cron jobs de alertas no estan funcionando
- **When** el admin consulta el runbook
- **Then** encuentra: como verificar Vercel Cron logs, como verificar CRON_SECRET, como ejecutar manualmente los endpoints de cron, y como verificar la tabla de alerts

## Definition of Done
- [ ] Runbook creado con al menos 10 escenarios comunes
- [ ] Verificado que los pasos son ejecutables
- [ ] Contactos de escalamiento incluidos

## Technical Notes
- Archivo: `docs/runbook.md`
- Secciones: Sincronizacion offline, Base de datos (Supabase), Deploy y builds (Vercel), Performance, Alertas y cron jobs, Auth y sesiones, Storage (fotos y certificados), Monitoreo (Sentry)
- Cada seccion: Sintomas, Diagnostico (pasos), Resolucion, Prevencion
- Incluir links directos a dashboards de Supabase, Vercel y Sentry

## UI/UX Notes
- N/A (documentacion)

## Dependencies
- Requiere infraestructura completa funcionando (Fases 0-3)

## Estimation
- **Size**: M
- **Complexity**: Low
