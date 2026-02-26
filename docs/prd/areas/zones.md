# Zonas

## Metadata

- **Ruta**: `/areas/zones`
- **Roles con acceso**: admin (CRUD completo), manager (CRUD completo), supervisor (lectura + escritura limitada: puede editar status de zona), operator (solo lectura), viewer (solo lectura)
- **Tipo componente**: Mixto (Server Component para listado, Client Component para dialog de creación/edición)
- **Edge Functions**: Ninguna — CRUD via PostgREST

## Objetivo

Gestionar las zonas (salas, naves, lotes, cuartos) dentro de las instalaciones de la empresa. Cada zona es la **unidad operativa principal** — donde viven los batches, ocurren las actividades y se toman lecturas ambientales. Las zonas pueden tener `zone_structures` (racks, mesas rolling, hileras) que se gestionan inline dentro del editor de zona.

Los campos `effective_growing_area_m2` y `plant_capacity` son **calculados automáticamente** por el trigger `trg_calculate_zone_capacity` cuando cambian las estructuras. Al insertar/actualizar/eliminar zonas, el trigger `trg_calculate_facility_totals` recalcula los totales de la facility padre.

La página soporta filtrado por facility via query param (llegando desde `/areas/facilities`).

Usuarios principales: admin y manager que configuran la infraestructura.

## Tablas del modelo involucradas

| Tabla           | Operaciones | Notas                                                                                                                       |
| --------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------- |
| zones           | R/W         | CRUD completo. RLS Pattern 2 (hereda company_id vía facility_id → facilities.company_id). Soft delete via status='inactive' |
| zone_structures | R/W         | Nested CRUD: sección inline dentro del editor de zona                                                                       |
| facilities      | R           | Select para asignar zona a facility + obtener nombre de facility para display                                               |
| batches         | R           | Referencia: conteo de batches activos por zona                                                                              |

## ENUMs utilizados

| ENUM             | Valores                                                                                   | Tabla.campo          |
| ---------------- | ----------------------------------------------------------------------------------------- | -------------------- |
| zone_purpose     | propagation \| vegetation \| flowering \| drying \| processing \| storage \| multipurpose | zones.purpose        |
| zone_environment | indoor_controlled \| greenhouse \| tunnel \| open_field                                   | zones.environment    |
| zone_status      | active \| maintenance \| inactive                                                         | zones.status         |
| structure_type   | mobile_rack \| fixed_rack \| rolling_bench \| row \| bed \| trellis_row \| nft_channel    | zone_structures.type |

## Layout y componentes principales

Página dentro del layout de dashboard con sidebar.

- **Header de página** — Título "Zonas" + breadcrumb (Áreas > Zonas) + botón "Nueva zona" (variant="primary", visible solo para admin/manager)
- **Barra de filtros** — Inline
  - Select: Instalación (Todas / lista de facilities activas) — pre-seleccionada si viene con query param `?facility={id}`
  - Select: Propósito (Todos / propagation / vegetation / flowering / drying / processing / storage / multipurpose)
  - Select: Estado (Todos / active / maintenance / inactive) — default: active
  - Input: Buscar por nombre
- **Tabla de zonas** — Server Component con datos paginados
  - Columnas: Nombre, Instalación (facility.name), Propósito (badge con label en español), Ambiente (badge), Área piso (m²), Área cultivo efectiva (m², calculado), Capacidad plantas (calculado), Estructuras (count), Batches activos (count), Estado (badge: Activa verde / Mantenimiento amarillo / Inactiva gris), Acciones
  - Acciones por fila (dropdown menu, solo admin/manager):
    - "Editar" → abre dialog de edición con sección de estructuras
    - "Ver detalle" → navega a `/areas/zones/{id}` (PRD 16)
    - "Cambiar estado" → submenu: Activa / Mantenimiento / Inactiva
  - Paginación server-side (20 por página)
  - Ordenamiento por nombre (default) o por facility
  - Click en fila → navega a `/areas/zones/{id}`
- **Dialog: Crear/Editar zona** — Modal amplio
  - **Sección 1: Datos de la zona**
    - Select: Instalación (req) — lista de facilities activas
    - Input: Nombre (req)
    - Select: Propósito (req) con labels en español:
      - propagation → "Propagación"
      - vegetation → "Vegetativo"
      - flowering → "Floración"
      - drying → "Secado"
      - processing → "Procesamiento"
      - storage → "Almacenamiento"
      - multipurpose → "Multipropósito"
    - Select: Ambiente (req) con labels en español:
      - indoor_controlled → "Indoor controlado"
      - greenhouse → "Invernadero"
      - tunnel → "Túnel"
      - open_field → "Campo abierto"
    - Input: Área de piso (req, number, m²)
    - Input: Altura (opt, number, metros)
    - JSONB Editor simplificado: Configuración climática (opt) — `climate_config`
      - Input: Temperatura objetivo (°C)
      - Input: Humedad relativa objetivo (%)
      - Input: CO₂ objetivo (ppm)
      - Input: Fotoperiodo (horas luz/oscuridad, ej: "18/6")
    - Select: Estado (req) — active / maintenance / inactive
  - **Sección 2: Estructuras** (nested CRUD, opcional)
    - Texto informativo: "Las estructuras definen la capacidad de cultivo de la zona. Si no hay estructuras, la capacidad se calcula desde el área de piso."
    - Tabla inline de `zone_structures`:
      - Columnas: Nombre, Tipo (badge), Largo (m), Ancho (m), Niveles, Posiciones/nivel, Capacidad total (calculado: levels × pos/level), Acciones
      - Botón "Agregar estructura"
      - Fila inline editable o mini-dialog:
        - Input: Nombre (req)
        - Select: Tipo (req) con labels en español:
          - mobile_rack → "Rack móvil"
          - fixed_rack → "Rack fijo"
          - rolling_bench → "Mesa rolling"
          - row → "Hilera"
          - bed → "Cama"
          - trellis_row → "Hilera de enrejado"
          - nft_channel → "Canal NFT"
        - Input: Largo (req, number, metros)
        - Input: Ancho (req, number, metros)
        - Toggle: Es móvil (default false)
        - Input: Niveles (req, number, default 1)
        - Input: Posiciones por nivel (opt, number)
        - Input: Espaciado entre plantas (opt, number, cm)
        - Input: Tamaño de maceta (opt, number, litros)
      - Acciones por fila: Editar, Eliminar (con confirmación)
    - **Campos calculados read-only** (actualizados por trigger):
      - Área de cultivo efectiva: `effective_growing_area_m2` — "Calculado: Σ(largo × ancho × niveles) de las estructuras"
      - Capacidad de plantas: `plant_capacity` — "Calculado: Σ(max_positions) de las estructuras"
  - Botón "Guardar zona" (variant="primary")

**Responsive**: Tabla de listado con scroll horizontal. Dialog apilado verticalmente en móvil.

## Requisitos funcionales

- **RF-01**: Al cargar la página, obtener zonas via Server Component: `supabase.from('zones').select('*, facility:facilities(name), structures:zone_structures(count)').eq('status', 'active').order('name')` con paginación
- **RF-02**: Si query param `?facility={id}` presente, pre-filtrar: `.eq('facility_id', facilityId)`
- **RF-03**: Filtros se aplican como query params en la URL para deep-linking
- **RF-04**: Los campos `effective_growing_area_m2` y `plant_capacity` son read-only — los mantiene el trigger `trg_calculate_zone_capacity` que se ejecuta cada vez que cambian `zone_structures`
- **RF-05**: Al crear zona, ejecutar INSERT en zones. Si hay estructuras, ejecutar INSERT batch en `zone_structures` con el zone_id retornado
- **RF-06**: Al guardar estructuras, el trigger `trg_calculate_zone_capacity` recalcula los campos de la zona. A su vez, `trg_calculate_facility_totals` recalcula los totales de la facility padre
- **RF-07**: Para zonas sin estructuras (ej: campo abierto), los campos calculados usan el área de piso directamente: `effective_growing_area_m2 = area_m2`, `plant_capacity` puede ser estimado por el usuario
- **RF-08**: Al editar zona, obtener datos + estructuras: `supabase.from('zones').select('*, structures:zone_structures(*)').eq('id', zoneId).single()`
- **RF-09**: Las estructuras se pueden agregar, editar y eliminar independientemente. Cada operación es un INSERT/UPDATE/DELETE individual en `zone_structures`
- **RF-10**: El campo `max_positions` de cada estructura es calculado: `num_levels × positions_per_level`. Se muestra como read-only
- **RF-11**: Cambiar estado de zona se hace inline desde el listado: `zones.update({ status: newStatus }).eq('id', zoneId)`
- **RF-12**: No se puede cambiar una zona a "Inactiva" si tiene batches activos — mostrar error: "Esta zona tiene batches activos. Mueve los batches antes de desactivar."
- **RF-13**: Validar campos con Zod antes de enviar
- **RF-14**: Tras operación exitosa, invalidar caches: `['zones']`, `['zones', zoneId]`, `['facilities']` (porque los totales de facility pueden cambiar)

## Requisitos no funcionales

- **RNF-01**: RLS Pattern 2 — zones no tiene company_id directo; hereda aislamiento vía `facility_id → facilities.company_id`. La política RLS hace JOIN con facilities para verificar tenant
- **RNF-02**: Los campos calculados nunca se editan desde el frontend — son mantenidos exclusivamente por triggers
- **RNF-03**: El trigger `trg_calculate_zone_capacity` se ejecuta AFTER INSERT/UPDATE/DELETE en `zone_structures`
- **RNF-04**: El trigger `trg_calculate_facility_totals` se ejecuta AFTER INSERT/UPDATE/DELETE en `zones`
- **RNF-05**: La configuración climática (`climate_config`) es un JSONB con schema flexible — campos vacíos se omiten
- **RNF-06**: Paginación server-side para el listado principal

## Flujos principales

### Happy path — Crear zona con estructuras

1. Admin/manager navega a `/areas/zones` (opcionalmente con `?facility=...`)
2. Click "Nueva zona" → se abre dialog
3. Selecciona facility, llena nombre, propósito, ambiente, área, estado
4. En sección de estructuras, click "Agregar estructura"
5. Llena: nombre="Rack A1", tipo=mobile_rack, largo=6, ancho=1.2, niveles=4, posiciones/nivel=12
6. Agrega otra estructura: "Rack A2" con mismos datos
7. Los campos calculados muestran: área efectiva = (6×1.2×4)×2 = 57.6 m², capacidad = (4×12)×2 = 96
8. Click "Guardar zona" → insert zona + 2 estructuras → triggers recalculan → toast "Zona creada"

### Happy path — Crear zona simple (sin estructuras)

1. Crea zona de tipo "Campo abierto", sin estructuras
2. Los campos calculados usan el área de piso directamente
3. Zona creada con capacidad basada en área

### Editar zona y agregar estructuras

1. Click "Editar" en una zona existente
2. Dialog muestra datos actuales + tabla de estructuras (puede estar vacía)
3. Agrega nuevas estructuras
4. Elimina una estructura existente (con confirmación)
5. Los campos calculados se actualizan al guardar (vía triggers)

### Cambiar estado de zona

1. Admin/manager click "Cambiar estado" → selecciona "Mantenimiento"
2. Si es a "Inactiva" y tiene batches activos → error: "Tiene batches activos"
3. Si no hay conflicto → update estado → toast "Estado actualizado" → badge cambia

### Filtrar por facility (navegación desde facilities)

1. Usuario navega desde `/areas/facilities` clickeando una card
2. Llega a `/areas/zones?facility={id}`
3. El select de facility pre-seleccionado, tabla filtrada
4. Puede cambiar el filtro de facility o seleccionar "Todas"

### Vista solo lectura (operator/viewer)

1. Navega a `/areas/zones`
2. Ve la tabla sin botón "Nueva zona" y sin acciones de edición
3. Puede hacer click en filas para ir al detalle (`/areas/zones/{id}`)

## Estados y validaciones

### Estados de UI — Listado

| Estado         | Descripción                                                   |
| -------------- | ------------------------------------------------------------- |
| loading        | Skeleton de tabla mientras carga                              |
| loaded         | Tabla con datos, filtros activos                              |
| empty          | Sin zonas — "No hay zonas registradas. Crea la primera."      |
| empty-filtered | Sin resultados — "No se encontraron zonas"                    |
| error          | Error al cargar — "Error al cargar zonas. Intenta nuevamente" |

### Estados de UI — Dialog

| Estado     | Descripción                                                 |
| ---------- | ----------------------------------------------------------- |
| idle       | Campos listos (vacíos para crear, pre-llenados para editar) |
| submitting | Botón loading, campos read-only                             |
| success    | Dialog se cierra, toast éxito                               |
| error      | Toast error, formulario re-habilitado                       |

### Validaciones Zod — Zona

```
facility_id: z.string().uuid('Selecciona una instalación')
name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres')
purpose: z.enum(['propagation', 'vegetation', 'flowering', 'drying', 'processing', 'storage', 'multipurpose'], { message: 'Selecciona un propósito' })
environment: z.enum(['indoor_controlled', 'greenhouse', 'tunnel', 'open_field'], { message: 'Selecciona un ambiente' })
area_m2: z.number().positive('El área debe ser mayor a 0').max(100000, 'Área demasiado grande')
height_m: z.number().positive('La altura debe ser mayor a 0').optional().nullable()
climate_config: z.object({
  temperature: z.number().optional().nullable(),
  humidity: z.number().min(0).max(100).optional().nullable(),
  co2: z.number().nonnegative().optional().nullable(),
  photoperiod: z.string().max(20).optional().or(z.literal('')),
}).optional().nullable()
status: z.enum(['active', 'maintenance', 'inactive'], { message: 'Selecciona un estado' })
```

### Validaciones Zod — Estructura

```
name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres')
type: z.enum(['mobile_rack', 'fixed_rack', 'rolling_bench', 'row', 'bed', 'trellis_row', 'nft_channel'], { message: 'Selecciona un tipo' })
length_m: z.number().positive('Debe ser mayor a 0')
width_m: z.number().positive('Debe ser mayor a 0')
is_mobile: z.boolean().default(false)
num_levels: z.number().int().min(1, 'Mínimo 1 nivel').default(1)
positions_per_level: z.number().int().positive('Debe ser mayor a 0').optional().nullable()
spacing_cm: z.number().positive('Debe ser mayor a 0').optional().nullable()
pot_size_L: z.number().positive('Debe ser mayor a 0').optional().nullable()
```

### Errores esperados

| Escenario                           | Mensaje al usuario                                                                |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| Facility no seleccionada            | "Selecciona una instalación" (inline)                                             |
| Nombre vacío                        | "El nombre es requerido" (inline)                                                 |
| Propósito no seleccionado           | "Selecciona un propósito" (inline)                                                |
| Ambiente no seleccionado            | "Selecciona un ambiente" (inline)                                                 |
| Área <= 0                           | "El área debe ser mayor a 0" (inline)                                             |
| Desactivar zona con batches activos | "Esta zona tiene batches activos. Mueve los batches antes de desactivar." (toast) |
| Nombre estructura vacío             | "El nombre es requerido" (inline)                                                 |
| Tipo estructura no seleccionado     | "Selecciona un tipo" (inline)                                                     |
| Error de red                        | "Error de conexión. Intenta nuevamente" (toast)                                   |
| Permiso denegado (RLS)              | "No tienes permisos para modificar zonas" (toast)                                 |

## Dependencias

- **Páginas relacionadas**:
  - `/areas/facilities` — las facilities deben existir antes de crear zonas (Fase 3)
  - `/areas/zones/[id]` — página de detalle de zona (PRD 16)
  - `/production/batches` — batches viven en zonas
  - `/operations/sensors` — sensores se asignan a zonas
  - `/operations/environmental` — lecturas por zona
- **Triggers**:
  - `trg_calculate_zone_capacity` — recalcula campos de zona cuando cambian estructuras
  - `trg_calculate_facility_totals` — recalcula totales de facility cuando cambian zonas
- **Supabase client**: PostgREST para CRUD
- **React Query**: Cache keys `['zones']`, `['zones', zoneId]`, `['facilities']` para invalidación
