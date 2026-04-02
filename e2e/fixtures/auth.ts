// e2e/fixtures/auth.ts
import { chromium, FullConfig } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'

const ROLES = [
  { name: 'admin', email: 'admin@test.com' },
  { name: 'manager', email: 'gerente@test.com' },
  { name: 'supervisor', email: 'supervisor@test.com' },
  { name: 'operator', email: 'operador@test.com' },
  { name: 'viewer', email: 'visor@test.com' },
] as const

const AUTH_DIR = path.join(process.cwd(), '.auth')

async function globalSetup(config: FullConfig) {
  fs.mkdirSync(AUTH_DIR, { recursive: true })

  const browser = await chromium.launch()

  for (const role of ROLES) {
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[name="email"]', role.email)
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 })

    await context.storageState({ path: path.join(AUTH_DIR, `${role.name}.json`) })
    await context.close()
    console.log(`✅ Auth saved for ${role.name} (${role.email})`)
  }

  await browser.close()
}

export default globalSetup
