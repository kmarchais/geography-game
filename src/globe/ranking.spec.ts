import { afterEach, expect, it, vi } from 'vitest'
import { rankingRequest } from './ranking'

afterEach(() => {vi.unstubAllGlobals(); vi.useRealTimers()})
it('retries the identical timed answer after its committed response is lost', async () => {
  vi.useFakeTimers()
  const bodies: string[] = []
  let commits = 0
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
    bodies.push(String(init.body))
    if (bodies.length === 1) {commits++; throw new TypeError('Response lost after commit')}
    return new Response(JSON.stringify({ complete: true, correct: 1, total: 195, timeMs: 1500 }))
  }))
  const request = rankingRequest('/runs/test/answers', { index: 194, guess: 'TCD', elapsedMs: 1500 }, 2)
  await vi.advanceTimersByTimeAsync(250)
  expect(await request).toEqual({ complete: true, correct: 1, total: 195, timeMs: 1500 })
  expect(bodies).toHaveLength(2)
  expect(bodies[0]).toBe(bodies[1])
  expect(commits).toBe(1)
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
