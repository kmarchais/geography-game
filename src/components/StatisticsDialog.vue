<template>
  <dialog
    ref="dialog"
    class="orbit-dialog statistics-dialog"
    :aria-label="t('statistics')"
  >
    <div class="profile-heading">
      <h2>{{ t('statistics') }}</h2><button
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
      :aria-label="t('statistics')"
    >
      <button
        class="secondary-button"
        :aria-pressed="!global"
        @click="global = false"
      >
        {{ t('yourStats') }}
      </button>
      <button
        class="secondary-button"
        :aria-pressed="global"
        @click="global = true"
      >
        {{ t('globalStats') }}
      </button>
    </div>
    <p class="small muted">
      {{ t('statsExplanation') }} {{ !global && !account ? t('onThisDevice') : '' }}
    </p>
    <p
      v-if="loading"
      role="status"
    >
      {{ t('loadingStats') }}
    </p>
    <p
      v-else-if="failed"
      role="status"
    >
      {{ t('statsUnavailable') }}
    </p>
    <table
      v-else-if="rows.length"
      class="statistics-table"
    >
      <thead>
        <tr>
          <th scope="col">
            {{ t('country') }}
          </th><th scope="col">
            {{ t('green') }}
          </th><th scope="col">
            {{ t('yellow') }}
          </th><th scope="col">
            {{ t('orange') }}
          </th><th scope="col">
            {{ t('red') }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="row.id"
        >
          <th scope="row">
            {{ countryName(byId.get(row.id)) }}
          </th><td>{{ row.green }}</td><td>{{ row.yellow }}</td><td>{{ row.orange }}</td><td>{{ row.red }}</td>
        </tr>
      </tbody>
    </table>
    <p
      v-else
      class="muted"
    >
      {{ t('noStatistics') }}
    </p>
  </dialog>
</template>
<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { account } from '@/globe/auth'
import { readCountryStats, validCountryStats, weightedScore, type CountryStat } from '@/globe/game'
import type { Country } from '@/globe/geography'
import { countryName, t } from '@/globe/i18n'
import { rankingRequest } from '@/globe/ranking'
const props = defineProps<{ countries: Country[] }>()
const dialog = ref<HTMLDialogElement>(), global = ref(false), values = ref<CountryStat[]>([]), loading = ref(false), failed = ref(false)
const byId = computed(() => new Map(props.countries.map(country => [country.id, country])))
const rows = computed(() => values.value.filter(row => byId.value.has(row.id)).sort((a, b) => weightedScore(a) / a.played - weightedScore(b) / b.played || b.played - a.played || a.id.localeCompare(b.id)))
let generation = 0
async function load() {
  const current = ++generation
  loading.value = true; failed.value = false
  try {
    const data = global.value || account.value ? validCountryStats(await rankingRequest<unknown>(global.value ? '/stats?rules=4' : '/stats/me?rules=4', undefined, 1)) : readCountryStats(localStorage)
    if (current === generation) {values.value = data}
  } catch {if (current === generation) {failed.value = true}}
  finally {if (current === generation) {loading.value = false}}
}
watch([global, () => account.value?.id], () => {if (dialog.value?.open) {load()}})
defineExpose({ open: () => {dialog.value?.showModal(); load()} })
onBeforeUnmount(() => {generation++})
</script>
