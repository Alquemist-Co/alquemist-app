# Recetas / Fórmulas (BOM)

## Metadata

- **Ruta**: `/inventory/recipes`
- **Roles con acceso**: admin (CRUD completo + ejecutar), manager (CRUD completo + ejecutar), supervisor (lectura + ejecutar), operator (solo lectura), viewer (solo lectura)
- **Tipo componente**: Mixto (Server Component para listado, Client Component para formularios de creación/edición y ejecución)
- **Edge Functions**: `execute-recipe` — ejecuta una receta con factor de escala, genera transacciones de inventario y recipe_execution

## Objetivo

Gestionar fórmulas de producción (Bill of Materials): soluciones nutritivas, mezclas de sustrato, diluciones de productos fitosanitarios, o cualquier receta que combine insumos para producir un producto resultante. Cada receta define una cantidad base y un listado de items (ingredientes) en formato JSONB.

La función principal de esta página es doble: (1) CRUD de recetas como catálogo, y (2) **ejecutar** una receta con un factor de escala, lo cual genera `inventory_transactions` de consumo para cada ingrediente y de producción para el output, todo registrado en `recipe_executions`.

Usuarios principales: admin y manager que crean fórmulas; supervisores que las ejecutan.

## Tablas del modelo involucradas

| Tabla                  | Operaciones | Notas                                                                                            |
| ---------------------- | ----------- | ------------------------------------------------------------------------------------------------ |
| recipes                | R/W         | CRUD completo. Soft delete via is_active. Items como JSONB array                                 |
| recipe_executions      | R/W         | Registro de cada ejecución. Se crea al ejecutar via Edge Function                                |
| inventory_items        | R           | Lectura: verificar stock disponible de ingredientes al ejecutar                                  |
| inventory_transactions | W           | Se crean automáticamente al ejecutar: consumption por ingrediente + transformation_in por output |
| products               | R           | Referencia: producto de output y productos de cada item                                          |
| units_of_measure       | R           | Referencia: unidades de cada item y del output                                                   |

## ENUMs utilizados

| ENUM             | Valores                                                                                                                                                                    | Tabla.campo                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| transaction_type | receipt \| consumption \| application \| transfer_out \| transfer_in \| transformation_out \| transformation_in \| adjustment \| waste \| return \| reservation \| release | inventory_transactions.type (la ejecución genera consumption + transformation_in) |

## Layout y componentes principales

Página dentro del layout de dashboard con sidebar.

- **Header de página** — Título "Recetas / Fórmulas" + breadcrumb (Inventario > Recetas) + botón "Nueva receta" (variant="primary", visible solo para admin/manager)
- **Barra de filtros** — Inline
  - Input: Buscar por nombre o código
  - Select: Estado (Todos / Activos / Inactivos)
- **Tabla de recetas** — Server Component con datos paginados
  - Columnas: Código, Nombre, Producto resultante (product.name), Cantidad base + unidad, Items (count), Última ejecución (fecha o "Nunca"), Estado (badge), Acciones
  - Acciones por fila (dropdown menu):
    - "Editar" → abre dialog de edición (solo admin/manager)
    - "Ejecutar" → abre dialog de ejecución (admin/manager/supervisor)
    - "Ver ejecuciones" → expande/navega a historial de ejecuciones
    - "Desactivar" / "Reactivar" → toggle is_active (solo admin/manager)
  - Paginación server-side (20 por página)
- **Dialog: Crear/Editar receta** — Modal amplio
  - **Sección 1: Datos de la receta**
    - Input: Código (req, unique)
    - Input: Nombre (req)
    - Select: Producto resultante (req) — lista de products activos
    - Input: Cantidad base (req, number) — ej: 1000 para "1000L"
    - Select: Unidad base (req) — units_of_measure
  - **Sección 2: Ingredientes** (edita el JSONB `items`)
    - Tabla inline editable:
      - Columnas: Producto (select), Cantidad (number), Unidad (select), Acciones
      - Botón "Agregar ingrediente"
      - Cada fila tiene: Select producto (req), Input cantidad (req), Select unidad (req), botón eliminar
    - Al menos 1 ingrediente requerido
  - Botón "Guardar receta" (variant="primary")
- **Dialog: Ejecutar receta** — Modal
  - **Info de la receta** (read-only): nombre, producto resultante, cantidad base
  - Input: Factor de escala (req, number, default 1.0) — ej: 0.5 para mitad, 2.0 para doble
  - **Tabla de ingredientes escalados** (read-only, auto-calculada):
    - Columnas: Producto, Cantidad escalada (item.quantity × scale_factor), Unidad, Stock disponible (badge verde si suficiente, rojo si insuficiente)
    - Si algún ingrediente tiene stock insuficiente, se muestra advertencia y el botón de ejecutar se deshabilita
  - **Output esperado**: Producto resultante × cantidad base × factor de escala
  - Input: Cantidad real producida (opt, number) — para registrar el yield real post-ejecución
  - Select: Batch asociado (opt) — vincular la ejecución a un batch activo
  - Botón "Ejecutar receta" (variant="primary", destructive=true)

**Responsive**: Tabla con scroll horizontal. Dialogs full-screen en móvil.

## Requisitos funcionales

### CRUD de recetas

- **RF-01**: Al cargar la página, obtener recetas via Server Component: `supabase.from('recipes').select('*, output_product:products(name, sku), base_unit:units_of_measure(code)').eq('is_active', true).order('name')` con paginación
- **RF-02**: Filtro de búsqueda: `.or('name.ilike.%term%,code.ilike.%term%')`
- **RF-03**: Al crear receta, construir el JSONB `items` como array de objetos `[{product_id, quantity, unit_id}]` y ejecutar INSERT en recipes
- **RF-04**: Cada item del array JSONB debe tener product_id (UUID), quantity (number > 0) y unit_id (UUID) validados
- **RF-05**: Al editar receta, obtener datos con items parseados del JSONB y mostrar en la tabla inline
- **RF-06**: Validar que el código sea único dentro de la empresa
- **RF-07**: Al menos 1 ingrediente requerido para guardar la receta
- **RF-08**: Desactivar receta: `recipes.update({ is_active: false })` con confirmación

### Ejecución de recetas

- **RF-09**: Al abrir dialog de ejecución, obtener stock disponible de cada ingrediente: para cada item del JSONB, consultar `inventory_items` con ese product_id y sumar quantity_available
- **RF-10**: Calcular cantidades escaladas: `item.quantity × scale_factor` para cada ingrediente
- **RF-11**: Verificar que hay stock suficiente de cada ingrediente. Mostrar badge verde/rojo por línea. Si alguno es insuficiente, botón "Ejecutar" deshabilitado
- **RF-12**: Al ejecutar, invocar Edge Function `execute-recipe`:
  ```
  POST /functions/v1/execute-recipe
  {
    recipe_id: UUID,
    scale_factor: number,
    output_quantity_actual: number | null,
    batch_id: UUID | null
  }
  ```
- **RF-13**: La Edge Function ejecuta en transacción:
  1. Crea `recipe_execution` con todos los datos
  2. Por cada item: selecciona inventory_items disponibles (FIFO), crea `inventory_transaction` type='consumption'
  3. Crea nuevo `inventory_item` para el output (source_type='production')
  4. Crea `inventory_transaction` type='transformation_in' para el output
  5. Calcula yield_pct: `output_quantity_actual / (base_quantity × scale_factor) × 100`
- **RF-14**: Si `output_quantity_actual` no se provee, se usa `base_quantity × scale_factor` como valor por defecto
- **RF-15**: Tras ejecución exitosa, invalidar caches: `['recipes']`, `['inventory-items']`, `['inventory-transactions']`
- **RF-16**: Mostrar historial de ejecuciones por receta: `supabase.from('recipe_executions').select('*, user:users(full_name)').eq('recipe_id', recipeId).order('executed_at', { ascending: false })`

## Requisitos no funcionales

- **RNF-01**: RLS Pattern 1 (company_id implícito) para lectura y escritura de recetas + Pattern 3 para escritura
- **RNF-02**: Soft delete: `is_active = false`. Nunca borrado físico
- **RNF-03**: El JSONB `items` sigue schema estricto: `[{product_id: UUID, quantity: number, unit_id: UUID}]`
- **RNF-04**: La ejecución de receta es **transaccional** — si falla cualquier paso, todo se revierte. Implementado como función SQL `security definer` invocada por la Edge Function
- **RNF-05**: La verificación de stock es informativa en la UI pero la verificación real ocurre en la Edge Function (para evitar race conditions)
- **RNF-06**: Paginación server-side para el listado principal

## Flujos principales

### Happy path — Crear receta

1. Admin/manager navega a `/inventory/recipes`
2. Click "Nueva receta" → se abre dialog
3. Llena: código="SOL-STOCK-A", nombre="Solución Stock A - Vegetativo", producto resultante=SOL-STOCK-A, cantidad base=10, unidad=L
4. Agrega ingredientes:
   - Ca(NO₃)₂, 800g
   - KNO₃, 500g
   - MgSO₄, 300g
5. Click "Guardar receta" → validación pasa → insert con JSONB items → toast "Receta creada"

### Happy path — Ejecutar receta

1. Admin/manager/supervisor click "Ejecutar" en una receta
2. Dialog muestra info de la receta y tabla de ingredientes
3. Ingresa factor de escala: 5.0 (para 50L en vez de 10L base)
4. Tabla muestra cantidades escaladas: Ca(NO₃)₂=4000g, KNO₃=2500g, MgSO₄=1500g
5. Todos los ingredientes tienen stock suficiente (badges verdes)
6. Opcionalmente ingresa cantidad real producida: 49.5L
7. Opcionalmente selecciona batch asociado
8. Click "Ejecutar receta" → invoca Edge Function → transacción exitosa
9. Toast "Receta ejecutada exitosamente. Producido: 49.5L SOL-STOCK-A (yield: 99%)"
10. Caches invalidados: inventario actualizado

### Ejecutar con stock insuficiente

1. Abre dialog de ejecución con factor de escala 10.0
2. Un ingrediente (MgSO₄) tiene stock de 2000g pero se necesitan 3000g
3. Badge rojo en esa línea: "Stock insuficiente (disponible: 2000g, necesario: 3000g)"
4. Botón "Ejecutar" deshabilitado
5. Usuario ajusta factor de escala a un valor menor, o sale y repone stock

### Ver historial de ejecuciones

1. Click "Ver ejecuciones" en una receta
2. Tabla/panel muestra: fecha, ejecutado por, factor de escala, output esperado, output real, yield %, batch asociado
3. Cada fila es una `recipe_execution`

### Editar receta existente

1. Admin/manager click "Editar"
2. Dialog con datos pre-llenados + tabla de ingredientes del JSONB
3. Agrega/elimina ingredientes, modifica cantidades
4. Click "Guardar" → update del JSONB items → toast éxito

### Vista solo lectura (operator/viewer)

1. Navega a `/inventory/recipes`
2. Ve la tabla sin botón "Nueva receta"
3. No tiene acciones de editar ni ejecutar

## Estados y validaciones

### Estados de UI — Listado

| Estado         | Descripción                                                     |
| -------------- | --------------------------------------------------------------- |
| loading        | Skeleton de tabla mientras carga                                |
| loaded         | Tabla con datos, filtros activos                                |
| empty          | Sin recetas — "No hay recetas registradas. Crea la primera."    |
| empty-filtered | Sin resultados — "No se encontraron recetas"                    |
| error          | Error al cargar — "Error al cargar recetas. Intenta nuevamente" |

### Estados de UI — Dialog de Edición

| Estado     | Descripción                           |
| ---------- | ------------------------------------- |
| idle       | Campos listos                         |
| submitting | Botón loading, campos read-only       |
| success    | Dialog se cierra, toast éxito         |
| error      | Toast error, formulario re-habilitado |

### Estados de UI — Dialog de Ejecución

| Estado       | Descripción                                                       |
| ------------ | ----------------------------------------------------------------- |
| loading      | Verificando stock de ingredientes                                 |
| ready        | Stock verificado, botón habilitado (si todo disponible)           |
| insufficient | Al menos un ingrediente sin stock suficiente, botón deshabilitado |
| executing    | Botón loading, esperando respuesta de Edge Function               |
| success      | Toast éxito con yield, dialog se cierra                           |
| error        | Toast error, dialog re-habilitado                                 |

### Validaciones Zod — Receta

```
code: z.string().min(1, 'El código es requerido').max(50, 'Máximo 50 caracteres')
name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres')
output_product_id: z.string().uuid('Selecciona un producto resultante')
base_quantity: z.number().positive('La cantidad debe ser mayor a 0')
base_unit_id: z.string().uuid('Selecciona una unidad')
items: z.array(z.object({
  product_id: z.string().uuid('Selecciona un producto'),
  quantity: z.number().positive('La cantidad debe ser mayor a 0'),
  unit_id: z.string().uuid('Selecciona una unidad'),
})).min(1, 'Agrega al menos un ingrediente')
```

### Validaciones Zod — Ejecución

```
recipe_id: z.string().uuid()
scale_factor: z.number().positive('El factor debe ser mayor a 0').max(100, 'Factor demasiado grande')
output_quantity_actual: z.number().positive('Debe ser mayor a 0').optional().nullable()
batch_id: z.string().uuid().optional().nullable()
```

### Errores esperados

| Escenario                           | Mensaje al usuario                                                                           |
| ----------------------------------- | -------------------------------------------------------------------------------------------- |
| Código vacío                        | "El código es requerido" (inline)                                                            |
| Código duplicado                    | "Ya existe una receta con este código" (inline)                                              |
| Nombre vacío                        | "El nombre es requerido" (inline)                                                            |
| Producto resultante no seleccionado | "Selecciona un producto resultante" (inline)                                                 |
| Cantidad base <= 0                  | "La cantidad debe ser mayor a 0" (inline)                                                    |
| Sin ingredientes                    | "Agrega al menos un ingrediente" (inline)                                                    |
| Factor de escala <= 0               | "El factor debe ser mayor a 0" (inline)                                                      |
| Stock insuficiente (en ejecución)   | "Stock insuficiente para {producto}: disponible {n}, necesario {m}" (inline por ingrediente) |
| Error en Edge Function              | "Error al ejecutar la receta. Intenta nuevamente" (toast)                                    |
| Error de red                        | "Error de conexión. Intenta nuevamente" (toast)                                              |
| Permiso denegado                    | "No tienes permisos para ejecutar recetas" (toast)                                           |

## Dependencias

- **Páginas relacionadas**:
  - `/inventory/products` — productos deben existir para items y output (Fase 3)
  - `/settings/catalog` — units_of_measure deben existir (Fase 2)
  - `/inventory/items` — stock actualizado tras ejecución (Fase 7)
  - `/inventory/transactions` — transacciones generadas visibles en log (Fase 7)
  - `/production/batches` — ejecución puede vincularse a un batch
- **Edge Function**: `execute-recipe` — orquesta la ejecución transaccional
- **Supabase client**: PostgREST para CRUD de recetas, Edge Function para ejecución
- **React Query**: Cache keys `['recipes']`, `['recipes', recipeId]`, `['recipe-executions', recipeId]`, `['inventory-items']` para invalidación
