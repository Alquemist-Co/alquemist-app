# F-048: Costos Overhead y COGS Completo

## Overview

Funcionalidad para registrar costos indirectos (energia, renta, depreciacion, seguros), asignarlos proporcionalmente a batches segun una base de asignacion (area_m2, plant_count, duration_days), y calcular el COGS completo de cada batch desglosado en materiales directos, labor y overhead. Incluye costo por planta y costo por gramo para analisis de rentabilidad.

## User Personas

- **Gerente**: Registra costos overhead, analiza COGS por batch, compara costos reales vs estimados.
- **Admin**: Configura categorias de costos, gestiona costos de toda la empresa.
- **Supervisor**: Consulta costos de batches en sus zonas (read-only en costos overhead).

## Stories

| ID | Story | Size | Prioridad | Estado |
|----|-------|------|-----------|--------|
| US-048-001 | Registro de costos overhead | M | P0 | Planned |
| US-048-002 | Asignacion de overhead a batches | M | P0 | Planned |
| US-048-003 | Calculo de COGS completo por batch | L | P0 | Planned |
| US-048-004 | Vista de costos en batch-detail | M | P1 | Planned |
| US-048-005 | Comparativa de costos entre batches | M | P2 | Planned |

---

# US-048-001: Registro de costos overhead

## User Story

**As a** gerente,
**I want** registrar costos indirectos (energia, renta, depreciacion, etc.) asociados a una facility o zona especifica con su periodo y base de asignacion,
**So that** estos costos se puedan distribuir proporcionalmente a los batches para calcular el COGS real.

## Acceptance Criteria

### Scenario 1: Registrar costo de energia mensual para facility
- **Given** el gerente esta en la pantalla ops-costs
- **When** registra: facility = "Invernadero Principal", zona = (ninguna — aplica a toda la facility), tipo = "energy", descripcion = "Electricidad Enero 2026", monto = 2,500,000 COP, periodo = 2026-01-01 a 2026-01-31, base de asignacion = "per_m2"
- **Then** se crea el overhead_cost con los datos ingresados
- **And** aparece en la lista de costos del periodo
- **And** se muestra toast de confirmacion

### Scenario 2: Registrar costo para zona especifica
- **Given** el gerente quiere registrar renta solo para la Sala de Secado
- **When** selecciona zona = "Sala Secado" ademas de la facility
- **Then** el costo se asocia a esa zona especifica
- **And** solo se asignara a batches que hayan estado en esa zona durante el periodo

### Scenario 3: Monto negativo rechazado
- **Given** el gerente intenta registrar un costo con monto = -500
- **When** envia el formulario
- **Then** se muestra error de validacion "El monto debe ser positivo"

### Scenario 4: Periodo invalido
- **Given** el gerente ingresa period_start = 2026-02-15, period_end = 2026-01-15
- **When** envia el formulario
- **Then** se muestra error "La fecha de inicio debe ser anterior a la fecha de fin"

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] Validacion Zod client y server
- [ ] Solo gerente y admin pueden registrar (RLS + middleware)

## Technical Notes
- Pantalla: `ops-costs`
- Server Action: `registerOverhead(input)` en `lib/actions/operations.actions.ts`
- Zod schema: `registerOverheadSchema`:
  ```typescript
  z.object({
    facility_id: z.string().uuid(),
    zone_id: z.string().uuid().optional(),
    cost_type: z.enum(['energy', 'rent', 'depreciation', 'insurance', 'maintenance', 'labor_fixed', 'other']),
    description: z.string().min(5).max(500),
    amount: z.number().positive(),
    currency: z.string().length(3).default('COP'),
    period_start: z.string().date(),
    period_end: z.string().date(),
    allocation_basis: z.enum(['per_m2', 'per_plant', 'per_batch', 'per_zone', 'even_split']),
    notes: z.string().max(1000).optional(),
  }).refine(data => data.period_start < data.period_end, {
    message: 'La fecha de inicio debe ser anterior a la fecha de fin',
  })
  ```
- RLS: overhead_costs via facility_id -> company_id
- Roles: INSERT/UPDATE solo manager y admin

## UI/UX Notes
- Formulario en modal/dialog: 480px max-width desktop, fullscreen mobile
- Facility y zona: dropdowns con search
- Tipo: dropdown con iconos por categoria (rayo=energy, casa=rent, etc.)
- Monto: input numerico con formato de moneda, teclado numerico en mobile
- Base de asignacion: radio buttons con descripcion breve de cada opcion
- Lista de costos: tabla con filtros por periodo y tipo

## Dependencies
- Fase 0: schema DB (overhead_costs, facilities, zones)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-048-002: Asignacion de overhead a batches

## User Story

**As a** gerente,
**I want** ver como se distribuye un costo overhead a cada batch activo segun la base de asignacion seleccionada,
**So that** pueda verificar que la distribucion es justa y entender cuanto overhead asume cada lote.

## Acceptance Criteria

### Scenario 1: Asignacion por area_m2
- **Given** un costo de energia de $2,500,000 con allocation_basis = 'per_m2' para la facility
- **And** hay 3 batches activos en zonas de 80m2, 60m2 y 40m2 respectivamente (total: 180m2)
- **When** se calcula la asignacion
- **Then** batch 1 recibe $1,111,111 (80/180), batch 2 recibe $833,333 (60/180), batch 3 recibe $555,556 (40/180)
- **And** la suma de asignaciones = monto original

### Scenario 2: Asignacion por plant_count
- **Given** un costo con allocation_basis = 'per_plant'
- **And** hay 2 batches: LOT-001 con 42 plantas y LOT-002 con 100 plantas
- **When** se calcula la asignacion
- **Then** LOT-001 recibe 42/142 del total y LOT-002 recibe 100/142

### Scenario 3: Zona sin area_m2 con base per_m2
- **Given** un costo con allocation_basis = 'per_m2'
- **And** un batch esta en una zona sin area_m2 configurada
- **When** se calcula la asignacion
- **Then** ese batch se excluye de la asignacion
- **And** se muestra warning "Zona {nombre} excluida: no tiene area configurada"
- **And** el costo se distribuye solo entre batches en zonas con area

### Scenario 4: Sin batches activos en el periodo
- **Given** un costo overhead para un periodo donde no hubo batches activos
- **When** se intenta calcular la asignacion
- **Then** se muestra "No hay batches activos en este periodo — el costo no se asigna"

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] Suma de asignaciones = monto original (sin centavos perdidos)

## Technical Notes
- Pantalla: `ops-costs` (seccion de detalle de costo)
- Server Action: `allocateOverhead(overheadCostId)` en `lib/actions/operations.actions.ts`
- Logica de asignacion:
  1. Obtener batches activos durante period_start..period_end en la facility (o zona si especificada)
  2. Segun allocation_basis calcular proporcion:
     - `per_m2`: SUM(zones.area_m2) de zonas con batches activos
     - `per_plant`: SUM(batches.plant_count)
     - `per_batch`: 1/N (reparto equitativo por batch)
     - `per_zone`: 1/M (reparto equitativo por zona con batches)
     - `even_split`: 1/N (igual que per_batch)
  3. allocated_amount = overhead.amount * (batch_base / total_base)
- Query para batches activos en periodo:
  ```sql
  SELECT b.id, b.plant_count, b.zone_id, z.area_m2
  FROM batches b
  JOIN zones z ON b.zone_id = z.id
  WHERE z.facility_id = :facilityId
    AND b.status = 'active'
    AND b.start_date <= :periodEnd
    AND (b.expected_end_date IS NULL OR b.expected_end_date >= :periodStart)
  ```
- Retorna: `{ batch_id, batch_code, base_value, proportion_pct, allocated_amount }[]`

## UI/UX Notes
- Vista: tabla debajo del detalle del costo overhead
- Columnas: batch code, base (m2/plantas/etc), proporcion %, monto asignado
- Total al fondo = monto original del overhead
- Warning para zonas excluidas: banner amarillo arriba de la tabla

## Dependencies
- US-048-001 (costos overhead registrados)
- Fase 1: F-016/F-017 (batches con zone_id y plant_count)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-048-003: Calculo de COGS completo por batch

## User Story

**As a** gerente,
**I want** ver el COGS completo de un batch desglosado en materiales directos, labor y overhead, incluyendo costo por planta y costo por gramo,
**So that** pueda analizar la rentabilidad real del lote y comparar con el estimado de la orden.

## Acceptance Criteria

### Scenario 1: COGS con los tres componentes
- **Given** el batch LOT-001 tiene: $500,000 en consumos de inventario, 45 horas de labor a $15,000/hora, y $250,000 en overhead asignado
- **When** se calcula el COGS via calculateBatchCOGS(batchId)
- **Then** retorna: direct_materials = $500,000, labor = $675,000, overhead = $250,000, total = $1,425,000
- **And** per_plant = $1,425,000 / 42 plantas = $33,929
- **And** per_gram = $1,425,000 / 5,250g output = $271.43

### Scenario 2: Batch sin actividades ni transacciones
- **Given** un batch recien creado sin actividades ejecutadas
- **When** se calcula el COGS
- **Then** direct_materials = $0, labor = $0, overhead = monto prorrateado si existe, total = overhead
- **And** per_plant y per_gram muestran el overhead por planta

### Scenario 3: Batch sin output en gramos (aun en produccion)
- **Given** el batch aun no ha sido cosechado (no tiene transformation_out con peso)
- **When** se calcula el COGS
- **Then** per_gram = null (no se puede calcular)
- **And** los demas valores se calculan normalmente

### Scenario 4: COGS recalculado en tiempo real
- **Given** el gerente esta viendo el COGS de LOT-001
- **When** se ejecuta una nueva actividad que consume $50,000 en insumos
- **Then** al recargar, el COGS refleja el nuevo total (direct_materials + $50,000)
- **And** el calculo es on-demand, no cacheado

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] Logica de labor con tarifa por defecto si usuario no tiene hourly_rate
- [ ] per_gram solo calculado si hay output transformado

## Technical Notes
- Server Action: `calculateBatchCOGS(batchId)` en `lib/actions/operations.actions.ts`
- Calculo de direct_materials:
  ```sql
  SELECT COALESCE(SUM(cost_total), 0) as direct_materials
  FROM inventory_transactions
  WHERE batch_id = :batchId AND type IN ('consumption', 'application')
  ```
- Calculo de labor:
  ```sql
  SELECT COALESCE(SUM(a.duration_minutes), 0) as total_minutes
  FROM activities a
  WHERE a.batch_id = :batchId AND a.status = 'completed'
  ```
  - `labor = (total_minutes / 60) * hourly_rate`
  - hourly_rate: buscar en users o usar default de company settings
- Calculo de overhead: SUM de allocated_amounts para este batch de todos los overhead_costs
- per_plant: total / batch.plant_count
- per_gram: total / SUM(inventory_transactions.quantity WHERE type = 'transformation_out' AND unit = gramos)
- Return type:
  ```typescript
  {
    direct_materials: number;
    labor: number;
    overhead: number;
    total: number;
    per_plant: number;
    per_gram: number | null;
    breakdown: { category: string; amount: number; }[];
  }
  ```

## UI/UX Notes
- No aplica directamente (Server Action consumida por US-048-004)

## Dependencies
- US-048-002 (overhead asignado a batches)
- Fase 1: F-016/F-017 (batches), F-022 (actividades)
- Fase 2: F-026 (inventory_transactions)

## Estimation
- **Size**: L
- **Complexity**: High

---

# US-048-004: Vista de costos en batch-detail

## User Story

**As a** gerente,
**I want** ver el COGS completo del batch en el tab de Costos del detalle de batch,
**So that** pueda analizar el desglose de costos sin salir del contexto del lote.

## Acceptance Criteria

### Scenario 1: Tab Costos con desglose completo
- **Given** el batch LOT-001 tiene COGS calculado con los tres componentes
- **When** el usuario navega a batch-detail y selecciona el tab "Costos"
- **Then** se muestra card hero con: costo total, costo/planta, costo/gramo
- **And** un donut chart con distribucion por categoria (insumos, labor, overhead)
- **And** una tabla con cada categoria expandible para ver detalle

### Scenario 2: Comparacion real vs estimado
- **Given** el batch tiene production_order con expected_output_quantity y costos estimados
- **When** se muestra el tab Costos
- **Then** se muestra barra de comparacion: costo real vs presupuesto estimado
- **And** si el costo real excede el estimado en > 20%, se resalta en rojo con warning

### Scenario 3: Desglose por fase
- **Given** el batch ha pasado por 3 fases con costos en cada una
- **When** el usuario selecciona vista "Por fase"
- **Then** se muestra bar chart con costo por fase
- **And** permite identificar que fases son mas costosas

### Scenario 4: Batch sin costos
- **Given** un batch nuevo sin transacciones ni actividades
- **When** se muestra el tab Costos
- **Then** se muestra "Sin costos registrados — los costos se acumularan al ejecutar actividades"

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] Charts lazy loaded
- [ ] Accesibilidad: datos tabulares accesibles para screen readers

## Technical Notes
- Pantalla: `batch-costs` (tab dentro de batch-detail)
- Consume Server Action `calculateBatchCOGS(batchId)`
- Donut chart: Recharts `PieChart` con colores del design system
- Bar chart por fase: Recharts `BarChart`
- Comparativa: calcular estimado desde production_order si existe
- Lazy loading: `dynamic(() => import('./CostCharts'), { ssr: false })`

## UI/UX Notes
- Card hero: fondo sutil, numeros grandes en DM Mono Bold 24px
- Donut chart: 200px diametro, 3 segmentos (insumos=#005E42, labor=#0891B2, overhead=#D97706)
- Tabla expandible: filas con disclosure arrow para ver sub-items
- Barra comparativa: barra dual con verde=real, outline=estimado
- Mobile: stack vertical, Desktop: hero + chart en 2 columnas

## Dependencies
- US-048-003 (calculo de COGS)
- Fase 1: batch-detail con tabs

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-048-005: Comparativa de costos entre batches

## User Story

**As a** gerente,
**I want** comparar los costos de batches historicos del mismo cultivar,
**So that** pueda identificar si un batch esta fuera del rango normal de costos y detectar ineficiencias o mejoras.

## Acceptance Criteria

### Scenario 1: Comparativa con batches historicos
- **Given** hay 5 batches completados del cultivar "Gelato #41"
- **When** el gerente ve los costos de un batch de Gelato y hay datos historicos
- **Then** se muestra tabla comparativa con: batch code, total COGS, costo/planta, costo/gramo, yield %
- **And** el batch actual se resalta si esta fuera del rango (> 1 desviacion estandar)

### Scenario 2: Sin batches historicos para comparar
- **Given** es el primer batch de un cultivar nuevo
- **When** se intenta mostrar la comparativa
- **Then** se muestra "Sin datos historicos — la comparativa estara disponible despues de completar mas batches de este cultivar"

### Scenario 3: Batch con costo anomalo resaltado
- **Given** el costo/gramo promedio de Gelato es $250 y este batch tiene $400
- **When** se muestra la comparativa
- **Then** el valor $400 se resalta en rojo con indicador "60% sobre promedio"

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados

## Technical Notes
- Pantalla: `batch-costs` (seccion debajo del COGS principal)
- Query: obtener batches del mismo cultivar con status 'completed'
- Calcular COGS de cada batch historico (podria cachearse en batch.total_cost)
- Estadisticas: promedio y desviacion estandar por campo
- Highlight si valor > promedio + 1*std

## UI/UX Notes
- Tabla: batch code (link), total, /planta, /gramo, yield
- Fila actual resaltada con fondo brand-light
- Valores anomalos: texto en rojo con tooltip explicativo
- Sparkline mini de tendencia temporal (opcional)

## Dependencies
- US-048-004 (vista de costos en batch-detail)

## Estimation
- **Size**: M
- **Complexity**: Medium
