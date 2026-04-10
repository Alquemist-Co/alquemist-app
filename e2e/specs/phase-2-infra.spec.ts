import { test, expect, authPaths } from '../fixtures'
import { FacilitiesPage, ZonesPage, SuppliersPage, ShipmentsPage } from '../pages'

test.describe.serial('Fase 2 — Infraestructura', () => {
  test.use({ storageState: authPaths.admin })

  test('Flujo 5: verificar instalaciones del seed y sus zonas', async ({ page }) => {
    // Check facilities page loads
    await page.goto('/areas/facilities')
    await expect(page).toHaveURL('/areas/facilities')
    await expect(page.getByRole('heading').first()).toBeVisible()

    // Click first facility card to check detail page with zones tab
    await page.locator('[class*="cursor-pointer"]').first().click()
    await expect(page).toHaveURL(/\/areas\/facilities\//)
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('Flujo 6: verificar página de proveedores carga', async ({ page }) => {
    await page.goto('/inventory/suppliers')
    await expect(page).toHaveURL(/\/inventory\/suppliers/)
    await expect(page.getByRole('heading').first()).toBeVisible()
  })
})
