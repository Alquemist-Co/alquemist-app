import { Page } from '@playwright/test'

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login')
  }

  async login(email: string, password: string) {
    await this.page.goto('/login')
    await this.page.getByLabel('Email').fill(email)
    await this.page.getByLabel('Contraseña').fill(password)
    await this.page.getByRole('button', { name: 'Iniciar sesión' }).click()
    await this.page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 })
  }

  async isVisible() {
    return this.page.getByRole('button', { name: 'Iniciar sesión' }).isVisible()
  }
}
