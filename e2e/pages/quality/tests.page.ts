import { Page, Locator } from '@playwright/test'

export class QualityTestsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/quality/tests')
  }

  async getTestRow(identifier: string): Promise<Locator> {
    return this.page.getByRole('row').filter({ hasText: identifier })
  }

  async createTest(data: {
    batchCode: string
    testType: string
    labName: string
    sampleDate: string
  }) {
    await this.page.getByRole('button', { name: 'Crear Test' }).click()
    await this.page.getByRole('combobox').filter({ hasText: /lote/i }).selectOption({ label: data.batchCode })
    await this.page.getByLabel(/tipo de test/i).fill(data.testType)
    await this.page.getByLabel(/laboratorio/i).fill(data.labName)
    await this.page.getByLabel(/fecha de muestra/i).fill(data.sampleDate)
    await this.page.getByRole('button', { name: 'Crear' }).click()
  }

  async getTestCount(): Promise<number> {
    return this.page.getByRole('row').count()
  }
}
