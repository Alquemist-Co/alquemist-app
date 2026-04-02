import { Page } from '@playwright/test'

export class CompanyPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/settings/company')
  }

  async setRegulatoryMode(mode: 'none' | 'standard' | 'strict') {
    await this.page.getByRole('radio', { name: mode === 'none' ? 'Ninguno' : mode === 'standard' ? 'Estándar' : 'Estricto' }).check()
  }

  async isFeatureEnabled(feature: string): Promise<boolean> {
    // Feature switches are labeled by their display name
    const toggle = this.page.getByRole('switch').nth(0) // adjust per feature label
    return toggle.isChecked()
  }

  async saveChanges() {
    await this.page.getByRole('button', { name: 'Guardar Cambios' }).click()
  }

  async getCompanyName(): Promise<string> {
    return this.page.getByLabel('Nombre de la empresa').inputValue()
  }
}
