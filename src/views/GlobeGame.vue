<template>
  <div class="orbit-app">
    <header class="orbit-header">
      <a
        class="wordmark"
        :href="base"
      ><img
        :src="`${base}atlas.svg`"
        alt=""
      >Atlas</a>
      <div class="header-actions">
        <GoogleLoginButton
          ref="login"
          :disabled="playing || starting || saving"
          @busy="authBusy = $event"
          @connected="connected"
          @status="authMessage = $event"
        />
        <button
          :class="account ? 'account-avatar' : 'icon-button'"
          :aria-label="t('menu')"
          :title="account ? t('connectedAs', { name: account.name }) : t('menu')"
          popovertarget="atlas-menu"
          @click="positionMenu"
        >
          <ProfileAvatar
            v-if="account"
            :user="account"
          />
          <span v-else>⋯</span>
          <span
            v-if="account"
            class="account-check"
            aria-hidden="true"
          >✓</span>
        </button>
        <div
          id="atlas-menu"
          ref="menu"
          popover
          class="atlas-menu"
          role="menu"
          :aria-label="t('atlasMenu')"
          @keydown="menuKey"
        >
          <div
            v-if="account"
            class="account-identity"
          >
            <strong>{{ t('connectedAs', { name: account.name }) }}</strong>
          </div>
          <button
            v-if="account"
            role="menuitem"
            :disabled="playing || starting || saving || authBusy"
            @click="menu?.hidePopover(); login?.openProfile()"
          >
            {{ t('editProfile') }}
          </button>
          <button
            v-if="account"
            role="menuitem"
            :disabled="playing || starting || saving || authBusy"
            @click="menu?.hidePopover(); login?.disconnect()"
          >
            {{ t('signOut') }}
          </button>
          <button
            v-if="playing"
            role="menuitem"
            @click="menu?.hidePopover(); restart?.showModal()"
          >
            {{ t('restart') }}
          </button>
          <button
            role="menuitem"
            autofocus
            @click="menu?.hidePopover(); help?.showModal()"
          >
            {{ t('howToPlay') }}
          </button>
          <button
            role="menuitem"
            @click="menu?.hidePopover(); bugReport?.open()"
          >
            {{ t('reportBug') }}
          </button>
        </div>
      </div>
    </header>
    <p
      v-if="authMessage"
      class="account-feedback small"
      role="status"
    >
      {{ t(authMessage) }}
    </p>
    <main class="orbit-workspace">
      <aside class="mission-panel">
        <section
          v-if="!session"
          class="start-card"
        >
          <div class="challenge-heading">
            <h1>{{ t('countriesTitle') }}</h1>
            <button
              class="count-info-button"
              :aria-label="t('whyCountries')"
              aria-describedby="country-count-info"
              :title="countryCountExplanation"
              popovertarget="country-count-info"
              @click="positionCountryCount"
            >
              <span aria-hidden="true">i</span>
            </button>
            <div
              id="country-count-info"
              ref="countryCount"
              popover
              role="tooltip"
              class="country-count-tooltip"
            >
              {{ countryCountExplanation }}
            </div>
          </div>
          <form
            :class="{ 'account-play': account }"
            novalidate
            @submit.prevent="start"
          >
            <template v-if="!account">
              <label
                class="name-label"
                for="player-name"
              >{{ t('name') }}</label>
              <input
                id="player-name"
                v-model="playerName"
                maxlength="24"
                required
                autocomplete="nickname"
                :placeholder="t('namePlaceholder')"
              >
            </template>
            <button
              class="primary-button"
              :disabled="!canPlay || starting || authBusy"
            >
              {{ starting ? t('starting') : canPlay ? t('play') : t('loadingEarth') }}
            </button>
          </form>
        </section>
        <section
          v-else
          class="mission-card"
          aria-labelledby="target-name"
        >
          <template v-if="playing">
            <div class="mission-topline">
              <span>{{ t('find') }}</span><span data-testid="progress">{{ session.answers.length + 1 }} / {{ session.deck.length }}</span>
            </div>
            <h1 id="target-name">
              {{ countryName(target) }}
            </h1>
          </template>
          <h1
            v-else
            id="target-name"
          >
            {{ t('yourScore') }}
          </h1>
          <div class="session-stats">
            <div><span>{{ t('correct') }}</span><strong data-testid="accuracy">{{ formatPercent(accuracy) }}</strong></div>
            <div><span>{{ playing ? t('time') : t('timeToScore') }}</span><strong data-testid="timer">{{ formatTime(playing ? elapsed : resultTime) }}</strong></div>
          </div>
          <div
            class="progress-track"
            role="progressbar"
            :aria-label="t('countriesAnswered')"
            :aria-valuenow="session.answers.length"
            :aria-valuemax="session.deck.length"
            aria-valuemin="0"
          >
            <span :style="{ width: `${session.answers.length / session.deck.length * 100}%` }" />
          </div>
          <p class="round-count">
            {{ t('correctCount', { correct: found, total: session.deck.length }) }}
          </p>
          <button
            v-if="playing"
            class="secondary-button skip-button"
            @click="answer(null)"
          >
            {{ t('skip') }} <span aria-hidden="true">→</span>
          </button>
          <button
            v-else
            class="primary-button"
            :disabled="starting || saving || authBusy"
            @click="start"
          >
            {{ t('playAgain') }}
          </button>
          <p
            class="answer-feedback"
            :class="feedbackOutcome"
            role="status"
            aria-live="polite"
          >
            {{ feedback }}
          </p>
          <p
            v-if="!playing && saving"
            class="muted small"
            role="status"
          >
            {{ t('savingScore') }}
          </p>
        </section>
        <p
          v-if="!playing && pendingClaim && !account"
          class="muted small"
        >
          {{ t('signInToKeepScore') }}
        </p>
        <p
          v-if="claimMessage"
          class="small"
          role="status"
        >
          {{ t(claimMessage) }}
        </p>
        <button
          v-if="!playing && pendingClaim && account && claimMessage && !saving"
          class="secondary-button"
          :disabled="authBusy"
          @click="claimScore"
        >
          {{ t('saveScoreToAccount') }}
        </button>
        <p
          v-if="!playing && best"
          class="personal-best small muted"
        >
          {{ account ? t('yourBest') : t('onThisDevice') }} {{ formatPercent(percentage(best.correct, best.total)) }} · {{ formatTime(best.timeMs) }}
        </p>
        <p
          v-if="rankingError || unranked"
          class="service-note"
          role="status"
        >
          {{ serviceNote }}
        </p>
        <section
          v-if="!playing"
          class="ranking-panel"
          aria-labelledby="ranking-title"
        >
          <div class="ranking-heading">
            <h2 id="ranking-title">
              {{ t('sharedRanking') }}
            </h2><button
              class="quiet-button"
              :aria-label="t('refreshRanking')"
              @click="refreshRanking"
            >
              ↻
            </button>
          </div>
          <table v-if="rankings.length">
            <thead>
              <tr>
                <th scope="col">
                  {{ t('player') }}
                </th><th scope="col">
                  {{ t('correct') }}
                </th><th scope="col">
                  {{ t('time') }}
                </th>
              </tr>
            </thead><tbody>
              <tr
                v-for="(row, i) in rankings"
                :key="row.id"
              >
                <td><span class="rank-number">{{ i + 1 }}</span>{{ row.name }}</td><td>{{ formatPercent(percentage(row.correct, row.total)) }}</td><td>{{ formatTime(row.timeMs) }}</td>
              </tr>
            </tbody>
          </table>
          <p
            v-else
            class="muted small"
          >
            {{ rankingError ? t('tryWhenConnected') : t('noScores') }}
          </p>
        </section>
      </aside>
      <section
        class="planet-panel"
        :aria-label="t('earth')"
      >
        <div class="planet-stage">
          <EarthGlobe
            v-if="!error"
            :key="globeKey"
            ref="globe"
            :countries="countries"
            :borders="true"
            :paint-found="false"
            :markers="true"
            :answers="noAnswers"
            :disabled="!playing"
            @select="answer"
            @ready="ready = true"
            @error="error = $event"
            @warning="warning = $event"
          />
          <div
            v-if="!ready || error"
            class="planet-loading"
            :role="error ? 'alert' : 'status'"
          >
            <span
              v-if="!error"
              class="loading-orbit"
            /><p>{{ error ? t(error, { status: errorStatus }) : t('loadingEarth') }}</p><button
              v-if="error"
              class="secondary-button"
              @click="load"
            >
              {{ t('retry') }}
            </button>
          </div>
          <div
            class="globe-tools"
            :aria-label="t('globeControls')"
          >
            <button
              :aria-label="t('zoomIn')"
              :disabled="!ready"
              @click="globe?.zoom(1)"
            >
              +
            </button><button
              :aria-label="t('zoomOut')"
              :disabled="!ready"
              @click="globe?.zoom(-1)"
            >
              −
            </button><button
              :aria-label="t('resetView')"
              :disabled="!ready"
              @click="globe?.reset()"
            >
              ⌖
            </button>
          </div>
        </div>
        <p
          v-if="warning"
          class="planet-warning"
          role="status"
        >
          {{ t(warning) }}
        </p>
      </section>
    </main>
    <BugReportDialog
      ref="bugReport"
      :country="playing ? target?.id : undefined"
    />
    <dialog
      ref="help"
      :aria-label="t('helpTitle')"
      class="orbit-dialog"
    >
      <form method="dialog">
        <button
          class="dialog-close"
          :aria-label="t('closeHelp')"
        >
          ×
        </button>
      </form>
      <h2>{{ t('findAll') }}</h2>
      <details>
        <summary>{{ t('whyList') }}</summary>
        <p>{{ t('membership') }}</p>
        <p>
          <a
            href="https://www.un.org/about-us/member-states"
            target="_blank"
            rel="noopener noreferrer"
          >{{ t('unMembers') }}</a> · <a
            href="https://www.un.org/en/about-us/non-member-states"
            target="_blank"
            rel="noopener noreferrer"
          >{{ t('unObservers') }}</a>
        </p>
        <ul class="country-list">
          <li
            v-for="country in quizCountries"
            :key="country.id"
          >
            {{ countryName(country) }}
          </li>
        </ul>
      </details>
      <p>{{ t('instructions') }}</p>
      <p>{{ t('rankingInstructions') }}</p>
      <p class="muted small">
        {{ t('keyboardInstructions') }}
      </p>
      <p class="muted small">
        {{ t('credits') }}
      </p>
    </dialog>
    <dialog
      ref="restart"
      :aria-label="t('restartDialog')"
      class="orbit-dialog"
    >
      <h2>{{ t('restartConfirm') }}</h2><p>{{ t('restartNotice') }}</p><div class="dialog-actions">
        <button
          class="secondary-button"
          @click="restart?.close()"
        >
          {{ t('continue') }}
        </button><button
          class="primary-button"
          @click="reset"
        >
          {{ t('restart') }}
        </button>
      </div>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import EarthGlobe from '@/components/EarthGlobe.vue'
import GoogleLoginButton from '@/components/auth/GoogleLoginButton.vue'
import ProfileAvatar from '@/components/auth/ProfileAvatar.vue'
import BugReportDialog from '@/components/BugReportDialog.vue'
import { account, accountBest, refreshAccount, type AtlasUser } from '@/globe/auth'
import { fetchCountries, type Country } from '@/globe/geography'
import { answerCountry, compareScores, correctCount, createSession, isGuestId, percentage, readPersonalScores, type Answer, type RankedScore, type Session } from '@/globe/game'
import { rankingRequest, validRanking } from '@/globe/ranking'
import { t, language, countryName, formatPercent, formatTime, type MessageKey } from '@/globe/i18n'

const base = import.meta.env.BASE_URL
const countries = shallowRef<Country[]>([]), session = shallowRef<Session>()
const quizCountries = computed(() => countries.value.filter(country => country.playable).sort((a, b) => countryName(a).localeCompare(countryName(b), language.value)))
const globe = ref<InstanceType<typeof EarthGlobe>>(), help = ref<HTMLDialogElement>(), restart = ref<HTMLDialogElement>()
const countryCount = ref<HTMLElement>()
const menu = ref<HTMLElement>(), bugReport = ref<InstanceType<typeof BugReportDialog>>()
const login = ref<InstanceType<typeof GoogleLoginButton>>()
function positionMenu(event: MouseEvent) {
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
  menu.value!.style.top = `${Math.max(16, Math.min(bounds.bottom + 8, innerHeight - 300))}px`
  menu.value!.style.right = `${Math.max(16, innerWidth - bounds.right)}px`
}
function menuKey(event: KeyboardEvent) {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {return}
  event.preventDefault()
  const buttons = Array.from(menu.value!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
  const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
  buttons[next]?.focus()
}
const countryCountExplanation = computed(() => t('countryCountInfo'))
function positionCountryCount(event: MouseEvent) {
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
  countryCount.value!.style.left = `${Math.max(20, Math.min(bounds.left, innerWidth - 300))}px`
  countryCount.value!.style.top = `${Math.max(20, Math.min(bounds.bottom + 8, innerHeight - 100))}px`
}
const ready = ref(false), error = ref<MessageKey | ''>(''), warning = ref<MessageKey | ''>(''), errorStatus = ref(''), globeKey = ref(0)
const playerName = ref(''), rankings = ref<RankedScore[]>([]), rankingError = ref<MessageKey | ''>('')
const starting = ref(false), saving = ref(false), unranked = ref(false), localBest = ref<RankedScore>()
const locallySaved = ref(false), uploadUnconfirmed = ref(false)
const authBusy = ref(false), authMessage = ref<MessageKey | ''>('')
const best = computed(() => account.value ? accountBest.value : localBest.value)
function connected(user: AtlasUser) {
  playerName.value = user.name
  refreshRanking()
  if (session.value?.phase === 'complete' && !saving.value && !claimMessage.value) {claimScore()}
}
const pendingClaim = ref<{ id: string; claimToken: string }>()
const claimMessage = ref<MessageKey | ''>('')
async function claimScore() {
  const claim = pendingClaim.value, current = generation
  if (!claim || !account.value || saving.value) {return}
  await upload
  if (!mounted || current !== generation || unranked.value) {return}
  saving.value = true; claimMessage.value = ''
  try {
    await rankingRequest(`/runs/${claim.id}/claim`, { claimToken: claim.claimToken }, 2)
    if (!mounted || current !== generation) {return}
    pendingClaim.value = undefined
    claimMessage.value = 'claimSaved'
    await Promise.all([refreshAccount(), refreshRanking()])
  } catch {
    if (mounted && current === generation) {claimMessage.value = pendingClaim.value ? 'claimRetry' : 'claimRefreshFailed'}
  } finally {if (mounted && current === generation) {saving.value = false}}
}
const elapsed = ref(0), verifiedTime = ref<number>(), feedbackKind = ref<'correct' | 'wrong' | 'skip' | 'land' | ''>(''), feedbackCountry = shallowRef<Country>(), feedbackOutcome = ref('')
const feedback = computed(() => feedbackKind.value === 'land' ? t('clickLand') : !feedbackKind.value ? '' : feedbackKind.value === 'skip' ? t('skippedCountry', { country: countryName(feedbackCountry.value) }) : `${feedbackKind.value === 'correct' ? '✓' : '×'} ${countryName(feedbackCountry.value)}`)
const noAnswers: Answer[] = []
const playing = computed(() => session.value?.phase === 'playing')
const canPlay = computed(() => ready.value && countries.value.length > 0 && !error.value)
const target = computed(() => session.value?.deck[session.value.answers.length])
const found = computed(() => session.value ? correctCount(session.value) : 0)
const accuracy = computed(() => percentage(found.value, session.value?.deck.length ?? 195))
const resultTime = computed(() => verifiedTime.value ?? session.value?.lastCorrectMs ?? 0)
const serviceNote = computed(() => {
  if (playing.value && unranked.value) {return uploadUnconfirmed.value ? t('rankingLost') : t('offlineUnranked')}
  if (session.value && unranked.value) {
    if (!locallySaved.value) {return t('localSaveFailed')}
    return uploadUnconfirmed.value ? t('sharedUnconfirmed') : t('localOnly')
  }
  return rankingError.value ? t(rankingError.value) : ''
})
let startedAt = 0, generation = 0, runId: string | undefined
let controller: AbortController | undefined, timer: ReturnType<typeof setInterval>
let upload: Promise<void> = Promise.resolve(), mounted = true
let playerId: string = crypto.randomUUID()

async function refreshRanking() {
  try { const rows = validRanking(await rankingRequest<unknown>('/leaderboard')); if (mounted) {rankings.value = rows; rankingError.value = ''} }
  catch { if (mounted) {rankingError.value = 'rankingUnavailable'} }
}
async function load() {
  controller?.abort(); controller = new AbortController()
  if (error.value) {globeKey.value++}
  ready.value = false; error.value = ''; warning.value = ''
  try {const data = await fetchCountries(base, controller.signal); if (mounted) {countries.value = data}}
  catch (e) {if (mounted && !(e instanceof DOMException && e.name === 'AbortError')) {const status = e instanceof Error ? /HTTP (\d+)/.exec(e.message)?.[1] : undefined; errorStatus.value = status || ''; error.value = status ? 'countryLoadHttp' : 'countryLoadFail'}}
}
async function start() {
  if (!canPlay.value || starting.value || authBusy.value) {return}
  const name = playerName.value.normalize('NFKC').trim()
  if (!/^[\p{L}\p{N} ._'’-]{1,24}$/u.test(name)) {rankingError.value = 'invalidName'; return}
  starting.value = true
  const current = ++generation
  pendingClaim.value = undefined; claimMessage.value = ''
  runId = undefined; verifiedTime.value = undefined; feedbackKind.value = ''; unranked.value = false; saving.value = false; locallySaved.value = false; uploadUnconfirmed.value = false
  try {localStorage.setItem('atlas-name', name)} catch { /* Play remains available without storage. */ }
  let next: Session
  try {
    if (!navigator.onLine) {throw new Error('Offline')}
    const result = await rankingRequest<{ id: string; deck: string[]; claimToken?: string }>('/runs', { playerId, name })
    if (!isGuestId(result.id) || !Array.isArray(result.deck)) {throw new Error('Invalid run')}
    next = createSession(countries.value, result.deck)
    runId = result.id; rankingError.value = ''
    if (!account.value && isGuestId(result.claimToken)) {pendingClaim.value = { id: result.id, claimToken: result.claimToken }}
  } catch { next = createSession(countries.value); unranked.value = true }
  if (!mounted || current !== generation) {return}
  session.value = next; elapsed.value = 0; startedAt = Date.now(); starting.value = false
  upload = Promise.resolve()
  globe.value?.reset()
  showMission()
}
function tick() { if (playing.value) {elapsed.value = Math.max(elapsed.value, Date.now() - startedAt)} }
function saveLocal() {
  try {
    const rows = readPersonalScores(localStorage)
    rows.push({ id: crypto.randomUUID(), name: playerName.value.trim(), correct: found.value, total: 195, timeMs: session.value!.lastCorrectMs })
    rows.sort(compareScores)
    localStorage.setItem('atlas-runs', JSON.stringify(rows.slice(0, 20)))
    localBest.value = rows[0]
    locallySaved.value = true
  } catch { if (unranked.value) {rankingError.value = 'localRunSaveFailed'} }
}
function sendAnswer(index: number, guess: string | null, elapsedMs: number) {
  const id = runId, current = generation
  if (!id) {return}
  saving.value = true
  upload = upload.then(async () => {
    if (current !== generation || runId !== id) {return}
    const result = await rankingRequest<{ complete: boolean; correct: number; total: number; timeMs: number }>(`/runs/${id}/answers`, { index, guess, elapsedMs }, 2)
    if (!mounted || current !== generation) {return}
    if (result.complete) {
      if (result.correct !== found.value || result.total !== 195 || result.timeMs !== session.value?.lastCorrectMs) {throw new Error('Invalid result')}
      verifiedTime.value = result.timeMs; saving.value = false
      await refreshRanking()
      if (account.value) {await refreshAccount()}
    }
  }).catch(() => { if (mounted && current === generation) {unranked.value = true; uploadUnconfirmed.value = true; runId = undefined; pendingClaim.value = undefined; saving.value = false} })
}
function answer(country: Country | null | undefined) {
  if (!session.value || !playing.value) {return}
  if (country === undefined) {feedbackKind.value = 'land'; return}
  tick()
  const previous = target.value!, index = session.value.answers.length, correct = country?.id === previous.id
  if (country) {globe.value?.showFeedback(correct)}
  session.value = answerCountry(session.value, country, elapsed.value)
  feedbackCountry.value = previous; feedbackKind.value = correct ? 'correct' : country === null ? 'skip' : 'wrong'
  feedbackOutcome.value = correct ? 'success' : country === null ? 'muted' : 'missed'
  sendAnswer(index, country?.id ?? null, Math.floor(elapsed.value))
  if (session.value.phase === 'complete') {saveLocal(); showMission()}
}
function showMission() { if (innerWidth <= 720 || import.meta.env.VITE_NATIVE === 'true') {nextTick(() => document.querySelector('.mission-card')?.scrollIntoView({ block: 'start' }))} }
function viewportChanged() {
  if (menu.value?.matches(':popover-open')) {menu.value.hidePopover()}
  if (countryCount.value?.matches(':popover-open')) {
    const bounds = countryCount.value.getBoundingClientRect()
    if (bounds.right > innerWidth || bounds.bottom > innerHeight) {countryCount.value.hidePopover()}
  }
  if (session.value) {showMission()}
}
function reset() {generation++; runId = undefined; pendingClaim.value = undefined; claimMessage.value = ''; session.value = undefined; starting.value = false; saving.value = false; feedbackKind.value = ''; restart.value?.close(); globe.value?.reset()}
onMounted(() => {
  try {
    const saved = localStorage.getItem('atlas-player-id')
    if (isGuestId(saved)) {playerId = saved}
    localStorage.setItem('atlas-player-id', playerId)
    playerName.value = (localStorage.getItem('atlas-name') || '').slice(0, 24)
    localBest.value = readPersonalScores(localStorage)[0]
  } catch { /* A temporary guest identity works without storage. */ }
  load(); refreshRanking(); timer = setInterval(tick, 100)
  document.addEventListener('visibilitychange', tick); window.addEventListener('resize', viewportChanged)
})
onBeforeUnmount(() => { mounted = false; generation++; controller?.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', tick); window.removeEventListener('resize', viewportChanged) })
</script>
