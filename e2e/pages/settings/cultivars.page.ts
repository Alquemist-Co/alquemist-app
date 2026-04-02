import { Page } from '@playwright/test'

export class CultivarsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/settings/cultivars')
  }

  async getCultivarRow(name: string) {
    return this.page.getByRole('row').filter({ hasText: name })
  }

  async getCultivarCount(): Promise<number> {
    return this.page.getByRole('row').count()
  }
}
