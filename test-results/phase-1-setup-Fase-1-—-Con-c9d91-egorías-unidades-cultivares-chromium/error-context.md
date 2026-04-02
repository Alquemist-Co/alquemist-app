# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase-1-setup.spec.ts >> Fase 1 — Configuración inicial >> Flujo 4: verificar catálogo base — categorías, unidades, cultivares
- Location: e2e/specs/phase-1-setup.spec.ts:30:3

# Error details

```
TimeoutError: page.goto: Timeout 30000ms exceeded.
Call log:
  - navigating to "http://localhost:3000/settings/catalog", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect, authPaths } from '../fixtures'
  2  | import { CompanyPage, UsersPage, CatalogPage, CultivarsPage } from '../pages'
  3  | 
  4  | test.describe.serial('Fase 1 — Configuración inicial', () => {
  5  |   test.use({ storageState: authPaths.admin })
  6  | 
  7  |   test('Flujo 2: verificar configuración de empresa', async ({ page }) => {
  8  |     const companyPage = new CompanyPage(page)
  9  |     await companyPage.goto()
  10 | 
  11 |     // Page should load
  12 |     await expect(page).toHaveURL('/settings/company')
  13 |     // Company name should be visible
  14 |     await expect(page.getByLabel('Nombre de la empresa')).toHaveValue('Alquemist Agroindustrial S.A.S.')
  15 |     // Should show save button (even if disabled)
  16 |     await expect(page.getByRole('button', { name: 'Guardar Cambios' })).toBeVisible()
  17 |   })
  18 | 
  19 |   test('Flujo 3: verificar 5 usuarios en seed', async ({ page }) => {
  20 |     const usersPage = new UsersPage(page)
  21 |     await usersPage.goto()
  22 | 
  23 |     await expect(page).toHaveURL(/\/settings\/users/)
  24 |     // All 5 seed users should be present - use exact email match
  25 |     for (const email of ['admin@test.com', 'gerente@test.com', 'supervisor@test.com', 'operador@test.com', 'visor@test.com']) {
  26 |       await expect(page.getByRole('cell', { name: email, exact: true })).toBeVisible()
  27 |     }
  28 |   })
  29 | 
  30 |   test('Flujo 4: verificar catálogo base — categorías, unidades, cultivares', async ({ page }) => {
  31 |     // Check catalog page loads
> 32 |     await page.goto('/settings/catalog')
     |                ^ TimeoutError: page.goto: Timeout 30000ms exceeded.
  33 |     await expect(page).toHaveURL(/\/settings\/catalog/)
  34 |     await expect(page.getByRole('heading').first()).toBeVisible()
  35 | 
  36 |     // Check units tab loads
  37 |     await page.goto('/settings/catalog?tab=units')
  38 |     await expect(page.getByRole('heading').first()).toBeVisible()
  39 | 
  40 |     // Check cultivars page loads
  41 |     await page.goto('/settings/cultivars')
  42 |     await expect(page).toHaveURL(/\/settings\/cultivars/)
  43 |     await expect(page.getByRole('heading').first()).toBeVisible()
  44 |   })
  45 | })
  46 | 
```