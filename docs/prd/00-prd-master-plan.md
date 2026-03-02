# Plan Maestro PRD — Alquemist

43 archivos PRD · 9 fases · Febrero 2026

---

## Regla Principal

> **OBLIGATORIO — Antes de escribir cualquier PRD de una fase:**
>
> 1. Leer **completo** `docs/fundational/alquemist-architecture-system.md` — arquitectura, patrones de seguridad, API layer (PostgREST ~70% + Edge Functions ~30%), RLS, deployment
> 2. Leer **completo** `docs/fundational/alquemist-data-model` — 46 tablas, ENUMs, relaciones cross-domain, principios de diseño
> 3. Los **flujos operativos detallados** (Flujo 1 al 8+) del data model son ejemplos prácticos que muestran cómo interactúan las tablas en escenarios reales. Usarlos como contexto para entender el dominio y escribir requerimientos precisos — no como asignaciones directas
> 4. Consultar `CLAUDE.md`

---

## Reglas de Generación

1. Cada PRD usa el **template estándar** (ver abajo)
2. Especificar **roles** con acceso a la página (admin, manager, supervisor, operator, viewer)
3. Indicar qué tablas se **leen (R)** y cuáles se **escriben (W)**
4. Referenciar **ENUMs exactos** del data model — no inventar valores
5. Incluir comportamiento **offline** solo si aplica (páginas Field, fase 8)
6. Respetar **patrones técnicos** del CLAUDE.md (Zod v4, CVA variants, no setState en useEffect, etc.)
7. Para tablas CRUD (~70%), usar PostgREST directo. Para flujos transaccionales (~30%), usar Edge Functions
8. Todo PRD debe indicar si la página es **Server Component** (listados, reportes) o **Client Component** (formularios interactivos)

---

## Template Estándar de PRD

Cada archivo PRD sigue esta estructura:

```markdown
# [Nombre de la Página]

## Metadata

- **Ruta**: /ruta/de/la/pagina
- **Roles con acceso**: admin, manager, ...
- **Tipo componente**: Server Component | Client Component | Mixto
- **Edge Functions**: (si aplica)

## Objetivo

- Qué problema resuelve, quién la usa principalmente

## Tablas del modelo involucradas

| Tabla      | Operaciones | Notas    |
| ---------- | ----------- | -------- |
| tabla_name | R / W / RPC | contexto |

## ENUMs utilizados

| ENUM      | Valores             | Tabla.campo |
| --------- | ------------------- | ----------- |
| enum_name | val1 \| val2 \| ... | tabla.campo |

## Layout y componentes principales

- Descripción de secciones y elementos clave de la UI

## Requisitos funcionales

- RF-01: ...
- RF-02: ...

## Requisitos no funcionales

- RNF-01: ...
- RNF-02: ... (performance, seguridad, offline si aplica)

## Flujos principales

- Happy path + edge cases relevantes

## Estados y validaciones

- Estados de UI, errores esperados, reglas de validación clave

## Dependencias

- Otras páginas, Edge Functions, pg_cron jobs relacionados
```

---

## Estructura de Carpetas

```
docs/prd/
  00-prd-master-plan.md              ← Este documento
  auth/
    login.md, signup.md, invite.md, forgot-password.md, reset-password.md
  settings/
    profile.md, company.md, users.md, catalog.md, crop-types.md,
    cultivars.md, activity-templates.md, regulatory-config.md
  areas/
    facilities.md, zones.md, zone-detail.md
  inventory/
    products.md, suppliers.md, shipments.md, shipment-detail.md,
    recipes.md, items.md, transactions.md
  production/
    orders.md, order-detail.md, batches.md, batch-detail.md
  activities/
    schedule.md, execute.md, history.md
  quality/
    tests.md, test-detail.md
  regulatory/
    documents.md, document-detail.md
  operations/
    alerts.md, environmental.md, sensors.md, costs.md
  field/
    today.md, execute.md, observe.md, scan.md
  dashboard/
    home.md
```

---

## Lógica del Orden de Fases

```
Auth → Settings (config base) → Áreas + Inventario → Producción →
Actividades + Calidad + Regulatorio → Operaciones → Inventario operativo → Field → Dashboard
```

El Dashboard va al final porque agrega información de todas las secciones anteriores.

---

## FASE 1 — Auth

**5 archivos** · Rutas: `(auth)/`

Autenticación, onboarding de empresa, e invitación de usuarios.

### Documentación fundacional a consultar

- **Arquitectura**: §2 Stack Tecnológico (Supabase Auth, JWT), §7 Seguridad y Multi-Tenancy (RLS, roles en app_metadata)
- **Data model**: Dominio Sistema (companies, users), Principios de Diseño (multi-tenancy)

### Tablas involucradas

| Tabla             | Dominio          | Uso en esta fase                                   |
| ----------------- | ---------------- | -------------------------------------------------- |
| companies         | Sistema          | W (signup crea empresa) / R (login carga config)   |
| users             | Sistema          | W (signup/invite crean usuario) / R (login valida) |
| _auth.users_      | Supabase interno | W (signup/invite) / R (login)                      |
| _auth.identities_ | Supabase interno | W (requerido para signInWithPassword)              |

### ENUMs

| ENUM      | Valores                                              | Tabla.campo |
| --------- | ---------------------------------------------------- | ----------- |
| user_role | admin \| manager \| supervisor \| operator \| viewer | users.role  |

### Archivos PRD

- [x] 01 · `auth/login.md` — `/login` — Login con email/password, manejo de sesión, redirect post-login por rol
- [x] 02 · `auth/signup.md` — `/signup` — Onboarding inicial: primer admin registra empresa + su cuenta de administrador
- [x] 03 · `auth/invite.md` — `/invite/[token]` — Activación de cuenta vía invitación: set password, completar perfil
- [x] 04 · `auth/forgot-password.md` — `/forgot-password` — Solicitar restablecimiento de contraseña por email
- [x] 05 · `auth/reset-password.md` — `/reset-password/[token]` — Establecer nueva contraseña desde link del email

### Dependencias

- **Necesita**: Nada (es la base)
- **Desbloquea**: Todas las demás fases (sin auth no hay acceso)

---

## FASE 2 — Settings / Configuración Base

**8 archivos** · Rutas: `(dashboard)/settings/`

Todo lo que debe existir antes de crear una orden o un batch.

### Documentación fundacional a consultar

- **Arquitectura**: §5 Capa de API (CRUD via PostgREST para catálogos), §7 Seguridad (RLS patrón 1 y 3, control por rol)
- **Data model**: Dominio Sistema, Dominio Producción (crop_types, cultivars, production_phases, phase_product_flows, phytosanitary_agents), Dominio Actividades (templates, schedules), Dominio Regulatorio (doc_types, requirements), Principios de Diseño (fases configurables, transformación por cultivar, template→instancia)

### Tablas involucradas

| Tabla                           | Dominio     | Uso en esta fase                      |
| ------------------------------- | ----------- | ------------------------------------- |
| companies                       | Sistema     | R/W (perfil empresa)                  |
| users                           | Sistema     | R/W (gestión usuarios, perfil propio) |
| resource_categories             | Inventario  | R/W (catálogo categorías)             |
| units_of_measure                | Inventario  | R/W (catálogo unidades)               |
| activity_types                  | Actividades | R/W (catálogo tipos actividad)        |
| crop_types                      | Producción  | R/W (tipos cultivo)                   |
| production_phases               | Producción  | R/W (fases por crop_type)             |
| cultivars                       | Producción  | R/W (variedades)                      |
| phase_product_flows             | Producción  | R/W (transformaciones por cultivar)   |
| phytosanitary_agents            | Producción  | R/W (catálogo fitosanitario)          |
| activity_templates              | Actividades | R/W (recetas de actividad)            |
| activity_template_phases        | Actividades | R/W (fases del template)              |
| activity_template_resources     | Actividades | R/W (recursos del template)           |
| activity_template_checklist     | Actividades | R/W (checklist del template)          |
| cultivation_schedules           | Actividades | R/W (planes maestros)                 |
| regulatory_doc_types            | Regulatorio | R/W (tipos de documento)              |
| product_regulatory_requirements | Regulatorio | R/W (requerimientos por producto)     |
| shipment_doc_requirements       | Regulatorio | R/W (requerimientos por envío)        |

### ENUMs

| ENUM                      | Valores                                                                                                    | Tabla.campo                                                     |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| crop_category             | annual \| perennial \| biennial                                                                            | crop_types.category                                             |
| flow_direction            | input \| output                                                                                            | phase_product_flows.direction                                   |
| product_role              | primary \| secondary \| byproduct \| waste                                                                 | phase_product_flows.product_role                                |
| agent_type                | pest \| disease \| deficiency \| abiotic                                                                   | phytosanitary_agents.type                                       |
| agent_category            | insect \| mite \| fungus \| bacteria \| virus \| nematode \| mollusk \| nutrient \| environmental \| other | phytosanitary_agents.category                                   |
| activity_frequency        | daily \| weekly \| biweekly \| once \| on_demand                                                           | activity_templates.frequency                                    |
| quantity_basis            | fixed \| per_plant \| per_m2 \| per_zone \| per_L_solution                                                 | activity_template_resources.quantity_basis                      |
| doc_category              | quality \| transport \| compliance \| origin \| safety \| commercial                                       | regulatory_doc_types.category                                   |
| compliance_scope          | per_batch \| per_lot \| per_product \| per_facility                                                        | product_regulatory_requirements.applies_to_scope                |
| compliance_frequency      | once \| per_production \| annual \| per_shipment                                                           | product_regulatory_requirements.frequency                       |
| shipment_doc_applies_when | always \| interstate \| international \| regulated_material                                                | shipment_doc_requirements.applies_when                          |
| unit_dimension            | mass \| volume \| count \| area \| energy \| time \| concentration                                         | units_of_measure.dimension                                      |
| lot_tracking              | required \| optional \| none                                                                               | resource_categories.default_lot_tracking, products.lot_tracking |

### Archivos PRD

- [x] 06 · `settings/profile.md` — `/settings/profile` — Perfil personal del usuario: editar nombre, teléfono, cambiar contraseña
- [x] 07 · `settings/company.md` — `/settings/company` — Perfil empresa: timezone, moneda, features habilitados, regulatory_mode
- [x] 08 · `settings/users.md` — `/settings/users` — Invitar usuarios, asignar rol, facility y permissions JSONB
- [x] 09 · `settings/catalog.md` — `/settings/catalog` — Tablas de referencia: resource_categories, units_of_measure, activity_types
- [x] 10 · `settings/crop-types.md` — `/settings/crop-types` — CRUD crop_types + production_phases configurables por tipo
- [x] 11 · `settings/cultivars.md` — `/settings/cultivars` — CRUD cultivars + phase_product_flows por cultivar
- [x] 12 · `settings/activity-templates.md` — `/settings/activity-templates` — CRUD templates + recursos + checklist + fases + cultivation_schedules
- [x] 13 · `settings/regulatory-config.md` — `/settings/regulatory-config` — CRUD regulatory_doc_types + product_regulatory_requirements + shipment_doc_requirements

### Dependencias

- **Necesita**: Fase 1 (Auth)
- **Desbloquea**: Fases 3-9 (toda la configuración base debe existir)

---

## FASE 3 — Áreas e Inventario

**8 archivos** · Rutas: `(dashboard)/areas/`, `(dashboard)/inventory/`

La infraestructura física y los recursos que el sistema va a manejar.

### Documentación fundacional a consultar

- **Arquitectura**: §5 (CRUD PostgREST para catálogos, Edge Function `confirm-shipment-receipt` y `execute-recipe`), §4 (triggers: trg_calculate_zone_capacity, trg_calculate_facility_totals)
- **Data model**: Dominio Áreas (facilities→zones→structures→positions), Dominio Inventario (products, suppliers, shipments, recipes), Dominio Regulatorio (shipments, shipment_items), Relaciones Cross-Domain (shipments↔inventory)

### Tablas involucradas

| Tabla                           | Dominio     | Uso en esta fase                        |
| ------------------------------- | ----------- | --------------------------------------- |
| facilities                      | Áreas       | R/W (CRUD instalaciones)                |
| zones                           | Áreas       | R/W (CRUD zonas)                        |
| zone_structures                 | Áreas       | R/W (estructuras internas)              |
| plant_positions                 | Áreas       | R/W (posiciones individuales, opcional) |
| products                        | Inventario  | R/W (catálogo productos)                |
| suppliers                       | Inventario  | R/W (proveedores)                       |
| shipments                       | Regulatorio | R/W (envíos)                            |
| shipment_items                  | Regulatorio | R/W (líneas de envío)                   |
| inventory_items                 | Inventario  | R/W (stock creado al confirmar envío)   |
| inventory_transactions          | Inventario  | W (receipt al confirmar)                |
| recipes                         | Inventario  | R/W (fórmulas/BOM)                      |
| recipe_executions               | Inventario  | W (ejecución de receta)                 |
| resource_categories             | Inventario  | R (referencia)                          |
| units_of_measure                | Inventario  | R (referencia)                          |
| product_regulatory_requirements | Regulatorio | R (requerimientos del producto)         |
| shipment_doc_requirements       | Regulatorio | R (docs requeridos para envío)          |
| regulatory_documents            | Regulatorio | R (verificar compliance)                |

### ENUMs

| ENUM                     | Valores                                                                                                                                                                    | Tabla.campo                      |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| facility_type            | indoor_warehouse \| greenhouse \| tunnel \| open_field \| vertical_farm                                                                                                    | facilities.type                  |
| zone_purpose             | propagation \| vegetation \| flowering \| drying \| processing \| storage \| multipurpose                                                                                  | zones.purpose                    |
| zone_environment         | indoor_controlled \| greenhouse \| tunnel \| open_field                                                                                                                    | zones.environment                |
| zone_status              | active \| maintenance \| inactive                                                                                                                                          | zones.status                     |
| structure_type           | mobile_rack \| fixed_rack \| rolling_bench \| row \| bed \| trellis_row \| nft_channel                                                                                     | zone_structures.type             |
| position_status          | empty \| planted \| harvested \| maintenance                                                                                                                               | plant_positions.status           |
| product_category         | _(definido en resource_categories, no es ENUM)_                                                                                                                            | —                                |
| product_procurement_type | purchased \| produced \| both                                                                                                                                              | products.procurement_type        |
| product_lot_tracking     | required \| optional \| none                                                                                                                                               | products.lot_tracking            |
| source_type              | purchase \| production \| transfer \| transformation                                                                                                                       | inventory_items.source_type      |
| lot_status               | available \| quarantine \| expired \| depleted                                                                                                                             | inventory_items.lot_status       |
| transaction_type         | receipt \| consumption \| application \| transfer_out \| transfer_in \| transformation_out \| transformation_in \| adjustment \| waste \| return \| reservation \| release | inventory_transactions.type      |
| shipment_direction       | inbound \| outbound                                                                                                                                                        | shipments.type                   |
| shipment_status          | scheduled \| in_transit \| received \| inspecting \| accepted \| partial_accepted \| rejected \| cancelled                                                                 | shipments.status                 |
| inspection_result        | accepted \| accepted_with_observations \| rejected \| quarantine                                                                                                           | shipment_items.inspection_result |

### Archivos PRD

- [x] 14 · `areas/facilities.md` — `/areas/facilities` — CRUD instalaciones, capacidades calculadas
- [x] 15 · `areas/zones.md` — `/areas/zones` — CRUD zonas, zone_structures inline, filtro por facility
- [x] 16 · `areas/zone-detail.md` — `/areas/zones/[id]` — Detalle zona: estructuras, posiciones, batch activo, sensores
- [x] 17 · `inventory/products.md` — `/inventory/products` — Catálogo de productos, requerimientos regulatorios del producto
- [x] 18 · `inventory/suppliers.md` — `/inventory/suppliers` — CRUD proveedores
- [x] 19 · `inventory/shipments.md` — `/inventory/shipments` — Lista envíos inbound/outbound, crear shipment
- [x] 20 · `inventory/shipment-detail.md` — `/inventory/shipments/[id]` — Detalle envío: líneas, docs requeridos, inspección, confirmar recepción → genera inventory_items
- [x] 21 · `inventory/recipes.md` — `/inventory/recipes` — CRUD fórmulas/BOM, ejecutar receta → genera transacciones

### Dependencias

- **Necesita**: Fase 1 (Auth), Fase 2 (Settings — categorías, unidades, productos dependen de catálogos base)
- **Desbloquea**: Fase 4 (Producción necesita zonas e inventario)

---

## FASE 4 — Producción

**4 archivos** · Rutas: `(dashboard)/production/`

El ciclo productivo central.

### Documentación fundacional a consultar

- **Arquitectura**: §5 (Edge Functions: `approve-production-order`, `calculate-order-yields`, `transition-phase`, `split-batch`, `merge-batch`, `execute-harvest`)
- **Data model**: Dominio Órdenes (production_orders, production_order_phases), Dominio Nexo (batches, batch_lineage), Principios de Diseño (órdenes flexibles con entry/exit point, batch como nexo, fases configurables), Flujos Operativos (Flujo 1, 1b, 1c, 1d, Flujo 4)

### Tablas involucradas

| Tabla                   | Dominio     | Uso en esta fase               |
| ----------------------- | ----------- | ------------------------------ |
| production_orders       | Órdenes     | R/W (crear, aprobar, cancelar) |
| production_order_phases | Órdenes     | R/W (generadas al crear orden) |
| batches                 | Nexo        | R/W (creados al aprobar orden) |
| batch_lineage           | Nexo        | R/W (split/merge)              |
| cultivars               | Producción  | R (selección al crear orden)   |
| production_phases       | Producción  | R (fases del cultivar)         |
| phase_product_flows     | Producción  | R (yields en cascada)          |
| zones                   | Áreas       | R (asignación de zona)         |
| products                | Inventario  | R (producto inicial/final)     |
| inventory_items         | Inventario  | R (material disponible)        |
| scheduled_activities    | Actividades | W (generadas al aprobar)       |
| cultivation_schedules   | Actividades | R (plan maestro)               |

### ENUMs

| ENUM               | Valores                                                         | Tabla.campo                    |
| ------------------ | --------------------------------------------------------------- | ------------------------------ |
| order_status       | draft \| approved \| in_progress \| completed \| cancelled      | production_orders.status       |
| order_priority     | low \| normal \| high \| urgent                                 | production_orders.priority     |
| order_phase_status | pending \| ready \| in_progress \| completed \| skipped         | production_order_phases.status |
| batch_status       | active \| phase_transition \| completed \| cancelled \| on_hold | batches.status                 |
| lineage_operation  | split \| merge                                                  | batch_lineage.operation        |

### Archivos PRD

- [x] 22 · `production/orders.md` — `/production/orders` — Listado órdenes, crear orden con entry/exit point, cálculo yields en cascada
- [x] 23 · `production/order-detail.md` — `/production/orders/[id]` — Detalle orden: fases, progreso, aprobar, cancelar, link al batch generado
- [x] 24 · `production/batches.md` — `/production/batches` — Lista batches activos, filtros por fase/zona/cultivar
- [x] 25 · `production/batch-detail.md` — `/production/batches/[id]` — Centro del sistema: timeline, actividades, transacciones, quality tests, docs regulatorios, split/merge

### Dependencias

- **Necesita**: Fase 2 (cultivars, phases, flows), Fase 3 (zonas, productos, inventario)
- **Desbloquea**: Fase 5 (actividades, calidad, regulatorio sobre batches activos)

---

## FASE 5 — Actividades, Calidad y Regulatorio

**7 archivos** · Rutas: `(dashboard)/activities/`, `(dashboard)/quality/`, `(dashboard)/regulatory/`

Lo que ocurre durante la ejecución del batch.

### Documentación fundacional a consultar

- **Arquitectura**: §5 (Edge Function `execute-activity`), §4 (triggers de inventario), §9 (Supabase Storage para adjuntos)
- **Data model**: Dominio Actividades (scheduled→activities→resources→observations), Dominio Calidad (quality_tests, quality_test_results), Dominio Regulatorio (regulatory_documents), Principios de Diseño (template→instancia, campos dinámicos via JSONB, transacciones inmutables)

### Tablas involucradas

| Tabla                       | Dominio     | Uso en esta fase                     |
| --------------------------- | ----------- | ------------------------------------ |
| scheduled_activities        | Actividades | R/W (vista calendario, re-programar) |
| activities                  | Actividades | R/W (ejecutar, registrar)            |
| activity_resources          | Actividades | W (recursos consumidos)              |
| activity_observations       | Actividades | R/W (observaciones de campo)         |
| activity_templates          | Actividades | R (template para ejecución)          |
| activity_template_resources | Actividades | R (recursos planeados)               |
| activity_template_checklist | Actividades | R (pasos de verificación)            |
| quality_tests               | Calidad     | R/W (crear, completar tests)         |
| quality_test_results        | Calidad     | R/W (resultados por parámetro)       |
| regulatory_documents        | Regulatorio | R/W (subir, editar docs)             |
| regulatory_doc_types        | Regulatorio | R (schema de campos)                 |
| batches                     | Nexo        | R (contexto)                         |
| inventory_items             | Inventario  | R (selección de lote para recursos)  |
| inventory_transactions      | Inventario  | W (generadas al ejecutar actividad)  |
| phytosanitary_agents        | Producción  | R (catálogo para observaciones MIPE) |
| attachments                 | Operaciones | R/W (fotos)                          |

### ENUMs

| ENUM                      | Valores                                                                  | Tabla.campo                          |
| ------------------------- | ------------------------------------------------------------------------ | ------------------------------------ |
| scheduled_activity_status | pending \| completed \| skipped \| overdue                               | scheduled_activities.status          |
| activity_status           | in_progress \| completed \| cancelled                                    | activities.status                    |
| observation_type          | pest \| disease \| deficiency \| environmental \| general \| measurement | activity_observations.type           |
| observation_severity      | info \| low \| medium \| high \| critical                                | activity_observations.severity       |
| plant_part                | root \| stem \| leaf \| flower \| fruit \| whole_plant                   | activity_observations.plant_part     |
| incidence_unit            | count \| percentage                                                      | activity_observations.incidence_unit |
| test_status               | pending \| in_progress \| completed \| failed \| rejected                | quality_tests.status                 |
| doc_status                | draft \| valid \| expired \| revoked \| superseded                       | regulatory_documents.status          |

### Archivos PRD

- [x] 26 · `activities/schedule.md` — `/activities/schedule` — Vista calendario de scheduled_activities, filtros, re-programar
- [x] 27 · `activities/execute.md` — `/activities/execute/[id]` — Formulario ejecución: recursos escalados, checklist, observaciones, fotos
- [x] 28 · `activities/history.md` — `/activities/history` — Historial actividades ejecutadas con filtros y detalle
- [x] 29 · `quality/tests.md` — `/quality/tests` — Lista tests, crear test, filtros por batch/estado/tipo
- [x] 30 · `quality/test-detail.md` — `/quality/tests/[id]` — Capturar resultados por parámetro, vincular CoA, overall_pass
- [x] 31 · `regulatory/documents.md` — `/regulatory/documents` — Lista documentos con status (valid/expiring/expired), subir nuevo
- [x] 32 · `regulatory/document-detail.md` — `/regulatory/documents/[id]` — Formulario dinámico por doc_type, adjunto, historial versiones

### Dependencias

- **Necesita**: Fase 2 (templates, doc_types), Fase 3 (productos, zonas), Fase 4 (batches activos, scheduled_activities)
- **Desbloquea**: Fase 6 (alertas reaccionan a actividades vencidas, calidad fallida), Fase 7 (transacciones generadas por ejecución)

---

## FASE 6 — Operaciones

**4 archivos** · Rutas: `(dashboard)/operations/`

Soporte transversal: IoT, alertas, costos, inventario visible.

### Documentación fundacional a consultar

- **Arquitectura**: §10 Monitoreo Ambiental (IoT pipeline, webhook de sensores), §8 Procesamiento Asíncrono (pg_cron jobs: check_expiring_documents, check_overdue_activities, check_low_inventory, check_stale_batches, check_env_readings, expire_documents), §4 (triggers)
- **Data model**: Dominio Operaciones (overhead_costs, sensors, environmental_readings, alerts, attachments), Relaciones Cross-Domain (alerts→entity polimórfico)

### Tablas involucradas

| Tabla                  | Dominio     | Uso en esta fase                      |
| ---------------------- | ----------- | ------------------------------------- |
| alerts                 | Operaciones | R/W (listar, acknowledge, resolve)    |
| environmental_readings | Operaciones | R (series temporales)                 |
| sensors                | Operaciones | R/W (CRUD sensores)                   |
| overhead_costs         | Operaciones | R/W (registro costos overhead)        |
| attachments            | Operaciones | R (adjuntos genéricos)                |
| zones                  | Áreas       | R (filtro por zona)                   |
| batches                | Nexo        | R (contexto de alerta)                |
| cultivars              | Producción  | R (condiciones óptimas para comparar) |
| facilities             | Áreas       | R (asignación de costos)              |

### ENUMs

| ENUM             | Valores                                                                                                                                                                                                 | Tabla.campo                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| alert_type       | overdue_activity \| low_inventory \| stale_batch \| expiring_item \| env_out_of_range \| order_delayed \| quality_failed \| regulatory_expiring \| regulatory_missing \| pest_detected \| phi_violation | alerts.type                      |
| alert_severity   | info \| warning \| high \| critical                                                                                                                                                                     | alerts.severity                  |
| alert_status     | pending \| acknowledged \| resolved                                                                                                                                                                     | alerts.status                    |
| sensor_type      | temperature \| humidity \| co2 \| light \| ec \| ph \| soil_moisture \| vpd                                                                                                                             | sensors.type                     |
| env_parameter    | temperature \| humidity \| co2 \| light_ppfd \| ec \| ph \| vpd                                                                                                                                         | environmental_readings.parameter |
| cost_type        | energy \| rent \| depreciation \| insurance \| maintenance \| labor_fixed \| other                                                                                                                      | overhead_costs.cost_type         |
| allocation_basis | per_m2 \| per_plant \| per_batch \| per_zone \| even_split                                                                                                                                              | overhead_costs.allocation_basis  |

### Archivos PRD

- [x] 33 · `operations/alerts.md` — `/operations/alerts` — Lista alertas activas/resueltas, acknowledge, resolve, filtros por severidad
- [x] 34 · `operations/environmental.md` — `/operations/environmental` — Monitor ambiental: lecturas tiempo real, series temporales por zona/parámetro
- [x] 35 · `operations/sensors.md` — `/operations/sensors` — CRUD sensores, calibración, estado activo/inactivo
- [x] 36 · `operations/costs.md` — `/operations/costs` — Registro overhead costs, prorrateo, COGS por batch

### Dependencias

- **Necesita**: Fase 3 (zonas, facilities), Fase 4 (batches para contexto de alertas), Fase 5 (actividades vencidas, calidad, regulatory generan alertas)
- **Desbloquea**: Fase 9 (Dashboard agrega alertas y métricas ambientales)

---

## FASE 7 — Inventario Operativo

**2 archivos** · Rutas: `(dashboard)/inventory/`

Van aquí porque dependen de que existan productos, zonas y batches ya definidos.

### Documentación fundacional a consultar

- **Arquitectura**: §4 (trigger trg_update_inventory_balance), §5 (PostgREST para lectura)
- **Data model**: Dominio Inventario (inventory_items, inventory_transactions), Principios de Diseño (transacciones inmutables, append-only, estado se reconstruye desde el log)

### Tablas involucradas

| Tabla                  | Dominio    | Uso en esta fase                                                          |
| ---------------------- | ---------- | ------------------------------------------------------------------------- |
| inventory_items        | Inventario | R/W (stock actual, ajustes, transferencias)                               |
| inventory_transactions | Inventario | R (log inmutable, solo lectura en esta UI) / W (ajustes y transferencias) |
| products               | Inventario | R (referencia)                                                            |
| zones                  | Áreas      | R (ubicación)                                                             |
| batches                | Nexo       | R (contexto)                                                              |
| units_of_measure       | Inventario | R (unidades)                                                              |

### ENUMs

| ENUM             | Valores                                                                                                                                                                    | Tabla.campo                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| transaction_type | receipt \| consumption \| application \| transfer_out \| transfer_in \| transformation_out \| transformation_in \| adjustment \| waste \| return \| reservation \| release | inventory_transactions.type |
| source_type      | purchase \| production \| transfer \| transformation                                                                                                                       | inventory_items.source_type |
| lot_status       | available \| quarantine \| expired \| depleted                                                                                                                             | inventory_items.lot_status  |

### Archivos PRD

- [x] 37 · `inventory/items.md` — `/inventory/items` — Stock actual por producto/zona/lote, ajustes manuales, transferencias
- [x] 38 · `inventory/transactions.md` — `/inventory/transactions` — Log inmutable (read-only), filtros por batch/zona/fase/tipo, exportar CSV

### Dependencias

- **Necesita**: Fase 3 (productos, zonas, suppliers), Fase 4 (batches), Fase 5 (transacciones generadas por actividades)
- **Desbloquea**: Fase 9 (Dashboard muestra métricas de inventario)

---

## FASE 8 — Field / Operario en Campo

**4 archivos** · Rutas: `(field)/`

Dependen de que todo lo anterior esté configurado y operativo. Layout simplificado para móvil.

### Documentación fundacional a consultar

- **Arquitectura**: §1 Estrategia de Conectividad (cola de reintentos, Service Worker), §3 (App Campo PWA), §6 (Client Components para formularios)
- **Data model**: Cross-cutting — usa actividades, batches, zonas, observaciones, transacciones de inventario

### Tablas involucradas

| Tabla                       | Dominio     | Uso en esta fase                |
| --------------------------- | ----------- | ------------------------------- |
| scheduled_activities        | Actividades | R (actividades del día)         |
| activities                  | Actividades | R/W (ejecutar)                  |
| activity_resources          | Actividades | W (registrar recursos)          |
| activity_observations       | Actividades | R/W (observaciones ad-hoc)      |
| activity_template_checklist | Actividades | R (checklist)                   |
| batches                     | Nexo        | R (contexto, scan QR)           |
| zones                       | Áreas       | R (contexto, scan QR)           |
| inventory_items             | Inventario  | R (selección de lote)           |
| inventory_transactions      | Inventario  | W (generadas por ejecución)     |
| phytosanitary_agents        | Producción  | R (catálogo para observaciones) |
| attachments                 | Operaciones | W (fotos)                       |

### ENUMs

Reutiliza los ENUMs de fases anteriores: scheduled_activity_status, activity_status, observation_type, observation_severity, plant_part, incidence_unit, transaction_type.

### Archivos PRD

- [ ] 39 · `field/today.md` — `/field/today` — Vista móvil: actividades del día del operario, estado, acceso rápido
- [ ] 40 · `field/execute.md` — `/field/execute/[id]` — Ejecución optimizada móvil: recursos, checklist, fotos, indicador cola de reintentos
- [ ] 41 · `field/observe.md` — `/field/observe` — Observación ad-hoc: tipo, severidad, batch/zona, foto
- [ ] 42 · `field/scan.md` — `/field/scan` — Escáner QR: identifica batch o zona → acciones contextuales

### Dependencias

- **Necesita**: Todas las fases anteriores (1-7) — Field opera sobre datos ya configurados
- **Desbloquea**: Fase 9 (Dashboard muestra actividades del día)

### Consideraciones especiales

- **Offline**: Cola de reintentos via Service Worker (Serwist). Formularios se guardan en IndexedDB y se envían al recuperar conexión
- **Layout**: `(field)/layout.tsx` — layout simplificado para móvil, sin sidebar completo
- **Performance**: Client Components optimizados para dispositivos móviles de gama media

---

## FASE 9 — Dashboard

**1 archivo** · Ruta: `(dashboard)/`

Al final, porque agrega información de todas las secciones anteriores.

### Documentación fundacional a consultar

- **Arquitectura**: §6 (Server Components para dashboards, SSR), §3 (Dashboard Web)
- **Data model**: Agregaciones read-only de todos los dominios. Consultar §7 Índices Recomendados y Queries Habilitadas para queries analíticas

### Tablas involucradas

| Tabla                  | Dominio     | Uso                           |
| ---------------------- | ----------- | ----------------------------- |
| batches                | Nexo        | R (batches activos, métricas) |
| production_orders      | Órdenes     | R (órdenes en progreso)       |
| scheduled_activities   | Actividades | R (actividades del día)       |
| alerts                 | Operaciones | R (alertas pendientes)        |
| inventory_items        | Inventario  | R (stock bajo)                |
| environmental_readings | Operaciones | R (últimas lecturas)          |
| quality_tests          | Calidad     | R (tests recientes)           |
| regulatory_documents   | Regulatorio | R (docs por vencer)           |

### ENUMs

Reutiliza ENUMs de todas las fases (read-only).

### Archivos PRD

- [ ] 43 · `dashboard/home.md` — `/` — KPIs clave, batches activos, alertas pendientes, actividades del día, accesos rápidos por rol

### Dependencias

- **Necesita**: Todas las fases anteriores (1-8)
- **Desbloquea**: Nada (es la agregación final)

---

## Resumen

| Fase      | Grupo                               | Archivos | Acumulado |
| --------- | ----------------------------------- | -------- | --------- |
| 1         | Auth                                | 5        | 5         |
| 2         | Settings                            | 8        | 13        |
| 3         | Áreas + Inventario base             | 8        | 21        |
| 4         | Producción                          | 4        | 25        |
| 5         | Actividades + Calidad + Regulatorio | 7        | 32        |
| 6         | Operaciones                         | 4        | 36        |
| 7         | Inventario operativo                | 2        | 38        |
| 8         | Field                               | 4        | 42        |
| 9         | Dashboard                           | 1        | 43        |
| **Total** |                                     | **43**   |           |
