import { Page, Locator } from '@playwright/test'

export class ZonesPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/areas/zones')
  }

  async getZoneRow(name: string): Promise<Locator> {
    return this.page.getByRole('row').filter({ hasText: name })
  }

  async createZone(data: {
    name: string
    facilityName: string
    purpose: string
    areaM2: number
  }) {
    await this.page.getByRole('button', { name: 'Crear Zona' }).click()
    // Select facility from dropdown
    await this.page.getByRole('combobox').first().selectOption({ label: data.facilityName })
    await this.page.getByLabel('Nombre').fill(data.name)
    await this.page.getByRole('combobox').nth(1).selectOption(data.purpose)
    await this.page.getByLabel(/área/i).fill(String(data.areaM2))
    await this.page.getByRole('button', { name: 'Crear' }).click()
  }
}
