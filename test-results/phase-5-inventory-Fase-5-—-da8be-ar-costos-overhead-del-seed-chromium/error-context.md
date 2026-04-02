# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase-5-inventory.spec.ts >> Fase 5 — Inventario y Costos >> Flujo 16: verificar costos overhead del seed
- Location: e2e/specs/phase-5-inventory.spec.ts:7:3

# Error details

```
TimeoutError: page.goto: Timeout 30000ms exceeded.
Call log:
  - navigating to "http://localhost:3000/operations/costs", waiting until "load"

```

# Test source

```ts
  1  | import { Page, Locator } from '@playwright/test'
  2  | 
  3  | export class CostsPage {
  4  |   constructor(private page: Page) {}
  5  | 
  6  |   async goto() {
> 7  |     await this.page.goto('/operations/costs')
     |                     ^ TimeoutError: page.goto: Timeout 30000ms exceeded.
  8  |   }
  9  | 
  10 |   async getCostRow(description: string): Promise<Locator> {
  11 |     return this.page.getByRole('row').filter({ hasText: description })
  12 |   }
  13 | 
  14 |   async createOverheadCost(data: {
  15 |     costType: string
  16 |     description: string
  17 |     amount: number
  18 |     periodStart: string
  19 |     periodEnd: string
  20 |   }) {
  21 |     await this.page.getByRole('button', { name: 'Registrar Costo' }).click()
  22 |     await this.page.getByRole('combobox').filter({ hasText: /tipo/i }).selectOption(data.costType)
  23 |     await this.page.getByLabel(/descripción/i).fill(data.description)
  24 |     await this.page.getByLabel(/monto/i).fill(String(data.amount))
  25 |     await this.page.getByLabel(/inicio/i).fill(data.periodStart)
  26 |     await this.page.getByLabel(/fin/i).fill(data.periodEnd)
  27 |     await this.page.getByRole('button', { name: 'Registrar' }).click()
  28 |   }
  29 | 
  30 |   async getCostCount(): Promise<number> {
  31 |     return this.page.getByRole('row').count()
  32 |   }
  33 | }
  34 | 
```