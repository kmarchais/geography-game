import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFileSync } from 'node:fs'
import { formatTime } from '../../src/globe/game'
import { PerspectiveCamera, Vector3 } from 'three'
import { coordinateToVector } from '../../src/globe/geography'

const countries = JSON.parse(readFileSync('public/data/globe/countries.json', 'utf8')).filter((c: { playable: boolean }) => c.playable)
const order = ['TCD', ...countries.map((c: { id: string }) => c.id).filter((id: string) => id !== 'TCD')]
const earth = (page: Page) => page.getByRole('application', { name: /^Interactive Earth/ })
async function open(page: Page) {
  await page.goto('./')
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

test('minimal start, desktop ranking, and globe edges fill the viewport below the header', async ({ page }) => {
  if (!test.info().project.use.isMobile) {await page.setViewportSize({ width: 2560, height: 1440 })}
  await open(page)
  await expect(page).toHaveTitle(/Atlas/)
  await expect(page.locator('#player-name')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Sign in with Google', exact: true })).toHaveCount(0)
  await expect(page.locator('.globe-tools')).toHaveCount(0)
  const width = page.viewportSize()!.width
  if (width >= 1000) {
    await expect(page.locator('.ranking-sidebar')).toBeVisible()
    const info = page.getByRole('button', { name: 'Why 195 countries?', exact: true })
    await info.click(); await expect(page.getByRole('tooltip')).toHaveText('193 UN members + 2 observer states.')
    await page.keyboard.press('Escape')
  } else {await expect(page.locator('.ranking-sidebar')).toBeHidden()}
  const header = (await page.locator('.orbit-header').boundingBox())!, canvas = (await earth(page).boundingBox())!
  const button = (await page.getByRole('button', { name: 'Play', exact: true }).boundingBox())!
  expect(canvas.y).toBeCloseTo(header.y + header.height, 0)
  expect(canvas.y + canvas.height).toBeCloseTo(page.viewportSize()!.height, 0)
  expect(button.x + button.width / 2).toBeCloseTo(canvas.x + canvas.width / 2, 0)
  expect(button.y + button.height / 2).toBeCloseTo(canvas.y + canvas.height / 2, 0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true)
  const screenshot = test.info().outputPath('atlas-minimal-start.png')
  await page.screenshot({ path: screenshot })
  await test.info().attach('Minimal start', { path: screenshot, contentType: 'image/png' })
})

test('close-zoom dragging redraws even below the controls change threshold', async ({ page }) => {
  await page.route('https://gibs.earthdata.nasa.gov/**', route => route.abort())
  await page.addInitScript(() => {
    const counter = window as unknown as { atlasDraws: number }
    counter.atlasDraws = 0
    const draw = WebGL2RenderingContext.prototype.drawElements
    WebGL2RenderingContext.prototype.drawElements = function(...args) {counter.atlasDraws++; return draw.apply(this, args)}
  })
  await open(page)
  for (let i = 0; i < 21; i++) {await earth(page).press('+')}
  const box = (await earth(page).boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  const frames: number[] = []
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(box.x + box.width / 2 + i, box.y + box.height / 2)
    frames.push(await page.evaluate(() => new Promise<number>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve((window as unknown as { atlasDraws: number }).atlasDraws))))))
  }
  await page.mouse.up()
  expect(frames.filter((draws, i) => i > 0 && draws > frames[i - 1]!).length).toBeGreaterThanOrEqual(6)
})

test('Andorra is unpainted before finding it and its zoomed territory remains selectable', async ({ page }) => {
  await page.route('https://gibs.earthdata.nasa.gov/**', route => route.abort())
  await mockRun(page)
  await page.route('**/atlas-api/runs', route => route.fulfill({ json: { id: '11111111-1111-4111-8111-111111111111', deck: ['AND', ...order.filter(id => id !== 'AND')] } }))
  await open(page)
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  let longitude = 18, latitude = 16, distance = 3.1
  // Navigate through the same keyboard controls as a player, refining at each zoom.
  for (let level = 0; level <= 20; level++) {
    const step = Math.max(.002, (distance - 1) * 2)
    for (const [axis, target] of [['longitude', 1.57], ['latitude', 42.54]] as const) {
      const current = axis === 'longitude' ? longitude : latitude
      const count = Math.round((target - current) / step)
      const key = axis === 'longitude' ? count > 0 ? 'ArrowRight' : 'ArrowLeft' : count > 0 ? 'ArrowUp' : 'ArrowDown'
      for (let n = 0; n < Math.abs(count); n++) {await earth(page).press(key)}
      if (axis === 'longitude') {longitude += count * step}
      else {latitude += count * step}
    }
    if (level < 20) {
      await earth(page).press('+')
      distance = Math.max(1.002, 1 + (distance - 1) * .7)
    }
  }
  const before = await earth(page).screenshot({ path: test.info().outputPath('andorra-unanswered.png') })
  const pixel = await page.evaluate(async source => {
    const image = new Image(); image.src = source
    await image.decode()
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
    const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0)
    return [...context.getImageData(Math.floor(image.width / 2) + 12, Math.floor(image.height / 2), 1, 1).data]
  }, `data:image/png;base64,${before.toString('base64')}`)
  expect(Math.abs(pixel[0]! - 119) + Math.abs(pixel[1]! - 156) + Math.abs(pixel[2]! - 121)).toBeGreaterThan(20)
  await tapCenter(page)
  await expect(page.getByTestId('progress')).toHaveText('2 / 195')
  await expect(page.getByTestId('accuracy')).toHaveText('0.5%')
  await earth(page).screenshot({ path: test.info().outputPath('andorra-found.png') })
})

test('wheel zoom keeps Andorra under the mouse until its territory is directly selectable', async ({ page }) => {
  test.skip(!!test.info().project.use.isMobile, 'Mouse wheel interaction is a desktop control')
  await page.route('https://gibs.earthdata.nasa.gov/**', route => route.abort())
  await mockRun(page)
  await page.route('**/atlas-api/runs', route => route.fulfill({ json: { id: '11111111-1111-4111-8111-111111111111', deck: ['AND', ...order.filter(id => id !== 'AND')] } }))
  await open(page)
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  const box = (await earth(page).boundingBox())!
  const camera = new PerspectiveCamera(42, box.width / box.height, .01, 100)
  camera.position.fromArray(coordinateToVector([18, 16])).multiplyScalar(3.1)
  camera.lookAt(0, 0, 0); camera.updateMatrixWorld()
  const andorra = countries.find((c: { id: string }) => c.id === 'AND')
  const point = new Vector3(...coordinateToVector(andorra.center)).multiplyScalar(1.0003).project(camera)
  const x = box.x + (point.x + 1) * box.width / 2, y = box.y + (1 - point.y) * box.height / 2
  await page.mouse.move(x, y)
  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, -500)
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  }
  await page.mouse.click(x, y)
  await expect(page.getByTestId('accuracy')).toHaveText('0.5%')
  await expect(page.getByTestId('progress')).toHaveText('2 / 195')
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
  await page.clock.install()
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
  await expect(page.getByTestId('progress')).toHaveText('2 / 195')
  await earth(page).press('Enter')
  await expect(page.locator('.attempts-left')).toContainText('1')
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 50))
  await earth(page).press('Enter')
  await expect(page.getByTestId('earth-host')).toHaveAttribute('data-reveal', 'AFG')
  const paused = await page.getByTestId('timer').textContent()
  await expect(page.getByRole('button', { name: 'Skip' })).toBeDisabled()
  await page.clock.runFor(400)
  await expect(page.getByTestId('timer')).toHaveText(paused!)
  await page.clock.fastForward(1400)
  const screenshot = test.info().outputPath('atlas-country-reveal.png')
  await page.screenshot({ path: screenshot })
  await test.info().attach('Correct territory revealed in red', { path: screenshot, contentType: 'image/png' })
  const painted = await earth(page).screenshot()
  const pixel = await page.evaluate(async source => {
    const image = new Image(); image.src = source; await image.decode()
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
    const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0)
    return [...context.getImageData(Math.floor(image.width / 2) + 12, Math.floor(image.height / 2), 1, 1).data]
  }, `data:image/png;base64,${painted.toString('base64')}`)
  expect(pixel[0]!).toBeGreaterThan(170)
  expect(pixel[0]!).toBeGreaterThan(pixel[1]! * 1.5)
  expect(pixel[0]!).toBeGreaterThan(pixel[2]! * 1.5)
  await page.clock.fastForward(700)
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
    await earth(page).press('+')
  }
  expect(before.equals(await earth(page).screenshot())).toBe(false)
  await expect(page.getByTestId('progress')).toHaveText('1 / 195')
  await expect(page.locator('.globe-tools')).toHaveCount(0)
})

test('the chronometer includes background time and help never pauses it', async ({ page }) => {
  await page.clock.install(); await mockRun(page); await open(page)
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100))
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByTestId('progress')).toHaveText('1 / 195')
  await page.clock.fastForward(61000)
  await expect(page.getByTestId('timer')).toHaveText('01:01.0')
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  await page.getByRole('menuitem', { name: 'How to play' }).click()
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
  await expect(page.getByText('Saved without a name. This run contributes to global statistics.')).toBeVisible()
  await page.getByLabel('Nickname (optional)', { exact: true }).fill('Atlas test')
  await page.getByRole('button', { name: 'Publish score', exact: true }).click()
  await expect(page.getByText('Score published.', { exact: true })).toBeVisible()
  if (page.viewportSize()!.width >= 1000) {await expect(page.locator('.ranking-panel table')).toContainText('Atlas test')}
  await expect(page.getByText('Saved on this device. Shared ranking unavailable.')).not.toBeVisible()
  if (test.info().project.use.isMobile) {
    const viewport = page.viewportSize()!
    await page.evaluate(() => scrollTo(0, 200))
    await page.setViewportSize({ width: viewport.height, height: viewport.width })
    await page.setViewportSize(viewport)
    await expect.poll(async () => (await page.getByRole('heading', { name: 'Your score' }).boundingBox())!.y).toBeGreaterThanOrEqual(0)
  }
  await page.reload()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('atlas-runs-v3') || '[]')[0].correct)).toBe(1)
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Statistics', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Statistics', exact: true })).toContainText('Chad')
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
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await mockRun(page); await page.getByRole('button', { name: 'Play', exact: true }).click()
  await earth(page).focus(); await page.keyboard.press('Enter')
  await expect(page.getByTestId('progress')).toHaveText('2 / 195')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  await page.getByRole('menuitem', { name: 'How to play' }).click()
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
