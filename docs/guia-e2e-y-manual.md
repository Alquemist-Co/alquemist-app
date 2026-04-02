# Guia E2E y Manual de Usuario — Alquemist

> Plataforma de gestion agricola: cultivo, inventario, calidad, regulatorio, IoT y operaciones.
>
> - **Local**: `http://localhost:3000`
> - **Produccion**: `https://app.alquemist.co`
> - **Reset de BD para testing**: `pnpm dev:reset`

---

## Tabla de Contenidos

- [Parte 1: Flujos E2E (1-18)](#parte-1-flujos-e2e-1-18)
  - [Flujo 1: Onboarding completo (signup)](#flujo-1-onboarding-completo-signup)
  - [Flujo 2: Configuracion inicial empresa](#flujo-2-configuracion-inicial-empresa)
  - [Flujo 3: Gestion de usuarios e invitacion](#flujo-3-gestion-de-usuarios-e-invitacion)
  - [Flujo 4: Catalogo y configuracion de cultivos](#flujo-4-catalogo-y-configuracion-de-cultivos)
  - [Flujo 5: Infraestructura (instalaciones y zonas)](#flujo-5-infraestructura-instalaciones-y-zonas)
  - [Flujo 6: Cadena de suministro (proveedores, productos, envios)](#flujo-6-cadena-de-suministro-proveedores-productos-envios)
  - [Flujo 7: Orden de produccion Cannabis](#flujo-7-orden-de-produccion-cannabis)
  - [Flujo 8: Orden de produccion Cafe](#flujo-8-orden-de-produccion-cafe)
  - [Flujo 9: Orden de produccion Palma](#flujo-9-orden-de-produccion-palma)
  - [Flujo 10: Transicion de fases (lote Cannabis)](#flujo-10-transicion-de-fases-lote-cannabis)
  - [Flujo 11: Programar y ejecutar actividad](#flujo-11-programar-y-ejecutar-actividad)
  - [Flujo 12: Prueba de calidad](#flujo-12-prueba-de-calidad)
  - [Flujo 13: Documentos regulatorios](#flujo-13-documentos-regulatorios)
  - [Flujo 14: Monitoreo ambiental y sensores](#flujo-14-monitoreo-ambiental-y-sensores)
  - [Flujo 15: Gestion de alertas](#flujo-15-gestion-de-alertas)
  - [Flujo 16: Costos overhead y COGS](#flujo-16-costos-overhead-y-cogs)
  - [Flujo 17: Inventario (ajuste, transferencia, estado)](#flujo-17-inventario-ajuste-transferencia-estado)
  - [Flujo 18: Trazabilidad completa de lote](#flujo-18-trazabilidad-completa-de-lote)
- [Parte 2: Manual de Usuario por Modulo](#parte-2-manual-de-usuario-por-modulo)
  - [2.1 Autenticacion](#21-autenticacion)
  - [2.2 Configuracion](#22-configuracion)
  - [2.3 Areas](#23-areas)
  - [2.4 Inventario](#24-inventario)
  - [2.5 Produccion](#25-produccion)
  - [2.6 Actividades](#26-actividades)
  - [2.7 Calidad](#27-calidad)
  - [2.8 Regulatorio](#28-regulatorio)
  - [2.9 Operaciones](#29-operaciones)
- [Parte 3: Referencia Rapida](#parte-3-referencia-rapida)
  - [3.1 Matriz de Permisos RBAC](#31-matriz-de-permisos-rbac)
  - [3.2 Maquinas de Estado](#32-maquinas-de-estado)
  - [3.3 Datos de Referencia del Seed](#33-datos-de-referencia-del-seed)
  - [3.4 Glosario](#34-glosario)

---

## Datos de Prueba (Seed)

### Usuarios

Todos usan la contrasena `password123`.

| Email | Rol | Nombre |
|---|---|---|
| `admin@test.com` | admin | Carlos Administrador |
| `gerente@test.com` | manager | Laura Gerente |
| `supervisor@test.com` | supervisor | Miguel Supervisor |
| `operador@test.com` | operator | Ana Operadora |
| `visor@test.com` | viewer | Pedro Visor |

### Empresa

**Alquemist Agroindustrial S.A.S.** — NIT-900123456-7, Colombia, America/Bogota, COP. Todos los features habilitados.

### Navegacion Principal (Sidebar)

| Seccion | Paginas | Rutas |
|---|---|---|
| Dashboard | Inicio | `/` (deshabilitado) |
| Produccion | Ordenes, Lotes | `/production/orders`, `/production/batches` |
| Areas | Instalaciones, Zonas | `/areas/facilities`, `/areas/zones` |
| Inventario | Productos, Stock, Transacciones, Proveedores, Envios, Recetas | `/inventory/products`, `/inventory/items`, `/inventory/transactions`, `/inventory/suppliers`, `/inventory/shipments`, `/inventory/recipes` |
| Actividades | Calendario, Historial | `/activities/schedule`, `/activities/history` |
| Calidad | Tests | `/quality/tests` |
| Regulatorio | Documentos | `/regulatory/documents` |
| Operaciones | Alertas, Ambiental, Sensores, Costos | `/operations/alerts`, `/operations/environmental`, `/operations/sensors`, `/operations/costs` |
| Configuracion | Perfil, Empresa, Usuarios, Catalogo, Tipos de Cultivo, Cultivares, Plantillas de Actividad, Config. Regulatoria | `/settings/profile`, `/settings/company`, `/settings/users`, `/settings/catalog`, `/settings/crop-types`, `/settings/cultivars`, `/settings/activity-templates`, `/settings/regulatory-config` |

---

## Parte 1: Flujos E2E (1-18)

---

### Flujo 1: Onboarding completo (signup)

**Precondiciones**: Base de datos limpia (sin datos seed). Ejecutar `pnpm dev:reset` y luego eliminar los datos de prueba, o usar una instancia de Supabase nueva.
**Rol**: Nuevo usuario (sin cuenta existente).
**Tiempo estimado**: 5 min

#### Pasos

1. Navegar a `http://localhost:3000/signup`.
2. Verificar que se muestra el formulario de registro con el logo de Alquemist y el paso 1 activo ("Empresa").
3. **Paso 1 — Datos de empresa**:
   - Llenar campo "Nombre de la empresa" con `Finca Prueba S.A.S.`.
   - Llenar campo "Identificacion legal" con `NIT-999999999-0`.
   - Seleccionar pais `Colombia` en el desplegable.
   - Verificar que zona horaria se auto-completa a `America/Bogota`.
   - Verificar que moneda se auto-completa a `COP`.
   - Hacer clic en "Siguiente".
4. **Paso 2 — Datos del administrador**:
   - Llenar campo "Nombre completo" con `Admin Prueba`.
   - Llenar campo "Email" con `prueba@test.com`.
   - Llenar campo "Contrasena" con `prueba123`.
   - Llenar campo "Confirmar contrasena" con `prueba123`.
   - Hacer clic en "Crear cuenta".
5. Esperar redireccion automatica al dashboard (`/`).
6. Navegar a `/settings/crop-types`.
7. Navegar a `/settings/cultivars`.
8. Navegar a `/settings/activity-templates`.
9. Navegar a `/settings/catalog`.

#### Resultado esperado

- El registro se completa sin errores y el usuario queda autenticado automaticamente.
- En `/settings/crop-types` se listan 3 tipos de cultivo precargados: **Cannabis Medicinal** (CANN), **Cafe Arabica** (CAFE), **Palma de Aceite** (PALMA).
- En `/settings/cultivars` se listan 8 cultivares: OG Kush, Blue Dream, White Widow, Castillo, Geisha, Caturra, Tenera DxP, Coari x La Me OxG.
- En `/settings/activity-templates` se listan 10 plantillas de actividad (3 cannabis, 4 cafe, 3 palma).
- En `/settings/catalog` se muestran 6 categorias de recurso y 8 unidades de medida.

---

### Flujo 2: Configuracion inicial empresa

**Precondiciones**: BD con datos seed (`pnpm dev:reset`).
**Rol**: admin (`admin@test.com` / `password123`).
**Tiempo estimado**: 5 min

#### Pasos

1. Navegar a `http://localhost:3000/login`.
2. Iniciar sesion con `admin@test.com` / `password123`.
3. Navegar a `/settings/company`.
4. Verificar que se muestra "Alquemist Agroindustrial S.A.S." con NIT-900123456-7.
5. Localizar la seccion de modo regulatorio. Cambiar de `strict` a `standard`.
6. Guardar cambios.
7. Cambiar modo regulatorio de `standard` a `none`.
8. Guardar cambios.
9. Verificar en el sidebar que la seccion "Regulatorio" desaparece cuando el modo es `none`.
10. Revertir modo regulatorio a `strict`. Guardar.
11. Verificar que "Regulatorio" reaparece en el sidebar.
12. Desactivar el toggle de `quality`.
13. Guardar cambios.
14. Verificar en el sidebar que la seccion "Calidad" desaparece.
15. Reactivar `quality`. Guardar.
16. Probar toggles de `iot` y `cost_tracking` de la misma manera, verificando que las secciones "Sensores"/"Ambiental" y "Costos" respectivamente aparecen/desaparecen del sidebar.
17. Subir un logo de empresa (imagen PNG/JPG de prueba).
18. Guardar y verificar que el logo se muestra en el header.

#### Resultado esperado

- Los cambios en modo regulatorio y feature toggles se reflejan inmediatamente en la navegacion del sidebar.
- El logo se sube correctamente y se muestra en la interfaz.
- Todos los cambios persisten al recargar la pagina.

---

### Flujo 3: Gestion de usuarios e invitacion

**Precondiciones**: BD con datos seed. Acceso a Inbucket en `http://localhost:15435`.
**Rol**: admin (`admin@test.com` / `password123`).
**Tiempo estimado**: 8 min

#### Pasos

1. Iniciar sesion como admin en `http://localhost:3000/login`.
2. Navegar a `/settings/users`.
3. Verificar que se listan 5 usuarios existentes: Carlos Administrador, Laura Gerente, Miguel Supervisor, Ana Operadora, Pedro Visor.
4. Hacer clic en "Invitar usuario".
5. Llenar el formulario:
   - Email: `nuevo@test.com`
   - Nombre: `Nuevo Supervisor`
   - Rol: `supervisor`
6. Hacer clic en "Enviar invitacion".
7. Verificar que aparece un toast de confirmacion y el usuario aparece en la lista con estado pendiente.
8. Abrir Inbucket en `http://localhost:15435`.
9. Buscar el email de invitacion enviado a `nuevo@test.com`.
10. Abrir el email y copiar el enlace de invitacion.
11. Abrir una ventana de incognito del navegador.
12. Pegar el enlace de invitacion (debe redirigir a `/invite`).
13. Verificar que se muestra el formulario de establecer contrasena con el nombre "Nuevo Supervisor" precargado.
14. Ingresar contrasena `password123` y confirmar.
15. Hacer clic en "Activar cuenta".
16. Esperar redireccion al dashboard.
17. Verificar que el sidebar muestra acceso de supervisor (puede ver produccion, areas, inventario, actividades, pero no configuracion completa).
18. Cerrar la ventana de incognito.
19. En la ventana principal (admin), recargar `/settings/users`.
20. Verificar que "Nuevo Supervisor" ahora aparece como activo.

#### Resultado esperado

- El flujo de invitacion funciona end-to-end: admin invita, email llega a Inbucket, el usuario acepta y establece contrasena.
- El nuevo usuario puede iniciar sesion con permisos de supervisor.
- La lista de usuarios refleja el nuevo usuario activo.

---

### Flujo 4: Catalogo y configuracion de cultivos

**Precondiciones**: BD con datos seed.
**Rol**: admin (`admin@test.com` / `password123`).
**Tiempo estimado**: 6 min

#### Pasos

1. Iniciar sesion como admin.
2. Navegar a `/settings/catalog`.
3. Verificar que se muestran 3 tabs: **Categorias**, **Unidades**, **Tipos de Actividad**.
4. En la tab de Categorias, verificar 6 categorias de recurso existentes.
5. En la tab de Unidades, verificar 8 unidades de medida.
6. En la tab de Tipos de Actividad, verificar 8 tipos de actividad.
7. Navegar a `/settings/crop-types`.
8. Verificar 3 tipos de cultivo: Cannabis Medicinal, Cafe Arabica, Palma de Aceite.
9. Expandir **Cannabis Medicinal** (CANN).
10. Verificar 7 fases en orden:
    - Germinacion (7 dias)
    - Plantula (14 dias)
    - Vegetativo (28 dias)
    - Floracion (63 dias)
    - Cosecha (3 dias, transferencia)
    - Secado (14 dias, transferencia)
    - Curado (28 dias, transferencia)
11. Expandir **Cafe Arabica** (CAFE).
12. Verificar 7 fases: Almacigo (120d) hasta Secado (15d).
13. Expandir **Palma de Aceite** (PALMA).
14. Verificar 6 fases: Previvero (90d) hasta Extraccion (1d).
15. Navegar a `/settings/cultivars`.
16. Verificar 8 cultivares listados.
17. Hacer clic en **OG Kush** para ver detalle.
18. Verificar: codigo `OGK`, ciclo total 157 dias, rendimiento 450 g/planta.
19. Verificar que las duraciones por fase estan configuradas.
20. Navegar a `/settings/activity-templates`.
21. Verificar 10 plantillas: 3 cannabis, 4 cafe, 3 palma.
22. Hacer clic en una plantilla de cannabis (ej. "Riego Cannabis").
23. Verificar que tiene checklist asociado con items especificos.
24. Navegar a `/settings/regulatory-config`.
25. Verificar 5 tipos de documento regulatorio: CoA, SDS, Fitosanitario, FNC Export, RSPO.
26. Hacer clic en un tipo para ver su formulario dinamico (form builder).

#### Resultado esperado

- Todos los datos de catalogo seed estan presentes y correctos.
- Los tipos de cultivo muestran sus fases con duraciones correctas y marcas de transferencia.
- Los cultivares muestran rendimientos y ciclos.
- Las plantillas tienen checklists funcionales.
- La configuracion regulatoria tiene formularios dinamicos.

---

### Flujo 5: Infraestructura (instalaciones y zonas)

**Precondiciones**: BD con datos seed.
**Rol**: admin (`admin@test.com` / `password123`).
**Tiempo estimado**: 6 min

#### Pasos

1. Iniciar sesion como admin.
2. Navegar a `/areas/facilities`.
3. Verificar que se listan 6 instalaciones:
   - Nave Cannabis Indoor (indoor_warehouse, 2000 m2, Rionegro)
   - Invernadero Propagacion (greenhouse, 800 m2, Rionegro)
   - Finca Cafetera La Esperanza (open_field, 65000 m2, Salgar)
   - Beneficiadero Central (indoor_warehouse, 400 m2, Salgar)
   - Plantacion Palma Magdalena (open_field, 250000 m2, Zona Bananera)
   - Planta Extractora (indoor_warehouse, 2000 m2, Zona Bananera)
4. Hacer clic en "Nueva instalacion".
5. Llenar formulario:
   - Nombre: `Bodega Temporal`
   - Tipo: `indoor_warehouse`
   - Area: `100`
   - Unidad: `m2`
6. Guardar.
7. Verificar que "Bodega Temporal" aparece en la lista (total: 7 instalaciones).
8. Navegar a `/areas/zones`.
9. Verificar que se listan 19 zonas.
10. Filtrar por instalacion: seleccionar **Nave Cannabis Indoor**.
11. Verificar que se muestran 6 zonas: Vegetativo A, Vegetativo B, Floracion A, Floracion B, Secado y Curado, Almacen Cannabis.
12. Hacer clic en **Vegetativo A** para ver el detalle.
13. En el detalle de zona, verificar:
    - Nombre: Vegetativo A
    - Instalacion: Nave Cannabis Indoor
    - Estructuras de zona asociadas (si existen)
    - Configuracion de clima (rangos de temperatura, humedad)
14. Volver a la lista de zonas.
15. Filtrar por **Finca Cafetera La Esperanza**.
16. Verificar 3 zonas: Lote 1 Castillo, Lote 2 Geisha, Lote 3 Caturra.

#### Resultado esperado

- Las 6 instalaciones seed se muestran con sus datos correctos.
- La nueva instalacion "Bodega Temporal" se crea exitosamente.
- Las zonas se pueden filtrar por instalacion.
- El detalle de zona muestra estructuras y configuracion climatica.
- El total de zonas es 19 (sin contar zonas nuevas creadas en esta sesion).

---

### Flujo 6: Cadena de suministro (proveedores, productos, envios)

**Precondiciones**: BD con datos seed.
**Rol**: admin (`admin@test.com` / `password123`).
**Tiempo estimado**: 10 min

#### Pasos

1. Iniciar sesion como admin.
2. Navegar a `/inventory/suppliers`.
3. Verificar 7 proveedores: AgroSemillas Colombia, NutriGrow Fertilizantes, BioControl SAS, Vivero Cenicafe, Vivero Cenipalma, Lab Analitico del Valle, PlastiAgro.
4. Navegar a `/inventory/products`.
5. Verificar 21 productos. Localizar al menos:
   - Semillas: SEM-OGK-FEM, SEM-BLD-FEM, SEM-WWD-REG
   - Insumos cannabis: FERT-BLOOM, FERT-GROW, FERT-MICRO, BIO-TRICHO
   - Productos finales: FLOR-SECA-OGK, FLOR-SECA-BLD, TRIM-SECO
   - Cafe: CAFE-PERG-SECO, CAFE-CEREZA
   - Palma: FFB-PALMA, CPO-CRUDO
6. Navegar a `/inventory/shipments`.
7. Verificar 8 envios con sus estados:
   - SHP-2026-0001: `accepted`
   - SHP-2026-0002: `scheduled`
   - SHP-2026-0003: `in_transit`
   - SHP-2026-0004: `inspecting`
   - SHP-2026-0005: `accepted`
   - SHP-2026-0006: `cancelled`
   - SHP-2026-0007: `received` (outbound)
   - SHP-2026-0008: `scheduled`
8. Hacer clic en **SHP-2026-0002** (scheduled, fertilizantes de NutriGrow).
9. En la pagina de detalle, verificar que muestra 3 lineas de productos fertilizantes.
10. Hacer clic en "Marcar como recibido" (o boton equivalente para transicion a `received`).
11. Verificar que el estado cambia a `received`.
12. Hacer clic en "Iniciar inspeccion" para transicionar a `inspecting`.
13. Para cada linea de producto (3 fertilizantes):
    - Verificar cantidad recibida.
    - Marcar resultado de inspeccion: `accepted` (aceptar todo).
14. Hacer clic en "Confirmar inspeccion".
15. Verificar que el estado del envio cambia a `accepted`.
16. Navegar a `/inventory/items`.
17. Verificar que aparecen nuevos items de inventario correspondientes a los 3 fertilizantes recibidos.

#### Resultado esperado

- La cadena completa de suministro funciona: envio scheduled -> received -> inspecting -> accepted.
- Se crean items de inventario automaticamente al aceptar un envio.
- Los 3 fertilizantes del envio SHP-2026-0002 aparecen en stock.
- Las transiciones de estado estan correctamente restringidas (no se puede saltar pasos).

---

### Flujo 7: Orden de produccion Cannabis

**Precondiciones**: BD con datos seed.
**Rol**: admin (`admin@test.com` / `password123`).
**Tiempo estimado**: 7 min

#### Pasos

1. Iniciar sesion como admin.
2. Navegar a `/production/orders`.
3. Hacer clic en "Nueva orden".
4. Llenar formulario:
   - Cultivar: **OG Kush** (OGK)
   - Fase de entrada: **Germinacion**
   - Fase de salida: **Curado**
   - Cantidad: `50`
   - Unidad: `und`
   - Prioridad: `normal`
   - Zona inicial: **Propagacion Cannabis**
5. Verificar que se muestra una tabla de rendimiento en cascada con las fases intermedias:
   - Germinacion -> Plantula -> Vegetativo -> Floracion -> Cosecha -> Secado -> Curado
   - Con rendimientos estimados por fase basados en 450 g/planta.
6. Hacer clic en "Guardar borrador".
7. Verificar que la orden se crea con estado `draft`.
8. Hacer clic en la orden recien creada para ir al detalle.
9. Verificar los datos ingresados en el resumen de la orden.
10. Hacer clic en "Aprobar".
11. Confirmar la aprobacion en el dialogo.
12. Verificar que el estado cambia a `approved`.
13. Navegar a `/production/batches`.
14. Verificar que aparece un nuevo lote asociado a la orden aprobada, con:
    - Cultivar: OG Kush
    - Fase: Germinacion
    - Estado: `active`
    - Zona: Propagacion Cannabis

#### Resultado esperado

- Se crea una orden de produccion en estado `draft` con los datos correctos.
- La tabla de rendimiento en cascada calcula correctamente los rendimientos por fase para OG Kush.
- Al aprobar, la orden pasa a `approved` y se genera automaticamente un lote en fase Germinacion.
- El lote aparece en la lista de lotes con estado activo.

---

### Flujo 8: Orden de produccion Cafe

**Precondiciones**: BD con datos seed.
**Rol**: admin (`admin@test.com` / `password123`).
**Tiempo estimado**: 5 min

#### Pasos

1. Iniciar sesion como admin.
2. Navegar a `/production/orders`.
3. Hacer clic en "Nueva orden".
4. Llenar formulario:
   - Cultivar: **Castillo** (CAS)
   - Fase de entrada: **Almacigo**
   - Fase de salida: **Secado**
   - Cantidad: `200`
   - Unidad: `und`
   - Prioridad: `normal`
   - Zona inicial: **Almacigo Cafe**
5. Verificar la tabla de rendimiento en cascada:
   - Almacigo -> Levante -> Floracion -> Desarrollo Fruto -> Recoleccion -> Beneficio -> Secado
   - Rendimientos basados en 1.2 kg/arbol.
6. Hacer clic en "Guardar borrador".
7. Verificar estado `draft`.
8. Ir al detalle de la orden y hacer clic en "Aprobar".
9. Confirmar la aprobacion.
10. Verificar estado `approved`.
11. Navegar a `/production/batches`.
12. Verificar que aparece un nuevo lote:
    - Cultivar: Castillo
    - Fase: Almacigo
    - Estado: `active`
    - Zona: Almacigo Cafe

#### Resultado esperado

- La orden de cafe se crea y aprueba correctamente.
- Los rendimientos en cascada reflejan el ciclo largo del cafe (865 dias totales).
- El lote generado aparece en fase Almacigo asignado a la zona correcta.

---

### Flujo 9: Orden de produccion Palma

**Precondiciones**: BD con datos seed.
**Rol**: admin (`admin@test.com` / `password123`).
**Tiempo estimado**: 5 min

#### Pasos

1. Iniciar sesion como admin.
2. Navegar a `/production/orders`.
3. Hacer clic en "Nueva orden".
4. Llenar formulario:
   - Cultivar: **Tenera DxP** (TEN)
   - Fase de entrada: **Previvero**
   - Fase de salida: **Extraccion**
   - Cantidad: `50`
   - Unidad: `und`
   - Prioridad: `normal`
   - Zona inicial: **Lote A Tenera**
5. Verificar la tabla de rendimiento en cascada:
   - Previvero -> Vivero -> Inmaduro -> Productivo -> Corte Racimos -> Extraccion
   - Rendimientos basados en 25 ton FFB/ha.
6. Hacer clic en "Guardar borrador".
7. Verificar estado `draft`.
8. Ir al detalle de la orden y hacer clic en "Aprobar".
9. Confirmar la aprobacion.
10. Verificar estado `approved`.
11. Navegar a `/production/batches`.
12. Verificar que aparece un nuevo lote:
    - Cultivar: Tenera DxP
    - Fase: Previvero
    - Estado: `active`
    - Zona: Lote A Tenera

#### Resultado esperado

- La orden de palma se crea y aprueba correctamente.
- Los rendimientos reflejan el ciclo de la palma (6 fases, 1120 dias).
- El lote generado aparece en fase Previvero.

---

### Flujo 10: Transicion de fases (lote Cannabis)

**Precondiciones**: BD con datos seed. Lote LOT-OGK-260115-001 en fase Vegetativo, zona Vegetativo A.
**Rol**: admin (`admin@test.com` / `password123`).
**Tiempo estimado**: 5 min

#### Pasos

1. Iniciar sesion como admin.
2. Navegar a `/production/batches`.
3. Localizar el lote **LOT-OGK-260115-001** en la lista.
4. Verificar datos actuales:
   - Cultivar: OG Kush
   - Fase: Vegetativo
   - Estado: `active`
   - Zona: Vegetativo A
5. Hacer clic en el lote para ir al detalle.
6. Localizar el boton "Transicion de fase" (o equivalente).
7. Hacer clic en "Transicion de fase".
8. En el dialogo/formulario de transicion:
   - Verificar que la siguiente fase sugerida es **Floracion**.
   - Seleccionar zona destino: **Floracion A**.
9. Confirmar la transicion.
10. Verificar en la pagina de detalle:
    - Fase actual: **Floracion**
    - Zona actual: **Floracion A**
11. Verificar en la seccion de timeline/historial que aparece un registro de la transicion:
    - De: Vegetativo (Vegetativo A)
    - A: Floracion (Floracion A)
    - Fecha y hora de la transicion.
12. Navegar a `/production/batches` y verificar que el lote LOT-OGK-260115-001 muestra la nueva fase y zona en la lista.

#### Resultado esperado

- La transicion de Vegetativo a Floracion se ejecuta correctamente.
- El lote se reasigna de Vegetativo A a Floracion A.
- El timeline del lote registra la transicion con timestamp.
- La lista de lotes refleja el nuevo estado.

---

### Flujo 11: Programar y ejecutar actividad

**Precondiciones**: BD con datos seed. Actividades pendientes existentes para el lote LOT-OGK-260115-001.
**Rol**: admin o supervisor (`admin@test.com` / `password123`).
**Tiempo estimado**: 7 min

#### Pasos

1. Iniciar sesion como admin.
2. Navegar a `/activities/schedule`.
3. Localizar una actividad pendiente asociada al lote **LOT-OGK-260115-001**.
4. Hacer clic en la actividad para ver su detalle o hacer clic en "Ejecutar".
5. En el formulario de ejecucion, llenar:
   - Duracion: `45` minutos.
   - Recursos consumidos:
     - Producto: **Flora Bloom** (FERT-BLOOM), cantidad: `2`, unidad: `L`.
     - Producto: **Flora Grow** (FERT-GROW), cantidad: `2`, unidad: `L`.
   - Completar el checklist (marcar los 3 items como completados).
   - Observaciones: `Se detecto presencia de acaro rojo en esquina noroeste del area. Se recomienda aplicar BIO-TRICHO como tratamiento preventivo.`
6. Hacer clic en "Completar actividad" (o boton equivalente para ejecutar).
7. Verificar que aparece un toast de confirmacion.
8. Navegar a `/activities/history`.
9. Buscar la actividad recien ejecutada.
10. Verificar que muestra:
    - Estado: `completed`
    - Duracion: 45 min
    - Recursos consumidos listados
    - Observaciones registradas

#### Resultado esperado

- La actividad se ejecuta correctamente con todos los datos ingresados.
- Los recursos consumidos se descuentan del inventario.
- El checklist queda registrado como completado.
- La actividad aparece en el historial con estado `completed`.
- La observacion sobre acaro rojo queda registrada para trazabilidad.

---

### Flujo 12: Prueba de calidad

**Precondiciones**: BD con datos seed. 6 tests de calidad existentes.
**Rol**: admin (`admin@test.com` / `password123`).
**Tiempo estimado**: 6 min

#### Pasos

1. Iniciar sesion como admin.
2. Navegar a `/quality/tests`.
3. Verificar que se listan 6 tests de calidad existentes:
   - Potencia cannabis (completed, passed) — LOT-OGK-251101-001
   - Contaminantes cannabis (pending) — LOT-OGK-260115-001
   - Metales pesados cannabis (completed, failed) — LOT-OGK-251101-001
   - Cup score cafe SCA (completed, passed) — LOT-CAS-250601-001
   - Analisis humedad cafe (completed, passed) — LOT-CAS-240601-001
   - Tasa extraccion palma OER (completed, passed) — LOT-TEN-250601-001
4. Hacer clic en "Nuevo test".
5. Llenar formulario:
   - Lote: **LOT-OGK-260115-001**
   - Tipo: **potency** (potencia)
   - Laboratorio: `Lab Analitico del Valle`
   - Fecha de muestra: fecha de hoy
6. Guardar el test.
7. Navegar al detalle del test recien creado.
8. Registrar resultados:
   - THC: `20.5%`
   - CBD: `0.5%`
   - Humedad: `11%`
   - Resultado general (overall_pass): `true` (aprobado)
9. Guardar resultados.
10. Verificar que el estado cambia a `completed`.
11. Volver a `/quality/tests`.
12. Verificar que el nuevo test aparece como completado y aprobado.

#### Resultado esperado

- Se crea un nuevo test de potencia para el lote LOT-OGK-260115-001.
- Los resultados se registran correctamente (THC 20.5%, CBD 0.5%, Humedad 11%).
- El test pasa a estado `completed` con resultado `passed`.
- El test queda asociado al lote para trazabilidad.

---

### Flujo 13: Documentos regulatorios

**Precondiciones**: BD con datos seed. Modo regulatorio activo (strict o standard).
**Rol**: admin (`admin@test.com` / `password123`).
**Tiempo estimado**: 5 min

#### Pasos

1. Iniciar sesion como admin.
2. Navegar a `/regulatory/documents`.
3. Verificar los documentos regulatorios existentes (si hay datos seed de documentos).
4. Hacer clic en "Nuevo documento".
5. Llenar formulario:
   - Tipo de documento: **CoA** (Certificate of Analysis)
   - Lote asociado: **LOT-OGK-260115-001**
   - Campos del formulario dinamico (segun configuracion de CoA):
     - Nombre del laboratorio: `Lab Analitico del Valle`
     - Fecha de muestra: fecha de hoy
     - Tipo de analisis: `cannabinoid profile`
     - Resultado general: `true` (aprobado)
6. Subir un archivo PDF de prueba como adjunto del documento.
7. Hacer clic en "Guardar".
8. Verificar que el documento se crea con estado `valid`.
9. Verificar que el archivo adjunto se muestra en el detalle.
10. Verificar que el documento aparece asociado al lote LOT-OGK-260115-001.

#### Resultado esperado

- Se crea un documento regulatorio tipo CoA asociado al lote.
- Los campos del formulario dinamico se llenan segun la configuracion de `/settings/regulatory-config`.
- El archivo se sube correctamente al storage.
- El documento queda con estado `valid`.

---

### Flujo 14: Monitoreo ambiental y sensores

**Precondiciones**: BD con datos seed. 8 sensores existentes.
**Rol**: admin (`admin@test.com` / `password123`).
**Tiempo estimado**: 6 min

#### Pasos

1. Iniciar sesion como admin.
2. Navegar a `/operations/sensors`.
3. Verificar que se listan 8 sensores:
   - SN-TEMP-VA01 (temperature, Vegetativo A, active)
   - SN-HUM-VA01 (humidity, Vegetativo A, active)
   - SN-TEMP-FA01 (temperature, Floracion A, active)
   - SN-HUM-FA01 (humidity, Floracion A, active)
   - SN-CO2-FA01 (CO2, Floracion A, active)
   - SN-SM-LC01 (soil_moisture, Lote 1 Castillo, active)
   - SN-TEMP-LT01 (temperature, Lote A Tenera, active)
   - SN-TEMP-LE01 (temperature, Linea Extraccion, **inactive**)
4. Verificar que 7 sensores estan activos y 1 inactivo (SN-TEMP-LE01).
5. Hacer clic en "Nuevo sensor".
6. Llenar formulario:
   - Tipo: **temperature**
   - Zona: **Almacigo Cafe**
   - Codigo/Serial: `SN-TEMP-AC01`
   - Estado: `active`
7. Guardar.
8. Verificar que el nuevo sensor aparece en la lista (total: 9 sensores).
9. Navegar a `/operations/environmental`.
10. Seleccionar zona **Vegetativo A**.
11. Verificar que se muestran las lecturas actuales:
    - Temperatura (del sensor SN-TEMP-VA01)
    - Humedad (del sensor SN-HUM-VA01)
12. Verificar que se muestra un grafico de 24 horas con las lecturas historicas.
13. Cambiar a zona **Floracion A**.
14. Verificar 3 sensores: temperatura, humedad, CO2.

#### Resultado esperado

- Los 8 sensores seed se muestran correctamente, incluyendo el inactivo.
- Se crea un nuevo sensor de temperatura para Almacigo Cafe.
- El panel ambiental muestra lecturas en tiempo real por zona.
- Los graficos de 24h se renderizan correctamente.

---

### Flujo 15: Gestion de alertas

**Precondiciones**: BD con datos seed. 6 alertas existentes.
**Rol**: admin (`admin@test.com` / `password123`).
**Tiempo estimado**: 5 min

#### Pasos

1. Iniciar sesion como admin.
2. Navegar a `/operations/alerts`.
3. Verificar que se listan 6 alertas ordenadas por severidad:
   - **critical** (pending): env_out_of_range — Floracion A temperatura 31.2 grados C
   - **high** (pending): low_inventory — Flora Bloom < 1L
   - **warning** (pending): stale_batch — LOT-CAS-240601-001 en on_hold 90 dias
   - **warning** (acknowledged): overdue_activity — Fertilizacion cafe retrasada
   - **warning** (pending): pest_detected — Acaro rojo en Vegetativo A
   - **info** (resolved): regulatory_expiring — Cert fitosanitario ICA 15 dias
4. Hacer clic en la alerta critica (env_out_of_range, temperatura 31.2 grados C en Floracion A).
5. Hacer clic en "Reconocer" (acknowledge).
6. Verificar que el estado cambia de `pending` a `acknowledged`.
7. Hacer clic en "Resolver".
8. Agregar nota de resolucion: `Se ajusto el sistema de ventilacion. Temperatura normalizada a 26C.`
9. Confirmar la resolucion.
10. Verificar que el estado cambia a `resolved`.
11. Volver a la lista de alertas.
12. Verificar que la alerta critica ahora muestra estado `resolved`.
13. Verificar que las transiciones de estado son correctas:
    - Solo se puede reconocer una alerta en estado `pending`.
    - Solo se puede resolver una alerta en estado `acknowledged`.

#### Resultado esperado

- Las 6 alertas seed se muestran con sus severidades y estados correctos.
- La transicion pending -> acknowledged -> resolved funciona correctamente.
- Las notas de resolucion se guardan.
- Las restricciones de maquina de estados se respetan (no se puede resolver sin reconocer primero).

---

### Flujo 16: Costos overhead y COGS

**Precondiciones**: BD con datos seed. 6 costos overhead existentes.
**Rol**: admin (`admin@test.com` / `password123`).
**Tiempo estimado**: 6 min

#### Pasos

1. Iniciar sesion como admin.
2. Navegar a `/operations/costs`.
3. Verificar que se listan 6 costos overhead existentes:
   - Energia, renta, mantenimiento — Nave Cannabis Indoor (febrero 2026)
   - Seguro, mano de obra — Finca Cafetera La Esperanza (febrero 2026)
   - Energia — Planta Extractora (febrero 2026)
4. Verificar que los montos estan en COP.
5. Hacer clic en "Nuevo costo".
6. Llenar formulario:
   - Instalacion: **Finca Cafetera La Esperanza**
   - Tipo: `energy` (energia)
   - Monto: `2000000` (COP $2.000.000)
   - Periodo: Marzo 2026
   - Metodo de asignacion: `per_m2` (por metro cuadrado)
7. Guardar.
8. Verificar que el nuevo costo aparece en la lista (total: 7 costos).
9. Cambiar a la vista de **COGS** (costo de bienes producidos).
10. Verificar que se muestra la agregacion de costos por lote.
11. Localizar un lote (ej. LOT-OGK-260115-001) y verificar que los costos asignados se calculan correctamente segun el metodo de asignacion.

#### Resultado esperado

- Los 6 costos seed se muestran con montos en COP.
- Se crea un nuevo costo overhead para la finca cafetera.
- La vista COGS agrega costos por lote.
- El metodo de asignacion `per_m2` distribuye los costos proporcionalmente al area.

---

### Flujo 17: Inventario (ajuste, transferencia, estado)

**Precondiciones**: BD con datos seed. Items de inventario existentes.
**Rol**: admin (`admin@test.com` / `password123`).
**Tiempo estimado**: 8 min

#### Pasos

1. Iniciar sesion como admin.
2. Navegar a `/inventory/items`.
3. Verificar que se muestran KPIs de inventario en la parte superior (total items, valor, alertas de stock bajo).
4. Localizar un item de semillas (ej. SEM-OGK-FEM).
5. **Ajuste de inventario**:
   - Hacer clic en el item o seleccionar la accion "Ajustar".
   - En el dialogo de ajuste:
     - Tipo: ajuste positivo (+)
     - Cantidad: `5`
     - Razon: `Conteo fisico`
   - Confirmar el ajuste.
   - Verificar que la cantidad del item se incrementa en 5 unidades.
6. **Transferencia de inventario**:
   - Sobre el mismo item u otro, seleccionar la accion "Transferir".
   - En el dialogo de transferencia:
     - Zona destino: seleccionar una zona diferente a la actual.
     - Cantidad: `2`
   - Confirmar la transferencia.
   - Verificar que se crea un nuevo item en la zona destino (o se incrementa si ya existia) y el item origen se reduce en 2.
7. **Cambio de estado**:
   - Localizar un item con estado `quarantine` (o cambiar un item a cuarentena primero).
   - Seleccionar la accion "Cambiar estado".
   - Cambiar de `quarantine` a `available`.
   - Confirmar.
   - Verificar que el estado del item se actualiza.
8. Navegar a `/inventory/transactions`.
9. Verificar que las 3 operaciones anteriores estan registradas:
   - Una transaccion de tipo `adjustment` (+5, conteo fisico).
   - Una transaccion de tipo `transfer` (qty 2, zona origen -> zona destino).
   - Una transaccion de tipo `status_change` (quarantine -> available).
10. Verificar que cada transaccion muestra: fecha, tipo, producto, cantidad, usuario que la realizo.

#### Resultado esperado

- Los KPIs de inventario se muestran correctamente.
- El ajuste positivo incrementa la cantidad del item.
- La transferencia mueve unidades entre zonas correctamente.
- El cambio de estado actualiza el item.
- Las 3 operaciones quedan registradas en el log de transacciones con todos los detalles.

---

### Flujo 18: Trazabilidad completa de lote

**Precondiciones**: BD con datos seed. Lote LOT-OGK-260115-001 con actividades, tests y datos asociados. Idealmente ejecutar despues de los flujos 10-17 para tener datos adicionales.
**Rol**: admin (`admin@test.com` / `password123`).
**Tiempo estimado**: 8 min

#### Pasos

1. Iniciar sesion como admin.
2. Navegar a `/production/batches`.
3. Hacer clic en el lote **LOT-OGK-260115-001**.
4. En la pagina de detalle del lote, revisar cada tab/seccion:
5. **Timeline (Fases)**:
   - Verificar el historial de fases del lote.
   - Si se ejecuto el Flujo 10, debe aparecer la transicion Vegetativo -> Floracion.
   - Verificar fechas de inicio y fin de cada fase.
6. **Actividades**:
   - Verificar actividades programadas y ejecutadas.
   - Si se ejecuto el Flujo 11, debe aparecer la actividad completada con duracion 45 min.
   - Verificar recursos consumidos asociados.
7. **Inventario**:
   - Verificar transacciones de inventario asociadas al lote.
   - Verificar consumos de insumos (Flora Bloom, Flora Grow si se ejecuto Flujo 11).
8. **Calidad**:
   - Verificar tests de calidad vinculados.
   - Debe aparecer el test de contaminantes (pending) del seed.
   - Si se ejecuto el Flujo 12, debe aparecer el nuevo test de potencia (completed, passed).
9. **Regulatorio**:
   - Verificar documentos regulatorios asociados.
   - Si se ejecuto el Flujo 13, debe aparecer el CoA creado.
10. **Genealogia**:
    - Verificar arbol genealogico del lote.
    - Verificar relacion con la orden de produccion origen.
11. **Ambiente**:
    - Verificar que muestra datos de los sensores de la zona actual del lote.
    - Si el lote esta en Floracion A (tras Flujo 10), debe mostrar lecturas de SN-TEMP-FA01, SN-HUM-FA01, SN-CO2-FA01.
12. Desde el detalle del lote, localizar el enlace a la orden de produccion de origen.
13. Hacer clic para navegar a la orden.
14. Verificar que la orden muestra el lote asociado.

#### Resultado esperado

- El detalle del lote LOT-OGK-260115-001 funciona como nexo central de trazabilidad.
- Cada tab muestra informacion relevante y actualizada:
  - Timeline con historial de fases completo.
  - Actividades programadas y ejecutadas.
  - Transacciones de inventario (consumos, ajustes).
  - Tests de calidad vinculados con resultados.
  - Documentos regulatorios asociados.
  - Datos ambientales de la zona actual.
- Se puede trazar la cadena completa: orden de produccion -> lote -> fases -> actividades -> inventario -> calidad -> regulatorio.
- La navegacion bidireccional funciona (lote -> orden, orden -> lote).

---

## Parte 2: Manual de Usuario por Modulo

Guia funcional de las 38 paginas implementadas, organizadas por modulo. Para cada pagina se indica la URL, proposito, roles con acceso y acciones disponibles.

---

### 2.1 Autenticacion

Modulo de acceso al sistema. Gestiona registro, inicio de sesion, invitaciones y recuperacion de contrasena.

#### `/login` — Inicio de sesion

- **Proposito**: Autenticar usuarios con email y contrasena.
- **Roles con acceso**: Publico (sin autenticacion).
- **Funcionalidad**:
  - Formulario con campos email y contrasena.
  - Redireccion segun rol tras login exitoso:
    - admin, manager, viewer → `/` (dashboard).
    - supervisor → `/activities/schedule`.
    - operator → `/field/today`.
  - En caso de error se muestra "Credenciales invalidas" (sin revelar si el email existe o no).
  - Enlace a `/forgot-password` para recuperacion.

#### `/signup` — Registro de empresa y administrador

- **Proposito**: Crear una nueva empresa con su usuario administrador en 2 pasos.
- **Roles con acceso**: Publico (sin autenticacion).
- **Funcionalidad**:
  - **Paso 1 — Datos de empresa**: nombre, NIT, pais (desplegable), zona horaria (auto-completada segun pais), moneda (auto-completada segun pais).
  - **Paso 2 — Datos del administrador**: nombre completo, email, telefono (opcional), contrasena (minimo 8 caracteres), confirmar contrasena.
  - Al completar el registro se ejecuta el seed automatico del catalogo: 3 tipos de cultivo, 8 cultivares, 10 plantillas de actividad, 6 categorias de recurso, 8 unidades de medida.
  - Login automatico tras la creacion exitosa.

#### `/invite` — Activacion de usuario invitado

- **Proposito**: Permitir que un usuario invitado por un administrador o gerente active su cuenta.
- **Roles con acceso**: Publico (requiere token de invitacion valido).
- **Funcionalidad**:
  - Los campos email, empresa y rol se muestran pre-llenados y en solo lectura.
  - El usuario establece su contrasena y opcionalmente completa nombre y telefono.
  - El token de invitacion expira a las 72 horas.
  - Si el token es invalido o expirado se muestra un mensaje de error con opcion de solicitar reenvio.

#### `/forgot-password` — Solicitud de recuperacion de contrasena

- **Proposito**: Enviar un enlace de recuperacion al email del usuario.
- **Roles con acceso**: Publico (sin autenticacion).
- **Funcionalidad**:
  - Campo para ingresar email.
  - Siempre muestra mensaje de exito ("Si el email existe, recibiras un enlace") para evitar enumeracion de cuentas.
  - El enlace se envia via Resend (no mediante GoTrue nativo).
  - Limite de velocidad aproximado: 5 solicitudes por hora.

#### `/reset-password` — Establecer nueva contrasena

- **Proposito**: Permitir al usuario definir una nueva contrasena usando el token de recuperacion.
- **Roles con acceso**: Publico (requiere token de recuperacion valido).
- **Funcionalidad**:
  - Campos: nueva contrasena (minimo 8 caracteres) y confirmacion.
  - No realiza login automatico tras el cambio; el usuario debe iniciar sesion manualmente.

---

### 2.2 Configuracion

Modulo de parametrizacion del sistema. Define la estructura organizacional, usuarios, catalogos maestros y configuracion de cultivos.

#### `/settings/profile` — Perfil personal

- **Proposito**: Editar datos personales y cambiar contrasena.
- **Roles con acceso**: Todos los roles.
- **Funcionalidad**:
  - Campos editables: nombre completo, telefono.
  - Campos de solo lectura: email, rol.
  - Cambio de contrasena: requiere verificar la contrasena actual antes de establecer una nueva.

#### `/settings/company` — Configuracion de empresa

- **Proposito**: Administrar datos generales de la empresa y controlar funcionalidades habilitadas.
- **Roles con acceso**: admin = lectura/escritura; manager, supervisor, operator, viewer = solo lectura.
- **Funcionalidad**:
  - Datos generales: nombre de empresa, NIT, pais, zona horaria, moneda.
  - Logo: carga de imagen PNG, JPG o SVG (maximo 2 MB). Se muestra en el header de la aplicacion.
  - Modo regulatorio: `strict` (bloquea operaciones sin documentos), `standard` (advierte pero no bloquea), `none` (oculta modulo regulatorio del sidebar).
  - Feature toggles: `quality` (modulo calidad), `regulatory` (modulo regulatorio), `iot` (sensores y ambiental), `field_app` (aplicacion de campo), `cost_tracking` (modulo costos). Los modulos deshabilitados desaparecen de la navegacion.

#### `/settings/users` — Gestion de usuarios

- **Proposito**: Listar, invitar, editar y gestionar usuarios de la empresa.
- **Roles con acceso**: admin = gestion completa; manager = invitar roles supervisor, operator y viewer; supervisor, operator, viewer = solo lectura.
- **Funcionalidad**:
  - Tabla de usuarios con filtros por rol, estado y busqueda por nombre/email.
  - **Invitar usuario**: email, nombre, rol, instalacion asignada, permisos especiales (`can_approve_orders`, `can_adjust_inventory`, `can_delete`).
  - **Editar usuario**: cambiar rol y permisos (no se puede editar email).
  - **Reenviar invitacion**: genera un nuevo token de invitacion y envia email.
  - **Desactivar/reactivar**: cambia el estado del usuario sin eliminarlo.

#### `/settings/catalog` — Catalogo maestro

- **Proposito**: Gestionar categorias de recursos, unidades de medida y tipos de actividad.
- **Roles con acceso**: admin, manager = lectura/escritura; supervisor, operator, viewer = solo lectura.
- **Funcionalidad**:
  - **Tab Categorias de Recurso**: arbol jerarquico con flags `is_consumable`, `is_depreciable`, `is_transformable`.
  - **Tab Unidades de Medida**: agrupadas por dimension (masa, volumen, longitud, area, temperatura, etc.), con unidad base y factor de conversion.
  - **Tab Tipos de Actividad**: lista simple con nombre y categoria.

#### `/settings/crop-types` — Tipos de cultivo

- **Proposito**: Definir los tipos de cultivo y sus fases de produccion.
- **Roles con acceso**: admin, manager = lectura/escritura; supervisor, operator, viewer = solo lectura.
- **Funcionalidad**:
  - Panel maestro: lista de tipos de cultivo con cantidad de fases.
  - Panel detalle: lista ordenable de fases con flags `is_transformation`, `is_destructive`, `can_be_entry_point`, `can_be_exit_point`, `depends_on_phase_id`.
  - Eliminacion logica (soft delete) de tipos de cultivo.

#### `/settings/cultivars` — Cultivares

- **Proposito**: Gestionar variedades dentro de cada tipo de cultivo, incluyendo rendimientos, condiciones optimas y flujos de producto por fase.
- **Roles con acceso**: admin, manager = lectura/escritura; supervisor, operator, viewer = solo lectura.
- **Funcionalidad**:
  - Agrupados por tipo de cultivo. Tarjetas con: codigo, nombre, obtentor (breeder), ciclo total, rendimiento por planta.
  - Secciones por cultivar:
    - **General**: datos basicos del cultivar.
    - **Duracion de fases**: con posibilidad de sobreescribir la duracion base del tipo de cultivo.
    - **Perfil objetivo**: datos JSONB especificos del cultivar (ej. perfil de terpenos, puntaje de taza).
    - **Condiciones optimas**: datos JSONB de temperatura, humedad, CO2, luz, EC, pH, VPD.
    - **Flujos de producto por fase**: entradas y salidas por fase, rendimiento porcentual (`yield_%`), rol del producto.
  - Acciones: copiar flujos entre cultivares, duplicar cultivar completo.

#### `/settings/activity-templates` — Plantillas de actividad y programaciones

- **Proposito**: Definir plantillas reutilizables para actividades y programaciones de cultivo por cultivar.
- **Roles con acceso**: admin, manager = lectura/escritura; supervisor, operator, viewer = solo lectura.
- **Funcionalidad**:
  - **Tab Plantillas**: codigo, tipo de actividad, frecuencia, duracion estimada, fases aplicables, recursos con `quantity_basis`, checklist con flags `is_critical` y `requires_photo`.
  - **Tab Programaciones de Cultivo**: por cultivar, configuracion de fases en formato JSONB (`phase_config`).

#### `/settings/regulatory-config` — Configuracion regulatoria

- **Proposito**: Definir tipos de documentos regulatorios y requisitos por producto y envio.
- **Roles con acceso**: admin, manager = lectura/escritura; supervisor, operator, viewer = solo lectura.
- **Visibilidad**: Oculta si el feature toggle `regulatory` esta deshabilitado.
- **Funcionalidad**:
  - **Tipos de documento**: codigo, nombre, categoria, vigencia (`valid_for_days`), constructor de formulario para `required_fields` (JSONB).
  - **Requisitos por producto**: asocia producto o categoria con tipo de documento; flags de obligatoriedad, alcance y frecuencia.
  - **Requisitos por envio**: condicion de aplicacion: `always`, `interstate`, `international`, `regulated_material`.

---

### 2.3 Areas

Modulo de infraestructura fisica. Define las instalaciones, zonas de cultivo y sus estructuras internas.

#### `/areas/facilities` — Instalaciones

- **Proposito**: Gestionar las instalaciones fisicas de la operacion.
- **Roles con acceso**: admin, manager = lectura/escritura; supervisor, operator, viewer = solo lectura.
- **Funcionalidad**:
  - Vista en tarjetas con: nombre, tipo (`warehouse`, `greenhouse`, `tunnel`, `open_field`, `vertical_farm`), area total, area de cultivo (calculada), capacidad (calculada), cantidad de zonas.
  - Dialogo para crear/editar instalacion.

#### `/areas/zones` — Zonas

- **Proposito**: Gestionar zonas dentro de las instalaciones y sus estructuras internas.
- **Roles con acceso**: admin, manager = lectura/escritura; supervisor = cambiar estado de zona; operator, viewer = solo lectura.
- **Funcionalidad**:
  - Tabla con: nombre, instalacion, proposito (`propagation`, `vegetation`, `flowering`, `drying`, `processing`, `storage`, `multipurpose`), tipo de ambiente, area, capacidad, cantidad de estructuras, lotes activos, estado (`active`, `maintenance`, `inactive`).
  - Dialogo con configuracion climatica (`climate_config` JSONB).
  - CRUD anidado de estructuras: tipos de rack, niveles, posiciones.
  - El supervisor puede cambiar el estado de la zona (activa, mantenimiento, inactiva).

#### `/areas/zones/[id]` — Detalle de zona

- **Proposito**: Vista consolidada de una zona con toda su informacion operativa.
- **Roles con acceso**: Todos los roles (solo lectura).
- **Funcionalidad**:
  - Informacion general de la zona.
  - Tabla de estructuras.
  - Lote activo en la zona.
  - Tabla de sensores asociados.
  - Lecturas ambientales de 7 parametros (temperatura, humedad, CO2, luz, EC, pH, VPD) con comparacion codificada por color contra las condiciones optimas del cultivar activo.
  - Las lecturas se actualizan automaticamente cada 60 segundos.

---

### 2.4 Inventario

Modulo de gestion de stock, transacciones, proveedores, envios y recetas de transformacion.

#### `/inventory/products` — Productos

- **Proposito**: Mantener el catalogo maestro de productos (insumos y productos finales).
- **Roles con acceso**: admin, manager = lectura/escritura; supervisor, operator, viewer = solo lectura.
- **Funcionalidad**:
  - Tabla con: SKU, nombre, categoria, unidad, tipo de aprovisionamiento (`purchased`, `produced`, `both`), trazabilidad de lote, proveedor, precio.
  - Dialogo de creacion/edicion: SKU (unico, mayusculas), propiedades (`shelf_life`, `phi_days`, `rei_hours`, `yield`, `density`), requisitos regulatorios asociados.

#### `/inventory/items` — Items de inventario (Stock)

- **Proposito**: Visualizar y gestionar el stock actual por lote.
- **Roles con acceso**: admin, manager = ajustar, transferir, cambiar estado; supervisor = transferir; operator, viewer = solo lectura.
- **Funcionalidad**:
  - KPIs: lotes activos, productos distintos, en cuarentena, expirados, valor total.
  - Tabla con: producto, numero de lote, zona, cantidad disponible/reservada/comprometida, costo, fecha de expiracion (indicador verde/amarillo/rojo), origen (`purchase`, `production`, `transfer`, `transformation`), estado (`available`, `quarantine`, `expired`, `depleted`).
  - **Acciones**:
    - **Ajustar**: modificar cantidad (+/-) con razon del ajuste.
    - **Transferir**: mover stock a otra zona.
    - **Cambiar estado**: transiciones `available` ↔ `quarantine`, → `expired`.

#### `/inventory/transactions` — Transacciones de inventario

- **Proposito**: Registro inmutable de todos los movimientos de inventario.
- **Roles con acceso**: admin, manager = lectura y exportacion; supervisor, operator, viewer = solo lectura.
- **Funcionalidad**:
  - KPIs: total entradas, total salidas, ajustes, costo total.
  - 11 tipos de transaccion: `receipt`, `consumption`, `application`, `transfer_out`, `transfer_in`, `transformation_out`, `transformation_in`, `adjustment`, `waste`, `return`, `reservation`, `release`.
  - Vista agrupada por producto, tipo, lote o zona.
  - Exportacion a CSV.

#### `/inventory/suppliers` — Proveedores

- **Proposito**: Gestionar el directorio de proveedores.
- **Roles con acceso**: admin, manager = lectura/escritura; supervisor, operator, viewer = solo lectura.
- **Funcionalidad**:
  - Tabla con: nombre, contacto, telefono, email, terminos de pago, cantidad de productos asociados.
  - Dialogo de creacion/edicion: nombre, informacion de contacto (JSONB: contacto, email, telefonos, direccion, ciudad).
  - Eliminacion logica (soft delete).

#### `/inventory/shipments` — Envios

- **Proposito**: Gestionar envios entrantes y salientes de materiales.
- **Roles con acceso**: admin, manager, supervisor = lectura/escritura; operator, viewer = solo lectura.
- **Funcionalidad**:
  - Tabs: Entrantes (Inbound) / Salientes (Outbound).
  - Maquina de estados: `scheduled` → `in_transit` → `received` → `inspecting` → `accepted` | `partial_accepted` | `rejected` | `cancelled`.
  - Codigo automatico: `SHP-YYYY-NNNN`.
  - Dialogo de creacion: tipo, proveedor/origen, instalacion destino, detalles de transporte, items (producto, cantidad, unidad, lote, costo, zona destino).

#### `/inventory/shipments/[id]` — Detalle de envio

- **Proposito**: Proceso completo de recepcion e inspeccion de un envio.
- **Roles con acceso**: admin, manager = gestion completa; supervisor = inspeccionar y confirmar; operator, viewer = solo lectura.
- **Funcionalidad**:
  - Stepper de 4 pasos: Recibido → Inspeccionado → Documentos → Confirmado.
  - **Inspeccion de items**: cantidad recibida, cantidad rechazada, resultado (`accepted`, `with_observations`, `rejected`, `quarantine`).
  - **Carga de documentos**: segun los requisitos regulatorios del envio (`shipment_doc_requirements`).
  - **Confirmar recepcion**: ejecuta Edge Function que crea automaticamente los `inventory_items` correspondientes.
  - Si el modo regulatorio es `strict`, la confirmacion se bloquea hasta que todos los documentos requeridos esten cargados.

#### `/inventory/recipes` — Recetas de transformacion

- **Proposito**: Definir y ejecutar recetas para transformar materias primas en productos finales.
- **Roles con acceso**: admin, manager = CRUD completo; supervisor = ejecutar; operator, viewer = solo lectura.
- **Funcionalidad**:
  - Datos de receta: codigo, nombre, producto de salida, cantidad base, unidad, items de entrada (JSONB).
  - **Ejecutar receta**: factor de escala, verificacion automatica de stock suficiente, creacion de transacciones de consumo y transformacion via Edge Function.

---

### 2.5 Produccion

Modulo de ordenes de produccion y seguimiento de lotes a traves de sus fases.

#### `/production/orders` — Ordenes de produccion

- **Proposito**: Crear y gestionar ordenes de produccion.
- **Roles con acceso**: admin, manager = CRUD completo; supervisor = crear borradores; operator, viewer = solo lectura.
- **Funcionalidad**:
  - Tabla con: codigo (`OP-YYYY-NNN`), cultivar, fases (entrada → salida), cantidad, produccion esperada, prioridad (`low`, `normal`, `high`, `urgent`), estado (`draft`, `approved`, `in_progress`, `completed`, `cancelled`).
  - Creacion: seleccionar cultivar → fase de entrada y salida → cantidad → calculo en cascada del rendimiento esperado via RPC.

#### `/production/orders/[id]` — Detalle de orden de produccion

- **Proposito**: Ver, editar y aprobar una orden de produccion.
- **Roles con acceso**: admin, manager = aprobar; supervisor = solo lectura; operator, viewer = solo lectura.
- **Funcionalidad**:
  - Informacion general, linea de tiempo (fases con badges de estado), tabla de rendimiento.
  - **Acciones**:
    - Editar (solo en estado `draft`).
    - Cancelar (solo en estado `draft`).
    - Aprobar: seleccionar zona → crea el lote automaticamente via Edge Function `approve-production-order` con codigo `LOT-{CULTIVAR}-{YYMMDD}-{NNN}`.

#### `/production/batches` — Lotes

- **Proposito**: Visualizar todos los lotes de produccion y su estado actual.
- **Roles con acceso**: Todos los roles (solo lectura).
- **Funcionalidad**:
  - KPIs: activos, en transicion, en espera, completados este mes.
  - Tabla con: codigo, cultivar, fase actual, zona, plantas, producto, orden asociada, fechas inicio/fin, dias en produccion, estado (`active`, `phase_transition`, `completed`, `cancelled`, `on_hold`).

#### `/production/batches/[id]` — Detalle de lote (NEXUS)

- **Proposito**: Pagina central de trazabilidad del lote con toda la informacion operativa consolidada.
- **Roles con acceso**: admin, manager = todas las operaciones; supervisor = transicion de fase, division, poner en espera; operator = lectura y registro; viewer = solo lectura.
- **Funcionalidad**:
  - Header: codigo, estado, fase actual, zona.
  - Linea de tiempo: todas las fases con indicador de progreso.
  - **6 tabs**:
    - **Actividades**: actividades programadas y ejecutadas del lote.
    - **Inventario**: transacciones de inventario asociadas.
    - **Calidad**: pruebas de calidad del lote.
    - **Regulatorio**: documentos regulatorios vinculados.
    - **Genealogia**: linaje de divisiones y fusiones del lote.
    - **Ambiente**: lecturas de sensores y graficos ambientales.
  - **Acciones**: transicionar fase (via Edge Function `transition-batch-phase`), dividir lote, poner en espera, cancelar.

---

### 2.6 Actividades

Modulo de programacion, ejecucion y seguimiento de actividades de cultivo.

#### `/activities/schedule` — Programacion de actividades

- **Proposito**: Visualizar y gestionar el calendario de actividades programadas.
- **Roles con acceso**: admin, manager, supervisor = lectura/escritura; operator = lectura de las propias; viewer = solo lectura.
- **Funcionalidad**:
  - Vistas: calendario (semanal/mensual) y lista.
  - KPIs: pendientes, completadas, vencidas, omitidas.
  - Mini-tarjetas con: nombre de plantilla, codigo de lote, badge de estado (pendiente=azul, vencida=rojo, completada=verde, omitida=gris).
  - Filtros: instalacion, zona, lote, tipo de actividad, estado, rango de fechas.
  - **Acciones**:
    - Ejecutar: redirige a `/activities/execute/[id]`.
    - Reprogramar: selector de nueva fecha.
    - Omitir: con campo de razon obligatorio.

#### `/activities/execute/[id]` — Ejecutar actividad

- **Proposito**: Formulario dinamico para registrar la ejecucion de una actividad programada.
- **Roles con acceso**: admin, manager, supervisor, operator = ejecutar; viewer = sin acceso.
- **Funcionalidad**:
  - **Seccion 1 — General**: duracion real, notas, mediciones dinamicas segun el tipo de actividad.
  - **Seccion 2 — Recursos**: lista pre-cargada desde la plantilla (escalada por cantidad de plantas), seleccion de lote de inventario, cantidad editable, posibilidad de agregar recursos no planificados.
  - **Seccion 3 — Checklist**: checkbox por item; los items marcados como `is_critical` bloquean la finalizacion si no se completan; los items con `requires_photo` exigen foto adjunta.
  - **Seccion 4 — Observaciones**: tipo (`pest`, `disease`, `deficiency`, `measurement`, `note`), severidad, foto, agente fitosanitario.
  - La ejecucion se procesa atomicamente via Edge Function `execute-activity`.

#### `/activities/history` — Historial de actividades

- **Proposito**: Consultar el registro de actividades completadas.
- **Roles con acceso**: admin, manager, supervisor = lectura; operator, viewer = lectura.
- **Funcionalidad**:
  - Tabla con: fecha, plantilla, tipo, lote, fase, zona, duracion, operador, cantidad de observaciones.
  - Detalle expandible: todos los datos de ejecucion, recursos consumidos, checklist completado, observaciones registradas.

---

### 2.7 Calidad

Modulo de pruebas de calidad sobre lotes de produccion.

#### `/quality/tests` — Pruebas de calidad

- **Proposito**: Crear y gestionar pruebas de calidad.
- **Roles con acceso**: admin, manager = lectura/escritura; supervisor, operator, viewer = solo lectura.
- **Funcionalidad**:
  - Tabla con: tipo de prueba (`potency`, `contaminants`, `heavy_metals`, `moisture`, `mycotoxins`, `pesticide_residues`, `terpene_profile`, `cup_score`, `oil_extraction`, `custom`), lote, fase, laboratorio, fecha de muestra, fecha de resultado, estado, resultado general (aprobado/reprobado).
  - Creacion: seleccionar lote + tipo de prueba + laboratorio + fecha de muestra.

#### `/quality/tests/[id]` — Detalle de prueba de calidad

- **Proposito**: Registrar y consultar los resultados de una prueba de calidad.
- **Roles con acceso**: admin, manager = registrar resultados; supervisor, operator, viewer = solo lectura.
- **Funcionalidad**:
  - Informacion general de la prueba.
  - Seccion de resultados con parametros dinamicos segun el tipo de prueba.
  - Registro de resultados: nombre del parametro, valor, unidad, rango minimo/maximo, aprobado/reprobado por parametro.
  - Establecer resultado general (`overall_pass`) y estado de la prueba.

---

### 2.8 Regulatorio

Modulo de documentos regulatorios y cumplimiento normativo. Visible solo si el feature toggle `regulatory` esta habilitado.

#### `/regulatory/documents` — Documentos regulatorios

- **Proposito**: Gestionar documentos regulatorios asociados a lotes, envios y productos.
- **Roles con acceso**: admin, manager = lectura/escritura; supervisor, operator, viewer = solo lectura.
- **Funcionalidad**:
  - Tabla con: tipo de documento, numero, lote/entidad asociada, fecha de emision, fecha de vencimiento, estado (`draft`, `valid`, `expired`, `revoked`, `superseded`), archivo adjunto.
  - Creacion: seleccionar tipo de documento → formulario dinamico generado desde `required_fields` → carga de archivo → calculo automatico de vencimiento.

#### `/regulatory/documents/[id]` — Detalle de documento regulatorio

- **Proposito**: Consultar y editar un documento regulatorio especifico.
- **Roles con acceso**: admin, manager = editar; supervisor, operator, viewer = solo lectura.
- **Funcionalidad**:
  - Todos los campos del documento.
  - Vista previa y descarga del archivo adjunto.
  - Estado de vigencia.
  - Entidad vinculada (lote, envio o producto).

---

### 2.9 Operaciones

Modulo de monitoreo operativo: alertas, lecturas ambientales, sensores y costos.

#### `/operations/alerts` — Centro de alertas

- **Proposito**: Monitorear y gestionar alertas operativas en tiempo real.
- **Roles con acceso**: admin = reconocer, resolver y eliminar; manager = reconocer y resolver; supervisor = reconocer y resolver en sus zonas; operator = lectura de alertas propias; viewer = solo lectura.
- **Funcionalidad**:
  - KPIs: criticas, altas, advertencias, informativas.
  - 11 tipos de alerta: `overdue_activity`, `stale_batch`, `order_delayed`, `low_inventory`, `expiring_item`, `env_out_of_range`, `quality_failed`, `regulatory_expiring`, `regulatory_missing`, `pest_detected`, `phi_violation`.
  - **Acciones**: reconocer (acknowledge), resolver, operaciones en lote (bulk).
  - Actualizacion en tiempo real via canales de Supabase Realtime.

#### `/operations/environmental` — Monitoreo ambiental

- **Proposito**: Visualizar lecturas ambientales de las zonas en tiempo real.
- **Roles con acceso**: Todos los roles (solo lectura).
- **Funcionalidad**:
  - Selector de zona → tarjetas de lectura actual para 7 parametros: temperatura, humedad, CO2, luz, EC, pH, VPD.
  - Codificacion por color: verde = dentro de rango, amarillo = advertencia (desviacion ±10%), rojo = fuera de rango, gris = dato obsoleto (>30 min sin lectura).
  - **Graficos**: datos crudos 24h, promedio horario 7d, promedio cada 4h 30d.
  - Comparacion con condiciones optimas del cultivar del lote activo en la zona.
  - Resumen multi-zona.
  - Actualizacion en tiempo real via Supabase Realtime.

#### `/operations/sensors` — Sensores

- **Proposito**: Gestionar el inventario de sensores IoT.
- **Roles con acceso**: admin, manager = CRUD completo; supervisor = activar/desactivar; operator, viewer = solo lectura.
- **Funcionalidad**:
  - KPIs: activos, inactivos, sin senal (>30 min), calibracion vencida (>90 dias).
  - Tabla con: zona, tipo (8 tipos: `temperature`, `humidity`, `co2`, `light`, `ec`, `ph`, `soil_moisture`, `vpd`), marca/modelo, numero de serie, fecha de calibracion, estado.
  - CRUD completo para administradores y gerentes.

#### `/operations/costs` — Costos operativos

- **Proposito**: Registrar costos overhead y calcular COGS por lote.
- **Roles con acceso**: admin, manager = CRUD y vista COGS; supervisor = solo lectura; operator = sin acceso; viewer = solo lectura.
- **Visibilidad**: Requiere feature toggle `cost_tracking` habilitado.
- **Funcionalidad**:
  - **Vista Costos**:
    - KPIs: total del mes, total mes anterior, variacion porcentual.
    - Tabla con: instalacion, zona, tipo (`energy`, `rent`, `depreciation`, `insurance`, `maintenance`, `labor_fixed`, `other`), monto, periodo, base de asignacion.
    - 5 bases de asignacion: `per_m2`, `per_plant`, `per_batch`, `per_zone`, `even_split`.
  - **Vista COGS**:
    - Por lote: costos directos + overhead = COGS total, costo por planta, costo por gramo.

---

## Parte 3: Referencia Rapida

Tablas de referencia, diagramas de maquinas de estado, datos del seed y glosario.

---

### 3.1 Matriz de Permisos RBAC

| Modulo / Pagina | admin | manager | supervisor | operator | viewer |
|---|---|---|---|---|---|
| Settings / Profile | Editar propio | Editar propio | Editar propio | Editar propio | Editar propio |
| Settings / Company | Escritura | Lectura | Lectura | Lectura | Lectura |
| Settings / Users | Gestion completa | Invitar sup/op/viewer | Lectura | Lectura | Lectura |
| Settings / Catalog | Escritura | Escritura | Lectura | Lectura | Lectura |
| Settings / Crop Types | Escritura | Escritura | Lectura | Lectura | Lectura |
| Settings / Cultivars | Escritura | Escritura | Lectura | Lectura | Lectura |
| Settings / Templates | Escritura | Escritura | Lectura | Lectura | Lectura |
| Settings / Regulatory Config | Escritura | Escritura | Lectura | Lectura | Lectura |
| Areas / Facilities | Escritura | Escritura | Lectura | Lectura | Lectura |
| Areas / Zones | Escritura | Escritura | Cambiar estado | Lectura | Lectura |
| Inventory / Products | Escritura | Escritura | Lectura | Lectura | Lectura |
| Inventory / Items | Ajustar+Transferir+Estado | Ajustar+Transferir+Estado | Transferir | Lectura | Lectura |
| Inventory / Transactions | Lectura+Exportar | Lectura+Exportar | Lectura | Lectura | Lectura |
| Inventory / Suppliers | Escritura | Escritura | Lectura | Lectura | Lectura |
| Inventory / Shipments | Escritura | Escritura | Escritura | Lectura | Lectura |
| Inventory / Shipments / [id] | Gestion completa | Gestion completa | Inspeccionar+Confirmar | Lectura | Lectura |
| Inventory / Recipes | CRUD | CRUD | Ejecutar | Lectura | Lectura |
| Production / Orders | CRUD | CRUD | Crear borrador | Lectura | Lectura |
| Production / Orders / [id] (Aprobar) | Aprobar | Aprobar | No | No | No |
| Production / Batches | Lectura | Lectura | Lectura | Lectura | Lectura |
| Production / Batches / [id] | Todas las ops | Todas las ops | Transicion+Division+Espera | Lectura+Registro | Lectura |
| Activities / Schedule | Escritura | Escritura | Escritura | Lectura propias | Lectura |
| Activities / Execute | Ejecutar | Ejecutar | Ejecutar | Ejecutar | Sin acceso |
| Activities / History | Lectura | Lectura | Lectura | Lectura | Lectura |
| Quality / Tests | Escritura | Escritura | Lectura | Lectura | Lectura |
| Quality / Tests / [id] | Registrar resultados | Registrar resultados | Lectura | Lectura | Lectura |
| Regulatory / Documents | Escritura | Escritura | Lectura | Lectura | Lectura |
| Regulatory / Documents / [id] | Editar | Editar | Lectura | Lectura | Lectura |
| Operations / Alerts | Ack+Resolver+Eliminar | Ack+Resolver | Ack+Resolver propias | Lectura propias | Lectura |
| Operations / Environmental | Lectura | Lectura | Lectura | Lectura | Lectura |
| Operations / Sensors | CRUD | CRUD | Activar/Desactivar | Lectura | Lectura |
| Operations / Costs | CRUD+COGS | CRUD+COGS | Lectura | Sin acceso | Lectura |

---

### 3.2 Maquinas de Estado

#### Envio (Shipment)

```
scheduled ──→ in_transit ──→ received ──→ inspecting ──→ accepted
    │              │                                  ├──→ partial_accepted
    │              │                                  └──→ rejected
    └──→ cancelled ←┘
```

#### Orden de Produccion

```
draft ──→ approved ──→ in_progress ──→ completed
  │
  └──→ cancelled
```

#### Lote (Batch)

```
             ┌──────────────────────┐
             v                      │
active ←──→ phase_transition ──→ completed
  │  ^
  │  │
  v  │
on_hold
  │
  └──→ active
active ──→ cancelled
```

#### Test de Calidad

```
pending ──→ in_progress ──→ completed
                        └──→ failed
```

#### Documento Regulatorio

```
draft ──→ valid ──→ expired
              ├──→ revoked
              └──→ superseded
```

#### Alerta

```
pending ──→ acknowledged ──→ resolved
```

#### Actividad Programada

```
pending ──→ completed
    │   └──→ skipped
    │
    └──→ overdue  (automatico via cron)
```

---

### 3.3 Datos de Referencia del Seed

#### Tipos de Cultivo y Fases

**Cannabis Medicinal (CANN)**

| Codigo | Fase | Duracion (dias) | Transformacion |
|---|---|---|---|
| CANN-PROP | Propagacion | 14 | No |
| CANN-VEG | Vegetacion | 28 | No |
| CANN-FLOR | Floracion | 63 | No |
| CANN-SEC | Secado | 14 | Si |
| CANN-CUR | Curado | 30 | Si |
| CANN-TRIM | Manicurado | 7 | Si |
| CANN-PKG | Empaque | 3 | Si |

**Cafe Arabica (CAFE)**

| Codigo | Fase | Duracion (dias) | Transformacion |
|---|---|---|---|
| CAFE-ALM | Almacigo | 60 | No |
| CAFE-CREC | Crecimiento | 365 | No |
| CAFE-PROD | Produccion | 180 | No |
| CAFE-COS | Cosecha | 90 | No |
| CAFE-BEN | Beneficio | 3 | Si |
| CAFE-SEC | Secado | 15 | Si |
| CAFE-TRIL | Trilla | 1 | Si |
| CAFE-TOS | Tostado | 1 | Si |
| CAFE-PKG | Empaque | 1 | Si |

**Palma de Aceite (PALMA)**

| Codigo | Fase | Duracion (dias) | Transformacion |
|---|---|---|---|
| PALMA-VIV | Vivero | 365 | No |
| PALMA-SIEM | Siembra | 30 | No |
| PALMA-CREC | Crecimiento | 1095 | No |
| PALMA-PROD | Produccion | 365 | No |
| PALMA-COS | Cosecha | 30 | No |
| PALMA-EXT | Extraccion | 1 | Si |
| PALMA-REF | Refinacion | 2 | Si |
| PALMA-PKG | Empaque | 1 | Si |

#### Cultivares

| Codigo | Nombre | Cultivo | Ciclo (dias) | Rendimiento/planta |
|---|---|---|---|---|
| OGK | OG Kush | Cannabis | 159 | 450g |
| BDR | Blue Dream | Cannabis | 159 | 500g |
| WW | White Widow | Cannabis | 159 | 400g |
| CAS | Castillo | Cafe | 726 | 1.5kg |
| GEI | Geisha | Cafe | 726 | 0.8kg |
| CAT | Caturra | Cafe | 726 | 1.2kg |
| TEN | Tenera DxP | Palma | 1889 | 25kg |
| COA | Coari x La Me OxG | Palma | 1889 | 22kg |

#### Instalaciones

| Nombre | Tipo | Area (m2) |
|---|---|---|
| Invernadero Norte | greenhouse | 2000 |
| Invernadero Sur | greenhouse | 1500 |
| Bodega Principal | warehouse | 800 |
| Campo Abierto Este | open_field | 5000 |
| Tunel de Secado | tunnel | 300 |
| Granja Vertical Piloto | vertical_farm | 200 |

#### Zonas por Instalacion

| Instalacion | Zonas |
|---|---|
| Invernadero Norte | Propagacion A, Vegetacion A, Floracion A, Floracion B |
| Invernadero Sur | Propagacion B, Vegetacion B, Floracion C |
| Bodega Principal | Secado A, Curado A, Almacen General, Almacen Frio |
| Campo Abierto Este | Lote Cafe 1, Lote Cafe 2, Lote Palma 1, Lote Palma 2 |
| Tunel de Secado | Secado B, Secado C |
| Granja Vertical Piloto | Nivel 1, Nivel 2 |

#### Productos

| SKU | Nombre | Categoria |
|---|---|---|
| FERT-NPK-001 | Fertilizante NPK 20-20-20 | Fertilizantes |
| FERT-CAL-001 | Enmienda Calcica | Fertilizantes |
| PEST-NEE-001 | Aceite de Neem | Plaguicidas |
| PEST-BT-001 | Bacillus Thuringiensis | Plaguicidas |
| SUST-TUR-001 | Turba | Sustratos |
| SUST-PER-001 | Perlita | Sustratos |
| SUST-COC-001 | Fibra de Coco | Sustratos |
| CANN-FLR-OGK | Flor OG Kush | Cannabis Flor |
| CANN-FLR-BDR | Flor Blue Dream | Cannabis Flor |
| CANN-FLR-WW | Flor White Widow | Cannabis Flor |
| CANN-TRM-GEN | Trim General | Cannabis Trim |
| CANN-EXT-GEN | Extracto General | Cannabis Extracto |
| CAFE-PER-CAS | Pergamino Castillo | Cafe Pergamino |
| CAFE-PER-GEI | Pergamino Geisha | Cafe Pergamino |
| CAFE-TOS-CAS | Tostado Castillo | Cafe Tostado |
| CAFE-TOS-GEI | Tostado Geisha | Cafe Tostado |
| CAFE-VER-GEN | Cafe Verde General | Cafe Verde |
| PALM-CPO-GEN | Aceite Crudo de Palma (CPO) | Aceite Palma |
| PALM-PKO-GEN | Aceite de Palmiste (PKO) | Aceite Palmiste |
| PALM-RBD-GEN | Aceite Refinado RBD | Aceite Refinado |
| MAT-BOL-001 | Bolsa Empaque 1kg | Material Empaque |

#### Proveedores

| Nombre | Contacto |
|---|---|
| AgroInsumos Colombia | Juan Perez |
| Sustratos del Valle | Maria Garcia |
| BioControl S.A.S. | Roberto Sanchez |
| Empaques Nacionales | Sofia Martinez |
| QuimiAgro Ltda. | Andres Lopez |
| Semillas Premium | Carolina Diaz |
| TransAgro Logistica | Felipe Torres |

#### Tipos de Documento Regulatorio

| Codigo | Nombre | Vigencia (dias) |
|---|---|---|
| LIC-CULT | Licencia de Cultivo | 365 |
| CERT-BPA | Certificado BPA | 365 |
| ANAL-LAB | Analisis de Laboratorio | 90 |
| GUIA-TRANS | Guia de Transporte | 30 |
| REG-ICA | Registro ICA | 730 |

#### Plantillas de Actividad

| Codigo | Nombre | Tipo | Cultivo |
|---|---|---|---|
| ACT-RIEGO | Riego General | Riego | Todos |
| ACT-FERT | Fertilizacion | Fertilizacion | Todos |
| ACT-PODA-CANN | Poda Cannabis | Poda | Cannabis |
| ACT-DESFOL-CANN | Defoliacion Cannabis | Mantenimiento | Cannabis |
| ACT-COSECHA-CANN | Cosecha Cannabis | Cosecha | Cannabis |
| ACT-PODA-CAFE | Poda Cafe | Poda | Cafe |
| ACT-COSECHA-CAFE | Cosecha Cafe | Cosecha | Cafe |
| ACT-FERM-CAFE | Fermentacion Cafe | Procesamiento | Cafe |
| ACT-SECADO-CAFE | Secado Cafe | Procesamiento | Cafe |
| ACT-COSECHA-PALMA | Cosecha Palma | Cosecha | Palma |

#### Sensores

| Zona | Tipo | Marca/Modelo |
|---|---|---|
| Floracion A | temperature | SensorTech / ST-T100 |
| Floracion A | humidity | SensorTech / ST-H200 |
| Floracion A | co2 | AirSense / AS-CO2-300 |
| Floracion A | light | LuxMeter / LM-PAR-400 |
| Vegetacion A | temperature | SensorTech / ST-T100 |
| Vegetacion A | humidity | SensorTech / ST-H200 |
| Propagacion A | temperature | SensorTech / ST-T100 |
| Propagacion A | humidity | SensorTech / ST-H200 |

---

### 3.4 Glosario

| Termino | Definicion |
|---|---|
| **Lote (Batch)** | Unidad central de trazabilidad. Representa un grupo de plantas o material que atraviesa fases de produccion. Codigo: `LOT-{CULTIVAR}-{YYMMDD}-{NNN}`. |
| **Cultivar** | Variedad especifica dentro de un tipo de cultivo. Define rendimientos, duraciones de fase, condiciones optimas y flujos de producto. |
| **Fase de produccion** | Etapa dentro del ciclo de vida de un cultivo (ej. propagacion, floracion, secado). Cada tipo de cultivo define sus fases. |
| **Punto de entrada/salida** | Fases marcadas como `can_be_entry_point` o `can_be_exit_point` que determinan donde puede iniciar y terminar una orden de produccion. |
| **Cascada de rendimiento** | Calculo automatico que propaga la produccion esperada desde la fase de entrada hasta la salida, aplicando el `yield_%` de cada fase. |
| **Trazabilidad de lote** | Capacidad de seguir el historial completo de un lote: orden → fases → actividades → inventario → calidad → regulatorio. |
| **Orden de produccion** | Solicitud formal para producir una cantidad de un cultivar, pasando por fases especificas. Al aprobarla se crea el lote. |
| **Envio (Shipment)** | Movimiento de materiales entrante o saliente. Pasa por un proceso de recepcion con inspeccion y documentacion. |
| **Receta** | Formula de transformacion que define insumos de entrada y producto de salida con cantidades base. Escalable por factor. |
| **Actividad programada** | Tarea de cultivo asignada a un lote, basada en una plantilla. Incluye recursos, checklist y observaciones. |
| **Test de calidad** | Prueba de laboratorio sobre un lote en una fase especifica. Tipos: potencia, contaminantes, metales pesados, humedad, micotoxinas, terpenos, etc. |
| **Documento regulatorio** | Documento legal o normativo (licencia, certificado, analisis, guia). Tiene vigencia y puede estar vinculado a lotes, envios o productos. |
| **Alerta operativa** | Notificacion automatica generada por el sistema ante condiciones que requieren atencion (actividades vencidas, inventario bajo, parametros ambientales fuera de rango, etc.). |
| **Sensor** | Dispositivo IoT que registra lecturas ambientales en una zona. 8 tipos: temperatura, humedad, CO2, luz, EC, pH, humedad de suelo, VPD. |
| **Lectura ambiental** | Dato registrado por un sensor en un momento dado. Se compara con las condiciones optimas del cultivar. |
| **Costo overhead** | Costo indirecto de operacion (energia, renta, depreciacion, mantenimiento, mano de obra fija). Se asigna a zonas y lotes segun base de asignacion. |
| **COGS** | Cost of Goods Sold. Costo total de produccion de un lote: costos directos (insumos, actividades) + overhead asignado. |
| **Flujo de producto por fase** | Definicion de que productos entran y salen de cada fase de un cultivar, con rendimiento porcentual y rol del producto. |
| **Inventario FIFO** | Metodo de gestion de inventario donde el primer lote en entrar es el primero en salir. Aplicado automaticamente en la seleccion de stock. |
| **Transaccion de inventario** | Registro inmutable de un movimiento de stock. 11 tipos: recepcion, consumo, aplicacion, transferencia, transformacion, ajuste, desperdicio, devolucion, reservacion, liberacion. |
| **RLS (Row Level Security)** | Mecanismo de seguridad a nivel de base de datos que restringe el acceso a filas segun la empresa (`company_id`) del usuario autenticado. |
