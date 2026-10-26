import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined, args: process.env.CI ? ['--enable-unsafe-swiftshader'] : [] })
mkdirSync('.local/hosting-ui', { recursive: true })
try {
  for (const mobile of [true, false]) {
    const context = await browser.newContext({ locale: 'en-US', viewport: mobile ? { width: 393, height: 727 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile })
    const page = await context.newPage()
    await page.goto('http://127.0.0.1:4180', { waitUntil: 'domcontentloaded' })
    const info = page.getByRole('button', { name: 'Why 195 countries?', exact: true })
    await info.waitFor()
    try {
      await info.click({ timeout: 5000 })
      await page.getByRole('tooltip').waitFor()
      assert.equal((await page.getByRole('tooltip').textContent()).trim(), '193 UN members + 2 observer states.')
    } catch (error) {
      const obstruction = await info.evaluate(button => {
        const r = button.getBoundingClientRect(), top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
        return { target: r.toJSON(), coveringElement: top?.outerHTML.slice(0, 500) }
      })
      writeFileSync('.local/hosting-ui/obstruction.json', JSON.stringify(obstruction, null, 2))
      console.error(JSON.stringify(obstruction)); throw error
    } finally {await page.screenshot({ path: `.local/hosting-ui/${mobile ? 'phone' : 'desktop'}.png`, fullPage: true })}
    console.log(`Production ${mobile ? 'phone' : 'desktop'} UI: country-count control works when Google is unavailable`)
    await context.close()
  }
} finally {await browser.close()}
