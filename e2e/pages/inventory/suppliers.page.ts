import { Page, Locator } from '@playwright/test'

export class SuppliersPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/inventory/suppliers')
  }

  async getSupplierRow(name: string): Promise<Locator> {
    return this.page.getByRole('row').filter({ hasText: name })
  }

  async createSupplier(data: {
    name: string
    contactName: string
    email: string
    paymentTerms: string
  }) {
    await this.page.getByRole('button', { name: 'Crear Proveedor' }).click()
    await this.page.getByLabel('Nombre').fill(data.name)
    await this.page.getByLabel(/contacto/i).fill(data.contactName)
    await this.page.getByLabel('Email').fill(data.email)
    await this.page.getByLabel(/términos de pago/i).fill(data.paymentTerms)
    await this.page.getByRole('button', { name: 'Crear' }).click()
  }

  async getSupplierCount(): Promise<number> {
    return this.page.getByRole('row').count()
  }
}
