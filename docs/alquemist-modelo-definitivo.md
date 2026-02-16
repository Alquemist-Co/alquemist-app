# ALQUEMIST

Modelo de Datos Definitivo

*Sistema de Gestión para Cultivos de Cualquier Tipo*

43 tablas · 8 dominios + nexo · 9 tablas CORE

Febrero 2026

## Tabla de Contenidos

## Visión General de la Arquitectura

Alquemist es un modelo de datos diseñado para gestionar el ciclo
completo de producción agrícola, desde la semilla hasta el producto
final empacado. Su arquitectura se organiza en **8 dominios
independientes** conectados por un nexo central (**batches**), lo que
permite que cada dominio evolucione sin romper los demás.

El modelo soporta cualquier tipo de cultivo (cannabis, arándanos,
fresas, hortalizas) mediante fases de producción configurables por tipo
de cultivo. Las órdenes de producción permiten seleccionar subconjuntos
de fases, habilitando que viveros, procesadores y cultivadores
full-cycle operen sobre el mismo sistema.

| **Dominio** |  | **Tablas** | **Propósito** |
| --- | --- | --- | --- |
| **Sistema** | ⚙️ | companies, users | Multi-tenancy, roles y permisos |
| **Producción** | 🧬 | crop_types, cultivars, production_phases, phase_product_flows, cultivar_products | QUÉ se produce --- fases configurables con inputs/outputs |
| **Áreas** | 🏭 | facilities, zones, zone_structures, plant_positions | DÓNDE --- jerarquía espacial flexible |
| **Inventario** | 📦 | resource_categories, products, units_of_measure, suppliers, inventory_items, inventory_transactions, recipes, recipe_executions | CON QUÉ --- recursos con transacciones inmutables |
| **Actividades** | 📋 | activity_types, activity_templates, activity_template_phases, activity_template_resources, activity_template_checklist, cultivation_schedules, scheduled_activities, activities, activity_resources, activity_observations | QUÉ se hace --- template → scheduled → activity |
| **Nexo** | 🌱 | batches, batch_lineage | Conecta todo --- lote de producción central |
| **Órdenes** | 📋 | production_orders, production_order_phases | QUÉ fases ejecutar --- con entry/exit point |
| **Calidad** | 🔬 | quality_tests, quality_test_results | CUMPLE estándar --- laboratorio flexible |
| **Operaciones** | 📡 | overhead_costs, sensors, environmental_readings, alerts, attachments | Soporte transversal --- IoT, costos, alertas |

## Principios de Diseño

**Dominios independientes:** Cada dominio puede evolucionar sin afectar
a los demás. Las dependencias cross-domain se limitan a FKs bien
definidas.

**Batch como nexo:** El lote de producción conecta los 8 dominios: sabe
su cultivar, zona, producto actual, schedule, orden, fase actual, y
puede tener tests de calidad y lecturas ambientales.

**Transacciones inmutables:** inventory_transactions es append-only:
nunca se edita ni borra. Todo el estado del inventario se reconstruye
desde el log. Cada transacción registra contexto completo (zona +
batch + fase + actividad + usuario).

**Fases configurables:** Cada tipo de cultivo define sus propias fases.
El status del batch se deriva de current_phase_id, no de valores
hardcoded. Cannabis puede tener 7 fases, arándanos 4, y fresas 5 sin
cambiar código.

**Transformación centralizada:** phase_product_flows es la ÚNICA fuente
de verdad para qué entra y sale de cada fase. La cadena vegetal se
deriva de flows consecutivos: output de fase N = input de fase N+1.

**Órdenes flexibles:** entry_phase_id y exit_phase_id permiten que una
orden cubra un subconjunto de fases. Vivero: fases 1-2. Procesador:
fases 5-7. Full-cycle: fases 1-7.

**Producto como fuente de verdad de unidades:** Cada producto define su
default_unit_id. Conversiones misma dimensión via units_of_measure.
Conversiones cross-dimensión via products.density_g_per_ml.

**Auditoría universal:** Todas las tablas incluyen created_at,
updated_at, created_by, updated_by. Catálogos usan is_active como
soft-delete. Tablas transaccionales son append-only.

Flujo de Datos General

El modelo opera en dos cadenas principales que convergen en el batch:

Cadena de Configuración y Planificación

cultivar → production_phases → production_order → batch

Se selecciona un cultivar, el sistema carga sus fases, se crea una orden
con entry/exit point, y al aprobar se genera el batch con toda su
configuración.

Cadena de Ejecución Operativa

activity_template → scheduled_activity → activity →
inventory_transaction → inventory_item

Los templates definen la receta de actividad. Al programar se toma un
snapshot. Al ejecutar, el operario registra recursos reales que generan
transacciones inmutables de inventario.

Cadenas de Soporte

sensor → environmental_reading · quality_test → quality_test_results ·
overhead_costs → allocation a batches

**Vínculo central:** Todo se vincula a **batch** + **zone** + **phase**.
Esta tripleta permite cualquier consulta analítica.

## Diccionario de Tablas

Definición completa de las 43 tablas organizadas por dominio. Los campos
marcados como 'cross-domain' son FKs que conectan dominios entre sí.
Todas las tablas incluyen campos de auditoría estándar (created_at,
updated_at, created_by, updated_by) que no se listan explícitamente.

## Dominio: Sistema

### companies

Empresa / tenant — raíz del multi-tenancy. Cada empresa opera de forma
aislada con su propia configuración de moneda, zona horaria y features
habilitados.

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **name** | VARCHAR | *'AgroTech Colombia SAS'* |
| **legal_id** | VARCHAR opt | *NIT, RFC, EIN* |
| **country** | CHAR(2) | *'CO', 'US', 'MX'* |
| **timezone** | VARCHAR | *'America/Bogota'* |
| **currency** | CHAR(3) | *'COP', 'USD'* |
| **settings** | JSONB opt | *{logo_url, regulatory_mode, features_enabled}* |
| **is_active** | BOOLEAN | *default true --- soft delete* |

### users

Usuarios del sistema con rol y permisos granulares. Cada usuario
pertenece a una empresa y opcionalmente a una instalación.

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **company_id** | FK → companies |  |
| **email** | VARCHAR UNIQUE |  |
| **full_name** | VARCHAR |  |
| **role** | ENUM | *admin \&#124; manager \&#124; supervisor \&#124; operator \&#124; viewer* |
| **phone** | VARCHAR opt |  |
| **assigned_facility_id** | FK → facilities opt | *facility principal del usuario* |
| **permissions** | JSONB opt | *{can_approve_orders, can_adjust_inventory, can_delete}* |
| **is_active** | BOOLEAN | *default true* |
| **last_login_at** | TIMESTAMPTZ opt |  |

## Dominio: Producción

### crop_types

Tipo de cultivo que define el universo de fases y productos. Cada
crop_type tiene sus propias production_phases configurables, lo que
permite que cannabis tenga 7 fases, arándanos 4, y fresas 5 sin cambiar
código.

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **code** | VARCHAR UNIQUE | *'cannabis', 'blueberry', 'strawberry'* |
| **name** | VARCHAR | *'Cannabis Medicinal'* |
| **scientific_name** | VARCHAR opt | *'Cannabis sativa L.'* |
| **category** | ENUM | *annual \&#124; perennial \&#124; biennial* |
| **regulatory_framework** | VARCHAR opt | *'Resolución 227/2022'* |
| **icon** | VARCHAR opt |  |
| **is_active** | BOOLEAN | *default true* |

### cultivars [CORE]

Variedad específica dentro de un tipo de cultivo. Define características
de rendimiento, ciclo, perfil objetivo y condiciones óptimas de cultivo.
Es el punto de partida para cualquier orden de producción.

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **crop_type_id** | FK → crop_types |  |
| **code** | VARCHAR UNIQUE | *'GELATO-41', 'DUKE-BB'* |
| **name** | VARCHAR | *'Gelato #41'* |
| **breeder** | VARCHAR opt | *'Seed Junky Genetics'* |
| **genetics** | VARCHAR opt | *'Sunset Sherbet × Thin Mint GSC'* |
| **default_cycle_days** | INT opt | *127 --- duración total del ciclo* |
| **phase_durations** | JSONB opt | *{germination:7, vegetative:28, flowering:63}* |
| **expected_yield_per_plant_g** | DECIMAL opt | *500* |
| **expected_dry_ratio** | DECIMAL opt | *0.25 (25% peso húmedo → seco)* |
| **target_profile** | JSONB opt | *{THC:'20-25%', terpenes:\['limonene'\]}* |
| **quality_grade** | VARCHAR opt | *'Premium Indoor'* |
| **optimal_conditions** | JSONB opt | *{temp:'20-26°C', RH:'40-60%', EC:'1.2-2.4'}* |
| **density_plants_per_m2** | DECIMAL opt | *9* |
| **notes** | TEXT opt |  |
| **is_active** | BOOLEAN | *default true* |

### production_phases [CORE]

Fases de producción CONFIGURABLES por tipo de cultivo. Definen la
secuencia del ciclo productivo. El status del batch se deriva
directamente de la fase actual. Cada fase indica si transforma producto,
si destruye el input, y si puede ser entry o exit point para órdenes
parciales.

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **crop_type_id** | FK → crop_types |  |
| **code** | VARCHAR | *'germination', 'flowering', 'drying'* |
| **name** | VARCHAR | *'Floración'* |
| **sort_order** | INT | *secuencia: 1, 2, 3\...* |
| **is_transformation** | BOOLEAN | *true = producto cambia de estado* |
| **is_destructive** | BOOLEAN | *true = input se destruye (cosecha)* |
| **default_duration_days** | INT opt | *63 floración, 14 secado* |
| **requires_zone_change** | BOOLEAN | *true si debe cambiar de sala* |
| **can_skip** | BOOLEAN | *default false --- fase opcional en órdenes* |
| **can_be_entry_point** | BOOLEAN | *default false --- comprar clones = empezar aquí* |
| **can_be_exit_point** | BOOLEAN | *default false --- vender sin empacar = terminar aquí* |
| **depends_on_phase_id** | FK → self opt | *secado depende de cosecha* |
| **icon, color** | VARCHAR opt |  |

### phase_product_flows [CORE]

FUENTE DE VERDAD de transformación — define QUÉ ENTRA y QUÉ SALE de
cada fase. Cuando un batch avanza de fase, esta tabla determina qué
inventory_items se crean y destruyen. La cadena vegetal se deriva de
flows consecutivos: el output de la fase N es el input de la fase N+1.

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **phase_id** | FK → production_phases |  |
| **direction** | ENUM | *'input' \&#124; 'output'* |
| **product_role** | ENUM | *'primary' \&#124; 'secondary' \&#124; 'byproduct' \&#124; 'waste'* |
| **product_id** | FK → products opt | *producto específico (cultivar-specific)* |
| **product_category_id** | FK → resource_categories opt | *O categoría genérica* |
| **expected_yield_pct** | DECIMAL opt | *90% germinación, 25% seco/húmedo* |
| **expected_quantity_per_input** | DECIMAL opt | *500g flor húmeda por planta* |
| **unit_id** | FK → units_of_measure opt |  |
| **is_required** | BOOLEAN | *default true --- false = output opcional (trim)* |
| **sort_order** | INT |  |
| **notes** | TEXT opt |  |

### cultivar_products

Catálogo de SKUs por cultivar — mapea variedad → productos. Solo
registra QUÉ productos existen para un cultivar y en qué fase se
producen, sin duplicar la lógica de transformación que vive en
phase_product_flows.

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **cultivar_id** | FK → cultivars |  |
| **product_id** | FK → products | *SKU: SEM-GELATO, WET-GELATO\...* |
| **phase_id** | FK → production_phases opt | *fase donde se produce este SKU* |
| **is_primary** | BOOLEAN | *true=principal, false=subproducto* |
| **sort_order** | INT |  |

## Dominio: Áreas

### facilities

Instalación física — raíz de la jerarquía espacial. Cada facility
pertenece a una empresa y contiene N zonas. Los campos calculados se
derivan de las zonas hijas.

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **company_id** | FK → companies |  |
| **name** | VARCHAR | *'Invernadero Principal'* |
| **type** | ENUM | *indoor_warehouse \&#124; greenhouse \&#124; tunnel \&#124; open_field \&#124; vertical_farm* |
| **total_footprint_m2** | DECIMAL | *500.00* |
| **total_growing_area_m2** | DECIMAL calc | *Σ(zones.effective_growing_area_m2)* |
| **total_plant_capacity** | INT calc | *Σ(zones.plant_capacity)* |
| **address** | TEXT |  |
| **latitude, longitude** | DECIMAL opt |  |
| **is_active** | BOOLEAN | *default true* |

### zones [CORE]

Espacio físico real (sala, nave, lote) — UNIDAD OPERATIVA PRINCIPAL.
Las zonas son donde ocurren las actividades y donde viven los batches.
La capacidad se calcula desde zone_structures si existen, o se establece
directamente para zonas simples (campo abierto, túneles sin estructuras
internas).

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **facility_id** | FK → facilities |  |
| **name** | VARCHAR | *'Sala Vegetativo A', 'Lote Norte'* |
| **purpose** | ENUM | *propagation \&#124; vegetation \&#124; flowering \&#124; drying \&#124; processing \&#124; storage \&#124; multipurpose* |
| **environment** | ENUM | *indoor_controlled \&#124; greenhouse \&#124; tunnel \&#124; open_field* |
| **area_m2** | DECIMAL | *área de piso* |
| **height_m** | DECIMAL opt |  |
| **effective_growing_area_m2** | DECIMAL calc | *con structures: Σ(area×levels), sin: area_m2* |
| **plant_capacity** | INT calc | *con structures: Σ(max_positions), sin: area_m2 × density* |
| **climate_config** | JSONB opt | *{temp, HR, CO₂, fotoperiodo}* |
| **status** | ENUM | *active \&#124; maintenance \&#124; inactive* |

### zone_structures

OPCIONAL — Configuración física dentro de una zona para calcular
capacidad. Solo necesaria para zonas con racks verticales, mesas
rolling, hileras, o cualquier estructura que multiplique el área
efectiva. Zonas simples (campo abierto) no requieren esta tabla.

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **zone_id** | FK → zones |  |
| **name** | VARCHAR | *'Rack A1', 'Hilera 3', 'Mesa Rolling B'* |
| **type** | ENUM | *mobile_rack \&#124; fixed_rack \&#124; rolling_bench \&#124; row \&#124; bed \&#124; trellis_row \&#124; nft_channel* |
| **length_m** | DECIMAL |  |
| **width_m** | DECIMAL |  |
| **is_mobile** | BOOLEAN | *default false* |
| **num_levels** | INT | *default 1 --- suelo/hilera=1, racks=2-8* |
| **positions_per_level** | INT opt | *posiciones de planta por nivel* |
| **max_positions** | INT calc | *num_levels × positions_per_level* |
| **level_config** | JSONB opt | *\[{level:1, height_m, lighting, irrigation, substrate}\]* |
| **spacing_cm** | DECIMAL opt | *entre plantas* |
| **pot_size_L** | DECIMAL opt |  |

### plant_positions

OPCIONAL — Spot individual de planta. Solo se usa cuando se requiere
trazabilidad por planta individual (regulación cannabis medicinal,
investigación). Para cultivos extensivos NO se crean posiciones: el
batch opera a nivel de zona.

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **zone_id** | FK → zones |  |
| **structure_id** | FK → zone_structures opt | *si la zona tiene estructuras* |
| **level_number** | INT opt | *nivel dentro de la estructura* |
| **position_index** | INT |  |
| **label** | VARCHAR opt | *'A1-L2-P05' para trazabilidad* |
| **status** | ENUM | *empty \&#124; planted \&#124; harvested \&#124; maintenance* |
| **current_batch_id** | FK → batches opt | *cross-domain* |

## Dominio: Inventario

### resource_categories

Categorías jerárquicas de recursos con 11 tipos base configurables y
herencia padre-hijo. Determinan el comportamiento: si es consumible,
depreciable o transformable.

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **parent_id** | FK → self opt | *nutrient → nutrient.salt → nutrient.salt.calcium* |
| **name, code** | VARCHAR |  |
| **icon, color** | VARCHAR opt |  |
| **is_consumable** | BOOLEAN | *true = se agota (insumos, EPP)* |
| **is_depreciable** | BOOLEAN | *true = equipos con vida útil* |
| **is_transformable** | BOOLEAN | *true = material vegetal* |
| **default_lot_tracking** | ENUM | *required \&#124; optional \&#124; none* |
| **is_active** | BOOLEAN | *default true* |

### products [CORE]

Catálogo maestro — TODO lo que existe como recurso o producto. FUENTE
DE VERDAD para unidades de medida. Incluye propiedades de conversión
producto-específicas para transformaciones cross-dimensión (densidad
para volumen↔masa). La cadena de transformación se deriva exclusivamente
de phase_product_flows.

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **sku** | VARCHAR UNIQUE | *SEM-GELATO-FEM, CANO3-25KG* |
| **name** | VARCHAR |  |
| **category_id** | FK → resource_categories |  |
| **default_unit_id** | FK → units_of_measure | *FUENTE DE VERDAD de unidad* |
| **cultivar_id** | FK → cultivars opt | *vincula producto vegetal con variedad (cross-domain)* |
| **procurement_type** | ENUM | *purchased \&#124; produced \&#124; both* |
| **lot_tracking** | ENUM | *required \&#124; optional \&#124; none* |
| **shelf_life_days** | INT opt | *auto-calcula vencimiento* |
| **phi_days** | INT opt | *Pre-Harvest Interval* |
| **rei_hours** | INT opt | *Re-Entry Interval* |
| **default_yield_pct** | DECIMAL opt | *90% germinación, 25% seco/húmedo* |
| **density_g_per_ml** | DECIMAL opt | *para convertir volumen↔masa en este producto* |
| **conversion_properties** | JSONB opt | *{ppm_factor, dilution_ratio}* |
| **default_price** | DECIMAL opt |  |
| **price_currency** | CHAR(3) opt | *COP, USD* |
| **preferred_supplier_id** | FK → suppliers opt |  |
| **is_active** | BOOLEAN | *default true* |

### units_of_measure

Unidades con conversiones dentro de la misma dimensión (kg→g, L→mL). Las
conversiones cross-dimensión (volumen↔masa) viven en
products.density_g_per_ml.

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **code, name** | VARCHAR | *kg / Kilogramo, mL / Mililitro* |
| **dimension** | ENUM | *mass \&#124; volume \&#124; count \&#124; area \&#124; energy \&#124; time \&#124; concentration* |
| **base_unit_id** | FK → self opt | *g para mass, mL para volume* |
| **to_base_factor** | DECIMAL | *×1000 para kg→g* |

### suppliers

Proveedores de insumos y servicios.

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **company_id** | FK → companies |  |
| **name** | VARCHAR |  |
| **contact_info** | JSONB |  |
| **payment_terms** | VARCHAR opt |  |
| **is_active** | BOOLEAN | *default true* |

### inventory_items

Instancias de stock — CUÁNTO hay, DÓNDE, de QUÉ lote. Cada registro
representa un lote específico de un producto en una ubicación. Los
campos quantity_reserved y quantity_committed permiten control de
disponibilidad en tiempo real.

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **product_id** | FK → products |  |
| **zone_id** | FK → zones opt | *dónde está almacenado (cross-domain)* |
| **quantity_available** | DECIMAL |  |
| **quantity_reserved** | DECIMAL | *reservado para actividades programadas* |
| **quantity_committed** | DECIMAL | *comprometido en ejecución* |
| **unit_id** | FK → units_of_measure |  |
| **batch_number** | VARCHAR opt | *lote interno* |
| **supplier_lot_number** | VARCHAR opt |  |
| **cost_per_unit** | DECIMAL opt |  |
| **expiration_date** | DATE opt |  |
| **source_type** | ENUM | *purchase \&#124; production \&#124; transfer \&#124; transformation* |
| **lot_status** | ENUM | *available \&#124; quarantine \&#124; expired \&#124; depleted* |

### inventory_transactions [CORE]

Log INMUTABLE (append-only) de cada movimiento de recurso. NUNCA se
edita ni borra. Cada transacción registra contexto completo: zona,
batch, fase, actividad y usuario, lo que permite reconstruir el estado
del inventario en cualquier momento y calcular costos por cualquier
dimensión.

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **type** | ENUM | *receipt \&#124; consumption \&#124; application \&#124; transfer_out \&#124; transfer_in \&#124; transformation_out \&#124; transformation_in \&#124; adjustment \&#124; waste \&#124; return \&#124; reservation \&#124; release* |
| **inventory_item_id** | FK → inventory_items |  |
| **quantity** | DECIMAL | *siempre POSITIVO, type determina +/-* |
| **unit_id** | FK → units_of_measure |  |
| **timestamp** | TIMESTAMPTZ | *momento exacto --- inmutable* |
| **zone_id** | FK → zones opt | *cross-domain* |
| **batch_id** | FK → batches opt | *cross-domain* |
| **phase_id** | FK → production_phases opt | *cross-domain* |
| **activity_id** | FK → activities opt | *cross-domain* |
| **recipe_execution_id** | FK → recipe_executions opt |  |
| **related_transaction_id** | FK → self opt | *vincula out↔in de transformación* |
| **target_item_id** | FK → inventory_items opt | *item destino creado* |
| **cost_per_unit** | DECIMAL opt |  |
| **cost_total** | DECIMAL opt |  |
| **user_id** | FK → users |  |
| **reason** | TEXT opt | *obligatorio para waste y adjustment* |

### recipes

Fórmulas / BOM (solución nutritiva, mezcla sustrato, etc.).

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **name, code** | VARCHAR |  |
| **output_product_id** | FK → products |  |
| **base_quantity** | DECIMAL | *1000L base* |
| **base_unit_id** | FK → units_of_measure |  |
| **items** | JSONB | *\[{product_id, quantity, unit_id}\]* |
| **is_active** | BOOLEAN | *default true* |

### recipe_executions

Cada ejecución de una receta — agrupa N transacciones de inventario.

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **recipe_id** | FK → recipes |  |
| **executed_by** | FK → users |  |
| **scale_factor** | DECIMAL | *base 1000L, hice 500L → 0.5* |
| **output_quantity_expected** | DECIMAL |  |
| **output_quantity_actual** | DECIMAL |  |
| **yield_pct** | DECIMAL calc | *actual/expected × 100* |
| **batch_id** | FK → batches opt | *cross-domain* |
| **executed_at** | TIMESTAMPTZ |  |

## Dominio: Actividades

### activity_types

Tipos base de actividad (\~15-30 registros). Clasificación de primer
nivel para agrupación y reporting.

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **name** | VARCHAR | *'Fertirrigación', 'Poda', 'Cosecha', 'Trasplante'* |
| **category** | VARCHAR opt |  |
| **is_active** | BOOLEAN | *default true* |

### activity_templates

Receta de actividad reutilizable con recursos, checklist y reglas de
negocio. Al programar o ejecutar una actividad se toma un snapshot del
estado actual del template; cambios futuros no afectan lo ya programado
o ejecutado. Fases aplicables via tabla de unión
activity_template_phases.

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **code** | VARCHAR UNIQUE | *FERT-VEG-S1, HARV-MANUAL-CUT* |
| **activity_type_id** | FK → activity_types |  |
| **name** | VARCHAR | *'Fertirrigación Vegetativa Sem 1-2'* |
| **frequency** | ENUM | *daily \&#124; weekly \&#124; biweekly \&#124; once \&#124; on_demand* |
| **estimated_duration_min** | INT | *30, 90, 360* |
| **trigger_day_from** | INT opt | *día mínimo del ciclo* |
| **trigger_day_to** | INT opt | *día máximo del ciclo* |
| **depends_on_template_id** | FK → self opt | *secado depende de cosecha* |
| **triggers_phase_change_id** | FK → production_phases opt | *al completar → avanza fase* |
| **triggers_transformation** | BOOLEAN | *cosecha genera transformation_out/in* |
| **metadata** | JSONB opt | *{EC_target, pH_target, temp_range, benchmarks}* |
| **is_active** | BOOLEAN | *default true* |

### activity_template_phases

Tabla de unión template↔fases con FK enforcement e índices eficientes.
UNIQUE(template_id, phase_id).

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **template_id** | FK → activity_templates |  |
| **phase_id** | FK → production_phases |  |

### activity_template_resources

Recursos planeados por template con 5 modos de escalado automático según
el contexto de ejecución.

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **template_id** | FK → activity_templates |  |
| **product_id** | FK → products | *conecta con catálogo inventario (cross-domain)* |
| **quantity** | DECIMAL | *0.8 (g/L), 5 (L/planta), 0.5 (horas)* |
| **quantity_basis** | ENUM | *fixed \&#124; per_plant \&#124; per_m2 \&#124; per_zone \&#124; per_L_solution* |
| **is_optional** | BOOLEAN |  |
| **sort_order** | INT |  |
| **notes** | TEXT opt |  |

### activity_template_checklist

Pasos del checklist por template — verificaciones obligatorias o
informativas en campo.

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **template_id** | FK → activity_templates |  |
| **step_order** | INT |  |
| **instruction** | TEXT | *'Verificar EC del drenaje'* |
| **is_critical** | BOOLEAN | *true = bloquea completar sin cumplir* |
| **requires_photo** | BOOLEAN |  |
| **expected_value** | VARCHAR opt | *'5.8-6.2'* |
| **tolerance** | VARCHAR opt | *'±0.2'* |

### cultivation_schedules

Plan maestro de cultivo — genera actividades automáticamente al crear
un batch a partir de una orden aprobada.

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **name** | VARCHAR | *'Plan Gelato Indoor 127 días'* |
| **cultivar_id** | FK → cultivars | *cross-domain* |
| **total_days** | INT | *127* |
| **phase_config** | JSONB | *\[{phase_id, duration_days, templates:\[\...\]}\]* |
| **is_active** | BOOLEAN | *default true* |

### scheduled_activities

Actividad programada del plan. Guarda un template_snapshot JSONB al
momento de programar para que cambios futuros al template no afecten lo
ya programado.

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **schedule_id** | FK → cultivation_schedules |  |
| **template_id** | FK → activity_templates |  |
| **batch_id** | FK → batches | *cross-domain* |
| **planned_date** | DATE |  |
| **crop_day** | INT | *día 45 del ciclo* |
| **phase_id** | FK → production_phases | *cross-domain* |
| **template_snapshot** | JSONB opt | *{resources, checklist, metadata} al programar* |
| **status** | ENUM | *pending \&#124; completed \&#124; skipped \&#124; overdue* |
| **completed_activity_id** | FK → activities opt | *se llena al ejecutar* |

### activities [CORE]

Registro REAL de ejecución — lo que realmente pasó en campo. Puede
originarse de un scheduled_activity o ser ad-hoc. Conecta batch, zona y
fase para trazabilidad completa.

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **activity_type_id** | FK → activity_types |  |
| **template_id** | FK → activity_templates opt | *puede ser ad-hoc sin template* |
| **scheduled_activity_id** | FK → scheduled_activities opt |  |
| **batch_id** | FK → batches | *cross-domain* |
| **zone_id** | FK → zones | *cross-domain* |
| **performed_by** | FK → users |  |
| **performed_at** | TIMESTAMPTZ |  |
| **duration_minutes** | INT |  |
| **phase_id** | FK → production_phases | *cross-domain* |
| **crop_day** | INT opt |  |
| **status** | ENUM | *in_progress \&#124; completed \&#124; cancelled* |
| **notes** | TEXT opt |  |

### activity_resources

Recursos REALMENTE consumidos — genera inventory_transactions
automáticamente al registrarse.

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **activity_id** | FK → activities |  |
| **product_id** | FK → products | *cross-domain* |
| **inventory_item_id** | FK → inventory_items opt | *de qué lote específico* |
| **quantity_planned** | DECIMAL opt | *del template escalado* |
| **quantity_actual** | DECIMAL | *lo que realmente se usó* |
| **unit_id** | FK → units_of_measure |  |
| **cost_total** | DECIMAL opt |  |
| **transaction_id** | FK → inventory_transactions opt | *la transacción generada* |

### activity_observations

Observaciones de campo — plagas, enfermedades, deficiencias,
mediciones. Fotos via tabla attachments.

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **activity_id** | FK → activities |  |
| **type** | ENUM | *pest \&#124; disease \&#124; deficiency \&#124; environmental \&#124; general \&#124; measurement* |
| **severity** | ENUM | *info \&#124; low \&#124; medium \&#124; high \&#124; critical* |
| **description** | TEXT |  |
| **affected_plants** | INT opt |  |
| **action_taken** | TEXT opt |  |

## Dominio: Nexo (Batches)

### batches [CORE]

NEXO CENTRAL del modelo — conecta los 8 dominios. Su status es
genérico (active | phase_transition | completed | cancelled |
on_hold) y la fase actual la da current_phase_id. Soporta genealogía via
parent_batch_id para splits de lotes.

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **code** | VARCHAR UNIQUE | *LOT-GELATO-260301* |
| **cultivar_id** | FK → cultivars | *cross-domain PROD* |
| **zone_id** | FK → zones | *zona actual --- cross-domain ÁREAS* |
| **plant_count** | INT | *42 plantas* |
| **area_m2** | DECIMAL opt |  |
| **source_inventory_item_id** | FK → inventory_items opt | *cross-domain INV* |
| **current_product_id** | FK → products opt | *cross-domain INV* |
| **schedule_id** | FK → cultivation_schedules opt | *cross-domain ACT* |
| **current_phase_id** | FK → production_phases | *cross-domain PROD --- define el estado real* |
| **production_order_id** | FK → production_orders opt | *cross-domain ÓRDENES* |
| **parent_batch_id** | FK → self opt | *batch origen en caso de split* |
| **start_date** | DATE |  |
| **expected_end_date** | DATE opt |  |
| **status** | ENUM | *active \&#124; phase_transition \&#124; completed \&#124; cancelled \&#124; on_hold* |
| **yield_wet_kg** | DECIMAL opt |  |
| **yield_dry_kg** | DECIMAL opt |  |
| **total_cost** | DECIMAL calc | *SUM(inventory_transactions.cost_total WHERE batch_id)* |

### batch_lineage

Registro de splits y merges entre batches para trazabilidad completa.
Cada registro documenta una operación con cantidad transferida, razón y
responsable.

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **operation** | ENUM | *split \&#124; merge* |
| **parent_batch_id** | FK → batches | *batch origen* |
| **child_batch_id** | FK → batches | *batch destino* |
| **quantity_transferred** | DECIMAL | *plantas o kg transferidos* |
| **unit_id** | FK → units_of_measure |  |
| **reason** | TEXT | *'10 plantas retrasadas', 'Consolidar secado'* |
| **performed_by** | FK → users |  |
| **performed_at** | TIMESTAMPTZ |  |

## Dominio: Órdenes

### production_orders [CORE]

Orden de producción — selecciona cultivar, cantidad, y subconjunto de
fases a ejecutar. Los entry/exit points permiten que un vivero opere
fases 1-2, un procesador 5-7, y un cultivador full-cycle 1-7 con el
mismo modelo.

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **code** | VARCHAR UNIQUE | *'OP-2026-001'* |
| **company_id** | FK → companies |  |
| **cultivar_id** | FK → cultivars |  |
| **entry_phase_id** | FK → production_phases | *donde empieza* |
| **exit_phase_id** | FK → production_phases | *donde termina* |
| **initial_quantity** | DECIMAL | *50 semillas, 100 esquejes, 21kg flor* |
| **initial_unit_id** | FK → units_of_measure |  |
| **initial_product_id** | FK → products opt | *producto de entrada si ya existe* |
| **expected_output_quantity** | DECIMAL opt | *calculado en cascada desde yields* |
| **expected_output_product_id** | FK → products opt |  |
| **zone_id** | FK → zones opt | *zona inicial* |
| **planned_start_date** | DATE |  |
| **planned_end_date** | DATE opt | *calculado desde phase durations* |
| **assigned_to** | FK → users opt |  |
| **status** | ENUM | *draft \&#124; approved \&#124; in_progress \&#124; completed \&#124; cancelled* |
| **priority** | ENUM | *low \&#124; normal \&#124; high \&#124; urgent* |
| **notes** | TEXT opt |  |

### production_order_phases

Fases seleccionadas de la orden con planificación individual y registro
de ejecución real (input/output/yield por fase).

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **order_id** | FK → production_orders |  |
| **phase_id** | FK → production_phases |  |
| **sort_order** | INT |  |
| **planned_start_date** | DATE opt |  |
| **planned_end_date** | DATE opt |  |
| **planned_duration_days** | INT opt | *override del default cultivar* |
| **zone_id** | FK → zones opt | *zona asignada para esta fase* |
| **actual_start_date** | DATE opt |  |
| **actual_end_date** | DATE opt |  |
| **batch_id** | FK → batches opt | *batch asignado cuando inicia* |
| **input_quantity** | DECIMAL opt | *lo que entró realmente* |
| **output_quantity** | DECIMAL opt | *lo que salió realmente* |
| **yield_pct** | DECIMAL opt | *output/input × 100* |
| **status** | ENUM | *pending \&#124; ready \&#124; in_progress \&#124; completed \&#124; skipped* |

## Dominio: Calidad

### quality_tests

Análisis de laboratorio por batch. Flexible para cualquier cultivo:
THC/CBD para cannabis, brix para frutas, calibre para hortalizas,
contaminantes y pesticidas para todos.

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **batch_id** | FK → batches | *cross-domain* |
| **phase_id** | FK → production_phases opt | *en qué fase se tomó la muestra* |
| **test_type** | VARCHAR | *'potency', 'contaminants', 'brix', 'caliber'* |
| **lab_name** | VARCHAR opt | *'ChemHistory Labs'* |
| **lab_reference** | VARCHAR opt | *número de muestra del lab* |
| **sample_date** | DATE |  |
| **result_date** | DATE opt |  |
| **status** | ENUM | *pending \&#124; in_progress \&#124; completed \&#124; failed \&#124; rejected* |
| **overall_pass** | BOOLEAN opt | *true si todos los parámetros pasaron* |
| **notes** | TEXT opt |  |
| **performed_by** | FK → users opt |  |

### quality_test_results

Resultado individual por parámetro. Soporta valores textuales y
numéricos con thresholds para aprobación automática.

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **test_id** | FK → quality_tests |  |
| **parameter** | VARCHAR | *'THC', 'CBD', 'Brix', 'E.coli', 'Limonene'* |
| **value** | VARCHAR | *'23.5', '\< 0.01', 'positive'* |
| **numeric_value** | DECIMAL opt | *23.5 para comparaciones programáticas* |
| **unit** | VARCHAR opt | *'%', 'ppm', 'CFU/g', 'mg/g'* |
| **min_threshold** | DECIMAL opt | *límite inferior aceptable* |
| **max_threshold** | DECIMAL opt | *límite superior aceptable* |
| **passed** | BOOLEAN opt | *null si no aplica threshold* |

## Dominio: Operaciones

### overhead_costs

Costos indirectos no vinculados a actividades específicas (energía,
renta, depreciación, seguros). Prorrateables a batches según la base de
asignación para calcular COGS real completo.

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **facility_id** | FK → facilities |  |
| **zone_id** | FK → zones opt | *null = aplica a toda la facility* |
| **cost_type** | ENUM | *energy \&#124; rent \&#124; depreciation \&#124; insurance \&#124; maintenance \&#124; labor_fixed \&#124; other* |
| **description** | VARCHAR | *'Electricidad Enero 2026'* |
| **amount** | DECIMAL |  |
| **currency** | CHAR(3) |  |
| **period_start** | DATE |  |
| **period_end** | DATE |  |
| **allocation_basis** | ENUM | *per_m2 \&#124; per_plant \&#124; per_batch \&#124; per_zone \&#124; even_split* |
| **notes** | TEXT opt |  |

### sensors

Sensores IoT instalados en zonas para monitoreo ambiental continuo.

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **zone_id** | FK → zones |  |
| **type** | ENUM | *temperature \&#124; humidity \&#124; co2 \&#124; light \&#124; ec \&#124; ph \&#124; soil_moisture \&#124; vpd* |
| **brand_model** | VARCHAR opt | *'Trolmaster Aqua-X Pro'* |
| **serial_number** | VARCHAR opt |  |
| **calibration_date** | DATE opt |  |
| **is_active** | BOOLEAN | *default true* |

### environmental_readings

Lecturas de sensores. zone_id denormalizado para queries rápidas.
Permite comparar condiciones reales vs óptimas del cultivar.

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **sensor_id** | FK → sensors |  |
| **zone_id** | FK → zones | *denormalizado para performance* |
| **parameter** | ENUM | *temperature \&#124; humidity \&#124; co2 \&#124; light_ppfd \&#124; ec \&#124; ph \&#124; vpd* |
| **value** | DECIMAL |  |
| **unit** | VARCHAR | *'°C', '%RH', 'ppm', 'µmol/m²/s'* |
| **timestamp** | TIMESTAMPTZ |  |

### alerts

Alertas y notificaciones del sistema. Usa entity polimórfico
(entity_type + entity_id) para vincularse a cualquier tabla del modelo.

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **type** | ENUM | *overdue_activity \&#124; low_inventory \&#124; stale_batch \&#124; expiring_item \&#124; env_out_of_range \&#124; order_delayed \&#124; quality_failed* |
| **severity** | ENUM | *info \&#124; warning \&#124; critical* |
| **entity_type** | VARCHAR | *'batch', 'inventory_item', 'scheduled_activity', 'sensor'* |
| **entity_id** | UUID |  |
| **message** | TEXT |  |
| **triggered_at** | TIMESTAMPTZ |  |
| **acknowledged_by** | FK → users opt |  |
| **acknowledged_at** | TIMESTAMPTZ opt |  |
| **resolved_at** | TIMESTAMPTZ opt |  |

### attachments

Adjuntos genéricos (fotos, certificados, documentos regulatorios, PDFs)
vinculables a cualquier entidad del sistema.

| **Campo** | **Tipo** | **Detalle** |
| --- | --- | --- |
| **id** | UUID PK |  |
| **entity_type** | VARCHAR | *'activity', 'batch', 'quality_test', 'observation'* |
| **entity_id** | UUID |  |
| **file_url** | TEXT |  |
| **file_type** | VARCHAR | *'image/jpeg', 'application/pdf'* |
| **file_size_bytes** | INT opt |  |
| **description** | VARCHAR opt |  |
| **uploaded_by** | FK → users |  |
| **uploaded_at** | TIMESTAMPTZ |  |

Relaciones Cross-Domain

Las FKs cross-domain conectan los dominios entre sí. Están concentradas
en tres tablas clave: batches (el nexo), inventory_transactions (el log
inmutable), y activities (la ejecución en campo).

Batch — El Nexo Central

| **FK** | **Dominio** | **Propósito** |
| --- | --- | --- |
| cultivar_id → cultivars | **PROD** | Qué variedad se cultiva |
| current_phase_id → | **PROD** | En qué fase está --- define el |
| production_phases |  | estado real del batch |
| production_order_id → | **ÓRDENES** | Qué orden lo generó |
| production_orders |  |  |
| zone_id → zones | **ÁREAS** | Dónde está físicamente |
| current_product_id → | **INV** | Qué producto es actualmente en la |
| products |  | cadena |
| source_inventory_item_id → | **INV** | De qué semilla/esqueje viene |
| inventory_items |  |  |
| schedule_id → | **ACT** | Qué plan de cultivo sigue |
| cultivation_schedules |  |  |
| parent_batch_id → batches | **NEXO** | De qué batch se originó en un split |

Inventory Transactions — El Log Universal

| **FK** | **Dominio** | **Propósito** |
| --- | --- | --- |
| zone_id → zones | **ÁREAS** | Dónde ocurrió el movimiento |
| batch_id → batches | **NEXO** | Para qué lote |
| phase_id → production_phases | **PROD** | En qué fase del ciclo |
| activity_id → activities | **ACT** | Qué actividad lo causó |
| user_id → users | **SYS** | Quién lo ejecutó |

Jerarquías Internas por Dominio

| **Dominio** | **Relación** |
| --- | --- |
| **SYS** | companies 1→N users |
| **PROD** | crop_types 1→N cultivars 1→N cultivar_products N→1 products |
| **PROD** | crop_types 1→N production_phases 1→N phase_product_flows N→1 products |
| **PROD** | production_phases →self (depends_on_phase_id) |
| **ÁREAS** | facilities 1→N zones 1→N zone_structures(opt) \&#124; zones 1→N plant_positions(opt) |
| **INV** | resource_categories →self (parent_id) \&#124; products N→1 categories + units |
| **INV** | inventory_items N→1 products \&#124; transactions N→1 items + →self (related) |
| **ACT** | templates 1→N template_phases + template_resources + template_checklist |
| **ACT** | cultivation_schedules 1→N scheduled_activities N→1 templates |
| **ACT** | activities 1→N activity_resources + activity_observations |
| **NEXO** | batches →self (parent_batch_id) \&#124; batches 1→N batch_lineage |
| **ORD** | production_orders 1→N production_order_phases N→1 production_phases |
| **QUAL** | quality_tests 1→N quality_test_results |
| **OPS** | sensors 1→N environmental_readings \&#124; alerts/attachments → entity (polimórfico) |

Flujos Operativos Detallados

Descripción paso a paso de cómo interactúan las tablas durante las
operaciones más comunes del sistema. Cada paso indica el dominio que
interviene y las tablas afectadas.

Flujo 1: Crear Orden de Producción y Batch

*Inicia el ciclo productivo. Un gerente selecciona un cultivar,
configura la orden con las fases deseadas, y al aprobar, el sistema
genera el batch y programa las actividades.*

| **\#** | **Dominio** | **Acción** |
| --- | --- | --- |
| **1** | **PROD** | El gerente selecciona un cultivar (ej: Gelato #41). El sistema carga automáticamente las production_phases del crop_type asociado (para cannabis: germinación, propagación, vegetativo, floración, cosecha, secado, empaque = 7 fases). |
| **2** | **ORDER** | Se crea un production_order con: cultivar_id=Gelato, entry_phase_id=germinación, exit_phase_id=empaque, initial_quantity=50 semillas. Si fuera un procesador, entry_phase sería 'secado' y la cantidad sería '21kg flor húmeda'. |
| **3** | **ORDER** | El sistema genera automáticamente production_order_phases para las fases 1-7, con planned_duration_days tomados del cultivar.phase_durations o de production_phases.default_duration_days. |
| **4** | **PROD** | Cálculo en cascada usando phase_product_flows: 50 semillas × 90% germinación × 95% vegetativo × 98% floración × 500g/planta × 25% ratio seco × 80% trimming = \~4.7kg producto final. Se registra en expected_output_quantity. |
| **5** | **NEXO** | Al aprobar la orden se crea el batch: code='LOT-GELATO-260301', cultivar_id=Gelato, current_phase_id=germinación, zone_id=Sala Propagación, production_order_id=la orden, status='active'. |
| **6** | **ACT** | El cultivation_schedule genera scheduled_activities desde los activity_templates aplicables a cada fase (via activity_template_phases). Cada scheduled_activity guarda un template_snapshot JSONB con recursos y checklist vigentes al momento de programar. |
| **7** | **INV** | Si hay semillas en inventario, se genera una reservation (inventory_transaction type='reservation') para reservar las 50 semillas. quantity_reserved += 50 en el inventory_item correspondiente. |

Flujo 2: Fertirrigación Diaria

*Operación rutinaria que demuestra el ciclo completo template →
scheduled → activity → transaction. Incluye escalado automático,
checklist de verificación y generación de alertas.*

| **\#** | **Dominio** | **Acción** |
| --- | --- | --- |
| **1** | **ACT** | scheduled_activity aparece en el dashboard del operario: template=FERT-VEG-S1 (Fertirrigación Vegetativa Semana 1), batch=LOT-001, phase=vegetativo, planned_date=hoy, crop_day=35. |
| **2** | **ACT** | El operario inicia la ejecución. Se crea un registro en activities: zone_id=Sala Veg A, phase_id=vegetativo, batch_id=LOT-001, performed_by=operario, performed_at=ahora, status='in_progress'. |
| **3** | **ACT** | El sistema escala los recursos del template_snapshot según quantity_basis: 42 plantas × 5L/planta (per_plant) = 210L agua. Ca(NO₃)₂: 0.8g/L × 210L (per_L_solution) = 168g. Se pre-cargan como quantity_planned en activity_resources. |
| **4** | **INV** | El operario confirma cantidades reales. Por cada recurso, activity_resources registra quantity_actual. Se genera inventory_transaction type='application' para cada recurso: Ca(NO₃)₂ -168g, agua -210L, etc. |
| **5** | **INV** | El inventory_item de Ca(NO₃)₂: quantity_available -= 168g. La transaction tiene contexto completo: zone_id=Sala Veg A, batch_id=LOT-001, phase_id=vegetativo, activity_id=esta actividad, user_id=operario, cost_total calculado. |
| **6** | **ACT** | El operario completa el checklist: EC=1.8 (target: 1.5-2.0 ✓), pH=5.9 (target: 5.8-6.2 ✓), drenaje=18% (target: 15-20% ✓). Todos los ítems is_critical pasan. |
| **7** | **OPS** | Si algún valor de checklist está fuera de rango, se genera automáticamente un registro en alerts: type='env_out_of_range', severity='warning', entity_type='batch', entity_id=LOT-001. |
| **8** | **ACT** | La actividad pasa a status='completed'. scheduled_activity.status='completed' y completed_activity_id apunta a esta actividad. |

Flujo 3: Cosecha con Multi-Output y Test de Calidad

*La cosecha es la operación más compleja: destruye el input (plantas),
genera múltiples outputs (flor húmeda, trim, desperdicio), consume
insumos, registra fotos, avanza la fase del batch, y dispara un test de
calidad.*

| **\#** | **Dominio** | **Acción** |
| --- | --- | --- |
| **1** | **ACT** | Se ejecuta la actividad HARV-MANUAL-CUT. El template define 18 recursos en 7 categorías, estimated_duration=360min, triggers_transformation=true, triggers_phase_change_id=secado. |
| **2** | **INV** | transformation_out: Se genera inventory_transaction type='transformation_out' para las 42 plantas en floración. El inventory_item FLO-GELATO se reduce a 0 y pasa a lot_status='depleted'. |
| **3** | **PROD** | phase_product_flows para la fase 'cosecha' define los outputs: direction='output', product_role='primary' → flor húmeda; product_role='secondary' → trim húmedo; product_role='waste' → tallos y raíces. |
| **4** | **INV** | transformation_in --- Output primario: Se crea NUEVO inventory_item para WET-GELATO (flor húmeda), +21kg. Transaction type='transformation_in', related_transaction_id apunta al transformation_out, target_item_id apunta al nuevo item. |
| **5** | **INV** | transformation_in --- Output secundario: Se crea NUEVO inventory_item para TRIM-WET-GELATO (trim húmedo), +8.4kg. Misma mecánica de vinculación con related_transaction_id. |
| **6** | **INV** | waste: \~50kg tallos y raíces. Transaction type='waste', reason='Material no aprovechable, descartado en compostera'. No crea inventory_item de destino. |
| **7** | **INV** | consumption: Los insumos consumidos (6 pares guantes, 300mL alcohol isopropílico, turkey bags, etc.) generan cada uno su transaction type='consumption' con contexto completo. |
| **8** | **OPS** | Fotos de la cosecha se registran en attachments: entity_type='activity', entity_id=esta actividad, file_type='image/jpeg'. Múltiples fotos, cada una un registro. |
| **9** | **NEXO** | El batch se actualiza: current_phase_id avanza a 'secado', status='phase_transition', current_product_id cambia a WET-GELATO, zone_id cambia a 'Sala Secado'. |
| **10** | **AREAS** | Si existen plant_positions, todas pasan a status='harvested' y current_batch_id se limpia. |
| **11** | **QUALITY** | Se crea quality_test: batch_id=LOT-001, phase_id=cosecha, test_type='potency', status='pending'. Cuando el lab devuelva resultados, se crean quality_test_results para THC (23.5%), CBD (0.8%), limonene (12mg/g), etc. |
| **12** | **ORDER** | production_order_phases para 'cosecha': status='completed', input_quantity=42 plantas, output_quantity=21kg flor húmeda, yield_pct calculado. |

Flujo 4: Split de Batch

*Cuando parte de un lote presenta problemas (deficiencia, retraso,
contaminación), se separa en un batch hijo para tratamiento
independiente manteniendo trazabilidad completa.*

| **\#** | **Dominio** | **Acción** |
| --- | --- | --- |
| **1** | **NEXO** | El supervisor detecta que 8 de las 42 plantas del batch LOT-001 muestran deficiencia severa de calcio. Decide separar las plantas afectadas para tratamiento intensivo sin retrasar el resto del lote. |
| **2** | **NEXO** | Se crea batch_lineage: operation='split', parent_batch_id=LOT-001, child_batch_id=LOT-001-B, quantity_transferred=8 plantas, reason='8 plantas con deficiencia Ca severa', performed_by=supervisor. |
| **3** | **NEXO** | LOT-001 se actualiza: plant_count=34 (de 42). Se crea LOT-001-B: parent_batch_id=LOT-001, plant_count=8, cultivar_id=Gelato (heredado), current_phase_id=vegetativo (misma fase), zone_id puede ser la misma u otra zona. |
| **4** | **ACT** | LOT-001-B recibe scheduled_activities propias con templates correctivos (mayor concentración Ca, fertirrigación más frecuente). El plan original de LOT-001 continúa sin cambios. |
| **5** | **INV** | Cada batch acumula costos por separado: todas las inventory_transactions llevan batch_id=LOT-001 o batch_id=LOT-001-B según corresponda. total_cost de cada batch se calcula independientemente. |
| **6** | **NEXO** | Cuando LOT-001-B se recupera, se puede crear otro batch_lineage operation='merge' para reunificar, o mantener como batches separados hasta el final. La genealogía completa queda registrada. |

Flujo 5: Procesador de Post-Cosecha (Fases 5-7)

*Una empresa procesadora compra flor húmeda y solo ejecuta secado,
trimming y empaque. El modelo soporta esto sin adaptaciones, gracias a
los entry/exit points de la orden de producción.*

| **\#** | **Dominio** | **Acción** |
| --- | --- | --- |
| **1** | **ORDER** | Se crea production_order: cultivar_id=Gelato, entry_phase_id=secado (fase 5), exit_phase_id=empaque (fase 7), initial_quantity=21kg, initial_product_id=WET-GELATO. No se generan phases para germinación, vegetativo, floración ni cosecha. |
| **2** | **INV** | La flor húmeda comprada se registra como inventory_transaction type='receipt': +21kg WET-GELATO, source_type='purchase', cost_per_unit=precio de compra. Se crea el inventory_item correspondiente. |
| **3** | **NEXO** | Se crea el batch: cultivar_id=Gelato, current_phase_id=secado, status='active', source_inventory_item_id=la compra, zone_id=Sala Secado. |
| **4** | **ACT** | Los templates de secado, trimming y empaque se programan y ejecutan con el flujo normal de scheduled_activities → activities → activity_resources → inventory_transactions. |
| **5** | **INV** | Secado: transformation 21kg húmeda → 5.25kg seca (yield 25%). phase_product_flows de la fase 'secado' define: input=WET-GELATO, output primary=DRY-GELATO con expected_yield_pct=25%. |
| **6** | **QUALITY** | Post-secado: quality_test para humedad residual (\<12%), presencia de moho (negativo), integridad de tricomas. Los resultados quedan vinculados al batch y fase. |
| **7** | **INV** | Trimming: 5.25kg seca → 4.2kg premium (DRY-GELATO-PREMIUM) + 1.05kg trim seco (TRIM-DRY-GELATO). Multi-output via phase_product_flows. |
| **8** | **INV** | Empaque: 4.2kg → \~150 frascos JAR-GELATO-28G. Cada frasco tiene su inventory_item con batch_number para trazabilidad completa hasta el origen. |
| **9** | **OPS** | overhead_costs: energía de la sala de secado (15 días × tarifa), renta proporcional del espacio. allocation_basis='per_m2' proratea al batch según area_m2 usada. |
| **10** | **ORDER** | Cada production_order_phase registra input/output/yield real. La orden pasa a status='completed'. El batch status='completed'. |

Flujo 6: Monitoreo Ambiental y Alertas

*Los sensores IoT generan lecturas continuas que se comparan contra
condiciones óptimas del cultivar, disparando alertas cuando hay
desviaciones.*

| **\#** | **Dominio** | **Acción** |
| --- | --- | --- |
| **1** | **OPS** | sensors registra un sensor tipo 'temperature' en Sala Floración A, brand_model='Trolmaster HCS-1'. Cada 5 minutos el sensor envía datos al sistema. |
| **2** | **OPS** | environmental_readings recibe: sensor_id, zone_id=Sala Floración A, parameter='temperature', value=28.5, unit='°C', timestamp=ahora. zone_id denormalizado permite queries rápidas sin JOIN a sensors. |
| **3** | **PROD** | El cultivar Gelato #41 tiene optimal_conditions.temp='20-26°C'. La lectura de 28.5°C está fuera del rango óptimo. |
| **4** | **OPS** | Se genera alert: type='env_out_of_range', severity='warning', entity_type='sensor', entity_id=el sensor, message='Temperatura 28.5°C excede rango óptimo (20-26°C) en Sala Floración A'. |
| **5** | **OPS** | El supervisor recibe la alerta, investiga, ajusta el HVAC. Registra acknowledged_by=supervisor, acknowledged_at=ahora. |
| **6** | **OPS** | Cuando la temperatura vuelve al rango, resolved_at se llena. El historial completo de alertas permite análisis de incidentes por zona, periodo y severidad. |

Índices Recomendados y Queries Habilitadas

Índices Compuestos Críticos

| **Tabla** | **Índice** | **Caso de uso** |
| --- | --- | --- |
| inventory_transactions | (batch_id, type, timestamp) | Costeo por batch desglosado por tipo |
| activities | (batch_id, phase_id, performed_at) | Timeline de operaciones por batch y fase |
| scheduled_activities | (batch_id, status, planned_date) | Dashboard de actividades pendientes |
| plant_positions | (zone_id, status) | Ocupación de zonas |
| environmental_readings | (zone_id, parameter, timestamp) | Series temporales por zona y parámetro |
| quality_tests | (batch_id, status) | Tests pendientes por batch |
| alerts | (entity_type, entity_id, resolved_at) | Alertas activas por entidad |

Queries Analíticas Habilitadas

La integración cross-domain permite las siguientes consultas:

**1.** COGS completo por batch: costos directos (SUM transactions WHERE
batch_id) + overhead prorrateado

**2.** Rendimiento plan vs real por template: quantity_planned vs
quantity_actual en activity_resources

**3.** Ocupación de zonas: COUNT(plant_positions WHERE
status='planted') / zone.plant_capacity

**4.** Trazabilidad semilla → producto final:
batch.source_inventory_item → batch_lineage → transactions

**5.** Yield cascada real vs esperado: production_order_phases.yield_pct
vs phase_product_flows.expected_yield_pct

**6.** Condiciones ambientales reales vs óptimas: environmental_readings
vs cultivars.optimal_conditions

**7.** Consumo por proveedor × periodo: transactions JOIN
inventory_items JOIN products JOIN suppliers

**8.** Avance de órdenes: COUNT(order_phases WHERE status='completed')
/ COUNT(total)

**9.** Resultados de calidad por batch × fase: quality_tests JOIN
quality_test_results

**10.** Genealogía completa de un batch: batch_lineage recursive con
parent/child

**11.** Labor + consumibles por fase × batch: activity_resources
agrupado por phase_id y category_id

**12.** Alertas activas agrupadas por severidad: alerts WHERE
resolved_at IS NULL
