import { test, expect, authPaths } from '../fixtures'
import { BatchesPage } from '../pages'

test.describe.serial('Fase 6 — Trazabilidad', () => {
  test.use({ storageState: authPaths.admin })

  test('Flujo 18: trazabilidad completa de un lote', async ({ page }) => {
    const batchesPage = new BatchesPage(page)
    await batchesPage.goto()

    // Navigate to a specific batch detail
    await page.goto('/production/batches')
    await expect(page).toHaveURL(/\/production\/batches/)

    // Find OG Kush batch and click to view details
    const batchRow = await batchesPage.getBatchRow('LOT-OGK-260115-001')
    await expect(batchRow).toBeVisible()
    await batchRow.click()

    // Batch detail page should load
    await expect(page).toHaveURL(/\/production\/batches\//)
    // Should show batch information
    await expect(page.getByRole('heading').first()).toBeVisible()
  })
})
