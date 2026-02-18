# F-077: Configuracion de Empresa

## Overview

Permite al administrador ver y editar la configuracion de su empresa (`companies`) desde la UI. Actualmente la tabla existe en el schema con datos insertados via seed SQL o durante onboarding, pero no hay pantalla de administracion. Esta pantalla permite configurar datos basicos de la empresa (nombre, pais, moneda, timezone), asi como gestionar features habilitados via el campo `settings` JSONB.

La configuracion de empresa afecta transversalmente todo el sistema: la moneda se usa en costos e inventario, el timezone en la programacion de actividades y cron jobs, y los features habilitados controlan que modulos estan disponibles en la UI.

Referencia: flujo SYS-F01 en `docs/alquemist-user-flows.md`.

## User Personas

- **Admin**: Unico rol con acceso de escritura a la configuracion de empresa. Gestiona datos legales, configuracion regional y features habilitados.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-077-001 | Ver configuracion actual de la empresa | S | P0 | Planned |
| US-077-002 | Editar datos basicos de la empresa | M | P0 | Planned |
| US-077-003 | Gestionar features habilitados | S | P1 | Planned |

---

# US-077-001: Ver configuracion actual de la empresa

## User Story

**As a** admin,
**I want** ver la configuracion actual de mi empresa incluyendo datos legales, configuracion regional y features habilitados,
**So that** pueda verificar que la configuracion es correcta y decidir si necesita ajustes.

## Acceptance Criteria

### Scenario 1: Visualizar datos basicos de la empresa
- **Given** la empresa "AgroTech Colombia SAS" tiene legal_id="900.123.456-7", country="CO", timezone="America/Bogota", currency="COP"
- **When** el admin navega a /settings/company
- **Then** ve una pagina con secciones claras: datos de la empresa (nombre, identificacion legal), configuracion regional (pais, zona horaria, moneda), y features habilitados

### Scenario 2: Visualizar settings JSONB
- **Given** la empresa tiene settings = {logo_url: "https://...", regulatory_mode: "cannabis_medicinal", features_enabled: ["quality", "environment", "costs"]}
- **When** el admin ve la seccion de features
- **Then** ve una lista de features disponibles con toggles indicando cuales estan habilitados (quality: on, environment: on, costs: on) y cuales no

### Scenario 3: Solo admin puede acceder
- **Given** un usuario con rol "manager" esta autenticado
- **When** intenta navegar a /settings/company
- **Then** el middleware lo redirige a / porque la ruta de configuracion de empresa requiere rol admin

### Scenario 4: Empresa sin configuracion opcional
- **Given** la empresa solo tiene datos basicos (nombre, pais, moneda) y el campo settings es null
- **When** el admin navega a /settings/company
- **Then** ve los datos basicos completados y la seccion de features muestra todos los toggles en estado "deshabilitado" con un mensaje "Configure los modulos activos para su operacion"

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Criterios de aceptacion verificados
- [ ] Server Action con requireAuth(['admin'])
- [ ] RLS tipo A (company_id = propia empresa del usuario)
- [ ] Accesibilidad: labels, focus visible, contraste AA

## Technical Notes
- **Server Action**: `getCompanySettings()` en `src/lib/actions/company.ts` — query simple a `companies` WHERE id = auth.company_id
- **RLS**: Tipo A (company_id directo). El usuario solo puede ver/editar su propia empresa
- **Ruta**: `/settings/company` — Server Component que llama a `getCompanySettings()` + Client Component para display
- **Settings JSONB parsing**: Definir un tipo TypeScript para la estructura de settings: `{ logo_url?: string, regulatory_mode?: string, features_enabled?: string[] }`

## UI/UX Notes
- Pagina de lectura con secciones card-based:
  - Card "Datos de empresa": nombre, identificacion legal
  - Card "Configuracion regional": pais (con bandera emoji), zona horaria, moneda
  - Card "Modulos activos": lista de features con badges on/off
- Boton "Editar" en cada seccion (o un solo boton global)
- Layout: single column en mobile, two columns en desktop

## Dependencies
- F-003 (schema de DB con tabla companies)
- F-004 (auth y middleware)
- F-005 (layout con settings section)

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-077-002: Editar datos basicos de la empresa

## User Story

**As a** admin,
**I want** editar los datos basicos de mi empresa como nombre, identificacion legal, pais, zona horaria y moneda,
**So that** pueda mantener la informacion actualizada y configurar el sistema para la region correcta.

## Acceptance Criteria

### Scenario 1: Editar nombre de la empresa
- **Given** la empresa se llama "AgroTech Colombia"
- **When** el admin cambia el nombre a "AgroTech Colombia SAS" y guarda
- **Then** el nombre se actualiza, un toast confirma "Configuracion actualizada", y el nombre nuevo aparece en el header/sidebar si se muestra ahi

### Scenario 2: Editar configuracion regional
- **Given** la empresa tiene country="CO", timezone="America/Bogota", currency="COP"
- **When** el admin cambia el timezone a "America/Medellin" y guarda
- **Then** el timezone se actualiza. Las proximas actividades programadas y cron jobs usaran el nuevo timezone

### Scenario 3: Editar identificacion legal
- **Given** la empresa tiene legal_id vacio
- **When** el admin ingresa legal_id="900.123.456-7" y guarda
- **Then** la identificacion legal se persiste y se muestra en la seccion de datos de empresa

### Scenario 4: Validacion de campos obligatorios
- **Given** el admin esta editando la configuracion
- **When** borra el nombre de la empresa y intenta guardar
- **Then** el sistema muestra error de validacion inline "El nombre es obligatorio"

### Scenario 5: Validacion de formato de pais
- **Given** el admin esta editando el pais
- **When** ingresa "Colombia" en lugar del codigo ISO de 2 letras
- **Then** el sistema muestra error "Ingrese el codigo de pais ISO 3166-1 alpha-2 (ej: CO, US, MX)"

### Scenario 6: Validacion de formato de moneda
- **Given** el admin esta editando la moneda
- **When** ingresa "pesos" en lugar del codigo ISO
- **Then** el sistema muestra error "Ingrese el codigo de moneda ISO 4217 (ej: COP, USD, EUR)"

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Validacion Zod compartida client/server
- [ ] Criterios de aceptacion verificados
- [ ] Formulario funcional en mobile y desktop
- [ ] Accesibilidad: labels, focus management, contraste AA

## Technical Notes
- **Server Action**: `updateCompanySettings(data)` en `src/lib/actions/company.ts`
- **Zod Schema**: `companySettingsSchema` en `src/lib/schemas/company.ts`
  - name: string min(2) max(200)
  - legal_id: string max(50) optional (puede ser empty string)
  - country: string length(2) regex(/^[A-Z]{2}$/) — ISO 3166-1 alpha-2
  - timezone: string min(1) — validar contra lista de timezones validos (Intl.supportedValuesOf('timeZone') en client)
  - currency: string length(3) regex(/^[A-Z]{3}$/) — ISO 4217
- **Auth**: `requireAuth(['admin'])`
- **RLS**: Tipo A — el admin solo puede editar su propia empresa. WHERE id = auth.company_id()
- **Impacto de cambio de moneda**: Solo afecta nuevas transacciones. Las transacciones historicas mantienen su moneda original (ya almacenada en cada registro). Mostrar warning si se cambia moneda con transacciones existentes
- **Impacto de cambio de timezone**: Afecta calculo de "hoy" para actividades overdue, fechas de vencimiento, y cron jobs

## UI/UX Notes
- Formulario en la misma pagina (inline editing) o en Dialog segun la seccion
- Campos agrupados en dos secciones: "Datos de empresa" (name, legal_id) y "Configuracion regional" (country, timezone, currency)
- Country: select con codigos ISO 3166-1 alpha-2 mas comunes (CO, US, MX, CL, PE, AR, EC, BR, ES) + opcion de ingreso manual
- Timezone: select con timezones del pais seleccionado (filtrado por country). Usar Intl API
- Currency: select con monedas mas comunes (COP, USD, EUR, MXN) + opcion de ingreso manual
- Warning banner si se cambia moneda o timezone: "Este cambio afecta todo el sistema. Las transacciones existentes no se modifican."
- Boton submit: "Guardar cambios"

## Dependencies
- US-077-001 (vista donde se muestran los datos actuales)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-077-003: Gestionar features habilitados

## User Story

**As a** admin,
**I want** activar o desactivar modulos del sistema (calidad, monitoreo ambiental, costos overhead, etc.) para mi empresa,
**So that** pueda simplificar la interfaz mostrando solo los modulos relevantes para mi operacion y habilitar nuevos cuando estemos listos.

## Acceptance Criteria

### Scenario 1: Ver lista de features disponibles
- **Given** el admin esta en /settings/company seccion de features
- **When** visualiza la seccion de modulos
- **Then** ve una lista de features disponibles con nombre, descripcion corta, y toggle on/off. Los features actualmente habilitados tienen el toggle en posicion "on"

### Scenario 2: Habilitar un feature
- **Given** el feature "quality" esta deshabilitado
- **When** el admin activa el toggle de "Calidad (quality)"
- **Then** el settings JSONB se actualiza agregando "quality" a features_enabled, un toast confirma "Modulo Calidad habilitado", y el modulo aparece en la navegacion lateral

### Scenario 3: Deshabilitar un feature
- **Given** el feature "environment" esta habilitado y hay sensores configurados
- **When** el admin desactiva el toggle de "Monitoreo ambiental (environment)"
- **Then** el sistema muestra warning "Deshabilitar este modulo ocultara el panel ambiental y las alertas de sensores. Los datos existentes no se eliminan." y requiere confirmacion. Al confirmar, el modulo desaparece de la navegacion

### Scenario 4: Features disponibles
- **Given** el admin abre la seccion de features
- **When** visualiza la lista completa
- **Then** ve los siguientes features configurables: "quality" (Tests y resultados de calidad), "environment" (Monitoreo ambiental y sensores IoT), "costs" (Costos overhead y COGS), "genealogy" (Genealogia y splits de batch)

### Scenario 5: Deshabilitar feature no elimina datos
- **Given** el feature "quality" esta habilitado y hay 10 quality_tests registrados
- **When** el admin deshabilita "quality" y luego lo vuelve a habilitar
- **Then** los 10 quality_tests siguen intactos y visibles al reactivar el modulo

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Criterios de aceptacion verificados
- [ ] Toggle de features actualiza settings JSONB correctamente
- [ ] La navegacion refleja los features habilitados (modulos visibles/ocultos)
- [ ] Datos existentes preservados al deshabilitar/habilitar features
- [ ] Accesibilidad: toggles accesibles, labels claros, contraste AA

## Technical Notes
- **Server Action**: `updateCompanyFeatures(features: string[])` en `src/lib/actions/company.ts`
- **Auth**: `requireAuth(['admin'])`
- **JSONB update**: Merge con settings existentes — solo actualizar `features_enabled`, no sobreescribir todo el settings JSONB
  ```sql
  UPDATE companies
  SET settings = COALESCE(settings, '{}') || jsonb_build_object('features_enabled', $1::jsonb)
  WHERE id = $company_id
  ```
- **Features catalog**: Definir constante en `src/lib/config/features.ts`:
  ```typescript
  export const AVAILABLE_FEATURES = [
    { key: 'quality', name: 'Calidad', description: 'Tests de laboratorio y resultados por batch' },
    { key: 'environment', name: 'Monitoreo ambiental', description: 'Sensores IoT, lecturas y alertas ambientales' },
    { key: 'costs', name: 'Costos y COGS', description: 'Overhead costs y calculo de costo por batch' },
    { key: 'genealogy', name: 'Genealogia', description: 'Splits de batch y arbol genealogico visual' },
  ] as const;
  ```
- **Navegacion**: `src/lib/nav/navigation.ts` ya define modulos por rol. Agregar filtro adicional por `features_enabled` en el auth store o en el componente de navegacion
- **Validacion**: Solo aceptar keys del catalogo AVAILABLE_FEATURES. Rechazar keys desconocidas

## UI/UX Notes
- Seccion de features dentro de la pagina /settings/company (no pagina separada)
- Lista de cards o rows con: nombre del feature (bold), descripcion (muted), toggle a la derecha
- Toggle usa el componente Toggle existente del design system
- Warning dialog al deshabilitar un feature que ya tiene datos asociados (contar registros relevantes)
- Cambios se aplican inmediatamente al hacer toggle (optimistic update), con posibilidad de undo via toast
- Indicacion visual de que los cambios afectan la navegacion: "Los modulos habilitados aparecen en el menu de navegacion"

## Dependencies
- US-077-001 (vista donde se muestra la seccion de features)
- F-005 (layout y navegacion que debe respetar features_enabled)

## Estimation
- **Size**: S
- **Complexity**: Medium
