<template>
  <dialog
    ref="dialog"
    class="orbit-dialog profile-dialog"
    aria-labelledby="profile-title"
    @cancel="(saving || processing) && $event.preventDefault()"
  >
    <form
      novalidate
      @submit.prevent="save"
    >
      <div class="profile-heading">
        <h2 id="profile-title">
          {{ t('yourProfile') }}
        </h2>
        <button
          type="button"
          class="icon-button"
          :aria-label="t('closeProfile')"
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
      <label for="profile-name">{{ t('username') }}</label>
      <input
        id="profile-name"
        v-model="name"
        maxlength="24"
        autocomplete="nickname"
        required
        :disabled="saving"
      >
      <p class="small muted">
        {{ t('publicUsername') }}
      </p>
      <fieldset :disabled="saving || processing">
        <legend>{{ t('picture') }}</legend>
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
          {{ t('googlePhoto') }}
        </button>
        <div class="avatar-options">
          <button
            v-for="preset in avatarPresets"
            :key="preset.id"
            type="button"
            class="avatar-option"
            :style="{ background: preset.color }"
            :aria-label="t('avatarChoice', { name: t(preset.nameKey) })"
            :aria-pressed="avatar === `preset:${preset.id}`"
            @click="avatar = `preset:${preset.id}`"
          >
            <span aria-hidden="true">{{ preset.symbol }}</span>
          </button>
        </div>
        <label
          class="photo-upload"
          for="profile-photo"
        >{{ processing ? t('preparingPhoto') : t('choosePhoto') }}</label>
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
        {{ t(error) }}
      </p>
      <button
        class="primary-button"
        :disabled="saving || processing"
      >
        {{ saving ? t('savingProfile') : t('saveProfile') }}
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
import { t, type MessageKey } from '@/globe/i18n'
const emit = defineEmits<{ updated: [user: AtlasUser] }>()
const dialog = ref<HTMLDialogElement>()
const name = ref(''), avatar = ref('google'), error = ref<MessageKey | ''>(''), saving = ref(false), processing = ref(false)
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
  catch (reason) {if (current === generation) {const code = reason instanceof Error ? reason.message : ''; error.value = code === 'photoType' || code === 'photoSize' ? code : 'photoRead'}}
  finally {input.value = ''; if (current === generation) {processing.value = false}}
}
async function save() {
  if (saving.value || processing.value) {return}
  const username = name.value.normalize('NFKC').trim()
  if (!/^[\p{L}\p{N} ._'’-]{1,24}$/u.test(username)) {error.value = 'profileInvalidName'; return}
  saving.value = true; error.value = ''
  try {
    const result = await rankingRequest<{ user: AtlasUser }>('/auth/profile', { name: username, avatar: avatar.value }, 1)
    account.value = result.user; emit('updated', result.user); dialog.value?.close()
    try {await refreshAccount()} catch { /* The profile save succeeded; the next account refresh updates the best. */ }
  } catch {error.value = 'profileSaveFailed'}
  finally {saving.value = false}
}
defineExpose({ open })
</script>
