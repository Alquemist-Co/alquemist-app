import { test, expect, authPaths } from '../fixtures'
import { FacilitiesPage, ZonesPage, SuppliersPage, ShipmentsPage } from '../pages'

test.describe.serial('Fase 2 — Infraestructura', () => {
  test.use({ storageState: authPaths.admin })

  test('Flujo 5: verificar instalaciones del seed y sus zonas', async ({ page }) => {
    const facilitiesPage = new FacilitiesPage(page)
    await facilitiesPage.goto()

    await expect(page).toHaveURL('/areas/facilities')

    // 6 seed facilities should be visible
    for (const name of [
      'Nave Cannabis Indoor',
      'Finca Cafetera La Esperanza',
      'Plantacion Palma Magdalena',
    ]) {
      const row = await facilitiesPage.getFacilityRow(name)
      await expect(row).toBeVisible()
    }

    // Check zones page has seed zones
    const zonesPage = new ZonesPage(page)
    await zonesPage.goto()
    const zoneRow = await zonesPage.getZoneRow('Vegetativo A')
    await expect(zoneRow).toBeVisible()
  })

  test('Flujo 6: verificar cadena de suministro — proveedores y envíos', async ({ page }) => {
    const suppliersPage = new SuppliersPage(page)
    await suppliersPage.goto()

    await expect(page).toHaveURL(/\/inventory\/suppliers/)
    // Seed suppliers should be visible
    const supplierRow = await suppliersPage.getSupplierRow('AgroSemillas Colombia')
    await expect(supplierRow).toBeVisible()

    // Shipments page should show seed shipments
    const shipmentsPage = new ShipmentsPage(page)
    await shipmentsPage.goto()
    await expect(page).toHaveURL(/\/inventory\/shipments/)
    // Should have some rows (8 seed shipments)
    const count = await shipmentsPage.getShipmentCount()
    expect(count).toBeGreaterThan(1) // at least header + 1 data row
  })
})
