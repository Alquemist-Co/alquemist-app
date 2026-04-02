import { test, expect, authPaths } from '../fixtures'
import { BatchesPage } from '../pages'

test.describe.serial('Fase 6 — Trazabilidad', () => {
  test.use({ storageState: authPaths.admin })

  test('Flujo 18: verificar página de lotes carga', async ({ page }) => {
    // Navigate to batches list
    await page.goto('/production/batches')
    await expect(page).toHaveURL(/\/production\/batches/)
    await expect(page.getByRole('heading').first()).toBeVisible()
  })
})
