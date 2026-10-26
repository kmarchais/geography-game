<template>
  <span
    class="profile-avatar"
    :style="{ background: preset?.color || '#23463e' }"
    aria-hidden="true"
  >
    <img
      v-if="source && !failed"
      :src="source"
      alt=""
      referrerpolicy="no-referrer"
      @error="failed = true"
    >
    <span v-else>{{ preset?.symbol || user.name.slice(0, 1).toUpperCase() }}</span>
  </span>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { AtlasUser } from '@/globe/auth'
import { avatarPresets } from '@/globe/avatars'
const props = defineProps<{ user: AtlasUser }>()
const failed = ref(false)
const preset = computed(() => avatarPresets.find(value => props.user.avatar === `preset:${value.id}`))
const source = computed(() => props.user.avatar?.startsWith('data:image/jpeg;base64,') ? props.user.avatar : (!props.user.avatar || props.user.avatar === 'google') ? props.user.picture : undefined)
watch(source, () => {failed.value = false})
</script>
