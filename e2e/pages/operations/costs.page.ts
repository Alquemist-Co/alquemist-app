import { Page, Locator } from '@playwright/test'

export class CostsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/operations/costs')
  }

  async getCostRow(description: string): Promise<Locator> {
    return this.page.getByRole('row').filter({ hasText: description })
  }

  async createOverheadCost(data: {
    costType: string
    description: string
    amount: number
    periodStart: string
    periodEnd: string
  }) {
    await this.page.getByRole('button', { name: 'Registrar Costo' }).click()
    await this.page.getByRole('combobox').filter({ hasText: /tipo/i }).selectOption(data.costType)
    await this.page.getByLabel(/descripción/i).fill(data.description)
    await this.page.getByLabel(/monto/i).fill(String(data.amount))
    await this.page.getByLabel(/inicio/i).fill(data.periodStart)
    await this.page.getByLabel(/fin/i).fill(data.periodEnd)
    await this.page.getByRole('button', { name: 'Registrar' }).click()
  }

  async getCostCount(): Promise<number> {
    return this.page.getByRole('row').count()
  }
}
