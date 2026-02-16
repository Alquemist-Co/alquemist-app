# F-003: Schema de Base de Datos

## Overview

Creacion completa del schema de base de datos en Supabase: SQL de las 43 tablas organizadas en 8 dominios, habilitacion de RLS con los 4 tipos de policies (A, B, C, D), helper functions para auth (auth.company_id, auth.user_role, auth.facility_id), triggers para auto-populate de company_id, generacion del schema Drizzle ORM tipado, y seed data de ejemplo. Este feature establece la capa de datos sobre la que operara toda la aplicacion.

## User Personas

- **Admin**: Necesita la base de datos funcional para comenzar a configurar la empresa, cultivos y usuarios.
- **Gerente**: Se beneficia de tener seed data para visualizar como se veran los datos en la aplicacion.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-003-001 | Crear helper functions de auth para RLS | S | P0 | Planned |
| US-003-002 | SQL de tablas del dominio Sistema y Produccion | M | P0 | Planned |
| US-003-003 | SQL de tablas del dominio Areas e Inventario | M | P0 | Planned |
| US-003-004 | SQL de tablas del dominio Actividades | L | P0 | Planned |
| US-003-005 | SQL de tablas de Nexo, Ordenes, Calidad y Operaciones | M | P0 | Planned |
| US-003-006 | Configurar RLS policies tipo A, B, C y D | L | P0 | Planned |
| US-003-007 | Generar Drizzle schema y configurar drizzle-kit | M | P0 | Planned |
| US-003-008 | Seed data de ejemplo | M | P1 | Planned |

---

# US-003-001: Crear helper functions de auth para RLS

## User Story

**As a** admin,
**I want** que existan funciones helper en PostgreSQL para extraer company_id, user_role y facility_id del JWT del usuario autenticado,
**So that** las RLS policies puedan filtrar datos por tenant de forma eficiente y consistente.

## Acceptance Criteria

### Scenario 1: Helper auth.company_id() funciona
- **Given** que un usuario autenticado tiene `app_metadata.company_id` en su JWT
- **When** se ejecuta `SELECT auth.company_id()`
- **Then** retorna el UUID del company_id del usuario, y el tipo de retorno es `uuid`

### Scenario 2: Helper auth.user_role() funciona
- **Given** que un usuario autenticado tiene `app_metadata.role` en su JWT
- **When** se ejecuta `SELECT auth.user_role()`
- **Then** retorna el string del rol (ej: 'operator', 'supervisor', 'manager', 'admin', 'viewer')

### Scenario 3: Usuario sin claims
- **Given** que un usuario autenticado NO tiene `app_metadata.company_id` en su JWT
- **When** se ejecuta `SELECT auth.company_id()`
- **Then** retorna NULL, lo que causa que las RLS policies nieguen acceso a todos los datos (comportamiento seguro por defecto)

## Definition of Done
- [ ] Funcion `auth.company_id()` creada y funcional
- [ ] Funcion `auth.user_role()` creada y funcional
- [ ] Funcion `auth.facility_id()` creada y funcional
- [ ] Funciones marcadas como `STABLE` para optimizacion de queries
- [ ] Retornan NULL si el claim no existe (seguro por defecto)
- [ ] SQL ejecutado sin errores en Supabase SQL Editor

## Technical Notes
- Referencia: docs/alquemist-features.md seccion "Row Level Security Policies" > helpers
- Las funciones deben crearse en el schema `auth` de Supabase
- Usar `LANGUAGE sql STABLE` para que PostgreSQL las cachee por query
- Se crean antes que cualquier tabla o policy

## Dependencies
- US-001-003 (Supabase project creado)

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-003-002: SQL de tablas del dominio Sistema y Produccion

## User Story

**As a** admin,
**I want** que las tablas de los dominios Sistema (companies, users) y Produccion (crop_types, cultivars, production_phases, phase_product_flows, cultivar_products) esten creadas en la base de datos,
**So that** se pueda configurar la empresa, usuarios y tipos de cultivo con sus fases.

## Acceptance Criteria

### Scenario 1: Tablas del dominio Sistema creadas
- **Given** que se ejecuta el SQL en Supabase
- **When** se verifican las tablas `companies` y `users`
- **Then** ambas tablas existen con todos los campos definidos en docs/alquemist-modelo-definitivo.md, incluyendo campos de auditoria (created_at, updated_at, created_by, updated_by), FKs correctas (users.company_id -> companies.id, users.assigned_facility_id -> facilities.id), y ENUMs para roles (admin, manager, supervisor, operator, viewer)

### Scenario 2: Tablas del dominio Produccion creadas
- **Given** que se ejecuta el SQL de produccion
- **When** se verifican las tablas crop_types, cultivars, production_phases, phase_product_flows y cultivar_products
- **Then** todas las tablas existen con sus campos, FKs (cultivars.crop_type_id -> crop_types.id, production_phases.crop_type_id -> crop_types.id, etc.), campos JSONB (cultivars.phase_durations, cultivars.optimal_conditions, cultivars.target_profile), y campos booleanos con defaults en production_phases

### Scenario 3: Integridad referencial
- **Given** que las tablas estan creadas
- **When** se intenta insertar un cultivar con un crop_type_id inexistente
- **Then** la base de datos rechaza el INSERT con error de FK violation

## Definition of Done
- [ ] 2 tablas del dominio Sistema creadas (companies, users)
- [ ] 5 tablas del dominio Produccion creadas
- [ ] Todos los campos con tipos correctos
- [ ] Foreign keys configuradas
- [ ] ENUMs creados
- [ ] Campos de auditoria en todas las tablas
- [ ] UNIQUE constraints donde corresponde (crop_types.code, cultivars.code)
- [ ] SQL ejecutado sin errores

## Technical Notes
- Referencia completa: docs/alquemist-modelo-definitivo.md secciones "Dominio: Sistema" y "Dominio: Produccion"
- Crear ENUMs como tipos PostgreSQL: `CREATE TYPE user_role AS ENUM (...)` etc.
- production_phases tiene self-reference: `depends_on_phase_id FK -> self`
- phase_product_flows tiene FKs opcionales: product_id O product_category_id

## Dependencies
- US-003-001 (helper functions creadas)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-003-003: SQL de tablas del dominio Areas e Inventario

## User Story

**As a** admin,
**I want** que las tablas de los dominios Areas (facilities, zones, zone_structures, plant_positions) e Inventario (resource_categories, products, units_of_measure, suppliers, inventory_items, inventory_transactions, recipes, recipe_executions) esten creadas,
**So that** se pueda registrar la infraestructura fisica y gestionar el inventario de insumos y productos.

## Acceptance Criteria

### Scenario 1: Tablas del dominio Areas creadas
- **Given** que se ejecuta el SQL de areas
- **When** se verifican las tablas facilities, zones, zone_structures y plant_positions
- **Then** todas existen con la jerarquia FK: facilities -> zones -> zone_structures, zones -> plant_positions, y los ENUMs de purpose (propagation, vegetation, flowering, etc.), environment (indoor_controlled, greenhouse, etc.) y status (active, maintenance, inactive)

### Scenario 2: Tablas del dominio Inventario creadas
- **Given** que se ejecuta el SQL de inventario
- **When** se verifican las 8 tablas del dominio
- **Then** resource_categories tiene self-reference para jerarquia (parent_id), products tiene FKs a categories, units y suppliers, inventory_items tiene quantity_available/reserved/committed, y inventory_transactions tiene el ENUM con 12 tipos de transaccion y FKs cross-domain a batches, zones, activities y production_phases

### Scenario 3: Transacciones inmutables
- **Given** que existe un registro en inventory_transactions
- **When** se intenta ejecutar UPDATE o DELETE sobre la tabla
- **Then** la operacion es rechazada por un trigger que protege la inmutabilidad del log de transacciones

## Definition of Done
- [ ] 4 tablas del dominio Areas creadas
- [ ] 8 tablas del dominio Inventario creadas
- [ ] Jerarquia FK de Areas correcta
- [ ] FKs cross-domain en inventory_transactions
- [ ] ENUMs de tipos de transaccion
- [ ] Self-reference en resource_categories
- [ ] Campos calculados documentados (no triggers en esta story)
- [ ] SQL ejecutado sin errores

## Technical Notes
- Referencia: docs/alquemist-modelo-definitivo.md secciones "Dominio: Areas" y "Dominio: Inventario"
- plant_positions.current_batch_id es FK cross-domain al nexo de batches
- inventory_transactions es append-only: considerar trigger para bloquear UPDATE/DELETE
- recipes.items es JSONB con estructura [{product_id, quantity, unit_id}]
- units_of_measure tiene self-reference: base_unit_id -> self

## Dependencies
- US-003-002 (dominio Sistema y Produccion creados por FKs de products a cultivars)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-003-004: SQL de tablas del dominio Actividades

## User Story

**As a** admin,
**I want** que las 10 tablas del dominio Actividades (activity_types, activity_templates, activity_template_phases, activity_template_resources, activity_template_checklist, cultivation_schedules, scheduled_activities, activities, activity_resources, activity_observations) esten creadas,
**So that** el sistema pueda gestionar el ciclo completo de templates, programacion y ejecucion de actividades.

## Acceptance Criteria

### Scenario 1: Tablas de templates creadas
- **Given** que se ejecuta el SQL de actividades
- **When** se verifican activity_types, activity_templates, activity_template_phases, activity_template_resources y activity_template_checklist
- **Then** todas existen con sus FKs, activity_template_phases tiene UNIQUE(template_id, phase_id), activity_template_resources tiene ENUMs de quantity_basis (fixed, per_plant, per_m2, per_zone, per_L_solution), y activity_template_checklist tiene los campos is_critical y requires_photo

### Scenario 2: Tablas de ejecucion creadas
- **Given** que se ejecuta el SQL
- **When** se verifican cultivation_schedules, scheduled_activities, activities, activity_resources y activity_observations
- **Then** scheduled_activities tiene FK a batches (cross-domain) y template_snapshot JSONB, activities tiene FKs cross-domain a batches, zones y production_phases, activity_resources tiene FK a inventory_items e inventory_transactions, y activity_observations tiene ENUMs de type y severity

### Scenario 3: FKs cross-domain correctas
- **Given** que las tablas de actividades estan creadas
- **When** se verifica la FK activities.batch_id
- **Then** referencia correctamente a batches.id, y activities.zone_id referencia a zones.id, permitiendo la trazabilidad completa batch + zone + phase

## Definition of Done
- [ ] 10 tablas del dominio Actividades creadas
- [ ] UNIQUE constraint en activity_template_phases(template_id, phase_id)
- [ ] ENUMs de quantity_basis, frequency, status, observation type y severity
- [ ] JSONB fields: cultivation_schedules.phase_config, scheduled_activities.template_snapshot, activity_templates.metadata
- [ ] FKs cross-domain a batches, zones, production_phases, products, inventory_items, inventory_transactions
- [ ] SQL ejecutado sin errores

## Technical Notes
- Referencia: docs/alquemist-modelo-definitivo.md seccion "Dominio: Actividades" (10 tablas detalladas)
- activity_templates.triggers_phase_change_id es FK a production_phases (cross-domain)
- activity_template_resources.product_id es FK a products (cross-domain inventario)
- cultivation_schedules.cultivar_id es FK a cultivars (cross-domain produccion)
- scheduled_activities.completed_activity_id se llena al ejecutar la actividad

## Dependencies
- US-003-002 (dominio Produccion creado)
- US-003-003 (dominios Areas e Inventario creados)

## Estimation
- **Size**: L
- **Complexity**: High

---

# US-003-005: SQL de tablas de Nexo, Ordenes, Calidad y Operaciones

## User Story

**As a** admin,
**I want** que las tablas de los dominios Nexo (batches, batch_lineage), Ordenes (production_orders, production_order_phases), Calidad (quality_tests, quality_test_results) y Operaciones (overhead_costs, sensors, environmental_readings, alerts, attachments) esten creadas,
**So that** el modelo de datos completo de 43 tablas este disponible en la base de datos.

## Acceptance Criteria

### Scenario 1: Tablas del Nexo (batches) creadas
- **Given** que se ejecuta el SQL
- **When** se verifica la tabla batches
- **Then** tiene FKs cross-domain a todos los dominios: cultivar_id (Produccion), zone_id (Areas), current_product_id y source_inventory_item_id (Inventario), schedule_id (Actividades), production_order_id (Ordenes), current_phase_id (Produccion), parent_batch_id (self), y el ENUM de status (active, phase_transition, completed, cancelled, on_hold)

### Scenario 2: Tablas de Ordenes y Calidad creadas
- **Given** que se ejecuta el SQL
- **When** se verifican production_orders, production_order_phases, quality_tests y quality_test_results
- **Then** production_orders tiene entry_phase_id y exit_phase_id como FKs a production_phases, ENUM de status y priority, production_order_phases tiene campos plan vs real (planned_start_date, actual_start_date, yield_pct), quality_tests tiene FK a batches y phases, y quality_test_results tiene thresholds con passed boolean calculable

### Scenario 3: Tablas de Operaciones creadas
- **Given** que se ejecuta el SQL
- **When** se verifican overhead_costs, sensors, environmental_readings, alerts y attachments
- **Then** overhead_costs tiene ENUM de cost_type y allocation_basis, sensors tiene FK a zones, environmental_readings tiene zone_id denormalizado, alerts usa entity polymorphic (entity_type + entity_id), y attachments tambien usa patron polymorphic

### Scenario 4: Total de 43 tablas verificado
- **Given** que todas las stories de schema estan completas
- **When** se cuentan las tablas en la base de datos
- **Then** existen exactamente 43 tablas de datos (excluyendo tablas de sistema de Supabase/auth)

## Definition of Done
- [ ] 2 tablas del Nexo creadas (batches, batch_lineage)
- [ ] 2 tablas de Ordenes creadas
- [ ] 2 tablas de Calidad creadas
- [ ] 5 tablas de Operaciones creadas
- [ ] batches tiene FKs a los 8 dominios
- [ ] Patron polymorphic en alerts y attachments
- [ ] Total: 43 tablas verificadas
- [ ] SQL ejecutado sin errores

## Technical Notes
- Referencia: docs/alquemist-modelo-definitivo.md secciones "Dominio: Nexo", "Dominio: Ordenes", "Dominio: Calidad", "Dominio: Operaciones"
- batches es la tabla mas conectada del modelo: 8+ FKs cross-domain
- Crear indices compuestos criticos: (batch_id, type, timestamp) en inventory_transactions, (batch_id, phase_id, performed_at) en activities, (zone_id, parameter, timestamp) en environmental_readings, etc.
- Referencia indices: docs/alquemist-modelo-definitivo.md seccion "Indices Recomendados"

## Dependencies
- US-003-002 (dominio Sistema y Produccion)
- US-003-003 (dominio Areas e Inventario)
- US-003-004 (dominio Actividades)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-003-006: Configurar RLS policies tipo A, B, C y D

## User Story

**As a** admin,
**I want** que las Row Level Security policies esten habilitadas en todas las tablas con datos de tenant, siguiendo los 4 tipos de policies definidos,
**So that** los datos de cada empresa esten aislados automaticamente a nivel de base de datos sin depender del codigo de la aplicacion.

## Acceptance Criteria

### Scenario 1: Policies Tipo A (company_id directo) funcionan
- **Given** que las policies tipo A estan configuradas en companies, facilities, users, cultivars, cultivation_schedules, production_orders, sensors, overhead_costs, alerts y recipes
- **When** un usuario de la empresa A ejecuta `SELECT * FROM production_orders`
- **Then** solo ve las ordenes de la empresa A, no las de empresa B, sin necesidad de WHERE clause en el codigo

### Scenario 2: Policies Tipo B (via facility) funcionan
- **Given** que las policies tipo B estan configuradas en zones, zone_structures y plant_positions
- **When** un usuario ejecuta `SELECT * FROM zones`
- **Then** solo ve las zonas de facilities que pertenecen a su company_id

### Scenario 3: Policies Tipo D (catalogos globales) funcionan
- **Given** que las policies tipo D estan configuradas en crop_types, production_phases, phase_product_flows, resource_categories y units_of_measure
- **When** cualquier usuario ejecuta `SELECT * FROM crop_types`
- **Then** ve todos los registros (lectura global), pero solo un admin puede INSERT, UPDATE o DELETE

### Scenario 4: Usuario sin company_id no accede datos
- **Given** que un usuario autenticado no tiene company_id en su JWT
- **When** ejecuta cualquier SELECT sobre una tabla con RLS tipo A
- **Then** obtiene 0 filas, no un error, asegurando fail-safe por defecto

## Definition of Done
- [ ] RLS habilitado en todas las tablas con datos de tenant
- [ ] Policies Tipo A: SELECT, INSERT, UPDATE, DELETE por company_id directo
- [ ] Policies Tipo B: via facility -> company
- [ ] Policies Tipo C: con company_id redundante en batches, activities e inventory_transactions + triggers para auto-populate
- [ ] Policies Tipo D: lectura global, escritura solo admin
- [ ] Trigger `set_batch_company_id()` creado y funcional
- [ ] Policies de rol complementarias (activities INSERT solo operator/supervisor/admin, etc.)
- [ ] Verificado con queries de prueba multi-tenant

## Technical Notes
- Referencia principal: docs/alquemist-features.md seccion "Row Level Security Policies"
- Tipo C requiere agregar columna company_id redundante a batches, activities e inventory_transactions
- Crear trigger `trg_batch_company` para auto-populate company_id en batches desde zone -> facility -> company
- Policies de rol complementarias: docs/alquemist-features.md seccion "Policies de Rol (Component-Level)"
- Tablas con policies de rol: activities (INSERT/UPDATE), batches (UPDATE phase, INSERT split), production_orders (INSERT, UPDATE approve), inventory_transactions (INSERT), overhead_costs, users, quality_tests, quality_test_results

## Dependencies
- US-003-001 (helper functions auth.company_id, auth.user_role, auth.facility_id)
- US-003-002 a US-003-005 (todas las tablas creadas)

## Estimation
- **Size**: L
- **Complexity**: High

---

# US-003-007: Generar Drizzle schema y configurar drizzle-kit

## User Story

**As a** admin,
**I want** que el schema de Drizzle ORM este generado desde la base de datos existente y completamente tipado,
**So that** el equipo pueda escribir queries type-safe en TypeScript sin discrepancias con el schema de PostgreSQL.

## Acceptance Criteria

### Scenario 1: Drizzle schema generado correctamente
- **Given** que las 43 tablas estan creadas en Supabase
- **When** se ejecuta `npx drizzle-kit pull`
- **Then** se generan archivos TypeScript en `src/lib/db/schema/` con las definiciones de todas las tablas, los tipos corresponden a los tipos de PostgreSQL, y los ENUMs estan correctamente mapeados

### Scenario 2: Schema organizado por dominio
- **Given** que el schema Drizzle esta generado
- **When** se organiza en archivos por dominio
- **Then** existen archivos separados: `system.ts`, `production.ts`, `areas.ts`, `inventory.ts`, `activities.ts`, `batches.ts`, `orders.ts`, `quality.ts`, `operations.ts`, y un `index.ts` que re-exporta todo

### Scenario 3: drizzle.config.ts configurado
- **Given** que drizzle-kit esta instalado como devDependency
- **When** se ejecuta `npx drizzle-kit check`
- **Then** drizzle-kit se conecta correctamente a Supabase usando la URL de la base de datos, el schema generado esta sincronizado con la DB, y no hay drift entre el schema local y la DB remota

## Definition of Done
- [ ] `drizzle.config.ts` configurado con conexion a Supabase
- [ ] Schema generado con `drizzle-kit pull`
- [ ] Schema organizado por dominio en `src/lib/db/schema/`
- [ ] `src/lib/db/schema/index.ts` exporta todo
- [ ] Tipos TypeScript correctos para todos los campos
- [ ] ENUMs mapeados correctamente
- [ ] Build de TypeScript sin errores

## Technical Notes
- Seguir docs/alquemist-proyecto.md seccion "Setup Dia 1" paso 9
- drizzle.config.ts debe usar `SUPABASE_SERVICE_ROLE_KEY` para conectarse (no anon key)
- Organizar archivos por dominio para mantener coherencia con docs/alquemist-modelo-definitivo.md
- Ubicacion: `src/lib/db/schema/`, `drizzle.config.ts` en raiz

## Dependencies
- US-003-002 a US-003-005 (todas las tablas creadas en DB)
- US-001-002 (drizzle-kit instalado)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-003-008: Seed data de ejemplo

## User Story

**As a** gerente,
**I want** que la base de datos tenga datos de ejemplo realistas cargados,
**So that** pueda visualizar como se vera la aplicacion con datos reales y el equipo pueda probar funcionalidades sin crear datos manualmente.

## Acceptance Criteria

### Scenario 1: Datos base cargados
- **Given** que las 43 tablas estan creadas y RLS esta configurado
- **When** se ejecuta el script de seed data
- **Then** existen: 1 company, 1 facility, 2 crop_types (cannabis y arandano), 3 cultivars, 7 production_phases para cannabis, 4 para arandano, unidades de medida basicas, 5+ categorias de recursos, 10+ productos, 2 zonas, y 3 usuarios (admin, supervisor, operador)

### Scenario 2: Datos operativos de ejemplo
- **Given** que los datos base estan cargados
- **When** se verifica la presencia de datos operativos
- **Then** existe al menos 1 production_order, 1 batch activo, 5 activity_templates con checklists y recursos, 3 scheduled_activities, e inventory_items con stock de ejemplo en las zonas

### Scenario 3: Seed data respeta RLS
- **Given** que los datos seed estan cargados
- **When** un usuario de la company seed se autentica
- **Then** ve todos los datos seed a traves de RLS, y un usuario de otra company (si existiera) no veria nada

## Definition of Done
- [ ] Script SQL de seed data ejecutable
- [ ] Datos realistas para los 8 dominios
- [ ] Datos coherentes entre si (FKs validas, cantidades logicas)
- [ ] Script idempotente (puede ejecutarse multiples veces)
- [ ] Documentado en README o en el propio script
- [ ] Datos respetan las reglas de negocio documentadas

## Technical Notes
- Seguir docs/alquemist-proyecto.md seccion "Setup Dia 1" paso 14
- Seed data debe incluir app_metadata en los usuarios auth para que RLS funcione
- Considerar crear un script en `src/lib/db/seed.sql` o `scripts/seed.ts`
- Referencia de datos recomendados: 2 crop_types (cannabis, arandano), 3 cultivars, 7 fases, 10 productos, 2 zonas, 1 batch

## Dependencies
- US-003-006 (RLS configurado)
- US-003-007 (Drizzle schema generado, para verificar tipos)

## Estimation
- **Size**: M
- **Complexity**: Medium
