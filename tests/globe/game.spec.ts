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
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled({ timeout: 15000 })
}
async function mockRun(page: Page, deck = order) {
  let correct = 0, timeMs = 0
  const counts = { green: 0, yellow: 0, orange: 0, red: 0 }
  await page.route('**/atlas-api/runs?*', route => {
    expect(route.request().postDataJSON()).toMatchObject({ source: test.info().project.use.isMobile ? 'mobile-web' : 'desktop-web', build: expect.any(String), dataset: expect.stringMatching(/^[0-9a-f]{64}$/) })
    return route.fulfill({ json: { id: '11111111-1111-4111-8111-111111111111', deck } })
  })
  await page.route('**/atlas-api/runs/*/answers', route => {
    const data = route.request().postDataJSON()
    const found = data.guess === deck[data.index], resolved = found || data.guess === null || data.attempt === 2
    if (found) {correct++; timeMs = data.elapsedMs}
    if (resolved) {counts[found ? (['green', 'yellow', 'orange'] as const)[data.attempt as 0 | 1 | 2] : 'red']++}
    return route.fulfill({ json: { complete: resolved && data.index === 194, correct, total: 195, timeMs, ...counts, score: counts.green + counts.yellow / 2 + counts.orange / 4 } })
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
  expect(button.width).toBeGreaterThan(button.height * 2)
  expect(button.width).toBeLessThanOrEqual(200)
  await expect(page.locator('.play-label')).toBeVisible()
  if (!test.info().project.use.isMobile) {await page.locator('.play-button').hover()}
  await expect(page.locator('.mission-panel')).toHaveCSS('overflow', 'visible')
  await expect(page.locator('.play-button')).toHaveCSS('transform', 'none')
  expect(await page.locator('.mission-panel').evaluate(element => element.scrollHeight <= element.clientHeight)).toBe(true)
  await page.locator('.play-button').focus()
  await expect(page.locator('.play-button')).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true)
  const screenshot = test.info().outputPath('atlas-minimal-start.png')
  await page.screenshot({ path: screenshot })
  await test.info().attach('Minimal start', { path: screenshot, contentType: 'image/png' })
  if (width >= 1800) {
    // Exercise native layout rules at tablet / desktop-window widths.
    await page.locator('.orbit-app').evaluate(element => {element.classList.add('native-app'); element.querySelector('.ranking-sidebar')?.remove()})
    await expect.poll(async () => (await earth(page).boundingBox())!.width).toBeCloseTo(width, 0)
    expect((await earth(page).boundingBox())!.x).toBe(0)
  }
})

test('starting a run keeps the unchanged globe idle', async ({ page }) => {
  await page.route('https://gibs.earthdata.nasa.gov/**', route => route.abort())
  await mockRun(page); await open(page)
  await expect(page.getByTestId('earth-host')).toHaveAttribute('data-base-detail', 'full')
  // Finish the idle geometry deadline and its frame before isolating Play.
  await page.waitForTimeout(2100)
  await page.evaluate(() => {
    const state = window as unknown as { playDraws: number }
    state.playDraws = 0
    const draw = WebGL2RenderingContext.prototype.drawElements
    WebGL2RenderingContext.prototype.drawElements = function(...args) {state.playDraws++; return draw.apply(this, args)}
  })
  let release!: () => void
  const pending = new Promise<void>(resolve => {release = resolve})
  await page.route('**/atlas-api/runs?*', async route => {await pending; await route.fulfill({ json: { id: '11111111-1111-4111-8111-111111111111', deck: order } })})
  try {
    await page.getByRole('button', { name: 'Play', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Starting…', exact: true })).toHaveAttribute('aria-busy', 'true')
    await expect(page.locator('.play-label')).toHaveText('Starting…')
    await page.evaluate(async () => {for (let n = 0; n < 8; n++) {await new Promise(resolve => requestAnimationFrame(resolve))}})
    await expect(page.getByRole('button', { name: 'Starting…', exact: true })).toBeDisabled()
  } finally {release()}
  await expect(page.locator('#target-name')).toHaveText('Chad')
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  expect(await page.evaluate(() => (window as unknown as { playDraws: number }).playDraws)).toBe(0)
})

test('Play restores a changed home view before accepting the first guess', async ({ page }) => {
  await mockRun(page); await open(page)
  for (let n = 0; n < 6; n++) {await earth(page).press('ArrowLeft')}
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.locator('#target-name')).toHaveText('Chad')
  await earth(page).press('Enter')
  await expect(page.getByTestId('progress')).toHaveText('2 / 195')
})

test('Stop confirmation preserves the run or returns home without saving a partial score', async ({ page }) => {
  await mockRun(page); await open(page)
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.locator('#target-name')).toHaveText('Chad')
  await earth(page).press('Enter')
  await expect(page.getByTestId('progress')).toHaveText('2 / 195')
  const stop = page.getByRole('button', { name: 'Stop run', exact: true })
  const box = (await stop.boundingBox())!
  expect(box.height).toBeGreaterThanOrEqual(44)
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width)
  await stop.click()
  const dialog = page.getByRole('dialog', { name: 'Stop run', exact: true })
  await expect(dialog.getByRole('heading')).toHaveText('Stop this run?')
  await dialog.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.getByTestId('progress')).toHaveText('2 / 195')
  await stop.click(); await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(page.getByTestId('progress')).toHaveText('2 / 195')
  await stop.click()
  await page.screenshot({ path: test.info().outputPath('stop-confirmation.png') })
  await dialog.getByRole('button', { name: 'Stop run', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled()
  await expect(stop).toHaveCount(0)
  await expect(page.locator('#target-name')).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.getItem('atlas-runs-v4'))).toBeNull()
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByTestId('progress')).toHaveText('1 / 195')
  await expect(page.getByTestId('accuracy')).toHaveText('0.0%')
})

test('Stop cancels a reveal without advancing a subsequent run', async ({ page }) => {
  await page.route('https://gibs.earthdata.nasa.gov/**', route => route.abort())
  await mockRun(page); await open(page)
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.locator('#target-name')).toHaveText('Chad')
  for (let n = 0; n < 6; n++) {await earth(page).press('ArrowLeft')}
  for (let n = 0; n < 3; n++) {await earth(page).press('Enter')}
  await expect(page.getByTestId('earth-host')).toHaveAttribute('data-reveal', 'TCD')
  await page.getByRole('button', { name: 'Stop run', exact: true }).click()
  await page.getByRole('dialog', { name: 'Stop run', exact: true }).getByRole('button', { name: 'Stop run', exact: true }).click()
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.locator('#target-name')).toHaveText('Chad')
  await page.waitForTimeout(1100) // The cancelled reveal's asynchronous continuation must stay cancelled.
  await expect(page.getByTestId('progress')).toHaveText('1 / 195')
  await expect(page.getByTestId('earth-host')).not.toHaveAttribute('data-reveal')
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
  await page.getByRole('button', { name: 'Play', exact: true }).click()
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
  await page.route('**/atlas-api/runs?*', route => route.fulfill({ json: { id: '11111111-1111-4111-8111-111111111111', deck: ['AND', ...order.filter(id => id !== 'AND')] } }))
  await open(page)
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.locator('#target-name')).toHaveText('Andorra')
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
  const sample = (png: Buffer) => page.evaluate(async source => {
    const image = new Image(); image.src = source
    await image.decode()
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
    const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0)
    return [...context.getImageData(Math.floor(image.width / 2) + 12, Math.floor(image.height / 2), 1, 1).data]
  }, `data:image/png;base64,${png.toString('base64')}`)
  const pixel = await sample(before)
  expect(Math.abs(pixel[0]! - 119) + Math.abs(pixel[1]! - 156) + Math.abs(pixel[2]! - 121)).toBeGreaterThan(20)
  await tapCenter(page)
  await expect(page.getByTestId('progress')).toHaveText('2 / 195')
  await expect(page.getByTestId('accuracy')).toHaveText('0.5%')
  await expect(page.getByTestId('answer-cue')).toHaveCount(0)
  const found = await earth(page).screenshot({ path: test.info().outputPath('andorra-found.png'), style: '.mission-panel { visibility: hidden !important; }' })
  if (!test.info().project.use.isMobile) {
    const green = await sample(found), box = (await earth(page).boundingBox())!
    await page.mouse.move(box.x + box.width / 2 + 8, box.y + box.height / 2)
    await expect(page.getByTestId('earth-host')).toHaveAttribute('data-hover', 'AND')
    const grey = await sample(await earth(page).screenshot({ style: '.mission-panel { visibility: hidden !important; }' }))
    expect(grey[0]! + grey[2]!).toBeGreaterThan(green[0]! + green[2]! + 15)
    await page.mouse.move(10, 10)
    await expect(page.getByTestId('earth-host')).not.toHaveAttribute('data-hover')
    const restored = await sample(await earth(page).screenshot({ style: '.mission-panel { visibility: hidden !important; }' }))
    expect(restored.reduce((n, value, i) => n + Math.abs(value - green[i]!), 0)).toBeLessThan(8)
  }
})

test('wheel zoom keeps Andorra under the mouse until its territory is directly selectable', async ({ page }) => {
  test.skip(!!test.info().project.use.isMobile, 'Mouse wheel interaction is a desktop control')
  await page.route('https://gibs.earthdata.nasa.gov/**', route => route.abort())
  await mockRun(page)
  await page.route('**/atlas-api/runs?*', route => route.fulfill({ json: { id: '11111111-1111-4111-8111-111111111111', deck: ['AND', ...order.filter(id => id !== 'AND')] } }))
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
  test.setTimeout(90000) // Fake-clock WebGL frames are expensive on software-rendered tablet runners.
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
  for (let n = 0; n < 2; n++) {await earth(page).press('ArrowRight')}
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
  await page.clock.runFor(300)
  const screenshot = test.info().outputPath('atlas-country-reveal.png')
  await page.screenshot({ path: screenshot })
  await test.info().attach('Correct territory revealed in red', { path: screenshot, contentType: 'image/png' })
  const painted = await earth(page).screenshot()
  const redPixels = async (painted: Buffer) => page.evaluate(async source => {
    const image = new Image(); image.src = source; await image.decode()
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
    const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0)
    const pixels = context.getImageData(0, 0, image.width, image.height).data
    let red = 0
    for (let i = 0; i < pixels.length; i += 4) {if (pixels[i]! > 170 && pixels[i]! > pixels[i + 1]! * 1.5 && pixels[i]! > pixels[i + 2]! * 1.5) {red++}}
    return red
  }, `data:image/png;base64,${painted.toString('base64')}`)
  const revealedRed = await redPixels(painted)
  expect(revealedRed).toBeGreaterThan(50)
  await page.clock.runFor(300)
  await expect(page.getByTestId('timer')).toHaveText(paused!)
  await expect(page.getByRole('button', { name: 'Skip' })).toBeDisabled()
  await page.clock.runFor(400)
  await expect(page.getByTestId('progress')).toHaveText('3 / 195')
  await expect(page.getByTestId('accuracy')).toHaveText('0.5%')
  await expect(page.getByRole('button', { name: 'Skip' })).toBeEnabled()
  const returnedRed = await redPixels(await earth(page).screenshot())
  expect(returnedRed).toBeGreaterThan(5)
  expect(returnedRed).toBeLessThan(revealedRed * .75)
  await page.getByRole('button', { name: 'Skip' }).click()
  await expect(page.getByTestId('progress')).toHaveText('4 / 195')
})

test('records wrong map guesses before a skip, input methods, and an explicit stop', async ({ page }) => {
  const deck = ['FRA', 'TCD', ...order.filter(id => id !== 'FRA' && id !== 'TCD')]
  await mockRun(page, deck)
  const attempts: Array<Record<string, unknown>> = [], recordings: Array<Record<string, unknown>> = []
  page.on('request', request => {if (request.url().endsWith('/answers')) {attempts.push(request.postDataJSON())}})
  await page.route('**/atlas-api/runs/*/recording', route => {recordings.push(route.request().postDataJSON()); return route.fulfill({ json: { recorded: true } })})
  await open(page); await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.locator('#target-name')).toHaveText('France')
  await tapCenter(page)
  await expect.poll(() => attempts.length).toBe(1)
  await earth(page).press('Enter')
  await expect.poll(() => attempts.length).toBe(2)
  const skip = page.getByRole('button', { name: 'Skip', exact: true })
  if (test.info().project.use.isMobile) {await skip.tap()} else {await skip.click()}
  await expect.poll(() => attempts.length).toBe(3)
  await expect(page.getByTestId('progress')).toHaveText('2 / 195')
  expect(attempts.map(a => a.guess)).toEqual(['TCD', 'TCD', null])
  const first = attempts[0]!.recording as { coordinate: number[]; input: string; cameraDistance: number; viewport: number[] }
  expect(first.coordinate[0]).toBeCloseTo(18, 1); expect(first.coordinate[1]).toBeCloseTo(16, 1)
  expect(first.input).toBe(test.info().project.use.isMobile ? 'touch' : 'mouse')
  expect(first.cameraDistance).toBeGreaterThan(1)
  expect(first.viewport.every(n => n > 0)).toBe(true)
  expect(attempts[1]!.recording).toMatchObject({ input: 'keyboard', markers: true, borders: true, paintFound: true })
  expect(attempts[2]!.recording).toMatchObject({ hit: 'skip', coordinate: null })
  await page.getByRole('button', { name: 'Stop run', exact: true }).click()
  await page.getByRole('dialog', { name: 'Stop run', exact: true }).getByRole('button', { name: 'Stop run', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled()
  await expect.poll(() => recordings.length).toBe(1)
  expect(recordings[0]).toMatchObject({ status: 'stopped', networkIssues: [] })
  const local = await page.evaluate(() => JSON.parse(localStorage.getItem('atlas-recordings-v1') || '[]').at(-1))
  expect(local.status).toBe('stopped')
  expect(local.attempts.map((a: { guess: string | null }) => a.guess)).toEqual(['TCD', 'TCD', null])
  expect(local.attempts.every((a: { responseMs: number }) => a.responseMs >= 0)).toBe(true)
  expect(local.claimToken).toBeUndefined()
})

test('completed countries stay green, yellow, orange, and red according to the result', async ({ page }) => {
  const first = ['TCD', 'SDN', 'EGY', 'LBY']
  await mockRun(page, [...first, ...order.filter(id => !first.includes(id))])
  await open(page); await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.locator('#target-name')).toHaveText('Chad')
  await earth(page).press('Enter') // Chad, first attempt.
  await expect(page.getByTestId('progress')).toHaveText('2 / 195')
  for (let i = 0; i < 3; i++) {await earth(page).press('ArrowUp')}
  await earth(page).press('Enter') // Unanswered Libya is wrong for Sudan.
  await expect(page.locator('.answer-feedback')).toHaveText('× Libya')
  for (let i = 0; i < 3; i++) {await earth(page).press('ArrowDown')}
  for (let i = 0; i < 3; i++) {await earth(page).press('ArrowRight')}
  await earth(page).press('Enter') // Sudan, second attempt.
  await expect(page.getByTestId('progress')).toHaveText('3 / 195')
  for (let i = 0; i < 3; i++) {await earth(page).press('ArrowLeft')}
  for (let i = 0; i < 3; i++) {await earth(page).press('ArrowUp')}
  await earth(page).press('Enter'); await earth(page).press('Enter') // Libya is still unanswered.
  for (let i = 0; i < 3; i++) {await earth(page).press('ArrowRight')}
  await earth(page).press('Enter') // Egypt, third attempt.
  await expect(page.getByTestId('progress')).toHaveText('4 / 195')
  await expect(page.getByTestId('accuracy')).toHaveText('0.9%') // 1 + .5 + .25 points.
  await page.getByRole('button', { name: 'Skip' }).click() // Libya is red.
  await expect(page.getByTestId('answer-cue')).toHaveCount(0)
  const bounds = (await earth(page).boundingBox())!, camera = new PerspectiveCamera(42, bounds.width / bounds.height, .01, 100)
  camera.position.fromArray(coordinateToVector([30.6, 28.6])).multiplyScalar(3.1)
  camera.lookAt(0, 0, 0); camera.updateMatrixWorld()
  const points = first.map(id => {
    const country = countries.find((country: { id: string }) => country.id === id)
    const position = new Vector3(...coordinateToVector(country.center)).multiplyScalar(1.0003).project(camera)
    return [(position.x + 1) / 2, (1 - position.y) / 2]
  })
  const screenshot = await earth(page).screenshot({ path: test.info().outputPath('attempt-colours.png') })
  await test.info().attach('Completed-country colours', { body: screenshot, contentType: 'image/png' })
  const pixels = await page.evaluate(async ({ source, points }) => {
    const image = new Image(); image.src = source; await image.decode()
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
    const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0)
    return points.map(([x, y]) => [...context.getImageData(Math.round(x! * image.width), Math.round(y! * image.height), 1, 1).data])
  }, { source: `data:image/png;base64,${screenshot.toString('base64')}`, points })
  const [green, yellow, orange, red] = pixels as number[][]
  expect(green![1]!).toBeGreaterThan(green![0]! + 20)
  expect(yellow![0]!).toBeGreaterThan(yellow![2]! * 1.5)
  expect(yellow![1]!).toBeGreaterThan(yellow![2]! * 1.5)
  expect(yellow![0]!).toBeLessThan(yellow![1]! * 1.2)
  expect(orange![0]!).toBeGreaterThan(orange![1]! * 1.2)
  expect(orange![1]!).toBeGreaterThan(orange![2]! * 1.3)
  expect(red![0]!).toBeGreaterThan(red![1]! * 1.5)
  expect(red![0]!).toBeGreaterThan(red![2]! * 1.5)
})

test('completed country clicks do not consume attempts, upload guesses, or pause normal searching', async ({ page }) => {
  test.setTimeout(90000)
  await page.clock.install()
  await mockRun(page); await open(page)
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000))
  const requests: unknown[] = []
  page.on('request', request => {if (request.url().endsWith('/answers')) {requests.push(request.postDataJSON())}})
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await earth(page).press('Enter') // Complete Chad in green.
  await expect(page.getByTestId('progress')).toHaveText('2 / 195')
  await expect.poll(() => requests.length).toBe(1)
  await page.clock.runFor(1000)
  await tapCenter(page) // Select completed Chad with mouse or touch.
  if (test.info().project.use.isMobile) {await page.clock.runFor(300)}
  await earth(page).press('Enter') // Select it again with the keyboard.
  await expect(page.locator('.attempts-left')).toContainText('3')
  await expect(page.getByTestId('progress')).toHaveText('2 / 195')
  expect(requests).toHaveLength(1)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('atlas-recordings-v1') || '[]').at(-1).attempts.length)).toBe(1)
  await page.clock.runFor(1000)
  await expect(page.getByTestId('timer')).toHaveText('00:02.0')
  for (let n = 0; n < 2; n++) {await earth(page).press('ArrowRight')}
  await earth(page).press('Enter') // Unanswered Sudan still consumes a wrong attempt for Afghanistan.
  await expect(page.locator('.attempts-left')).toContainText('2')
  await expect.poll(() => requests.length).toBe(2)
})

test('one-handed double-tap zoom stays anchored and never answers a country', async ({ page }) => {
  test.skip(!test.info().project.use.isMobile, 'One-finger zoom requires touch input')
  await page.route('https://gibs.earthdata.nasa.gov/**', route => route.abort())
  await mockRun(page); await open(page); await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByTestId('earth-host')).toHaveAttribute('data-base-detail', 'full')
  const box = (await earth(page).boundingBox())!, x = box.x + box.width / 2, y = box.y + box.height / 2
  const picture = () => earth(page).screenshot({ style: '.mission-panel { visibility: hidden !important; }' })
  const coverage = (png: Buffer) => page.evaluate(async source => {
    const image = new Image(); image.src = source; await image.decode()
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 96
    const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0, 96, 96)
    const pixels = context.getImageData(0, 0, 96, 96).data
    let count = 0
    for (let i = 0; i < pixels.length; i += 4) {if (pixels[i]! > 35 || pixels[i + 1]! > 40 || pixels[i + 2]! > 65) {count++}}
    return count
  }, `data:image/png;base64,${png.toString('base64')}`)
  const before = await coverage(await picture()), input = await page.context().newCDPSession(page)
  try {
    await page.touchscreen.tap(x, y)
    await input.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] })
    await page.waitForTimeout(350)
    for (let n = 1; n <= 4; n++) {await input.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + n * 30, id: 1 }] })}
    const zoomed = await coverage(await picture())
    expect(zoomed).toBeGreaterThan(before * 1.15)
    for (let n = 3; n >= 0; n--) {await input.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + n * 30, id: 1 }] })}
    const restored = await coverage(await picture())
    expect(Math.abs(restored - before)).toBeLessThan(before * .03)
    await input.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect(page.getByTestId('progress')).toHaveText('1 / 195')
    await page.touchscreen.tap(x, y)
    await expect(page.getByTestId('progress')).toHaveText('2 / 195') // Zoom preserved the country under the finger.
  } finally {await input.detach()}
})

test('one-handed double-tap cancellation and a second finger restore normal touch controls', async ({ page }) => {
  test.skip(!test.info().project.use.isMobile, 'One-finger zoom requires touch input')
  await page.route('https://gibs.earthdata.nasa.gov/**', route => route.abort())
  await mockRun(page); await open(page); await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByTestId('earth-host')).toHaveAttribute('data-base-detail', 'full')
  const box = (await earth(page).boundingBox())!, x = box.x + box.width / 2, y = box.y + box.height / 2
  const input = await page.context().newCDPSession(page)
  try {
    await page.touchscreen.tap(x, y)
    await input.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] })
    await page.waitForTimeout(350)
    await input.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect(page.getByTestId('progress')).toHaveText('1 / 195') // A double tap zooms rather than guessing.
    await page.touchscreen.tap(x, y)
    await input.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] })
    await page.waitForTimeout(350)
    await input.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
    await page.touchscreen.tap(x, y)
    await expect(page.getByTestId('progress')).toHaveText('2 / 195')
    await page.touchscreen.tap(x, y)
    await input.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] })
    await page.waitForTimeout(350)
    await input.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }, { x: x + 50, y, id: 2 }] })
    for (let n = 1; n <= 4; n++) {await input.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - n * 5, y, id: 1 }, { x: x + 50 + n * 5, y, id: 2 }] })}
    await input.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    const picture = () => earth(page).screenshot({ style: '.mission-panel, .answer-cue { visibility: hidden !important; }' })
    const beforeDrag = await picture()
    await input.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] })
    for (let n = 1; n <= 6; n++) {await input.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + n * 12, y, id: 1 }] })}
    await input.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    expect(beforeDrag.equals(await picture())).toBe(false)
    await expect(page.getByTestId('progress')).toHaveText('2 / 195')
  } finally {await input.detach()}
})

test('touch tap timing excludes the double-tap recognition delay', async ({ page }) => {
  test.skip(!test.info().project.use.isMobile, 'Touch taps have a double-tap recognition window')
  await page.clock.install()
  const times: number[] = []
  page.on('request', request => {if (request.url().endsWith('/answers')) {times.push(request.postDataJSON().elapsedMs)}})
  const deck = ['TCD', 'SDN', ...order.filter(id => !['TCD', 'SDN'].includes(id))]
  await mockRun(page, deck); await open(page)
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.locator('#target-name')).toHaveText('Chad')
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 50))
  await page.clock.runFor(1000)
  await tapCenter(page)
  const paused = await page.getByTestId('timer').textContent()
  await expect(page.getByTestId('progress')).toHaveText('1 / 195')
  await page.clock.runFor(299)
  await expect(page.getByTestId('progress')).toHaveText('1 / 195')
  await expect(page.getByTestId('timer')).toHaveText(paused!)
  await page.clock.runFor(1)
  await expect(page.getByTestId('progress')).toHaveText('2 / 195')
  await expect(page.getByTestId('timer')).toHaveText(paused!)
  for (let n = 0; n < 2; n++) {await earth(page).press('ArrowRight')}
  await page.clock.runFor(1000)
  await tapCenter(page)
  await page.clock.runFor(300)
  await expect(page.getByTestId('progress')).toHaveText('3 / 195')
  await expect.poll(() => times.length).toBe(2)
  expect(times[1]! - times[0]!).toBe(1000)
  const box = (await earth(page).boundingBox())!, x = box.x + box.width / 2, y = box.y + box.height / 2
  const input = await page.context().newCDPSession(page)
  try {
    await page.touchscreen.tap(x, y)
    await input.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] })
    await page.clock.runFor(1000)
    await expect(page.getByTestId('progress')).toHaveText('3 / 195')
    await input.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
  } finally {await input.detach()}
  await page.getByRole('button', { name: 'Skip', exact: true }).click()
  await expect.poll(() => times.length).toBe(3)
  expect(times[2]! - times[1]!).toBe(1000) // Holding the zoom gesture remains real playing time.
})

test('real touch dragging and pinch zoom do not answer countries', async ({ page }) => {
  test.setTimeout(90000) // Native touch injection plus separate WebGL screenshots is slower on software-rendered tablets.
  await page.route('https://gibs.earthdata.nasa.gov/**', route => route.abort())
  await mockRun(page); await open(page); await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByTestId('earth-host')).toHaveAttribute('data-base-detail', 'full')
  await earth(page).scrollIntoViewIfNeeded()
  const box = (await earth(page).boundingBox())!, x = box.x + box.width / 2, y = box.y + box.height / 2
  const picture = () => earth(page).screenshot({ style: '.mission-panel, .answer-cue { visibility: hidden !important; }' })
  const before = await picture()
  if (test.info().project.use.isMobile) {
    const input = await page.context().newCDPSession(page)
    await input.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] })
    for (let i = 1; i <= 6; i++) {await input.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + i * 12, y, id: 1 }] })}
    await input.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    const rotated = await picture()
    expect(before.equals(rotated)).toBe(false)
    await input.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x - 25, y, id: 1 }, { x: x + 25, y, id: 2 }] })
    for (let i = 1; i <= 4; i++) {await input.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 25 - i * 8, y, id: 1 }, { x: x + 25 + i * 8, y, id: 2 }] })}
    await input.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    expect(rotated.equals(await picture())).toBe(false)
    await input.detach()
  } else {
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 90, y + 20, { steps: 12 }); await page.mouse.up()
    await earth(page).press('+')
  }
  expect(before.equals(await picture())).toBe(false)
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
  test.setTimeout(180000) // Includes complete-map screenshots, retries, accessibility, and return home.
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
  await expect(page.getByTestId('earth-host')).toHaveAttribute('data-base-detail', 'full')
  const centrePixel = async () => {
    const screenshot = await earth(page).screenshot({ style: '.mission-panel, .answer-cue { visibility: hidden !important; }' })
    return page.evaluate(async source => {
      const image = new Image(); image.src = source; await image.decode()
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
      const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0)
      return [...context.getImageData(Math.floor(image.width / 2) + 12, Math.floor(image.height / 2), 1, 1).data]
    }, `data:image/png;base64,${screenshot.toString('base64')}`)
  }
  const unpainted = await centrePixel()
  const runResponse = page.waitForResponse(r => r.url().endsWith('/atlas-api/runs?rules=4') && r.request().method() === 'POST')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  const run = await (await runResponse).json()
  expect((await runResponse).request().postDataJSON()).toMatchObject({ source: test.info().project.use.isMobile ? 'mobile-web' : 'desktop-web', build: expect.any(String), dataset: expect.stringMatching(/^[0-9a-f]{64}$/) })
  for (let i = 0; i < 195; i++) {
    // A touch answer resolves after the double-tap recognition window.
    await expect(page.getByTestId('progress')).toHaveText(`${i + 1} / 195`)
    if (run.deck[i] === 'TCD') {await tapCenter(page)}
    else {await page.getByRole('button', { name: 'Skip' }).click()}
  }
  await expect(page.getByRole('heading', { name: 'Score' })).toBeVisible()
  await expect(page.getByTestId('accuracy')).toHaveText('0.5%')
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled({ timeout: 20000 })
  expect(correctTime).toBeGreaterThanOrEqual(0)
  await expect(page.getByTestId('timer')).toHaveText(formatTime(correctTime).replace(/\.\d$/, ''))
  expect(finalBodies).toHaveLength(2)
  expect(finalBodies[0]).toBe(finalBodies[1])
  await expect(page.getByText('Saved without a name. This run contributes to global statistics.')).toHaveCount(0)
  await expect(page.getByTestId('correct-total')).toHaveText('1/195')
  await expect(page.locator('.outcome-counts .green')).toHaveText('1')
  await expect(page.locator('.outcome-counts .yellow')).toHaveText('0')
  await expect(page.locator('.outcome-counts .orange')).toHaveText('0')
  await expect(page.locator('.outcome-counts .red')).toHaveText('194')
  // Pull back enough to see the sample territories on narrow viewports too.
  await earth(page).press('-')
  // A finished run must also paint associated territories, not leave extra polygons behind.
  const box = (await earth(page).boundingBox())!, camera = new PerspectiveCamera(42, box.width / box.height, .01, 100)
  camera.position.fromArray(coordinateToVector([18, 16])).multiplyScalar(4)
  camera.lookAt(0, 0, 0); camera.updateMatrixWorld()
  const territoryPoints = [[46, 9], [21, 42.6], [-42, 72]].map(coordinate => {
    const p = new Vector3(...coordinateToVector(coordinate as [number, number])).multiplyScalar(1.0003).project(camera)
    return [(p.x + 1) / 2, (1 - p.y) / 2]
  })
  const finishedMap = await earth(page).screenshot({ style: '.mission-panel, .answer-cue { visibility: hidden !important; }' })
  const territoryPixels = await page.evaluate(async ({ source, points }) => {
    const image = new Image(); image.src = source; await image.decode()
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
    const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0)
    return points.map(([x, y]) => [...context.getImageData(Math.round(x! * image.width), Math.round(y! * image.height), 1, 1).data])
  }, { source: `data:image/png;base64,${finishedMap.toString('base64')}`, points: territoryPoints })
  for (const pixel of territoryPixels) {expect(pixel[0]!).toBeGreaterThan(pixel[1]! * 1.5); expect(pixel[0]!).toBeGreaterThan(pixel[2]! * 1.5)}

  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  if (test.info().project.use.isMobile) {
    const viewport = page.viewportSize()!
    await page.setViewportSize({ width: viewport.height, height: viewport.width })
    await page.setViewportSize(viewport)
    await expect.poll(async () => (await page.getByRole('heading', { name: 'Score', exact: true }).boundingBox())!.y).toBeGreaterThanOrEqual(0)
  }
  await page.getByLabel('Nickname', { exact: true }).fill('Atlas test')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled()
  const resetPixel = await centrePixel()
  expect(resetPixel.reduce((sum, value, index) => sum + Math.abs(value - unpainted[index]!), 0)).toBeLessThan(15)
  if (page.viewportSize()!.width >= 1000) {
    const ranking = page.locator('.ranking-panel table')
    await expect(ranking).toContainText('Atlas test')
    await expect(ranking.locator('.score-date, .run-finish-date')).toHaveCount(0)
  }
  await page.reload()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('atlas-runs-v4') || '[]')[0].correct)).toBe(1)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('atlas-runs-v4') || '[]')[0].finishedAt)).toBeGreaterThan(0)
  const recording = await page.evaluate(() => JSON.parse(localStorage.getItem('atlas-recordings-v1') || '[]').at(-1))
  expect(recording.status).toBe('complete')
  expect(recording.attempts).toHaveLength(195)
  expect(recording.networkIssues).toContainEqual(expect.objectContaining({ operation: 'answer', kind: 'network', attempt: 0 }))
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
  const recording = await page.evaluate(() => JSON.parse(localStorage.getItem('atlas-recordings-v1') || '[]').at(-1))
  expect(recording.serverId).toBeUndefined()
  expect(recording.networkIssues).toContainEqual(expect.objectContaining({ operation: 'start', kind: 'network' }))
  expect(recording.attempts).toHaveLength(1)
  expect(countries.find((c: { id: string }) => c.id === recording.attempts[0].target).small).toBe(false)
  expect(recording.attempts[0].recording).toMatchObject({ hit: 'skip', coordinate: null })
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


test('hover stays visible while rotation damping settles after a drag', async ({ page }) => {
  test.skip(!!test.info().project.use.isMobile, 'Hover requires a mouse')
  await page.route('https://gibs.earthdata.nasa.gov/**', route => route.abort())
  await mockRun(page); await open(page)
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.locator('#target-name')).toHaveText('Chad')
  const box = (await earth(page).boundingBox())!, x = box.x + box.width / 2, y = box.y + box.height / 2
  await page.mouse.move(x, y); await page.mouse.down()
  await page.mouse.move(x + 12, y, { steps: 3 }); await page.mouse.up()
  const samples = await earth(page).evaluate(async (canvas, point) => {
    const values: (string | undefined)[] = []
    for (let n = 0; n < 32; n++) {
      if (n < 16) {canvas.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'mouse', clientX: point.x, clientY: point.y }))}
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      values.push(canvas.parentElement!.dataset.hover)
    }
    return values
  }, { x: x + 12, y })
  expect(samples).toEqual(Array(32).fill('TCD'))
  await expect(page.getByTestId('progress')).toHaveText('1 / 195')
})

test('cross-country hover reuses its GPU mask and coalesces pointer bursts', async ({ page }) => {
  test.skip(!!test.info().project.use.isMobile, 'Hover requires a mouse')
  await page.route('https://gibs.earthdata.nasa.gov/**', route => route.abort())
  await mockRun(page); await open(page)
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.locator('#target-name')).toHaveText('Chad')
  await expect(page.getByTestId('earth-host')).toHaveAttribute('data-base-detail', 'full')
  const box = (await earth(page).boundingBox())!, camera = new PerspectiveCamera(42, box.width / box.height, .01, 100)
  camera.position.fromArray(coordinateToVector([18, 16])).multiplyScalar(3.1)
  camera.lookAt(0, 0, 0); camera.updateMatrixWorld()
  const points = ([[18, 16], [8, 9], [10, 18], [24, 23], [32, 15], [28, 7]] as [number, number][]).map(coordinate => {
    const point = new Vector3(...coordinateToVector(coordinate)).multiplyScalar(1.0003).project(camera)
    return { x: box.x + (point.x + 1) * box.width / 2, y: box.y + (1 - point.y) * box.height / 2 }
  })
  await page.mouse.move(points[0]!.x, points[0]!.y)
  await expect(page.getByTestId('earth-host')).toHaveAttribute('data-hover', 'TCD')
  // Finish the initial mask upload before measuring subsequent territory changes.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  const result = await earth(page).evaluate(async (canvas, points) => {
    let uploads = 0, lines = 0, draws = 0
    const prototype = WebGL2RenderingContext.prototype
    const image = prototype.texImage2D, subImage = prototype.texSubImage2D, line = CanvasRenderingContext2D.prototype.lineTo
    const draw = prototype.drawElements
    prototype.drawElements = function(...args) {draws++; return draw.apply(this, args)}
    prototype.texImage2D = function(...args: Parameters<typeof image>) {
      if (args.some(value => value instanceof HTMLCanvasElement)) {uploads++}
      return image.apply(this, args)
    }
    prototype.texSubImage2D = function(...args: Parameters<typeof subImage>) {
      if (args.some(value => value instanceof HTMLCanvasElement)) {uploads++}
      return subImage.apply(this, args)
    }
    CanvasRenderingContext2D.prototype.lineTo = function(x, y) {lines++; return line.call(this, x, y)}
    const ids: (string | undefined)[] = []
    try {
      for (const point of points.slice(1)) {
        canvas.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'mouse', clientX: point.x, clientY: point.y }))
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
        ids.push(canvas.parentElement!.dataset.hover)
      }
      const before = canvas.parentElement!.dataset.hover
      for (const point of points.toReversed()) {canvas.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'mouse', clientX: point.x, clientY: point.y }))}
      const synchronous = canvas.parentElement!.dataset.hover
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      const final = canvas.parentElement!.dataset.hover
      draws = 0
      for (let n = 0; n < 20; n++) {canvas.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'mouse', clientX: points[0]!.x, clientY: points[0]!.y }))}
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      const unchangedDraws = draws
      canvas.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'touch', clientX: points[1]!.x, clientY: points[1]!.y }))
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      const touch = canvas.parentElement!.dataset.hover
      canvas.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'mouse', clientX: points[1]!.x, clientY: points[1]!.y }))
      canvas.dispatchEvent(new PointerEvent('pointerleave'))
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      return { uploads, lines, ids, before, synchronous, final, touch, unchangedDraws, cancelled: canvas.parentElement!.dataset.hover }
    } finally {
      prototype.texImage2D = image; prototype.texSubImage2D = subImage; CanvasRenderingContext2D.prototype.lineTo = line
      prototype.drawElements = draw
    }
  }, points)
  expect(result.ids).toEqual(['NGA', 'NER', 'LBY', 'SDN', 'SSD'])
  expect(result.uploads).toBe(0)
  expect(result.lines).toBe(0)
  expect(result.synchronous).toBe(result.before)
  expect(result.final).toBe('TCD')
  expect(result.touch).toBe('TCD')
  expect(result.unchangedDraws).toBe(0)
  expect(result.cancelled).toBeUndefined()
  await page.mouse.move(10, 10)
  await expect(page.getByTestId('earth-host')).not.toHaveAttribute('data-hover')
})

test('mouse hover greys the actual territory and clears without changing its result', async ({ page }) => {
  test.skip(!!test.info().project.use.isMobile, 'Hover requires a mouse')
  await page.route('https://gibs.earthdata.nasa.gov/**', route => route.abort())
  await mockRun(page); await open(page)
  await expect(page.getByTestId('earth-host')).toHaveAttribute('data-base-detail', 'full')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.locator('#target-name')).toHaveText('Chad')
  await earth(page).press('Enter')
  await expect(page.getByTestId('progress')).toHaveText('2 / 195')
  await expect(page.getByTestId('answer-cue')).toHaveCount(0)
  const pixel = async () => {
    const png = await earth(page).screenshot({ style: '.mission-panel, .answer-cue { visibility: hidden !important; }' })
    return page.evaluate(async source => {
      const image = new Image(); image.src = source; await image.decode()
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
      const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0)
      return [...context.getImageData(Math.floor(image.width / 2) + 12, Math.floor(image.height / 2), 1, 1).data]
    }, `data:image/png;base64,${png.toString('base64')}`)
  }
  const before = await pixel(), box = (await earth(page).boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await expect(page.getByTestId('earth-host')).toHaveAttribute('data-hover', 'TCD')
  const hovered = await pixel()
  expect(hovered[0]! + hovered[2]!).toBeGreaterThan(before[0]! + before[2]! + 15)
  await page.mouse.move(10, 10)
  await expect(page.getByTestId('earth-host')).not.toHaveAttribute('data-hover')
  const after = await pixel()
  expect(after.reduce((n, value, i) => n + Math.abs(value - before[i]!), 0)).toBeLessThan(8)
  await expect(page.getByTestId('accuracy')).toHaveText('0.5%')
})


test('UN-associated territory clicks identify the quiz country and consume an attempt', async ({ page }) => {
  const requests: { guess: string }[] = []
  await mockRun(page)
  page.on('request', request => {if (request.url().endsWith('/answers')) {requests.push(request.postDataJSON())}})
  await open(page); await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.locator('#target-name')).toHaveText('Chad')
  for (let n = 0; n < 3; n++) {await earth(page).press('ArrowRight')}
  const box = (await earth(page).boundingBox())!, camera = new PerspectiveCamera(42, box.width / box.height, .01, 100)
  camera.position.fromArray(coordinateToVector([30.6, 16])).multiplyScalar(3.1)
  camera.lookAt(0, 0, 0); camera.updateMatrixWorld()
  const point = new Vector3(...coordinateToVector([46, 9])).multiplyScalar(1.0003).project(camera)
  const x = box.x + (point.x + 1) * box.width / 2, y = box.y + (1 - point.y) * box.height / 2
  expect(x).toBeGreaterThan(box.x); expect(x).toBeLessThan(box.x + box.width)
  expect(y).toBeGreaterThan(box.y); expect(y).toBeLessThan(box.y + box.height)
  if (test.info().project.use.isMobile) {await page.touchscreen.tap(x, y)} else {
    await page.mouse.move(x, y)
    await expect(page.getByTestId('earth-host')).toHaveAttribute('data-hover', 'SOM')
    await page.mouse.click(x, y)
  }
  await expect(page.getByTestId('progress')).toHaveText('1 / 195')
  await expect(page.locator('.attempts-left')).toContainText('Attempts left: 2')
  await expect(page.locator('.answer-feedback')).toHaveText('× Somalia')
  await expect(page.getByTestId('answer-cue')).toHaveAttribute('data-outcome', 'wrong')
  expect(requests).toHaveLength(1); expect(requests[0]!.guess).toBe('SOM')
})
