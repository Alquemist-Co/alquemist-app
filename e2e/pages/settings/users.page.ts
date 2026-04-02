import { Page, Locator } from '@playwright/test'

export class UsersPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/settings/users')
  }

  async getUserRow(emailOrName: string): Promise<Locator> {
    return this.page.getByRole('row').filter({ hasText: emailOrName })
  }

  async getUserCount(): Promise<number> {
    // Count data rows in the table (excluding header)
    return this.page.getByRole('row').count()
  }

  async inviteUser(data: { email: string; name: string; role: string }) {
    await this.page.getByRole('button', { name: 'Invitar Usuario' }).click()
    await this.page.getByLabel('Email').fill(data.email)
    await this.page.getByLabel('Nombre').fill(data.name)
    // Role select
    await this.page.getByRole('combobox').filter({ hasText: /rol/i }).selectOption(data.role)
    await this.page.getByRole('button', { name: 'Invitar' }).click()
  }

  async searchUser(query: string) {
    await this.page.getByPlaceholder(/buscar/i).fill(query)
  }
}
