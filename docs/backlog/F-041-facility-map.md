# F-041: Mapa de Facility y Grid de Zonas

## Overview

Pantalla principal del modulo de Areas que muestra una representacion visual tipo plano de las zonas de una facility. Permite al usuario seleccionar facility, ver un grid de zonas coloreadas por proposito con overlays de ocupacion y batches, y acceder rapidamente al detalle de cada zona. Es la puerta de entrada para la gestion espacial de la operacion.

## User Personas

- **Supervisor**: Revisa estado de sus zonas asignadas, identifica ocupacion y disponibilidad para rotaciones.
- **Gerente**: Evalua capacidad global de la facility, planifica asignacion de nuevos batches.
- **Operador**: Consulta donde estan sus batches asignados.

## Stories

| ID | Story | Size | Prioridad | Estado |
|----|-------|------|-----------|--------|
| US-041-001 | Selector de facility | S | P1 | Planned |
| US-041-002 | Grid visual de zonas con color por proposito | M | P0 | Planned |
| US-041-003 | Stats de facility | S | P1 | Planned |

---

# US-041-001: Selector de facility

## User Story

**As a** supervisor,
**I want** seleccionar entre las facilities de mi empresa,
**So that** pueda ver el mapa de la instalacion que necesito gestionar.

## Acceptance Criteria

### Scenario 1: Facility unica — seleccion automatica
- **Given** la empresa del usuario tiene una sola facility activa
- **When** el usuario navega a la pantalla area-map
- **Then** la facility se selecciona automaticamente sin mostrar selector
- **And** se muestra el grid de zonas de esa facility

### Scenario 2: Multiples facilities — dropdown de seleccion
- **Given** la empresa tiene 3 facilities activas
- **When** el usuario navega a la pantalla area-map
- **Then** se muestra un dropdown con nombre, tipo y direccion de cada facility
- **And** la facility asignada al usuario (assigned_facility_id) se preselecciona
- **And** al cambiar de facility el grid de zonas se actualiza

### Scenario 3: Sin facilities configuradas
- **Given** la empresa no tiene facilities activas
- **When** el usuario navega a la pantalla area-map
- **Then** se muestra un empty state con mensaje "No hay instalaciones configuradas"
- **And** si el usuario tiene rol admin, se muestra CTA "Configurar instalacion" que navega a cfg-company

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] Accesibilidad: selector con label, navegable por teclado
- [ ] Performance: carga < 200ms

## Technical Notes
- Pantalla: `area-map`
- Server Component que carga facilities via Drizzle: `SELECT * FROM facilities WHERE company_id = auth.company_id() AND is_active = true`
- RLS Tipo A (company_id directo en facilities)
- El selector persiste la seleccion en Zustand store para no perderla al navegar

## UI/UX Notes
- Dropdown con search integrado si hay > 5 facilities
- Muestra: nombre, tipo (badge), direccion resumida
- Responsive: full-width en mobile, inline en desktop

## Dependencies
- Fase 0: Auth middleware, layout principal, schema DB (facilities)

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-041-002: Grid visual de zonas con color por proposito

## User Story

**As a** supervisor,
**I want** ver un mapa visual de las zonas de la facility como un grid coloreado,
**So that** pueda identificar rapidamente el estado espacial de la operacion, cuantos batches hay en cada zona y el porcentaje de ocupacion.

## Acceptance Criteria

### Scenario 1: Grid con zonas activas y colores por proposito
- **Given** la facility seleccionada tiene 6 zonas activas con distintos propositos
- **When** se renderiza el grid visual
- **Then** cada zona se muestra como un rectangulo proporcional a su area_m2
- **And** el color corresponde al proposito: propagacion=verde claro, vegetativo=verde, floracion=morado, secado=naranja, storage=gris, processing=azul
- **And** cada rectangulo muestra el nombre de la zona, count de batches activos y porcentaje de ocupacion

### Scenario 2: Tap en zona navega a detalle
- **Given** el grid muestra 6 zonas
- **When** el usuario hace tap en la zona "Sala Floracion A"
- **Then** navega a la pantalla area-zone-detail con el id de esa zona
- **And** la transicion es fluida (< 300ms)

### Scenario 3: Zona sin batches ni ocupacion
- **Given** una zona de tipo storage no tiene batches ni plantas
- **When** se renderiza en el grid
- **Then** se muestra con color gris, batch count = 0, ocupacion = 0%
- **And** el rectangulo se muestra con opacidad reducida respecto a zonas activas

### Scenario 4: Zona en mantenimiento
- **Given** una zona tiene status = 'maintenance'
- **When** se renderiza en el grid
- **Then** se muestra con overlay de rayas diagonales y badge "Mantenimiento"
- **And** no muestra datos de ocupacion

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] Responsive: grid reorganiza columnas en mobile (1-2 cols) vs desktop (3-4 cols)
- [ ] Accesibilidad: cada zona tiene aria-label con nombre y estado
- [ ] Performance: renderizado < 500ms con 20 zonas

## Technical Notes
- Pantalla: `area-map`
- Query: `zones JOIN batches (COUNT, SUM plant_count) WHERE facility_id = selected AND zones.status IN ('active', 'maintenance')`
- Ocupacion calculada: `SUM(batches.plant_count) / zone.plant_capacity * 100`
- Colores por purpose definidos en constantes del design system
- RLS Tipo B (via facility -> company)
- Componente: `ZoneGrid` con `ZoneCard` reutilizable

## UI/UX Notes
- Rectangulos con border-radius: 16px, padding: 16px
- Nombre en DM Sans Bold 14px, count y ocupacion en DM Mono 12px
- Color de proposito como background con opacidad 20%, borde con opacidad 60%
- Hover (desktop): borde transiciona a brand primary #005E42

## Dependencies
- US-041-001 (selector de facility)
- Fase 0: schema DB (zones, batches)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-041-003: Stats de facility

## User Story

**As a** gerente,
**I want** ver estadisticas globales de la facility seleccionada en la parte superior del mapa,
**So that** pueda evaluar rapidamente la capacidad total, plantas actuales y ocupacion global sin entrar a cada zona.

## Acceptance Criteria

### Scenario 1: Stats con datos completos
- **Given** la facility tiene 6 zonas con area total 500m2, capacidad 2000 plantas, y actualmente 1450 plantas en batches activos
- **When** se renderiza la pantalla area-map
- **Then** se muestran 4 stat cards horizontales: "Area total: 500 m2", "Capacidad: 2,000 plantas", "Plantas actuales: 1,450", "Ocupacion: 72.5%"
- **And** los numeros se muestran en DM Mono Bold
- **And** cada stat card tiene un borde izquierdo de color semantico

### Scenario 2: Facility sin plantas
- **Given** la facility tiene zonas configuradas pero no hay batches activos
- **When** se renderizan las stats
- **Then** "Plantas actuales: 0", "Ocupacion: 0%"
- **And** el indicador de ocupacion se muestra en gris neutro

### Scenario 3: Tap en stat navega a contexto
- **Given** las stats se muestran correctamente
- **When** el usuario hace tap en "Plantas actuales"
- **Then** navega a la lista de batches filtrada por facility

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] Componente StatCard reutilizable
- [ ] Accesibilidad: stat values con aria-label descriptivo

## Technical Notes
- Pantalla: `area-map`
- Calculos agregados desde zones y batches:
  - `area_total = SUM(zones.area_m2)`
  - `capacidad = SUM(zones.plant_capacity)`
  - `plantas_actuales = SUM(batches.plant_count WHERE status = 'active')`
  - `ocupacion = plantas_actuales / capacidad * 100`
- Componente reutilizable `StatCard` de `components/data/`
- Datos calculados en Server Component, pasados como props

## UI/UX Notes
- Strip horizontal con scroll en mobile, fila fija en desktop
- StatCard: numero grande DM Mono 24px Bold + label DM Sans 11px overline
- Border-left 4px con color semantico: area=info, capacidad=brand, plantas=success, ocupacion=warning si > 80%
- Spacing: gap 16px entre cards

## Dependencies
- US-041-001 (selector de facility)
- Fase 0: schema DB, componente StatCard base

## Estimation
- **Size**: S
- **Complexity**: Low
