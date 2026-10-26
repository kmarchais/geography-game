<template>
  <div class="account-panel">
    <div
      v-if="account"
      class="account-row"
    >
      <span>Connected as {{ account.name }}</span>
      <button
        class="quiet-button"
        :disabled="disabled || busy"
        @click="disconnect"
      >
        Sign out
      </button>
    </div>
    <template v-else>
      <button
        v-if="nativeAccount"
        class="google-connect"
        :disabled="disabled || busy || !googleClientId"
        @click="connectNative"
      >
        <svg
          viewBox="0 0 48 48"
          aria-hidden="true"
        ><path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
        /><path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6C44.4 38.03 46.98 31.9 46.98 24.55Z"
        /><path
          fill="#FBBC05"
          d="M10.53 28.59A14.41 14.41 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.72 23.72 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"
        /><path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6C30.03 37.65 27.26 38.5 24 38.5c-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
        /></svg>
        {{ busy ? 'Connecting…' : 'Sign in with Google' }}
      </button>
      <div
        v-else
        v-show="buttonReady"
        ref="buttonHost"
        class="google-web-button"
        :inert="disabled || busy"
        :aria-disabled="disabled || busy"
      />
      <button
        v-if="!nativeAccount && !buttonReady"
        class="google-connect"
        :disabled="disabled || busy || !error"
        @click="prepare"
      >
        {{ busy ? 'Connecting…' : 'Sign in with Google' }}
      </button>
    </template>
    <p
      v-if="error"
      class="account-error small"
      role="status"
    >
      {{ error }}
    </p>
  </div>
</template>
<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { account, googleClientId, refreshAccount, type AtlasUser } from '@/globe/auth'
import { loadGoogle, nativeAccount, nativeGoogle } from '@/globe/google'
import { rankingRequest } from '@/globe/ranking'
const props = defineProps<{ disabled?: boolean }>()
const emit = defineEmits<{ busy: [value: boolean]; connected: [user: AtlasUser] }>()
const buttonHost = ref<HTMLDivElement>(), buttonReady = ref(false), busy = ref(false), error = ref('')
let alive = true, refresh: ReturnType<typeof setTimeout> | undefined
let preparing = false
let resize: ResizeObserver | undefined
let renderedWidth = 0
function renderButton() {
  if (!buttonHost.value || !window.google?.accounts?.id || !buttonReady.value) {return}
  const width = Math.min(400, Math.floor(buttonHost.value.clientWidth))
  if (width < 120 || width === renderedWidth) {return}
  renderedWidth = width
  buttonHost.value.replaceChildren()
  window.google.accounts.id.renderButton(buttonHost.value, { type: 'standard', theme: 'filled_black', shape: 'pill', size: 'large', text: 'signin_with', width })
}
function setBusy(value: boolean) {busy.value = value; emit('busy', value)}
async function finish(credential?: string) {
  if (!alive || props.disabled || !credential) {return}
  setBusy(true); error.value = ''
  try {
    await rankingRequest('/auth/google', { credential })
    if (nativeAccount) {await nativeGoogle.persistCookies()}
    await refreshAccount()
    if (alive && account.value) {emit('connected', account.value)}
  } catch {if (alive) {await prepare(); error.value = 'Google connection failed. Please try again.'}}
  finally {if (alive) {setBusy(false)}}
}
async function prepare() {
  if (preparing) {return}
  preparing = true
  clearTimeout(refresh)
  try {
    await refreshAccount()
    if (!alive) {return}
    if (account.value) {emit('connected', account.value); return}
    if (!googleClientId.value) {throw new Error('Google is unavailable')}
    if (nativeAccount) {return}
    await loadGoogle()
    const challenge = await rankingRequest<{ nonce: string }>('/auth/challenge')
    if (!alive) {return}
    await nextTick()
    window.google.accounts.id.initialize({ client_id: googleClientId.value, nonce: challenge.nonce, callback: response => {finish(response.credential)} })
    if (buttonHost.value) {
      buttonReady.value = true
      renderedWidth = 0
      renderButton()
      resize?.disconnect()
      resize = new ResizeObserver(renderButton)
      resize.observe(buttonHost.value)
    }
    error.value = ''
    refresh = setTimeout(prepare, 240000)
  } catch {if (alive) {error.value = 'Google connection unavailable. You can still play as a guest.'}}
  finally {preparing = false}
}
async function connectNative() {
  if (props.disabled || busy.value) {return}
  setBusy(true); error.value = ''
  try {
    const { nonce } = await rankingRequest<{ nonce: string }>('/auth/challenge')
    const result = await nativeGoogle.signIn({ clientId: googleClientId.value, nonce })
    setBusy(false)
    await finish(result.credential)
  } catch (e) {if (alive && (e as { code?: string }).code !== 'CANCELLED') {error.value = 'Google connection failed. Please try again.'}}
  finally {if (alive) {setBusy(false)}}
}
async function disconnect() {
  setBusy(true)
  try {
    await rankingRequest('/auth/logout', {})
    if (nativeAccount) {await nativeGoogle.signOut()}
    else {window.google?.accounts?.id?.disableAutoSelect()}
    await refreshAccount(); await nextTick(); await prepare()
  } catch {error.value = 'Could not sign out. Try again.'}
  finally {setBusy(false)}
}
watch(() => props.disabled, (disabled, previous) => {if (previous && !disabled) {prepare()}})
onMounted(prepare)
onBeforeUnmount(() => {alive = false; clearTimeout(refresh); resize?.disconnect(); emit('busy', false)})
</script>
