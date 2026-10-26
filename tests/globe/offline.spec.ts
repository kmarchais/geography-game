import { test, expect } from '@playwright/test'

test.use({ serviceWorkers: 'allow' })
test('installs Atlas offline without deleting another deployment cache', async ({ page, context, baseURL }) => {
  await page.goto('./')
  await page.getByLabel('Name', { exact: true }).fill('Offline')
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled()
  await page.evaluate(async () => {
    const cache = await caches.open('orbit-/geography-game/another-preview/-sentinel')
    await cache.put(new URL('/scope-sentinel', location.origin), new Response('preserve'))
  })
  const scope = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller) {await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }))}
    return registration.scope
  })
  expect(scope).toBe(new URL('./', baseURL).href)
  expect(await page.evaluate(() => caches.has('orbit-/geography-game/another-preview/-sentinel'))).toBe(true)
  const name = await page.evaluate(async () => (await fetch(document.querySelector<HTMLLinkElement>('link[rel=manifest]')!.href)).json().then(m => m.short_name))
  expect(name).toBe('Atlas')
  // A stale installed shell must not keep serving an older interface online.
  await page.evaluate(async scope => {
    const key = (await caches.keys()).find(key => key.startsWith(`orbit-${new URL(scope).pathname}-`) && !key.includes('sentinel'))!
    const cache = await caches.open(key), original = await cache.match(scope)
    await cache.put(`${scope}original-for-test`, original!)
    await cache.put(scope, new Response('<h1>Old Orbit interface</h1>', { headers: { 'content-type': 'text/html' } }))
  }, scope)
  await page.reload()
  await expect(page.getByRole('heading', { name: '195 countries.' })).toBeVisible()
  await page.evaluate(async scope => {
    const key = (await caches.keys()).find(key => key.startsWith(`orbit-${new URL(scope).pathname}-`) && !key.includes('sentinel'))!
    const cache = await caches.open(key), original = await cache.match(`${scope}original-for-test`)
    await cache.put(scope, original!); await cache.delete(`${scope}original-for-test`)
  }, scope)
  await context.setOffline(true)
  await page.goto(`${scope}?source=installed`)
  await page.getByLabel('Name', { exact: true }).fill('Offline')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByText('Offline · unranked run')).toBeVisible()
  await page.getByRole('button', { name: 'Skip' }).click()
  await expect(page.getByTestId('progress')).toHaveText('2 / 195')
  await page.goto(new URL('classic', scope).href)
  await expect(page.getByRole('heading', { name: '195 countries.' })).toBeVisible()
  await expect(page).toHaveURL(scope)
})
