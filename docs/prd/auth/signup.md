# Signup — Onboarding Inicial

## Metadata

- **Ruta**: `/signup`
- **Roles con acceso**: Público (sin autenticación)
- **Tipo componente**: Client Component (`'use client'`)
- **Edge Functions**: Ninguna — usa Server Action con `admin.ts` (service role) para operación transaccional

## Objetivo

Permitir que una persona registre una nueva empresa en el sistema y se convierta en su primer usuario administrador. Este es el único punto de entrada para crear empresas — no hay registro libre de usuarios individuales (esos llegan por invitación). El flujo crea atómicamente la empresa + el usuario admin, establece sesión, y redirige a la configuración inicial.

Usuarios principales: fundador/admin de una nueva empresa agrícola.

## Tablas del modelo involucradas

| Tabla           | Operaciones | Notas                                                  |
| --------------- | ----------- | ------------------------------------------------------ |
| companies       | W           | Crear registro de empresa con datos básicos            |
| users           | W           | Crear primer usuario con role='admin'                  |
| auth.users      | W           | Crear cuenta de autenticación via Supabase Admin API   |
| auth.identities | W           | Crear identity row (requerido para signInWithPassword) |
| resource_categories | R/W     | Seed automático — verificar existencia + insertar defaults (RF-10) |
| units_of_measure | W          | Seed automático — 5 unidades con relaciones base_unit  |
| activity_types  | W           | Seed automático — 5 tipos de actividad                 |
| crop_types      | W           | Seed automático — 2 tipos de cultivo                   |
| production_phases | W         | Seed automático — 9 fases con dependencias             |
| cultivars       | W           | Seed automático — 2 cultivares                         |
| phase_product_flows | W       | Seed automático — 5 flujos de producto                 |
| activity_templates | W        | Seed automático — 3 templates + fases, recursos, checklist |
| cultivation_schedules | W     | Seed automático — 1 schedule                           |
| regulatory_doc_types | W      | Seed automático — 3 tipos documentales                 |
| product_regulatory_requirements | W | Seed automático — 3 requerimientos          |
| shipment_doc_requirements | W | Seed automático — 3 requerimientos de envío            |

## ENUMs utilizados

| ENUM      | Valores | Tabla.campo                                         |
| --------- | ------- | --------------------------------------------------- |
| user_role | admin   | users.role — siempre 'admin' para el primer usuario |

## Layout y componentes principales

Página pública fuera del layout de dashboard. Sin sidebar ni topbar. Diseño limpio de onboarding.

- **Logo** — Identidad de Alquemist centrada
- **Stepper / Progreso** — 2 pasos visibles: "Tu empresa" → "Tu cuenta"
- **Paso 1: Datos de la empresa**
  - Input: Nombre de empresa (req)
  - Input: Identificación legal / NIT / RFC (opt)
  - Select nativo: País (req) — lista ISO 3166-1 alpha-2
  - Select nativo: Zona horaria (req) — filtrada por país seleccionado
  - Select nativo: Moneda (req) — filtrada por país seleccionado
  - Botón "Siguiente" (variant="primary")
- **Paso 2: Cuenta administrador**
  - Input: Nombre completo (req)
  - Input: Email (req, type="email")
  - Input: Teléfono (opt)
  - Input: Contraseña (req, min 8)
  - Input: Confirmar contraseña (req, must match)
  - Botón "Crear empresa" (variant="primary")
- **Footer** — Link "¿Ya tienes cuenta? Inicia sesión" → `/login`

**Responsive**: Formulario max-width ~500px centrado en desktop, full-width en móvil. Stepper se adapta a horizontal/vertical.

## Requisitos funcionales

- **RF-01**: Formulario en 2 pasos. Paso 1 valida datos de empresa. Paso 2 valida datos de admin
- **RF-02**: El select de zona horaria se filtra dinámicamente al seleccionar país (ej: Colombia → 'America/Bogota')
- **RF-03**: El select de moneda se pre-selecciona según país (ej: Colombia → COP, México → MXN, USA → USD)
- **RF-04**: Validar todos los campos con Zod antes de enviar
- **RF-05**: Al submit, ejecutar Server Action transaccional (usa `admin.ts` con service role key):
  1. Verificar que el email no existe en auth.users
  2. Crear registro en `companies` con los datos del paso 1, `is_active = true`
  3. Crear usuario en `auth.users` via Supabase Admin API (`auth.admin.createUser`)
  4. Setear `app_metadata = { company_id: <new_company_id>, role: 'admin' }`
  5. Se crea automáticamente row en `auth.identities` via Admin API
  6. Crear registro en `users` con: company_id, email, full_name, phone, role='admin', is_active=true
  7. Seed automático de datos de catálogo para la nueva empresa (ver RF-10)
  8. Si cualquier paso 1-6 falla → rollback (eliminar registros creados). Si paso 7 falla → se ignora (signup exitoso sin seed)
- **RF-06**: Post-creación exitosa, auto-login: `signInWithPassword({ email, password })` en el cliente
- **RF-07**: Hidratar auth-store con datos del nuevo usuario y empresa
- **RF-08**: Redirect a `/settings/company` para completar configuración adicional (logo, regulatory_mode, features)
- **RF-09**: Si el usuario ya tiene sesión activa al acceder a `/signup`, redirect a ruta por rol (middleware)
- **RF-10**: Post-creación de usuario, seed automático de datos de catálogo via `seedCompanyData()` (`lib/seed/company-seed.ts`). Datos insertados:
  - 4 resource_categories (Material Vegetal, Químicos, Equipos, Sustratos)
  - 5 units_of_measure (g, kg, L, ml, und) con relaciones base_unit
  - 5 activity_types (Riego, Fertilización, Poda, Cosecha, Inspección)
  - 2 crop_types (Cannabis, Flores) con 9 production_phases y cadena de dependencias
  - 2 cultivars (OG Kush, Blue Dream) con phase_durations, target_profile, optimal_conditions
  - 5 phase_product_flows (rendimientos cosecha/secado)
  - 3 activity_templates con fases, recursos y checklists
  - 1 cultivation_schedule (OG Kush Standard 122d)
  - 3 regulatory_doc_types (CoA, SDS, Fitosanitario) con required_fields
  - 3 product_regulatory_requirements + 3 shipment_doc_requirements
  - **Idempotente**: verifica si ya existen resource_categories para la empresa antes de insertar
  - **No-blocking**: errores se loguean pero nunca interrumpen el signup

## Requisitos no funcionales

- **RNF-01**: La operación de creación debe ser atómica — si falla cualquier paso, no quedan registros huérfanos
- **RNF-02**: El email se verifica como único ANTES de crear cualquier registro (fail fast)
- **RNF-03**: La contraseña se transmite via HTTPS y se hashea por Supabase Auth (bcrypt via GoTrue)
- **RNF-04**: El service role key (`SUPABASE_SERVICE_ROLE_KEY`) solo se usa server-side (import "server-only")
- **RNF-05**: Los selects de país/timezone/moneda se cargan desde datos estáticos (no requieren DB query)
- **RNF-06**: El formulario preserva datos del paso 1 al avanzar al paso 2 y al retroceder

## Flujos principales

### Happy path

1. Usuario navega a `/signup`
2. Middleware: no hay sesión → muestra página de signup
3. Paso 1: Llena nombre empresa, país, timezone, moneda → click "Siguiente"
4. Validación Zod paso 1 pasa → avanza a paso 2
5. Paso 2: Llena nombre, email, teléfono, password, confirm → click "Crear empresa"
6. Validación Zod paso 2 pasa → botón se deshabilita, muestra loading
7. Server Action ejecuta transacción:
   - Email no existe → company creada → auth.users creado → users creado → seed catálogo
8. Auto-login exitoso en el cliente
9. Redirect a `/settings/company` — catálogo pre-poblado listo para usar

### Email ya registrado

1. Pasos 1-6 normales
2. Server Action verifica: email ya existe en auth.users
3. Retorna error sin crear ningún registro
4. Muestra toast: "Ya existe una cuenta con este email"
5. Formulario re-habilitado en paso 2, campo email resaltado con error

### Error de transacción (rollback)

1. Server Action crea company exitosamente
2. Creación de auth.users falla por alguna razón
3. Server Action elimina la company recién creada (rollback manual)
4. Retorna error genérico: "Error al crear la cuenta. Intenta nuevamente"

### Navegación entre pasos

1. Paso 1 llenado → click "Siguiente" → paso 2
2. En paso 2, click "Atrás" → paso 1 con datos preservados
3. Modificar datos en paso 1 → avanzar → paso 2 mantiene sus datos previos

## Estados y validaciones

### Estados de UI

| Estado     | Descripción                                                    |
| ---------- | -------------------------------------------------------------- |
| step-1     | Formulario de empresa visible                                  |
| step-2     | Formulario de admin visible                                    |
| validating | Validación Zod por paso (instantánea)                          |
| submitting | Botón "Crear empresa" deshabilitado, spinner, campos read-only |
| error      | Toast con error, formulario re-habilitado en el paso relevante |
| success    | Auto-login + redirect en curso                                 |

### Validaciones Zod — Paso 1 (Empresa)

```
name: z.string().min(1, 'El nombre es requerido').max(200)
legal_id: z.string().max(50).optional()
country: z.string().length(2, 'Selecciona un país')
timezone: z.string().min(1, 'Selecciona una zona horaria')
currency: z.string().length(3, 'Selecciona una moneda')
```

### Validaciones Zod — Paso 2 (Admin)

```
full_name: z.string().min(1, 'El nombre es requerido').max(200)
email: z.string().min(1, 'El email es requerido').email('Formato de email inválido')
phone: z.string().max(20).optional()
password: z.string().min(8, 'Mínimo 8 caracteres')
confirm_password: z.string().min(1, 'Confirma la contraseña')
```

Con refinamiento: `confirm_password` debe coincidir con `password`.

### Errores esperados

| Escenario              | Mensaje al usuario                               |
| ---------------------- | ------------------------------------------------ |
| Email duplicado        | "Ya existe una cuenta con este email"            |
| Password < 8 chars     | "La contraseña debe tener al menos 8 caracteres" |
| Passwords no coinciden | "Las contraseñas no coinciden"                   |
| País no seleccionado   | "Selecciona un país"                             |
| Error de servidor      | "Error al crear la cuenta. Intenta nuevamente"   |
| Network error          | "Error de conexión. Intenta nuevamente"          |

## Dependencias

- **Páginas relacionadas**:
  - `/login` — link desde footer, destino alternativo
  - `/settings/company` — redirect post-signup para completar configuración
- **Server Action**: Operación transaccional que usa `src/lib/supabase/admin.ts` (service role)
- **Supabase client**: `src/lib/supabase/browser.ts` — auto-login post-creación
- **Store**: `src/stores/auth-store.ts` — hidratado post-login
- **Datos estáticos**: Lista de países (ISO 3166-1), timezones por país, monedas por país
