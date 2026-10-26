import { test, expect } from '@playwright/test'

test('menu reports a bug with a public notice, safe context and a GitHub link', async ({ page }) => {
  let report: { id: string; title: string; description: string; context: Record<string, unknown> }
  await page.route('**/atlas-api/reports', route => {
    report = route.request().postDataJSON()
    return route.fulfill({ status: 202, json: { id: report.id, state: 'pending', issueUrl: null } })
  })
  await page.route('**/atlas-api/reports/*', route => route.fulfill({ json: { id: report.id, state: 'published', issueUrl: 'https://github.com/kmarchais/geography-game/issues/123' } }))
  await page.goto('./')
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Report a bug' }).click()
  const dialog = page.getByRole('dialog', { name: 'Report a bug' })
  await expect(dialog.getByText(/Reports are public on GitHub/)).toBeVisible()
  await dialog.getByLabel('Title', { exact: true }).fill('Globe selection problem')
  await dialog.getByLabel('What happened?', { exact: true }).fill('After zooming I could not select a country.')
  await dialog.getByRole('button', { name: 'Send report', exact: true }).click()
  await expect(dialog.getByText('GitHub issue created. Thank you!')).toBeVisible()
  await expect(dialog.getByRole('link', { name: 'View issue' })).toHaveAttribute('href', 'https://github.com/kmarchais/geography-game/issues/123')
  expect(Object.keys(report!.context).sort()).toEqual(['country', 'height', 'platform', 'version', 'width'])
  expect(report!.context.platform).toBe('Web')
  await dialog.getByRole('button', { name: 'Done', exact: true }).click()
  await expect(dialog).toBeHidden()
})

test('failed report keeps its text and reuses the same ID on retry', async ({ page }) => {
  const bodies: string[] = []
  await page.route('**/atlas-api/reports', route => {
    bodies.push(route.request().postData()!)
    const body = route.request().postDataJSON()
    return route.fulfill({ status: bodies.length <= 2 ? 503 : 202, json: bodies.length <= 2 ? { error: 'Unavailable' } : { id: body.id, state: 'published', issueUrl: 'https://github.com/kmarchais/geography-game/issues/124' } })
  })
  await page.goto('./')
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Report a bug' }).click()
  const dialog = page.getByRole('dialog', { name: 'Report a bug' })
  await dialog.getByLabel('Title', { exact: true }).fill('A test report')
  await dialog.getByLabel('What happened?', { exact: true }).fill('Steps remain available if the connection fails.')
  await dialog.getByRole('button', { name: 'Send report', exact: true }).click()
  await expect(dialog.getByText(/Could not send the report/)).toBeVisible()
  await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue('A test report')
  await dialog.getByRole('button', { name: 'Send report', exact: true }).click()
  await expect(dialog.getByText('GitHub issue created. Thank you!')).toBeVisible()
  expect(bodies).toHaveLength(3)
  expect(new Set(bodies).size).toBe(1)
})
