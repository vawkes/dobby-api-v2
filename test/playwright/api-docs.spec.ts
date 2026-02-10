import { test, expect } from '@playwright/test'

test('API docs page loads', async ({ page }) => {
  await page.goto('/public/docs', { waitUntil: 'domcontentloaded' })

  // Scalar is a SPA; give it a moment to render.
  await expect(page.getByText('Vawkes GridCube API Documentation')).toBeVisible()
})

test('OpenAPI spec includes ADVANCED_LOAD_UP and examples', async ({ request }) => {
  const res = await request.get('/public/openapi')
  expect(res.ok()).toBeTruthy()

  const spec = await res.json()

  const specStr = JSON.stringify(spec)
  expect(specStr).toContain('ADVANCED_LOAD_UP')
  expect(specStr).toContain('advancedLoadUpKwh')
  expect(specStr).toContain('advancedLoadUpNoEffect')
  expect(specStr).toContain('Invalid units. Allowed: 0,1,2,3,255')
})

