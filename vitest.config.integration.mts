import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
    include: ['__tests__/edge-functions/**/*.test.ts'],
    testTimeout: 15_000,
    fileParallelism: false,
    sequence: {
      concurrent: false,
    },
  },
})
