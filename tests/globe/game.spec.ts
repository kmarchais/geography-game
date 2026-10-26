import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFileSync } from 'node:fs'
import { formatTime } from '../../src/globe/game'

const countries = JSON.parse(readFileSync('public/data/globe/countries.json', 'utf8')).filter((c: { playable: boolean }) => c.playable)
const order = ['TCD', ...countries.map((c: { id: string }) => c.id).filter((id: string) => id !== 'TCD')]
const earth = (page: Page) => page.getByRole('application', { name: /^Interactive Earth/ })
async function open(page: Page) {
  await page.goto('./')
  await page.getByLabel('Name', { exact: true }).fill('Atlas test')
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled()
}
async function mockRun(page: Page) {
  let correct = 0
  await page.route('**/atlas-api/runs', route => route.fulfill({ json: { id: '11111111-1111-4111-8111-111111111111', deck: order } }))
  await page.route('**/atlas-api/runs/*/answers', route => {
    const data = route.request().postDataJSON()
    correct += Number(data.guess === order[data.index])
    return route.fulfill({ json: { complete: false, correct, total: 195, timeMs: 1000 } })
  })
}
async function tapCenter(page: Page) {
  const canvas = earth(page)
  await canvas.scrollIntoViewIfNeeded()
  const box = (await canvas.boundingBox())!
  if (test.info().project.use.isMobile) {await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)}
  else {await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)}
}

test('Atlas has one minimal mode and fills a wide screen', async ({ page }) => {
  if (!test.info().project.use.isMobile) {await page.setViewportSize({ width: 2560, height: 1440 })}
  await open(page)
  await expect(page).toHaveTitle(/Atlas/)
  await expect(page.getByRole('heading', { name: '195 countries.' })).toBeVisible()
  await expect(page.getByRole('combobox')).toHaveCount(0)
  await expect(page.getByRole('switch')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  if (!test.info().project.use.isMobile) {expect((await page.locator('.orbit-app').boundingBox())!.width).toBe(2560)}
  expect((await earth(page).screenshot()).length).toBeGreaterThan(30000)
  await page.screenshot({ path: test.info().outputPath('atlas-layout.png'), fullPage: true })
})

test('shows the preview before the full image and country data arrive', async ({ page }) => {
  let release!: () => void
  const wait = new Promise<void>(resolve => { release = resolve })
  for (const path of ['earth.jpg', 'countries.json.gz']) {await page.route(`**/data/globe/${path}`, async route => {await wait; await route.continue()})}
  try {
    await page.goto('./', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.planet-loading')).not.toBeVisible()
    await expect(page.getByTestId('earth-host')).toHaveAttribute('data-base-detail', 'preview')
    await expect(page.getByRole('button', { name: 'Loading Earth…' })).toBeDisabled()
  } finally {release()}
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled()
})

test('a real country tap scores and advances instantly without Next', async ({ page }) => {
  await mockRun(page); await open(page)
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.locator('#target-name')).toHaveText('Chad')
  await tapCenter(page)
  await expect(page.getByTestId('answer-cue')).toHaveAttribute('data-outcome', 'correct')
  await expect(page.getByTestId('accuracy')).toHaveText('0.5%')
  await expect(page.getByTestId('progress')).toHaveText('2 / 195')
  await expect(page.locator('#target-name')).toHaveText('Afghanistan')
  await expect(page.getByRole('button', { name: /Next|hint|Pause/i })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Skip' })).toBeEnabled()
  await earth(page).focus(); await page.keyboard.press('Enter')
  await expect(page.getByTestId('answer-cue')).toHaveAttribute('data-outcome', 'wrong')
  await expect(page.getByTestId('progress')).toHaveText('3 / 195')
  await expect(page.getByTestId('accuracy')).toHaveText('0.5%')
  await expect(page.getByRole('button', { name: 'Skip' })).toBeEnabled()
  await page.getByRole('button', { name: 'Skip' }).click()
  await expect(page.getByTestId('progress')).toHaveText('4 / 195')
})

test('real touch dragging and pinch zoom do not answer countries', async ({ page }) => {
  await mockRun(page); await open(page); await page.getByRole('button', { name: 'Play', exact: true }).click()
  await earth(page).scrollIntoViewIfNeeded()
  const box = (await earth(page).boundingBox())!, x = box.x + box.width / 2, y = box.y + box.height / 2
  const before = await earth(page).screenshot()
  if (test.info().project.use.isMobile) {
    const input = await page.context().newCDPSession(page)
    await input.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] })
    for (let i = 1; i <= 10; i++) {await input.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + i * 7, y, id: 1 }] })}
    await input.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await input.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x - 25, y, id: 1 }, { x: x + 25, y, id: 2 }] })
    for (let i = 1; i <= 8; i++) {await input.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 25 - i * 4, y, id: 1 }, { x: x + 25 + i * 4, y, id: 2 }] })}
    await input.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await input.detach()
  } else {
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 90, y + 20, { steps: 12 }); await page.mouse.up()
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
  }
  expect(before.equals(await earth(page).screenshot())).toBe(false)
  await expect(page.getByTestId('progress')).toHaveText('1 / 195')
  const control = (await page.getByRole('button', { name: 'Zoom in', exact: true }).boundingBox())!
  expect(control.width).toBeGreaterThanOrEqual(44); expect(control.height).toBeGreaterThanOrEqual(44)
})

test('the chronometer includes background time and help never pauses it', async ({ page }) => {
  await page.clock.install(); await mockRun(page); await open(page)
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100))
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByTestId('progress')).toHaveText('1 / 195')
  await page.clock.fastForward(61000)
  await expect(page.getByTestId('timer')).toHaveText('01:01.0')
  await page.getByRole('button', { name: 'How to play' }).click()
  await page.clock.fastForward(3000)
  await expect(page.getByTestId('timer')).toHaveText('01:04.0')
  await page.keyboard.press('Escape')
})

test('all 195 answers publish an accurate time despite a lost final response', async ({ page }) => {
  test.setTimeout(90000)
  let dropped = false, correctTime = -1
  const finalBodies: string[] = []
  await page.route('**/atlas-api/runs/*/answers', async route => {
    const data = route.request().postDataJSON()
    if (data.guess === 'TCD') {correctTime = data.elapsedMs}
    if (data.index === 194) {
      finalBodies.push(route.request().postData()!)
      if (!dropped) {await route.fetch(); dropped = true; await route.abort(); return}
    }
    await route.continue()
  })
  await open(page)
  const runResponse = page.waitForResponse(r => r.url().endsWith('/atlas-api/runs') && r.request().method() === 'POST')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  const run = await (await runResponse).json()
  for (let i = 0; i < 195; i++) {
    if (run.deck[i] === 'TCD') {await tapCenter(page)}
    else {await page.getByRole('button', { name: 'Skip' }).click()}
  }
  await expect(page.getByRole('heading', { name: 'Your score' })).toBeVisible()
  await expect(page.getByTestId('accuracy')).toHaveText('0.5%')
  await expect(page.getByText('Saving score…')).not.toBeVisible({ timeout: 20000 })
  expect(correctTime).toBeGreaterThanOrEqual(0)
  await expect(page.getByTestId('timer')).toHaveText(formatTime(correctTime))
  expect(finalBodies).toHaveLength(2)
  expect(finalBodies[0]).toBe(finalBodies[1])
  await expect(page.locator('.ranking-panel table')).toContainText('Atlas test')
  await expect(page.getByText('Saved on this device. Shared ranking unavailable.')).not.toBeVisible()
  if (test.info().project.use.isMobile) {
    const viewport = page.viewportSize()!
    await page.evaluate(() => scrollTo(0, 200))
    await page.setViewportSize({ width: viewport.height, height: viewport.width })
    await page.setViewportSize(viewport)
    await expect.poll(async () => (await page.getByRole('heading', { name: 'Your score' }).boundingBox())!.y).toBeGreaterThanOrEqual(0)
  }
  await page.reload()
  await expect(page.locator('.personal-best')).toContainText('0.5%')
})

test('supports rapid skips and repairs a corrupt stored guest identity', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('atlas-player-id', 'a'.repeat(36)))
  await open(page)
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByTestId('progress')).toHaveText('1 / 195')
  for (let i = 0; i < 3; i++) {await page.getByRole('button', { name: 'Skip' }).click()}
  await expect(page.getByTestId('progress')).toHaveText('4 / 195')
  expect(await page.evaluate(() => localStorage.getItem('atlas-player-id'))).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  await expect(page.getByText('Offline · unranked run')).not.toBeVisible()
})

test('offline practice remains playable and is clearly unranked', async ({ page }) => {
  await page.route('**/atlas-api/**', route => route.abort())
  await open(page); await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByText('Offline · unranked run')).toBeVisible()
  await page.getByRole('button', { name: 'Skip' }).click()
  await expect(page.getByTestId('progress')).toHaveText('2 / 195')
})

test('data errors retry, keyboard works, and accessibility checks pass', async ({ page }) => {
  await page.route('**/data/globe/countries.json*', route => route.fulfill({ status: 503, body: 'Unavailable' }))
  await page.goto('./'); await expect(page.getByRole('alert')).toContainText('503')
  await page.unroute('**/data/globe/countries.json*')
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await page.getByLabel('Name', { exact: true }).fill('Keyboard')
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await mockRun(page); await page.getByRole('button', { name: 'Play', exact: true }).click()
  await earth(page).focus(); await page.keyboard.press('Enter')
  await expect(page.getByTestId('progress')).toHaveText('2 / 195')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.getByRole('button', { name: 'How to play' }).click()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
})

test('stops rendering when the full globe is idle', async ({ page }) => {
  await page.addInitScript(() => {
    let frames = 0
    const original = requestAnimationFrame.bind(window)
    window.requestAnimationFrame = callback => {frames++; return original(callback)}
    Object.defineProperty(window, 'atlasFrames', { get: () => frames })
  })
  await open(page)
  await expect(page.getByTestId('earth-host')).toHaveAttribute('data-base-detail', 'full')
  await page.waitForTimeout(2300)
  const before = await page.evaluate(() => Reflect.get(window, 'atlasFrames'))
  await page.waitForTimeout(500)
  expect(await page.evaluate(() => Reflect.get(window, 'atlasFrames'))).toBe(before)
})
