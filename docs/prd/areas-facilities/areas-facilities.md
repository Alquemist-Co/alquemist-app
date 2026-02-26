# Instalaciones

## Metadata

- **Ruta**: `/areas/facilities`
- **Roles con acceso**: admin (CRUD completo), manager (CRUD completo), supervisor (solo lectura), operator (solo lectura), viewer (solo lectura)
- **Tipo componente**: Mixto (Server Component para listado, Client Component para dialog de creación/edición)
- **Edge Functions**: Ninguna — CRUD via PostgREST

## Objetivo

Gestionar las instalaciones físicas (facilities) de la empresa: invernaderos, bodegas, túneles, campos abiertos y granjas verticales. Cada facility es la raíz de la jerarquía espacial y contiene N zonas. Los campos `total_growing_area_m2` y `total_plant_capacity` son **calculados automáticamente** por el trigger `trg_calculate_facility_totals` a partir de las zonas hijas — se muestran como read-only.

Las facilities son referenciadas desde zonas, envíos (destino), usuarios (assigned_facility_id) y costos overhead, por lo que deben existir antes de configurar esas entidades.

Usuarios principales: admin y manager que configuran la infraestructura.

## Tablas del modelo involucradas

| Tabla      | Operaciones | Notas                                                                        |
| ---------- | ----------- | ---------------------------------------------------------------------------- |
| facilities | R/W         | CRUD completo. RLS Pattern 1 (company_id directo). Soft delete via is_active |
| zones      | R           | Referencia: conteo de zonas por facility y cálculo de totales                |

## ENUMs utilizados

| ENUM          | Valores                                                                 | Tabla.campo     |
| ------------- | ----------------------------------------------------------------------- | --------------- |
| facility_type | indoor_warehouse \| greenhouse \| tunnel \| open_field \| vertical_farm | facilities.type |

## Layout y componentes principales

Página dentro del layout de dashboard con sidebar.

- **Header de página** — Título "Instalaciones" + breadcrumb (Áreas > Instalaciones) + botón "Nueva instalación" (variant="primary", visible solo para admin/manager)
- **Grid de cards** — Layout principal (no tabla, porque las facilities son pocas y se benefician de una vista visual)
  - Cada card muestra:
    - Nombre de la facility
    - Badge: Tipo (con icono por tipo: warehouse=🏭, greenhouse=🌿, tunnel=⛺, open_field=🌾, vertical_farm=🏢)
    - Área total de piso: `total_footprint_m2` m²
    - Área de cultivo efectiva: `total_growing_area_m2` m² (read-only, calculado)
    - Capacidad total de plantas: `total_plant_capacity` (read-only, calculado)
    - Zonas activas: count de zonas con is_active=true
    - Estado: badge Activa/Inactiva
    - Dirección (truncada)
    - Acciones: "Editar" y "Desactivar/Reactivar" (solo admin/manager)
  - Click en card → navega a `/areas/zones?facility={id}` (zonas filtradas por facility)
- **Toggle** — "Mostrar inactivas" (default off) — agrega facilities inactivas con opacidad reducida
- **Dialog: Crear/Editar instalación** — Modal
  - Input: Nombre (req)
  - Select: Tipo (req) — opciones del ENUM facility_type con labels en español:
    - indoor_warehouse → "Bodega / Indoor"
    - greenhouse → "Invernadero"
    - tunnel → "Túnel"
    - open_field → "Campo abierto"
    - vertical_farm → "Granja vertical"
  - Input: Área total de piso (req, number, m²)
  - Input: Dirección (req, textarea)
  - Input: Latitud (opt, number)
  - Input: Longitud (opt, number)
  - **Sección read-only** (solo en edición, no en creación):
    - Área de cultivo efectiva: `total_growing_area_m2` m² — "Calculado automáticamente desde las zonas"
    - Capacidad de plantas: `total_plant_capacity` — "Calculado automáticamente desde las zonas"
  - Botón "Guardar" (variant="primary")

**Responsive**: Grid de 1 columna en móvil, 2 en tablet, 3 en desktop. Dialog full-screen en móvil.

## Requisitos funcionales

- **RF-01**: Al cargar la página, obtener facilities via Server Component: `supabase.from('facilities').select('*, zones(count)').eq('is_active', true).order('name')`
- **RF-02**: El conteo de zonas se obtiene con la sub-query de count en el select de PostgREST
- **RF-03**: Los campos `total_growing_area_m2` y `total_plant_capacity` son read-only — los mantiene el trigger `trg_calculate_facility_totals` que se ejecuta cada vez que se insertan, actualizan o eliminan zonas
- **RF-04**: Al crear facility, ejecutar: `supabase.from('facilities').insert({ name, type, total_footprint_m2, address, latitude, longitude })`
- **RF-05**: El `company_id` NO se envía desde el cliente — RLS lo inyecta automáticamente
- **RF-06**: Los campos calculados (`total_growing_area_m2`, `total_plant_capacity`) inician en 0 al crear — se actualizan cuando se crean zonas
- **RF-07**: Al editar facility, ejecutar: `supabase.from('facilities').update({ name, type, total_footprint_m2, address, latitude, longitude }).eq('id', facilityId)`
- **RF-08**: Desactivar facility: `supabase.from('facilities').update({ is_active: false }).eq('id', facilityId)` — con dialog de confirmación
- **RF-09**: Si la facility tiene zonas activas, mostrar advertencia en el dialog de desactivación: "Esta instalación tiene {n} zonas activas. Desactivarla no desactivará las zonas automáticamente."
- **RF-10**: Click en la card de una facility navega a `/areas/zones?facility={facilityId}` para ver sus zonas
- **RF-11**: Toggle "Mostrar inactivas" agrega `.eq('is_active', true)` o lo remueve del query
- **RF-12**: Validar campos con Zod antes de enviar
- **RF-13**: Tras cualquier operación exitosa, invalidar query cache `['facilities']` y mostrar toast de éxito

## Requisitos no funcionales

- **RNF-01**: RLS Pattern 1 (company_id directo) para lectura y escritura + Pattern 3 (admin/manager) para escritura
- **RNF-02**: Soft delete: `is_active = false`. Nunca borrado físico
- **RNF-03**: Los campos calculados nunca se editan desde el frontend — son mantenidos exclusivamente por triggers de base de datos
- **RNF-04**: Latitud y longitud son opcionales — podrían usarse en el futuro para vista de mapa
- **RNF-05**: El trigger `trg_calculate_facility_totals` se ejecuta AFTER INSERT/UPDATE/DELETE en la tabla `zones`, actualizando los totales de la facility padre

## Flujos principales

### Happy path — Crear instalación

1. Admin/manager navega a `/areas/facilities`
2. Click "Nueva instalación" → se abre dialog
3. Llena nombre (req), tipo (req), área de piso (req), dirección (req), coordenadas (opt)
4. Click "Guardar" → validación Zod pasa → botón loading
5. Insert exitoso → dialog se cierra → toast "Instalación creada" → grid se refresca
6. La nueva facility aparece con totales en 0 (aún sin zonas)

### Happy path — Editar instalación

1. Admin/manager click en "Editar" de una facility
2. Dialog con datos actuales pre-llenados + sección read-only de campos calculados
3. Modifica datos necesarios (nombre, tipo, área, dirección)
4. Click "Guardar" → update exitoso → toast "Instalación actualizada"

### Desactivar instalación

1. Admin/manager click en "Desactivar"
2. Si tiene zonas activas: advertencia "Esta instalación tiene {n} zonas activas"
3. Dialog de confirmación: "¿Desactivar {nombre}? La instalación no estará disponible para nuevas zonas ni envíos."
4. Confirma → update is_active=false → toast "Instalación desactivada"

### Navegar a zonas de una facility

1. Usuario click en la card de una facility
2. Redirige a `/areas/zones?facility={facilityId}`
3. La página de zonas pre-filtra por esa facility

### Ver campos calculados actualizados

1. Admin crea zonas en una facility (desde `/areas/zones`)
2. Vuelve a `/areas/facilities`
3. Los campos `total_growing_area_m2` y `total_plant_capacity` reflejan los nuevos totales (mantenidos por trigger)

### Vista solo lectura (supervisor/operator/viewer)

1. Navega a `/areas/facilities`
2. Ve el grid de cards sin botón "Nueva instalación"
3. No hay acciones de editar ni desactivar
4. Puede hacer click en cards para navegar a zonas

## Estados y validaciones

### Estados de UI — Grid

| Estado  | Descripción                                                           |
| ------- | --------------------------------------------------------------------- |
| loading | Skeleton de cards mientras carga                                      |
| loaded  | Grid con cards de facilities                                          |
| empty   | Sin facilities — "No hay instalaciones registradas. Crea la primera." |
| error   | Error al cargar — "Error al cargar instalaciones. Intenta nuevamente" |

### Estados de UI — Dialog

| Estado     | Descripción                                                 |
| ---------- | ----------------------------------------------------------- |
| idle       | Campos listos (vacíos para crear, pre-llenados para editar) |
| submitting | Botón loading, campos read-only                             |
| success    | Dialog se cierra, toast éxito                               |
| error      | Toast error, formulario re-habilitado                       |

### Validaciones Zod

```
name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres')
type: z.enum(['indoor_warehouse', 'greenhouse', 'tunnel', 'open_field', 'vertical_farm'], { message: 'Selecciona un tipo de instalación' })
total_footprint_m2: z.number().positive('El área debe ser mayor a 0').max(1000000, 'Área demasiado grande')
address: z.string().min(1, 'La dirección es requerida').max(500, 'Máximo 500 caracteres')
latitude: z.number().min(-90).max(90).optional().nullable()
longitude: z.number().min(-180).max(180).optional().nullable()
```

### Errores esperados

| Escenario                        | Mensaje al usuario                                        |
| -------------------------------- | --------------------------------------------------------- |
| Nombre vacío                     | "El nombre es requerido" (inline)                         |
| Tipo no seleccionado             | "Selecciona un tipo de instalación" (inline)              |
| Área <= 0                        | "El área debe ser mayor a 0" (inline)                     |
| Dirección vacía                  | "La dirección es requerida" (inline)                      |
| Latitud fuera de rango           | "Latitud debe estar entre -90 y 90" (inline)              |
| Nombre duplicado (misma empresa) | "Ya existe una instalación con este nombre" (toast)       |
| Error de red                     | "Error de conexión. Intenta nuevamente" (toast)           |
| Permiso denegado (RLS)           | "No tienes permisos para modificar instalaciones" (toast) |

## Dependencias

- **Páginas relacionadas**:
  - `/areas/zones` — zonas hijas de cada facility
  - `/inventory/shipments` — envíos referencian `destination_facility_id`
  - `/settings/users` — usuarios referencian `assigned_facility_id`
  - `/operations/costs` — costos overhead referencian `facility_id`
- **Triggers**: `trg_calculate_facility_totals` — recalcula totales cuando cambian zonas
- **Supabase client**: PostgREST para CRUD
- **React Query**: Cache key `['facilities']` para invalidación
