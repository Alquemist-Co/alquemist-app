import { Page, Locator } from '@playwright/test'

export class SchedulePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/activities/schedule')
  }

  async switchToListView() {
    await this.page.goto('/activities/schedule?view=list')
  }

  async getActivityRow(batchCode: string): Promise<Locator> {
    return this.page.getByRole('row').filter({ hasText: batchCode })
  }

  async scheduleActivity(data: {
    batchCode: string
    templateName: string
    plannedDate: string
  }) {
    await this.page.getByRole('button', { name: 'Programar Actividad' }).click()
    await this.page.getByRole('combobox').filter({ hasText: /lote/i }).selectOption({ label: data.batchCode })
    await this.page.getByRole('combobox').filter({ hasText: /plantilla/i }).selectOption({ label: data.templateName })
    await this.page.getByLabel(/fecha/i).fill(data.plannedDate)
    await this.page.getByRole('button', { name: 'Programar' }).click()
  }
}
