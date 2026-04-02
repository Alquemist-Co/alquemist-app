# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase-3-production.spec.ts >> Fase 3 — Producción >> Flujo 10: verificar lotes activos del seed
- Location: e2e/specs/phase-3-production.spec.ts:17:3

# Error details

```
TimeoutError: page.goto: Timeout 30000ms exceeded.
Call log:
  - navigating to "http://localhost:3000/production/batches", waiting until "load"

```

# Test source

```ts
  1  | import { Page, Locator } from '@playwright/test'
  2  | 
  3  | export class BatchesPage {
  4  |   constructor(private page: Page) {}
  5  | 
  6  |   async goto() {
> 7  |     await this.page.goto('/production/batches')
     |                     ^ TimeoutError: page.goto: Timeout 30000ms exceeded.
  8  |   }
  9  | 
  10 |   async getBatchRow(code: string): Promise<Locator> {
  11 |     return this.page.getByRole('row').filter({ hasText: code })
  12 |   }
  13 | 
  14 |   async getBatchCount(): Promise<number> {
  15 |     return this.page.getByRole('row').count()
  16 |   }
  17 | 
  18 |   async clickBatch(code: string) {
  19 |     await this.page.getByRole('row').filter({ hasText: code }).click()
  20 |   }
  21 | }
  22 | 
```