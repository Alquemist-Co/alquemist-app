# Proveedores

## Metadata

- **Ruta**: `/inventory/suppliers`
- **Roles con acceso**: admin (CRUD completo), manager (CRUD completo), supervisor (solo lectura), operator (solo lectura), viewer (solo lectura)
- **Tipo componente**: Mixto (Server Component para listado, Client Component para dialog de creación/edición)
- **Edge Functions**: Ninguna — CRUD via PostgREST

## Objetivo

Gestionar el catálogo de proveedores de la empresa: crear, editar, desactivar y consultar proveedores de insumos, material vegetal y servicios. La información de contacto se almacena en un campo JSONB estructurado que permite capturar múltiples datos sin esquema rígido.

Los proveedores son referenciados desde productos (`products.preferred_supplier_id`) y envíos (`shipments.supplier_id`), por lo que deben existir antes de configurar esas entidades.

Usuarios principales: admin y manager que gestionan la cadena de suministro.

## Tablas del modelo involucradas

| Tabla     | Operaciones | Notas                                                                        |
| --------- | ----------- | ---------------------------------------------------------------------------- |
| suppliers | R/W         | CRUD completo. RLS Pattern 1 (company_id directo). Soft delete via is_active |
| products  | R           | Referencia: mostrar qué productos tienen a este proveedor como preferido     |
| shipments | R           | Referencia: mostrar envíos asociados al proveedor (conteo)                   |

## ENUMs utilizados

Esta página no usa ENUMs del modelo de datos. Los campos son de texto libre y JSONB.

## Layout y componentes principales

Página dentro del layout de dashboard con sidebar.

- **Header de página** — Título "Proveedores" + subtítulo descriptivo + botón "Nuevo proveedor" (variant="primary", visible solo para admin/manager). Navegación via sidebar sub-items (Inventario > Productos | Proveedores)
- **Barra de filtros** — Inline
  - Input: Buscar por nombre o datos de contacto
  - Select: Estado (Todos / Activos / Inactivos)
- **Tabla de proveedores** — Server Component con datos paginados
  - Columnas: Nombre, Contacto principal (extraído de contact_info.contact_name), Teléfono (contact_info.phone), Email (contact_info.email), Condiciones de pago, Productos (count de products que lo referencian), Estado (badge: Activo/Inactivo), Acciones
  - Acciones por fila (dropdown menu, solo admin/manager):
    - "Editar" → abre dialog de edición
    - "Desactivar" / "Reactivar" → toggle is_active con confirmación
  - Paginación server-side (20 por página)
  - Ordenamiento por nombre (default) o por cantidad de productos
- **Dialog: Crear/Editar proveedor** — Modal
  - Input: Nombre (req)
  - **Sub-sección: Información de contacto** (mapea a JSONB `contact_info`)
    - Input: Nombre de contacto (opt)
    - Input: Email (opt, type="email")
    - Input: Teléfono (opt)
    - Input: Teléfono secundario (opt)
    - Input: Dirección (opt, textarea)
    - Input: Ciudad (opt)
    - Input: País (opt)
    - Input: Sitio web (opt, type="url")
    - Input: Notas de contacto (opt, textarea)
  - Input: Condiciones de pago (opt) — texto libre, ej: "30 días neto", "Contado"
  - Botón "Guardar" (variant="primary")

**Responsive**: Tabla con scroll horizontal en móvil. Dialog full-screen en móvil.

## Requisitos funcionales

- **RF-01**: Al cargar la página, obtener lista de proveedores via Server Component: `supabase.from('suppliers').select('*').eq('is_active', true).order('name')` con paginación `.range(offset, offset + limit - 1)`
- **RF-02**: Filtro de búsqueda usa PostgREST: `.or('name.ilike.%term%,contact_info->>contact_name.ilike.%term%,contact_info->>email.ilike.%term%')`
- **RF-03**: Filtro de estado permite mostrar/ocultar inactivos. Default: todos (consistente con Products)
- **RF-04**: Al crear proveedor, construir el objeto JSONB `contact_info` desde los campos individuales del sub-formulario y ejecutar: `supabase.from('suppliers').insert({ name, contact_info, payment_terms })`
- **RF-05**: El `company_id` NO se envía desde el cliente — RLS lo inyecta automáticamente vía trigger o default value
- **RF-06**: Al editar proveedor, ejecutar: `supabase.from('suppliers').update({ name, contact_info, payment_terms }).eq('id', supplierId)`
- **RF-07**: Desactivar proveedor: `supabase.from('suppliers').update({ is_active: false }).eq('id', supplierId)` — mostrar dialog de confirmación previo
- **RF-08**: *(Depende de PRD 19 — Shipments)* Si el proveedor tiene envíos pendientes (shipments con status != 'accepted' && != 'rejected' && != 'cancelled'), mostrar advertencia en el dialog de desactivación: "Este proveedor tiene envíos en curso". Se implementará cuando la tabla shipments exista
- **RF-09**: Reactivar proveedor: `supabase.from('suppliers').update({ is_active: true }).eq('id', supplierId)`
- **RF-10**: Mostrar columna de conteo de productos que referencian al proveedor: sub-query o count en la UI
- **RF-11**: Validar campos con Zod antes de enviar
- **RF-12**: Tras cualquier operación exitosa, refrescar datos via `router.refresh()` (Server Component revalidation) y mostrar toast de éxito

## Requisitos no funcionales

- **RNF-01**: RLS Pattern 1 (company_id directo) para lectura y escritura + Pattern 3 (admin/manager) para escritura
- **RNF-02**: Soft delete: `is_active = false`. Nunca borrado físico
- **RNF-03**: El JSONB `contact_info` tiene schema flexible — campos vacíos se omiten del objeto (no se guardan como strings vacíos)
- **RNF-04**: Paginación server-side evita cargar todos los proveedores en memoria
- **RNF-05**: La búsqueda en campos JSONB usa índices funcionales btree en `contact_info->>'contact_name'` y `contact_info->>'email'` para performance de queries ilike. Definidos en migración `_010_suppliers_indexes.sql`

## Flujos principales

### Happy path — Crear proveedor

1. Admin/manager navega a `/inventory/suppliers`
2. Click "Nuevo proveedor" → se abre dialog
3. Llena nombre (req), datos de contacto, condiciones de pago
4. Click "Guardar" → validación Zod pasa → botón loading
5. Insert exitoso → dialog se cierra → toast "Proveedor creado" → lista se refresca

### Happy path — Editar proveedor

1. Admin/manager click en "Editar" del dropdown de un proveedor
2. Dialog con datos actuales pre-llenados (contact_info desestructurado en campos individuales)
3. Modifica datos necesarios
4. Click "Guardar" → update exitoso → toast "Proveedor actualizado"

### Desactivar proveedor

1. Admin/manager click en "Desactivar" de un proveedor
2. Dialog de confirmación: "¿Desactivar a {nombre}? El proveedor no estará disponible para nuevos envíos."
3. *(PRD 19)* Si tiene envíos en curso, advertencia adicional
4. Confirma → update is_active=false → toast "Proveedor desactivado" → badge cambia a Inactivo

### Buscar proveedor

1. Usuario escribe en campo de búsqueda
2. Debounce 300ms → se ejecuta query con filtro ilike
3. Tabla se actualiza con resultados filtrados
4. Si no hay resultados: "No se encontraron proveedores"

### Vista solo lectura (supervisor/operator/viewer)

1. Navega a `/inventory/suppliers`
2. Ve la tabla sin botón "Nuevo proveedor"
3. No hay dropdown de acciones en las filas
4. Puede buscar y filtrar pero no crear ni editar

## Estados y validaciones

### Estados de UI — Listado

| Estado         | Descripción                                                          |
| -------------- | -------------------------------------------------------------------- |
| loading        | Manejado por Next.js Server Component (streaming/suspense boundaries si se agregan globalmente) |
| loaded         | Tabla con datos, filtros activos                                     |
| empty          | Sin proveedores — "No hay proveedores registrados. Crea el primero." |
| empty-filtered | Sin resultados para el filtro — "No se encontraron proveedores con estos filtros." |
| error          | Manejado por Next.js `error.tsx` boundary (patrón global, no per-page)  |

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
contact_info: z.object({
  contact_name: z.string().max(200).optional().or(z.literal('')),
  email: z.string().email('Formato de email inválido').optional().or(z.literal('')),
  phone: z.string().max(30).optional().or(z.literal('')),
  phone_secondary: z.string().max(30).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  country: z.string().max(100).optional().or(z.literal('')),
  website: z.string().url('Formato de URL inválido').optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal('')),
})
payment_terms: z.string().max(200, 'Máximo 200 caracteres').optional().or(z.literal(''))
```

### Errores esperados

| Escenario                        | Mensaje al usuario                                      |
| -------------------------------- | ------------------------------------------------------- |
| Nombre vacío                     | "El nombre es requerido" (inline)                       |
| Email inválido                   | "Formato de email inválido" (inline)                    |
| URL inválida                     | "Formato de URL inválido" (inline)                      |
| Nombre duplicado (misma empresa) | "Ya existe un proveedor con este nombre" (toast)        |
| Error de red                     | "Error de conexión. Intenta nuevamente" (toast)         |
| Permiso denegado (RLS)           | "No tienes permisos para modificar proveedores" (toast) |

## Dependencias

- **Páginas relacionadas**:
  - `/inventory/products` — productos referencian `preferred_supplier_id`
  - `/inventory/shipments` — envíos referencian `supplier_id`
- **Supabase client**: PostgREST para CRUD
- **Cache invalidation**: `router.refresh()` (Server Component revalidation pattern, consistente con Products)
