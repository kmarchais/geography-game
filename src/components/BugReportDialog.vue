<template>
  <dialog
    ref="dialog"
    class="orbit-dialog bug-dialog"
    aria-labelledby="bug-title"
    @cancel="sending && $event.preventDefault()"
    @close="closed"
  >
    <div class="profile-heading">
      <h2 id="bug-title">
        Report a bug
      </h2>
      <button
        class="icon-button"
        aria-label="Close bug report"
        :disabled="sending"
        @click="dialog?.close()"
      >
        ×
      </button>
    </div>
    <template v-if="receipt">
      <p role="status">
        {{ receipt.issueUrl ? 'GitHub issue created. Thank you!' : 'Report saved. The GitHub issue will be created when the connection is available.' }}
      </p>
      <a
        v-if="receipt.issueUrl"
        class="secondary-button"
        :href="receipt.issueUrl"
        target="_blank"
        rel="noopener noreferrer"
      >View issue</a>
      <button
        class="primary-button"
        @click="dialog?.close()"
      >
        Done
      </button>
    </template>
    <form
      v-else
      @submit.prevent="send"
    >
      <p class="small muted">
        Reports are public on GitHub. Do not include passwords or private information.
      </p>
      <label for="bug-summary">Title</label>
      <input
        id="bug-summary"
        v-model="title"
        maxlength="100"
        required
        :disabled="sending"
      >
      <label for="bug-description">What happened?</label>
      <textarea
        id="bug-description"
        v-model="description"
        rows="5"
        maxlength="5000"
        required
        placeholder="What did you do, what did you expect, and what happened instead?"
        :disabled="sending"
      />
      <details class="report-context">
        <summary>Technical details included</summary>
        <p class="small muted">
          {{ context.platform }} · {{ context.version }} · {{ context.width }} × {{ context.height }}{{ context.country ? ` · ${context.country}` : '' }}
        </p>
      </details>
      <p
        v-if="error"
        class="account-error small"
        role="status"
      >
        {{ error }}
      </p>
      <button
        class="primary-button"
        :disabled="sending"
      >
        {{ sending ? 'Sending…' : 'Send report' }}
      </button>
    </form>
  </dialog>
</template>
<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { version } from '../../package.json'
import { nativeAccount } from '@/globe/google'
import { rankingRequest } from '@/globe/ranking'
import { isGuestId } from '@/globe/game'
const props = defineProps<{ country?: string }>()
type Receipt = { id: string; state: string; issueUrl: string | null }
const dialog = ref<HTMLDialogElement>(), title = ref(''), description = ref(''), error = ref(''), sending = ref(false), receipt = ref<Receipt>()
const context = ref({ platform: nativeAccount ? 'Android' : 'Web', version: `${version} (${import.meta.env.VITE_ATLAS_BUILD?.slice(0, 7) || 'local'})`, width: innerWidth, height: innerHeight, country: null as string | null })
let id = crypto.randomUUID(), alive = true, generation = 0, playerId: string = crypto.randomUUID()
let requestBody: { id: string; playerId: string; title: string; description: string; context: unknown } | undefined
function open() {
  generation++
  if (receipt.value) {title.value = ''; description.value = ''; receipt.value = undefined; requestBody = undefined; id = crypto.randomUUID()}
  error.value = ''
  if (!requestBody) {context.value = { ...context.value, width: innerWidth, height: innerHeight, country: props.country || null }}
  if (!requestBody) {try {const saved = localStorage.getItem('atlas-player-id'); if (isGuestId(saved)) {playerId = saved}} catch { /* A temporary guest can report bugs. */ }}
  dialog.value?.showModal()
}
function closed() {generation++}
async function send() {
  if (sending.value || !title.value.trim() || !description.value.trim()) {return}
  const current = generation, summary = title.value.trim(), details = description.value.trim()
  if (!requestBody || requestBody.title !== summary || requestBody.description !== details) {
    if (requestBody) {id = crypto.randomUUID()}
    requestBody = { id, playerId, title: summary, description: details, context: context.value }
  }
  sending.value = true; error.value = ''
  try {
    const result = await rankingRequest<Receipt>('/reports', requestBody, 1)
    if (!alive || current !== generation) {return}
    receipt.value = result
    sending.value = false
    for (let attempt = 0; attempt < 8 && alive && current === generation && !receipt.value.issueUrl; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 1500))
      if (!alive || current !== generation) {return}
      try {
        const progress = await rankingRequest<Receipt>(`/reports/${result.id}`)
        if (!alive || current !== generation) {return}
        receipt.value = progress
      } catch {break}
    }
  } catch {if (alive && current === generation) {error.value = 'Could not send the report. Your text is still here. Please try again.'}}
  finally {if (alive && current === generation) {sending.value = false}}
}
onBeforeUnmount(() => {alive = false})
defineExpose({ open })
</script>
