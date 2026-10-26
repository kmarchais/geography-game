import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import GoogleLoginButton from './GoogleLoginButton.vue'
import { account, accountBest, googleClientId, type AtlasUser } from '@/globe/auth'

const mocks = vi.hoisted(() => ({ request: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), persistCookies: vi.fn() }))
vi.mock('@/globe/ranking', () => ({ rankingRequest: mocks.request, validRanking: (value: unknown) => value }))
vi.mock('@/globe/google', () => ({ nativeAccount: true, nativeGoogle: mocks, loadGoogle: vi.fn() }))
let wrapper: VueWrapper
let user: AtlasUser | null
let keepSession = false
beforeEach(() => {
  vi.clearAllMocks()
  account.value = null; accountBest.value = undefined; googleClientId.value = ''
  user = null; keepSession = false
  mocks.signIn.mockResolvedValue({ credential: 'test-credential' })
  mocks.request.mockImplementation(async (path: string) => {
    if (path === '/auth/session') {return { user, best: null, googleClientId: 'test.apps.googleusercontent.com' }}
    if (path === '/auth/challenge') {return { nonce: 'test-nonce' }}
    if (path === '/auth/google') {
      if (keepSession) {user = { id: 'account-id', name: 'Alex' }}
      return { user: { id: 'account-id', name: 'Alex' } }
    }
    throw new Error('Unexpected request')
  })
})
afterEach(() => wrapper?.unmount())

test('native cancellation explicitly confirms that the player is still a guest', async () => {
  mocks.signIn.mockRejectedValue({ code: 'CANCELLED' })
  wrapper = mount(GoogleLoginButton); await flushPromises()
  await wrapper.get('button').trigger('click'); await flushPromises()
  expect(wrapper.get('[role="status"]').text()).toContain('not connected')
  expect(wrapper.find('.account-row').exists()).toBe(false)
  expect(wrapper.get('button').attributes('disabled')).toBeUndefined()
})

test('a login response without a retained session reports failure instead of staying silent', async () => {
  wrapper = mount(GoogleLoginButton); await flushPromises()
  await wrapper.get('button').trigger('click'); await flushPromises()
  expect(wrapper.get('[role="status"]').text()).toContain('not connected')
  expect(account.value).toBeNull()
  expect(wrapper.emitted('connected')).toBeUndefined()
})

test('a confirmed native session replaces Google sign-in with the connected account', async () => {
  keepSession = true
  wrapper = mount(GoogleLoginButton); await flushPromises()
  await wrapper.get('button').trigger('click'); await flushPromises()
  expect(wrapper.get('.account-row').text()).toContain('Connected as Alex')
  expect(wrapper.find('.google-connect').exists()).toBe(false)
  expect(wrapper.emitted('connected')).toHaveLength(1)
  expect(mocks.persistCookies).toHaveBeenCalledOnce()
})
