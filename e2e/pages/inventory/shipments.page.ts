import { Page, Locator } from '@playwright/test'

export class ShipmentsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/inventory/shipments')
  }

  async getShipmentRow(code: string): Promise<Locator> {
    return this.page.getByRole('row').filter({ hasText: code })
  }

  async createShipment(data: {
    supplierName: string
    facilityName: string
    estimatedArrival: string
  }) {
    await this.page.getByRole('button', { name: 'Crear Envío' }).click()
    // Fill form fields
    await this.page.getByRole('combobox').filter({ hasText: /proveedor/i }).selectOption({ label: data.supplierName })
    await this.page.getByRole('combobox').filter({ hasText: /instalación/i }).selectOption({ label: data.facilityName })
    await this.page.getByLabel(/llegada estimada/i).fill(data.estimatedArrival)
    await this.page.getByRole('button', { name: 'Crear' }).click()
  }

  async getShipmentCount(): Promise<number> {
    return this.page.getByRole('row').count()
  }
}
