# F-087: Cambio de Facility Activa

## Overview

Permite a cualquier usuario cambiar su facility de contexto cuando la empresa tiene multiples instalaciones. Actualmente cada usuario tiene un `assigned_facility_id` fijo y todos los datos se filtran implicitamente por esa facility, pero no hay mecanismo en la UI para cambiar entre facilities. Este feature implementa el flujo "Cambiar facility actual" de la seccion Sistema del documento de flujos de usuario: selector en TopBar, cambio via Server Action o Zustand store, y refiltrado global de datos.

Esto es critico para empresas con multiples invernaderos, bodegas o campos — supervisores y gerentes necesitan alternar entre facilities para gestionar operaciones distribuidas.

## User Personas

- **Supervisor**: Gestiona operadores en multiples facilities. Necesita cambiar rapidamente para ver actividades, alertas y batches de cada instalacion.
- **Gerente (Manager)**: Revisa metricas y ordenes de todas las facilities. Alterna para comparar rendimiento entre instalaciones.
- **Admin**: Configura y administra todas las facilities. Necesita contexto de cada una para gestion de usuarios, zonas y sensores.
- **Operador**: Normalmente trabaja en una sola facility, pero puede ser asignado a otra temporalmente.
- **Viewer**: Consulta datos de diferentes facilities para reportes.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-087-001 | Selector de facility en la UI | M | P0 | Planned |
| US-087-002 | Filtrado global de datos por facility activa | M | P0 | Planned |

---

# US-087-001: Selector de facility en la UI

## User Story

**As a** usuario de cualquier rol,
**I want** ver un selector de facility en la top bar y poder cambiar mi facility activa,
**So that** pueda alternar entre instalaciones sin necesidad de cerrar sesion o pedir al admin que me reasigne.

## Acceptance Criteria

### Scenario 1: Empresa con multiples facilities muestra selector
- **Given** la empresa tiene 3 facilities: "Invernadero Principal", "Bodega Norte", "Campo Sur"
- **When** el usuario ve la top bar
- **Then** aparece un selector de facility con el nombre de la facility activa actual, icono Building de Lucide, y un chevron indicando que es clickeable/desplegable

### Scenario 2: Empresa con una sola facility no muestra selector
- **Given** la empresa solo tiene 1 facility: "Invernadero Principal"
- **When** el usuario ve la top bar
- **Then** no aparece el selector de facility (no tiene sentido cambiar). Opcionalmente se muestra el nombre de la facility como texto estatico sin interaccion.

### Scenario 3: Cambiar facility activa
- **Given** el usuario esta en "Invernadero Principal" y la empresa tiene 3 facilities activas
- **When** abre el selector y selecciona "Bodega Norte"
- **Then** la facility activa cambia a "Bodega Norte", el nombre en el selector se actualiza, se muestra toast "Cambio a Bodega Norte", y todos los datos de la pagina actual se recargan filtrados por la nueva facility

### Scenario 4: Facilities inactivas no aparecen en selector
- **Given** la empresa tiene 3 facilities pero "Campo Sur" esta is_active=false
- **When** el usuario abre el selector
- **Then** solo ve 2 opciones: "Invernadero Principal" y "Bodega Norte". "Campo Sur" no aparece.

### Scenario 5: Persistencia entre sesiones
- **Given** el usuario cambio su facility activa a "Bodega Norte"
- **When** cierra y reabre la aplicacion (o refresca la pagina)
- **Then** la facility activa sigue siendo "Bodega Norte" (persistida en la base de datos o en localStorage)

### Scenario 6: Facility activa visible en mobile
- **Given** el usuario esta en mobile
- **When** ve la top bar
- **Then** el selector de facility es accesible — puede mostrarse como nombre abreviado que al tocar abre un bottom sheet con la lista completa de facilities

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Selector visible en TopBar solo si empresa tiene > 1 facility
- [ ] Cambio de facility persiste entre sesiones
- [ ] Criterios de aceptacion verificados
- [ ] Accesibilidad: selector operable por teclado, aria-label descriptivo

## Technical Notes
- **Estrategia de persistencia**: Dos opciones evaluadas:
  - **Opcion A (recomendada)**: Server Action `switchFacility(facilityId)` que actualiza `users.assigned_facility_id` en la DB. Pros: persiste entre dispositivos, consistente con el modelo actual. Cons: requiere round-trip al servidor.
  - **Opcion B**: Zustand store con `persist` en localStorage para cambio instantaneo. Pros: rapido, sin latencia. Cons: no sincroniza entre dispositivos, puede desincronizarse con la DB.
  - **Hibrido recomendado**: Zustand store para estado runtime (cambio instantaneo en UI) + Server Action fire-and-forget para persistir en DB (`users.assigned_facility_id`). Al cargar la app, el store se hydrata desde el valor de la DB (via AuthProvider).
- **Server Action**: `switchFacility(facilityId)` en `src/lib/actions/profile.ts` con `requireAuth()`. Valida que la facility pertenece a la misma company_id del usuario y que is_active=true. UPDATE `users SET assigned_facility_id = facilityId`.
- **Zustand store**: Agregar `activeFacilityId` y `setActiveFacility(id, name)` al auth store existente (`src/stores/auth-store.ts`). Persist con `partialize` para incluir facilityId.
- **Query de facilities**: `getUserFacilities()` — query `facilities WHERE company_id = user.company_id AND is_active = true`. Se carga una vez en AuthProvider o en el layout Server Component.
- **Componente**: `FacilitySelector` en `src/components/layout/facility-selector.tsx` — dropdown en TopBar (desktop) o trigger para bottom sheet (mobile)
- **TopBar integration**: Agregar `FacilitySelector` en la TopBar existente, entre el breadcrumb y el area de acciones

## UI/UX Notes
- Desktop: dropdown select o popover en la TopBar, alineado a la izquierda despues del breadcrumb. Muestra nombre de facility + icono Building + chevron down.
- Mobile: nombre de facility abreviado (max 15 chars + "...") en la top bar. Al tocar: bottom sheet con lista de facilities, cada una con nombre completo + tipo badge + radio indicator para la activa.
- Transicion de cambio: breve flash/skeleton mientras los datos se recargan con la nueva facility
- Si solo hay 1 facility: mostrar nombre como texto estatico (sin chevron, sin interaccion) o no mostrar nada
- Orden de facilities en dropdown: alfabetico por nombre

## Dependencies
- F-003 (schema con tabla facilities)
- F-004 (auth store y AuthProvider)
- F-005 (layout con TopBar)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-087-002: Filtrado global de datos por facility activa

## User Story

**As a** usuario de cualquier rol,
**I want** que todos los datos que veo (batches, zonas, ordenes, actividades, inventario, alertas) esten filtrados por mi facility activa,
**So that** solo vea informacion relevante a la instalacion donde estoy trabajando.

## Acceptance Criteria

### Scenario 1: Batches filtrados por facility
- **Given** "Invernadero Principal" tiene 5 batches activos y "Bodega Norte" tiene 2
- **When** el usuario tiene facility activa "Bodega Norte"
- **Then** la lista de batches solo muestra los 2 batches de "Bodega Norte" (filtrados via zone.facility_id)

### Scenario 2: Zonas filtradas por facility
- **Given** "Invernadero Principal" tiene 4 zonas y "Bodega Norte" tiene 2 zonas
- **When** el usuario tiene facility activa "Bodega Norte"
- **Then** el mapa de facility y la lista de zonas solo muestran las 2 zonas de "Bodega Norte"

### Scenario 3: Ordenes filtradas por facility
- **Given** hay 3 ordenes cuya zone_id pertenece a "Invernadero Principal" y 1 a "Bodega Norte"
- **When** el usuario tiene facility activa "Bodega Norte"
- **Then** la lista de ordenes solo muestra la orden de "Bodega Norte"

### Scenario 4: Actividades filtradas por facility
- **Given** hay actividades programadas en batches de ambas facilities
- **When** el operador tiene facility activa "Invernadero Principal"
- **Then** el dashboard de actividades del dia y el calendario solo muestran actividades de batches en zonas de "Invernadero Principal"

### Scenario 5: Alertas filtradas por facility
- **Given** hay alertas de sensores en "Invernadero Principal" y alertas de stock en "Bodega Norte"
- **When** el usuario tiene facility activa "Invernadero Principal"
- **Then** el centro de alertas solo muestra alertas cuya entidad pertenece a "Invernadero Principal". El badge de alertas en top bar refleja solo estas.

### Scenario 6: Inventario filtrado por facility
- **Given** hay stock en zonas de ambas facilities
- **When** el usuario tiene facility activa "Bodega Norte"
- **Then** la vista de stock muestra solo inventario en zonas de "Bodega Norte". El catalogo de productos sigue siendo global (no filtrado por facility).

### Scenario 7: Dashboard se recarga al cambiar facility
- **Given** el usuario esta en el dashboard con datos de "Invernadero Principal"
- **When** cambia la facility activa a "Bodega Norte" via el selector
- **Then** todos los widgets del dashboard se recargan con datos de "Bodega Norte": KPIs, actividades pendientes, alertas, batches recientes. Se muestra skeleton durante la carga.

### Scenario 8: Selectores de zona respetan facility activa
- **Given** el usuario esta creando una nueva orden de produccion
- **When** llega al paso de asignar zona
- **Then** el selector de zona solo muestra zonas de la facility activa, no de otras facilities

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Todas las queries que dependen de facility filtran por facility activa
- [ ] Selectores de zona filtrados por facility
- [ ] Dashboard se recarga al cambiar facility
- [ ] Criterios de aceptacion verificados
- [ ] Verificar que no hay data leak entre facilities

## Technical Notes
- **Patron de filtrado**: La facility activa se obtiene del auth store (Zustand) o del Server Action context. Todas las Server Actions que retornan datos filtrados por facility deben aceptar un `facilityId` opcional — si no se proporciona, usan `users.assigned_facility_id` del usuario autenticado.
- **Queries afectadas**: La mayoria de datos se filtran indirectamente via `zones.facility_id`:
  - **Batches**: `batches JOIN zones ON batches.zone_id = zones.id WHERE zones.facility_id = $facilityId`
  - **Ordenes**: `production_orders WHERE zone_id IN (SELECT id FROM zones WHERE facility_id = $facilityId)` o via batches vinculados
  - **Actividades**: `scheduled_activities JOIN batches JOIN zones WHERE zones.facility_id = $facilityId`
  - **Inventario**: `inventory_items JOIN zones WHERE zones.facility_id = $facilityId` (stock). `products` no se filtra (catalogo global).
  - **Alertas**: Polimorficas — filtrar por entity_id que pertenezca a la facility (JOIN segun entity_type). Alternativa: agregar `facility_id` a `alerts` como campo denormalizado para performance.
  - **Zonas**: `zones WHERE facility_id = $facilityId` directo
  - **Sensores/Readings**: `sensors JOIN zones WHERE zones.facility_id = $facilityId`
- **Helper centralizado**: Crear `getFacilityFilter(userId)` helper que retorna el facility_id activo del usuario. Usarlo en todas las Server Actions relevantes.
- **RLS consideration**: Las RLS policies actuales filtran por company_id (no por facility). El filtrado por facility es a nivel de aplicacion (WHERE clauses), no de RLS. Esto es correcto — un usuario puede acceder a datos de cualquier facility de su empresa, pero la UI solo muestra la activa.
- **Refetch on change**: Cuando el usuario cambia facility, los query keys de TanStack Query deben invalidarse para forzar refetch. Agregar `facilityId` como parte del query key en todas las queries afectadas: `['batches', facilityId]`, `['activities', facilityId]`, etc.
- **Cache per facility**: TanStack Query cachea datos por query key. Al cambiar facility, los datos de la anterior quedan en cache (stale). El refetch trae los de la nueva. Si el usuario vuelve a la anterior, los datos cacheados se muestran instantaneamente (stale-while-revalidate).

## UI/UX Notes
- El cambio de facility debe sentirse como "cambiar de contexto", no como "navegar a otra pagina"
- Skeleton loading en todos los widgets/listas mientras se recargan los datos de la nueva facility
- No navegar a otra ruta al cambiar — mantener la ruta actual y solo refrescar datos
- Si el usuario esta en una pagina de detalle (ej: detalle de un batch de "Invernadero Principal") y cambia a "Bodega Norte", redirigir al listado correspondiente (la entidad de detalle ya no pertenece a la facility activa)
- Productos y configuracion (crop types, cultivars, templates) son globales — no se filtran por facility

## Dependencies
- US-087-001 (selector de facility que dispara el cambio)
- F-004 (auth store con facilityId)
- Todas las features que muestran datos filtrados (F-015, F-016, F-017, F-021, F-026, F-041, F-047, etc.)

## Estimation
- **Size**: M
- **Complexity**: High
