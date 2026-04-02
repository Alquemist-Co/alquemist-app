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
    // All 5 seed users should be present - use exact email match
    for (const email of ['admin@test.com', 'gerente@test.com', 'supervisor@test.com', 'operador@test.com', 'visor@test.com']) {
      await expect(page.getByRole('cell', { name: email, exact: true })).toBeVisible()
    }
  })

  test('Flujo 4: verificar catálogo base — categorías, unidades, cultivares', async ({ page }) => {
    // Check catalog page loads
    await page.goto('/settings/catalog')
    await expect(page).toHaveURL(/\/settings\/catalog/)
    await expect(page.getByRole('heading').first()).toBeVisible()

    // Check units tab loads
    await page.goto('/settings/catalog?tab=units')
    await expect(page.getByRole('heading').first()).toBeVisible()

    // Check cultivars page loads
    await page.goto('/settings/cultivars')
    await expect(page).toHaveURL(/\/settings\/cultivars/)
    await expect(page.getByRole('heading').first()).toBeVisible()
  })
})
