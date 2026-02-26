# Configuración de Empresa

## Metadata

- **Ruta**: `/settings/company`
- **Roles con acceso**: admin (lectura y escritura), manager (solo lectura), supervisor, operator, viewer (solo lectura)
- **Tipo componente**: Mixto (Server Component para carga inicial, Client Component para formularios)
- **Edge Functions**: Ninguna — CRUD via PostgREST

## Objetivo

Permitir al administrador configurar los datos de la empresa y sus preferencias operativas. Esta página es el destino post-signup y define configuraciones que afectan al comportamiento global del sistema: zona horaria (cálculos de fechas), moneda (costos e inventario), modo regulatorio (bloqueo o no de operaciones) y features habilitados (qué módulos del sistema son visibles).

Los demás roles pueden ver la configuración pero no modificarla.

Usuarios principales: admin de la empresa.

## Tablas del modelo involucradas

| Tabla     | Operaciones | Notas                                                                                                                                                |
| --------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| companies | R/W         | Leer y escribir: name, legal_id, country, timezone, currency, settings (JSONB), is_active. RLS Pattern 1 (company_id) + Pattern 3 (write solo admin) |

## ENUMs utilizados

Esta página no usa ENUMs del modelo de datos. Los valores de `regulatory_mode` y `features_enabled` son campos dentro del JSONB `settings`, definidos a nivel de aplicación:

| Campo JSONB                             | Valores                    | Ubicación          |
| --------------------------------------- | -------------------------- | ------------------ |
| settings.regulatory_mode                | strict \| standard \| none | companies.settings |
| settings.features_enabled.quality       | true \| false              | companies.settings |
| settings.features_enabled.regulatory    | true \| false              | companies.settings |
| settings.features_enabled.iot           | true \| false              | companies.settings |
| settings.features_enabled.field_app     | true \| false              | companies.settings |
| settings.features_enabled.cost_tracking | true \| false              | companies.settings |
| settings.regulatory_blocking_enabled    | true \| false              | companies.settings |

## Layout y componentes principales

Página dentro del layout de dashboard con sidebar. Estructura en secciones agrupadas por tema.

- **Header de página** — Título "Configuración de Empresa" + breadcrumb (Settings > Empresa)
- **Banner informativo** (solo roles no-admin) — "Solo el administrador puede modificar esta configuración"
- **Sección 1: Datos Básicos** — Card con formulario
  - Input: Nombre de empresa (req)
  - Input: Identificación legal / NIT / RFC (opt)
  - Select nativo: País (req) — lista ISO 3166-1 alpha-2
  - Select nativo: Zona horaria (req) — filtrada por país seleccionado
  - Select nativo: Moneda (req) — prefijada por país
- **Sección 2: Logo** — Card
  - Área de upload con preview del logo actual (si existe)
  - Botón "Subir logo" — acepta PNG, JPG, SVG, max 2MB
  - Botón "Eliminar logo" (si hay logo actual)
  - El logo se guarda como URL en `settings.logo_url` via Supabase Storage
- **Sección 3: Modo Regulatorio** — Card
  - Radio group: modo regulatorio (strict / standard / none)
    - **Estricto**: Documentos regulatorios obligatorios bloquean operaciones (envíos, transiciones de fase)
    - **Estándar**: Documentos requeridos generan alertas pero no bloquean operaciones
    - **Sin regulatorio**: Módulo regulatorio deshabilitado
  - Toggle: `regulatory_blocking_enabled` — visible solo si modo = strict. Controla si la falta de documentos bloquea operaciones o solo genera advertencias críticas
- **Sección 4: Módulos Habilitados** — Card
  - 5 toggles (Switch) con descripción:
    - Calidad (quality) — "Módulo de tests de laboratorio y control de calidad"
    - Regulatorio (regulatory) — "Documentos regulatorios, compliance y trazabilidad"
    - IoT (iot) — "Monitoreo ambiental con sensores"
    - App de Campo (field_app) — "Interfaz móvil para operarios"
    - Costos (cost_tracking) — "Seguimiento de costos overhead y COGS por batch"
- **Botón "Guardar cambios"** — (variant="primary", full-width en sección inferior)
- **Warning dialog** — Modal de confirmación al cambiar timezone o currency

**Responsive**: Secciones apiladas en una columna, max-width ~700px centrado en desktop.

## Requisitos funcionales

- **RF-01**: Al cargar la página, obtener datos de la empresa via Server Component: `supabase.from('companies').select('*').eq('id', user.company_id).single()`
- **RF-02**: Pre-llenar todos los campos con valores actuales. El JSONB `settings` se desestructura en los campos individuales del formulario
- **RF-03**: Roles no-admin ven todos los campos como read-only (inputs deshabilitados, toggles deshabilitados, sin botón guardar)
- **RF-04**: El select de timezone se filtra al cambiar país (misma lógica que signup)
- **RF-05**: El select de moneda se pre-selecciona al cambiar país (misma lógica que signup)
- **RF-06**: Al cambiar timezone o currency, mostrar warning dialog antes de guardar: "Cambiar la zona horaria/moneda afectará los cálculos de fechas/costos existentes. ¿Deseas continuar?"
- **RF-07**: El usuario debe confirmar el warning dialog para que el cambio de timezone/currency se incluya en el save
- **RF-08**: Validar campos con Zod antes de enviar
- **RF-09**: Al guardar, reconstruir el JSONB `settings` desde los valores individuales y ejecutar: `supabase.from('companies').update({ name, legal_id, country, timezone, currency, settings }).eq('id', company_id)`
- **RF-10**: El `company_id` NO se envía como filtro desde el cliente — RLS lo inyecta automáticamente desde el JWT
- **RF-11**: Upload de logo: subir archivo a Supabase Storage bucket `company-logos/{company_id}/logo.{ext}`, obtener URL pública, guardar en `settings.logo_url`
- **RF-12**: Eliminar logo: borrar archivo de Storage y setear `settings.logo_url = null`
- **RF-13**: Tras guardar exitosamente, actualizar auth-store con los nuevos datos de empresa y mostrar toast de éxito
- **RF-14**: Si `regulatory_mode` cambia a 'none', deshabilitar automáticamente el toggle de `regulatory` en features_enabled
- **RF-15**: Invalidar queries de React Query que dependan de company config: `['company']`

## Requisitos no funcionales

- **RNF-01**: RLS Pattern 1 (company_id) para lectura + Pattern 3 (admin only) para escritura
- **RNF-02**: Los datos estáticos (países, timezones, monedas) se cargan desde archivos estáticos, no desde la base de datos
- **RNF-03**: El upload de logo comprime imágenes client-side (max 400x400px, calidad 90%)
- **RNF-04**: El warning dialog de timezone/currency es bloqueante — no se puede guardar sin confirmar
- **RNF-05**: Los toggles de features deshabilitados ocultan las rutas correspondientes en el sidebar (manejado por el layout, no esta página)
- **RNF-06**: Cambios en settings se propagan a todo el sistema via invalidación de cache — no requiere reload

## Flujos principales

### Happy path — Editar datos básicos

1. Admin navega a `/settings/company`
2. Server Component carga datos de la empresa
3. Formulario pre-llenado con valores actuales
4. Admin modifica nombre y/o legal_id
5. Click "Guardar cambios" → validación Zod pasa → botón loading
6. `companies.update()` exitoso → toast "Configuración guardada" → auth-store actualizado

### Cambiar timezone (con warning)

1. Admin cambia el select de timezone
2. Click "Guardar cambios"
3. Se muestra warning dialog: "Cambiar la zona horaria afectará los cálculos de fechas existentes. ¿Deseas continuar?"
4. Admin confirma → save ejecuta → toast éxito
5. Si cancela → timezone revierte al valor original

### Cambiar currency (con warning)

1. Admin cambia el select de moneda
2. Click "Guardar cambios"
3. Warning dialog similar al de timezone pero para moneda
4. Mismo flujo de confirmación/cancelación

### Upload de logo

1. Admin click en "Subir logo" o arrastra archivo al área de upload
2. Validación client-side: tipo (PNG/JPG/SVG), tamaño (max 2MB)
3. Compresión client-side si es imagen raster
4. Upload a Supabase Storage → obtiene URL
5. URL se guarda en `settings.logo_url` como parte del save general
6. Preview se actualiza inmediatamente

### Cambiar modo regulatorio

1. Admin selecciona modo regulatorio distinto
2. Si cambia a "none", toggle de `regulatory` en features se deshabilita automáticamente con tooltip "Deshabilitado porque el modo regulatorio está en 'Sin regulatorio'"
3. Si cambia de "none" a otro modo, toggle de regulatory se re-habilita
4. Save normal

### Vista de solo lectura (no-admin)

1. Manager/supervisor/operator/viewer navega a `/settings/company`
2. Banner informativo visible: "Solo el administrador puede modificar esta configuración"
3. Todos los campos visibles pero deshabilitados
4. No hay botón "Guardar cambios"

## Estados y validaciones

### Estados de UI

| Estado     | Descripción                                                          |
| ---------- | -------------------------------------------------------------------- |
| loading    | Server Component cargando datos                                      |
| idle       | Formulario con datos actuales, botón deshabilitado si no hay cambios |
| dirty      | Al menos un campo modificado, botón habilitado                       |
| warning    | Dialog de confirmación visible (timezone o currency cambiaron)       |
| uploading  | Logo subiendo a Storage                                              |
| submitting | Botón loading, campos read-only                                      |
| success    | Toast éxito, botón vuelve a deshabilitado                            |
| error      | Toast error, formulario re-habilitado                                |
| read-only  | Para roles no-admin — todos los campos deshabilitados                |

### Validaciones Zod

```
name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres')
legal_id: z.string().max(50, 'Máximo 50 caracteres').optional().or(z.literal(''))
country: z.string().length(2, 'Selecciona un país')
timezone: z.string().min(1, 'Selecciona una zona horaria')
currency: z.string().length(3, 'Selecciona una moneda')
regulatory_mode: z.enum(['strict', 'standard', 'none'], { message: 'Selecciona un modo regulatorio' })
regulatory_blocking_enabled: z.boolean()
features_enabled: z.object({
  quality: z.boolean(),
  regulatory: z.boolean(),
  iot: z.boolean(),
  field_app: z.boolean(),
  cost_tracking: z.boolean(),
})
logo_url: z.string().url().nullable().optional()
```

### Errores esperados

| Escenario              | Mensaje al usuario                                             |
| ---------------------- | -------------------------------------------------------------- |
| Nombre vacío           | "El nombre es requerido" (inline)                              |
| País no seleccionado   | "Selecciona un país" (inline)                                  |
| Logo > 2MB             | "El archivo no puede superar 2MB" (toast)                      |
| Logo tipo inválido     | "Solo se permiten archivos PNG, JPG o SVG" (toast)             |
| Error de red           | "Error de conexión. Intenta nuevamente" (toast)                |
| Permiso denegado (RLS) | "No tienes permisos para modificar esta configuración" (toast) |

## Dependencias

- **Páginas relacionadas**:
  - `/signup` — redirige aquí post-registro para completar configuración
  - `/settings/profile` — información de empresa visible en perfil
  - Sidebar layout — lee `settings.features_enabled` para mostrar/ocultar módulos
- **Supabase client**: `src/lib/supabase/browser.ts` — PostgREST para companies
- **Supabase Storage**: Bucket `company-logos` para upload de logo
- **Store**: `src/stores/auth-store.ts` — actualizar datos de empresa post-save
- **React Query**: Cache key `['company']` para invalidación
- **Datos estáticos**: Lista de países (ISO 3166-1), timezones por país, monedas por país (compartido con signup)
