import { Page, Locator } from '@playwright/test'

export class FacilitiesPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/areas/facilities')
  }

  async getFacilityRow(name: string): Promise<Locator> {
    return this.page.getByRole('row').filter({ hasText: name })
  }

  async createFacility(data: {
    name: string
    type: string
    totalFootprintM2: number
  }) {
    await this.page.getByRole('button', { name: 'Crear Instalacion' }).click()
    await this.page.getByLabel('Nombre').fill(data.name)
    // type select
    await this.page.getByRole('combobox').first().selectOption(data.type)
    await this.page.getByLabel(/superficie total/i).fill(String(data.totalFootprintM2))
    await this.page.getByRole('button', { name: 'Crear' }).click()
  }

  async getFacilityCount(): Promise<number> {
    return this.page.getByRole('row').count()
  }
}
