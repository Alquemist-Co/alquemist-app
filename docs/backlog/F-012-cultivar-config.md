# F-012: Configuracion de Cultivares

## Overview

Permite gestionar las variedades especificas (cultivars) dentro de cada tipo de cultivo, incluyendo duraciones por fase, condiciones optimas de cultivo (temperatura, humedad, CO2), densidad de siembra, y los productos (SKUs) asociados a cada variedad por fase. El cultivar es el punto de partida de toda orden de produccion y determina los parametros de rendimiento esperado.

## User Personas

- **Admin**: CRUD completo de cultivares con todos los campos avanzados (condiciones optimas, phase_durations JSON, density).
- **Gerente**: Crea y edita cultivares con permisos limitados. Consulta los datos para planificar ordenes.
- **Supervisor**: Consulta los cultivares asignados a sus zonas para verificar condiciones optimas.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-012-001 | CRUD de cultivares con datos base | M | P0 | Planned |
| US-012-002 | Configuracion de duraciones por fase (phase_durations) | S | P0 | Planned |
| US-012-003 | Configuracion de condiciones optimas (optimal_conditions) | M | P1 | Planned |
| US-012-004 | Gestion de cultivar products (SKUs por fase) | M | P1 | Planned |

---

# US-012-001: CRUD de cultivares con datos base

## User Story

**As a** admin,
**I want** crear, editar, listar y desactivar cultivares asociados a un tipo de cultivo, con datos como nombre, codigo, breeder, ciclo estimado en dias, rendimiento esperado por planta y grado de calidad,
**So that** el equipo de produccion tenga un catalogo actualizado de variedades disponibles para planificar ordenes.

## Acceptance Criteria

### Scenario 1: Crear cultivar exitosamente con campos obligatorios
- **Given** el admin esta en la pantalla cfg-cultivars y existe al menos un crop_type activo
- **When** completa el formulario con crop_type="Cannabis Medicinal", nombre="Gelato #41", codigo="GELATO-41"
- **Then** el sistema crea el cultivar, lo muestra en la lista con card que incluye nombre, crop_type, breeder (si lo tiene), y muestra toast de confirmacion

### Scenario 2: Crear cultivar con todos los campos opcionales
- **Given** el admin esta creando un nuevo cultivar
- **When** completa todos los campos incluyendo breeder="Seed Junky Genetics", cycle_days=127, expected_yield_per_plant_g=500, quality_grade="Premium Indoor", density_per_m2=9
- **Then** el sistema guarda todos los campos y los muestra en la card del cultivar con formato adecuado (rendimiento en gramos, densidad en plantas/m2)

### Scenario 3: Intentar crear cultivar con codigo duplicado
- **Given** ya existe un cultivar con code="GELATO-41"
- **When** el admin intenta crear otro con el mismo codigo
- **Then** el sistema muestra error "Ya existe un cultivar con el codigo GELATO-41" sin crear el registro

### Scenario 4: Filtrar cultivares por tipo de cultivo
- **Given** existen cultivares de Cannabis y de Arandano
- **When** el admin selecciona el filtro crop_type="Cannabis Medicinal"
- **Then** la lista muestra solo los cultivares de cannabis, ocultando los de arandano

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Tests unitarios escritos y pasando
- [ ] Validacion Zod compartida client/server (createCultivarSchema)
- [ ] Criterios de aceptacion verificados
- [ ] Accesibilidad: formulario navegable por teclado, labels visibles

## Technical Notes
- **Server Actions**: `createCultivar`, `updateCultivar`, `listCultivars`, `deactivateCultivar` en `lib/actions/config.actions.ts`
- **Zod Schema**: `createCultivarSchema` de `lib/validations/config.schema.ts`
- **Tablas**: `cultivars` (Tipo A — company_id directo para RLS tenant)
- **Pantalla**: cfg-cultivars

## UI/UX Notes
- Cards en lista con: nombre, crop_type badge, breeder, ciclo en dias, yield esperado (DM Mono), quality_grade badge
- Formulario completo en pagina dedicada o modal grande
- Campos numericos con inputMode='decimal'
- Selector de crop_type como dropdown con search

## Dependencies
- US-011-001 (debe existir al menos un crop_type)
- F-001 a F-006 (Fase 0)

## Estimation
- **Size**: M
- **Complexity**: Low

---

# US-012-002: Configuracion de duraciones por fase (phase_durations)

## User Story

**As a** admin,
**I want** configurar la duracion esperada en dias de cada fase de produccion para un cultivar especifico, sobreescribiendo los defaults del tipo de cultivo,
**So that** al crear ordenes de produccion el sistema calcule automaticamente las fechas planificadas basandose en las duraciones reales del cultivar en lugar de las genericas del crop_type.

## Acceptance Criteria

### Scenario 1: Configurar duraciones por fase exitosamente
- **Given** el admin esta editando el cultivar "Gelato #41" que pertenece a un crop_type con 7 fases
- **When** establece las duraciones: germinacion=7, propagacion=14, vegetativo=28, floracion=63, cosecha=2, secado=14, empaque=1
- **Then** el sistema guarda el JSON phase_durations={germinacion:7, propagacion:14, vegetativo:28, floracion:63, cosecha:2, secado:14, empaque:1} y muestra el total del ciclo=129 dias

### Scenario 2: Dejar fase sin duracion configurada
- **Given** el admin esta configurando duraciones del cultivar
- **When** deja la fase "Empaque" sin duracion especifica
- **Then** el sistema usa el default_duration_days de la production_phase como fallback, y muestra "(default)" junto al valor

### Scenario 3: Configurar duracion con valor invalido
- **Given** el admin esta editando las duraciones
- **When** ingresa un valor negativo o cero para una fase
- **Then** el sistema muestra error de validacion "La duracion debe ser al menos 1 dia" y no guarda el cambio

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Tests unitarios para calculo de ciclo total
- [ ] Fallback a default_duration_days verificado
- [ ] Criterios de aceptacion verificados

## Technical Notes
- **Campo**: `cultivars.phase_durations` JSONB — estructura: `{[phase_code]: number_of_days}`
- El calculo de fecha fin de orden usa: phase_durations del cultivar > default_duration_days de production_phase > 0 como fallback
- **Server Action**: `updateCultivar` con validacion de phase_durations keys contra production_phases del crop_type

## UI/UX Notes
- Tabla dentro del formulario del cultivar: columna fase | columna duracion (input numerico) | columna default (referencia en gris)
- Total del ciclo calculado dinamicamente al pie de la tabla
- Campos numericos con inputMode='numeric'

## Dependencies
- US-012-001, US-011-002

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-012-003: Configuracion de condiciones optimas (optimal_conditions)

## User Story

**As a** admin,
**I want** definir las condiciones ambientales optimas para un cultivar (rangos de temperatura, humedad, CO2, EC, pH),
**So that** el sistema de monitoreo ambiental pueda comparar las lecturas reales contra los rangos optimos y generar alertas automaticas cuando hay desviaciones.

## Acceptance Criteria

### Scenario 1: Configurar condiciones optimas completas
- **Given** el admin esta editando el cultivar "Gelato #41"
- **When** establece temp_min=20, temp_max=26, humidity_min=40, humidity_max=60, co2_min=800, co2_max=1200
- **Then** el sistema guarda el JSON optimal_conditions y muestra una preview con rangos formateados: "Temp: 20-26 C, HR: 40-60%, CO2: 800-1200 ppm"

### Scenario 2: Dejar condiciones optimas vacias
- **Given** el admin esta creando un cultivar nuevo
- **When** no completa la seccion de condiciones optimas
- **Then** el sistema acepta el cultivar sin optimal_conditions (el campo queda null) y el modulo de monitoreo no generara alertas de env_out_of_range para zonas con este cultivar

### Scenario 3: Configurar rango invertido (min > max)
- **Given** el admin esta editando las condiciones optimas
- **When** ingresa temp_min=28 y temp_max=20 (min mayor que max)
- **Then** el sistema muestra error de validacion "El valor minimo debe ser menor al maximo" y no guarda el cambio

### Scenario 4: Configurar solo algunos parametros
- **Given** el admin esta editando las condiciones optimas
- **When** configura solo temperatura y humedad pero deja CO2 vacio
- **Then** el sistema guarda solo los parametros configurados; el monitoreo solo generara alertas para temperatura y humedad, no para CO2

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Tests unitarios para validacion de rangos
- [ ] Criterios de aceptacion verificados
- [ ] UI con sliders de rango o inputs duales (min/max)

## Technical Notes
- **Campo**: `cultivars.optimal_conditions` JSONB — estructura validada con Zod nested object
- **Zod Schema**: parte de `createCultivarSchema` con objeto opcional para optimal_conditions
- Usado por OPS-01 (Monitoreo Ambiental) para comparar lecturas vs optimos
- Los parametros opcionales (co2_min, co2_max) se validan con `.optional()` en Zod

## UI/UX Notes
- Seccion colapsable "Condiciones Optimas" dentro del formulario del cultivar
- Cada parametro: label + dos inputs (min/max) en fila + unidad
- Preview visual con barras de rango coloreadas (verde = optimo, amarillo = borderline)
- Campos numericos con inputMode='decimal'

## Dependencies
- US-012-001

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-012-004: Gestion de cultivar products (SKUs por fase)

## User Story

**As a** admin,
**I want** asociar productos (SKUs) a un cultivar indicando en que fase se producen y si es el producto primario o un subproducto,
**So that** al ejecutar transformaciones el sistema sepa que productos generar automaticamente para cada variedad en cada fase del ciclo.

## Acceptance Criteria

### Scenario 1: Asociar un producto primario a un cultivar
- **Given** el admin esta editando el cultivar "Gelato #41" y existe el producto "WET-GELATO" en el catalogo
- **When** agrega el producto WET-GELATO en la fase "Cosecha" como is_primary=true
- **Then** el producto aparece en la tabla de cultivar_products con badge "Primario" y la fase "Cosecha" asociada

### Scenario 2: Agregar multiples SKUs por fase
- **Given** el cultivar "Gelato #41" ya tiene WET-GELATO como primario en Cosecha
- **When** el admin agrega TRIM-WET-GELATO en la misma fase como is_primary=false
- **Then** ambos productos aparecen en la tabla, WET-GELATO como "Primario" y TRIM-WET-GELATO como "Subproducto", ordenados por sort_order

### Scenario 3: Intentar asociar producto que no existe
- **Given** el admin busca un producto en el selector
- **When** no encuentra el producto deseado
- **Then** el selector muestra "No se encontraron productos" con un link "Crear producto" que navega al catalogo de productos (inv-products)

### Scenario 4: Eliminar asociacion de producto
- **Given** el cultivar tiene 3 productos asociados
- **When** el admin elimina la asociacion de TRIM-WET-GELATO
- **Then** el registro de cultivar_products se elimina, pero el producto sigue existiendo en el catalogo y no se afectan transacciones historicas

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] Selector de productos con search funcional

## Technical Notes
- **Tabla**: `cultivar_products` — FK a cultivars, products, production_phases
- **Server Actions**: `addCultivarProduct`, `removeCultivarProduct`, `listCultivarProducts`
- Los cultivar_products son informativos/catalogo; la logica de transformacion real usa phase_product_flows
- **Pantalla**: cfg-cultivars, seccion de productos dentro del detalle del cultivar

## UI/UX Notes
- Tabla dentro del detalle del cultivar: columna producto (SKU + nombre), columna fase, columna primario (toggle), columna acciones (eliminar)
- Selector de producto con search por SKU o nombre
- Selector de fase como dropdown filtrado por crop_type del cultivar
- Boton "+" para agregar nueva asociacion

## Dependencies
- US-012-001, US-011-002
- Catalogo de productos basico (Fase 0 o Fase 2)

## Estimation
- **Size**: M
- **Complexity**: Medium
