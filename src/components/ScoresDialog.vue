<template>
  <dialog
    ref="dialog"
    class="orbit-dialog scores-dialog"
    :aria-label="t('scores')"
  >
    <div class="profile-heading">
      <h2>{{ t('scores') }}</h2>
      <button
        class="quiet-button"
        :aria-label="t('close')"
        @click="dialog?.close()"
      >
        ×
      </button>
    </div>
    <div
      class="statistics-tabs"
      role="group"
      :aria-label="t('scores')"
    >
      <button
        class="secondary-button"
        :aria-pressed="!personal"
        @click="personal = false"
      >
        {{ t('sharedRanking') }}
      </button>
      <button
        class="secondary-button"
        :aria-pressed="personal"
        @click="personal = true"
      >
        {{ t('personalScores') }}
      </button>
    </div>
    <p
      v-if="loading"
      role="status"
    >
      {{ t('loadingScores') }}
    </p>
    <p
      v-else-if="failed"
      class="small muted"
      role="status"
    >
      {{ t('rankingUnavailable') }}
    </p>
    <table
      v-else-if="rows.length"
      class="statistics-table"
    >
      <thead>
        <tr>
          <th scope="col">
            {{ personal ? t('yourScore') : t('player') }}
          </th>
          <th scope="col">
            {{ t('correct') }}
          </th>
          <th scope="col">
            {{ t('time') }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="row.id"
        >
          <th scope="row">
            {{ personal ? `${row.correct}/${row.total}` : row.name }}
          </th>
          <td>{{ formatPercent(percentage(row.correct, row.total)) }}</td>
          <td>{{ formatScoreTime(row.timeMs) }}</td>
        </tr>
      </tbody>
    </table>
    <p
      v-else
      class="muted"
    >
      {{ t('noScores') }}
    </p>
  </dialog>
</template>
<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { account } from '@/globe/auth'
import { readPersonalScores, percentage, type RankedScore } from '@/globe/game'
import { rankingRequest, validRanking } from '@/globe/ranking'
import { t, formatPercent, formatScoreTime } from '@/globe/i18n'
const dialog = ref<HTMLDialogElement>(), personal = ref(false), rows = ref<RankedScore[]>([]), loading = ref(false), failed = ref(false)
let generation = 0
async function load() {
  const current = ++generation
  loading.value = true; failed.value = false
  try {
    let values: RankedScore[]
    if (personal.value) {
      const key = account.value ? `atlas-runs-v3:${account.value.id}` : 'atlas-runs-v3'
      if (account.value) {
        try {values = validRanking(await rankingRequest('/scores/me', undefined, 1))}
        catch {values = readPersonalScores(localStorage, key)}
      } else {values = readPersonalScores(localStorage, key)}
    } else {values = validRanking(await rankingRequest('/leaderboard', undefined, 1))}
    if (current === generation) {rows.value = values}
  } catch {if (current === generation) {failed.value = true}}
  finally {if (current === generation) {loading.value = false}}
}
watch([personal, () => account.value?.id], () => {if (dialog.value?.open) {load()}})
defineExpose({ open: () => {dialog.value?.showModal(); load()} })
onBeforeUnmount(() => {generation++})
</script>
