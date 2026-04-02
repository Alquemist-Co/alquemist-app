import { test, expect, authPaths } from '../fixtures'
import { OrdersPage, BatchesPage, SchedulePage } from '../pages'

test.describe.serial('Fase 3 — Producción', () => {
  test.use({ storageState: authPaths.manager })

  test('Flujo 7: verificar órdenes de producción del seed', async ({ page }) => {
    const ordersPage = new OrdersPage(page)
    await ordersPage.goto()

    await expect(page).toHaveURL(/\/production\/orders/)
    // Seed has 6 production orders
    const count = await ordersPage.getOrderCount()
    expect(count).toBeGreaterThan(1)
  })

  test('Flujo 10: verificar lotes activos del seed', async ({ page }) => {
    const batchesPage = new BatchesPage(page)
    await batchesPage.goto()

    await expect(page).toHaveURL(/\/production\/batches/)
    // Check seed batches exist
    for (const code of ['LOT-OGK-260115-001', 'LOT-BLD-260201-001']) {
      const row = await batchesPage.getBatchRow(code)
      await expect(row).toBeVisible()
    }
  })

  test('Flujo 11: verificar calendario de actividades', async ({ page }) => {
    const schedulePage = new SchedulePage(page)
    await schedulePage.goto()

    await expect(page).toHaveURL(/\/activities\/schedule/)
    // Switch to list view for easier verification
    await schedulePage.switchToListView()
    await expect(page).toHaveURL(/view=list/)
  })
})
