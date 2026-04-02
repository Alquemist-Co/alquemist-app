import { test, expect, authPaths } from '../fixtures'
import { CompanyPage, UsersPage, CatalogPage, CultivarsPage } from '../pages'

test.describe.serial('Fase 1 — Configuración inicial', () => {
  test.use({ storageState: authPaths.admin })

  test('Flujo 2: verificar configuración de empresa', async ({ page }) => {
    const companyPage = new CompanyPage(page)
    await companyPage.goto()

    // Page should load
    await expect(page).toHaveURL('/settings/company')
    // Company name should be visible
    await expect(page.getByLabel('Nombre de la empresa')).toHaveValue('Alquemist Agroindustrial S.A.S.')
    // Should show save button (even if disabled)
    await expect(page.getByRole('button', { name: 'Guardar Cambios' })).toBeVisible()
  })

  test('Flujo 3: verificar 5 usuarios en seed', async ({ page }) => {
    const usersPage = new UsersPage(page)
    await usersPage.goto()

    await expect(page).toHaveURL(/\/settings\/users/)
    // All 5 seed users should be present
    for (const email of ['admin@test.com', 'gerente@test.com', 'supervisor@test.com', 'operador@test.com', 'visor@test.com']) {
      const row = await usersPage.getUserRow(email)
      await expect(row).toBeVisible()
    }
  })

  test('Flujo 4: verificar catálogo base — categorías, unidades, cultivares', async ({ page }) => {
    const catalogPage = new CatalogPage(page)
    await catalogPage.goto()

    await expect(page).toHaveURL(/\/settings\/catalog/)
    // Check a seed category exists
    const categoryRow = await catalogPage.getCategoryRow('Material Vegetal')
    await expect(categoryRow).toBeVisible()

    // Check units tab
    await catalogPage.goToTab('units')
    const unitRow = await catalogPage.getUnitRow('kg')
    await expect(unitRow).toBeVisible()

    // Check cultivars page
    const cultivarsPage = new CultivarsPage(page)
    await cultivarsPage.goto()
    const cultivarRow = await cultivarsPage.getCultivarRow('OG Kush')
    await expect(cultivarRow).toBeVisible()
  })
})
