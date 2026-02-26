# Tests de Calidad

## Metadata

- **Ruta**: `/quality/tests`
- **Roles con acceso**: admin (lectura + crear + editar + eliminar borrador), manager (lectura + crear + editar), supervisor (lectura + crear), operator (solo lectura), viewer (solo lectura)
- **Tipo componente**: Mixto (Server Component para listado, Client Component para formulario de creación y filtros)
- **Edge Functions**: Ninguna — operaciones CRUD directas via PostgREST

## Objetivo

Listado y creación de tests de calidad vinculados a batches. Los tests representan análisis de laboratorio (potencia, contaminantes, microbiológicos, etc.) que se realizan en distintas fases de la producción.

Desde aquí se crean nuevos tests, se ve el estado de los existentes (pending, in_progress, completed, failed, rejected), y se navega al detalle para capturar resultados.

Algunos tests se generan automáticamente (ej: al ejecutar cosecha via execute-harvest), pero también se pueden crear manualmente.

Usuarios principales: supervisores de calidad que gestionan los análisis, managers que monitorean compliance.

## Tablas del modelo involucradas

| Tabla                           | Operaciones | Notas                                                                    |
| ------------------------------- | ----------- | ------------------------------------------------------------------------ |
| quality_tests                   | R/W         | CRUD de tests. RLS via batch → zone → facility → company                |
| quality_test_results            | R           | Count de resultados para mostrar progreso (detalle en PRD 30)            |
| batches                         | R           | Batch asociado (código, cultivar, fase)                                  |
| production_phases               | R           | Fase en que se toma la muestra                                           |
| cultivars                       | R           | Cultivar del batch (para filtros)                                        |
| zones                           | R           | Zona del batch (para filtros)                                            |
| facilities                      | R           | Facility (para filtros)                                                  |
| users                           | R           | Quién creó el test, quién lo ejecuta                                     |
| product_regulatory_requirements | R           | Para verificar si el batch requiere tests específicos                    |
| regulatory_doc_types            | R           | Tipos de documentos vinculados a tests (CoA)                             |

## ENUMs utilizados

| ENUM        | Valores                                                 | Tabla.campo         |
| ----------- | ------------------------------------------------------- | ------------------- |
| test_status | pending \| in_progress \| completed \| failed \| rejected | quality_tests.status |

## Layout y componentes principales

Página dentro del layout de dashboard con sidebar.

- **Header de página** — Título "Tests de Calidad"
  - Subtítulo: "{n} tests" (total filtrado)
  - Botón "Nuevo test" (variant="primary") — solo admin/manager/supervisor
- **Barra de KPIs** — Row de cards compactas con métricas:
  - Pendientes: {n} (badge amarillo)
  - En progreso: {n} (badge azul)
  - Completados este mes: {n} (badge verde)
  - Fallidos este mes: {n} (badge rojo)
- **Barra de filtros** — Row de filtros combinables:
  - Search: Buscar por tipo de test, referencia lab, código de batch
  - Select: Status (todos, pending, in_progress, completed, failed, rejected — multi-select)
  - Select: Tipo de test (text libre: potency, contaminants, brix, microbiological, etc.)
  - Select: Facility (todas)
  - Select: Batch (todos)
  - Select: Cultivar (todos)
  - DatePicker rango: Fecha muestra desde/hasta
  - Select: Resultado (todos, pass, fail — filtra overall_pass)
  - Botón "Limpiar filtros"
- **Tabla principal** — Tabla paginada server-side
  - Columnas:
    - Tipo de test (test_type, badge)
    - Batch (código con link, badge status del batch)
    - Cultivar (nombre)
    - Fase (fase al momento de la muestra)
    - Laboratorio (lab_name)
    - Ref. Lab (lab_reference)
    - Fecha muestra (sample_date)
    - Fecha resultado (result_date, o "Pendiente")
    - Status (badge con color: pending=amarillo, in_progress=azul, completed=verde, failed=rojo, rejected=gris)
    - Resultado (overall_pass: ✓ verde / ✗ rojo / — pendiente)
    - Parámetros (count de quality_test_results)
    - Acciones: "Ver detalle" → navega a `/quality/tests/{id}` (PRD 30)
  - Ordenamiento: por fecha muestra descendente (default)
  - Paginación: 20 items por página
  - Click en fila → navega a `/quality/tests/{id}`
- **Dialog: Nuevo test** — Modal de creación
  - Select: Batch (req) — dropdown con búsqueda, muestra código + cultivar + fase
  - Select: Fase de muestra (req) — pre-seleccionada con la fase actual del batch, pero editable
  - Input: Tipo de test (req) — text con sugerencias: potency, contaminants, brix, caliber, microbiological, terpenes, heavy_metals, pesticides, mycotoxins, moisture
  - Input: Laboratorio (opt) — text
  - Input: Referencia de laboratorio (opt) — text (ID de muestra del lab)
  - DatePicker: Fecha de muestra (req, default=hoy)
  - Textarea: Notas (opt)
  - Botón "Crear test" (variant="primary")
  - Al crear → navega al detalle del test para capturar resultados

**Responsive**: KPIs en 2×2 grid en móvil. Tabla con scroll horizontal. Dialog full-screen en móvil.

## Requisitos funcionales

### Carga de datos

- **RF-01**: Query principal con paginación server-side:
  ```
  supabase.from('quality_tests')
    .select(`
      *,
      batch:batches(id, code, status,
        cultivar:cultivars(id, name),
        zone:zones(id, name, facility:facilities(id, name))
      ),
      phase:production_phases(id, name),
      user:users!performed_by(full_name),
      results:quality_test_results(count)
    `, { count: 'exact' })
    .order('sample_date', { ascending: false })
    .range(offset, offset + pageSize - 1)
  ```
- **RF-02**: KPIs se calculan con queries agregadas:
  ```
  -- Pendientes
  supabase.from('quality_tests').select('id', { count: 'exact', head: true }).eq('status', 'pending')
  -- En progreso
  supabase.from('quality_tests').select('id', { count: 'exact', head: true }).eq('status', 'in_progress')
  -- Completados este mes
  supabase.from('quality_tests').select('id', { count: 'exact', head: true }).eq('status', 'completed').gte('result_date', startOfMonth)
  -- Fallidos este mes
  supabase.from('quality_tests').select('id', { count: 'exact', head: true }).eq('status', 'failed').gte('result_date', startOfMonth)
  ```
- **RF-03**: Filtros se aplican como query params en la query principal
- **RF-04**: Para operarios, mostrar todos los tests visibles por RLS (read-only)

### Crear test

- **RF-05**: Al crear:
  ```
  supabase.from('quality_tests')
    .insert({
      batch_id,
      phase_id,
      test_type,
      lab_name,
      lab_reference,
      sample_date,
      status: 'pending',
      overall_pass: null,
      notes,
      performed_by: auth.uid()
    })
    .select()
    .single()
  ```
- **RF-06**: Tras crear, navegar a `/quality/tests/{newTestId}` para capturar resultados
- **RF-07**: Toast: "Test de calidad creado exitosamente"

### Eliminar borrador

- **RF-08**: Solo se pueden eliminar tests con status='pending' y sin quality_test_results:
  ```
  supabase.from('quality_tests').delete().eq('id', testId).eq('status', 'pending')
  ```
- **RF-09**: Solo admin puede eliminar. Confirmación con dialog.

### Navegación

- **RF-10**: Click en fila o "Ver detalle" navega a `/quality/tests/{id}` (PRD 30)
- **RF-11**: Click en batch code navega a `/production/batches/{batchId}` (PRD 25)

## Requisitos no funcionales

- **RNF-01**: RLS Pattern 2 — quality_tests hereda aislamiento vía batch_id → batches.zone_id → facilities.company_id
- **RNF-02**: Paginación server-side (20 items por página)
- **RNF-03**: Las KPIs se calculan en paralelo (4 queries count) para no bloquear el rendering
- **RNF-04**: El test_type es texto libre (no ENUM) para permitir flexibilidad — pero se ofrecen sugerencias comunes
- **RNF-05**: Los tests creados automáticamente (por execute-harvest u otros flujos) aparecen con el mismo formato

## Flujos principales

### Happy path — Crear test de potencia post-cosecha

1. Supervisor navega a `/quality/tests`
2. KPIs: 3 pendientes, 1 en progreso, 12 completados este mes, 0 fallidos
3. Click "Nuevo test"
4. Dialog: Batch=LOT-GELATO-260301, Fase=Cosecha, Tipo=potency, Lab=ChemHistory Labs, Ref=CHL-2026-0445, Fecha=25/02/2026
5. Click "Crear test" → navega a `/quality/tests/{id}`
6. Captura resultados ahí (PRD 30)

### Filtrar tests fallidos

1. Manager selecciona Status: failed
2. Tabla muestra 2 tests fallidos del último mes
3. Click en uno → navega al detalle para ver qué parámetros fallaron
4. Desde el detalle, navega al batch para tomar acción

### Ver tests de un batch específico

1. Filtra por Batch: LOT-GELATO-260301
2. Ve 3 tests: potency (pending), contaminants (completed, pass), microbiological (completed, pass)
3. Click en potency → navega a detalle para capturar resultados del lab

### Test generado automáticamente

1. Al ejecutar cosecha (PRD 25, execute-harvest), el sistema creó un test potency con status=pending
2. El test aparece en la lista con lab_name vacío
3. Supervisor edita: agrega lab_name y lab_reference
4. Navega al detalle para capturar resultados cuando lleguen del lab

## Estados y validaciones

### Estados de UI — Página

| Estado  | Descripción                                                          |
| ------- | -------------------------------------------------------------------- |
| loading | Skeleton de KPIs, filtros y tabla                                    |
| loaded  | KPIs, filtros y tabla con datos                                      |
| empty   | "No se encontraron tests de calidad" + limpiar filtros               |
| error   | "Error al cargar los tests. Intenta nuevamente" + reintentar         |

### Estados de UI — Dialog de creación

| Estado     | Descripción                                    |
| ---------- | ---------------------------------------------- |
| idle       | Campos listos para llenar                      |
| submitting | Botón loading, campos disabled                 |
| success    | Dialog cierra, navega al detalle               |
| error      | Toast error, dialog permanece abierto          |

### Validaciones Zod — Crear test

```
batch_id: z.string().uuid('Selecciona un batch')
phase_id: z.string().uuid('Selecciona una fase')
test_type: z.string().min(1, 'El tipo de test es requerido').max(100)
lab_name: z.string().max(200).optional().or(z.literal(''))
lab_reference: z.string().max(100).optional().or(z.literal(''))
sample_date: z.string().min(1, 'La fecha de muestra es requerida')
notes: z.string().max(2000).optional().or(z.literal(''))
```

### Errores esperados

| Escenario                 | Mensaje al usuario                                            |
| ------------------------- | ------------------------------------------------------------- |
| Sin resultados            | "No se encontraron tests con estos filtros" (empty)           |
| Batch no seleccionado     | "Selecciona un batch" (inline)                                |
| Tipo no ingresado         | "El tipo de test es requerido" (inline)                       |
| Fecha no seleccionada     | "La fecha de muestra es requerida" (inline)                   |
| Error creando test        | "Error al crear el test. Intenta nuevamente" (toast)          |
| Error eliminando test     | "Error al eliminar el test" (toast)                           |
| No se puede eliminar      | "Solo se pueden eliminar tests pendientes sin resultados"     |
| Error de red              | "Error de conexión. Intenta nuevamente" (toast)               |

## Dependencias

- **Páginas relacionadas**:
  - `/quality/tests/[id]` — detalle con resultados por parámetro (PRD 30)
  - `/production/batches/[id]` — detalle de batch, tab calidad (PRD 25)
  - `/regulatory/documents` — CoA vinculado al test (PRD 31)
- **Supabase client**: PostgREST para CRUD + queries de conteo
- **React Query**: Cache keys `['quality-tests', { filters, page }]`, `['quality-test-counts']`
