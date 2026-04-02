# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase-6-traceability.spec.ts >> Fase 6 — Trazabilidad >> Flujo 18: verificar página de lotes carga
- Location: e2e/specs/phase-6-traceability.spec.ts:7:3

# Error details

```
TimeoutError: page.goto: Timeout 30000ms exceeded.
Call log:
  - navigating to "http://localhost:3000/production/batches", waiting until "load"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e5]:
      - list [ref=e7]:
        - listitem [ref=e8]:
          - link "Alquemist" [ref=e9] [cursor=pointer]:
            - /url: /
            - img [ref=e10]
            - generic [ref=e13]: Alquemist
      - list [ref=e17]:
        - listitem [ref=e18]:
          - button "Dashboard" [disabled]:
            - img
            - generic: Dashboard
        - listitem [ref=e19]:
          - button "Producción" [expanded] [ref=e20]:
            - img [ref=e21]
            - generic [ref=e24]: Producción
            - img [ref=e25]
          - list [ref=e28]:
            - listitem [ref=e29]:
              - link "Órdenes" [ref=e30] [cursor=pointer]:
                - /url: /production/orders
                - generic [ref=e31]: Órdenes
            - listitem [ref=e32]:
              - link "Lotes" [ref=e33] [cursor=pointer]:
                - /url: /production/batches
                - generic [ref=e34]: Lotes
        - listitem [ref=e35]:
          - button "Áreas" [ref=e36]:
            - img [ref=e37]
            - generic [ref=e40]: Áreas
            - img [ref=e41]
        - listitem [ref=e43]:
          - button "Inventario" [ref=e44]:
            - img [ref=e45]
            - generic [ref=e49]: Inventario
            - img [ref=e50]
        - listitem [ref=e52]:
          - button "Actividades" [ref=e53]:
            - img [ref=e54]
            - generic [ref=e56]: Actividades
            - img [ref=e57]
        - listitem [ref=e59]:
          - button "Calidad" [ref=e60]:
            - img [ref=e61]
            - generic [ref=e65]: Calidad
            - img [ref=e66]
        - listitem [ref=e68]:
          - button "Regulatorio" [ref=e69]:
            - img [ref=e70]
            - generic [ref=e72]: Regulatorio
            - img [ref=e73]
        - listitem [ref=e75]:
          - button "Operaciones" [ref=e76]:
            - img [ref=e77]
            - generic [ref=e79]: Operaciones
            - img [ref=e80]
        - listitem [ref=e82]:
          - link "Configuración" [ref=e83] [cursor=pointer]:
            - /url: /settings
            - img [ref=e84]
            - generic [ref=e87]: Configuración
      - list [ref=e89]:
        - listitem [ref=e90]:
          - button "CA Carlos Administrador admin" [ref=e91]:
            - generic [ref=e93]: CA
            - generic [ref=e94]:
              - generic [ref=e95]: Carlos Administrador
              - generic [ref=e96]: admin
            - img [ref=e97]
    - main [ref=e100]:
      - generic [ref=e102]:
        - button "Toggle Sidebar" [ref=e103]:
          - img
          - generic [ref=e104]: Toggle Sidebar
        - navigation "breadcrumb" [ref=e105]:
          - list [ref=e106]:
            - listitem [ref=e107]:
              - link "Production" [ref=e108] [cursor=pointer]:
                - /url: /production
            - listitem [ref=e109]:
              - img [ref=e110]
            - listitem [ref=e112]:
              - link "Batches" [disabled] [ref=e113]
      - generic [ref=e115]:
        - generic [ref=e116]:
          - heading "Lotes de Producción" [level=2] [ref=e117]
          - paragraph [ref=e118]: Seguimiento de lotes activos y su progreso por fase.
        - generic [ref=e119]:
          - generic [ref=e120]:
            - generic [ref=e121]:
              - paragraph [ref=e122]: Activos
              - paragraph [ref=e123]: "7"
            - generic [ref=e124]:
              - paragraph [ref=e125]: En transición
              - paragraph [ref=e126]: "0"
            - generic [ref=e127]:
              - paragraph [ref=e128]: En espera
              - paragraph [ref=e129]: "1"
            - generic [ref=e130]:
              - paragraph [ref=e131]: Completados (mes)
              - paragraph [ref=e132]: "1"
          - generic [ref=e133]:
            - generic [ref=e134]:
              - img [ref=e135]
              - textbox "Código de lote..." [ref=e138]
            - button "Filtros" [ref=e139]:
              - img
              - text: Filtros
            - generic [ref=e140]:
              - checkbox "Mostrar completados/cancelados" [ref=e141]
              - text: Mostrar completados/cancelados
          - table [ref=e144]:
            - rowgroup [ref=e145]:
              - row "Código Cultivar Fase Zona Plantas Producto Orden Inicio Fin esp. Días Estado" [ref=e146]:
                - columnheader "Código" [ref=e147]
                - columnheader "Cultivar" [ref=e148]
                - columnheader "Fase" [ref=e149]
                - columnheader "Zona" [ref=e150]
                - columnheader "Plantas" [ref=e151]
                - columnheader "Producto" [ref=e152]
                - columnheader "Orden" [ref=e153]
                - columnheader "Inicio" [ref=e154]
                - columnheader "Fin esp." [ref=e155]
                - columnheader "Días" [ref=e156]
                - columnheader "Estado" [ref=e157]
            - rowgroup [ref=e158]:
              - row "LOT-OGK-260115-001 OG Kush Vegetativo Vegetativo A Nave Cannabis Indoor 100 — OP-2026-0001 12 de mar de 2026 16 de ago de 2026 21 Activo" [ref=e159] [cursor=pointer]:
                - cell "LOT-OGK-260115-001" [ref=e160]
                - cell "OG Kush" [ref=e161]
                - cell "Vegetativo" [ref=e162]
                - cell "Vegetativo A Nave Cannabis Indoor" [ref=e163]:
                  - generic [ref=e164]: Vegetativo A
                  - generic [ref=e165]: Nave Cannabis Indoor
                - cell "100" [ref=e166]
                - cell "—" [ref=e167]
                - cell "OP-2026-0001" [ref=e168]:
                  - button "OP-2026-0001" [ref=e169]
                - cell "12 de mar de 2026" [ref=e170]
                - cell "16 de ago de 2026" [ref=e171]
                - cell "21" [ref=e172]
                - cell "Activo" [ref=e173]:
                  - generic [ref=e174]: Activo
              - row "LOT-BLD-260201-001 Blue Dream Floracion Floracion A Nave Cannabis Indoor 50 — — 05 de feb de 2026 22 de jul de 2026 56 Activo" [ref=e175] [cursor=pointer]:
                - cell "LOT-BLD-260201-001" [ref=e176]
                - cell "Blue Dream" [ref=e177]
                - cell "Floracion" [ref=e178]
                - cell "Floracion A Nave Cannabis Indoor" [ref=e179]:
                  - generic [ref=e180]: Floracion A
                  - generic [ref=e181]: Nave Cannabis Indoor
                - cell "50" [ref=e182]
                - cell "—" [ref=e183]
                - cell "—" [ref=e184]
                - cell "05 de feb de 2026" [ref=e185]
                - cell "22 de jul de 2026" [ref=e186]
                - cell "56" [ref=e187]
                - cell "Activo" [ref=e188]:
                  - generic [ref=e189]: Activo
              - row "LOT-WWD-260110-001 White Widow Secado Secado/Curado Nave Cannabis Indoor 40 — — 22 de ene de 2026 19 de jun de 2026 70 Activo" [ref=e190] [cursor=pointer]:
                - cell "LOT-WWD-260110-001" [ref=e191]
                - cell "White Widow" [ref=e192]
                - cell "Secado" [ref=e193]
                - cell "Secado/Curado Nave Cannabis Indoor" [ref=e194]:
                  - generic [ref=e195]: Secado/Curado
                  - generic [ref=e196]: Nave Cannabis Indoor
                - cell "40" [ref=e197]
                - cell "—" [ref=e198]
                - cell "—" [ref=e199]
                - cell "22 de ene de 2026" [ref=e200]
                - cell "19 de jun de 2026" [ref=e201]
                - cell "70" [ref=e202]
                - cell "Activo" [ref=e203]:
                  - generic [ref=e204]: Activo
              - row "LOT-GEI-251201-001 Geisha Recoleccion Vegetativo A Nave Cannabis Indoor 200 — OP-2026-0004 16 de dic de 2025 03 de jun de 2028 107 Activo" [ref=e205] [cursor=pointer]:
                - cell "LOT-GEI-251201-001" [ref=e206]
                - cell "Geisha" [ref=e207]
                - cell "Recoleccion" [ref=e208]
                - cell "Vegetativo A Nave Cannabis Indoor" [ref=e209]:
                  - generic [ref=e210]: Vegetativo A
                  - generic [ref=e211]: Nave Cannabis Indoor
                - cell "200" [ref=e212]
                - cell "—" [ref=e213]
                - cell "OP-2026-0004" [ref=e214]:
                  - button "OP-2026-0004" [ref=e215]
                - cell "16 de dic de 2025" [ref=e216]
                - cell "03 de jun de 2028" [ref=e217]
                - cell "107" [ref=e218]
                - cell "Activo" [ref=e219]:
                  - generic [ref=e220]: Activo
              - row "LOT-TEN-250601-001 Tenera DxP Vivero Lote A Tenera Plantacion Palma Magdalena 100 — OP-2026-0005 14 de sept de 2025 08 de oct de 2028 200 Activo" [ref=e221] [cursor=pointer]:
                - cell "LOT-TEN-250601-001" [ref=e222]
                - cell "Tenera DxP" [ref=e223]
                - cell "Vivero" [ref=e224]
                - cell "Lote A Tenera Plantacion Palma Magdalena" [ref=e225]:
                  - generic [ref=e226]: Lote A Tenera
                  - generic [ref=e227]: Plantacion Palma Magdalena
                - cell "100" [ref=e228]
                - cell "—" [ref=e229]
                - cell "OP-2026-0005" [ref=e230]:
                  - button "OP-2026-0005" [ref=e231]
                - cell "14 de sept de 2025" [ref=e232]
                - cell "08 de oct de 2028" [ref=e233]
                - cell "200" [ref=e234]
                - cell "Activo" [ref=e235]:
                  - generic [ref=e236]: Activo
              - row "LOT-CAS-250601-001 Castillo Desarrollo del Fruto Lote 1 Castillo Finca Cafetera La Esperanza 500 — OP-2026-0003 16 de jun de 2025 29 de oct de 2027 290 Activo" [ref=e237] [cursor=pointer]:
                - cell "LOT-CAS-250601-001" [ref=e238]
                - cell "Castillo" [ref=e239]
                - cell "Desarrollo del Fruto" [ref=e240]
                - cell "Lote 1 Castillo Finca Cafetera La Esperanza" [ref=e241]:
                  - generic [ref=e242]: Lote 1 Castillo
                  - generic [ref=e243]: Finca Cafetera La Esperanza
                - cell "500" [ref=e244]
                - cell "—" [ref=e245]
                - cell "OP-2026-0003" [ref=e246]:
                  - button "OP-2026-0003" [ref=e247]
                - cell "16 de jun de 2025" [ref=e248]
                - cell "29 de oct de 2027" [ref=e249]
                - cell "290" [ref=e250]
                - cell "Activo" [ref=e251]:
                  - generic [ref=e252]: Activo
              - row "LOT-CAS-240601-001 Castillo Secado Secado Mecanico Beneficiadero Central 300 — — 21 de jun de 2024 — 650 En espera" [ref=e253] [cursor=pointer]:
                - cell "LOT-CAS-240601-001" [ref=e254]
                - cell "Castillo" [ref=e255]
                - cell "Secado" [ref=e256]
                - cell "Secado Mecanico Beneficiadero Central" [ref=e257]:
                  - generic [ref=e258]: Secado Mecanico
                  - generic [ref=e259]: Beneficiadero Central
                - cell "300" [ref=e260]
                - cell "—" [ref=e261]
                - cell "—" [ref=e262]
                - cell "21 de jun de 2024" [ref=e263]
                - cell "—" [ref=e264]
                - cell "650" [ref=e265]
                - cell "En espera" [ref=e266]:
                  - generic [ref=e267]: En espera
              - row "LOT-CAT-250301-001 Caturra Recoleccion Lote 3 Caturra Finca Cafetera La Esperanza 10.000 — — 13 de mar de 2024 21 de jun de 2026 750 Activo" [ref=e268] [cursor=pointer]:
                - cell "LOT-CAT-250301-001" [ref=e269]
                - cell "Caturra" [ref=e270]
                - cell "Recoleccion" [ref=e271]
                - cell "Lote 3 Caturra Finca Cafetera La Esperanza" [ref=e272]:
                  - generic [ref=e273]: Lote 3 Caturra
                  - generic [ref=e274]: Finca Cafetera La Esperanza
                - cell "10.000" [ref=e275]
                - cell "—" [ref=e276]
                - cell "—" [ref=e277]
                - cell "13 de mar de 2024" [ref=e278]
                - cell "21 de jun de 2026" [ref=e279]
                - cell "750" [ref=e280]
                - cell "Activo" [ref=e281]:
                  - generic [ref=e282]: Activo
          - generic [ref=e283]:
            - paragraph [ref=e284]: Mostrando 1–8 de 8
            - generic [ref=e285]:
              - generic [ref=e286]: Página 1 de 1
              - generic [ref=e287]:
                - button "Primera página" [disabled]:
                  - img
                  - generic: Primera página
                - button "Página anterior" [disabled]:
                  - img
                  - generic: Página anterior
                - button "Página siguiente" [disabled]:
                  - img
                  - generic: Página siguiente
                - button "Última página" [disabled]:
                  - img
                  - generic: Última página
  - region "Notifications alt+T"
```

# Test source

```ts
  1  | import { test, expect, authPaths } from '../fixtures'
  2  | import { BatchesPage } from '../pages'
  3  | 
  4  | test.describe.serial('Fase 6 — Trazabilidad', () => {
  5  |   test.use({ storageState: authPaths.admin })
  6  | 
  7  |   test('Flujo 18: verificar página de lotes carga', async ({ page }) => {
  8  |     // Navigate to batches list
> 9  |     await page.goto('/production/batches')
     |                ^ TimeoutError: page.goto: Timeout 30000ms exceeded.
  10 |     await expect(page).toHaveURL(/\/production\/batches/)
  11 |     await expect(page.getByRole('heading').first()).toBeVisible()
  12 |   })
  13 | })
  14 | 
```