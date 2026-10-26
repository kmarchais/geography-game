import { test, expect } from '@playwright/test'

async function googleAccount(page: import('@playwright/test').Page, reject = false, retainSession = true) {
  let connected = false
  await page.route('https://accounts.google.com/gsi/client', route => route.fulfill({ contentType: 'application/javascript', body: `window.google={accounts:{id:{initialize(config){window.atlasGoogleConfig=config},renderButton(host,options){window.atlasGoogleButtonOptions=options;const b=document.createElement('button');b.textContent='Sign in with Google';b.style.width=options.width+'px';b.style.height='40px';b.onclick=()=>window.atlasGoogleConfig.callback({credential:'signed-test-credential'});host.append(b)},disableAutoSelect(){}}}}` }))
  await page.route('**/atlas-api/auth/session', route => route.fulfill({ json: { user: connected ? { id: '11111111-1111-4111-8111-111111111111', name: 'Alex' } : null, best: connected ? { id: 'best', name: 'Alex', correct: 100, total: 195, timeMs: 5000 } : null, googleClientId: 'test.apps.googleusercontent.com' } }))
  await page.route('**/atlas-api/auth/challenge', route => route.fulfill({ json: { nonce: 'a'.repeat(43) } }))
  await page.route('**/atlas-api/auth/google', route => {
    expect(route.request().postDataJSON()).toEqual({ credential: 'signed-test-credential' })
    connected = !reject && retainSession
    return route.fulfill({ status: reject ? 401 : 200, json: { user: !reject ? { id: '11111111-1111-4111-8111-111111111111', name: 'Alex' } : null } })
  })
  await page.route('**/atlas-api/auth/logout', route => {connected = false; return route.fulfill({ json: { user: null } })})
}

test('Google entry is aligned above guest play and adapts to the available width', async ({ page }) => {
  await googleAccount(page)
  await page.goto('./')
  const button = page.locator('.start-card .google-web-button').getByRole('button', { name: 'Sign in with Google', exact: true })
  await expect(button).toBeVisible()
  const { entry, form } = await page.locator('.start-card').evaluate(card => ({
    entry: card.querySelector('.google-web-button button')!.getBoundingClientRect().toJSON(),
    form: card.querySelector('form')!.getBoundingClientRect().toJSON(),
  }))
  expect(entry.y + entry.height).toBeLessThan(form.y)
  expect(entry.width).toBeCloseTo(Math.min(400, form.width), 0)
  expect(await page.evaluate(() => (window as unknown as { atlasGoogleButtonOptions: { theme: string; shape: string } }).atlasGoogleButtonOptions)).toMatchObject({ theme: 'filled_black', shape: 'pill' })
  await page.setViewportSize({ width: 600, height: 900 })
  await expect.poll(async () => (await button.boundingBox())?.width).toBe(400)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
test('Google connection restores account best and sign-out returns to guest play', async ({ page }) => {
  await googleAccount(page)
  await page.goto('./')
  await page.getByRole('button', { name: 'Sign in with Google', exact: true }).click()
  await expect(page.getByText('Connected as Alex')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign in with Google', exact: true })).toBeHidden()
  await expect(page.getByLabel('Name', { exact: true })).toBeHidden()
  await expect(page.getByText('or play as a guest', { exact: true })).toBeHidden()
  await expect(page.getByText('Your scores follow you across devices.')).toBeVisible()
  const card = (await page.locator('.account-row').boundingBox())!
  const play = (await page.locator('form .primary-button').boundingBox())!
  expect(play.y - card.y - card.height).toBeGreaterThanOrEqual(16)
  expect(play.width).toBeCloseTo(card.width, 0)
  await page.screenshot({ path: test.info().outputPath('atlas-connected-account.png'), fullPage: true })
  await expect(page.locator('.personal-best')).toContainText('51.3%')
  expect(await page.evaluate(() => Object.keys(localStorage).some(k => /session|credential|token/i.test(k)))).toBe(false)
  await page.reload()
  await expect(page.getByText('Connected as Alex')).toBeVisible()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Sign in with Google', exact: true })).toBeVisible()
  await expect(page.getByText('Connected as Alex')).not.toBeVisible()
  await expect(page.getByLabel('Name', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByTestId('progress')).toHaveText('1 / 195')
  await expect(page.locator('.account-panel')).toHaveCount(0)
})

test('Google login without a retained session explicitly stays disconnected', async ({ page }) => {
  await googleAccount(page, false, false)
  await page.goto('./')
  await page.getByRole('button', { name: 'Sign in with Google', exact: true }).click()
  await expect(page.getByText('Google connection could not be confirmed. You are not connected. Please try again.')).toBeVisible()
  await expect(page.locator('.account-row')).toBeHidden()
  await expect(page.getByLabel('Name', { exact: true })).toBeVisible()
})

test('connected play uses the account name instead of a previously saved guest name', async ({ page }) => {
  await googleAccount(page)
  await page.addInitScript(() => localStorage.setItem('atlas-name', 'Previous guest'))
  await page.goto('./')
  await page.getByRole('button', { name: 'Sign in with Google', exact: true }).click()
  await expect(page.getByText('Connected as Alex')).toBeVisible()
  const started = page.waitForRequest(request => request.url().endsWith('/atlas-api/runs') && request.method() === 'POST')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  expect((await started).postDataJSON().name).toBe('Alex')
  await expect(page.getByTestId('progress')).toHaveText('1 / 195')
})

test('unavailable Google script leaves one entry button without an empty row', async ({ page }) => {
  await googleAccount(page)
  await page.route('https://accounts.google.com/gsi/client', route => route.abort())
  await page.goto('./')
  await expect(page.getByText('Google connection unavailable. You can still play as a guest.')).toBeVisible()
  await expect(page.locator('.google-web-button')).toBeHidden()
  const entry = page.getByRole('button', { name: 'Sign in with Google', exact: true })
  await expect(entry).toHaveCount(1)
  const box = (await entry.boundingBox())!, panel = (await page.locator('.account-panel').boundingBox())!
  expect(box.y - panel.y).toBeLessThan(3)
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled()
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

test('guest results offer Google sign-in and retry saving the completed score without replaying', async ({ page }) => {
  test.setTimeout(90000)
  await googleAccount(page)
  let attempts = 0
  // Keep the real API for all 195 answers; only Google and the claim response are mocked.
  await page.route('**/atlas-api/runs/*/claim', route => {
    expect(route.request().url()).toContain(`/runs/${run.id}/claim`)
    expect(route.request().postDataJSON()).toEqual({ claimToken: run.claimToken })
    attempts++
    return route.fulfill({ status: attempts <= 3 ? 503 : 200, json: attempts <= 3 ? { error: 'Unavailable' } : { saved: true } })
  })
  await page.goto('./')
  await page.getByLabel('Name', { exact: true }).fill('Guest results')
  const started = page.waitForResponse(response => response.url().endsWith('/atlas-api/runs') && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  const run: { id: string; claimToken: string } = await (await started).json()
  for (let i = 0; i < 195; i++) {await page.getByRole('button', { name: 'Skip' }).click()}
  await expect(page.getByRole('heading', { name: 'Your score' })).toBeVisible()
  await expect(page.getByText('Saving score…')).toBeHidden({ timeout: 20000 })
  await expect(page.getByText('Sign in to keep this score with your account.')).toBeVisible()
  await page.getByRole('button', { name: 'Sign in with Google', exact: true }).click()
  await expect(page.getByText('Could not save to your account. Try again.')).toBeVisible()
  expect(attempts).toBe(3)
  await page.getByRole('button', { name: 'Save score to account', exact: true }).click()
  await expect(page.getByText('Score saved to your account.')).toBeVisible()
  expect(attempts).toBe(4)
  await expect(page.getByTestId('accuracy')).toHaveText('0.0%')
  await expect(page.getByTestId('timer')).toHaveText('00:00.0')
  await expect(page.getByRole('button', { name: 'Save score to account', exact: true })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Play again', exact: true })).toBeEnabled()
  expect(await page.evaluate(() => Object.keys(localStorage).some(key => /token|credential/i.test(key)))).toBe(false)
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
