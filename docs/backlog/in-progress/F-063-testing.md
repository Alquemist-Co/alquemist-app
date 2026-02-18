# F-063: Testing

## Overview

Suite de tests que cubre logica de negocio critica con unit tests (Vitest), flujos completos con E2E (Playwright), y consistencia visual con visual regression. Los unit tests cubren: yield calculator, cost allocation, validacion Zod y sync queue logic. El test E2E principal verifica el flujo crear orden -> aprobar -> ejecutar actividad -> ver inventario. Los visual regression tests aseguran que los componentes del design system no cambien inadvertidamente.

## User Personas

- **Admin**: Se beneficia indirectamente de la calidad del codigo. Los tests automaticos aseguran que releases no introduzcan regresiones en funcionalidad critica.
- **Gerente**: Se beneficia de que los calculos de yield y costos sean precisos y verificados automaticamente.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-063-001 | Configuracion de Vitest y estructura de tests | S | P0 | Planned |
| US-063-002 | Unit tests para yield calculator | M | P0 | Planned |
| US-063-003 | Unit tests para cost allocation | M | P0 | Planned |
| US-063-004 | Unit tests para validacion Zod schemas | M | P0 | Planned |
| US-063-005 | Unit tests para sync queue logic | M | P1 | Planned |
| US-063-006 | E2E: flujo completo orden a inventario | L | P0 | Planned |
| US-063-007 | Visual regression para design system | M | P2 | Planned |
| US-063-008 | Configuracion CI/CD con tests automaticos | S | P0 | Planned |

---

# US-063-001: Configuracion de Vitest y estructura de tests

## User Story

**As a** admin,
**I want** que el proyecto tenga Vitest configurado con estructura de carpetas para tests unitarios, de integracion y E2E,
**So that** cualquier desarrollador pueda escribir y ejecutar tests de manera consistente.

## Acceptance Criteria

### Scenario 1: Vitest ejecuta tests
- **Given** Vitest esta configurado en el proyecto
- **When** se ejecuta `npm test`
- **Then** Vitest encuentra y ejecuta todos los tests en `**/*.test.ts` y `**/*.test.tsx` y muestra resultados con coverage

### Scenario 2: Playwright ejecuta E2E
- **Given** Playwright esta configurado
- **When** se ejecuta `npx playwright test`
- **Then** los tests E2E se ejecutan en chromium y muestran resultados

### Scenario 3: Coverage report
- **Given** los tests se ejecutaron
- **When** se genera el coverage report
- **Then** se muestra cobertura por archivo con minimo 0% threshold (se incrementara con cada feature de testing)

## Definition of Done
- [ ] Vitest configurado y ejecutando
- [ ] Playwright configurado y ejecutando
- [ ] Script `npm test` funcional
- [ ] Script `npm run test:e2e` funcional
- [ ] Estructura de carpetas documentada

## Technical Notes
- `vitest.config.ts` con path aliases `@/*` y setup para testing-library
- `playwright.config.ts` con baseURL apuntando a `localhost:3000`
- Estructura:
  ```
  src/lib/utils/__tests__/yield-calculator.test.ts
  src/lib/utils/__tests__/cost-allocator.test.ts
  src/lib/validations/__tests__/batch.schema.test.ts
  src/lib/offline/__tests__/sync-queue.test.ts
  tests/e2e/order-to-inventory.spec.ts
  tests/visual/design-system.spec.ts
  ```

## UI/UX Notes
- N/A (tarea tecnica de configuracion)

## Dependencies
- Requiere `vitest` y `@playwright/test` como devDependencies

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-063-002: Unit tests para yield calculator

## User Story

**As a** gerente,
**I want** que el calculo de yield en cascada tenga cobertura de tests completa,
**So that** pueda confiar en que los rendimientos esperados de mis ordenes son correctos.

## Acceptance Criteria

### Scenario 1: Calculo cascada normal
- **Given** un cultivar con 4 fases y yields de 90%, 95%, 98% y 25%
- **When** se calcula el yield cascada con 50 semillas
- **Then** retorna: fase 1: 45, fase 2: 42.75, fase 3: 41.895, fase 4: 10.47kg con precision de 2 decimales

### Scenario 2: Fase con yield 100% (sin perdida)
- **Given** un cultivar sin phase_product_flows para una fase
- **When** se calcula con yield default 100%
- **Then** la cantidad de salida es igual a la de entrada para esa fase

### Scenario 3: Yield 0% (todo waste)
- **Given** una fase con expected_yield_pct = 0
- **When** se calcula
- **Then** retorna 0 para esa fase y todas las subsiguientes, sin errores

### Scenario 4: Fases skippeadas
- **Given** una orden con 5 fases donde la fase 3 tiene can_skip=true y esta excluida
- **When** se calcula el yield cascada
- **Then** el yield de fase 3 no se aplica y la cadena salta de fase 2 a fase 4 correctamente

### Scenario 5: Input negativo
- **Given** se llama al calculator con initialQuantity = -5
- **When** se ejecuta
- **Then** lanza error de validacion "La cantidad inicial debe ser positiva"

## Definition of Done
- [ ] Todos los tests pasando
- [ ] Coverage > 95% para yield-calculator.ts
- [ ] Edge cases cubiertos

## Technical Notes
- Archivo: `src/lib/utils/__tests__/yield-calculator.test.ts`
- Funcion bajo test: `calculateYieldCascade(cultivarId, entryPhaseId, exitPhaseId, initialQty)`
- Mock de datos: crear fixtures con `phase_product_flows` para tests
- Ref: `docs/alquemist-features.md` seccion "ORD-01" para logica de calculo

## UI/UX Notes
- N/A (test unitario)

## Dependencies
- Requiere funcion `calculateYieldCascade` implementada (Fase 1)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-063-003: Unit tests para cost allocation

## User Story

**As a** gerente,
**I want** que el calculo de COGS y asignacion de overhead tenga tests completos,
**So that** los costos reportados por batch sean confiables y auditables.

## Acceptance Criteria

### Scenario 1: COGS con materiales directos
- **Given** un batch con 3 inventory_transactions de tipo 'consumption' con cost_total 100, 200 y 300
- **When** se calcula el COGS
- **Then** direct_materials = 600

### Scenario 2: COGS con labor
- **Given** un batch con 5 actividades de 60min cada una y hourly_rate = $10
- **When** se calcula el COGS
- **Then** labor = $50

### Scenario 3: Overhead allocation por area_m2
- **Given** un overhead de $1000 con allocation_basis='per_m2', y 3 batches en zonas de 10m2, 20m2 y 20m2
- **When** se asigna el overhead
- **Then** batch 1 recibe $200, batch 2 recibe $400 y batch 3 recibe $400

### Scenario 4: Batch sin actividades ni transacciones
- **Given** un batch recien creado sin actividades
- **When** se calcula el COGS
- **Then** direct_materials = 0, labor = 0, overhead = su proporcion, per_plant y per_gram = null

### Scenario 5: Per_gram sin output en gramos
- **Given** un batch con costos pero sin transformacion que genere peso en gramos
- **When** se calcula per_gram
- **Then** retorna null (no 0, no error)

## Definition of Done
- [ ] Todos los tests pasando
- [ ] Coverage > 95% para cost-allocator.ts
- [ ] Edge cases cubiertos

## Technical Notes
- Archivo: `src/lib/utils/__tests__/cost-allocator.test.ts`
- Funciones bajo test: `calculateBatchCOGS(batchId)`, `allocateOverhead(overheadCostId)`
- Mock de inventory_transactions, activities y overhead_costs
- Ref: `docs/alquemist-features.md` seccion "OPS-02" para logica de costos

## UI/UX Notes
- N/A (test unitario)

## Dependencies
- Requiere funciones de costeo implementadas (Fase 3)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-063-004: Unit tests para validacion Zod schemas

## User Story

**As a** admin,
**I want** que todos los Zod schemas de validacion tengan tests que verifiquen aceptacion de datos validos y rechazo de datos invalidos,
**So that** la validacion sea robusta y no se rompan las reglas de negocio por cambios de codigo.

## Acceptance Criteria

### Scenario 1: Schema de batch valido
- **Given** un objeto con todos los campos requeridos de `createBatchSchema` con valores validos
- **When** se parsea con el schema
- **Then** el parse es exitoso y retorna el objeto tipado

### Scenario 2: Schema de batch con campos faltantes
- **Given** un objeto sin `production_order_id` (requerido)
- **When** se parsea con `createBatchSchema`
- **Then** lanza `ZodError` con mensaje que indica el campo faltante

### Scenario 3: Schema con refinement
- **Given** un objeto de `splitBatchSchema` con split_count = 0
- **When** se parsea
- **Then** lanza error del refinement "Debe separar al menos 1 planta"

### Scenario 4: Todos los schemas principales cubiertos
- **Given** los schemas: createBatchSchema, splitBatchSchema, createOrderSchema, executeActivitySchema, receiveItemSchema, createTestSchema, recordResultsSchema
- **When** se ejecutan los tests
- **Then** cada schema tiene al menos 1 test de caso valido, 1 de campo faltante y 1 de valor invalido

## Definition of Done
- [ ] Todos los tests pasando
- [ ] Todos los schemas principales cubiertos
- [ ] Tests para refinements y transforms

## Technical Notes
- Archivos en `src/lib/validations/__tests__/`
- Un archivo de test por schema: `batch.schema.test.ts`, `order.schema.test.ts`, etc.
- Usar `safeParse` para verificar errores sin throws
- Ref: `docs/alquemist-features.md` seccion "Zod Validation Schemas"

## UI/UX Notes
- N/A (test unitario)

## Dependencies
- Requiere Zod schemas implementados (Fases 1-3)

## Estimation
- **Size**: M
- **Complexity**: Low

---

# US-063-005: Unit tests para sync queue logic

## User Story

**As a** operador,
**I want** que la logica de sincronizacion offline tenga tests que garanticen el procesamiento FIFO, el manejo de errores y el retry,
**So that** mis datos capturados sin conexion se sincronicen correctamente al reconectar.

## Acceptance Criteria

### Scenario 1: Procesamiento FIFO
- **Given** la cola tiene 3 items con timestamps 10:00, 10:05 y 10:10
- **When** se procesa la cola
- **Then** los items se procesan en orden: 10:00 primero, 10:10 ultimo

### Scenario 2: Retry en error
- **Given** un item falla al sincronizar (error de red)
- **When** el procesamiento detecta el fallo
- **Then** incrementa retryCount a 1, marca status='failed' temporalmente y lo reintenta en el proximo ciclo

### Scenario 3: Max retries alcanzado
- **Given** un item ha fallado 3 veces (retryCount >= 3)
- **When** se procesa
- **Then** mantiene status='failed' permanentemente y no se reintenta automaticamente

### Scenario 4: Conflicto 409
- **Given** el server responde con 409 (conflicto)
- **When** el sync queue procesa la respuesta
- **Then** marca el item como status='conflict' y registra el errorMessage del server

### Scenario 5: Cleanup de items sincronizados
- **Given** hay items con status='synced' de hace 8 dias
- **When** se ejecuta la limpieza
- **Then** se eliminan los items con status='synced' de mas de 7 dias, se mantienen los 'failed' y 'conflict'

## Definition of Done
- [ ] Todos los tests pasando
- [ ] Coverage > 90% para sync-queue.ts
- [ ] Edge cases de concurrencia cubiertos

## Technical Notes
- Archivo: `src/lib/offline/__tests__/sync-queue.test.ts`
- Mock de Dexie con fake IndexedDB o `fake-indexeddb` package
- Mock de Server Actions para simular respuestas exitosas, errores y conflictos
- Ref: `docs/alquemist-features.md` seccion "Sync Queue"

## UI/UX Notes
- N/A (test unitario)

## Dependencies
- Requiere sync queue implementada (Fase 3)

## Estimation
- **Size**: M
- **Complexity**: High

---

# US-063-006: E2E: flujo completo orden a inventario

## User Story

**As a** gerente,
**I want** que un test E2E verifique el flujo completo desde crear una orden hasta ver el inventario actualizado,
**So that** tenga confianza de que el flujo critico del sistema funciona end-to-end sin regresiones.

## Acceptance Criteria

### Scenario 1: Flujo completo exitoso
- **Given** un usuario gerente autenticado con datos de seed
- **When** el test ejecuta: crear orden -> aprobar -> verificar batch creado -> ejecutar actividad como operador -> verificar inventario actualizado
- **Then** cada paso valida la UI esperada y el flujo completo pasa sin errores

### Scenario 2: Validacion de yield cascade
- **Given** el gerente crea una orden con cultivar y fases conocidas
- **When** el wizard muestra el yield en cascada
- **Then** los valores de yield coinciden con los esperados segun los phase_product_flows del seed

### Scenario 3: Batch refleja fase correcta
- **Given** la orden fue aprobada y el batch fue creado
- **When** el test navega al detalle del batch
- **Then** el batch muestra la entry_phase como fase actual y status 'active'

### Scenario 4: Inventario actualizado tras actividad
- **Given** el operador completo una actividad con recursos consumidos
- **When** el test navega a la pantalla de stock
- **Then** el stock del recurso consumido se redujo en la cantidad reportada

## Definition of Done
- [ ] Test E2E pasando en CI
- [ ] Cubre el flujo critico completo
- [ ] Reproducible con datos de seed

## Technical Notes
- Archivo: `tests/e2e/order-to-inventory.spec.ts`
- Usar Playwright con auth state persistido (login una vez, reusar cookies)
- Seed data: script SQL que crea crop_type, cultivar, phases, products y zones conocidos
- Multiples roles en el test: login como gerente (crear/aprobar orden), login como operador (ejecutar actividad)
- Pantallas involucradas: `order-create`, `order-detail`, `batch-detail`, `act-execute`, `inv-stock`
- Timeout generoso: 60s por test para ambiente CI

## UI/UX Notes
- El test verifica textos visibles en pantalla, no IDs internos
- Usar `data-testid` para selectores estables cuando los textos puedan cambiar

## Dependencies
- Requiere todas las fases anteriores (0-3) funcionales
- Requiere seed data script

## Estimation
- **Size**: L
- **Complexity**: High

---

# US-063-007: Visual regression para design system

## User Story

**As a** admin,
**I want** que los componentes del design system tengan tests de regression visual,
**So that** cambios de codigo no alteren inadvertidamente la apariencia de botones, cards, badges y otros componentes base.

## Acceptance Criteria

### Scenario 1: Snapshot de componentes base
- **Given** los componentes Button, Card, Input, Badge, StatCard y Toast estan implementados
- **When** se ejecutan los visual regression tests
- **Then** se generan screenshots de cada componente en sus variantes (primary, secondary, disabled, etc.) y se comparan con los snapshots base

### Scenario 2: Detectar cambio visual
- **Given** alguien modifica el border-radius del Button de 12px a 8px
- **When** se ejecutan los tests
- **Then** el test falla indicando una diferencia visual en el componente Button con diff visual highlighted

### Scenario 3: Actualizar snapshots intencionalmente
- **Given** se actualizo el design system intencionalmente
- **When** se ejecuta `npx playwright test --update-snapshots`
- **Then** los snapshots base se actualizan con las nuevas apariencias

## Definition of Done
- [ ] Snapshots generados para componentes principales
- [ ] Tests pasando con snapshots actuales
- [ ] Documentacion de como actualizar snapshots

## Technical Notes
- Archivo: `tests/visual/design-system.spec.ts`
- Usar `expect(page).toHaveScreenshot()` de Playwright
- Crear pagina `/design-system` o storybook con todos los componentes renderizados
- Comparar con threshold de 0.1% de diferencia de pixels

## UI/UX Notes
- Componentes a cubrir: Button (primary, secondary, ghost, disabled), Card, Input (normal, focus, error), Badge (variants), StatCard, Toast (success, error)
- Capturar en viewport 360px (mobile) y 1280px (desktop)

## Dependencies
- Requiere componentes UI del design system (Fase 0)
- Requiere pagina de showcase de componentes

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-063-008: Configuracion CI/CD con tests automaticos

## User Story

**As a** admin,
**I want** que los tests se ejecuten automaticamente en cada pull request,
**So that** ninguna regresion llegue a produccion sin ser detectada.

## Acceptance Criteria

### Scenario 1: Tests en PR
- **Given** un desarrollador crea un pull request
- **When** GitHub Actions se ejecuta
- **Then** se ejecutan: lint, build, unit tests (Vitest) y E2E (Playwright), y el PR no se puede mergear si alguno falla

### Scenario 2: Tests pasan en PR limpio
- **Given** un PR con cambios validos que no rompen nada
- **When** el CI se ejecuta
- **Then** todos los checks pasan en < 10 minutos y el PR muestra badge verde

### Scenario 3: Test falla y bloquea merge
- **Given** un PR introduce un bug que rompe un test unitario
- **When** el CI se ejecuta
- **Then** el check falla, muestra el test que fallo con error detallado, y el merge a main esta bloqueado

## Definition of Done
- [ ] GitHub Actions workflow creado
- [ ] Lint, build y tests ejecutandose en CI
- [ ] Branch protection configurada para requerir checks
- [ ] Tiempo de CI < 10 minutos

## Technical Notes
- Archivo: `.github/workflows/ci.yml`
- Steps: checkout -> setup node -> install -> lint -> build -> test (vitest) -> test:e2e (playwright con containers)
- Playwright en CI necesita `npx playwright install --with-deps`
- Cache de `node_modules` y `.next/cache` para acelerar builds

## UI/UX Notes
- N/A (tarea de infraestructura)

## Dependencies
- Requiere repositorio en GitHub
- Requiere tests implementados (US-063-001 a US-063-007)

## Estimation
- **Size**: S
- **Complexity**: Medium
