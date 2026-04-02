# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase-4-quality.spec.ts >> Fase 4 — Calidad y Monitoreo >> Flujo 12: verificar tests de calidad del seed
- Location: e2e/specs/phase-4-quality.spec.ts:7:3

# Error details

```
TimeoutError: page.goto: Timeout 30000ms exceeded.
Call log:
  - navigating to "http://localhost:3000/quality/tests", waiting until "load"

```

# Test source

```ts
  1  | import { Page, Locator } from '@playwright/test'
  2  | 
  3  | export class QualityTestsPage {
  4  |   constructor(private page: Page) {}
  5  | 
  6  |   async goto() {
> 7  |     await this.page.goto('/quality/tests')
     |                     ^ TimeoutError: page.goto: Timeout 30000ms exceeded.
  8  |   }
  9  | 
  10 |   async getTestRow(identifier: string): Promise<Locator> {
  11 |     return this.page.getByRole('row').filter({ hasText: identifier })
  12 |   }
  13 | 
  14 |   async createTest(data: {
  15 |     batchCode: string
  16 |     testType: string
  17 |     labName: string
  18 |     sampleDate: string
  19 |   }) {
  20 |     await this.page.getByRole('button', { name: 'Crear Test' }).click()
  21 |     await this.page.getByRole('combobox').filter({ hasText: /lote/i }).selectOption({ label: data.batchCode })
  22 |     await this.page.getByLabel(/tipo de test/i).fill(data.testType)
  23 |     await this.page.getByLabel(/laboratorio/i).fill(data.labName)
  24 |     await this.page.getByLabel(/fecha de muestra/i).fill(data.sampleDate)
  25 |     await this.page.getByRole('button', { name: 'Crear' }).click()
  26 |   }
  27 | 
  28 |   async getTestCount(): Promise<number> {
  29 |     return this.page.getByRole('row').count()
  30 |   }
  31 | }
  32 | 
```