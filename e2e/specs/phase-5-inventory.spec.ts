import { test, expect, authPaths } from '../fixtures'
import { CostsPage } from '../pages'

test.describe.serial('Fase 5 — Inventario y Costos', () => {
  test.use({ storageState: authPaths.manager })

  test('Flujo 16: verificar costos overhead del seed', async ({ page }) => {
    const costsPage = new CostsPage(page)
    await costsPage.goto()

    await expect(page).toHaveURL(/\/operations\/costs/)
    // Seed has 6 overhead costs
    const count = await costsPage.getCostCount()
    expect(count).toBeGreaterThan(1)
  })

  test('Flujo 17: verificar operaciones de inventario', async ({ page }) => {
    await page.goto('/inventory/items')
    await expect(page).toHaveURL(/\/inventory\/items/)
    await expect(page.getByRole('heading').first()).toBeVisible()

    await page.goto('/inventory/transactions')
    await expect(page).toHaveURL(/\/inventory\/transactions/)
    await expect(page.getByRole('heading').first()).toBeVisible()
  })
})
