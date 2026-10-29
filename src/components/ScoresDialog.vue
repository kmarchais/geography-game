<template>
  <dialog
    ref="dialog"
    class="orbit-dialog scores-dialog"
    :class="{ 'personal-ranking': personal }"
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
    <div
      v-else-if="rows.length"
      class="score-table-scroll"
      role="region"
      :aria-label="personal ? t('personalScores') : t('sharedRanking')"
      tabindex="0"
    >
      <table
        class="statistics-table"
        :class="{ 'personal-run-table': personal }"
      >
        <thead>
          <tr>
            <template v-if="personal">
              <th scope="col">
                {{ t('rank') }}
              </th>
              <th scope="col">
                {{ t('percentage') }}
              </th>
              <th
                scope="col"
                aria-sort="descending"
              >
                {{ t('points') }}
              </th>
              <th scope="col">
                {{ t('correct') }}
              </th>
              <th scope="col">
                {{ t('yellow') }}
              </th>
              <th scope="col">
                {{ t('orange') }}
              </th>
              <th scope="col">
                {{ t('red') }}
              </th>
              <th scope="col">
                {{ t('skipped') }}
              </th>
              <th scope="col">
                {{ t('finishDate') }}
              </th>
              <th scope="col">
                {{ t('runDuration') }}
              </th>
            </template>
            <template v-else>
              <th scope="col">
                {{ t('player') }}
              </th>
              <th scope="col">
                {{ t('percentage') }}
              </th>
              <th scope="col">
                {{ t('time') }}
              </th>
            </template>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in rows"
            :key="row.id"
          >
            <template v-if="personal">
              <th scope="row">
                {{ index + 1 }}
              </th>
              <td>{{ formatPercent(percentage(row.score ?? row.correct, row.total)) }}</td>
              <td>{{ formatPoints(row.score ?? row.correct) }}/{{ row.total }}</td>
              <td>{{ row.correct }}</td>
              <td>{{ row.yellow ?? t('unknownValue') }}</td>
              <td>{{ row.orange ?? t('unknownValue') }}</td>
              <td>{{ row.red ?? t('unknownValue') }}</td>
              <td>{{ row.skipped ?? t('unknownValue') }}</td>
              <td class="run-finish-date">
                {{ formatFinishedAt(row.finishedAt) }}
              </td>
              <td>{{ formatScoreTime(row.timeMs) }}</td>
            </template>
            <template v-else>
              <th scope="row">
                {{ row.name }}
              </th>
              <td>{{ formatPercent(percentage(row.score ?? row.correct, row.total)) }}</td>
              <td>{{ formatScoreTime(row.timeMs) }}</td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>
    <p
      v-else
      class="muted"
    >
      {{ t('noScores') }}
    </p>
    <p
      v-if="personal && rows.length"
      class="small muted"
    >
      {{ t('personalRankingNote') }}
    </p>
    <button
      v-if="personal && more"
      class="secondary-button"
      :disabled="loading"
      @click="load(true)"
    >
      {{ t('loadMoreRuns') }}
    </button>
  </dialog>
</template>
<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { account } from '@/globe/auth'
import { readPersonalScores, percentage, compareScores, type RankedScore } from '@/globe/game'
import { rankingRequest, validRanking } from '@/globe/ranking'
import { t, formatPercent, formatScoreTime, formatPoints, formatFinishedAt } from '@/globe/i18n'
const dialog = ref<HTMLDialogElement>(), personal = ref(false), rows = ref<RankedScore[]>([]), loading = ref(false), failed = ref(false)
const more = ref(false)
let generation = 0
async function load(append = false) {
  const current = ++generation
  loading.value = true; failed.value = false; more.value = false
  const offset = append ? rows.value.length : 0
  try {
    let values: RankedScore[]
    if (personal.value) {
      const key = account.value ? `atlas-runs-v4:${account.value.id}` : 'atlas-runs-v4'
      if (account.value) {
        try {
          values = validRanking(await rankingRequest(`/scores/me?rules=4&offset=${offset}`, undefined, 1))
          if (current === generation) {more.value = values.length === 20}
        }
        catch (error) {if (append) {throw error} values = readPersonalScores(localStorage, key)}
      } else {values = readPersonalScores(localStorage, key)}
    } else {values = validRanking(await rankingRequest('/leaderboard?rules=4', undefined, 1))}
    if (current === generation) {rows.value = (append ? [...rows.value, ...values] : values).sort(compareScores)}
  } catch {if (current === generation) {failed.value = true; more.value = append}}
  finally {if (current === generation) {loading.value = false}}
}
watch([personal, () => account.value?.id], () => {if (dialog.value?.open) {load()}})
defineExpose({ open: () => {dialog.value?.showModal(); load()} })
onBeforeUnmount(() => {generation++})
</script>
