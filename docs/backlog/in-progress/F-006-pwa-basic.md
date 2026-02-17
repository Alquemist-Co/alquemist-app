# F-006: PWA Basica

## Overview

Configuracion de la Progressive Web App con Serwist: manifest dinamico, service worker con precache del shell de la aplicacion, capacidad de instalacion en Android e iOS, e indicador permanente del estado de conexion. Este feature asegura que la aplicacion se comporte como una app nativa instalable y que el shell (HTML, CSS, JS, fonts, iconos) se cargue instantaneamente incluso sin conexion a internet.

## User Personas

- **Operador**: Necesita instalar la app en su celular Android para acceso rapido, y que la app cargue instantaneamente en campo sin conexion.
- **Supervisor**: Necesita saber en todo momento si esta conectado o trabajando offline para tomar decisiones sobre sincronizacion.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-006-001 | Configurar Serwist y service worker con precache | M | P0 | Done |
| US-006-002 | Manifest PWA dinamico con branding Alquemist | S | P0 | Done |
| US-006-003 | App instalable en Android e iOS | S | P0 | Done |
| US-006-004 | Indicador permanente de estado de conexion | M | P1 | Done |

---

# US-006-001: Configurar Serwist y service worker con precache

## User Story

**As a** operador,
**I want** que la aplicacion precachee su shell (HTML, CSS, JS, fonts, iconos) usando un service worker,
**So that** la app cargue instantaneamente cuando la abra en campo, independientemente de si tengo conexion a internet o no.

## Acceptance Criteria

### Scenario 1: Service worker registrado
- **Given** que el operador abre la aplicacion por primera vez con conexion
- **When** la pagina se carga completamente
- **Then** el service worker se registra exitosamente, los recursos del shell se precachean (verificable en Chrome DevTools > Application > Cache Storage), y la consola muestra "Service Worker registered"

### Scenario 2: App carga offline (shell vacio)
- **Given** que el operador ha visitado la app previamente (precache completado)
- **When** pierde la conexion a internet y abre la app
- **Then** la app carga el shell completo (layout, sidebar/bottombar, topbar, fonts, iconos), las paginas de modulos muestran contenido placeholder o skeleton, y no se muestra la pagina de "dinosaurio" del navegador

### Scenario 3: Actualizacion del service worker
- **Given** que se ha deployado una nueva version de la app
- **When** el operador abre la app con conexion
- **Then** el nuevo service worker se descarga en background, los recursos actualizados se precachean, y al siguiente reload la app usa la version nueva sin necesidad de limpiar cache manual

### Scenario 4: Next.js config con Serwist
- **Given** que Serwist esta instalado
- **When** se configura `next.config.ts` con `withSerwist`
- **Then** el build de produccion genera el service worker automaticamente, el precache manifest incluye todos los assets estaticos del build, y `npm run build` completa sin errores

## Definition of Done
- [ ] Serwist instalado (`@serwist/next`)
- [ ] `next.config.ts` configurado con `withSerwist`
- [ ] Service worker generado en build de produccion
- [ ] Precache del shell: HTML, CSS, JS, fonts (DM Sans, DM Mono), iconos PWA
- [ ] App carga offline con shell funcional
- [ ] Actualizacion de SW en background
- [ ] Build exitoso con SW incluido
- [ ] Verificado en Chrome DevTools > Application

## Technical Notes
- Seguir docs/alquemist-proyecto.md seccion "Setup Dia 1" paso 11
- Instalar: `npm i @serwist/next`
- Configurar `next.config.ts` con plugin withSerwist
- Crear `src/app/sw.ts` o `src/sw.ts` como entry point del service worker
- Precache strategy: revision-based para assets estaticos
- Runtime cache (stale-while-revalidate) se implementara en fases posteriores
- Referencia offline: docs/alquemist-pwa-reqs.md seccion "Offline-First Architecture"
- Fonts self-hosted en `public/fonts/` deben estar en precache

## Dependencies
- US-001-002 (dependencias instaladas)
- US-001-004 (fonts configuradas en public/fonts/)
- US-005-005 (paginas de modulos para precachear)

## Estimation
- **Size**: M
- **Complexity**: High

---

# US-006-002: Manifest PWA dinamico con branding Alquemist

## User Story

**As a** operador,
**I want** que la aplicacion tenga un manifest PWA con el nombre, iconos y colores de Alquemist,
**So that** al instalar la app en mi celular se vea como una app nativa con el branding correcto.

## Acceptance Criteria

### Scenario 1: Manifest generado correctamente
- **Given** que la ruta `/manifest.webmanifest` es accesible
- **When** un navegador la solicita
- **Then** retorna un JSON con: `name: "Alquemist"`, `short_name: "Alquemist"`, `description` descriptiva, `theme_color: "#005E42"`, `background_color: "#F7F8F2"`, `display: "standalone"`, `start_url: "/"`, `scope: "/"`, y `orientation: "any"`

### Scenario 2: Iconos PWA incluidos
- **Given** que el manifest esta configurado
- **When** se revisan los iconos
- **Then** el manifest referencia iconos en tamanos 192x192 y 512x512 (minimo), tipo `image/png`, y los archivos existen en `public/icons/` y son accesibles via HTTP

### Scenario 3: Manifest dinamico via Next.js
- **Given** que se usa `src/app/manifest.ts` de Next.js
- **When** se genera el manifest
- **Then** es un export de Next.js que permite generar el manifest programaticamente, lo que habilita futuras personalizaciones por tenant

## Definition of Done
- [ ] Archivo `src/app/manifest.ts` con metadata de PWA
- [ ] Nombre: "Alquemist", short_name: "Alquemist"
- [ ] theme_color: #005E42, background_color: #F7F8F2
- [ ] display: standalone
- [ ] Iconos PWA en public/icons/: 192x192 y 512x512
- [ ] Favicon y apple-touch-icon configurados
- [ ] Manifest accesible en `/manifest.webmanifest`
- [ ] Verificado con Lighthouse PWA audit

## Technical Notes
- Ubicacion: `src/app/manifest.ts` (Next.js manifest route handler)
- Iconos en `public/icons/`: icon-192x192.png, icon-512x512.png, favicon.ico, apple-touch-icon.png
- Referencia: docs/alquemist-proyecto.md seccion "Estructura del Proyecto" > manifest.ts y public/icons/
- El manifest de Next.js se exporta como funcion: `export default function manifest(): MetadataRoute.Manifest`
- Considerar agregar `maskable` icon para Android

## Dependencies
- US-001-001 (proyecto Next.js creado)

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-006-003: App instalable en Android e iOS

## User Story

**As a** operador,
**I want** poder instalar Alquemist como una app nativa en mi celular Android o iOS,
**So that** pueda abrir la app desde mi pantalla de inicio con un tap, como cualquier otra aplicacion.

## Acceptance Criteria

### Scenario 1: Instalable en Android Chrome
- **Given** que el operador abre la app en Chrome Android
- **When** el navegador detecta que la app cumple los criterios PWA (manifest, SW, HTTPS)
- **Then** aparece el banner de instalacion "Agregar a pantalla de inicio", al aceptar se instala la app con el icono de Alquemist, y al abrirla se muestra sin barra de navegacion del browser (standalone)

### Scenario 2: Instalable en iOS Safari
- **Given** que el operador abre la app en Safari iOS
- **When** toca "Compartir" > "Agregar a inicio"
- **Then** la app se agrega a la pantalla de inicio con el icono apple-touch-icon, al abrirla se muestra en modo standalone sin barra de Safari, y el status bar usa el theme_color #005E42

### Scenario 3: Splash screen al abrir
- **Given** que la app esta instalada como PWA
- **When** el operador la abre desde la pantalla de inicio
- **Then** se muestra brevemente una splash screen con el background_color #F7F8F2 y el icono de Alquemist centrado, antes de cargar la app completa

### Scenario 4: Lighthouse PWA audit pasa
- **Given** que la app esta deployada en Vercel con HTTPS
- **When** se ejecuta un Lighthouse audit
- **Then** el score de PWA muestra "Installable", el manifest es valido, el service worker esta registrado, y la app funciona offline (shell)

## Definition of Done
- [ ] App instalable en Android Chrome
- [ ] App instalable en iOS Safari
- [ ] Icono correcto en pantalla de inicio
- [ ] Modo standalone (sin barra del browser)
- [ ] Splash screen con branding
- [ ] Meta tags en layout: theme-color, apple-mobile-web-app-capable, etc.
- [ ] Lighthouse PWA score: "Installable"
- [ ] Verificado en dispositivo real o emulador

## Technical Notes
- Criterios de instalabilidad PWA: HTTPS + manifest valido + service worker registrado + icono 192px+
- Meta tags en `src/app/layout.tsx`:
  - `<meta name="theme-color" content="#005E42" />`
  - `<meta name="apple-mobile-web-app-capable" content="yes" />`
  - `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />`
  - `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />`
- Referencia: docs/alquemist-proyecto.md seccion "Setup Dia 1" paso 11
- Referencia: docs/alquemist-pwa-reqs.md seccion "Offline-First Architecture"

## Dependencies
- US-006-001 (service worker configurado)
- US-006-002 (manifest con iconos)
- US-001-005 (deploy en Vercel con HTTPS)

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-006-004: Indicador permanente de estado de conexion

## User Story

**As a** operador,
**I want** ver un indicador permanente en la app que me diga si estoy conectado o sin conexion,
**So that** sepa en todo momento si mis acciones se enviaran al servidor inmediatamente o se guardaran localmente para sincronizar despues.

## Acceptance Criteria

### Scenario 1: Indicador "Conectado"
- **Given** que el operador tiene conexion a internet
- **When** la app esta abierta
- **Then** se muestra un banner sutil en la parte superior con fondo verde, texto "Conectado", siempre visible pero no intrusivo, que no bloquea contenido

### Scenario 2: Indicador "Sin conexion"
- **Given** que el operador pierde la conexion a internet
- **When** el navegador detecta el cambio via `navigator.onLine` o el evento `offline`
- **Then** el banner cambia a fondo amarillo (#D97706) con texto "Sin conexion -- datos de HH:MM" indicando la hora de la ultima sincronizacion, la transicion entre estados es animada (200ms)

### Scenario 3: Reconexion automatica
- **Given** que el operador estaba sin conexion y la conexion se restablece
- **When** el navegador detecta el evento `online`
- **Then** el banner cambia de amarillo a verde con texto "Conectado", la transicion es suave, y opcionalmente se dispara una sincronizacion de datos pendientes

### Scenario 4: Banner no bloquea interaccion
- **Given** que el banner de estado esta visible
- **When** el operador interactua con la app
- **Then** el banner ocupa un espacio fijo minimo (height 28-32px), no se superpone al contenido, no tiene boton de cierre (es permanente), y el contenido principal se ajusta debajo del banner

## Definition of Done
- [ ] Hook `useOnlineStatus()` que detecta cambios de conexion
- [ ] Banner permanente en la parte superior de la app
- [ ] Estado "Conectado": fondo verde, texto blanco
- [ ] Estado "Sin conexion": fondo amarillo/ambar, texto oscuro, hora de ultima sync
- [ ] Transicion animada entre estados
- [ ] No bloquea contenido (layout se ajusta)
- [ ] Funciona en mobile y desktop
- [ ] Accesibilidad: aria-live="polite" para anunciar cambios de estado

## Technical Notes
- Ubicacion: `src/components/shared/offline-banner.tsx` y `src/hooks/use-online-status.ts`
- Usar `navigator.onLine` + event listeners `online`/`offline`
- Complementar con fetch health check para deteccion mas precisa (navigator.onLine puede dar falsos positivos)
- Referencia: docs/alquemist-proyecto.md seccion "Estrategia Offline-First" > "Indicador de estado"
- Referencia: docs/alquemist-pwa-reqs.md seccion "Offline-First Architecture" > indicador permanente
- El banner se integra en el layout principal, debajo del TopBar
- Hora de ultima sincronizacion: almacenar en Zustand o localStorage
- En Fase 0, la sincronizacion real no esta implementada; el banner solo muestra el estado de conexion

## Dependencies
- US-005-003 (top bar para integrar el banner debajo)
- US-001-004 (colores semanticos configurados)

## Estimation
- **Size**: M
- **Complexity**: Medium
