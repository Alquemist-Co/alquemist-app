# Costos Overhead

## Metadata

- **Ruta**: `/operations/costs`
- **Roles con acceso**: admin (CRUD completo + ver COGS), manager (CRUD completo + ver COGS), supervisor (solo lectura), operator (sin acceso), viewer (solo lectura)
- **Tipo componente**: Mixto (Server Component para listado, Client Component para formularios y gráficos)
- **Edge Functions**: Ninguna — operaciones CRUD directas via PostgREST. El cálculo de COGS por batch es via SQL function/RPC
- **Feature flag**: `companies.settings.features_enabled.cost_tracking` — toda la página se oculta del menú si está deshabilitado

## Objetivo

Registro y gestión de costos indirectos/overhead que no están vinculados a actividades específicas: electricidad, renta, depreciación, seguros, mantenimiento, mano de obra fija. Estos costos se prorratean entre los batches activos para calcular el COGS completo (costo directo de actividades + costos overhead prorrateados).

La página permite registrar costos por periodo, asignarlos a facilities o zonas específicas, y definir la base de prorrateo (por m², por planta, por batch, por zona, o reparto equitativo). También muestra un resumen de COGS por batch que combina costos directos (de inventory_transactions via actividades) con overhead prorrateado.

Usuarios principales: managers de operaciones y administradores que gestionan costos.

## Tablas del modelo involucradas

| Tabla                  | Operaciones | Notas                                                                              |
| ---------------------- | ----------- | ---------------------------------------------------------------------------------- |
| overhead_costs         | R/W         | CRUD de costos overhead. RLS via facility → company                                |
| facilities             | R           | Facility a la que se asigna el costo                                               |
| zones                  | R           | Zona específica (opt, si el costo es zonal)                                        |
| batches                | R           | Batches activos para cálculo de COGS                                               |
| cultivars              | R           | Cultivar del batch (para contexto en COGS)                                         |
| inventory_transactions | R           | Costos directos por batch (para COGS total)                                        |
| companies              | R           | Moneda de la empresa (currency) y feature flag cost_tracking                       |

## ENUMs utilizados

| ENUM             | Valores                                                                 | Tabla.campo                     |
| ---------------- | ----------------------------------------------------------------------- | ------------------------------- |
| cost_type        | energy \| rent \| depreciation \| insurance \| maintenance \| labor_fixed \| other | overhead_costs.cost_type |
| allocation_basis | per_m2 \| per_plant \| per_batch \| per_zone \| even_split             | overhead_costs.allocation_basis |

## Layout y componentes principales

Página dentro del layout de dashboard con sidebar.

- **Header de página** — Título "Costos Overhead"
  - Subtítulo: "Registro de costos indirectos para cálculo de COGS"
  - Botón "Nuevo costo" (variant="primary") — solo admin/manager
  - Toggle: "Vista Costos" / "Vista COGS por Batch" — dos vistas principales
- **Vista Costos** (default) — Registro y listado de costos overhead
  - **Barra de KPIs** — Row de cards:
    - Total mes actual: ${total} (suma de amounts del mes actual)
    - Total mes anterior: ${total}
    - Variación: +{n}% o -{n}% (comparación mes actual vs anterior)
    - Por tipo (mini chart de barras): distribución del gasto por cost_type
  - **Barra de filtros**:
    - Select: Facility (todas)
    - Select: Zona (todas — muestra solo costos asignados a zona específica)
    - Select: Tipo de costo (todos)
    - DatePicker rango: Periodo desde/hasta (default=mes actual)
    - Botón "Limpiar filtros"
  - **Tabla de costos** — Tabla paginada server-side:
    - Columnas:
      - Tipo (badge con color: energy=amarillo, rent=azul, depreciation=gris, insurance=verde, maintenance=naranja, labor_fixed=morado, other=default)
      - Descripción
      - Facility
      - Zona (o "Toda la facility" si zone_id es null)
      - Monto (formateado con moneda)
      - Periodo (fecha inicio — fecha fin)
      - Base de prorrateo (badge: per_m2, per_plant, etc.)
      - Acciones: Editar, Eliminar (admin/manager)
    - Ordenamiento: periodo descendente (default)
    - Paginación: 20 items por página
  - **Gráfico de tendencia** — Debajo de la tabla (colapsable):
    - Gráfico de barras apiladas por mes + tipo de costo (últimos 6 meses)
    - Permite identificar tendencias de gasto
- **Vista COGS por Batch** — Análisis de costo total por batch
  - **Tabla de COGS** — Tabla de batches con desglose de costos:
    - Columnas:
      - Batch (código + link)
      - Cultivar
      - Fase actual
      - Zona actual
      - Costos directos (suma de inventory_transactions.cost_total del batch)
      - Costos overhead (prorrateado de overhead_costs)
      - COGS total (directo + overhead)
      - Costo por planta (COGS / plant_count)
      - Costo por gramo (COGS / yield_wet_kg * 1000, solo si hay yield)
    - Filtros: Facility, Status (active/completed), Cultivar
    - Ordenamiento: COGS total descendente
  - **Detalle de prorrateo** — Al expandir una fila de batch:
    - Tabla de costos overhead prorrateados a este batch:
      - Columnas: Tipo, Descripción, Monto original, Base, Factor de prorrateo, Monto asignado
    - Ejemplo:
      - Electricidad $5,000 → per_m2 → LOT-A usa 20m² de 45m² → $2,222.22
      - Renta $3,000 → even_split → 3 batches → $1,000.00
    - Total costos directos + Total overhead = COGS

- **Dialog: Nuevo costo / Editar costo** — Modal
  - Select: Facility (req)
  - Select: Zona (opt — null=toda la facility)
  - Select: Tipo de costo (req) — con labels en español:
    - energy → "Energía"
    - rent → "Renta/Arriendo"
    - depreciation → "Depreciación"
    - insurance → "Seguros"
    - maintenance → "Mantenimiento"
    - labor_fixed → "Mano de obra fija"
    - other → "Otro"
  - Input: Descripción (req) — "Electricidad Febrero 2026"
  - Input: Monto (req, number, > 0) — con indicador de moneda de la empresa
  - Input: Moneda (read-only, de company.currency — ej: "COP")
  - DatePicker: Fecha inicio periodo (req)
  - DatePicker: Fecha fin periodo (req)
  - Select: Base de prorrateo (req) — con explicación de cada opción:
    - per_m2 → "Por metro cuadrado (proporcional al área del batch)"
    - per_plant → "Por planta (proporcional al conteo de plantas)"
    - per_batch → "Por batch (reparto proporcional entre batches activos)"
    - per_zone → "Por zona (asignar solo a batches en la zona especificada)"
    - even_split → "Reparto equitativo (mismo monto para todos los batches)"
  - Textarea: Notas (opt)
  - Botón "Guardar" (variant="primary")
- **Dialog: Confirmar eliminación** — Modal
  - "¿Eliminar el costo '{descripción}' por ${monto}?"
  - "Esta acción no se puede deshacer."
  - Botón "Eliminar" (variant="destructive")

**Responsive**: KPIs en 2 columnas. Tablas con scroll horizontal. Gráficos full-width. Dialog full-screen en móvil.

## Requisitos funcionales

### Carga de datos — Vista Costos

- **RF-01**: Query principal:
  ```
  supabase.from('overhead_costs')
    .select(`
      *,
      facility:facilities(id, name),
      zone:zones(id, name)
    `, { count: 'exact' })
    .order('period_start', { ascending: false })
    .range(offset, offset + pageSize - 1)
  ```
- **RF-02**: KPIs de totales mensuales:
  ```
  -- Total mes actual
  supabase.from('overhead_costs')
    .select('amount')
    .gte('period_start', startOfMonth)
    .lte('period_end', endOfMonth)
  -- Sumar client-side

  -- Total mes anterior (similar con rango del mes anterior)
  ```
- **RF-03**: Datos para gráfico de tendencia (últimos 6 meses):
  ```
  supabase.from('overhead_costs')
    .select('cost_type, amount, period_start')
    .gte('period_start', sixMonthsAgo)
    .order('period_start')
  ```
  Agrupar client-side por mes + cost_type.

### Carga de datos — Vista COGS

- **RF-04**: Calcular COGS por batch via SQL function/RPC:
  ```
  supabase.rpc('calculate_batch_cogs', {
    p_facility_id: facilityId,  // opt filter
    p_status: 'active'  // o 'completed'
  })
  ```
  La función SQL:
  1. Obtiene batches activos (o completados) filtrados
  2. Para cada batch: suma `inventory_transactions.cost_total` WHERE batch_id = batch
  3. Para cada overhead_cost en el periodo del batch:
     - Calcula factor de prorrateo según allocation_basis
     - Asigna monto proporcional al batch
  4. Retorna: batch_id, code, cultivar, phase, direct_cost, overhead_cost, total_cogs, cost_per_plant, cost_per_gram
- **RF-05**: Si no existe RPC, calcular client-side con dos queries:
  ```
  -- 1. Batches con costos directos
  supabase.from('batches')
    .select('id, code, plant_count, yield_wet_kg, total_cost, cultivar:cultivars(name), phase:production_phases!current_phase_id(name), zone:zones(id, name, effective_growing_area_m2)')
    .eq('status', 'active')

  -- 2. Overhead costs del periodo
  supabase.from('overhead_costs')
    .select('*')
    .gte('period_start', batchStartDate)
  ```
  Luego calcular prorrateo client-side.

### Lógica de prorrateo

- **RF-06**: Reglas de prorrateo por allocation_basis:
  - `per_m2`: monto × (batch.area_m2 / sum(all_batches.area_m2 en facility/zona))
  - `per_plant`: monto × (batch.plant_count / sum(all_batches.plant_count en facility/zona))
  - `per_batch`: monto × (1 / count(batches en facility/zona))
  - `per_zone`: monto asignado solo a batches en la zona especificada del costo
  - `even_split`: monto / count(all_batches en facility/zona) — equivalente a per_batch
- **RF-07**: Solo se consideran batches cuyo periodo activo intersecte con el periodo del costo (batch.start_date <= cost.period_end AND batch.end_date >= cost.period_start o batch.status='active')
- **RF-08**: Si el costo tiene zone_id, solo se prorratea entre batches de esa zona. Si zone_id es null, se prorratea entre todos los batches de la facility

### CRUD costos

- **RF-09**: Crear costo:
  ```
  supabase.from('overhead_costs')
    .insert({
      facility_id,
      zone_id,
      cost_type,
      description,
      amount,
      currency,
      period_start,
      period_end,
      allocation_basis,
      notes
    })
    .select().single()
  ```
- **RF-10**: Editar costo:
  ```
  supabase.from('overhead_costs')
    .update({ facility_id, zone_id, cost_type, description, amount, currency, period_start, period_end, allocation_basis, notes })
    .eq('id', costId)
  ```
- **RF-11**: Eliminar costo:
  ```
  supabase.from('overhead_costs')
    .delete()
    .eq('id', costId)
  ```
- **RF-12**: Toast éxito/error en cada operación + invalidar caches

### Feature flag

- **RF-13**: Verificar `companies.settings.features_enabled.cost_tracking` al cargar. Si es false, redirigir a dashboard con mensaje "El módulo de costos no está habilitado"
- **RF-14**: El link en el sidebar solo se muestra si cost_tracking está habilitado

### Navegación

- **RF-15**: Click en batch code navega a `/production/batches/{batchId}` (PRD 25)
- **RF-16**: Click en facility navega a `/areas/facilities` (PRD 14)

## Requisitos no funcionales

- **RNF-01**: RLS Pattern 2 — overhead_costs hereda aislamiento via facility_id → facilities.company_id
- **RNF-02**: Paginación server-side en vista costos (20 items por página)
- **RNF-03**: El cálculo de COGS debe hacerse server-side (SQL function) para mantener consistencia y performance. El cálculo client-side es fallback
- **RNF-04**: La moneda se lee de company.currency y se usa para formateo (no conversión)
- **RNF-05**: El gráfico de tendencia usa Recharts con datos pre-procesados (max 6 meses × 7 tipos = 42 puntos)
- **RNF-06**: La vista COGS por batch no se guarda en DB — es un cálculo en tiempo real
- **RNF-07**: Si `features_enabled.cost_tracking = false`, la página y el link en sidebar se ocultan completamente

## Flujos principales

### Happy path — Registrar costo de electricidad

1. Manager navega a `/operations/costs`
2. KPIs: Total mes=$12,500, mes anterior=$11,800, variación=+5.9%
3. Click "Nuevo costo"
4. Dialog: Facility=Invernadero Principal, Zona=(vacío — toda la facility), Tipo=Energía, Descripción="Electricidad Febrero 2026", Monto=5,000, Periodo=01/02-28/02, Base=per_m2, Notas="Factura #F-2026-0228"
5. Click "Guardar" → toast "Costo registrado"
6. Tabla se actualiza, KPIs recalculados

### Ver COGS por batch

1. Manager cambia a "Vista COGS por Batch"
2. Tabla muestra 5 batches activos:
   - LOT-GELATO-260301: Directo=$1,245, Overhead=$890, COGS=$2,135, Costo/planta=$50.83, Costo/g=—
   - LOT-OG-260310: Directo=$980, Overhead=$620, COGS=$1,600, Costo/planta=$40.00, Costo/g=—
3. Expande LOT-GELATO-260301 → desglose overhead:
   - Electricidad $5,000 → per_m2 → 20m² de 45m² total → $2,222 → factor 44% → asignado: $890
   - Renta $3,000 → even_split → 5 batches → $600 → incluido en el $890
4. Total coherente: $1,245 + $890 = $2,135

### Registrar costo por zona específica

1. Click "Nuevo costo"
2. Facility=Invernadero Principal, Zona=Sala Secado
3. Tipo=Mantenimiento, Descripción="Reparación deshumidificador Sala Secado", Monto=800
4. Base=per_zone — el costo se asigna solo a batches en Sala Secado
5. En vista COGS, solo LOT-GELATO-260301 (que está en Sala Secado) recibe este costo

### Comparar tendencia de costos

1. Manager ve gráfico de tendencia (últimos 6 meses)
2. Barras apiladas: energía domina en verano (más refrigeración), renta constante
3. Detecta que mantenimiento subió significativamente en enero
4. Filtra por tipo=maintenance → revisa qué reparaciones hubo

## Estados y validaciones

### Estados de UI — Página

| Estado   | Descripción                                                             |
| -------- | ----------------------------------------------------------------------- |
| loading  | Skeleton de KPIs, tabla y gráfico                                       |
| loaded   | Datos completos, vista costos o COGS                                    |
| empty    | "No hay costos registrados. Registra tu primer costo overhead."         |
| disabled | "El módulo de costos no está habilitado" (feature flag off)             |
| error    | "Error al cargar costos. Intenta nuevamente" + reintentar               |

### Estados de UI — Dialog

| Estado     | Descripción                                    |
| ---------- | ---------------------------------------------- |
| idle       | Campos listos                                  |
| submitting | Botón loading, campos disabled                 |
| success    | Dialog cierra, toast éxito                     |
| error      | Toast error, dialog permanece                  |

### Validaciones Zod — Costo overhead

```
facility_id: z.string().uuid('Selecciona una facility')
zone_id: z.string().uuid().optional().nullable()
cost_type: z.enum(['energy', 'rent', 'depreciation', 'insurance', 'maintenance', 'labor_fixed', 'other'], { message: 'Selecciona un tipo de costo' })
description: z.string().min(1, 'La descripción es requerida').max(500)
amount: z.number().positive('El monto debe ser mayor a 0')
currency: z.string().length(3)
period_start: z.string().min(1, 'La fecha de inicio es requerida')
period_end: z.string().min(1, 'La fecha de fin es requerida')
allocation_basis: z.enum(['per_m2', 'per_plant', 'per_batch', 'per_zone', 'even_split'], { message: 'Selecciona una base de prorrateo' })
notes: z.string().max(2000).optional().or(z.literal(''))
```

Con refinamientos:
- period_end >= period_start ("La fecha fin debe ser igual o posterior a la fecha inicio")
- Si allocation_basis='per_zone' y zone_id es null: "Selecciona una zona para prorrateo por zona"

### Errores esperados

| Escenario                             | Mensaje al usuario                                                     |
| ------------------------------------- | ---------------------------------------------------------------------- |
| Feature flag deshabilitado            | "El módulo de costos no está habilitado" (redirect/disabled)           |
| Sin costos                            | "No hay costos registrados" (empty)                                    |
| Facility no seleccionada              | "Selecciona una facility" (inline)                                     |
| Monto <= 0                            | "El monto debe ser mayor a 0" (inline)                                 |
| Periodo inválido                      | "La fecha fin debe ser posterior a la fecha inicio" (inline)           |
| per_zone sin zona                     | "Selecciona una zona para prorrateo por zona" (inline)                 |
| Error creando                         | "Error al registrar el costo" (toast)                                  |
| Error calculando COGS                 | "Error al calcular COGS. Intenta nuevamente" (toast)                   |
| Sin batches para COGS                 | "No hay batches activos para calcular COGS"                            |
| Error de red                          | "Error de conexión. Intenta nuevamente" (toast)                        |

## Dependencias

- **Páginas relacionadas**:
  - `/production/batches/[id]` — batch detail muestra costo acumulado (PRD 25)
  - `/areas/facilities` — facilities para asignar costos (PRD 14)
  - `/settings/company` — feature flag cost_tracking (PRD 07)
- **SQL Function**: `calculate_batch_cogs(facility_id?, status?)` — cálculo de COGS con prorrateo de overhead
- **Triggers**: `trg_batch_cost_update` — actualiza batches.total_cost con costos directos (actividades). Overhead se calcula aparte en esta página
- **Feature flag**: `companies.settings.features_enabled.cost_tracking`
- **Supabase client**: PostgREST para CRUD + RPC para COGS
- **Recharts**: Gráfico de tendencia de costos
- **React Query**: Cache keys `['overhead-costs', { filters, page }]`, `['cost-kpis']`, `['batch-cogs', { facilityId, status }]`
