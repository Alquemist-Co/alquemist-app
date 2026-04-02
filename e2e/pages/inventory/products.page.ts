import { Page, Locator } from '@playwright/test'

export class ProductsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/inventory/products')
  }

  async getProductRow(nameOrSku: string): Promise<Locator> {
    return this.page.getByRole('row').filter({ hasText: nameOrSku })
  }

  async createProduct(data: {
    sku: string
    name: string
  }) {
    await this.page.getByRole('button', { name: 'Crear Producto' }).click()
    await this.page.getByLabel('SKU').fill(data.sku)
    await this.page.getByLabel('Nombre').fill(data.name)
    await this.page.getByRole('button', { name: 'Crear' }).click()
  }

  async getProductCount(): Promise<number> {
    return this.page.getByRole('row').count()
  }
}
