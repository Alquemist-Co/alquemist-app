import { Page, Locator } from '@playwright/test'

export class BatchesPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/production/batches')
  }

  async getBatchRow(code: string): Promise<Locator> {
    return this.page.getByRole('row').filter({ hasText: code })
  }

  async getBatchCount(): Promise<number> {
    return this.page.getByRole('row').count()
  }

  async clickBatch(code: string) {
    await this.page.getByRole('row').filter({ hasText: code }).click()
  }
}
