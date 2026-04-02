import { Page, Locator } from '@playwright/test'

export class AlertsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/operations/alerts')
  }

  async getAlertRow(title: string): Promise<Locator> {
    return this.page.getByRole('row').filter({ hasText: title })
  }

  async getAlertCount(): Promise<number> {
    return this.page.getByRole('row').count()
  }

  async resolveAlert(title: string) {
    const row = await this.getAlertRow(title)
    await row.getByRole('button', { name: /resolver/i }).click()
    await this.page.getByRole('button', { name: 'Confirmar' }).click()
  }

  async acknowledgeAlert(title: string) {
    const row = await this.getAlertRow(title)
    await row.getByRole('button', { name: /reconocer/i }).click()
  }
}
