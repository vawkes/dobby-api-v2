import { test, expect } from '@playwright/test'

test('API docs page loads', async ({ page }) => {
  await page.goto('/public/docs', { waitUntil: 'domcontentloaded' })

  // The Scalar script is loaded from a CDN, which may be blocked in CI.
  // Validate that the docs HTML is served and configured to point at our OpenAPI URL.
  const configTag = page.locator('#api-reference')
  await expect(configTag).toHaveCount(1)
  await expect(configTag).toHaveAttribute('data-configuration', /\/public\/openapi/)
})

test('OpenAPI spec includes ADVANCED_LOAD_UP and examples', async ({ request }) => {
  const res = await request.get('/public/openapi')
  expect(res.ok()).toBeTruthy()

  const spec = await res.json()

  const specStr = JSON.stringify(spec)
  expect(specStr).toContain('ADVANCED_LOAD_UP')
  expect(specStr).toContain('advancedLoadUpKwh')
  expect(specStr).toContain('advancedLoadUpNoEffect')
  expect(specStr).toContain('suggested_load_up_efficiency')
})
