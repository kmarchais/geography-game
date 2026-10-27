import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

async function googleAccount(page: import('@playwright/test').Page, reject = false, retainSession = true) {
  let connected = false
  let user = { id: '11111111-1111-4111-8111-111111111111', name: 'Alex', picture: 'https://lh3.googleusercontent.com/atlas-test', avatar: 'google' }
  await page.route(user.picture, route => route.fulfill({ contentType: 'image/png', body: readFileSync('public/atlas-192.png') }))
  await page.route('https://accounts.google.com/gsi/client', route => route.fulfill({ contentType: 'application/javascript', body: `window.google={accounts:{id:{initialize(config){window.atlasGoogleConfig=config},renderButton(host,options){window.atlasGoogleButtonOptions=options;const b=document.createElement('div');b.setAttribute('role','button');b.tabIndex=0;b.textContent='Sign in with Google';b.style.width=options.width+'px';b.style.height='40px';b.onclick=()=>window.atlasGoogleConfig.callback({credential:'signed-test-credential'});b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();b.click()}};host.append(b)},disableAutoSelect(){}}}}` }))
  await page.route('**/atlas-api/auth/session', route => route.fulfill({ json: { user: connected ? user : null, best: connected ? { id: 'best', name: user.name, correct: 100, total: 195, timeMs: 5000 } : null, googleClientId: 'test.apps.googleusercontent.com' } }))
  await page.route('**/atlas-api/scores/me', route => route.fulfill({ json: connected ? [{ id: 'best', name: user.name, correct: 100, total: 195, timeMs: 5000 }] : [] }))
  await page.route('**/atlas-api/auth/challenge', route => route.fulfill({ json: { nonce: 'a'.repeat(43) } }))
  await page.route('**/atlas-api/auth/google', route => {
    expect(route.request().postDataJSON()).toEqual({ credential: 'signed-test-credential' })
    connected = !reject && retainSession
    return route.fulfill({ status: reject ? 401 : 200, json: { user: !reject ? user : null } })
  })
  await page.route('**/atlas-api/runs/*/claim', route => route.fulfill({ json: { saved: true } }))
  await page.route('**/atlas-api/auth/logout', route => {connected = false; return route.fulfill({ json: { user: null } })})
  await page.route('**/atlas-api/auth/profile', route => {
    const data = route.request().postDataJSON()
    user = { ...user, name: data.name, avatar: data.avatar }
    return route.fulfill({ json: { user } })
  })
}

async function finishRun(page: import('@playwright/test').Page) {
  await expect(page.locator('#player-name')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Sign in with Google', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await page.locator('.skip-button').evaluate(button => {for (let i = 0; i < 195; i++) {(button as HTMLButtonElement).click()}})
  await expect(page.getByRole('heading', { name: 'Score', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled({ timeout: 20000 })
}

async function connectFromMenu(page: import('@playwright/test').Page) {
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  await page.locator('#menu-google-entry').getByRole('button', { name: 'Sign in with Google', exact: true }).click()
  await expect(page.locator('.account-avatar:not(.guest-avatar)')).toBeVisible()
  await page.keyboard.press('Escape')
}
async function startAgain(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Back to home', exact: true }).click()
  await page.getByRole('button', { name: 'Play', exact: true }).click()
}

async function editProfile(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Edit profile', exact: true }).click()
}

test('Google entry stays on the result card, outside the header, at every width', async ({ page }) => {
  await googleAccount(page); await page.goto('./'); await finishRun(page)
  const button = page.locator('.result-google-entry').getByRole('button', { name: 'Sign in with Google', exact: true })
  await expect(button).toBeVisible()
  await expect(page.locator('.orbit-header .google-web-button')).toHaveCount(0)
  for (const width of [1440, 600, 320]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(async () => {
      await button.scrollIntoViewIfNeeded()
      const entry = await button.boundingBox(), card = await page.locator('.mission-card').boundingBox()
      const host = await page.locator('.result-google-entry .google-web-button').boundingBox()
      if (!entry || !card || !host) {throw new Error('Google is still rendering after resize')}
      expect(entry.width).toBeCloseTo(host.width, 0)
      expect(entry.x).toBeGreaterThanOrEqual(card.x)
      expect(entry.x + entry.width).toBeLessThanOrEqual(card.x + card.width)
      expect(entry.y).toBeGreaterThanOrEqual(card.y)
      expect(entry.y + entry.height).toBeLessThanOrEqual(card.y + card.height)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }).toPass({ timeout: 5000 })
  }
  expect(await page.evaluate(() => (window as unknown as { atlasGoogleButtonOptions: { theme: string; shape: string; text: string } }).atlasGoogleButtonOptions)).toMatchObject({ theme: 'filled_black', shape: 'pill', text: 'signin' })
})

test('the guest avatar opens Google sign-in in the menu before playing', async ({ page }) => {
  await googleAccount(page); await page.goto('./')
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled()
  await expect(page.locator('.guest-avatar .guest-silhouette')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign in with Google', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  const entry = page.locator('#menu-google-entry').getByRole('button', { name: 'Sign in with Google', exact: true })
  await expect(entry).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(entry).toBeHidden()
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  await expect(entry).toBeVisible()
  await page.keyboard.press('Home')
  await expect(entry).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('.account-avatar:not(.guest-avatar)')).toHaveAttribute('title', 'Connected as Alex')
  await expect(page.locator('#atlas-menu')).toContainText('Connected as Alex')
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled()
})

test('the profile picture opens account actions and sign-out restores the minimal start', async ({ page }) => {
  await googleAccount(page); await page.goto('./'); await connectFromMenu(page)
  const avatar = page.locator('.orbit-header .account-avatar:not(.guest-avatar)')
  await expect(avatar).toHaveAttribute('title', 'Connected as Alex')
  await expect(page.getByRole('button', { name: 'Sign in with Google', exact: true })).toBeHidden()
  await expect(page.getByLabel('Nickname', { exact: true })).toBeHidden()
  await expect(page.getByRole('menuitem', { name: 'Sign out', exact: true })).toBeHidden()
  await avatar.click()
  await expect(page.locator('#atlas-menu .account-identity')).toContainText('Connected as Alex')
  await expect(page.getByRole('menuitem', { name: 'Edit profile', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Scores', exact: true }).click()
  const scores = page.getByRole('dialog', { name: 'Scores', exact: true })
  await scores.getByRole('button', { name: 'Your scores', exact: true }).click()
  await expect(scores).toContainText('51.3%')
  await scores.getByRole('button', { name: 'Close', exact: true }).click()
  expect(await page.evaluate(() => Object.keys(localStorage).some(k => /session|credential|token/i.test(k)))).toBe(false)
  await page.reload()
  await expect(avatar).toHaveAttribute('title', 'Connected as Alex')
  await avatar.click()
  await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Sign in with Google', exact: true })).toBeHidden()
  await expect(avatar).toBeHidden()
  await expect(page.getByLabel('Nickname', { exact: true })).toBeHidden()
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByTestId('progress')).toHaveText('1 / 195')
  await expect(page.locator('.account-panel')).toHaveCount(1)
  await expect(page.locator('.google-web-button')).toHaveCount(0)
})

test('signed-in countries do not enter the guest statistics after sign-out', async ({ page }) => {
  await googleAccount(page); await page.goto('./'); await finishRun(page)
  const guestStatistics = await page.evaluate(() => localStorage.getItem('atlas-country-stats'))
  await page.getByRole('button', { name: 'Sign in with Google', exact: true }).click()
  const avatar = page.locator('.account-avatar:not(.guest-avatar)')
  await expect(avatar).toHaveAttribute('title', 'Connected as Alex')
  await startAgain(page)
  await page.locator('.skip-button').evaluate(button => {for (let i = 0; i < 195; i++) {(button as HTMLButtonElement).click()}})
  await expect(page.getByRole('heading', { name: 'Score', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled({ timeout: 20000 })
  expect(await page.evaluate(() => localStorage.getItem('atlas-country-stats'))).toBe(guestStatistics)
  await avatar.click()
  await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click()
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Statistics', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Statistics', exact: true })).toContainText('On this device')
  expect(await page.getByRole('dialog', { name: 'Statistics', exact: true }).locator('tbody tr').count()).toBe(195)
})

test('Google login without a retained session explicitly stays disconnected', async ({ page }) => {
  await googleAccount(page, false, false)
  await page.goto('./'); await finishRun(page)
  await page.getByRole('button', { name: 'Sign in with Google', exact: true }).click()
  await expect(page.getByText('Google connection could not be confirmed. You are not connected. Please try again.')).toBeVisible()
  await expect(page.locator('.account-avatar:not(.guest-avatar)')).toBeHidden()
  await expect(page.getByLabel('Nickname', { exact: true })).toBeVisible()
})

test('connected play prefills the editable account nickname instead of an old guest name', async ({ page }) => {
  await googleAccount(page)
  await page.addInitScript(() => localStorage.setItem('atlas-name', 'Previous guest'))
  await page.goto('./'); await connectFromMenu(page)
  const started = page.waitForRequest(request => request.url().endsWith('/atlas-api/runs') && request.method() === 'POST')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  expect((await started).postDataJSON()).toEqual({})
  await page.locator('.skip-button').evaluate(button => {for (let i = 0; i < 195; i++) {(button as HTMLButtonElement).click()}})
  await expect(page.getByRole('heading', { name: 'Score', exact: true })).toBeVisible()
  await expect(page.getByLabel('Nickname', { exact: true })).toHaveValue('Alex')
  await expect(page.getByLabel('Nickname', { exact: true })).toBeEditable()
})

test('profile username, preset and uploaded photo persist, while cancelling discards a draft', async ({ page }) => {
  await googleAccount(page); await page.goto('./'); await connectFromMenu(page)
  await expect(page.locator('.account-avatar:not(.guest-avatar) img')).toHaveAttribute('src', 'https://lh3.googleusercontent.com/atlas-test')
  await editProfile(page)
  const dialog = page.getByRole('dialog', { name: 'Your profile' })
  const heading = (await dialog.locator('.profile-heading').boundingBox())!
  const preview = (await dialog.locator('.profile-preview').boundingBox())!
  expect(preview.y).toBeGreaterThanOrEqual(heading.y + heading.height)
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  await expect(dialog.getByRole('button', { name: 'Google photo', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await dialog.getByRole('button', { name: 'Compass avatar' }).click()
  await dialog.getByRole('button', { name: 'Close profile' }).click()
  await expect(page.locator('.account-avatar:not(.guest-avatar) img')).toHaveAttribute('src', 'https://lh3.googleusercontent.com/atlas-test')
  await editProfile(page)
  await dialog.getByLabel('Username', { exact: true }).fill('Cartographer')
  await dialog.getByRole('button', { name: 'Compass avatar' }).click()
  await dialog.getByRole('button', { name: 'Save profile', exact: true }).click()
  await expect(page.locator('.account-avatar:not(.guest-avatar)')).toHaveAttribute('title', 'Connected as Cartographer')
  await expect(page.locator('.account-avatar:not(.guest-avatar)')).toContainText('🧭')
  await page.reload()
  await expect(page.locator('.account-avatar:not(.guest-avatar)')).toHaveAttribute('title', 'Connected as Cartographer')
  await expect(page.locator('.account-avatar:not(.guest-avatar)')).toContainText('🧭')
  await editProfile(page)
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 16; canvas.height = 8
    const context = canvas.getContext('2d')!; context.fillStyle = '#99edc5'; context.fillRect(0, 0, 16, 8)
    return canvas.toDataURL('image/png').split(',')[1]!
  })
  await dialog.locator('input[type=file]').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') })
  await expect(dialog.locator('.profile-preview img')).toHaveAttribute('src', /^data:image\/jpeg;base64,/)
  await expect.poll(() => dialog.locator('.profile-preview img').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(256)
  const saved = page.waitForRequest(request => request.url().endsWith('/auth/profile') && request.method() === 'POST')
  await dialog.getByRole('button', { name: 'Save profile', exact: true }).click()
  const body = (await saved).postDataJSON()
  expect(body.name).toBe('Cartographer'); expect(body.avatar.length).toBeLessThan(88000)
  await expect(page.locator('.account-avatar:not(.guest-avatar) img')).toHaveAttribute('src', body.avatar)
  await page.reload()
  await expect(page.locator('.account-avatar:not(.guest-avatar) img')).toHaveAttribute('src', body.avatar)
})

test('profile save failure keeps the draft available for retry', async ({ page }) => {
  await googleAccount(page); await page.goto('./'); await finishRun(page)
  await page.getByRole('button', { name: 'Sign in with Google', exact: true }).click()
  await editProfile(page)
  const dialog = page.getByRole('dialog', { name: 'Your profile' })
  await dialog.getByLabel('Username', { exact: true }).fill('Navigator')
  const fail = (route: import('@playwright/test').Route) => route.fulfill({ status: 503, json: { error: 'Unavailable' } })
  await page.route('**/atlas-api/auth/profile', fail)
  await dialog.getByRole('button', { name: 'Save profile', exact: true }).click()
  await expect(dialog.getByText('Could not save your profile. Try again.')).toBeVisible()
  await expect(dialog.getByLabel('Username', { exact: true })).toHaveValue('Navigator')
  await page.unroute('**/atlas-api/auth/profile', fail)
  await dialog.getByRole('button', { name: 'Save profile', exact: true }).click()
  await expect(page.locator('.account-avatar:not(.guest-avatar)')).toHaveAttribute('title', 'Connected as Navigator')
})

test('unavailable Google script leaves one entry button without an empty row', async ({ page }) => {
  await googleAccount(page)
  await page.route('https://accounts.google.com/gsi/client', route => route.abort())
  await page.goto('./'); await finishRun(page)
  await expect(page.getByText('Google connection unavailable. You can still play as a guest.')).toBeVisible()
  await expect(page.locator('.google-web-button')).toBeHidden()
  const entry = page.getByRole('button', { name: 'Sign in with Google', exact: true })
  await expect(entry).toHaveCount(1)
  const box = (await entry.boundingBox())!, panel = (await page.locator('.result-google-entry').boundingBox())!
  expect(box.y - panel.y).toBeLessThan(3)
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled()
})
test('failed Google verification leaves guest play available', async ({ page }) => {
  await googleAccount(page, true)
  await page.goto('./')
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  await page.getByRole('button', { name: 'Sign in with Google', exact: true }).click()
  await expect(page.getByText('Google connection failed. Please try again.')).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByTestId('progress')).toHaveText('1 / 195')
})

test('guest results offer Google, prefill an editable nickname, and save with idempotent retries', async ({ page }) => {
  test.setTimeout(90000)
  await googleAccount(page)
  let attempts = 0
  await page.route('**/atlas-api/runs/*/claim', route => {
    expect(route.request().url()).toContain(`/runs/${run.id}/claim`)
    expect(route.request().postDataJSON()).toEqual({ claimToken: run.claimToken })
    attempts++
    return route.fulfill({ status: attempts <= 3 ? 503 : 200, json: attempts <= 3 ? { error: 'Unavailable' } : { saved: true } })
  })
  await page.goto('./')
  const started = page.waitForResponse(response => response.url().endsWith('/atlas-api/runs') && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  const run: { id: string; claimToken: string } = await (await started).json()
  await page.locator('.skip-button').evaluate(button => {for (let i = 0; i < 195; i++) {(button as HTMLButtonElement).click()}})
  await expect(page.getByRole('heading', { name: 'Score', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled({ timeout: 20000 })
  await expect(page.getByTestId('correct-total')).toHaveText('0/195')
  await expect(page.getByTestId('timer')).toHaveText('00:00')
  await expect(page.getByText('Saved without a name. This run contributes to global statistics.')).toHaveCount(0)
  await page.locator('.result-google-entry').getByRole('button', { name: 'Sign in with Google', exact: true }).click()
  await expect(page.getByLabel('Nickname', { exact: true })).toHaveValue('Alex')
  expect(attempts).toBe(0)
  await page.getByLabel('Nickname', { exact: true }).fill('Cartographer')
  const profile = page.waitForRequest(r => r.url().endsWith('/auth/profile'))
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  expect((await profile).postDataJSON()).toEqual({ name: 'Cartographer', avatar: 'google' })
  await expect(page.getByText('Could not save to your account. Try again.')).toBeVisible()
  expect(attempts).toBe(3)
  await expect(page.getByLabel('Nickname', { exact: true })).toHaveValue('Cartographer')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled()
  expect(attempts).toBe(4)
  await expect(page.locator('.account-avatar:not(.guest-avatar)')).toHaveAttribute('title', 'Connected as Cartographer')
  await page.reload()
  await expect(page.locator('.account-avatar:not(.guest-avatar)')).toHaveAttribute('title', 'Connected as Cartographer')
  expect(await page.evaluate(() => Object.keys(localStorage).some(key => /token|credential/i.test(key)))).toBe(false)
})

test('an empty nickname keeps a personal score without public publication and returns home', async ({ page }) => {
  await googleAccount(page)
  let publications = 0
  await page.route('**/atlas-api/runs/*/publish', route => {publications++; return route.fulfill({ json: { saved: true } })})
  await page.goto('./'); await finishRun(page)
  await expect(page.getByLabel('Nickname', { exact: true })).toHaveValue('')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled()
  expect(publications).toBe(0)
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Scores', exact: true }).click()
  const scores = page.getByRole('dialog', { name: 'Scores', exact: true })
  await scores.getByRole('button', { name: 'Your scores', exact: true }).click()
  await expect(scores).toContainText('0/195')
  await expect(scores).toContainText('00:00')
})

test('leaving the result waits for the final answer acknowledgment', async ({ page }) => {
  await googleAccount(page)
  let release!: () => void
  const gate = new Promise<void>(resolve => {release = resolve})
  await page.route('**/atlas-api/runs/*/answers', async route => {
    if (route.request().postDataJSON().index === 194) {await gate}
    await route.continue()
  })
  try {
    await page.goto('./')
    await page.getByRole('button', { name: 'Play', exact: true }).click()
    const final = page.waitForResponse(r => r.url().endsWith('/answers') && r.request().postDataJSON().index === 194)
    await page.locator('.skip-button').evaluate(button => {for (let i = 0; i < 195; i++) {(button as HTMLButtonElement).click()}})
    await expect(page.getByRole('heading', { name: 'Score', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Back to home', exact: true })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled()
    release()
    expect((await (await final).json()).complete).toBe(true)
    await expect(page.getByRole('button', { name: 'Back to home', exact: true })).toBeEnabled()
    await page.getByRole('button', { name: 'Back to home', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled()
  } finally {release()}
})

test('a run cannot claim to save when both shared and local storage fail', async ({ page }) => {
  await googleAccount(page)
  await page.route('**/atlas-api/runs', route => route.fulfill({ status: 503, json: { error: 'Unavailable' } }))
  await page.addInitScript(() => {
    const set = Storage.prototype.setItem
    Storage.prototype.setItem = function(key, value) {if (key === 'atlas-runs-v3') {throw new Error('Blocked')} return set.call(this, key, value)}
  })
  await page.goto('./'); await page.getByRole('button', { name: 'Play', exact: true }).click()
  await page.locator('.skip-button').evaluate(button => {for (let i = 0; i < 195; i++) {(button as HTMLButtonElement).click()}})
  await expect(page.getByRole('heading', { name: 'Score', exact: true })).toBeVisible()
  await expect(page.getByText('Ranking unavailable. This device could not save your score.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Back to home', exact: true })).toBeEnabled()
})

test('legacy mode bookmarks open the same Atlas screen', async ({ page }) => {
  for (const path of ['classic', 'game/world-countries']) {
    await page.goto(path)
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible()
    await expect(page.getByRole('combobox')).toHaveCount(0)
    await expect(page.getByRole('switch')).toHaveCount(0)
    await expect(page).toHaveURL(/\/geography-game\/$/)
  }
})
