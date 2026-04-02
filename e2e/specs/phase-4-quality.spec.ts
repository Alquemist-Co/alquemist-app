import { test, expect, authPaths } from '../fixtures'
import { QualityTestsPage, AlertsPage } from '../pages'

test.describe.serial('Fase 4 — Calidad y Monitoreo', () => {
  test.use({ storageState: authPaths.supervisor })

  test('Flujo 12: verificar tests de calidad del seed', async ({ page }) => {
    const qualityPage = new QualityTestsPage(page)
    await qualityPage.goto()

    await expect(page).toHaveURL(/\/quality\/tests/)
    // Seed has 6 quality tests
    const count = await qualityPage.getTestCount()
    expect(count).toBeGreaterThan(1)
  })

  test('Flujo 14: verificar monitoreo ambiental', async ({ page }) => {
    await page.goto('/operations/environmental')
    await expect(page).toHaveURL(/\/operations\/environmental/)
    // Page should load without errors
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('Flujo 15: verificar página de alertas carga', async ({ page }) => {
    const alertsPage = new AlertsPage(page)
    await alertsPage.goto()

    await expect(page).toHaveURL(/\/operations\/alerts/)
    // Page should load (alerts may or may not exist depending on DB state)
    await expect(page.getByRole('heading').first()).toBeVisible()
  })
})
