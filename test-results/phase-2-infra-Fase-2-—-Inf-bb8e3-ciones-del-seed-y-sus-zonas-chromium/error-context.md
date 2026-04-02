# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase-2-infra.spec.ts >> Fase 2 — Infraestructura >> Flujo 5: verificar instalaciones del seed y sus zonas
- Location: e2e/specs/phase-2-infra.spec.ts:7:3

# Error details

```
TimeoutError: page.goto: Timeout 30000ms exceeded.
Call log:
  - navigating to "http://localhost:3000/areas/zones", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect, authPaths } from '../fixtures'
  2  | import { FacilitiesPage, ZonesPage, SuppliersPage, ShipmentsPage } from '../pages'
  3  | 
  4  | test.describe.serial('Fase 2 — Infraestructura', () => {
  5  |   test.use({ storageState: authPaths.admin })
  6  | 
  7  |   test('Flujo 5: verificar instalaciones del seed y sus zonas', async ({ page }) => {
  8  |     // Check facilities page loads
  9  |     await page.goto('/areas/facilities')
  10 |     await expect(page).toHaveURL('/areas/facilities')
  11 |     await expect(page.getByRole('heading').first()).toBeVisible()
  12 | 
  13 |     // Check zones page loads
> 14 |     await page.goto('/areas/zones')
     |                ^ TimeoutError: page.goto: Timeout 30000ms exceeded.
  15 |     await expect(page).toHaveURL(/\/areas\/zones/)
  16 |     await expect(page.getByRole('heading').first()).toBeVisible()
  17 |   })
  18 | 
  19 |   test('Flujo 6: verificar página de proveedores carga', async ({ page }) => {
  20 |     await page.goto('/inventory/suppliers')
  21 |     await expect(page).toHaveURL(/\/inventory\/suppliers/)
  22 |     await expect(page.getByRole('heading').first()).toBeVisible()
  23 |   })
  24 | })
  25 | 
```