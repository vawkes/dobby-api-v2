import { defineConfig } from '@playwright/test'

const port = Number(process.env.PORT || 3333)

export default defineConfig({
  testDir: 'test/playwright',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    headless: true,
  },
  webServer: {
    command: `PORT=${port} npm run dev:server`,
    url: `http://127.0.0.1:${port}/public/docs`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})

