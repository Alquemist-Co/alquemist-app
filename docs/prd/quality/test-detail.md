# Detalle de Test de Calidad

## Metadata

- **Ruta**: `/quality/tests/[id]`
- **Roles con acceso**: admin (lectura + capturar resultados + cambiar status), manager (lectura + capturar resultados + cambiar status), supervisor (lectura + capturar resultados), operator (solo lectura), viewer (solo lectura)
- **Tipo componente**: Mixto (Server Component para carga inicial, Client Component para formulario de resultados)
- **Edge Functions**: Ninguna — operaciones CRUD directas via PostgREST

## Objetivo

Capturar y visualizar los resultados individuales de un test de calidad. Cada test tiene múltiples parámetros (ej: THC%, CBD%, limoneno, E.coli, etc.) con valores, umbrales y resultado pass/fail por parámetro.

El supervisor de calidad captura los resultados cuando llegan del laboratorio, verifica cada parámetro contra los umbrales definidos, y marca el test como completado. El sistema calcula automáticamente el `overall_pass` basándose en los resultados individuales.

También permite vincular un Certificado de Análisis (CoA) como documento regulatorio y cambiar el status del test.

Usuarios principales: supervisores de calidad, managers de producción.

## Tablas del modelo involucradas

| Tabla                           | Operaciones | Notas                                                                          |
| ------------------------------- | ----------- | ------------------------------------------------------------------------------ |
| quality_tests                   | R/W         | Lectura del test + Update status, overall_pass, result_date, notes             |
| quality_test_results            | R/W         | CRUD de resultados individuales por parámetro                                  |
| batches                         | R           | Batch asociado (código, cultivar, fase, producto actual)                       |
| production_phases               | R           | Fase al momento de la muestra                                                  |
| cultivars                       | R           | Cultivar del batch                                                             |
| products                        | R           | Producto actual del batch (para contexto)                                      |
| users                           | R           | Quién ejecutó/capturó                                                          |
| regulatory_documents            | R/W         | CoA vinculado al test (quality_test_id FK)                                     |
| regulatory_doc_types            | R           | Tipo CoA para crear documento regulatorio vinculado                            |
| product_regulatory_requirements | R           | Verificar si el producto requiere CoA                                          |

## ENUMs utilizados

| ENUM        | Valores                                                  | Tabla.campo          |
| ----------- | -------------------------------------------------------- | -------------------- |
| test_status | pending \| in_progress \| completed \| failed \| rejected | quality_tests.status |

## Layout y componentes principales

Página dentro del layout de dashboard con sidebar.

- **Header de página** — Breadcrumb (Calidad > Tests > {test_type} - {batch_code})
  - Título: "{test_type}" (ej: "Test de Potencia")
  - Subtítulo: Batch {code} · {cultivar} · Fase {phase_name}
  - Badges: status (con color), overall_pass (✓ pass verde / ✗ fail rojo / — pendiente)
  - Acciones (según status y rol):
    - Status=pending, admin/manager/supervisor: botón "Iniciar captura" → status='in_progress'
    - Status=in_progress, admin/manager/supervisor: botón "Completar test" (variant="primary") + botón "Marcar como fallido" (variant="destructive")
    - Status=completed/failed: botón "Rechazar" (admin/manager) → status='rejected'
    - Status=rejected: solo lectura
- **Sección: Información del test** — Card (read-only con campos editables)
  - Tipo de test (read-only)
  - Batch (link a `/production/batches/{id}`)
  - Fase de muestra
  - Laboratorio (editable si status != completed/rejected)
  - Referencia del laboratorio (editable si status != completed/rejected)
  - Fecha de muestra (read-only)
  - Fecha de resultado (editable, requerida para completar)
  - Ejecutado por (nombre)
  - Notas (editable si status != completed/rejected)
  - Botón "Guardar cambios" para lab_name, lab_reference, result_date, notes
- **Sección: Resultados por parámetro** — Card principal
  - Tabla editable de quality_test_results:
    - Columnas: Parámetro, Valor, Valor numérico, Unidad, Umbral mín, Umbral máx, Resultado (auto-calc badge)
    - **Modo edición** (status = pending o in_progress):
      - Input: Parámetro (text, req)
      - Input: Valor (text, req) — puede ser numérico ("23.5") o textual ("< 0.01", "positive")
      - Input: Valor numérico (number, opt) — para comparación programática
      - Input: Unidad (text, opt) — "%", "ppm", "CFU/g", "mg/g"
      - Input: Umbral mínimo (number, opt)
      - Input: Umbral máximo (number, opt)
      - Display: Resultado (auto-calculado):
        - Si min Y max: passed = numeric_value BETWEEN min AND max
        - Si solo min: passed = numeric_value >= min
        - Si solo max: passed = numeric_value <= max
        - Si sin umbrales: passed = null (pendiente evaluación manual)
      - Botón "Agregar parámetro" → nueva fila
      - Botón eliminar por fila (solo si status != completed)
    - **Modo lectura** (status = completed/failed/rejected):
      - Tabla read-only con colores:
        - passed=true: fondo verde claro, ícono ✓
        - passed=false: fondo rojo claro, ícono ✗
        - passed=null: fondo gris claro, ícono —
  - **Presets de parámetros** — Botón "Cargar preset" con opciones comunes:
    - Potency: THC (%, 0-35), CBD (%, 0-30), CBN (%, 0-5), CBG (%, 0-5)
    - Terpenes: Limonene (mg/g), Myrcene (mg/g), Caryophyllene (mg/g), Linalool (mg/g)
    - Contaminants: E.coli (CFU/g, max=100), Salmonella (presence, max=0), Total coliforms (CFU/g, max=10000)
    - Heavy metals: Lead (ppm, max=0.5), Arsenic (ppm, max=0.2), Cadmium (ppm, max=0.2), Mercury (ppm, max=0.1)
    - Pesticides: Total pesticides (ppm, max=0.01)
    - Moisture: Moisture content (%, max=15)
    - Los presets son sugerencias — el usuario puede modificar valores y agregar más parámetros
  - **Resumen de resultados** (debajo de la tabla):
    - Parámetros evaluados: {n} de {total}
    - Aprobados: {n} (verde)
    - Fallidos: {n} (rojo)
    - Pendientes: {n} (gris)
    - Overall: PASS ✓ / FAIL ✗ / PENDIENTE —
- **Sección: Certificado de Análisis (CoA)** — Card
  - Si existe regulatory_document con quality_test_id = este test:
    - Muestra: tipo doc, número, fecha emisión, fecha vencimiento, status, link al archivo
    - Botón "Ver documento" → descarga/preview del PDF
  - Si no existe y el producto requiere CoA (via product_regulatory_requirements):
    - Badge: "CoA requerido — no cargado" (amarillo)
    - Botón "Vincular CoA" → dialog para crear regulatory_document vinculado
  - Si no se requiere CoA:
    - Botón "Vincular CoA" (opcional) → mismo dialog
  - **Dialog: Vincular CoA**
    - Doc type pre-seleccionado: tipo CoA
    - Input file: Archivo PDF/imagen
    - Input: Número de documento
    - DatePicker: Fecha de emisión
    - Formulario dinámico de campos del doc_type
    - Se crea regulatory_document con quality_test_id = este test, batch_id = batch del test
- **Dialog: Completar test** — Modal de confirmación
  - Resumen: {n} parámetros evaluados, {n} pass, {n} fail
  - Overall result: PASS o FAIL (calculado)
  - Si hay parámetros sin evaluar (passed=null): warning "Hay {n} parámetros sin evaluación automática. ¿Marcar como pass?"
  - DatePicker: Fecha de resultado (req si no se llenó antes)
  - Botón "Completar test" (variant="primary")
- **Dialog: Marcar como fallido** — Modal
  - "¿Marcar el test como fallido? Esto indicará que el análisis no se pudo completar correctamente."
  - Textarea: Razón (req)
  - Botón "Marcar como fallido" (variant="destructive")

**Responsive**: Tabla de resultados con scroll horizontal en móvil. Dialogs full-screen.

## Requisitos funcionales

### Carga de datos

- **RF-01**: Cargar test completo:
  ```
  supabase.from('quality_tests')
    .select(`
      *,
      batch:batches(id, code, status, plant_count,
        cultivar:cultivars(id, name, code),
        phase:production_phases!current_phase_id(id, name),
        zone:zones(id, name),
        product:products!current_product_id(id, name, sku)
      ),
      phase:production_phases(id, name),
      user:users!performed_by(full_name),
      results:quality_test_results(*)
    `)
    .eq('id', testId)
    .single()
  ```
- **RF-02**: Cargar CoA vinculado:
  ```
  supabase.from('regulatory_documents')
    .select('*, doc_type:regulatory_doc_types(name, code, category)')
    .eq('quality_test_id', testId)
  ```
- **RF-03**: Si el test no existe o no es accesible (RLS), mostrar 404

### Captura de resultados

- **RF-04**: Agregar resultado:
  ```
  supabase.from('quality_test_results')
    .insert({
      test_id: testId,
      parameter,
      value,
      numeric_value,
      unit,
      min_threshold,
      max_threshold,
      passed  // auto-calculado
    })
  ```
- **RF-05**: Editar resultado:
  ```
  supabase.from('quality_test_results')
    .update({ value, numeric_value, unit, min_threshold, max_threshold, passed })
    .eq('id', resultId)
  ```
- **RF-06**: Eliminar resultado (solo si test no completado):
  ```
  supabase.from('quality_test_results')
    .delete()
    .eq('id', resultId)
  ```
- **RF-07**: Auto-cálculo de `passed` al guardar:
  - Si `numeric_value IS NOT NULL AND min_threshold IS NOT NULL AND max_threshold IS NOT NULL`:
    passed = numeric_value >= min_threshold AND numeric_value <= max_threshold
  - Si `numeric_value IS NOT NULL AND min_threshold IS NOT NULL AND max_threshold IS NULL`:
    passed = numeric_value >= min_threshold
  - Si `numeric_value IS NOT NULL AND min_threshold IS NULL AND max_threshold IS NOT NULL`:
    passed = numeric_value <= max_threshold
  - Si sin umbrales o sin numeric_value: passed = null

### Cambio de status

- **RF-08**: Iniciar captura: `update({ status: 'in_progress' }).eq('id', testId)`
- **RF-09**: Completar test:
  1. Calcular overall_pass: true si todos los results con passed != null tienen passed=true
  2. Si hay results con passed=null, preguntar al usuario si marcar como pass (checkbox manual)
  3. `update({ status: 'completed', overall_pass, result_date }).eq('id', testId)`
- **RF-10**: Marcar como fallido: `update({ status: 'failed', notes: 'Failed: ' + reason }).eq('id', testId)`
- **RF-11**: Rechazar: `update({ status: 'rejected' }).eq('id', testId)`. Solo admin/manager
- **RF-12**: Si overall_pass=false → el pg_cron job puede generar alert type='quality_failed' (la alerta se crea en Fase 6, pero el status queda registrado aquí)

### Vincular CoA

- **RF-13**: Crear regulatory_document vinculado:
  ```
  supabase.from('regulatory_documents')
    .insert({
      doc_type_id: coaDocTypeId,
      quality_test_id: testId,
      batch_id: test.batch_id,
      document_number,
      issue_date,
      field_data,
      file_path,
      status: 'valid'
    })
  ```
- **RF-14**: Subir archivo a Storage: `regulatory-documents/{company_id}/COA/{document_id}.pdf`

### Presets

- **RF-15**: Los presets son client-side — no se guardan en DB. Al seleccionar un preset, se agregan filas a la tabla de resultados con los parámetros y umbrales predefinidos
- **RF-16**: El usuario puede agregar, modificar o eliminar parámetros del preset antes de guardar

### Navegación

- **RF-17**: Click en batch code navega a `/production/batches/{batchId}` (PRD 25)
- **RF-18**: Botón "Volver a tests" navega a `/quality/tests` (PRD 29)

## Requisitos no funcionales

- **RNF-01**: RLS Pattern 2 — quality_tests hereda aislamiento vía batch_id → batches.zone_id → facilities.company_id
- **RNF-02**: Los resultados se guardan individualmente (cada parámetro es un save independiente) — no se requiere transacción para la captura
- **RNF-03**: El overall_pass se calcula al completar el test, no se actualiza en tiempo real (evita inconsistencias)
- **RNF-04**: Los presets de parámetros son configuración client-side — en el futuro podrían migrarse a un catálogo por empresa
- **RNF-05**: El CoA vinculado es un regulatory_document estándar — se muestra también en `/regulatory/documents` (PRD 31)

## Flujos principales

### Happy path — Capturar resultados de potencia

1. Supervisor navega a `/quality/tests/{id}` — test de potencia para LOT-GELATO-260301
2. Status: pending. Click "Iniciar captura" → status='in_progress'
3. Click "Cargar preset" → "Potency" → se agregan filas: THC, CBD, CBN, CBG con umbrales
4. Captura valores del laboratorio:
   - THC: 23.5% (umbral: 18-30) → PASS ✓
   - CBD: 0.8% (umbral: 0-5) → PASS ✓
   - CBN: 0.3% (umbral: 0-2) → PASS ✓
   - CBG: 1.2% (umbral: 0-3) → PASS ✓
5. Agrega parámetro adicional: Limonene = 12.3 mg/g (sin umbrales → pendiente)
6. Resumen: 4 pass, 0 fail, 1 pendiente
7. Click "Completar test" → dialog: "1 parámetro sin evaluación automática. ¿Marcar como pass?"
8. Confirma → overall_pass=true, status='completed'
9. Toast: "Test completado: APROBADO"

### Capturar resultados con falla

1. Test de contaminantes para LOT-002
2. Carga preset "Contaminants"
3. Resultados:
   - E.coli: 50 CFU/g (max: 100) → PASS ✓
   - Salmonella: "positive" (max: 0) → numeric_value=1 → FAIL ✗
   - Total coliforms: 8500 CFU/g (max: 10000) → PASS ✓
4. Resumen: 2 pass, 1 fail
5. Click "Completar test" → overall_pass=false, status='completed'
6. Toast: "Test completado: FALLIDO — 1 parámetro fuera de rango"
7. Badge del test cambia a rojo. En el batch detail, el test aparece como fallido

### Vincular CoA

1. Resultados capturados y test completado
2. Sección CoA: "CoA requerido — no cargado"
3. Click "Vincular CoA" → dialog
4. Sube PDF del certificado del laboratorio
5. Llena: número=CHL-2026-0445, fecha=25/02/2026
6. Campos dinámicos del doc_type (si aplican)
7. Click "Guardar" → CoA vinculado
8. El CoA aparece también en `/regulatory/documents`

### Test generado automáticamente — captura posterior

1. execute-harvest creó un test de potencia con status=pending
2. Supervisor navega al test
3. Actualiza: lab_name="ChemHistory Labs", lab_reference="CHL-2026-0445"
4. Guarda cambios
5. Cuando lleguen resultados del lab (días después), vuelve y captura resultados

## Estados y validaciones

### Estados de UI — Página

| Estado    | Descripción                                                         |
| --------- | ------------------------------------------------------------------- |
| loading   | Skeleton de secciones                                               |
| loaded    | Test con datos, resultados editables o read-only según status       |
| not-found | Test no encontrado — 404                                            |
| error     | "Error al cargar el test. Intenta nuevamente" + reintentar          |

### Estados de UI — Captura de resultados

| Estado     | Descripción                                                |
| ---------- | ---------------------------------------------------------- |
| idle       | Tabla editable, cambios no guardados                       |
| saving     | Guardando resultado individual (por fila)                  |
| saved      | Resultado guardado, indicador visual                       |
| error      | Error al guardar — toast error                             |

### Validaciones Zod — Resultado individual

```
parameter: z.string().min(1, 'El parámetro es requerido').max(200)
value: z.string().min(1, 'El valor es requerido').max(200)
numeric_value: z.number().optional().nullable()
unit: z.string().max(50).optional().or(z.literal(''))
min_threshold: z.number().optional().nullable()
max_threshold: z.number().optional().nullable()
```

Con refinamientos:
- Si min_threshold Y max_threshold: min <= max
- Si se quiere auto-calcular passed: numeric_value es requerido

### Validaciones Zod — Editar test

```
lab_name: z.string().max(200).optional().or(z.literal(''))
lab_reference: z.string().max(100).optional().or(z.literal(''))
result_date: z.string().optional().or(z.literal(''))
notes: z.string().max(2000).optional().or(z.literal(''))
```

### Errores esperados

| Escenario                           | Mensaje al usuario                                                 |
| ----------------------------------- | ------------------------------------------------------------------ |
| Test no encontrado                  | "Test no encontrado" (404)                                         |
| Parámetro vacío                     | "El parámetro es requerido" (inline)                               |
| Valor vacío                         | "El valor es requerido" (inline)                                   |
| Min > Max en umbrales               | "El umbral mínimo debe ser menor al máximo" (inline)               |
| Completar sin result_date           | "La fecha de resultado es requerida para completar el test" (toast)|
| Completar sin resultados            | "Agrega al menos un resultado antes de completar" (toast)          |
| Error guardando resultado           | "Error al guardar el resultado. Intenta nuevamente" (toast)        |
| Error cambiando status              | "Error al actualizar el test. Intenta nuevamente" (toast)          |
| Error subiendo CoA                  | "Error al subir el certificado" (toast)                            |
| Error de red                        | "Error de conexión. Intenta nuevamente" (toast)                    |

## Dependencias

- **Páginas relacionadas**:
  - `/quality/tests` — listado de tests (PRD 29)
  - `/production/batches/[id]` — detalle de batch, tab calidad (PRD 25)
  - `/regulatory/documents` — CoA aparece aquí también (PRD 31)
  - `/regulatory/documents/[id]` — detalle del CoA (PRD 32)
- **Supabase client**: PostgREST para CRUD directo
- **Supabase Storage**: Bucket `regulatory-documents/{company_id}/COA/` para archivos CoA
- **React Query**: Cache keys `['quality-tests', testId]`, `['quality-test-results', testId]`, `['quality-test-coa', testId]`
