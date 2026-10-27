import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { chromium } from '@playwright/test'
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined, args: process.env.CI ? ['--enable-unsafe-swiftshader'] : [] })
mkdirSync('.local/hosting-ui', { recursive: true })
try {
  for (const mobile of [true, false]) {
    const context = await browser.newContext({ locale: 'en-US', viewport: mobile ? { width: 393, height: 727 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile })
    const page = await context.newPage()
    await page.goto('http://127.0.0.1:4180', { waitUntil: 'domcontentloaded' })
    const play = page.getByRole('button', { name: 'Play', exact: true })
    await play.waitFor()
    assert.equal(await page.locator('#player-name').count(), 0)
    assert.equal(await page.locator('.globe-tools').count(), 0)
    assert.equal(await page.getByRole('button', { name: 'Sign in with Google', exact: true }).count(), 0)
    if (!mobile) {
      await page.getByRole('button', { name: 'Why 195 countries?', exact: true }).click()
      assert.equal((await page.getByRole('tooltip').textContent()).trim(), '193 UN members + 2 observer states.')
      await page.keyboard.press('Escape')
    }
    const canvas = await page.locator('canvas').boundingBox(), header = await page.locator('.orbit-header').boundingBox(), button = await play.boundingBox()
    assert.ok(Math.abs(canvas.y - header.y - header.height) < 1)
    assert.ok(Math.abs(canvas.y + canvas.height - page.viewportSize().height) < 1)
    assert.ok(Math.abs(button.x + button.width / 2 - canvas.x - canvas.width / 2) < 1)
    await page.screenshot({ path: `.local/hosting-ui/${mobile ? 'phone' : 'desktop'}.png`, fullPage: true })
    console.log(`Production ${mobile ? 'phone' : 'desktop'} minimal layout: centered Play, no name or globe controls, canvas fits header and viewport`)
    await context.close()
  }
} finally {await browser.close()}
