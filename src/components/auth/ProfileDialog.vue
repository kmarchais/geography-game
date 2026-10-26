<template>
  <dialog
    ref="dialog"
    class="orbit-dialog profile-dialog"
    aria-labelledby="profile-title"
    @cancel="(saving || processing) && $event.preventDefault()"
  >
    <form @submit.prevent="save">
      <div class="profile-heading">
        <h2 id="profile-title">
          Your profile
        </h2>
        <button
          type="button"
          class="icon-button"
          aria-label="Close profile"
          :disabled="saving || processing"
          @click="dialog?.close()"
        >
          ×
        </button>
      </div>
      <ProfileAvatar
        v-if="account"
        class="profile-preview"
        :user="{ ...account, name, avatar }"
      />
      <label for="profile-name">Username</label>
      <input
        id="profile-name"
        v-model="name"
        maxlength="24"
        autocomplete="nickname"
        required
        :disabled="saving"
      >
      <p class="small muted">
        Your username appears in the ranking.
      </p>
      <fieldset :disabled="saving || processing">
        <legend>Picture</legend>
        <button
          v-if="account?.picture"
          type="button"
          class="secondary-button google-photo-option"
          :aria-pressed="avatar === 'google'"
          @click="avatar = 'google'"
        >
          <img
            :src="account.picture"
            alt=""
            referrerpolicy="no-referrer"
          >
          Google photo
        </button>
        <div class="avatar-options">
          <button
            v-for="preset in avatarPresets"
            :key="preset.id"
            type="button"
            class="avatar-option"
            :style="{ background: preset.color }"
            :aria-label="`${preset.name} avatar`"
            :aria-pressed="avatar === `preset:${preset.id}`"
            @click="avatar = `preset:${preset.id}`"
          >
            <span aria-hidden="true">{{ preset.symbol }}</span>
          </button>
        </div>
        <label
          class="photo-upload"
          for="profile-photo"
        >{{ processing ? 'Preparing photo…' : 'Choose a photo' }}</label>
        <input
          id="profile-photo"
          class="visually-hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          @change="choosePhoto"
        >
      </fieldset>
      <p
        v-if="error"
        class="account-error small"
        role="status"
      >
        {{ error }}
      </p>
      <button
        class="primary-button"
        :disabled="saving || processing"
      >
        {{ saving ? 'Saving…' : 'Save profile' }}
      </button>
    </form>
  </dialog>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import ProfileAvatar from './ProfileAvatar.vue'
import { account, refreshAccount, type AtlasUser } from '@/globe/auth'
import { avatarPresets, resizeAvatar } from '@/globe/avatars'
import { rankingRequest } from '@/globe/ranking'
const emit = defineEmits<{ updated: [user: AtlasUser] }>()
const dialog = ref<HTMLDialogElement>()
const name = ref(''), avatar = ref('google'), error = ref(''), saving = ref(false), processing = ref(false)
let generation = 0
function open() {
  if (!account.value) {return}
  generation++; name.value = account.value.name; avatar.value = account.value.avatar || 'google'; error.value = ''
  dialog.value?.showModal()
}
async function choosePhoto(event: Event) {
  const input = event.target as HTMLInputElement, file = input.files?.[0], current = generation
  if (!file) {return}
  processing.value = true; error.value = ''
  try {const photo = await resizeAvatar(file); if (current === generation) {avatar.value = photo}}
  catch (reason) {if (current === generation) {error.value = reason instanceof Error ? reason.message : 'Could not read this photo.'}}
  finally {input.value = ''; if (current === generation) {processing.value = false}}
}
async function save() {
  if (saving.value || processing.value) {return}
  const username = name.value.normalize('NFKC').trim()
  if (!/^[\p{L}\p{N} ._'’-]{1,24}$/u.test(username)) {error.value = 'Use a username of 1–24 letters or numbers.'; return}
  saving.value = true; error.value = ''
  try {
    const result = await rankingRequest<{ user: AtlasUser }>('/auth/profile', { name: username, avatar: avatar.value }, 1)
    account.value = result.user; emit('updated', result.user); dialog.value?.close()
    try {await refreshAccount()} catch { /* The profile save succeeded; the next account refresh updates the best. */ }
  } catch {error.value = 'Could not save your profile. Try again.'}
  finally {saving.value = false}
}
defineExpose({ open })
</script>
