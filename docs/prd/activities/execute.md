# Ejecución de Actividad

## Metadata

- **Ruta**: `/activities/execute/[id]`
- **Roles con acceso**: admin (ejecutar), manager (ejecutar), supervisor (ejecutar), operator (ejecutar)
- **Tipo componente**: Client Component (formulario dinámico con estado complejo: recursos escalados, checklist interactivo, observaciones, fotos)
- **Edge Functions**: `execute-activity` — orquesta la ejecución completa: crea activity + activity_resources + inventory_transactions + activity_observations + actualiza scheduled_activity

## Objetivo

Formulario de ejecución de una actividad programada. Es el centro operativo donde el usuario registra qué hizo, cuánto material usó, qué observó, y completa el checklist de verificación.

El formulario escala automáticamente las cantidades de recursos basándose en el template_snapshot y los datos del batch (plant_count, área). El usuario ajusta las cantidades reales, completa ítems críticos del checklist, registra observaciones de campo (plagas, enfermedades, deficiencias) y opcionalmente adjunta fotos.

Al confirmar, la Edge Function `execute-activity` ejecuta todo transaccionalmente: crea registros, genera transacciones de inventario, y opcionalmente dispara transición de fase si el template lo indica.

Usuarios principales: operarios y supervisores en el día a día de producción.

## Tablas del modelo involucradas

| Tabla                       | Operaciones | Notas                                                                                    |
| --------------------------- | ----------- | ---------------------------------------------------------------------------------------- |
| scheduled_activities        | R/W         | Leer datos de la actividad programada + template_snapshot. Write: status='completed'     |
| activities                  | W           | Crear registro de ejecución (via Edge Function)                                          |
| activity_resources          | W           | Crear recursos consumidos (via Edge Function)                                            |
| activity_observations       | W           | Crear observaciones de campo (via Edge Function)                                         |
| activity_templates          | R           | Referencia para metadata adicional (metadata JSONB con benchmarks)                       |
| activity_template_checklist | R           | Checklist del template (leído desde template_snapshot preferentemente)                   |
| activity_template_resources | R           | Recursos del template (leído desde template_snapshot preferentemente)                    |
| activity_types              | R           | Nombre del tipo de actividad                                                             |
| batches                     | R           | Datos del batch: plant_count, area_m2, zona, fase actual, cultivar                      |
| production_phases           | R           | Fase actual del batch                                                                    |
| zones                       | R           | Zona de ejecución                                                                        |
| products                    | R           | Productos de los recursos (nombre, SKU, unidad default)                                  |
| inventory_items             | R           | Lotes disponibles para seleccionar por cada recurso (stock > 0, misma zona o facility)   |
| inventory_transactions      | W           | Generadas automáticamente al ejecutar (type='consumption' o 'application') via Edge Fun  |
| units_of_measure            | R           | Unidades de los recursos                                                                 |
| phytosanitary_agents        | R           | Catálogo de agentes para observaciones tipo pest/disease/deficiency                      |
| attachments                 | W           | Fotos adjuntas (via Supabase Storage + registro en attachments)                          |
| users                       | R           | Usuario actual (performed_by)                                                            |

## ENUMs utilizados

| ENUM                      | Valores                                                                  | Tabla.campo                          |
| ------------------------- | ------------------------------------------------------------------------ | ------------------------------------ |
| scheduled_activity_status | pending \| completed \| skipped \| overdue                               | scheduled_activities.status          |
| activity_status           | in_progress \| completed \| cancelled                                    | activities.status                    |
| observation_type          | pest \| disease \| deficiency \| environmental \| general \| measurement | activity_observations.type           |
| observation_severity      | info \| low \| medium \| high \| critical                                | activity_observations.severity       |
| plant_part                | root \| stem \| leaf \| flower \| fruit \| whole_plant                   | activity_observations.plant_part     |
| incidence_unit            | count \| percentage                                                      | activity_observations.incidence_unit |
| quantity_basis             | fixed \| per_plant \| per_m2 \| per_zone \| per_L_solution              | activity_template_resources.quantity_basis |
| transaction_type          | consumption \| application                                               | inventory_transactions.type (los generados aquí) |

## Layout y componentes principales

Página dentro del layout de dashboard con sidebar. Formulario multi-sección vertical.

- **Header de página** — Breadcrumb (Actividades > Calendario > Ejecutar)
  - Título: "{template_name}" (ej: "Fertirrigación Vegetativa Sem 1-2")
  - Subtítulo: Batch {code} · {cultivar} · Fase {phase_name} · Zona {zone_name}
  - Badges: día del cultivo (ej: "Día 35"), fecha planificada, duración estimada
  - Si status != 'pending' y != 'overdue' → banner: "Esta actividad ya fue {status}" + link al historial
- **Sección 1: Datos generales** — Card
  - Información read-only del batch y template
  - Input: Duración real (minutos, number, default=estimated_duration_min)
  - Input: Notas generales (textarea, opt)
  - Campos de medición dinámicos (basados en activity_type y template.metadata):
    - Para Fertirrigación: pH del agua, EC de la solución, Volumen total (L), Código lisímetro
    - Para MIPE: Plantas observadas, Método de muestreo, Condiciones climáticas
    - Para Cosecha: se ejecuta via `/production/batches/[id]` (PRD 25) — no desde aquí
    - Los campos se generan desde template.metadata.measurement_fields (si existe) o se muestran campos genéricos
- **Sección 2: Recursos** — Card con tabla editable
  - Tabla de recursos escalados del template:
    - Columnas: Recurso (producto), Cantidad planificada (calculada), Cantidad real (editable, number), Unidad, Lote (select de inventory_items disponibles), Costo estimado (auto-calc)
    - Scaling automático al cargar:
      - `per_plant`: quantity × batch.plant_count
      - `per_m2`: quantity × batch.area_m2 (o zone.effective_growing_area_m2)
      - `per_zone`: quantity × 1
      - `per_L_solution`: quantity × volumen total calculado de agua + concentrados
      - `fixed`: quantity × 1
    - `quantity_actual` default = cantidad planificada escalada
    - Select de lote: filtra `inventory_items` donde product_id=recurso.product_id, lot_status='available', quantity_available > 0, zona del batch o misma facility
    - Mostrar stock disponible del lote seleccionado
    - Si recurso es_optional=true → checkbox para incluir/excluir
    - Botón "Agregar recurso" → permite agregar recurso no planificado (select producto + cantidad + lote)
  - **Alerta de stock**: si la cantidad planificada supera el stock disponible → warning amarillo inline
- **Sección 3: Checklist** — Card con lista de verificación
  - Items del checklist (desde template_snapshot.checklist):
    - Cada item: checkbox + instrucción + valor esperado (si aplica) + tolerancia (si aplica)
    - Items con is_critical=true: marcados con badge "Crítico" rojo
    - Items con requires_photo=true: botón para adjuntar foto junto al checkbox
  - Progreso: "{n} de {total} completados" con barra visual
  - Los items críticos deben estar todos checked antes de poder completar la actividad
- **Sección 4: Observaciones** — Card (colapsable, expandida por default para MIPE)
  - Lista de observaciones registradas durante la ejecución
  - Botón "Agregar observación" → formulario inline o modal:
    - Select: Tipo (pest, disease, deficiency, environmental, general, measurement) con labels en español
    - Select: Agente fitosanitario (si tipo=pest/disease/deficiency) — filtrado por crop_type del cultivar + is_active
    - Select: Parte de planta afectada (root, stem, leaf, flower, fruit, whole_plant) — opcional
    - Input: Valor de incidencia (number) + Select: Unidad (count, percentage)
    - Select: Severidad (info, low, medium, high, critical) con colores
    - Input: % área afectada (number, opt)
    - Input: Tamaño de muestra (number, opt — plantas muestreadas)
    - Input: Plantas afectadas (number, opt)
    - Textarea: Descripción detallada (req)
    - Textarea: Acción tomada (opt)
    - Botón: Adjuntar fotos (múltiples)
  - Cada observación agregada aparece como card colapsable con resumen
  - Se pueden agregar múltiples observaciones
- **Sección 5: Fotos** — Card (opcional, visible si hay fotos adjuntas o si checklist tiene requires_photo)
  - Grid de fotos subidas durante la ejecución
  - Botón "Agregar foto" → captura cámara (móvil) o file picker
  - Preview de cada foto con botón eliminar
  - Las fotos se comprimen client-side antes de subir (max 1920px, JPEG 80%)
- **Footer fijo** — Barra de acciones sticky en la parte inferior
  - Botón "Completar actividad" (variant="primary") — habilitado solo si:
    - Todos los items críticos del checklist están checked
    - Todos los recursos obligatorios tienen quantity_actual > 0 y lote seleccionado
    - Al menos un campo de duración tiene valor
  - Botón "Guardar borrador" (variant="outline") — guarda estado parcial en localStorage
  - Botón "Cancelar" (variant="ghost") → confirmar si hay cambios no guardados → volver al calendario

**Responsive**: Secciones en una columna. Tabla de recursos con scroll horizontal en móvil. Footer sticky visible siempre. Fotos en grid 2 columnas en móvil.

## Requisitos funcionales

### Carga de datos

- **RF-01**: Al cargar, obtener la scheduled_activity con su template_snapshot:
  ```
  supabase.from('scheduled_activities')
    .select(`
      *,
      template:activity_templates(id, name, code, frequency, estimated_duration_min, metadata,
        triggers_phase_change_id, triggers_transformation,
        activity_type:activity_types(id, name)
      ),
      batch:batches(id, code, status, plant_count, area_m2,
        cultivar:cultivars(id, name, code, crop_type:crop_types(id, name)),
        phase:production_phases!current_phase_id(id, name, sort_order),
        zone:zones(id, name, effective_growing_area_m2, facility:facilities(id, name)),
        product:products!current_product_id(id, name, sku)
      ),
      phase:production_phases(id, name)
    `)
    .eq('id', scheduledActivityId)
    .single()
  ```
- **RF-02**: Si status != 'pending' y != 'overdue', mostrar banner informativo y deshabilitar formulario
- **RF-03**: Cargar inventory_items disponibles para selección de lotes:
  ```
  supabase.from('inventory_items')
    .select('id, batch_number, quantity_available, cost_per_unit, expiration_date, product_id, zone_id, lot_status')
    .in('product_id', resourceProductIds)
    .eq('lot_status', 'available')
    .gt('quantity_available', 0)
  ```
- **RF-04**: Cargar catálogo de agentes fitosanitarios (para observaciones):
  ```
  supabase.from('phytosanitary_agents')
    .select('id, common_name, scientific_name, type, category')
    .eq('is_active', true)
  ```
- **RF-05**: Los recursos y checklist se leen preferentemente del `template_snapshot` (JSONB en scheduled_activities) para garantizar consistencia — si no existe snapshot, fallback a la tabla del template

### Scaling de recursos

- **RF-06**: Al cargar, calcular quantity_planned para cada recurso:
  - `per_plant`: template_resource.quantity × batch.plant_count
  - `per_m2`: template_resource.quantity × (batch.area_m2 || zone.effective_growing_area_m2)
  - `per_zone`: template_resource.quantity × 1
  - `per_L_solution`: template_resource.quantity × total_volume_liters (calculado de otros recursos tipo agua)
  - `fixed`: template_resource.quantity × 1
- **RF-07**: quantity_actual default = quantity_planned (editable por el usuario)
- **RF-08**: El costo estimado se calcula: quantity_actual × inventory_item.cost_per_unit (del lote seleccionado)

### Ejecución

- **RF-09**: Al hacer click en "Completar actividad", invocar Edge Function `execute-activity`:
  ```
  POST /functions/v1/execute-activity
  {
    scheduled_activity_id: UUID,
    activity_type_id: UUID,
    zone_id: UUID,
    batch_id: UUID,
    phase_id: UUID,
    performed_by: UUID,
    duration_minutes: number,
    measurement_data: {
      water_ph?: number,
      solution_ec?: number,
      total_volume_l?: number,
      ...dynamic fields
    },
    notes?: string,
    checklist_results: [
      { step_order: number, checked: boolean, value?: string, photo_url?: string }
    ],
    activity_resources: [
      {
        product_id: UUID,
        inventory_item_id: UUID,
        quantity_planned: number,
        quantity_actual: number,
        unit_id: UUID
      }
    ],
    activity_observations?: [
      {
        type: string,
        agent_id?: UUID,
        plant_part?: string,
        incidence_value?: number,
        incidence_unit?: string,
        severity?: string,
        severity_pct?: number,
        sample_size?: number,
        affected_plants?: number,
        description: string,
        action_taken?: string,
        photo_urls?: string[]
      }
    ]
  }
  ```
- **RF-10**: La Edge Function ejecuta transaccionalmente:
  1. Validar JWT + verificar acceso al batch via RLS
  2. Verificar scheduled_activity.status='pending' o 'overdue' (lock para concurrencia)
  3. Crear registro `activities` con status='completed'
  4. Por cada recurso: crear `activity_resources` + generar `inventory_transaction` type='consumption' (o 'application' si el tipo de actividad lo indica)
  5. Por cada observación: crear `activity_observations`
  6. Almacenar checklist_results en activities.measurement_data (o campo dedicado)
  7. Actualizar `scheduled_activities`: status='completed', completed_activity_id=new_activity.id
  8. Si template.triggers_phase_change_id: invocar transición de fase del batch
  9. Calcular y actualizar costo en batch (via trigger trg_batch_cost_update)
  10. Retorna: `{ activity_id, transactions_created, phase_changed }`
- **RF-11**: Tras ejecución exitosa, toast "Actividad completada exitosamente" + si phase_changed: toast adicional "Batch avanzó a fase {nombre}" + navegar al calendario o al batch

### Fotos

- **RF-12**: Las fotos se suben a Supabase Storage: `activity-attachments/{company_id}/{batch_id}/{activity_id}/{uuid}.jpg`
- **RF-13**: Compresión client-side: max 1920px de lado mayor, JPEG calidad 80%, preservar EXIF (GPS, timestamp)
- **RF-14**: Upload via presigned URL (no proxy por Next.js)
- **RF-15**: Cada foto genera un registro en `attachments`: entity_type='activity' o 'observation', entity_id, file_url, file_name, mime_type

### Borrador

- **RF-16**: "Guardar borrador" almacena el estado completo del formulario en localStorage con key `draft-activity-{scheduledActivityId}`
- **RF-17**: Al cargar la página, si existe borrador, ofrecer "Continuar con borrador guardado" o "Empezar de nuevo"
- **RF-18**: El borrador se elimina automáticamente al completar la actividad exitosamente

## Requisitos no funcionales

- **RNF-01**: RLS Pattern 2 — la ejecución hereda aislamiento vía batch.zone_id → facilities.company_id
- **RNF-02**: La ejecución es **completamente transaccional** — si falla cualquier paso, todo se revierte
- **RNF-03**: Concurrencia: la Edge Function usa lock en scheduled_activity para prevenir doble ejecución
- **RNF-04**: Los inventory_items disponibles se filtran por zona del batch + misma facility (para permitir recursos en almacenes centrales)
- **RNF-05**: El formulario debe funcionar bien en dispositivos móviles de gama media (operarios usan tablets/phones)
- **RNF-06**: Las fotos no bloquean la ejecución — se suben en paralelo y se vinculan después. Si la foto falla, la actividad se completa igualmente
- **RNF-07**: El template_snapshot previene que cambios futuros en el template afecten actividades ya programadas

## Flujos principales

### Happy path — Fertirrigación (Flujo 2 del data model)

1. Operario navega desde calendario a `/activities/execute/{id}` — FERT-VEG-S1 para LOT-001
2. Header: "Fertirrigación Vegetativa Sem 1-2" · LOT-001 · Gelato · Vegetativo · Sala Veg A · Día 35
3. **Datos generales**: Duración=30 min (default). Campos medición: pH agua=6.0, EC solución=1.8, Volumen total=210L
4. **Recursos**: tabla muestra 3 recursos escalados:
   - Agua: 5 L/planta × 42 plantas = 210L → lote AGUA-001 (stock: 9,999L) → cantidad real: 210L
   - Ca(NO₃)₂: 0.8 g/L × 210L = 168g → lote CANO3-LOT01 (stock: 5,000g) → cantidad real: 170g (ajustado)
   - KNO₃: 0.4 g/L × 210L = 84g → lote KNO3-LOT03 (stock: 2,000g) → cantidad real: 84g
5. **Checklist**: 4 items
   - [x] Verificar pH del agua antes de agregar nutrientes (valor esperado: 6.0-6.5)
   - [x] Verificar EC de la solución final (valor esperado: 1.5-2.0, tolerancia: ±0.3)
   - [x] **Crítico**: Verificar drenaje > 15% ✓
   - [x] Registrar código del lisímetro
6. **Observaciones**: ninguna en este caso
7. Click "Completar actividad" → Edge Function ejecuta → toast "Actividad completada"
8. Navega al calendario: actividad aparece como completed (verde)

### Ejecución MIPE con observaciones

1. Operario ejecuta MONITOR-MIPE para LOT-002
2. **Datos generales**: Duración=60 min. Plantas observadas=42, Método=sistemático
3. **Recursos**: ninguno (MIPE es observación pura)
4. **Checklist**: [x] Revisar envés de hojas, [x] Revisar tallos, [x] Revisar sustrato
5. **Observaciones**: click "Agregar observación"
   - Tipo: Plaga → Agente: Tetranychus urticae (ácaro rojo) → Parte: Hoja → Incidencia: 15 individuos (count) → Severidad: medium → Muestra: 10 plantas → Afectadas: 3 → Descripción: "Colonias pequeñas en envés de hojas bajas" → Acción: "Aplicar acaricida programado" → adjunta 2 fotos
6. Agrega segunda observación: Tipo: Deficiency → Parte: Hoja → Severidad: low → Descripción: "Ligera clorosis en hojas inferiores, posible N" → 1 foto
7. Click "Completar actividad" → Edge Function registra todo
8. Toast: "Actividad completada. 2 observaciones registradas"

### Stock insuficiente

1. Al cargar recursos, lote de Ca(NO₃)₂ tiene solo 100g pero se necesitan 168g
2. Warning amarillo: "Stock insuficiente en el lote seleccionado (disponible: 100g, necesario: 168g)"
3. Operario puede: seleccionar otro lote con más stock, o ajustar quantity_actual a 100g y agregar segundo recurso del mismo producto con otro lote

### Continuar borrador

1. Operario estaba llenando formulario, cierra la app
2. Al volver a `/activities/execute/{id}`, dialog: "Tienes un borrador guardado. ¿Continuar o empezar de nuevo?"
3. "Continuar" → formulario se restaura con todos los valores previos
4. Completa y ejecuta

### Actividad ya ejecutada

1. Navega a `/activities/execute/{id}` de una actividad ya completed
2. Banner amarillo: "Esta actividad ya fue completada el 24/02/2026 por Juan Pérez"
3. Formulario deshabilitado, datos de la ejecución visibles como read-only
4. Link: "Ver en historial" → `/activities/history`

## Estados y validaciones

### Estados de UI — Página

| Estado       | Descripción                                                                |
| ------------ | -------------------------------------------------------------------------- |
| loading      | Skeleton de secciones                                                      |
| loaded       | Formulario listo para llenar                                               |
| already-done | Actividad ya ejecutada — banner + formulario read-only                     |
| not-found    | Scheduled activity no encontrada — 404                                     |
| error        | Error al cargar — "Error al cargar la actividad. Intenta nuevamente"       |

### Estados de UI — Ejecución

| Estado     | Descripción                                                    |
| ---------- | -------------------------------------------------------------- |
| idle       | Formulario listo, botón habilitado si validaciones pasan       |
| submitting | "Completar actividad" loading, formulario disabled             |
| success    | Toast éxito, navegar al calendario                             |
| error      | Toast error, formulario permanece para reintentar              |

### Validaciones Zod — Ejecución

```
duration_minutes: z.number().int().positive('La duración debe ser mayor a 0').max(1440, 'Máximo 24 horas')
notes: z.string().max(5000).optional().or(z.literal(''))
measurement_data: z.record(z.unknown()).optional()
activity_resources: z.array(z.object({
  product_id: z.string().uuid(),
  inventory_item_id: z.string().uuid('Selecciona un lote'),
  quantity_actual: z.number().positive('La cantidad debe ser mayor a 0'),
  unit_id: z.string().uuid()
})).min(0)
```

Con refinamientos:
- Todos los items del checklist con is_critical=true deben estar checked
- Recursos obligatorios (is_optional=false) deben tener quantity_actual > 0 y inventory_item_id seleccionado

### Validaciones Zod — Observación

```
type: z.enum(['pest', 'disease', 'deficiency', 'environmental', 'general', 'measurement'])
agent_id: z.string().uuid().optional().nullable()
plant_part: z.enum(['root', 'stem', 'leaf', 'flower', 'fruit', 'whole_plant']).optional().nullable()
incidence_value: z.number().nonnegative().optional().nullable()
incidence_unit: z.enum(['count', 'percentage']).optional().nullable()
severity: z.enum(['info', 'low', 'medium', 'high', 'critical']).optional().nullable()
severity_pct: z.number().min(0).max(100).optional().nullable()
sample_size: z.number().int().positive().optional().nullable()
affected_plants: z.number().int().nonnegative().optional().nullable()
description: z.string().min(1, 'La descripción es requerida').max(5000)
action_taken: z.string().max(2000).optional().or(z.literal(''))
```

### Errores esperados

| Escenario                                      | Mensaje al usuario                                                   |
| ---------------------------------------------- | -------------------------------------------------------------------- |
| Actividad no encontrada                        | "Actividad no encontrada" (404)                                      |
| Actividad ya completada                        | "Esta actividad ya fue completada" (banner)                          |
| Items críticos no checados                     | "Completa todos los items críticos del checklist" (inline + toast)   |
| Recurso sin lote seleccionado                  | "Selecciona un lote para {producto}" (inline)                        |
| Cantidad = 0 en recurso obligatorio            | "La cantidad debe ser mayor a 0" (inline)                            |
| Stock insuficiente                             | "Stock insuficiente en el lote seleccionado" (warning, no blocking)  |
| Doble ejecución (concurrencia)                 | "Esta actividad está siendo ejecutada por otro usuario" (toast)      |
| Error en Edge Function                         | "Error al ejecutar la actividad. Intenta nuevamente" (toast)         |
| Error subiendo foto                            | "Error al subir la foto. La actividad se completó sin esta foto"     |
| Error de red                                   | "Error de conexión. Intenta nuevamente" (toast)                      |
| Permiso denegado                               | "No tienes permisos para ejecutar actividades" (toast)               |

## Dependencias

- **Páginas relacionadas**:
  - `/activities/schedule` — calendario donde se inicia la ejecución (PRD 26)
  - `/activities/history` — donde se ve la ejecución completada (PRD 28)
  - `/production/batches/[id]` — detalle del batch, tab actividades (PRD 25)
  - `/settings/activity-templates` — templates que definen la actividad (PRD 12)
- **Edge Function**: `execute-activity` — orquesta la ejecución atómica completa
- **Funciones SQL**: `execute_activity_internal()` — lógica transaccional dentro del Edge Function
- **Triggers**: `trg_update_inventory_balance` — actualiza stock al generar inventory_transactions; `trg_batch_cost_update` — actualiza costo total del batch
- **Supabase Storage**: Bucket `activity-attachments/{company_id}/{batch_id}/{activity_id}/` para fotos
- **Supabase client**: PostgREST para lecturas + Edge Function para ejecución
- **React Query**: Cache keys `['scheduled-activities']` (invalidar post-ejecución), `['batches', batchId]` (invalidar si cambia fase), `['inventory-items']` (invalidar por transacciones)
- **localStorage**: Borradores de ejecución con key `draft-activity-{scheduledActivityId}`
