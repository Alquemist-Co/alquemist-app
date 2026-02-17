# Test Plan — Fase 1: Production Management (F-011 a F-022)

## Prerequisites

- `npm run db:reset` executed successfully
- `npm run dev` running at localhost:3000
- Seed data provides:
  - 2 crop types: Cannabis Medicinal, Arandano
  - 3 cultivars: Gelato #41 (GELATO-41), OG Kush (OG-KUSH), Duke (DUKE-BB)
  - 11 production phases: Cannabis 7 (germination through packaging), Blueberry 4 (dormancy through harvest)
  - 5 production orders: OP-2026-001 (approved), OP-2026-002 (draft), OP-2026-003 (in_progress), OP-2026-004 (completed), OP-2026-005 (cancelled)
  - 5 batches: LOT-GELATO-260301 (germination), LOT-GELATO-260201 (vegetative), LOT-GELATO-260101 (drying) + 2 split children (A, B)
  - 4 activity types: Fertirrigacion, Poda, Inspeccion, Cosecha
  - 4 activity templates: FERT-VEG-D, PODA-VEG-W, INSP-GEN-D, COS-FLOR-O
  - 20 scheduled activities for batch 002: 6 pending (today/future), 4 overdue, 6 completed, 4 skipped
  - 6 executed activities linked to the completed scheduled activities
  - Inventory items with stock across 3 zones

## Credentials

| Rol | Email | Password | Full Name |
|-----|-------|----------|-----------|
| admin | admin@agrotech.co | Admin123! | Carlos Admin |
| supervisor | supervisor@agrotech.co | Super123! | Maria Supervisor |
| operator | operator@agrotech.co | Oper123! | Juan Operador |
| manager | manager@agrotech.co | Mgr123! | Ana Gerente |
| viewer | viewer@agrotech.co | View123! | Luis Viewer |

## Permissions Reference

| Action | admin | manager | supervisor | operator | viewer |
|--------|-------|---------|------------|----------|--------|
| manage_crop_config | Yes | - | - | - | - |
| manage_templates | Yes | Yes | - | - | - |
| create_order | Yes | Yes | - | - | - |
| approve_order | Yes | Yes | - | - | - |
| advance_phase | Yes | Yes | Yes | - | - |
| execute_activity | - | - | Yes | Yes | - |
| Access /orders | Yes | Yes | Yes | - | Yes |
| Access /settings | Yes | Yes | Yes | - | - |

---

## F-011: Configuracion de Tipos de Cultivo y Fases

**Ruta**: `/settings/crop-types`
**Roles con escritura**: admin
**Roles con lectura**: manager (via settings access), supervisor (via settings access)

| ID | Descripcion | Prio | Rol | Precondiciones | Pasos | Resultado Esperado |
|----|-------------|------|-----|----------------|-------|-------------------|
| T-1F011-001 | Lista muestra los 2 crop types del seed | P0 | admin | Seed data cargado | 1. Login como admin 2. Navegar a /settings/crop-types | Se muestran 2 cards: "Cannabis Medicinal" (category: annual, 7 fases, 2 cultivares) y "Arandano" (category: perennial, 4 fases, 1 cultivar). Cada card muestra nombre, categoria como badge, conteo de fases y conteo de cultivares |
| T-1F011-002 | Crear nuevo crop type con codigo unico | P0 | admin | Estar en /settings/crop-types | 1. Click en "Nuevo tipo de cultivo" 2. Completar formulario: nombre="Fresa", code="strawberry", categoria="perennial" 3. Click en Guardar | Se crea el crop type, aparece en la lista con count fases=0 y cultivares=0, toast de confirmacion visible |
| T-1F011-003 | Validacion de codigo duplicado | P1 | admin | Crop type "cannabis" existe | 1. Click en "Nuevo tipo de cultivo" 2. Ingresar code="cannabis" 3. Intentar guardar | Error de validacion "Ya existe un tipo de cultivo con este codigo" mostrado inline. No se crea el registro |
| T-1F011-004 | Ver y crear fases para un crop type | P0 | admin | Cannabis tiene 7 fases | 1. Click en la card "Cannabis Medicinal" 2. Verificar lista de fases ordenadas | Se muestran 7 fases en orden: Germinacion(1), Propagacion(2), Vegetativo(3), Floracion(4), Cosecha(5), Secado(6), Empaque(7). Cada fase muestra codigo, toggles activos (destructiva, requiere zona, entry/exit point), duracion default |
| T-1F011-005 | Configurar phase product flows | P1 | admin | Estar en el editor de fases de Cannabis | 1. Expandir la fase "Cosecha" 2. Verificar seccion de flujos (inputs/outputs) 3. Agregar output: direction=output, product=Flor Humeda, role=primary, yield=100% | El flow aparece en la tabla de outputs con badge "primary" en verde y campo yield visible |
| T-1F011-006 | Validacion visual de cadena input-output | P1 | admin | Fases con flows configurados | 1. Observar los indicadores de conexion entre fases consecutivas | Las conexiones entre fases muestran indicadores de color: verde (match), amarillo (fase sin input), gris (sin transformacion). Los indicadores incluyen iconos, no solo color |
| T-1F011-007 | No se puede eliminar crop type con cultivares | P1 | admin | Cannabis tiene 2 cultivares asociados | 1. Intentar desactivar el crop type "Cannabis Medicinal" | Se muestra warning indicando que hay cultivares y ordenes activas asociadas. Se requiere confirmacion explicita para desactivar |
| T-1F011-008 | Manager no puede escribir configuracion | P2 | manager | Login como manager | 1. Navegar a /settings/crop-types 2. Verificar si hay boton de creacion/edicion | Los botones de creacion y edicion no son visibles o estan deshabilitados. La pagina se muestra en modo lectura |

---

## F-012: Configuracion de Cultivares

**Ruta**: `/settings/cultivars`
**Roles con escritura**: admin
**Roles con lectura**: manager, supervisor (via settings access)

| ID | Descripcion | Prio | Rol | Precondiciones | Pasos | Resultado Esperado |
|----|-------------|------|-----|----------------|-------|-------------------|
| T-1F012-001 | Lista muestra los 3 cultivares del seed | P0 | admin | Seed data cargado | 1. Login como admin 2. Navegar a /settings/cultivars | Se muestran 3 cards: Gelato #41 (Cannabis, 127 dias, 500g/planta), OG Kush (Cannabis, 120 dias, 450g/planta), Duke (Arandano, 365 dias, 3000g/planta). Cada card muestra crop_type badge, breeder, ciclo, rendimiento |
| T-1F012-002 | Crear cultivar con phase_durations y optimal_conditions | P0 | admin | Al menos 1 crop type activo | 1. Click en "Nuevo cultivar" 2. Seleccionar crop_type="Cannabis Medicinal" 3. Completar nombre="Purple Punch", code="PURPLE-PUNCH" 4. Configurar duraciones por fase 5. Configurar condiciones optimas: temp 20-26, HR 40-60 6. Guardar | Cultivar creado, card visible en la lista con todos los campos. Total ciclo calculado correctamente. Condiciones formateadas como "Temp: 20-26 C, HR: 40-60%" |
| T-1F012-003 | Validacion de codigo duplicado | P1 | admin | Cultivar GELATO-41 existe | 1. Intentar crear cultivar con code="GELATO-41" | Error de validacion "Ya existe un cultivar con el codigo GELATO-41". No se crea el registro |
| T-1F012-004 | Filtrar cultivares por crop type | P1 | admin | Los 3 cultivares existen | 1. Seleccionar filtro crop_type="Cannabis Medicinal" | Solo se muestran Gelato #41 y OG Kush. Duke (Arandano) no aparece |
| T-1F012-005 | Phase durations muestra defaults y total de ciclo | P1 | admin | Editando cultivar Gelato #41 | 1. Abrir editor del cultivar Gelato #41 2. Verificar tabla de duraciones por fase | Tabla muestra 7 fases con duraciones: germinacion=7, propagacion=14, vegetativo=28, floracion=63, cosecha=1, secado=14, empaque=1. Total ciclo=128 dias calculado al pie |
| T-1F012-006 | Validacion de rango min > max en optimal_conditions | P2 | admin | Editando cultivar | 1. Ingresar temp_min=28 y temp_max=20 2. Intentar guardar | Error de validacion "El valor minimo debe ser menor al maximo". No se guarda el cambio |

---

## F-013: Crear Orden de Produccion - Wizard 5 Pasos

**Ruta**: `/orders/new`
**Roles con acceso de escritura**: admin, manager
**Roles sin acceso**: operator (no ve /orders), supervisor (no puede crear), viewer (solo lectura)

| ID | Descripcion | Prio | Rol | Precondiciones | Pasos | Resultado Esperado |
|----|-------------|------|-----|----------------|-------|-------------------|
| T-1F013-001 | Paso 1 - seleccionar cultivar de la lista | P0 | manager | Login como manager, cultivares activos | 1. Navegar a /orders/new 2. Verificar que se muestran los cultivares como cards 3. Click en "Gelato #41" | Card de Gelato #41 se resalta con borde y checkmark. Boton "Siguiente" se habilita. La card muestra nombre, crop type badge, ciclo 127 dias, rendimiento 500g/planta |
| T-1F013-002 | Paso 2 - seleccionar fases entry/exit con stepper | P0 | manager | Paso 1 completado con Gelato | 1. Click en "Siguiente" para ir al paso 2 2. Verificar stepper con 7 fases de Cannabis 3. Seleccionar entry=Germinacion, exit=Empaque | Stepper visual muestra 7 fases. Entry y exit seleccionables solo en fases marcadas con can_be_entry_point y can_be_exit_point. Boton "Siguiente" se habilita |
| T-1F013-003 | Paso 3 - cantidad y calculo de yield en cascada | P0 | manager | Pasos 1-2 completados | 1. Click en "Siguiente" para ir al paso 3 2. Ingresar initial_quantity=50, unidad=semillas | Se muestra cascade visual: "50 semillas -> [yield%] -> ... -> X producto final". Los numeros se muestran en DM Mono. Los porcentajes provienen de phase_product_flows |
| T-1F013-004 | Paso 4 - asignar zona y fechas auto-calculadas | P0 | manager | Pasos 1-3 completados | 1. Click en "Siguiente" para ir al paso 4 2. Seleccionar zona "Sala Propagacion" para Germinacion 3. Establecer fecha inicio=2026-04-01 | Fechas auto-calculadas: fin Germinacion=2026-04-08, inicio Propagacion=2026-04-08, etc. Cronograma completo visible con duraciones por fase del cultivar Gelato |
| T-1F013-005 | Paso 5 - review y guardar como draft | P0 | manager | Pasos 1-4 completados | 1. Click en "Siguiente" para ir al paso 5 2. Verificar que el resumen muestra todos los datos 3. Click en "Guardar como borrador" | Resumen muestra: cultivar Gelato, fases, yield cascade, zonas, fechas, prioridad. La orden se crea con status='draft', codigo auto-generado OP-2026-XXX. Toast "Orden creada como borrador". Redirect a lista de ordenes |
| T-1F013-006 | Wizard persiste estado en localStorage | P1 | manager | Wizard en progreso (paso 3) | 1. Completar hasta paso 3 2. Navegar a otra pagina 3. Volver a /orders/new | Se ofrece dialog "Retomar orden en progreso?" con opcion de continuar o empezar de nuevo. Si continua, los datos de pasos 1-3 se restauran |
| T-1F013-007 | Navegacion back preserva datos | P1 | manager | Wizard en paso 4 | 1. Completar hasta paso 4 2. Click en paso 2 del stepper 3. Volver al paso 4 | Al volver al paso 4, las zonas y fechas previamente seleccionadas se mantienen intactas |
| T-1F013-008 | Yield cascade usa porcentajes de phase_product_flows | P1 | manager | Fases con product flows configurados | 1. Completar hasta paso 3 2. Ingresar cantidad=100 | El cascade aplica expected_yield_pct de los phase_product_flows configurados. Si no hay flows configurados, muestra warning "Yields no configurados - usando 100% por defecto" |
| T-1F013-009 | Warning de capacidad cuando zona esta llena | P1 | manager | Zona con batches activos | 1. En paso 4, seleccionar zona con capacidad menor a las plantas requeridas | Se muestra warning inline: "Capacidad insuficiente. Disponible: X, Requerido: Y" pero permite continuar |
| T-1F013-010 | Solo manager/admin ven boton de crear orden | P0 | supervisor | Login como supervisor | 1. Navegar a /orders 2. Verificar que no hay boton "Nueva orden" | El boton "Nueva orden" no es visible para supervisor. Solo se muestra la lista de ordenes en modo lectura |
| T-1F013-011 | Operator no puede acceder a /orders | P0 | operator | Login como operator | 1. Intentar navegar a /orders | Middleware redirige al dashboard. La ruta /orders no es accesible para operator |
| T-1F013-012 | Cancelar wizard limpia el estado | P2 | manager | Wizard en progreso | 1. Avanzar hasta paso 3 2. Click en "Cancelar" o navegar fuera sin guardar 3. Volver a /orders/new | El wizard inicia desde cero (paso 1) sin datos previos. El localStorage se limpia |

---

## F-014: Aprobar/Rechazar Orden y Crear Batch

**Ruta**: `/orders/[id]`
**Roles con permiso de aprobacion**: admin, manager

| ID | Descripcion | Prio | Rol | Precondiciones | Pasos | Resultado Esperado |
|----|-------------|------|-----|----------------|-------|-------------------|
| T-1F014-001 | Aprobar orden draft crea batch automaticamente | P0 | manager | OP-2026-002 en status='draft' | 1. Login como manager 2. Navegar a /orders y click en OP-2026-002 3. Click en "Aprobar" 4. Confirmar en modal | Orden pasa a status='in_progress'. Se crea batch con codigo auto-generado (formato LOT-*), cultivar=OG Kush, current_phase=Germinacion, zone=zona de primera fase. Toast "Orden aprobada. Batch XXX creado" con link al batch |
| T-1F014-002 | Rechazar orden requiere razon de texto | P0 | manager | OP-2026-002 en status='draft' (o nueva draft) | 1. Navegar al detalle de la orden draft 2. Click en "Rechazar" 3. Intentar confirmar sin razon | Boton "Confirmar rechazo" deshabilitado. Mensaje "La razon es obligatoria" visible. Campo de texto con validacion de minimo de caracteres |
| T-1F014-003 | Rechazar orden con razon cambia status a cancelled | P0 | manager | Orden en status='draft' | 1. Click en "Rechazar" 2. Escribir razon "Cultivar descontinuado" 3. Click "Confirmar rechazo" | Orden pasa a status='cancelled'. La razon queda guardada en notes. Toast "Orden rechazada". No se crea batch |
| T-1F014-004 | Solo manager/admin ven botones aprobar/rechazar | P0 | supervisor | Login como supervisor | 1. Navegar al detalle de OP-2026-002 (draft) | Los botones "Aprobar" y "Rechazar" NO son visibles. La pagina muestra la orden en modo lectura |
| T-1F014-005 | Aprobar crea production_order_phases | P1 | manager | Orden draft aprobada exitosamente | 1. Aprobar una orden draft 2. Verificar detalle de la orden | Se muestran production_order_phases con fechas planificadas para cada fase del rango entry-exit. La primera fase tiene status='in_progress' |
| T-1F014-006 | Batch code sigue formato de convencion | P1 | manager | Aprobar orden exitosamente | 1. Verificar el codigo del batch creado | El batch code sigue el patron LOT-{CULTIVAR}-{YYMMDD} o similar. Es unico en el sistema |
| T-1F014-007 | No se puede aprobar orden ya aprobada | P2 | manager | OP-2026-001 ya approved | 1. Navegar al detalle de OP-2026-001 2. Verificar que no hay boton "Aprobar" | El boton "Aprobar" no aparece para ordenes que no estan en status='draft'. Solo ordenes draft muestran las acciones |
| T-1F014-008 | No se puede rechazar orden que no esta en draft | P2 | manager | OP-2026-003 en status='in_progress' | 1. Navegar al detalle de OP-2026-003 2. Verificar que no hay boton "Rechazar" | Los botones de aprobacion/rechazo no aparecen. Solo se muestran para ordenes en status='draft' |

---

## F-015: Lista de Ordenes y Detalle

**Ruta**: `/orders` y `/orders/[id]`
**Roles con acceso**: admin, manager, supervisor, viewer (lectura)
**Sin acceso**: operator

| ID | Descripcion | Prio | Rol | Precondiciones | Pasos | Resultado Esperado |
|----|-------------|------|-----|----------------|-------|-------------------|
| T-1F015-001 | Lista muestra las 5 ordenes con status correcto | P0 | manager | Seed data cargado | 1. Login como manager 2. Navegar a /orders | Se muestran 5 ordenes con codigos OP-2026-001 a OP-2026-005 con sus estados respectivos: approved, draft, in_progress, completed, cancelled. Cada card muestra codigo (DM Mono), cultivar, fase actual, status badge, fechas |
| T-1F015-002 | Filtrar por status funciona | P0 | manager | 5 ordenes visibles | 1. Seleccionar filtro/chip "En progreso" | Solo se muestra OP-2026-003 (status=in_progress). Otras ordenes quedan ocultas. El chip/filtro queda activo |
| T-1F015-003 | Detalle de orden in_progress muestra progreso | P1 | manager | OP-2026-003 en in_progress | 1. Click en OP-2026-003 | Detalle muestra: header con codigo, cultivar Gelato, status badge "En progreso". Phase stepper con fases 1-2 completadas (verde), fase 3 (vegetativo) como actual (pulsing), fases 4+ en gris (futuras). Link al batch LOT-GELATO-260201 |
| T-1F015-004 | Detalle de orden completed muestra todas las fases hechas | P1 | manager | OP-2026-004 completada | 1. Click en OP-2026-004 | Todas las fases en el stepper estan en verde (completadas) con checkmark. Status badge "Completada". Datos de yield por fase visibles (input, output, yield_pct) |
| T-1F015-005 | Orden cancelled claramente marcada | P1 | manager | OP-2026-005 cancelled | 1. Click en OP-2026-005 | Status badge "Cancelada" en estilo muted/rojo. Notes muestran la razon de cancelacion "Cancelado por falta de semillas". No hay batch vinculado |
| T-1F015-006 | Orden draft muestra botones aprobar/rechazar para manager | P1 | manager | OP-2026-002 en draft | 1. Click en OP-2026-002 | Seccion "Batch vinculado" muestra "El batch se creara al aprobar la orden". Botones "Aprobar" y "Rechazar" visibles |
| T-1F015-007 | Busqueda por codigo funciona | P2 | manager | 5 ordenes visibles | 1. Escribir "003" en la barra de busqueda | Solo se muestra OP-2026-003. Las demas ordenes quedan ocultas |
| T-1F015-008 | Viewer puede ver ordenes pero no acciones | P2 | viewer | Login como viewer | 1. Navegar a /orders 2. Click en cualquier orden | La lista y el detalle son visibles. No hay botones de accion (crear, aprobar, rechazar). Solo lectura |

---

## F-016: Lista de Batches con Filtros

**Ruta**: `/batches`
**Roles con acceso**: todos (operator, supervisor, manager, admin, viewer)

| ID | Descripcion | Prio | Rol | Precondiciones | Pasos | Resultado Esperado |
|----|-------------|------|-----|----------------|-------|-------------------|
| T-1F016-001 | Lista muestra los 5 batches con indicadores de fase | P0 | supervisor | Seed data cargado | 1. Login como supervisor 2. Navegar a /batches | Se muestran 5 batches: LOT-GELATO-260301 (germination), LOT-GELATO-260201 (vegetative), LOT-GELATO-260101 (drying), LOT-GELATO-260101-A (drying), LOT-GELATO-260101-B (drying/completed). Cada card muestra codigo en DM Mono, cultivar, fase como badge coloreado, zona, plant_count |
| T-1F016-002 | Filtrar por status funciona | P0 | supervisor | 5 batches visibles | 1. Seleccionar filtro "Activos" | Solo se muestran batches con status='active'. Batch LOT-GELATO-260101-B (completed) queda oculto |
| T-1F016-003 | Filtrar por fase funciona | P1 | supervisor | Multiples batches | 1. Seleccionar filtro fase="Secado (drying)" | Solo se muestran los batches en fase drying: LOT-GELATO-260101, LOT-GELATO-260101-A, LOT-GELATO-260101-B |
| T-1F016-004 | Filtrar por cultivar funciona | P1 | supervisor | Batches de Gelato | 1. Seleccionar filtro cultivar="Gelato #41" | Solo se muestran batches de Gelato. Si existieran batches de otros cultivares, quedarian ocultos |
| T-1F016-005 | Health indicator basado en alertas | P1 | supervisor | Batches con/sin alertas | 1. Verificar indicadores de salud en las cards | Batches sin alertas muestran indicador verde. Batches con alertas warning muestran amarillo. Batches con alertas critical muestran rojo |
| T-1F016-006 | Toggle vista grid/lista funciona | P2 | supervisor | En desktop (>= 1024px) | 1. Click en toggle de vista grid 2. Click en toggle de vista lista | Vista grid muestra cards en grid de 2-3 columnas. Vista lista muestra cards en columna vertical. La preferencia se persiste en localStorage |

---

## F-017: Detalle de Batch con Tabs

**Ruta**: `/batches/[id]`
**Roles con acceso**: todos

| ID | Descripcion | Prio | Rol | Precondiciones | Pasos | Resultado Esperado |
|----|-------------|------|-----|----------------|-------|-------------------|
| T-1F017-001 | Header hero muestra datos de batch 002 | P0 | supervisor | Batch LOT-GELATO-260201 existe | 1. Login como supervisor 2. Navegar a /batches 3. Click en LOT-GELATO-260201 | Header muestra: codigo "LOT-GELATO-260201" en DM Mono Bold 24px, cultivar "Gelato #41", zona "Sala Vegetativo A", plant_count "40 plantas", status badge "Activo" en verde, fase "Vegetativo" como badge coloreado |
| T-1F017-002 | Phase stepper muestra fase actual highlighted | P0 | supervisor | Batch 002 en vegetativo | 1. Ver el phase stepper en batch-detail | Stepper muestra las fases del ciclo Cannabis. Germination y Propagation en verde (completadas) con checkmark. Vegetativo con animacion pulsing (actual). Floracion, Cosecha, Secado, Empaque en gris (futuras) |
| T-1F017-003 | Tab Timeline muestra eventos cronologicamente | P1 | supervisor | Batch 002 con actividades ejecutadas | 1. Click en tab "Timeline" | Se muestran eventos en orden cronologico descendente: actividades completadas de los ultimos dias, cambios de fase previos, creacion del batch. Cada evento muestra timestamp, tipo icono coloreado, descripcion, actor |
| T-1F017-004 | Tab Actividades muestra conteos pendientes/overdue/completadas | P1 | supervisor | Batch 002 tiene 20 scheduled activities | 1. Click en tab "Actividades" | Se muestra header con conteos: 6 pendientes, 4 overdue, 6 completadas (4 skipped no cuentan como completadas). Overdue aparecen primero con borde rojo y badge "Vencida". Pendientes ordenadas por fecha |
| T-1F017-005 | Tab Inventario muestra transacciones del batch | P1 | supervisor | Batch 002 tiene consumptions | 1. Click en tab "Inventario" | Se muestran las transacciones de inventario vinculadas al batch 002: consumos de CaNO3 (fertiriego dia 17, 18, 19 con -80g cada uno), consumo de sustrato. Tipo badge coloreado, cantidades negativas en rojo |
| T-1F017-006 | Tab Calidad muestra tests vinculados | P1 | supervisor | Seed data de quality tests | 1. Click en tab "Calidad" | Se muestran los quality tests asociados al batch (si existen en el seed para batch 002). Si no hay tests, se muestra empty state "Sin tests de calidad" |
| T-1F017-007 | Batch 003 muestra split children en genealogia | P1 | supervisor | LOT-GELATO-260101 con children A y B | 1. Navegar al detalle de LOT-GELATO-260101 | La seccion de genealogia muestra el batch padre y sus 2 children: LOT-GELATO-260101-A (15 plantas, activo) y LOT-GELATO-260101-B (10 plantas, completado). Conexiones visuales entre padre e hijos |
| T-1F017-008 | Quick action buttons visibles segun rol | P2 | operator | Login como operator | 1. Navegar al detalle de un batch activo | Operador NO ve boton "Avanzar fase" ni "Split batch" (requiere supervisor+). Si ve otros botones permitidos para su rol |
| T-1F017-009 | Tab Costos muestra overhead asignado | P2 | manager | Batch con costos registrados | 1. Login como manager 2. Navegar al detalle de batch 3. Click en tab "Costos" | Se muestra: costo total (SUM de transacciones), costo por planta, desglose por categoria de recurso. Si hay overhead asignado, se incluye en el desglose |
| T-1F017-010 | Click en fase del stepper filtra contenido de tabs | P2 | supervisor | Batch con multiples fases completadas | 1. Estar en tab Timeline 2. Click en fase "Germinacion" (completada) en el stepper | El contenido del tab se filtra mostrando solo eventos de la fase Germinacion. Segundo click quita el filtro |

---

## F-018: Avanzar Fase de Batch

**Ruta**: `/batches/[id]` (accion desde batch-detail)
**Roles con permiso**: admin, manager, supervisor

| ID | Descripcion | Prio | Rol | Precondiciones | Pasos | Resultado Esperado |
|----|-------------|------|-----|----------------|-------|-------------------|
| T-1F018-001 | Avanzar batch 001 de germination a propagation | P0 | supervisor | LOT-GELATO-260301 en germination | 1. Login como supervisor 2. Navegar a batch LOT-GELATO-260301 3. Click "Avanzar fase" 4. Confirmar | Batch pasa a current_phase=Propagacion. Stepper se actualiza: Germinacion en verde con check, Propagacion con pulsing. Toast "Batch avanzado a Propagacion". Timeline registra evento de cambio de fase |
| T-1F018-002 | Zona change dialog aparece para fases con requires_zone_change | P0 | supervisor | Batch en fase que requiere cambio de zona (ej: vegetativo a floracion) | 1. Preparar batch en vegetativo 2. Click "Avanzar fase" | Modal de confirmacion incluye selector de zona obligatorio (la fase Floracion tiene requires_zone_change=true). No se puede confirmar sin seleccionar zona destino. Zonas filtradas por purpose compatible |
| T-1F018-003 | Solo supervisor/manager/admin pueden avanzar fase | P0 | operator | Login como operator | 1. Navegar al detalle de un batch activo 2. Verificar presencia del boton "Avanzar fase" | El boton "Avanzar fase" NO es visible para el rol operator |
| T-1F018-004 | Warning de actividades pendientes al avanzar | P1 | supervisor | Batch con scheduled_activities pendientes en fase actual | 1. Avanzar batch que tiene actividades pendientes | Modal muestra warning: "X actividades pendientes no se ejecutaran al avanzar" con lista de actividades y fechas. Boton cambia texto a "Avanzar de todas formas" |
| T-1F018-005 | Actividades pendientes se marcan como skipped al avanzar | P1 | supervisor | Batch avanzado con actividades pendientes | 1. Confirmar avance con actividades pendientes 2. Verificar estado de las actividades antiguas | Las scheduled_activities que estaban en status='pending' o 'overdue' de la fase anterior pasan a status='skipped' |
| T-1F018-006 | Avance en exit_phase completa el batch | P1 | supervisor | Batch en la exit_phase de su orden | 1. Avanzar batch que esta en su exit_phase (ultima fase) | Batch pasa a status='completed'. Boton habia mostrado "Completar batch" en lugar de "Avanzar fase". Toast "Batch completado exitosamente". La production_order evalua si todos sus batches estan completados |
| T-1F018-007 | Validacion de capacidad de zona al cambiar | P2 | supervisor | Zona destino con capacidad insuficiente | 1. Iniciar avance de fase con cambio de zona 2. Seleccionar zona con plant_capacity < batch.plant_count | Error: "Capacidad insuficiente. Sala X tiene capacidad para Y plantas. El batch requiere Z." La confirmacion se bloquea |
| T-1F018-008 | generateScheduledActivities se ejecuta para nueva fase | P2 | supervisor | Batch con cultivation_schedule, avance a nueva fase | 1. Avanzar fase exitosamente 2. Verificar que se generaron scheduled_activities | Se crean scheduled_activities para la nueva fase basadas en el cultivation_schedule. Cada actividad tiene planned_date calculada, template_snapshot congelado, status='pending' |

---

## F-019: Templates de Actividad (CRUD)

**Ruta**: `/settings/activities` o `/activities/templates`
**Roles con escritura**: admin, manager
**Roles con lectura**: supervisor

| ID | Descripcion | Prio | Rol | Precondiciones | Pasos | Resultado Esperado |
|----|-------------|------|-----|----------------|-------|-------------------|
| T-1F019-001 | Lista muestra los 4 templates del seed | P0 | manager | Seed data cargado | 1. Login como manager 2. Navegar a la lista de templates | Se muestran 4 cards: FERT-VEG-D (Fertirrigacion, daily), PODA-VEG-W (Poda, weekly), INSP-GEN-D (Inspeccion, daily), COS-FLOR-O (Cosecha, once). Cada card muestra codigo en monospace, tipo badge coloreado, frecuencia, fases aplicables como badges |
| T-1F019-002 | Crear template con codigo, tipo y frecuencia | P0 | manager | Activity types configurados | 1. Click "Nuevo template" 2. Completar: code="RIEGO-GERM-D", tipo=Fertirrigacion, nombre="Riego Germinacion Diario", frecuencia=daily, duracion=15 min 3. Guardar | Template creado y visible en la lista. Toast de confirmacion. Card muestra codigo, tipo badge, frecuencia |
| T-1F019-003 | Editor de recursos con quantity_basis | P1 | manager | Template FERT-VEG-D abierto | 1. Abrir detalle/editor de FERT-VEG-D 2. Verificar tabla de recursos | Tabla muestra 2 recursos: CaNO3 (2g, per_plant, obligatorio), Gel Enraizador (5mL, per_plant, opcional). Cada recurso muestra preview de escalado (ej: "2g/planta. Para batch de 40 = 80g") |
| T-1F019-004 | Editor de checklist con items criticos | P1 | manager | Template FERT-VEG-D abierto | 1. Verificar seccion de checklist del template | Lista muestra 3 items en orden: 1. "Verificar pH de solucion (5.8-6.2)" (critico, badge rojo), 2. "Verificar EC de solucion (1.2-2.4)" (critico), 3. "Registrar volumen aplicado por planta" (no critico). Items criticos tienen badge "Critico" visible |
| T-1F019-005 | Fases aplicables multi-select | P1 | manager | Template FERT-VEG-D abierto | 1. Verificar seleccion de fases aplicables | FERT-VEG-D tiene 2 fases seleccionadas: Vegetativo y Floracion (visibles como badges). El multi-select permite agregar/remover fases |
| T-1F019-006 | Validacion de codigo unico | P2 | manager | Template FERT-VEG-D existe | 1. Intentar crear template con code="FERT-VEG-D" | Error de validacion "Ya existe un template con el codigo FERT-VEG-D". No se crea duplicado |

---

## F-020: Programar Actividades desde Schedule

**Contexto**: Las actividades se generan automaticamente via `generateScheduledActivities` al aprobar orden (F-014) o avanzar fase (F-018). No hay pantalla dedicada para esta accion.

| ID | Descripcion | Prio | Rol | Precondiciones | Pasos | Resultado Esperado |
|----|-------------|------|-----|----------------|-------|-------------------|
| T-1F020-001 | Scheduled activities existen para batch 002 | P0 | supervisor | Seed data cargado | 1. Login como supervisor 2. Navegar al detalle de batch LOT-GELATO-260201 3. Click en tab "Actividades" | Se muestran 20 scheduled activities distribuidas: 6 pending (today y futuras), 4 overdue, 6 completed, 4 skipped. Conteos visibles en header del tab |
| T-1F020-002 | Reprogramar actividad a nueva fecha | P1 | supervisor | Actividad pendiente existe | 1. Encontrar una actividad pendiente en tab Actividades o act-today 2. Click en "Reprogramar" 3. Seleccionar nueva fecha (manana) 4. Confirmar | La actividad se actualiza con nueva planned_date. Toast "Actividad reprogramada al {fecha}". La actividad aparece en la nueva fecha en act-today |
| T-1F020-003 | Cancelar (skip) actividad con razon | P1 | supervisor | Actividad pendiente existe | 1. Encontrar actividad pendiente 2. Click "Cancelar" / "Omitir" 3. Escribir razon "Batch movido, ya no aplica" 4. Confirmar | Actividad pasa a status='skipped'. Desaparece de la lista de pendientes. Toast "Actividad cancelada" |
| T-1F020-004 | Verificar conteos de status coinciden con seed | P1 | supervisor | Batch 002 abierto, tab Actividades | 1. Verificar conteos en filtros/header | Conteos: 6 pending + 4 overdue + 6 completed + 4 skipped = 20 total. Los filtros muestran "(6)" para pendientes, "(4)" para overdue, "(6)" para completadas |
| T-1F020-005 | US-020-004 Auto-assign operator -- DIFERIDA | P2 | - | - | - | SKIP: Esta story esta diferida. Las actividades se crean sin assigned_to. No se filtra por operador asignado |

---

## F-021: Lista de Actividades de Hoy

**Ruta**: `/activities` o `/activities/today`
**Roles con acceso**: todos (principal: operator)

| ID | Descripcion | Prio | Rol | Precondiciones | Pasos | Resultado Esperado |
|----|-------------|------|-----|----------------|-------|-------------------|
| T-1F021-001 | Pagina Today muestra actividades pendientes para la fecha actual | P0 | operator | Seed data cargado con actividades para CURRENT_DATE | 1. Login como operator 2. Navegar a la pantalla de actividades de hoy | Se muestran las actividades programadas para hoy: 2 pendientes (Fertirrigacion Vegetativo Diaria + Inspeccion General Diaria para batch 002). Header muestra fecha actual y conteo total |
| T-1F021-002 | Seccion overdue muestra 4 items vencidos al tope | P0 | operator | 4 actividades overdue en batch 002 | 1. Verificar seccion sticky de overdue en act-today | Seccion sticky en la parte superior muestra "4 actividades vencidas" con cards compactas: 2 fertiriego y 2 inspeccion de dias anteriores. Fondo warning (amarillo/naranja). La seccion permanece visible al hacer scroll |
| T-1F021-003 | Activity cards color-coded por tipo | P1 | operator | Actividades de diferentes tipos visibles | 1. Verificar las cards de actividades | Cards de Fertirrigacion tienen barra lateral de un color (ej: verde). Cards de Inspeccion tienen otro color (ej: cyan). Cada card muestra: titulo (tipo + batch code), zona, estado badge |
| T-1F021-004 | Filtro tabs pendientes/completadas/todas funciona | P1 | operator | Actividades pendientes y completadas | 1. Click en tab "Pendientes" -> verificar lista 2. Click en "Completadas" -> verificar lista 3. Click en "Todas" | Tab "Pendientes" muestra solo pending + overdue. Tab "Completadas" muestra solo completed con hora de completitud. Tab "Todas" muestra todo. Conteos actualizados en cada tab |
| T-1F021-005 | US-021-003 Swipe quick-complete -- DIFERIDA | P2 | - | - | - | SKIP: Esta story esta diferida. No existe funcionalidad de swipe para completar actividades rapidamente |

---

## F-022: Ejecutar Actividad Completa

**Ruta**: `/activities/execute/[id]`
**Roles con permiso**: operator, supervisor

| ID | Descripcion | Prio | Rol | Precondiciones | Pasos | Resultado Esperado |
|----|-------------|------|-----|----------------|-------|-------------------|
| T-1F022-001 | Paso 1 - Recursos muestran escalado correcto | P0 | operator | Actividad de Fertiriego para batch 002 (40 plantas) | 1. Login como operator 2. Navegar a act-today 3. Click en actividad "Fertirrigacion Vegetativo Diaria" pendiente | Paso 1 muestra tabla de recursos: CaNO3 Planificado=80g (2g/planta * 40), Real=80g (pre-llenado editable), Disponible=3500g (stock en zona). Gel Enraizador como recurso opcional |
| T-1F022-002 | Paso 2 - Checklist con items criticos bloquean completar | P0 | operator | Paso 1 completado | 1. Avanzar al paso 2 2. Verificar checklist items 3. Intentar avanzar sin completar items criticos | Se muestran items del checklist: "Verificar pH" (critico, badge rojo), "Verificar EC" (critico). Si items criticos no estan marcados, el paso 4 (Confirmar) muestra boton deshabilitado con "X items criticos pendientes" |
| T-1F022-003 | Paso 2 - Marcar todos los criticos habilita confirmacion | P0 | operator | Paso 2 visible | 1. Marcar los 2 items criticos (pH y EC) como completados 2. Item no critico puede quedar sin marcar 3. Avanzar al paso de confirmacion | Boton "Completar Actividad" se habilita. Items criticos muestran checkmark verde |
| T-1F022-004 | Confirmar crea activity record + inventory transaction | P0 | operator | Pasos 1-2 completados, items criticos marcados | 1. Avanzar al paso de confirmacion 2. Verificar resumen: recursos, checklist, duracion 3. Click "Completar Actividad" | Se crea: activity record (con duration_minutes del timer), activity_resources (cantidades reales), inventory_transactions type='consumption' para CaNO3 (-80g). scheduled_activity pasa a status='completed'. Toast "Actividad completada". Redirect a act-today |
| T-1F022-005 | Timer tracks duracion automaticamente | P1 | operator | Abrir pantalla act-execute | 1. Abrir la pantalla de ejecucion 2. Observar el timer en el header | Timer comienza en 00:00 y cuenta automaticamente. Visible en DM Mono. Al completar, duration_minutes se registra en la activity |
| T-1F022-006 | Cantidades de recursos son editables | P1 | operator | Paso 1 visible con recursos | 1. Cambiar cantidad real de CaNO3 de 80g a 70g 2. Completar la actividad | La cantidad real 70g se registra en activity_resources.quantity_actual. La transaccion de inventario resta 70g (no 80g planificados). El campo muestra indicador de diferencia vs planificado |
| T-1F022-007 | Completar marca scheduled_activity como completed | P1 | operator | Actividad completada exitosamente | 1. Volver a act-today despues de completar 2. Verificar la actividad | La actividad completada desaparece de la lista de pendientes. Aparece en tab "Completadas" con hora de completitud y duracion registrada |
| T-1F022-008 | US-022-003 Observations con fotos -- DIFERIDA | P2 | - | - | - | SKIP: Esta story esta diferida. El paso 3 (observaciones con fotos) no esta disponible en la version actual |
| T-1F022-009 | US-022-006 Ejecucion offline -- DIFERIDA | P2 | - | - | - | SKIP: Esta story esta diferida. La ejecucion offline completa no esta disponible en la version actual |

---

## Resumen de Test Cases

| Feature | P0 | P1 | P2 | Total |
|---------|----|----|-----|-------|
| F-011 Crop Types & Phases | 2 | 3 | 2 | 7 |
| F-012 Cultivar Config | 2 | 2 | 2 | 6 |
| F-013 Create Order Wizard | 6 | 3 | 2 | 11 |
| F-014 Approve/Reject | 4 | 2 | 2 | 8 |
| F-015 Order List & Detail | 2 | 4 | 2 | 8 |
| F-016 Batch List | 2 | 2 | 2 | 6 |
| F-017 Batch Detail | 2 | 5 | 3 | 10 |
| F-018 Phase Advance | 3 | 3 | 2 | 8 |
| F-019 Activity Templates | 2 | 3 | 1 | 6 |
| F-020 Schedule Activities | 1 | 3 | 1 | 5 |
| F-021 Today Activities | 2 | 2 | 1 | 5 |
| F-022 Execute Activity | 4 | 3 | 2 | 9 |
| **Total** | **32** | **35** | **22** | **89** |

## Notas para el QA Tester

### Orden recomendado de ejecucion

Ejecutar las features en este orden para minimizar dependencias de datos:

1. **F-011** y **F-012** -- Verificar configuracion base (read-only del seed)
2. **F-015** y **F-016** -- Verificar listas y navegacion (read-only del seed)
3. **F-017** -- Verificar detalle de batch (read-only del seed, excepto tabs)
4. **F-019** -- Verificar templates (read-only del seed)
5. **F-021** -- Verificar actividades de hoy (read-only del seed)
6. **F-013** -- Crear una nueva orden (escritura)
7. **F-014** -- Aprobar/rechazar la orden creada (escritura, crea batch)
8. **F-020** -- Verificar actividades generadas del nuevo batch
9. **F-018** -- Avanzar fase del batch (escritura, modifica datos)
10. **F-022** -- Ejecutar una actividad (escritura, genera transacciones)

### Datos clave del seed para referencia rapida

| Entidad | Codigo | Datos clave |
|---------|--------|-------------|
| Batch 001 | LOT-GELATO-260301 | Germination, 50 plantas, Sala Propagacion, order OP-2026-001 |
| Batch 002 | LOT-GELATO-260201 | Vegetativo, 40 plantas, Sala Vegetativo A, order OP-2026-003 |
| Batch 003 | LOT-GELATO-260101 | Drying, 25 plantas, Sala Floracion A, order OP-2026-004, parent de A/B |
| Order draft | OP-2026-002 | OG Kush, 30 semillas, prioridad low |
| Order in_progress | OP-2026-003 | Gelato, 40 semillas, fases 1-2 completadas, fase 3 en progreso |
| Template fertiriego | FERT-VEG-D | Daily, 30 min, CaNO3 2g/plant + Root Gel 5mL/plant (opcional) |
| Template inspeccion | INSP-GEN-D | Daily, 20 min, Fungicida 5mL fijo (opcional) |

### Errores conocidos y limitaciones

- **US-020-004** (auto-assign operator): Diferida. Las actividades no se asignan automaticamente a operadores.
- **US-021-003** (swipe quick-complete): Diferida. No existe funcionalidad de swipe.
- **US-022-003** (observations con fotos): Diferida. El paso 3 de observaciones no esta disponible.
- **US-022-006** (ejecucion offline): Diferida. La ejecucion offline de actividades no esta implementada en Fase 1.
- **Scheduled activities con CURRENT_DATE**: Las fechas del seed usan CURRENT_DATE, por lo que las actividades pendientes y overdue siempre son relativas al dia de ejecucion de `db:reset`.
