import { afterEach, expect, it, vi } from 'vitest'
import { rankingRequest, runSource } from './ranking'

afterEach(() => {vi.unstubAllGlobals(); vi.useRealTimers()})
it('distinguishes a malformed response from a connection failure', async () => {
  const issues: unknown[] = []
  vi.stubGlobal('fetch', vi.fn(async () => new Response('not json', { status: 200 })))
  await expect(rankingRequest('/runs', {}, 0, issue => issues.push(issue))).rejects.toThrow()
  expect(issues).toEqual([{ kind: 'response', status: 200, attempt: 0 }])
})
it('records native app separately from mobile and desktop browsers regardless of viewport', () => {
  for (const userAgent of ['Mozilla/5.0 (Linux; Android 16)', 'Mozilla/5.0 (iPhone)', 'Mozilla/5.0 (iPad)', 'Mozilla/5.0 (Macintosh)']) {
    const device = { ...navigator, userAgent, maxTouchPoints: 5 }
    expect(runSource(false, device)).toBe('mobile-web')
    expect(runSource(true, device)).toBe('native-app')
  }
  expect(runSource(false, { ...navigator, userAgent: 'Mozilla/5.0 (Windows NT 10.0)', maxTouchPoints: 10 })).toBe('desktop-web')
  expect(runSource(false, { ...navigator, userAgent: 'Mozilla/5.0 (Macintosh)', maxTouchPoints: 0 })).toBe('desktop-web')
})
it('retries the identical timed answer after its committed response is lost', async () => {
  vi.useFakeTimers()
  const bodies: string[] = []
  let commits = 0
  const issues: unknown[] = []
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
    bodies.push(String(init.body))
    if (bodies.length === 1) {commits++; throw new TypeError('Response lost after commit')}
    return new Response(JSON.stringify({ complete: true, correct: 1, total: 195, timeMs: 1500 }))
  }))
  const request = rankingRequest('/runs/test/answers', { index: 194, guess: 'TCD', elapsedMs: 1500 }, 2, issue => issues.push(issue))
  await vi.advanceTimersByTimeAsync(250)
  expect(await request).toEqual({ complete: true, correct: 1, total: 195, timeMs: 1500 })
  expect(bodies).toHaveLength(2)
  expect(bodies[0]).toBe(bodies[1])
  expect(commits).toBe(1)
  expect(issues).toEqual([{ kind: 'network', status: 0, attempt: 0 }])
})
it('does not retry invalid answers and bounds retries for outages', async () => {
  vi.useFakeTimers()
  const fetcher = vi.fn(async () => new Response('{}', { status: 400 }))
  vi.stubGlobal('fetch', fetcher)
  await expect(rankingRequest('/runs/test/answers', {}, 2)).rejects.toThrow()
  expect(fetcher).toHaveBeenCalledTimes(1)
  fetcher.mockImplementation(async () => new Response('{}', { status: 503 }))
  const request = rankingRequest('/runs/test/answers', {}, 2).catch(error => error)
  await vi.advanceTimersByTimeAsync(750)
  expect(await request).toBeInstanceOf(Error)
  expect(fetcher).toHaveBeenCalledTimes(4)
})
