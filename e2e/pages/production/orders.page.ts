import { Page, Locator } from '@playwright/test'

export class OrdersPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/production/orders')
  }

  async getOrderRow(code: string): Promise<Locator> {
    return this.page.getByRole('row').filter({ hasText: code })
  }

  async createOrder(data: {
    cultivarName: string
    initialQuantity: number
    plannedStartDate: string
  }) {
    await this.page.getByRole('button', { name: 'Crear Orden' }).click()
    await this.page.getByRole('combobox').filter({ hasText: /cultivar/i }).selectOption({ label: data.cultivarName })
    await this.page.getByLabel(/cantidad inicial/i).fill(String(data.initialQuantity))
    await this.page.getByLabel(/fecha inicio/i).fill(data.plannedStartDate)
    await this.page.getByRole('button', { name: 'Crear' }).click()
  }

  async getOrderCount(): Promise<number> {
    return this.page.getByRole('row').count()
  }
}
