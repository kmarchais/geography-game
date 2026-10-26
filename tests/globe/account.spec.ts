import { test, expect } from '@playwright/test'

async function googleAccount(page: import('@playwright/test').Page, reject = false) {
  let connected = false
  await page.route('https://accounts.google.com/gsi/client', route => route.fulfill({ contentType: 'application/javascript', body: `window.google={accounts:{id:{initialize(config){window.atlasGoogleConfig=config},renderButton(host){const b=document.createElement('button');b.textContent='Sign in with Google';b.onclick=()=>window.atlasGoogleConfig.callback({credential:'signed-test-credential'});host.append(b)},disableAutoSelect(){}}}}` }))
  await page.route('**/atlas-api/auth/session', route => route.fulfill({ json: { user: connected ? { id: '11111111-1111-4111-8111-111111111111', name: 'Alex' } : null, best: connected ? { id: 'best', name: 'Alex', correct: 100, total: 195, timeMs: 5000 } : null, googleClientId: 'test.apps.googleusercontent.com' } }))
  await page.route('**/atlas-api/auth/challenge', route => route.fulfill({ json: { nonce: 'a'.repeat(43) } }))
  await page.route('**/atlas-api/auth/google', route => {
    expect(route.request().postDataJSON()).toEqual({ credential: 'signed-test-credential' })
    connected = !reject
    return route.fulfill({ status: reject ? 401 : 200, json: { user: connected ? { id: '11111111-1111-4111-8111-111111111111', name: 'Alex' } : null } })
  })
  await page.route('**/atlas-api/auth/logout', route => {connected = false; return route.fulfill({ json: { user: null } })})
}
test('Google connection restores account best and sign-out returns to guest play', async ({ page }) => {
  await googleAccount(page)
  await page.goto('./')
  await page.getByRole('button', { name: 'Sign in with Google', exact: true }).click()
  await expect(page.getByText('Connected as Alex')).toBeVisible()
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Alex')
  await expect(page.locator('.personal-best')).toContainText('51.3%')
  expect(await page.evaluate(() => Object.keys(localStorage).some(k => /session|credential|token/i.test(k)))).toBe(false)
  await page.reload()
  await expect(page.getByText('Connected as Alex')).toBeVisible()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Sign in with Google', exact: true })).toBeVisible()
  await expect(page.getByText('Connected as Alex')).not.toBeVisible()
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByTestId('progress')).toHaveText('1 / 195')
  await expect(page.locator('.account-panel')).toHaveCount(0)
})
test('failed Google verification leaves guest play available', async ({ page }) => {
  await googleAccount(page, true)
  await page.goto('./')
  await page.getByRole('button', { name: 'Sign in with Google', exact: true }).click()
  await expect(page.getByText('Google connection failed. Please try again.')).toBeVisible()
  await page.getByLabel('Name', { exact: true }).fill('Guest')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByTestId('progress')).toHaveText('1 / 195')
})
test('legacy mode bookmarks open the same Atlas screen', async ({ page }) => {
  for (const path of ['classic', 'game/world-countries']) {
    await page.goto(path)
    await expect(page.getByRole('heading', { name: '195 countries.' })).toBeVisible()
    await expect(page.getByRole('combobox')).toHaveCount(0)
    await expect(page.getByRole('switch')).toHaveCount(0)
    await expect(page).toHaveURL(/\/geography-game\/$/)
  }
})
