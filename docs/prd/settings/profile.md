# Perfil de Usuario

## Metadata

- **Ruta**: `/settings/profile`
- **Roles con acceso**: admin, manager, supervisor, operator, viewer (todos)
- **Tipo componente**: Mixto (Server Component para carga inicial, Client Component para formularios)
- **Edge Functions**: Ninguna — usa Supabase Auth SDK para cambio de password + PostgREST para datos de perfil

## Objetivo

Permitir a cualquier usuario autenticado ver y editar su información personal (nombre, teléfono) y cambiar su contraseña. El email y el rol son de solo lectura — el email se establece al crear la cuenta y el rol solo lo modifica un admin desde `/settings/users`.

Usuarios principales: todos los roles del sistema.

## Tablas del modelo involucradas

| Tabla      | Operaciones | Notas                                                                                                 |
| ---------- | ----------- | ----------------------------------------------------------------------------------------------------- |
| users      | R/W         | Leer perfil completo; escribir full_name, phone. Filtrado por RLS a registro propio (id = auth.uid()) |
| companies  | R           | Leer nombre de empresa y configuración para contexto visual                                           |
| auth.users | W           | Cambio de contraseña via `supabase.auth.updateUser({ password })` — manejado por Supabase Auth SDK    |
| facilities | R           | Leer nombre de facility asignada (assigned_facility_id) para mostrar info                             |

## ENUMs utilizados

| ENUM      | Valores                                              | Tabla.campo                           |
| --------- | ---------------------------------------------------- | ------------------------------------- |
| user_role | admin \| manager \| supervisor \| operator \| viewer | users.role (read-only en esta página) |

## Layout y componentes principales

Página dentro del layout de dashboard con sidebar. Estructura en dos secciones separadas visualmente.

- **Header de página** — Título "Mi Perfil" + breadcrumb (Settings > Perfil)
- **Sección 1: Información Personal** — Card con formulario
  - Avatar placeholder con iniciales del nombre (read-only, sin upload en esta fase)
  - Input: Email (read-only, deshabilitado, con icono de candado)
  - Input: Nombre completo (editable, req)
  - Input: Teléfono (editable, opt)
  - Badge: Rol (read-only, variant por rol: admin=red, manager=blue, supervisor=green, operator=yellow, viewer=gray)
  - Texto informativo: Empresa (nombre de company) + Instalación asignada (nombre de facility, si aplica)
  - Botón "Guardar cambios" (variant="primary")
- **Sección 2: Cambiar Contraseña** — Card separada
  - Input: Contraseña actual (type="password", autocomplete="current-password")
  - Input: Nueva contraseña (type="password", autocomplete="new-password")
  - Input: Confirmar nueva contraseña (type="password", autocomplete="new-password")
  - Indicador visual de fortaleza de password (débil/media/fuerte basado en longitud y complejidad)
  - Botón "Cambiar contraseña" (variant="outline")

**Responsive**: Secciones apiladas en una columna, max-width ~600px centrado en desktop.

## Requisitos funcionales

- **RF-01**: Al cargar la página, obtener datos del usuario actual via Server Component: `supabase.from('users').select('id, email, full_name, phone, role, company:companies(name)').eq('id', auth.uid()).single()` — facility join diferido hasta Phase 3 cuando exista la tabla facilities
- **RF-02**: Sección de info personal: permitir editar solo `full_name` y `phone`. Email, rol, empresa y facility son read-only
- **RF-03**: Validar campos de info personal con Zod antes de enviar
- **RF-04**: Al guardar info personal, ejecutar `supabase.from('users').update({ full_name, phone }).eq('id', auth.uid())`
- **RF-05**: RLS garantiza que el usuario solo puede modificar su propio registro — no se envía `id` desde el cliente, se filtra por `auth.uid()` en la política
- **RF-06**: Sección de cambio de contraseña es un formulario independiente con su propio estado y submit
- **RF-07**: Validar contraseña actual no vacía, nueva contraseña min 8 caracteres, confirmación coincide
- **RF-08**: Para cambiar contraseña, primero verificar la contraseña actual intentando `supabase.auth.signInWithPassword({ email, password: currentPassword })`. Si falla, mostrar error "Contraseña actual incorrecta"
- **RF-09**: Si verificación exitosa, ejecutar `supabase.auth.updateUser({ password: newPassword })` para cambiar la contraseña
- **RF-10**: Tras cambio exitoso de contraseña, limpiar los 3 campos y mostrar toast de éxito
- **RF-11**: Tras guardar info personal exitosamente, llamar `refreshUser()` del AuthProvider (React Context + React Query) para actualizar sidebar y mostrar toast de éxito
- **RF-12**: `refreshUser()` invalida query cache de React Query para `['auth-user']` — re-fetch automático

## Requisitos no funcionales

- **RNF-01**: El formulario de info personal y el de contraseña operan de forma independiente — un error en uno no afecta al otro
- **RNF-02**: La contraseña actual nunca se almacena en estado persistente del cliente
- **RNF-03**: El campo de email deshabilitado no se incluye en el payload de update (prevención de manipulación)
- **RNF-04**: El campo de rol no se incluye en el payload de update
- **RNF-05**: Feedback visual inmediato al guardar (loading state en botón, toast de éxito/error)
- **RNF-06**: RLS Pattern 1 (company_id) + política especial para users: cada usuario solo puede UPDATE su propio registro

## Flujos principales

### Happy path — Editar info personal

1. Usuario navega a `/settings/profile`
2. Server Component carga datos del usuario via Supabase
3. Formulario se pre-llena con full_name, phone, email (read-only), rol (badge)
4. Usuario modifica nombre y/o teléfono
5. Click "Guardar cambios" → validación Zod pasa → botón loading
6. `users.update()` exitoso → toast "Perfil actualizado" → auth-store actualizado

### Happy path — Cambiar contraseña

1. Usuario llena contraseña actual, nueva y confirmación
2. Click "Cambiar contraseña" → validación Zod pasa → botón loading
3. `signInWithPassword()` con contraseña actual exitoso → verificación pasa
4. `updateUser({ password })` exitoso
5. Toast "Contraseña actualizada" → campos limpiados

### Contraseña actual incorrecta

1. Usuario llena los 3 campos
2. Click "Cambiar contraseña" → validación Zod pasa
3. `signInWithPassword()` con contraseña actual falla
4. Toast error: "La contraseña actual es incorrecta"
5. Campo de contraseña actual resaltado con error, los 3 campos se mantienen

### Passwords no coinciden

1. Usuario llena nueva contraseña y confirmación con valores distintos
2. Validación Zod falla en refinamiento
3. Error inline en campo de confirmación: "Las contraseñas no coinciden"
4. No se envía request

### Sin cambios en info personal

1. Usuario no modifica ningún campo y hace click en "Guardar"
2. Botón "Guardar cambios" está deshabilitado si no hay cambios (comparar con valores iniciales)

## Estados y validaciones

### Estados de UI — Info Personal

| Estado     | Descripción                                                          |
| ---------- | -------------------------------------------------------------------- |
| idle       | Formulario con datos actuales, botón deshabilitado si no hay cambios |
| dirty      | Al menos un campo modificado, botón habilitado                       |
| submitting | Botón loading, campos read-only                                      |
| success    | Toast éxito, botón vuelve a deshabilitado                            |
| error      | Toast error, formulario re-habilitado                                |

### Estados de UI — Cambiar Contraseña

| Estado     | Descripción                                     |
| ---------- | ----------------------------------------------- |
| idle       | Campos vacíos                                   |
| submitting | Botón loading, campos read-only                 |
| verifying  | Verificando contraseña actual (paso intermedio) |
| success    | Toast éxito, campos limpiados                   |
| error      | Toast error, campos se mantienen                |

### Validaciones Zod — Info Personal

```
full_name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres')
phone: z.string().max(20, 'Máximo 20 caracteres').optional().or(z.literal(''))
```

### Validaciones Zod — Cambiar Contraseña

```
current_password: z.string().min(1, 'La contraseña actual es requerida')
new_password: z.string().min(8, 'Mínimo 8 caracteres')
confirm_password: z.string().min(1, 'Confirma la nueva contraseña')
```

Con refinamiento: `confirm_password` debe coincidir con `new_password`. Mensaje: "Las contraseñas no coinciden".

### Errores esperados

| Escenario                    | Mensaje al usuario                              |
| ---------------------------- | ----------------------------------------------- |
| Nombre vacío                 | "El nombre es requerido" (inline)               |
| Contraseña actual incorrecta | "La contraseña actual es incorrecta" (toast)    |
| Nueva contraseña < 8 chars   | "Mínimo 8 caracteres" (inline)                  |
| Passwords no coinciden       | "Las contraseñas no coinciden" (inline)         |
| Error de red                 | "Error de conexión. Intenta nuevamente" (toast) |
| Error de servidor            | "Error al guardar. Intenta nuevamente" (toast)  |

## Dependencias

- **Páginas relacionadas**:
  - `/settings/users` — admin puede cambiar roles desde allí (no desde perfil)
  - `/settings/company` — información de empresa visible en perfil
- **Supabase client**: `lib/supabase/client.ts` — para auth.updateUser y PostgREST
- **Auth context**: `lib/auth/context.tsx` — React Context + React Query (`AuthProvider`, `useAuth()`, `refreshUser()`)
- **React Query**: Cache key `['auth-user']` para invalidación post-save
