import { test as base } from '@playwright/test'
import path from 'path'

const AUTH_DIR = path.join(process.cwd(), '.auth')

type AuthFixtures = {
  asAdmin: void
  asManager: void
  asSupervisor: void
  asOperator: void
  asViewer: void
}

export const test = base.extend<AuthFixtures>({
  asAdmin: [async ({ browser }, use) => {
    // storageState is applied per-describe via test.use(), this fixture is unused
    await use()
  }, { auto: false }],
  asManager: [async ({ browser }, use) => { await use() }, { auto: false }],
  asSupervisor: [async ({ browser }, use) => { await use() }, { auto: false }],
  asOperator: [async ({ browser }, use) => { await use() }, { auto: false }],
  asViewer: [async ({ browser }, use) => { await use() }, { auto: false }],
})

export { expect } from '@playwright/test'

// Auth state paths for use with test.use({ storageState: ... })
export const authPaths = {
  admin: path.join(AUTH_DIR, 'admin.json'),
  manager: path.join(AUTH_DIR, 'manager.json'),
  supervisor: path.join(AUTH_DIR, 'supervisor.json'),
  operator: path.join(AUTH_DIR, 'operator.json'),
  viewer: path.join(AUTH_DIR, 'viewer.json'),
}
