# ALQUEMIST

## Modelo de Datos Definitivo

*Sistema de Gestión para Cultivos de Cualquier Tipo*

46 tablas · 9 dominios + nexo · 9 tablas CORE

Febrero 2026 · v2.0

---

## Tabla de Contenidos

1. Visión General de la Arquitectura
2. Principios de Diseño
3. Flujo de Datos General
4. Diccionario de Tablas
   - Dominio: Sistema
   - Dominio: Producción
   - Dominio: Áreas
   - Dominio: Inventario
   - Dominio: Actividades
   - Dominio: Nexo (Batches)
   - Dominio: Órdenes
   - Dominio: Calidad
   - Dominio: Regulatorio
   - Dominio: Operaciones
5. Relaciones Cross-Domain
6. Flujos Operativos Detallados
7. Índices Recomendados y Queries Habilitadas

---

## Visión General de la Arquitectura

Alquemist es un modelo de datos diseñado para gestionar el ciclo completo de producción agrícola, desde la semilla hasta el producto final empacado. Su arquitectura se organiza en **9 dominios independientes** conectados por un nexo central (**batches**), lo que permite que cada dominio evolucione sin romper los demás.

El modelo soporta cualquier tipo de cultivo (cannabis, arándanos, fresas, hortalizas) mediante fases de producción configurables por tipo de cultivo. Las órdenes de producción permiten seleccionar subconjuntos de fases, habilitando que viveros, procesadores y cultivadores full-cycle operen sobre el mismo sistema.

| Dominio | Tablas | Propósito |
|---|---|---|
| **Sistema** ⚙️ | companies, users | Multi-tenancy, roles y permisos |
| **Producción** 🧬 | crop_types, cultivars, production_phases, phase_product_flows, phytosanitary_agents | QUÉ se produce — fases configurables, transformaciones por cultivar, catálogo fitosanitario |
| **Áreas** 🏭 | facilities, zones, zone_structures, plant_positions | DÓNDE — jerarquía espacial flexible |
| **Inventario** 📦 | resource_categories, products, units_of_measure, suppliers, inventory_items, inventory_transactions, recipes, recipe_executions | CON QUÉ — recursos con transacciones inmutables |
| **Actividades** 📋 | activity_types, activity_templates, activity_template_phases, activity_template_resources, activity_template_checklist, cultivation_schedules, scheduled_activities, activities, activity_resources, activity_observations | QUÉ se hace — template → scheduled → activity |
| **Nexo** 🌱 | batches, batch_lineage | Conecta todo — lote de producción central |
| **Órdenes** 📋 | production_orders, production_order_phases | QUÉ fases ejecutar — con entry/exit point |
| **Calidad** 🔬 | quality_tests, quality_test_results | CUMPLE estándar — laboratorio flexible |
| **Regulatorio** 📜 | regulatory_doc_types, product_regulatory_requirements, regulatory_documents, shipment_doc_requirements, shipments, shipment_items | CUMPLE normativa — documentación y trazabilidad de transporte |
| **Operaciones** 📡 | overhead_costs, sensors, environmental_readings, alerts, attachments | Soporte transversal — IoT, costos, alertas |

---

## Principios de Diseño

**Dominios independientes:** Cada dominio puede evolucionar sin afectar a los demás. Las dependencias cross-domain se limitan a FKs bien definidas.

**Batch como nexo:** El lote de producción conecta los 9 dominios: sabe su cultivar, zona, producto actual, schedule, orden, fase actual, y puede tener tests de calidad, lecturas ambientales, documentos regulatorios y envíos.

**Transacciones inmutables:** inventory_transactions es append-only: nunca se edita ni borra. Todo el estado del inventario se reconstruye desde el log. Cada transacción registra contexto completo (zona + batch + fase + actividad + usuario).

**Fases configurables:** Cada tipo de cultivo define sus propias fases. El status del batch se deriva de current_phase_id, no de valores hardcoded. Cannabis puede tener 8 fases (incluyendo madre), arándanos 4, y fresas 5 sin cambiar código. Las fases soportan bifurcaciones via depends_on_phase_id: la fase 'madre' bifurca desde 'vegetativo' en paralelo a 'floración', permitiendo ciclos de producción de clones indefinidos.

**Transformación por cultivar:** phase_product_flows es la ÚNICA fuente de verdad para qué entra y sale de cada fase, definida a nivel de cultivar. Cada variedad tiene sus propios productos, yields y cadena de transformación. Las fases (estructura del ciclo) son del crop_type; los flows (qué se transforma y con qué rendimiento) son del cultivar.

**Órdenes flexibles:** entry_phase_id y exit_phase_id permiten que una orden cubra un subconjunto de fases. Vivero: fases 1-2. Procesador: fases 5-7. Full-cycle: fases 1-7. Madre: fases 1-3 + madre (bifurcación). La generación de order_phases sigue la cadena depends_on desde entry hasta exit, soportando tanto el flujo lineal como las bifurcaciones.

**Producto como fuente de verdad de unidades:** Cada producto define su default_unit_id. Conversiones misma dimensión via units_of_measure. Conversiones cross-dimensión via products.density_g_per_ml.

**Template → Instancia:** Los patrones de configuración se definen como templates reutilizables (activity_templates, regulatory_doc_types) y las ejecuciones reales son instancias concretas (activities, regulatory_documents). Esto aplica consistentemente en actividades, calidad y documentación regulatoria.

**Campos dinámicos via JSONB:** Los tipos de documento regulatorio definen campos requeridos en un JSON schema (required_fields); las instancias guardan valores en field_data. Esto evita crear N columnas por tipo y permite configuración por empresa sin migraciones.

**Auditoría universal:** Todas las tablas incluyen created_at, updated_at, created_by, updated_by. Catálogos usan is_active como soft-delete. Tablas transaccionales son append-only.

---

## Flujo de Datos General

El modelo opera en dos cadenas principales que convergen en el batch:

**Cadena de Configuración y Planificación**

cultivar → production_phases → production_order → batch

Se selecciona un cultivar, el sistema carga sus fases, se crea una orden con entry/exit point, y al aprobar se genera el batch con toda su configuración.

**Tres Rutas de Ingreso de Material Vegetal**

El material vegetal entra al sistema por tres rutas, cada una con diferente entry_phase y trazabilidad:

semilla externa → shipment → inventory_item → orden (entry=germinación) → batch
esqueje externo → shipment → inventory_item → orden (entry=propagación) → batch
esqueje interno → planta madre (batch activo en fase madre) → CLONE-CUT → inventory_item → orden (entry=propagación) → batch

Las tres rutas convergen en la misma cadena de ejecución operativa una vez creado el batch. La trazabilidad hacia atrás varía: material externo llega hasta shipment → supplier → docs regulatorios; material interno llega hasta el batch madre → su propio origen.

**Cadena de Ejecución Operativa**

activity_template → scheduled_activity → activity → inventory_transaction → inventory_item

Los templates definen la receta de actividad. Al programar se toma un snapshot. Al ejecutar, el operario registra recursos reales que generan transacciones inmutables de inventario.

**Cadenas de Soporte**

sensor → environmental_reading · quality_test → quality_test_results · overhead_costs → allocation a batches

**Cadena Regulatoria**

regulatory_doc_types → product_regulatory_requirements → regulatory_documents · shipments → shipment_items → inventory_items

Los tipos de documento definen qué se necesita. Los requerimientos vinculan tipos con productos/categorías. Los documentos capturados satisfacen esos requerimientos. Los shipments registran el viaje completo del material y al confirmar recepción crean inventory_items.

**Vínculo central:** Todo se vincula a **batch** + **zone** + **phase**. Esta tripleta permite cualquier consulta analítica.

---

## Diccionario de Tablas

Definición completa de las 46 tablas organizadas por dominio. Los campos marcados como 'cross-domain' son FKs que conectan dominios entre sí. Todas las tablas incluyen campos de auditoría estándar (created_at, updated_at, created_by, updated_by) que no se listan explícitamente.

---

### Dominio: Sistema

#### companies

Empresa / tenant — raíz del multi-tenancy. Cada empresa opera de forma aislada con su propia configuración de moneda, zona horaria y features habilitados.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **name** | VARCHAR | *'AgroTech Colombia SAS'* |
| **legal_id** | VARCHAR opt | *NIT, RFC, EIN* |
| **country** | CHAR(2) | *'CO', 'US', 'MX'* |
| **timezone** | VARCHAR | *'America/Bogota'* |
| **currency** | CHAR(3) | *'COP', 'USD'* |
| **settings** | JSONB opt | *{logo_url, regulatory_mode, features_enabled, regulatory_blocking_enabled}* |
| **is_active** | BOOLEAN | *default true — soft delete* |

#### users

Usuarios del sistema con rol y permisos granulares. Cada usuario pertenece a una empresa y opcionalmente a una instalación.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **company_id** | FK → companies | |
| **email** | VARCHAR UNIQUE | |
| **full_name** | VARCHAR | |
| **role** | ENUM | *admin \| manager \| supervisor \| operator \| viewer* |
| **phone** | VARCHAR opt | |
| **assigned_facility_id** | FK → facilities opt | *facility principal del usuario* |
| **permissions** | JSONB opt | *{can_approve_orders, can_adjust_inventory, can_delete}* |
| **is_active** | BOOLEAN | *default true* |
| **last_login_at** | TIMESTAMPTZ opt | |

---

### Dominio: Producción

#### crop_types

Tipo de cultivo que define el universo de fases y productos. Cada crop_type tiene sus propias production_phases configurables, lo que permite que cannabis tenga 8 fases (incluyendo madre para clonación), arándanos 4, y fresas 5 sin cambiar código.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **code** | VARCHAR UNIQUE | *'cannabis', 'blueberry', 'strawberry'* |
| **name** | VARCHAR | *'Cannabis Medicinal'* |
| **scientific_name** | VARCHAR opt | *'Cannabis sativa L.'* |
| **category** | ENUM | *annual \| perennial \| biennial* |
| **regulatory_framework** | VARCHAR opt | *'Resolución 227/2022'* |
| **icon** | VARCHAR opt | |
| **is_active** | BOOLEAN | *default true* |

#### cultivars [CORE]

Variedad específica dentro de un tipo de cultivo. Define características de rendimiento, ciclo, perfil objetivo y condiciones óptimas de cultivo. Es el punto de partida para cualquier orden de producción.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **crop_type_id** | FK → crop_types | |
| **code** | VARCHAR UNIQUE | *'GELATO-41', 'DUKE-BB'* |
| **name** | VARCHAR | *'Gelato #41'* |
| **breeder** | VARCHAR opt | *'Seed Junky Genetics'* |
| **genetics** | VARCHAR opt | *'Sunset Sherbet × Thin Mint GSC'* |
| **default_cycle_days** | INT opt | *127 — duración total del ciclo* |
| **phase_durations** | JSONB opt | *{germination:7, vegetative:28, flowering:63}* |
| **expected_yield_per_plant_g** | DECIMAL opt | *500* |
| **expected_dry_ratio** | DECIMAL opt | *0.25 (25% peso húmedo → seco)* |
| **target_profile** | JSONB opt | *{THC:'20-25%', terpenes:['limonene']}* |
| **quality_grade** | VARCHAR opt | *'Premium Indoor'* |
| **optimal_conditions** | JSONB opt | *{temp:'20-26°C', RH:'40-60%', EC:'1.2-2.4'}* |
| **density_plants_per_m2** | DECIMAL opt | *9* |
| **notes** | TEXT opt | |
| **is_active** | BOOLEAN | *default true* |

#### production_phases [CORE]

Fases de producción CONFIGURABLES por tipo de cultivo. Definen la secuencia del ciclo productivo. El status del batch se deriva directamente de la fase actual. Cada fase indica si transforma producto, si destruye el input, y si puede ser entry o exit point para órdenes parciales. La combinación is_transformation + is_destructive define el comportamiento: is_destructive=true destruye el input (cosecha), is_destructive=false lo preserva (clonación desde planta madre). Las fases soportan bifurcaciones via depends_on_phase_id: la fase 'madre' depende de 'vegetativo' y existe en paralelo a 'floración', permitiendo que una orden derive hacia mantenimiento de madre en vez de continuar el ciclo productivo.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **crop_type_id** | FK → crop_types | |
| **code** | VARCHAR | *'germination', 'flowering', 'drying', 'madre'* |
| **name** | VARCHAR | *'Floración', 'Planta Madre'* |
| **sort_order** | INT | *secuencia: 1, 2, 3... (madre=8, fuera del flujo lineal)* |
| **is_transformation** | BOOLEAN | *true = producto cambia de estado* |
| **is_destructive** | BOOLEAN | *true = input se destruye (cosecha). false = input se preserva (madre produce clones sin destruirse)* |
| **default_duration_days** | INT opt | *63 floración, 14 secado, null para madre (indefinida)* |
| **requires_zone_change** | BOOLEAN | *true si debe cambiar de sala* |
| **can_skip** | BOOLEAN | *default false — fase opcional en órdenes* |
| **can_be_entry_point** | BOOLEAN | *default false — comprar clones = empezar en propagación* |
| **can_be_exit_point** | BOOLEAN | *default false — vender sin empacar = terminar en secado* |
| **depends_on_phase_id** | FK → self opt | *secado depende de cosecha, madre depende de vegetativo* |
| **icon, color** | VARCHAR opt | |

Ejemplo de fases para cannabis medicinal:

| sort_order | code | is_transformation | is_destructive | depends_on | Notas |
|---|---|---|---|---|---|
| 1 | germination | true | true | — | semillas → plántulas |
| 2 | propagation | true | false | germination | enraizamiento de plántulas/esquejes |
| 3 | vegetative | true | false | propagation | crecimiento vegetativo |
| 4 | flowering | true | false | vegetative | floración (fotoperiodo 12/12) |
| 5 | harvest | true | true | flowering | cosecha: destruye plantas, genera flor húmeda |
| 6 | drying | true | true | harvest | secado: húmeda → seca |
| 7 | packaging | true | true | drying | empaque: granel → unidades |
| 8 | madre | true | false | vegetative | **bifurcación**: produce clones sin destruirse |

La fase madre bifurca desde vegetativo en paralelo a floración. Una orden de producción de tipo "madre" usa entry_phase=germinación, exit_phase=madre, y solo incluye las fases germinación → propagación → vegetativo → madre. El batch permanece en fase madre indefinidamente, recibiendo actividades periódicas de clonación.

#### phase_product_flows [CORE]

FUENTE DE VERDAD de transformación — define QUÉ ENTRA y QUÉ SALE de cada fase **para cada cultivar**. Cada variedad tiene sus propios productos y rendimientos de transformación. Cuando un batch avanza de fase, esta tabla determina qué inventory_items se crean y destruyen. La cadena vegetal se deriva de flows consecutivos: el output de la fase N es el input de la fase N+1. Las fases (estructura del ciclo) pertenecen al crop_type; los flows (qué se transforma y con qué rendimiento) pertenecen al cultivar.

Al crear un cultivar nuevo, la UI ofrece "Copiar flows de un cultivar existente" del mismo crop_type como punto de partida.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **cultivar_id** | FK → cultivars | *cada cultivar define sus propios flows — no hay herencia de crop_type* |
| **phase_id** | FK → production_phases | *el par (cultivar_id, phase_id) es el contexto completo* |
| **direction** | ENUM | *'input' \| 'output'* |
| **product_role** | ENUM | *'primary' \| 'secondary' \| 'byproduct' \| 'waste'* |
| **product_id** | FK → products opt | *producto específico (cultivar-specific): WET-GELATO, DRY-BLUEDREAM* |
| **product_category_id** | FK → resource_categories opt | *O categoría genérica para insumos no cultivar-specific* |
| **expected_yield_pct** | DECIMAL opt | *90% germinación, 25% seco/húmedo — varía por cultivar* |
| **expected_quantity_per_input** | DECIMAL opt | *500g flor húmeda por planta (Gelato), 350g (Blue Dream)* |
| **unit_id** | FK → units_of_measure opt | |
| **is_required** | BOOLEAN | *default true — false = output opcional (trim)* |
| **sort_order** | INT | |
| **notes** | TEXT opt | |

Los productos de un cultivar se derivan de esta tabla: `SELECT DISTINCT product_id FROM phase_product_flows WHERE cultivar_id = X AND product_id IS NOT NULL`. No se necesita una tabla separada de catálogo de SKUs por cultivar.

#### phytosanitary_agents

Catálogo de plagas, enfermedades y otros agentes fitosanitarios configurables por empresa. Permite selección estandarizada durante monitoreos MIPE, analytics limpios (GROUP BY agent_id) y guías visuales para los operarios. Opcionalmente filtrable por tipo de cultivo.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **company_id** | FK → companies | *cada empresa configura su catálogo* |
| **type** | ENUM | *'pest' \| 'disease' \| 'deficiency' \| 'abiotic'* |
| **category** | ENUM | *'insect' \| 'mite' \| 'fungus' \| 'bacteria' \| 'virus' \| 'nematode' \| 'mollusk' \| 'nutrient' \| 'environmental' \| 'other'* |
| **code** | VARCHAR UNIQUE per company | *'ACARO_BLANCO', 'BOTRYTIS_SP', 'DEF_CA'* |
| **common_name** | VARCHAR | *'Ácaro blanco', 'Moho gris', 'Deficiencia de Calcio'* |
| **scientific_name** | VARCHAR opt | *'Polyphagotarsonemus latus', 'Botrytis cinerea'* |
| **default_plant_parts** | JSONB opt | *['leaf', 'flower'] — partes que típicamente afecta, preselección en UI* |
| **visual_symptoms** | TEXT opt | *'Hojas enrolladas hacia abajo, bordes cloróticos, aspecto aceitoso en envés'* |
| **recommended_actions** | TEXT opt | *'Aplicar acaricida de contacto, aumentar ventilación, reducir densidad'* |
| **severity_scale** | JSONB opt | *{low:'<10% área', medium:'10-30%', high:'30-60%', critical:'>60%'}* |
| **crop_type_id** | FK → crop_types opt | *null = aplica a cualquier cultivo, o filtrar por tipo específico* |
| **sort_order** | INT | |
| **is_active** | BOOLEAN | *default true* |

La UI filtra agentes por crop_type del batch activo: primero los específicos del crop_type, luego los genéricos (crop_type_id IS NULL), y siempre ofrece opción "Otro" que permite registrar texto libre en activity_observations.description.

---

### Dominio: Áreas

#### facilities

Instalación física — raíz de la jerarquía espacial. Cada facility pertenece a una empresa y contiene N zonas. Los campos calculados se derivan de las zonas hijas.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **company_id** | FK → companies | |
| **name** | VARCHAR | *'Invernadero Principal'* |
| **type** | ENUM | *indoor_warehouse \| greenhouse \| tunnel \| open_field \| vertical_farm* |
| **total_footprint_m2** | DECIMAL | *500.00* |
| **total_growing_area_m2** | DECIMAL calc | *Σ(zones.effective_growing_area_m2)* |
| **total_plant_capacity** | INT calc | *Σ(zones.plant_capacity)* |
| **address** | TEXT | |
| **latitude, longitude** | DECIMAL opt | |
| **is_active** | BOOLEAN | *default true* |

#### zones [CORE]

Espacio físico real (sala, nave, lote) — UNIDAD OPERATIVA PRINCIPAL. Las zonas son donde ocurren las actividades y donde viven los batches. La capacidad se calcula desde zone_structures si existen, o se establece directamente para zonas simples (campo abierto, túneles sin estructuras internas).

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **facility_id** | FK → facilities | |
| **name** | VARCHAR | *'Sala Vegetativo A', 'Lote Norte'* |
| **purpose** | ENUM | *propagation \| vegetation \| flowering \| drying \| processing \| storage \| multipurpose* |
| **environment** | ENUM | *indoor_controlled \| greenhouse \| tunnel \| open_field* |
| **area_m2** | DECIMAL | *área de piso* |
| **height_m** | DECIMAL opt | |
| **effective_growing_area_m2** | DECIMAL calc | *con structures: Σ(area×levels), sin: area_m2* |
| **plant_capacity** | INT calc | *con structures: Σ(max_positions), sin: area_m2 × density* |
| **climate_config** | JSONB opt | *{temp, HR, CO₂, fotoperiodo}* |
| **status** | ENUM | *active \| maintenance \| inactive* |

#### zone_structures

OPCIONAL — Configuración física dentro de una zona para calcular capacidad. Solo necesaria para zonas con racks verticales, mesas rolling, hileras, o cualquier estructura que multiplique el área efectiva. Zonas simples (campo abierto) no requieren esta tabla.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **zone_id** | FK → zones | |
| **name** | VARCHAR | *'Rack A1', 'Hilera 3', 'Mesa Rolling B'* |
| **type** | ENUM | *mobile_rack \| fixed_rack \| rolling_bench \| row \| bed \| trellis_row \| nft_channel* |
| **length_m** | DECIMAL | |
| **width_m** | DECIMAL | |
| **is_mobile** | BOOLEAN | *default false* |
| **num_levels** | INT | *default 1 — suelo/hilera=1, racks=2-8* |
| **positions_per_level** | INT opt | *posiciones de planta por nivel* |
| **max_positions** | INT calc | *num_levels × positions_per_level* |
| **level_config** | JSONB opt | *[{level:1, height_m, lighting, irrigation, substrate}]* |
| **spacing_cm** | DECIMAL opt | *entre plantas* |
| **pot_size_L** | DECIMAL opt | |

#### plant_positions

OPCIONAL — Spot individual de planta. Solo se usa cuando se requiere trazabilidad por planta individual (regulación cannabis medicinal, investigación). Para cultivos extensivos NO se crean posiciones: el batch opera a nivel de zona.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **zone_id** | FK → zones | |
| **structure_id** | FK → zone_structures opt | *si la zona tiene estructuras* |
| **level_number** | INT opt | *nivel dentro de la estructura* |
| **position_index** | INT | |
| **label** | VARCHAR opt | *'A1-L2-P05' para trazabilidad* |
| **status** | ENUM | *empty \| planted \| harvested \| maintenance* |
| **current_batch_id** | FK → batches opt | *cross-domain* |

---

### Dominio: Inventario

#### resource_categories

Categorías jerárquicas de recursos con 11 tipos base configurables y herencia padre-hijo. Determinan el comportamiento: si es consumible, depreciable o transformable.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **company_id** | UUID | *NOT NULL DEFAULT get_my_company_id() — scoped per tenant* |
| **parent_id** | FK → self opt | *nutrient → nutrient.salt → nutrient.salt.calcium* |
| **name, code** | VARCHAR | |
| **icon, color** | VARCHAR opt | |
| **is_consumable** | BOOLEAN | *true = se agota (insumos, EPP)* |
| **is_depreciable** | BOOLEAN | *true = equipos con vida útil* |
| **is_transformable** | BOOLEAN | *true = material vegetal* |
| **default_lot_tracking** | ENUM | *required \| optional \| none* |
| **is_active** | BOOLEAN | *default true* |

#### products [CORE]

Catálogo maestro — TODO lo que existe como recurso o producto. FUENTE DE VERDAD para unidades de medida. Incluye propiedades de conversión producto-específicas para transformaciones cross-dimensión (densidad para volumen↔masa). La cadena de transformación se deriva de phase_product_flows a nivel de cultivar.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **sku** | VARCHAR UNIQUE | *SEM-GELATO-FEM, CANO3-25KG* |
| **name** | VARCHAR | |
| **category_id** | FK → resource_categories | |
| **default_unit_id** | FK → units_of_measure | *FUENTE DE VERDAD de unidad* |
| **cultivar_id** | FK → cultivars opt | *vincula producto vegetal con variedad (cross-domain)* |
| **procurement_type** | ENUM | *purchased \| produced \| both* |
| **lot_tracking** | ENUM | *required \| optional \| none* |
| **shelf_life_days** | INT opt | *auto-calcula vencimiento* |
| **phi_days** | INT opt | *Pre-Harvest Interval* |
| **rei_hours** | INT opt | *Re-Entry Interval* |
| **default_yield_pct** | DECIMAL opt | *90% germinación, 25% seco/húmedo* |
| **density_g_per_ml** | DECIMAL opt | *para convertir volumen↔masa en este producto* |
| **conversion_properties** | JSONB opt | *{ppm_factor, dilution_ratio}* |
| **default_price** | DECIMAL opt | |
| **price_currency** | CHAR(3) opt | *COP, USD* |
| **preferred_supplier_id** | FK → suppliers opt | |
| **requires_regulatory_docs** | BOOLEAN | *default false — true si tiene entries en product_regulatory_requirements* |
| **is_active** | BOOLEAN | *default true* |

#### units_of_measure

Unidades con conversiones dentro de la misma dimensión (kg→g, L→mL). Las conversiones cross-dimensión (volumen↔masa) viven en products.density_g_per_ml.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **company_id** | UUID | *NOT NULL DEFAULT get_my_company_id() — scoped per tenant* |
| **code, name** | VARCHAR | *kg / Kilogramo, mL / Mililitro* |
| **dimension** | ENUM | *mass \| volume \| count \| area \| energy \| time \| concentration* |
| **base_unit_id** | FK → self opt | *g para mass, mL para volume* |
| **to_base_factor** | DECIMAL | *×1000 para kg→g* |

#### suppliers

Proveedores de insumos y servicios.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **company_id** | FK → companies | |
| **name** | VARCHAR | |
| **contact_info** | JSONB | |
| **payment_terms** | VARCHAR opt | |
| **is_active** | BOOLEAN | *default true* |

#### inventory_items

Instancias de stock — CUÁNTO hay, DÓNDE, de QUÉ lote. Cada registro representa un lote específico de un producto en una ubicación. Los campos quantity_reserved y quantity_committed permiten control de disponibilidad en tiempo real.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **product_id** | FK → products | |
| **zone_id** | FK → zones opt | *dónde está almacenado (cross-domain)* |
| **quantity_available** | DECIMAL | |
| **quantity_reserved** | DECIMAL | *reservado para actividades programadas* |
| **quantity_committed** | DECIMAL | *comprometido en ejecución* |
| **unit_id** | FK → units_of_measure | |
| **batch_number** | VARCHAR opt | *lote interno* |
| **supplier_lot_number** | VARCHAR opt | |
| **cost_per_unit** | DECIMAL opt | |
| **expiration_date** | DATE opt | |
| **source_type** | ENUM | *purchase \| production \| transfer \| transformation* |
| **lot_status** | ENUM | *available \| quarantine \| expired \| depleted* |
| **shipment_item_id** | FK → shipment_items opt | *link al item del envío que originó este lote (cross-domain REG)* |
| **created_by** | UUID opt | |
| **updated_by** | UUID opt | |

#### inventory_transactions [CORE]

Log INMUTABLE (append-only) de cada movimiento de recurso. NUNCA se edita ni borra. Cada transacción registra contexto completo: zona, batch, fase, actividad y usuario, lo que permite reconstruir el estado del inventario en cualquier momento y calcular costos por cualquier dimensión.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **type** | ENUM | *receipt \| consumption \| application \| transfer_out \| transfer_in \| transformation_out \| transformation_in \| adjustment \| waste \| return \| reservation \| release* |
| **inventory_item_id** | FK → inventory_items | |
| **quantity** | DECIMAL | *siempre POSITIVO, type determina +/-* |
| **unit_id** | FK → units_of_measure | |
| **timestamp** | TIMESTAMPTZ | *momento exacto — inmutable* |
| **zone_id** | FK → zones opt | *cross-domain* |
| **batch_id** | FK → batches opt | *cross-domain* |
| **phase_id** | FK → production_phases opt | *cross-domain* |
| **activity_id** | FK → activities opt | *cross-domain* |
| **recipe_execution_id** | FK → recipe_executions opt | |
| **related_transaction_id** | FK → self opt | *vincula out↔in de transformación* |
| **target_item_id** | FK → inventory_items opt | *item destino creado* |
| **cost_per_unit** | DECIMAL opt | |
| **cost_total** | DECIMAL opt | |
| **user_id** | FK → users | |
| **reason** | TEXT opt | *obligatorio para waste y adjustment* |

#### recipes

Fórmulas / BOM (solución nutritiva, mezcla sustrato, etc.).

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **name, code** | VARCHAR | |
| **output_product_id** | FK → products | |
| **base_quantity** | DECIMAL | *1000L base* |
| **base_unit_id** | FK → units_of_measure | |
| **items** | JSONB | *[{product_id, quantity, unit_id}]* |
| **is_active** | BOOLEAN | *default true* |

#### recipe_executions

Cada ejecución de una receta — agrupa N transacciones de inventario.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **recipe_id** | FK → recipes | |
| **executed_by** | FK → users | |
| **scale_factor** | DECIMAL | *base 1000L, hice 500L → 0.5* |
| **output_quantity_expected** | DECIMAL | |
| **output_quantity_actual** | DECIMAL | |
| **yield_pct** | DECIMAL calc | *actual/expected × 100* |
| **batch_id** | FK → batches opt | *cross-domain* |
| **executed_at** | TIMESTAMPTZ | |

---

### Dominio: Actividades

#### activity_types

Tipos base de actividad (~15-30 registros). Clasificación de primer nivel para agrupación y reporting.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **name** | VARCHAR | *'Fertirrigación', 'Poda', 'Cosecha', 'Trasplante'* |
| **category** | VARCHAR opt | |
| **is_active** | BOOLEAN | *default true* |

#### activity_templates

Receta de actividad reutilizable con recursos, checklist y reglas de negocio. Al programar o ejecutar una actividad se toma un snapshot del estado actual del template; cambios futuros no afectan lo ya programado o ejecutado. Fases aplicables via tabla de unión activity_template_phases.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **code** | VARCHAR UNIQUE | *FERT-VEG-S1, HARV-MANUAL-CUT* |
| **activity_type_id** | FK → activity_types | |
| **name** | VARCHAR | *'Fertirrigación Vegetativa Sem 1-2'* |
| **frequency** | ENUM | *daily \| weekly \| biweekly \| once \| on_demand* |
| **estimated_duration_min** | INT | *30, 90, 360* |
| **trigger_day_from** | INT opt | *día mínimo del ciclo* |
| **trigger_day_to** | INT opt | *día máximo del ciclo* |
| **depends_on_template_id** | FK → self opt | *secado depende de cosecha* |
| **triggers_phase_change_id** | FK → production_phases opt | *al completar → avanza fase* |
| **triggers_transformation** | BOOLEAN | *cosecha genera transformation_out/in* |
| **metadata** | JSONB opt | *{EC_target, pH_target, temp_range, benchmarks}* |
| **is_active** | BOOLEAN | *default true* |

#### activity_template_phases

Tabla de unión template↔fases con FK enforcement e índices eficientes. UNIQUE(template_id, phase_id).

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **template_id** | FK → activity_templates | |
| **phase_id** | FK → production_phases | |

#### activity_template_resources

Recursos planeados por template con 5 modos de escalado automático según el contexto de ejecución.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **template_id** | FK → activity_templates | |
| **product_id** | FK → products | *conecta con catálogo inventario (cross-domain)* |
| **quantity** | DECIMAL | *0.8 (g/L), 5 (L/planta), 0.5 (horas)* |
| **quantity_basis** | ENUM | *fixed \| per_plant \| per_m2 \| per_zone \| per_L_solution* |
| **is_optional** | BOOLEAN | |
| **sort_order** | INT | |
| **notes** | TEXT opt | |

#### activity_template_checklist

Pasos del checklist por template — verificaciones obligatorias o informativas en campo.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **template_id** | FK → activity_templates | |
| **step_order** | INT | |
| **instruction** | TEXT | *'Verificar EC del drenaje'* |
| **is_critical** | BOOLEAN | *true = bloquea completar sin cumplir* |
| **requires_photo** | BOOLEAN | |
| **expected_value** | VARCHAR opt | *'5.8-6.2'* |
| **tolerance** | VARCHAR opt | *'±0.2'* |

#### cultivation_schedules

Plan maestro de cultivo — genera actividades automáticamente al crear un batch a partir de una orden aprobada.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **name** | VARCHAR | *'Plan Gelato Indoor 127 días'* |
| **cultivar_id** | FK → cultivars | *cross-domain* |
| **total_days** | INT | *127* |
| **phase_config** | JSONB | *[{phase_id, duration_days, templates:[...]}]* |
| **is_active** | BOOLEAN | *default true* |

#### scheduled_activities

Actividad programada del plan. Guarda un template_snapshot JSONB al momento de programar para que cambios futuros al template no afecten lo ya programado.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **schedule_id** | FK → cultivation_schedules | |
| **template_id** | FK → activity_templates | |
| **batch_id** | FK → batches | *cross-domain* |
| **planned_date** | DATE | |
| **crop_day** | INT | *día 45 del ciclo* |
| **phase_id** | FK → production_phases | *cross-domain* |
| **template_snapshot** | JSONB opt | *{resources, checklist, metadata} al programar* |
| **status** | ENUM | *pending \| completed \| skipped \| overdue* |
| **completed_activity_id** | FK → activities opt | *se llena al ejecutar* |

#### activities [CORE]

Registro REAL de ejecución — lo que realmente pasó en campo. Puede originarse de un scheduled_activity o ser ad-hoc. Conecta batch, zona y fase para trazabilidad completa. El campo measurement_data captura mediciones estructuradas tomadas durante la ejecución (pH, EC, volúmenes, etc.) cuyo schema esperado se define en el template.metadata.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **activity_type_id** | FK → activity_types | |
| **template_id** | FK → activity_templates opt | *puede ser ad-hoc sin template* |
| **scheduled_activity_id** | FK → scheduled_activities opt | |
| **batch_id** | FK → batches | *cross-domain* |
| **zone_id** | FK → zones | *cross-domain* |
| **performed_by** | FK → users | |
| **performed_at** | TIMESTAMPTZ | |
| **duration_minutes** | INT | |
| **phase_id** | FK → production_phases | *cross-domain* |
| **crop_day** | INT opt | |
| **status** | ENUM | *in_progress \| completed \| cancelled* |
| **measurement_data** | JSONB opt | *mediciones capturadas: {water_ph, solution_ec, total_volume_l, equipment, lysimeter_code, ...}* |
| **notes** | TEXT opt | |

#### activity_resources

Recursos REALMENTE consumidos — genera inventory_transactions automáticamente al registrarse.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **activity_id** | FK → activities | |
| **product_id** | FK → products | *cross-domain* |
| **inventory_item_id** | FK → inventory_items opt | *de qué lote específico* |
| **quantity_planned** | DECIMAL opt | *del template escalado* |
| **quantity_actual** | DECIMAL | *lo que realmente se usó* |
| **unit_id** | FK → units_of_measure | |
| **cost_total** | DECIMAL opt | |
| **transaction_id** | FK → inventory_transactions opt | *la transacción generada* |

#### activity_observations

Observaciones de campo — plagas, enfermedades, deficiencias, mediciones. Para monitoreos fitosanitarios (MIPE), captura datos estructurados: agente identificado del catálogo, parte de planta, incidencia y severidad numéricas. Fotos via tabla attachments (entity_type='observation').

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **activity_id** | FK → activities | |
| **type** | ENUM | *pest \| disease \| deficiency \| environmental \| general \| measurement* |
| **agent_id** | FK → phytosanitary_agents opt | *agente del catálogo — null para observaciones no fitosanitarias (cross-domain PROD)* |
| **plant_part** | ENUM opt | *root \| stem \| leaf \| flower \| fruit \| whole_plant* |
| **incidence_value** | DECIMAL opt | *15 individuos (plagas) o 23.5% (enfermedades)* |
| **incidence_unit** | ENUM opt | *count \| percentage* |
| **severity** | ENUM | *info \| low \| medium \| high \| critical — categórico, para alertas y priorización* |
| **severity_pct** | DECIMAL opt | *% de área afectada del órgano/planta — dato agronómico preciso* |
| **sample_size** | INT opt | *plantas evaluadas en este muestreo* |
| **description** | TEXT | *detalles específicos del hallazgo, o texto libre si agent_id es null* |
| **affected_plants** | INT opt | *plantas afectadas (complementa incidencia)* |
| **action_taken** | TEXT opt | |

---

### Dominio: Nexo (Batches)

#### batches [CORE]

NEXO CENTRAL del modelo — conecta los 9 dominios. Su status es genérico (active | phase_transition | completed | cancelled | on_hold) y la fase actual la da current_phase_id. Soporta genealogía via parent_batch_id para splits de lotes.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **code** | VARCHAR UNIQUE | *LOT-GELATO-260301* |
| **cultivar_id** | FK → cultivars | *cross-domain PROD* |
| **zone_id** | FK → zones | *zona actual — cross-domain ÁREAS* |
| **plant_count** | INT | *42 plantas* |
| **area_m2** | DECIMAL opt | |
| **source_inventory_item_id** | FK → inventory_items opt | *cross-domain INV* |
| **current_product_id** | FK → products opt | *cross-domain INV* |
| **schedule_id** | FK → cultivation_schedules opt | *cross-domain ACT* |
| **current_phase_id** | FK → production_phases | *cross-domain PROD — define el estado real* |
| **production_order_id** | FK → production_orders opt | *cross-domain ÓRDENES* |
| **parent_batch_id** | FK → self opt | *batch origen en caso de split* |
| **start_date** | DATE | |
| **expected_end_date** | DATE opt | |
| **status** | ENUM | *active \| phase_transition \| completed \| cancelled \| on_hold* |
| **yield_wet_kg** | DECIMAL opt | |
| **yield_dry_kg** | DECIMAL opt | |
| **total_cost** | DECIMAL calc | *SUM(inventory_transactions.cost_total WHERE batch_id)* |

#### batch_lineage

Registro de splits y merges entre batches para trazabilidad completa. Cada registro documenta una operación con cantidad transferida, razón y responsable.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **operation** | ENUM | *split \| merge* |
| **parent_batch_id** | FK → batches | *batch origen* |
| **child_batch_id** | FK → batches | *batch destino* |
| **quantity_transferred** | DECIMAL | *plantas o kg transferidos* |
| **unit_id** | FK → units_of_measure | |
| **reason** | TEXT | *'10 plantas retrasadas', 'Consolidar secado'* |
| **performed_by** | FK → users | |
| **performed_at** | TIMESTAMPTZ | |

---

### Dominio: Órdenes

#### production_orders [CORE]

Orden de producción — selecciona cultivar, cantidad, y subconjunto de fases a ejecutar. Los entry/exit points permiten que un vivero opere fases 1-2, un procesador 5-7, y un cultivador full-cycle 1-7 con el mismo modelo.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **code** | VARCHAR UNIQUE | *'OP-2026-001'* |
| **company_id** | FK → companies | |
| **cultivar_id** | FK → cultivars | |
| **entry_phase_id** | FK → production_phases | *donde empieza* |
| **exit_phase_id** | FK → production_phases | *donde termina* |
| **initial_quantity** | DECIMAL | *50 semillas, 100 esquejes, 21kg flor* |
| **initial_unit_id** | FK → units_of_measure | |
| **initial_product_id** | FK → products opt | *producto de entrada si ya existe* |
| **expected_output_quantity** | DECIMAL opt | *calculado en cascada desde yields* |
| **expected_output_product_id** | FK → products opt | |
| **zone_id** | FK → zones opt | *zona inicial* |
| **planned_start_date** | DATE | |
| **planned_end_date** | DATE opt | *calculado desde phase durations* |
| **assigned_to** | FK → users opt | |
| **status** | ENUM | *draft \| approved \| in_progress \| completed \| cancelled* |
| **priority** | ENUM | *low \| normal \| high \| urgent* |
| **notes** | TEXT opt | |

#### production_order_phases

Fases seleccionadas de la orden con planificación individual y registro de ejecución real (input/output/yield por fase).

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **order_id** | FK → production_orders | |
| **phase_id** | FK → production_phases | |
| **sort_order** | INT | |
| **planned_start_date** | DATE opt | |
| **planned_end_date** | DATE opt | |
| **planned_duration_days** | INT opt | *override del default cultivar* |
| **zone_id** | FK → zones opt | *zona asignada para esta fase* |
| **actual_start_date** | DATE opt | |
| **actual_end_date** | DATE opt | |
| **batch_id** | FK → batches opt | *batch asignado cuando inicia* |
| **input_quantity** | DECIMAL opt | *lo que entró realmente* |
| **output_quantity** | DECIMAL opt | *lo que salió realmente* |
| **yield_pct** | DECIMAL opt | *output/input × 100* |
| **status** | ENUM | *pending \| ready \| in_progress \| completed \| skipped* |

---

### Dominio: Calidad

#### quality_tests

Análisis de laboratorio por batch. Flexible para cualquier cultivo: THC/CBD para cannabis, brix para frutas, calibre para hortalizas, contaminantes y pesticidas para todos.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **batch_id** | FK → batches | *cross-domain* |
| **phase_id** | FK → production_phases opt | *en qué fase se tomó la muestra* |
| **test_type** | VARCHAR | *'potency', 'contaminants', 'brix', 'caliber'* |
| **lab_name** | VARCHAR opt | *'ChemHistory Labs'* |
| **lab_reference** | VARCHAR opt | *número de muestra del lab* |
| **sample_date** | DATE | |
| **result_date** | DATE opt | |
| **status** | ENUM | *pending \| in_progress \| completed \| failed \| rejected* |
| **overall_pass** | BOOLEAN opt | *true si todos los parámetros pasaron* |
| **notes** | TEXT opt | |
| **performed_by** | FK → users opt | |

#### quality_test_results

Resultado individual por parámetro. Soporta valores textuales y numéricos con thresholds para aprobación automática.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **test_id** | FK → quality_tests | |
| **parameter** | VARCHAR | *'THC', 'CBD', 'Brix', 'E.coli', 'Limonene'* |
| **value** | VARCHAR | *'23.5', '< 0.01', 'positive'* |
| **numeric_value** | DECIMAL opt | *23.5 para comparaciones programáticas* |
| **unit** | VARCHAR opt | *'%', 'ppm', 'CFU/g', 'mg/g'* |
| **min_threshold** | DECIMAL opt | *límite inferior aceptable* |
| **max_threshold** | DECIMAL opt | *límite superior aceptable* |
| **passed** | BOOLEAN opt | *null si no aplica threshold* |

---

### Dominio: Regulatorio

#### regulatory_doc_types

Catálogo de tipos de documentos regulatorios disponibles para la empresa. Cada tipo define un schema de campos dinámicos (required_fields) que las instancias deben cumplir. Configurado por admin.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **company_id** | FK → companies | |
| **name** | VARCHAR | *'Certificado de Análisis (CoA)', 'Ficha Técnica SDS', 'Guía ICA'* |
| **code** | VARCHAR UNIQUE per company | *'COA', 'SDS', 'PHYTO', 'ORGANIC', 'ICA_GUIDE'* |
| **description** | TEXT opt | *Para qué sirve y cuándo se requiere* |
| **required_fields** | JSONB | *Schema: {"fields": [{key, label, type, required, options?, placeholder?, help_text?}]}* |
| **valid_for_days** | INT opt | *Vigencia en días desde issue_date — null = no vence* |
| **issuing_authority** | VARCHAR opt | *'ICA', 'INVIMA', 'Lab acreditado', 'Productor'* |
| **category** | ENUM | *'quality' \| 'transport' \| 'compliance' \| 'origin' \| 'safety' \| 'commercial'* |
| **sort_order** | INT | |
| **is_active** | BOOLEAN | *default true* |

Tipos soportados para fields dentro de required_fields: `text`, `textarea`, `date`, `number`, `boolean`, `select` (con `options: []`).

#### product_regulatory_requirements

Define qué documentos regulatorios necesita cada producto o categoría de productos. Soporta herencia: requerimientos de categoría se heredan a todos sus productos. Esta es la "sección de documentación regulatoria" visible en el editor de producto.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **product_id** | FK → products opt | *Requerimiento a nivel producto específico* |
| **category_id** | FK → resource_categories opt | *O a nivel categoría — hereda a todos sus productos* |
| **doc_type_id** | FK → regulatory_doc_types | |
| **is_mandatory** | BOOLEAN | *default true — false = recomendado pero no bloqueante* |
| **applies_to_scope** | ENUM | *'per_batch' \| 'per_lot' \| 'per_product' \| 'per_facility'* |
| **frequency** | ENUM | *'once' \| 'per_production' \| 'annual' \| 'per_shipment'* |
| **notes** | TEXT opt | *'Requerido para exportación a EU', 'Solo para cannabis medicinal'* |
| **sort_order** | INT | |

CHECK: exactamente uno de `product_id`, `category_id` debe ser NOT NULL.

#### regulatory_documents

Instancias reales de documentos regulatorios capturados. Cada registro tiene field_data que cumple el schema definido en regulatory_doc_types.required_fields, y opcionalmente un archivo adjunto en Supabase Storage.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **company_id** | FK → companies | |
| **doc_type_id** | FK → regulatory_doc_types | |
| **product_id** | FK → products opt | *cross-domain — para scope per_product* |
| **batch_id** | FK → batches opt | *cross-domain — para scope per_batch* |
| **inventory_item_id** | FK → inventory_items opt | *cross-domain — para scope per_lot* |
| **facility_id** | FK → facilities opt | *cross-domain — para scope per_facility* |
| **shipment_id** | FK → shipments opt | *vincula doc al envío — ej: guía de transporte* |
| **quality_test_id** | FK → quality_tests opt | *vincula CoA con su quality_test* |
| **document_number** | VARCHAR opt | *Nro. oficial del documento* |
| **issue_date** | DATE | *Fecha de emisión* |
| **expiry_date** | DATE opt | *Auto-calculada desde issue_date + valid_for_days, o manual* |
| **status** | ENUM | *'draft' \| 'valid' \| 'expired' \| 'revoked' \| 'superseded'* |
| **field_data** | JSONB | *Valores de los campos definidos en doc_type.required_fields* |
| **file_path** | TEXT opt | *Ruta en Supabase Storage bucket 'regulatory-documents'* |
| **file_name** | VARCHAR opt | *Nombre original del archivo subido* |
| **file_size_bytes** | INT opt | |
| **file_mime_type** | VARCHAR opt | *'application/pdf', 'image/jpeg'* |
| **superseded_by_id** | FK → self opt | *Si este doc fue reemplazado por versión nueva* |
| **verified_by** | FK → users opt | *Quién revisó/aprobó el documento* |
| **verified_at** | TIMESTAMPTZ opt | |
| **notes** | TEXT opt | |

#### shipment_doc_requirements

Qué documentos se requieren para transportar cierto tipo de producto. Análogo a product_regulatory_requirements pero aplica al contexto de envío/transporte.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **product_id** | FK → products opt | *Requerimiento por producto* |
| **category_id** | FK → resource_categories opt | *O por categoría* |
| **doc_type_id** | FK → regulatory_doc_types | |
| **is_mandatory** | BOOLEAN | *default true* |
| **applies_when** | ENUM | *'always' \| 'interstate' \| 'international' \| 'regulated_material'* |
| **notes** | TEXT opt | *'Requerido por ICA para movilización de material vegetal'* |
| **sort_order** | INT | |

CHECK: exactamente uno de `product_id`, `category_id` debe ser NOT NULL.

#### shipments

Registro de un viaje físico de material. Un shipment = una entrega que puede contener múltiples productos. Captura origen, transporte, condiciones y personal involucrado.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **company_id** | FK → companies | |
| **shipment_code** | VARCHAR UNIQUE per company | *Auto-generado: 'SHP-2026-0001'* |
| **type** | ENUM | *'inbound' \| 'outbound'* |
| **status** | ENUM | *'scheduled' \| 'in_transit' \| 'received' \| 'inspecting' \| 'accepted' \| 'partial_accepted' \| 'rejected' \| 'cancelled'* |
| **supplier_id** | FK → suppliers opt | *cross-domain INV — quién envía (inbound)* |
| **origin_name** | VARCHAR opt | *'Vivero Agroplantulas SAS, Rionegro'* |
| **origin_address** | TEXT opt | |
| **origin_latitude** | DECIMAL opt | |
| **origin_longitude** | DECIMAL opt | |
| **destination_facility_id** | FK → facilities | *cross-domain ÁREAS — a dónde llega* |
| **carrier_name** | VARCHAR opt | *'Transportes Rápido SAS'* |
| **carrier_vehicle** | VARCHAR opt | *'Placa ABC-123', 'Refrigerado tipo furgón'* |
| **carrier_driver** | VARCHAR opt | *Nombre del conductor* |
| **carrier_contact** | VARCHAR opt | *Teléfono del conductor/transportista* |
| **dispatch_date** | TIMESTAMPTZ opt | *Cuándo salió del origen* |
| **estimated_arrival_date** | TIMESTAMPTZ opt | |
| **actual_arrival_date** | TIMESTAMPTZ opt | *Cuándo llegó realmente* |
| **transport_conditions** | JSONB opt | *{temperature_controlled, temperature_range_c, packaging_type, duration_hours, distance_km, cold_chain_maintained, ...}* |
| **purchase_order_ref** | VARCHAR opt | *Referencia de orden de compra externa* |
| **notes** | TEXT opt | |
| **received_by** | FK → users opt | *Quién recibió en facility* |
| **inspected_by** | FK → users opt | *Quién hizo la inspección de llegada* |
| **inspected_at** | TIMESTAMPTZ opt | |

#### shipment_items

Cada línea de un envío: qué producto, cuánto se esperaba, cuánto llegó, resultado de inspección, y link al inventory_item creado al confirmar recepción.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **shipment_id** | FK → shipments | |
| **product_id** | FK → products | *cross-domain INV* |
| **expected_quantity** | DECIMAL | *Lo que debía llegar según la orden/guía* |
| **received_quantity** | DECIMAL opt | *Lo que realmente llegó en buen estado* |
| **rejected_quantity** | DECIMAL opt | *Lo que se rechazó* |
| **unit_id** | FK → units_of_measure | *cross-domain INV* |
| **supplier_lot_number** | VARCHAR opt | *Lote del proveedor — trazabilidad hacia atrás* |
| **supplier_batch_ref** | VARCHAR opt | *Referencia del batch de origen del proveedor* |
| **cost_per_unit** | DECIMAL opt | |
| **destination_zone_id** | FK → zones opt | *cross-domain ÁREAS — zona donde se almacenará* |
| **expiration_date** | DATE opt | *Auto-calculada si producto tiene shelf_life_days* |
| **inspection_result** | ENUM opt | *'accepted' \| 'accepted_with_observations' \| 'rejected' \| 'quarantine'* |
| **inspection_notes** | TEXT opt | *'3 esquejes con raíz dañada, 2 con signos de deshidratación'* |
| **inspection_data** | JSONB opt | *Datos cuantitativos de inspección según tipo de material* |
| **inventory_item_id** | FK → inventory_items opt | *Se llena al confirmar recepción — link al lote creado* |
| **transaction_id** | FK → inventory_transactions opt | *La transacción type='receipt' generada* |
| **sort_order** | INT | |

---

### Dominio: Operaciones

#### overhead_costs

Costos indirectos no vinculados a actividades específicas (energía, renta, depreciación, seguros). Prorrateables a batches según la base de asignación para calcular COGS real completo. Usa Pattern 1 (direct `company_id` column) para RLS performance, en lugar de resolver la empresa via JOIN a `facilities`.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **company_id** | UUID | *NOT NULL DEFAULT get_my_company_id() — Pattern 1 for RLS* |
| **facility_id** | FK → facilities | |
| **zone_id** | FK → zones opt | *null = aplica a toda la facility* |
| **cost_type** | ENUM | *energy \| rent \| depreciation \| insurance \| maintenance \| labor_fixed \| other* |
| **description** | VARCHAR | *'Electricidad Enero 2026'* |
| **amount** | DECIMAL | |
| **currency** | CHAR(3) | |
| **period_start** | DATE | |
| **period_end** | DATE | |
| **allocation_basis** | ENUM | *per_m2 \| per_plant \| per_batch \| per_zone \| even_split* |
| **notes** | TEXT opt | |

#### sensors

Sensores IoT instalados en zonas para monitoreo ambiental continuo.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **company_id** | UUID | *NOT NULL DEFAULT get_my_company_id() — Pattern 1 for RLS* |
| **zone_id** | FK → zones | |
| **type** | ENUM | *temperature \| humidity \| co2 \| light \| ec \| ph \| soil_moisture \| vpd* |
| **brand_model** | VARCHAR opt | *'Trolmaster Aqua-X Pro'* |
| **serial_number** | VARCHAR opt | |
| **calibration_date** | DATE opt | |
| **is_active** | BOOLEAN | *default true* |

#### environmental_readings

Lecturas de sensores. zone_id y company_id denormalizados para queries rápidas y RLS. Permite comparar condiciones reales vs óptimas del cultivar. Partitioned by month on `timestamp`.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **company_id** | UUID | *NOT NULL — denormalizado para RLS (Pattern 1)* |
| **sensor_id** | FK → sensors | |
| **zone_id** | FK → zones | *denormalizado para performance* |
| **parameter** | ENUM | *temperature \| humidity \| co2 \| light_ppfd \| ec \| ph \| vpd* |
| **value** | DECIMAL | |
| **unit** | VARCHAR | *'°C', '%RH', 'ppm', 'µmol/m²/s'* |
| **timestamp** | TIMESTAMPTZ | |

#### alerts

Alertas y notificaciones del sistema. Usa entity polimórfico (entity_type + entity_id) para vincularse a cualquier tabla del modelo.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **company_id** | UUID | |
| **type** | ENUM | *overdue_activity \| low_inventory \| stale_batch \| expiring_item \| env_out_of_range \| order_delayed \| quality_failed \| regulatory_expiring \| regulatory_missing \| pest_detected \| phi_violation* |
| **severity** | ENUM | *info \| warning \| high \| critical* |
| **title** | VARCHAR opt | |
| **entity_type** | VARCHAR | *'batch', 'inventory_item', 'scheduled_activity', 'sensor', 'regulatory_document', 'shipment', 'activity_observation'* |
| **entity_id** | UUID | |
| **batch_id** | FK → batches opt | *cross-domain — para asociar la alerta al batch afectado* |
| **message** | TEXT | |
| **triggered_at** | TIMESTAMPTZ | |
| **acknowledged_by** | FK → users opt | |
| **acknowledged_at** | TIMESTAMPTZ opt | |
| **resolved_at** | TIMESTAMPTZ opt | |
| **status** | ENUM | *pending \| acknowledged \| resolved* |

#### attachments

Adjuntos genéricos (fotos, certificados, documentos regulatorios, PDFs) vinculables a cualquier entidad del sistema.

| Campo | Tipo | Detalle |
|---|---|---|
| **id** | UUID PK | |
| **company_id** | UUID | *NOT NULL DEFAULT get_my_company_id() — Pattern 1 for RLS* |
| **entity_type** | VARCHAR | *'activity', 'batch', 'quality_test', 'observation'* |
| **entity_id** | UUID | |
| **file_url** | TEXT | |
| **file_type** | VARCHAR | *'image/jpeg', 'application/pdf'* |
| **file_size_bytes** | INT opt | |
| **description** | VARCHAR opt | |
| **uploaded_by** | FK → users | |
| **uploaded_at** | TIMESTAMPTZ | |

---

## Relaciones Cross-Domain

Las FKs cross-domain conectan los dominios entre sí. Están concentradas en tablas clave: batches (el nexo), inventory_transactions (el log inmutable), activities (la ejecución en campo), regulatory_documents (compliance) y shipments (transporte).

### Batch — El Nexo Central

| FK | Dominio | Propósito |
|---|---|---|
| cultivar_id → cultivars | **PROD** | Qué variedad se cultiva |
| current_phase_id → production_phases | **PROD** | En qué fase está — define el estado real del batch |
| production_order_id → production_orders | **ÓRDENES** | Qué orden lo generó |
| zone_id → zones | **ÁREAS** | Dónde está físicamente |
| current_product_id → products | **INV** | Qué producto es actualmente en la cadena |
| source_inventory_item_id → inventory_items | **INV** | De qué semilla/esqueje viene |
| schedule_id → cultivation_schedules | **ACT** | Qué plan de cultivo sigue |
| parent_batch_id → batches | **NEXO** | De qué batch se originó en un split |

### Inventory Transactions — El Log Universal

| FK | Dominio | Propósito |
|---|---|---|
| zone_id → zones | **ÁREAS** | Dónde ocurrió el movimiento |
| batch_id → batches | **NEXO** | Para qué lote |
| phase_id → production_phases | **PROD** | En qué fase del ciclo |
| activity_id → activities | **ACT** | Qué actividad lo causó |
| user_id → users | **SYS** | Quién lo ejecutó |

### Regulatory Documents — Compliance Multi-entidad

| FK | Dominio | Propósito |
|---|---|---|
| batch_id → batches | **NEXO** | Documento del batch (per_batch) |
| product_id → products | **INV** | Documento del producto (per_product) |
| inventory_item_id → inventory_items | **INV** | Documento del lote (per_lot) |
| facility_id → facilities | **ÁREAS** | Documento de la facility (per_facility) |
| shipment_id → shipments | **REG** | Documento de transporte |
| quality_test_id → quality_tests | **QUAL** | CoA vinculado al test de lab |

### Shipments — Trazabilidad de Origen

| FK | Dominio | Propósito |
|---|---|---|
| supplier_id → suppliers | **INV** | Quién envía el material |
| destination_facility_id → facilities | **ÁREAS** | A dónde llega |
| shipment_items.product_id → products | **INV** | Qué productos venían |
| shipment_items.inventory_item_id → inventory_items | **INV** | Lote creado al confirmar |
| inventory_items.shipment_item_id → shipment_items | **REG** | Navegación inversa: lote → envío |

### Jerarquías Internas por Dominio

| Dominio | Relación |
|---|---|
| **SYS** | companies 1→N users |
| **PROD** | crop_types 1→N cultivars 1→N phase_product_flows N→1 products |
| **PROD** | crop_types 1→N production_phases — cultivars 1→N phase_product_flows N→1 production_phases |
| **PROD** | production_phases →self (depends_on_phase_id) |
| **PROD** | crop_types 1→N phytosanitary_agents (opt) — companies 1→N phytosanitary_agents |
| **ÁREAS** | facilities 1→N zones 1→N zone_structures(opt) \| zones 1→N plant_positions(opt) |
| **INV** | resource_categories →self (parent_id) \| products N→1 categories + units |
| **INV** | inventory_items N→1 products \| transactions N→1 items + →self (related) |
| **ACT** | templates 1→N template_phases + template_resources + template_checklist |
| **ACT** | cultivation_schedules 1→N scheduled_activities N→1 templates |
| **ACT** | activities 1→N activity_resources + activity_observations N→1 phytosanitary_agents(opt) |
| **NEXO** | batches →self (parent_batch_id) \| batches 1→N batch_lineage |
| **ORD** | production_orders 1→N production_order_phases N→1 production_phases |
| **QUAL** | quality_tests 1→N quality_test_results |
| **REG** | regulatory_doc_types 1→N product_regulatory_requirements + shipment_doc_requirements |
| **REG** | regulatory_doc_types 1→N regulatory_documents |
| **REG** | shipments 1→N shipment_items N→1 products |
| **REG** | regulatory_documents →self (superseded_by_id) |
| **OPS** | sensors 1→N environmental_readings \| alerts/attachments → entity (polimórfico) |

---

## Flujos Operativos Detallados

Descripción paso a paso de cómo interactúan las tablas durante las operaciones más comunes del sistema. Cada paso indica el dominio que interviene y las tablas afectadas.

### Flujo 1: Crear Orden de Producción, Batch e Ingreso de Material

*Inicia el ciclo productivo. Un gerente selecciona un cultivar, configura la orden con las fases deseadas, y al aprobar, el sistema genera el batch, programa las actividades, y el operario ejecuta la primera actividad de ingreso de material que formaliza la entrada del recurso al proceso productivo.*

| # | Dominio | Acción |
|---|---|---|
| 1 | **PROD** | El gerente selecciona un cultivar (ej: Gelato #41). El sistema carga automáticamente las production_phases del crop_type asociado. Para cannabis: germinación, propagación, vegetativo, floración, cosecha, secado, empaque + madre (8 fases, donde madre es bifurcación opcional desde vegetativo). |
| 2 | **ORDER** | Se crea un production_order con: cultivar_id=Gelato, entry_phase_id y exit_phase_id según el tipo de operación. Ejemplos: full-cycle desde semilla (germinación→empaque), desde esquejes (propagación→empaque), procesador (secado→empaque), establecimiento de madre (germinación→madre). |
| 3 | **ORDER** | El sistema genera production_order_phases siguiendo la cadena depends_on_phase_id desde entry hasta exit, con planned_duration_days tomados del cultivar.phase_durations o de production_phases.default_duration_days. |
| 4 | **PROD** | Cálculo en cascada usando phase_product_flows del cultivar Gelato desde entry hasta exit phase. Ejemplo full-cycle: 50 semillas × 90% germinación × 95% propagación × 98% floración × 500g/planta × 25% ratio seco × 80% trimming = ~4.7kg producto final. Cada yield es específico del cultivar. Se registra en expected_output_quantity. |
| 5 | **NEXO** | Al aprobar la orden se crea el batch: code='LOT-GELATO-260301', cultivar_id=Gelato, current_phase_id=entry_phase, current_product_id=initial_product, source_inventory_item_id=lote de semillas/esquejes, zone_id=zona asignada, production_order_id=la orden, status='active'. |
| 6 | **ACT** | El cultivation_schedule genera scheduled_activities desde los activity_templates aplicables a cada fase (via activity_template_phases). La PRIMERA actividad es siempre ENTRY-MATERIAL: template de ingreso de material que formaliza la entrada del recurso al batch. Cada scheduled_activity guarda un template_snapshot JSONB. |
| 7 | **INV** | Si hay material en inventario, se genera una reservation (inventory_transaction type='reservation') para reservar la cantidad. quantity_reserved += N en el inventory_item correspondiente. |
| 8 | **ACT** | El operario ejecuta ENTRY-MATERIAL: se crea activity con batch_id, zone_id, phase_id=entry_phase. Los activity_resources registran el material consumido (semillas, esquejes, flor húmeda) con quantity_actual y el inventory_item_id específico. |
| 9 | **INV** | Se generan dos inventory_transactions: (1) type='release' libera la reserva, (2) type='consumption' registra el consumo real con contexto completo: batch_id, phase_id, activity_id, user_id. El inventory_item pasa a lot_status='depleted' si se consumió todo. |
| 10 | **ACT** | La actividad ENTRY-MATERIAL pasa a status='completed'. El batch está formalmente en producción con material ingresado, trazable hasta el lote de origen (y si aplica, hasta el shipment, supplier y documentos regulatorios). |

### Flujo 1b: Propagación por Semilla (Ciclo Completo)

*Desde la compra de semillas hasta la planta vegetativa lista para floración. Demuestra la cadena completa semilla → plántula → planta enraizada → planta vegetativa con dos transformaciones de fase.*

**phase_product_flows del cultivar Gelato para esta ruta:**

| Fase | direction | product_role | product_id | yield |
|---|---|---|---|---|
| germinación | input | primary | SEM-GELATO-FEM | — |
| germinación | output | primary | SEEDLING-GELATO | 90% (9 de cada 10 germinan) |
| propagación | input | primary | SEEDLING-GELATO | — |
| propagación | output | primary | PLANT-VEG-GELATO | 95% (5% no enraízan bien) |
| vegetativo | input | primary | PLANT-VEG-GELATO | — |
| vegetativo | output | primary | PLANT-FLO-GELATO | 98% |

**Flujo paso a paso:**

| # | Dominio | Acción |
|---|---|---|
| 1 | **REG** | Semillas llegan via shipment desde proveedor certificado. Inspección: viabilidad, integridad de la cubierta, documentos fitosanitarios. Se crea inventory_item: SEM-GELATO-FEM, quantity=50, source_type='purchase'. |
| 2 | **ORDER** | production_order: cultivar=Gelato, entry_phase=germinación, exit_phase=empaque, initial_quantity=50, initial_product=SEM-GELATO-FEM. |
| 3 | **NEXO** | Batch creado: LOT-GELATO-260301, current_phase=germinación, current_product=SEM-GELATO-FEM, source_inventory_item=lote de semillas. |
| 4 | **ACT** | ENTRY-MATERIAL: operario registra ingreso de 50 semillas al batch. Genera consumption del lote de semillas. Las semillas dejan de ser "stock en almacén" y pasan a ser "material en producción". |
| 5 | **ACT** | Actividades de germinación: remojo (24h), siembra en sustrato húmedo, control de temperatura (25-28°C), control de humedad (>80%). Duración típica: 3-7 días. |
| 6 | **INV** | Fin de germinación — is_transformation=true, is_destructive=true: transformation_out destruye SEM-GELATO-FEM (50 semillas), transformation_in crea SEEDLING-GELATO (45 plántulas, yield 90%). 5 semillas no viables → transaction type='waste'. |
| 7 | **NEXO** | Batch actualiza: current_phase=propagación, current_product=SEEDLING-GELATO, plant_count=45. Zone puede cambiar (germinador → bandeja de propagación). |
| 8 | **ACT** | Actividades de propagación: trasplante a alvéolos individuales, fertirrigación suave, luz 18/6, inspección de enraizamiento. Duración: 10-21 días. |
| 9 | **INV** | Fin de propagación — is_transformation=true, is_destructive=false: transformation_out marca SEEDLING-GELATO como transformado, transformation_in crea PLANT-VEG-GELATO (43 plantas, yield 95%). 2 plántulas débiles → waste. |
| 10 | **NEXO** | Batch actualiza: current_phase=vegetativo, current_product=PLANT-VEG-GELATO, plant_count=43, zone=Sala Vegetativo. Desde aquí continúa el ciclo normal (vegetativo → floración → cosecha → secado → empaque). |

### Flujo 1c: Propagación por Esquejes Externos

*La empresa compra esquejes (clones) de un vivero externo y arranca directamente en propagación, saltando germinación. Demuestra el entry_point flexible y la trazabilidad de transporte.*

**phase_product_flows del cultivar Gelato para esta ruta:**

| Fase | direction | product_role | product_id | yield |
|---|---|---|---|---|
| propagación | input | primary | CLONE-GELATO | — |
| propagación | output | primary | PLANT-VEG-GELATO | 92% (esquejes menos robustos que plántulas de semilla) |

**Flujo paso a paso:**

| # | Dominio | Acción |
|---|---|---|
| 1 | **REG** | Shipment desde vivero: 100 esquejes CLONE-GELATO, transporte refrigerado (8-12°C), documentos: Guía ICA + certificado fitosanitario + certificado de origen genético. |
| 2 | **REG** | Inspección de llegada: received=98, rejected=2 (raíz dañada). inspection_result='accepted_with_observations'. Se crea inventory_item: CLONE-GELATO, quantity=98, shipment_item_id=↑. |
| 3 | **ORDER** | production_order: cultivar=Gelato, **entry_phase=propagación** (salta germinación), exit_phase=empaque, initial_quantity=98, initial_product=CLONE-GELATO. La germinación NO se incluye en production_order_phases. |
| 4 | **NEXO** | Batch creado: LOT-GELATO-260315, current_phase=propagación, current_product=CLONE-GELATO, source_inventory_item=lote de esquejes (trazable al shipment y supplier). |
| 5 | **ACT** | ENTRY-MATERIAL: operario registra ingreso de 98 esquejes. consumption del lote de esquejes. Observación: "2 esquejes adicionales con signos de deshidratación, se mantienen en observación". |
| 6 | **ACT** | Actividades de propagación: aplicación de hormona de enraizamiento, sustrato húmedo, cúpula de humedad, luz difusa 18/6. Duración: 10-14 días. Inspección de raíces día 7 y día 12. |
| 7 | **INV** | Fin de propagación: transformation 98 esquejes → 90 plantas enraizadas (PLANT-VEG-GELATO, yield 92%). 8 esquejes que no enraizaron → waste. |
| 8 | **NEXO** | Batch actualiza: current_phase=vegetativo, current_product=PLANT-VEG-GELATO, plant_count=90. Trazabilidad completa: PLANT-VEG-GELATO → batch → source_inventory_item → shipment_item → shipment → supplier + docs. |

### Flujo 1d: Planta Madre y Producción de Clones

*Establecimiento de una planta madre y su ciclo continuo de producción de clones. La fase 'madre' es una bifurcación desde vegetativo: el batch permanece indefinidamente, produciendo clones periódicamente que alimentan nuevas órdenes de producción. Demuestra is_transformation=true con is_destructive=false.*

**phase_product_flows del cultivar Gelato para la ruta madre:**

| Fase | direction | product_role | product_id | yield | Notas |
|---|---|---|---|---|---|
| germinación | input | primary | SEM-GELATO-FEM | — | |
| germinación | output | primary | SEEDLING-GELATO | 90% | |
| propagación | input | primary | SEEDLING-GELATO | — | |
| propagación | output | primary | PLANT-VEG-GELATO | 95% | |
| madre | input | primary | PLANT-VEG-GELATO | — | *la madre se "consume" solo nominalmente — el batch no se destruye* |
| madre | output | primary | CLONE-GELATO | — | *expected_quantity_per_input=50 clones por sesión de corte* |

**Parte 1 — Establecimiento de la planta madre:**

| # | Dominio | Acción |
|---|---|---|
| 1 | **ORDER** | production_order: cultivar=Gelato, entry_phase=germinación, **exit_phase=madre**. initial_quantity=5 semillas (se seleccionará la mejor planta como madre). production_order_phases genera: germinación → propagación → vegetativo → madre (NO incluye floración→empaque). |
| 2 | **NEXO** | Batch creado: LOT-MADRE-GELATO-001, current_phase=germinación. El batch sigue el flujo normal de semilla (Flujo 1b pasos 4-9) hasta llegar a vegetativo. |
| 3 | **ACT** | En vegetativo, el supervisor selecciona la mejor planta por vigor, estructura y salud. Si se iniciaron 5 semillas, se hace split (Flujo 4): LOT-MADRE-GELATO-001 queda con 1 planta (la elegida), las otras 4 se separan a un batch de producción normal. |
| 4 | **NEXO** | Transición de fase: vegetativo → madre. Batch actualiza: current_phase=madre, zone=Sala Madres. La orden pasa a status='completed' pero el **batch permanece status='active'** indefinidamente. |

**Parte 2 — Ciclo de producción de clones (recurrente):**

| # | Dominio | Acción |
|---|---|---|
| 5 | **ACT** | Actividad programada: template CLONE-CUT, frecuencia=biweekly, asociada a fase madre via activity_template_phases. El template define: triggers_transformation=true, estimated_duration=120min. |
| 6 | **ACT** | El operario ejecuta CLONE-CUT: selecciona ramas apicales, corta 50 esquejes, aplica hormona, registra observaciones sobre vigor de la madre. activity_resources registra insumos consumidos (hormona, gel, alvéolos, sustrato). |
| 7 | **INV** | Fase madre: is_transformation=true, is_destructive=**false**. El sistema genera transformation_in SIN transformation_out: se crean 50 unidades de CLONE-GELATO como nuevo inventory_item (source_type='production'). La madre NO se destruye — el batch mantiene plant_count=1, current_product inalterado. |
| 8 | **INV** | Nuevo inventory_item: product=CLONE-GELATO, quantity=50, source_type='production', zone='Sala Madres'. El lote es trazable al batch madre y a la actividad CLONE-CUT específica via transaction.batch_id y transaction.activity_id. |
| 9 | **NEXO** | El batch madre sigue en status='active', current_phase=madre. Recibe actividades de mantenimiento (fertirrigación, poda de formación, renovación de sustrato) intercaladas con los CLONE-CUT periódicos. |
| 10 | **ORDER** | Los 50 clones producidos alimentan nuevas órdenes de producción: production_order con entry_phase=propagación, initial_product=CLONE-GELATO, source=este inventory_item. El Flujo 1c aplica a partir de ahí. |

**Ciclo continuo:** La madre puede producir clones cada 2-3 semanas durante 6-12 meses. Cada sesión de CLONE-CUT genera un inventory_item independiente con su propia trazabilidad. Cuando la madre se agota o pierde vigor, el batch pasa a status='completed' y se establece una nueva madre.

**Trazabilidad completa de un clon producido internamente:**

```
CLONE-GELATO (inventory_item — producido internamente)
│
├── inventory_transaction type='transformation_in'
│   ├── batch_id → LOT-MADRE-GELATO-001 (la madre que lo produjo)
│   ├── activity_id → CLONE-CUT #47 (sesión de corte específica)
│   └── phase_id → madre
│
├── Madre: LOT-MADRE-GELATO-001
│   ├── cultivar: Gelato #41
│   ├── Origen: LOT-MADRE-GELATO-001 (batch original de semilla)
│   │   └── source_inventory_item → SEM-GELATO-FEM
│   │       └── shipment → supplier: "Banco Genético XYZ"
│   └── Historial: 47 sesiones de CLONE-CUT, 2,350 clones producidos
│
└── Destino: production_order → nuevo batch → propagación → ... → producto final
```

### Flujo 2: Fertirrigación Diaria

*Operación rutinaria que demuestra el ciclo completo template → scheduled → activity → transaction. Incluye escalado automático, checklist de verificación y generación de alertas.*

| # | Dominio | Acción |
|---|---|---|
| 1 | **ACT** | scheduled_activity aparece en el dashboard del operario: template=FERT-VEG-S1, batch=LOT-001, phase=vegetativo, planned_date=hoy, crop_day=35. |
| 2 | **ACT** | El operario inicia la ejecución. Se crea un registro en activities: zone_id=Sala Veg A, phase_id=vegetativo, batch_id=LOT-001, performed_by=operario, performed_at=ahora, status='in_progress'. |
| 3 | **ACT** | El sistema escala los recursos del template_snapshot según quantity_basis: 42 plantas × 5L/planta (per_plant) = 210L agua. Ca(NO₃)₂: 0.8g/L × 210L (per_L_solution) = 168g. Se pre-cargan como quantity_planned en activity_resources. |
| 4 | **INV** | El operario confirma cantidades reales. Por cada recurso, activity_resources registra quantity_actual. Se genera inventory_transaction type='application' para cada recurso: Ca(NO₃)₂ -168g, agua -210L, etc. |
| 5 | **INV** | El inventory_item de Ca(NO₃)₂: quantity_available -= 168g. La transaction tiene contexto completo: zone_id=Sala Veg A, batch_id=LOT-001, phase_id=vegetativo, activity_id=esta actividad, user_id=operario, cost_total calculado. |
| 6 | **ACT** | El operario completa el checklist: EC=1.8 (target: 1.5-2.0 ✓), pH=5.9 (target: 5.8-6.2 ✓), drenaje=18% (target: 15-20% ✓). Todos los ítems is_critical pasan. |
| 7 | **OPS** | Si algún valor de checklist está fuera de rango, se genera automáticamente un registro en alerts: type='env_out_of_range', severity='warning', entity_type='batch', entity_id=LOT-001. |
| 8 | **ACT** | La actividad pasa a status='completed'. scheduled_activity.status='completed' y completed_activity_id apunta a esta actividad. |

### Flujo 3: Cosecha con Multi-Output y Test de Calidad

*La cosecha es la operación más compleja: destruye el input (plantas), genera múltiples outputs (flor húmeda, trim, desperdicio), consume insumos, registra fotos, avanza la fase del batch, y dispara un test de calidad.*

| # | Dominio | Acción |
|---|---|---|
| 1 | **ACT** | Se ejecuta la actividad HARV-MANUAL-CUT. El template define 18 recursos en 7 categorías, estimated_duration=360min, triggers_transformation=true, triggers_phase_change_id=secado. |
| 2 | **INV** | transformation_out: Se genera inventory_transaction type='transformation_out' para las 42 plantas en floración. El inventory_item FLO-GELATO se reduce a 0 y pasa a lot_status='depleted'. |
| 3 | **PROD** | phase_product_flows del cultivar Gelato para la fase 'cosecha' define los outputs: direction='output', product_role='primary' → WET-GELATO (flor húmeda); product_role='secondary' → TRIM-WET-GELATO (trim húmedo); product_role='waste' → tallos y raíces. Los productos y yields son específicos de Gelato. |
| 4 | **INV** | transformation_in — Output primario: Se crea NUEVO inventory_item para WET-GELATO (flor húmeda), +21kg. Transaction type='transformation_in', related_transaction_id apunta al transformation_out, target_item_id apunta al nuevo item. |
| 5 | **INV** | transformation_in — Output secundario: Se crea NUEVO inventory_item para TRIM-WET-GELATO (trim húmedo), +8.4kg. Misma mecánica de vinculación con related_transaction_id. |
| 6 | **INV** | waste: ~50kg tallos y raíces. Transaction type='waste', reason='Material no aprovechable, descartado en compostera'. No crea inventory_item de destino. |
| 7 | **INV** | consumption: Los insumos consumidos (6 pares guantes, 300mL alcohol isopropílico, turkey bags, etc.) generan cada uno su transaction type='consumption' con contexto completo. |
| 8 | **OPS** | Fotos de la cosecha se registran en attachments: entity_type='activity', entity_id=esta actividad, file_type='image/jpeg'. Múltiples fotos, cada una un registro. |
| 9 | **NEXO** | El batch se actualiza: current_phase_id avanza a 'secado', status='phase_transition', current_product_id cambia a WET-GELATO, zone_id cambia a 'Sala Secado'. |
| 10 | **ÁREAS** | Si existen plant_positions, todas pasan a status='harvested' y current_batch_id se limpia. |
| 11 | **QUAL** | Se crea quality_test: batch_id=LOT-001, phase_id=cosecha, test_type='potency', status='pending'. Cuando el lab devuelva resultados, se crean quality_test_results para THC (23.5%), CBD (0.8%), limonene (12mg/g), etc. |
| 12 | **ORDER** | production_order_phases para 'cosecha': status='completed', input_quantity=42 plantas, output_quantity=21kg flor húmeda, yield_pct calculado. |

### Flujo 4: Split de Batch

*Cuando parte de un lote presenta problemas (deficiencia, retraso, contaminación), se separa en un batch hijo para tratamiento independiente manteniendo trazabilidad completa.*

| # | Dominio | Acción |
|---|---|---|
| 1 | **NEXO** | El supervisor detecta que 8 de las 42 plantas del batch LOT-001 muestran deficiencia severa de calcio. Decide separar las plantas afectadas para tratamiento intensivo sin retrasar el resto del lote. |
| 2 | **NEXO** | Se crea batch_lineage: operation='split', parent_batch_id=LOT-001, child_batch_id=LOT-001-B, quantity_transferred=8 plantas, reason='8 plantas con deficiencia Ca severa', performed_by=supervisor. |
| 3 | **NEXO** | LOT-001 se actualiza: plant_count=34 (de 42). Se crea LOT-001-B: parent_batch_id=LOT-001, plant_count=8, cultivar_id=Gelato (heredado), current_phase_id=vegetativo (misma fase), zone_id puede ser la misma u otra zona. |
| 4 | **ACT** | LOT-001-B recibe scheduled_activities propias con templates correctivos (mayor concentración Ca, fertirrigación más frecuente). El plan original de LOT-001 continúa sin cambios. |
| 5 | **INV** | Cada batch acumula costos por separado: todas las inventory_transactions llevan batch_id=LOT-001 o batch_id=LOT-001-B según corresponda. total_cost de cada batch se calcula independientemente. |
| 6 | **NEXO** | Cuando LOT-001-B se recupera, se puede crear otro batch_lineage operation='merge' para reunificar, o mantener como batches separados hasta el final. La genealogía completa queda registrada. |

### Flujo 5: Procesador de Post-Cosecha (Fases 5-7)

*Una empresa procesadora compra flor húmeda y solo ejecuta secado, trimming y empaque. El modelo soporta esto sin adaptaciones, gracias a los entry/exit points de la orden de producción.*

| # | Dominio | Acción |
|---|---|---|
| 1 | **ORDER** | Se crea production_order: cultivar_id=Gelato, entry_phase_id=secado (fase 5), exit_phase_id=empaque (fase 7), initial_quantity=21kg, initial_product_id=WET-GELATO. No se generan phases para germinación, vegetativo, floración ni cosecha. |
| 2 | **INV** | La flor húmeda comprada se registra como inventory_transaction type='receipt': +21kg WET-GELATO, source_type='purchase', cost_per_unit=precio de compra. Se crea el inventory_item correspondiente. |
| 3 | **NEXO** | Se crea el batch: cultivar_id=Gelato, current_phase_id=secado, status='active', source_inventory_item_id=la compra, zone_id=Sala Secado. |
| 4 | **ACT** | Los templates de secado, trimming y empaque se programan y ejecutan con el flujo normal de scheduled_activities → activities → activity_resources → inventory_transactions. |
| 5 | **INV** | Secado: transformation 21kg húmeda → 5.25kg seca (yield 25%). phase_product_flows del cultivar Gelato para la fase 'secado' define: input=WET-GELATO, output primary=DRY-GELATO con expected_yield_pct=25%. |
| 6 | **QUAL** | Post-secado: quality_test para humedad residual (<12%), presencia de moho (negativo), integridad de tricomas. Los resultados quedan vinculados al batch y fase. |
| 7 | **INV** | Trimming: 5.25kg seca → 4.2kg premium (DRY-GELATO-PREMIUM) + 1.05kg trim seco (TRIM-DRY-GELATO). Multi-output via phase_product_flows del cultivar. |
| 8 | **INV** | Empaque: 4.2kg → ~150 frascos JAR-GELATO-28G. Cada frasco tiene su inventory_item con batch_number para trazabilidad completa hasta el origen. |
| 9 | **OPS** | overhead_costs: energía de la sala de secado (15 días × tarifa), renta proporcional del espacio. allocation_basis='per_m2' proratea al batch según area_m2 usada. |
| 10 | **ORDER** | Cada production_order_phase registra input/output/yield real. La orden pasa a status='completed'. El batch status='completed'. |

### Flujo 6: Monitoreo Ambiental y Alertas

*Los sensores IoT generan lecturas continuas que se comparan contra condiciones óptimas del cultivar, disparando alertas cuando hay desviaciones.*

| # | Dominio | Acción |
|---|---|---|
| 1 | **OPS** | sensors registra un sensor tipo 'temperature' en Sala Floración A, brand_model='Trolmaster HCS-1'. Cada 5 minutos el sensor envía datos al sistema. |
| 2 | **OPS** | environmental_readings recibe: sensor_id, zone_id=Sala Floración A, parameter='temperature', value=28.5, unit='°C', timestamp=ahora. zone_id denormalizado permite queries rápidas sin JOIN a sensors. |
| 3 | **PROD** | El cultivar Gelato #41 tiene optimal_conditions.temp='20-26°C'. La lectura de 28.5°C está fuera del rango óptimo. |
| 4 | **OPS** | Se genera alert: type='env_out_of_range', severity='warning', entity_type='sensor', entity_id=el sensor, message='Temperatura 28.5°C excede rango óptimo (20-26°C) en Sala Floración A'. |
| 5 | **OPS** | El supervisor recibe la alerta, investiga, ajusta el HVAC. Registra acknowledged_by=supervisor, acknowledged_at=ahora. |
| 6 | **OPS** | Cuando la temperatura vuelve al rango, resolved_at se llena. El historial completo de alertas permite análisis de incidentes por zona, periodo y severidad. |

### Flujo 7: Recepción con Trazabilidad de Transporte

*Material vegetal regulado (semillas, esquejes) llega con documentación de transporte obligatoria. El sistema registra el viaje completo, inspecciona el material, captura documentos, y al confirmar genera los lotes de inventario.*

| # | Dominio | Acción |
|---|---|---|
| 1 | **REG** | El supervisor crea un shipment: supplier='Banco Genético XYZ', origin='Rionegro', carrier='Transportes Fríos SAS', vehicle='Placa ABC-123', type='inbound', status='received'. |
| 2 | **REG** | Se agregan shipment_items: 100 semillas SEM-GELATO-FEM, supplier_lot='BG-2026-089', cost_per_unit=$2.50, destination_zone='Almacén Semillas'. |
| 3 | **REG** | El sistema consulta shipment_doc_requirements para los productos del envío. Para la categoría 'material_vegetal': Guía ICA (mandatory), Certificado de origen genético (mandatory), Factura (mandatory). |
| 4 | **REG** | El supervisor sube/llena cada documento requerido. INSERT regulatory_documents con field_data según el schema del doc_type, file adjunto en Supabase Storage, shipment_id=este envío. |
| 5 | **REG** | Inspección: por cada línea, registrar received_quantity=98, rejected_quantity=2, inspection_result='accepted_with_observations', inspection_data={seed_coat_intact:true, viable:98, damaged:2}. |
| 6 | **INV** | Al confirmar: INSERT inventory_item (lote de 98 semillas) + INSERT inventory_transaction type='receipt'. UPDATE shipment_items.inventory_item_id y transaction_id. UPDATE inventory_items.shipment_item_id. |
| 7 | **INV** | Las 2 semillas rechazadas: INSERT inventory_transaction type='waste' o type='return'. |
| 8 | **REG** | Shipment status → 'accepted' (o 'partial_accepted'). Si hay documentos mandatorios faltantes → INSERT alert type='regulatory_missing'. |

### Flujo 8: Trazabilidad Completa Hacia Atrás

*Un auditor quiere verificar la cadena completa de un frasco de producto final. El sistema permite navegar desde el frasco hasta el origen del material vegetal. Se muestran dos rutas: origen por semilla externa y origen por clon de planta madre.*

**Ruta A — Origen por semilla externa:**

```
JAR-GELATO-28G (inventory_item — producto final empacado)
│
├── inventory_transaction type='transformation_in'
│   └── batch GELATO-2026-001
│       ├── Actividades: activities → activity_resources → inventory_transactions
│       ├── Calidad: quality_tests → quality_test_results
│       ├── Ambiente: environmental_readings
│       ├── Costos: overhead_costs + activity costs → COGS
│       └── Documentos regulatorios del batch:
│           ├── CoA (Certificado de Análisis) ✅ → quality_test vinculado
│           ├── Certificado de calidad post-cosecha ✅
│           └── Análisis de pesticidas ⚠️ vence en 15 días
│
├── Origen: inventory_item SEM-GELATO-FEM (semilla)
│   ├── Ingreso: activity ENTRY-MATERIAL → consumption → batch
│   └── shipment_item (expected: 100, received: 98, rejected: 2)
│       │   inspection_result: 'accepted_with_observations'
│       └── shipment SHP-2026-0015
│           ├── supplier: "Banco Genético XYZ"
│           ├── carrier: "Transportes Fríos SAS", vehículo: "ABC-123"
│           ├── transport_conditions: { temp: 4-8°C, cold_chain: true, 3h }
│           └── Documentos de transporte:
│               ├── Guía ICA #ANT-2026-00892 ✅
│               ├── Certificado de origen genético ✅
│               └── Factura proveedor #FV-2026-1234 ✅
│
├── Documentos del producto (per_product):
│   └── Ficha técnica del cultivar Gelato #41 ✅
│
└── Documentos de la facility (per_facility):
    ├── Licencia de cultivo ICA ✅ (vence dic 2026)
    ├── Registro sanitario INVIMA ✅
    └── Certificado orgánico ⚠️ (renovación en 45 días)
```

**Ruta B — Origen por clon de planta madre:**

```
JAR-GELATO-28G (inventory_item — producto final empacado)
│
├── inventory_transaction type='transformation_in'
│   └── batch GELATO-2026-042
│       ├── (misma estructura de actividades, calidad, costos, docs del batch)
│       └── ...
│
├── Origen: inventory_item CLONE-GELATO (clon producido internamente)
│   ├── Ingreso: activity ENTRY-MATERIAL → consumption → batch
│   └── inventory_transaction type='transformation_in' (producción del clon)
│       ├── activity: CLONE-CUT #47 (sesión de corte del 15-mar-2026)
│       └── batch: LOT-MADRE-GELATO-001 (planta madre)
│           ├── cultivar: Gelato #41, fase: madre, status: active
│           ├── Establecida: 01-ene-2026, 47 sesiones, 2,350 clones producidos
│           └── Origen de la madre: inventory_item SEM-GELATO-FEM
│               └── shipment SHP-2025-0089
│                   ├── supplier: "Banco Genético XYZ"
│                   └── Documentos: Guía ICA ✅, Cert. origen ✅
│
└── Documentos de facility: (mismos que Ruta A)
```

### Flujo 9: MIPE — Monitoreo Fitosanitario, Aplicación y Seguimiento

*Ciclo completo de Manejo Integrado de Plagas y Enfermedades: monitoreo programado → detección → programación de aplicación → ejecución con trazabilidad de producto → seguimiento de efectividad. Demuestra el uso de phytosanitary_agents, measurement_data, y la integración con inventario para productos de protección.*

**Parte 1 — Monitoreo fitosanitario:**

| # | Dominio | Acción |
|---|---|---|
| 1 | **ACT** | scheduled_activity aparece en el dashboard: template=MONITOR-FITOSAN, batch=LOT-GELATO, phase=floración, crop_day=45. El template.metadata define: {sampling_method: "zigzag", sample_size_formula: "sqrt(total_plants) × 1.5"}. |
| 2 | **ACT** | El agrónomo inicia la ejecución. Se crea activity con measurement_data: {sample_size: 15, total_plants: 90, sampling_method: "zigzag", phenological_stage: "floración semana 4"}. |
| 3 | **ACT** | Hallazgo 1: activity_observation — type='pest', agent_id=→ACARO_BLANCO, plant_part='leaf', incidence_value=12, incidence_unit='count', severity_pct=15.0, severity='medium', sample_size=15, description='Colonias en envés de hojas jóvenes del tercio superior, mayor concentración cerca del sistema de ventilación'. |
| 4 | **ACT** | Hallazgo 2: activity_observation — type='disease', agent_id=→BOTRYTIS_SP, plant_part='flower', incidence_value=8.5, incidence_unit='percentage', severity_pct=5.0, severity='low', sample_size=15, description='Manchas grises incipientes en cogollos densos, zona de baja circulación de aire'. |
| 5 | **OPS** | Fotos de cada hallazgo: attachments con entity_type='observation', entity_id=la observación, file_type='image/jpeg'. Cada foto preserva metadata EXIF (GPS, timestamp). |
| 6 | **OPS** | El severity='medium' del ácaro blanco genera alert: type='pest_detected', severity='warning', entity_type='activity_observation', entity_id=la observación, batch_id=LOT-GELATO, message='Ácaro blanco detectado en LOT-GELATO, incidencia 12 individuos, severidad 15%'. |

**Parte 2 — Programación y ejecución de aplicación:**

| # | Dominio | Acción |
|---|---|---|
| 7 | **ACT** | El agrónomo programa la aplicación: scheduled_activity con template=APLIC-MIPE-FOLIAR, batch=LOT-GELATO, planned_date=mañana. El template define: activity_template_resources con product=Acaricida X (product_id), quantity=2, quantity_basis='per_L_solution'. activity_template_checklist incluye: 'Verificar pH solución (5.5-6.5)', 'Verificar EC solución', 'Usar EPP completo', 'Cubrir sistema de riego'. |
| 8 | **ACT** | El operario ejecuta. Se crea activity con measurement_data: {water_ph: 6.5, water_ec_ms: 0.3, solution_ph: 5.8, solution_ec_ms: 2.1, total_water_volume_l: 200, total_product_dose_ml: 400, application_type: "foliar", equipment: "Bomba espalda 20L"}. |
| 9 | **ACT** | activity_resources: product=Acaricida X, inventory_item=lote específico (con supplier_lot_number para trazabilidad al proveedor), quantity_planned=400mL, quantity_actual=400mL. El sistema trae automáticamente desde products: phi_days=21 (periodo de carencia), rei_hours=4 (periodo de reentrada). Desde inventory_items: batch_number, cost_per_unit. |
| 10 | **INV** | inventory_transaction: type='application', quantity=400mL, batch_id=LOT-GELATO, phase_id=floración, activity_id=↑. El inventory_item del acaricida se reduce: quantity_available -= 400mL. |
| 11 | **OPS** | Verificación PHI: cosecha estimada en crop_day=75, hoy es crop_day=45, faltan 30 días. phi_days=21. Margen=9 días → OK. Si phi_days > días restantes → alert type='phi_violation', severity='critical', message='Aplicación de Acaricida X viola periodo de carencia. PHI=21 días, cosecha estimada en 15 días'. |
| 12 | **OPS** | Verificación REI: alert informativa con rei_hours=4. message='Periodo de reentrada: 4 horas. No ingresar a Sala Floración A hasta las 14:00'. |

**Parte 3 — Seguimiento:**

| # | Dominio | Acción |
|---|---|---|
| 13 | **ACT** | Se programa monitoreo de seguimiento: template=MONITOR-FITOSAN-SEGUIMIENTO, planned_date=hoy+7, crop_day=52, batch=LOT-GELATO. |
| 14 | **ACT** | El agrónomo ejecuta el seguimiento. Busca ácaro blanco → activity_observation: agent_id=→ACARO_BLANCO, incidence_value=2, severity_pct=3.0, severity='low'. La incidencia bajó de 12→2 individuos, severidad de 15%→3%. |
| 15 | **OPS** | Alert original (pest_detected) se marca como resolved_at=ahora. El historial completo queda: detección → aplicación (con producto, lote, dosis) → seguimiento → resolución. |

### Flujo 10: MIRFE — Monitoreo Nutricional y Preparación de Soluciones

*Manejo Integrado de la Relación Fertilización-Extracción: monitoreo de lisímetro/pasta saturada para evaluar disponibilidad nutricional, y preparación de soluciones stock con trazabilidad completa de insumos.*

**Parte 1 — Monitoreo de lisímetro de succión:**

| # | Dominio | Acción |
|---|---|---|
| 1 | **ACT** | scheduled_activity: template=MONITOR-LISIMETRO, batch=LOT-GELATO, phase=floración. El template.metadata define: {ec_target: "2.0-3.5 mS/cm", ph_target: "5.5-6.5", extraction_wait_hours: 6}. |
| 2 | **ACT** | Instalación: el agrónomo ejecuta la actividad. measurement_data registra la primera parte: {lysimeter_code: "LIS-A3-01", plant_id: "P-A3-L2-012", plant_height_cm: 85, phenological_stage: "floración sem 4", install_datetime: "2026-03-15T08:00:00"}. |
| 3 | **ACT** | Retiro (6 horas después): se completa measurement_data: {removal_datetime: "2026-03-15T14:00:00", extracted_volume_ml: 35, ec_ms: 4.8, ph: 5.2}. La UI compara contra template.metadata targets y resalta desviaciones. |
| 4 | **ACT** | EC=4.8 excede rango (2.0-3.5) → activity_observation: type='measurement', severity='warning', description='EC solución suelo 4.8 mS/cm excede rango óptimo (2.0-3.5). Posible acumulación de sales. Recomendar lavado o reducir concentración de fertirrigación'. |
| 5 | **OPS** | Se genera alert: type='env_out_of_range', severity='warning', entity_type='batch', entity_id=LOT-GELATO, message='EC suelo 4.8 mS/cm en LOT-GELATO excede rango. Acción requerida en próxima fertirrigación'. |

**Parte 2 — Monitoreo de pasta saturada:**

| # | Dominio | Acción |
|---|---|---|
| 6 | **ACT** | template=MONITOR-PASTA-SATURADA, batch=LOT-GELATO. measurement_data: {sample_number: 3, water_volume_ml: 200, soil_volume_ml: 100, solution_volume_ml: 150, ec_ms: 3.1, ph: 6.0, sample_datetime: "2026-03-16T09:30:00"}. |
| 7 | **ACT** | Los valores están dentro de rango → no se genera observación de alerta. Los datos quedan registrados para análisis de tendencia: measurement_data es queryable via JSONB operators para graficar EC a lo largo del ciclo. |

**Parte 3 — Preparación de soluciones stock:**

| # | Dominio | Acción |
|---|---|---|
| 8 | **INV** | recipe: name='Solución Stock A - Vegetativo', output_product=SOL-STOCK-A, base_quantity=10L, items=[{product: Ca(NO₃)₂, quantity: 800g}, {product: KNO₃, quantity: 500g}, {product: MgSO₄, quantity: 300g}]. Cada product tiene en su registro: composición, registro ICA, proveedor preferido. |
| 9 | **INV** | recipe_execution: recipe=Stock A, scale_factor=5.0 (preparar 50L), executed_by=operario. output_quantity_expected=50L, output_quantity_actual=49.5L, yield_pct=99%. |
| 10 | **ACT** | Actividad asociada: template=PREP-SOL-STOCK. measurement_data: {part_label: "A", water_ph: 7.1, water_ec_ms: 0.2, solution_ph: 4.2, solution_ec_ms: 85.0, water_volume_l: 50}. |
| 11 | **INV** | Consumo de insumos: inventory_transaction type='consumption' para Ca(NO₃)₂ (4000g), KNO₃ (2500g), MgSO₄ (1500g) — cada uno con trazabilidad al lote específico (inventory_item_id) y al proveedor. |
| 12 | **INV** | Producción: inventory_transaction type='transformation_in' → nuevo inventory_item SOL-STOCK-A, 49.5L, source_type='production'. Este stock se usa luego como recurso en las actividades de fertirrigación (Flujo 2), cerrando el ciclo. |

---

## Índices Recomendados y Queries Habilitadas

### Índices Compuestos Críticos

| Tabla | Índice | Caso de uso |
|---|---|---|
| inventory_transactions | (batch_id, type, timestamp) | Costeo por batch desglosado por tipo |
| activities | (batch_id, phase_id, performed_at) | Timeline de operaciones por batch y fase |
| scheduled_activities | (batch_id, status, planned_date) | Dashboard de actividades pendientes |
| plant_positions | (zone_id, status) | Ocupación de zonas |
| environmental_readings | (zone_id, parameter, timestamp) | Series temporales por zona y parámetro |
| quality_tests | (batch_id, status) | Tests pendientes por batch |
| alerts | (entity_type, entity_id, resolved_at) | Alertas activas por entidad |
| regulatory_documents | (company_id, status) | Documentos vigentes/vencidos |
| regulatory_documents | (batch_id) WHERE batch_id IS NOT NULL | Documentos por batch |
| regulatory_documents | (expiry_date) WHERE status='valid' | Documentos por vencer |
| shipments | (company_id, status) | Envíos por estado |
| shipments | (actual_arrival_date DESC) | Envíos recientes |
| shipment_items | (shipment_id) | Líneas del envío |
| activity_observations | (activity_id, type) | Observaciones por actividad y tipo |
| activity_observations | (agent_id) WHERE agent_id IS NOT NULL | Incidencias por agente fitosanitario |
| phytosanitary_agents | (company_id, crop_type_id, is_active) | Catálogo filtrado por empresa y cultivo |

### Queries Analíticas Habilitadas

La integración cross-domain permite las siguientes consultas:

**1.** COGS completo por batch: costos directos (SUM transactions WHERE batch_id) + overhead prorrateado

**2.** Rendimiento plan vs real por template: quantity_planned vs quantity_actual en activity_resources

**3.** Ocupación de zonas: COUNT(plant_positions WHERE status='planted') / zone.plant_capacity

**4.** Trazabilidad semilla → producto final: batch.source_inventory_item → inventory_items.shipment_item_id → shipment_items → shipments (con documentos)

**5.** Yield cascada real vs esperado: production_order_phases.yield_pct vs phase_product_flows.expected_yield_pct (por cultivar)

**6.** Condiciones ambientales reales vs óptimas: environmental_readings vs cultivars.optimal_conditions

**7.** Consumo por proveedor × periodo: transactions JOIN inventory_items JOIN products JOIN suppliers

**8.** Avance de órdenes: COUNT(order_phases WHERE status='completed') / COUNT(total)

**9.** Resultados de calidad por batch × fase: quality_tests JOIN quality_test_results

**10.** Genealogía completa de un batch: batch_lineage recursive con parent/child

**11.** Labor + consumibles por fase × batch: activity_resources agrupado por phase_id y category_id

**12.** Alertas activas agrupadas por severidad: alerts WHERE resolved_at IS NULL

**13.** Compliance regulatorio por batch: product_regulatory_requirements → regulatory_documents, calculando % de documentos válidos vs requeridos

**14.** Documentos por vencer en los próximos 30 días: regulatory_documents WHERE status='valid' AND expiry_date BETWEEN today AND today+30

**15.** Trazabilidad de transporte por proveedor: shipments → shipment_items con inspection_result, tasa de rechazo por proveedor

**16.** Compliance de transporte por envío: shipment_doc_requirements → regulatory_documents WHERE shipment_id, documentos faltantes vs cumplidos

**17.** Incidencia por agente fitosanitario × periodo: activity_observations JOIN phytosanitary_agents GROUP BY agent_id, mes — tendencias de plagas/enfermedades

**18.** Historial MIPE por batch: actividades de monitoreo → observaciones → aplicaciones → seguimiento, con efectividad (reducción de incidencia post-tratamiento)

**19.** Consumo de productos fitosanitarios por batch × fase: activity_resources JOIN products WHERE category='fitosanitario', con phi_days y rei_hours

**20.** Tendencia nutricional por batch: activities.measurement_data→>'ec_ms' y →>'ph' de monitoreos de lisímetro/pasta saturada a lo largo del ciclo