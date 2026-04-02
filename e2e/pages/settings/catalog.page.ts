import { Page } from '@playwright/test'

export class CatalogPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/settings/catalog')
  }

  async goToTab(tab: 'categories' | 'units' | 'activity_types') {
    await this.page.goto(`/settings/catalog?tab=${tab}`)
  }

  async getCategoryRow(name: string) {
    return this.page.getByRole('row').filter({ hasText: name })
  }

  async getUnitRow(code: string) {
    return this.page.getByRole('row').filter({ hasText: code })
  }

  async getActivityTypeRow(name: string) {
    return this.page.getByRole('row').filter({ hasText: name })
  }
}
