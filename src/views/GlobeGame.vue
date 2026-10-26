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
        <button
          v-if="playing"
          class="quiet-button"
          @click="restart?.showModal()"
        >
          Restart
        </button>
        <button
          class="icon-button"
          aria-label="How to play"
          @click="help?.showModal()"
        >
          ?
        </button>
      </div>
    </header>
    <main class="orbit-workspace">
      <aside class="mission-panel">
        <section
          v-if="!session"
          class="start-card"
        >
          <div class="challenge-heading">
            <h1>195 countries.</h1>
            <button
              class="count-info-button"
              aria-label="Why 195 countries?"
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
          <GoogleLoginButton
            :disabled="starting || saving"
            @busy="authBusy = $event"
            @connected="connected"
          />
          <div
            v-if="!account"
            class="guest-divider"
          >
            <span>or play as a guest</span>
          </div>
          <form
            :class="{ 'account-play': account }"
            @submit.prevent="start"
          >
            <template v-if="!account">
              <label
                class="name-label"
                for="player-name"
              >Name</label>
              <input
                id="player-name"
                v-model="playerName"
                maxlength="24"
                required
                autocomplete="nickname"
                placeholder="Your name"
              >
            </template>
            <button
              class="primary-button"
              :disabled="!canPlay || starting || authBusy"
            >
              {{ starting ? 'Starting…' : canPlay ? 'Play' : 'Loading Earth…' }}
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
              <span>Find</span><span data-testid="progress">{{ session.answers.length + 1 }} / {{ session.deck.length }}</span>
            </div>
            <h1 id="target-name">
              {{ target?.name }}
            </h1>
          </template>
          <h1
            v-else
            id="target-name"
          >
            Your score
          </h1>
          <div class="session-stats">
            <div><span>Correct</span><strong data-testid="accuracy">{{ accuracy.toFixed(1) }}%</strong></div>
            <div><span>{{ playing ? 'Time' : 'Time to score' }}</span><strong data-testid="timer">{{ formatTime(playing ? elapsed : resultTime) }}</strong></div>
          </div>
          <div
            class="progress-track"
            role="progressbar"
            aria-label="Countries answered"
            :aria-valuenow="session.answers.length"
            :aria-valuemax="session.deck.length"
            aria-valuemin="0"
          >
            <span :style="{ width: `${session.answers.length / session.deck.length * 100}%` }" />
          </div>
          <p class="round-count">
            {{ found }} / {{ session.deck.length }} correct
          </p>
          <button
            v-if="playing"
            class="secondary-button skip-button"
            @click="answer(null)"
          >
            Skip <span aria-hidden="true">→</span>
          </button>
          <button
            v-else
            class="primary-button"
            :disabled="starting || saving || authBusy"
            @click="start"
          >
            Play again
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
            Saving score…
          </p>
        </section>
        <GoogleLoginButton
          v-if="session && !playing"
          :disabled="starting || saving"
          @busy="authBusy = $event"
          @connected="connected"
        />
        <p
          v-if="!playing && pendingClaim && !account"
          class="muted small"
        >
          Sign in to keep this score with your account.
        </p>
        <p
          v-if="claimMessage"
          class="small"
          role="status"
        >
          {{ claimMessage }}
        </p>
        <button
          v-if="!playing && pendingClaim && account && claimMessage && !saving"
          class="secondary-button"
          :disabled="authBusy"
          @click="claimScore"
        >
          Save score to account
        </button>
        <p
          v-if="!playing && best"
          class="personal-best small muted"
        >
          {{ account ? 'Your best' : 'On this device' }} {{ percentage(best.correct, best.total).toFixed(1) }}% · {{ formatTime(best.timeMs) }}
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
              Shared ranking
            </h2><button
              class="quiet-button"
              aria-label="Refresh ranking"
              @click="refreshRanking"
            >
              ↻
            </button>
          </div>
          <table v-if="rankings.length">
            <thead>
              <tr>
                <th scope="col">
                  Player
                </th><th scope="col">
                  Correct
                </th><th scope="col">
                  Time
                </th>
              </tr>
            </thead><tbody>
              <tr
                v-for="(row, i) in rankings"
                :key="row.id"
              >
                <td><span class="rank-number">{{ i + 1 }}</span>{{ row.name }}</td><td>{{ percentage(row.correct, row.total).toFixed(1) }}%</td><td>{{ formatTime(row.timeMs) }}</td>
              </tr>
            </tbody>
          </table>
          <p
            v-else
            class="muted small"
          >
            {{ rankingError ? 'Try again when connected.' : 'No scores yet.' }}
          </p>
        </section>
      </aside>
      <section
        class="planet-panel"
        aria-label="Earth"
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
            /><p>{{ error || 'Loading Earth…' }}</p><button
              v-if="error"
              class="secondary-button"
              @click="load"
            >
              Retry
            </button>
          </div>
          <div
            class="globe-tools"
            aria-label="Globe controls"
          >
            <button
              aria-label="Zoom in"
              :disabled="!ready"
              @click="globe?.zoom(1)"
            >
              +
            </button><button
              aria-label="Zoom out"
              :disabled="!ready"
              @click="globe?.zoom(-1)"
            >
              −
            </button><button
              aria-label="Reset globe view"
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
          {{ warning }}
        </p>
      </section>
    </main>
    <dialog
      ref="help"
      aria-label="How to play Atlas"
      class="orbit-dialog"
    >
      <form method="dialog">
        <button
          class="dialog-close"
          aria-label="Close help"
        >
          ×
        </button>
      </form>
      <h2>Find all 195 countries.</h2>
      <details>
        <summary>Why 195? See the country list</summary>
        <p>The 193 UN member states plus its two non-member observer states: Palestine and the Holy See, represented here by Vatican City. This is a membership-based quiz list, not a list of states recognized by every country.</p>
        <p>
          <a
            href="https://www.un.org/about-us/member-states"
            target="_blank"
            rel="noopener noreferrer"
          >UN members</a> · <a
            href="https://www.un.org/en/about-us/non-member-states"
            target="_blank"
            rel="noopener noreferrer"
          >UN observer states</a>
        </p>
        <ul class="country-list">
          <li
            v-for="country in countries.filter(country => country.playable)"
            :key="country.id"
          >
            {{ country.name }}
          </li>
        </ul>
      </details>
      <p>Drag to rotate. Scroll or pinch to zoom. Click a country, or skip it. One guess per country.</p>
      <p>Accuracy is out of 195. Ties use the time of your last correct answer. The clock never pauses.</p>
      <p class="muted small">
        Keyboard: arrows rotate, +/− zoom, Enter selects the center.
      </p>
      <p class="muted small">
        Natural Earth boundaries · NASA imagery. Generalized coastlines and disputed boundaries. Guest rankings are for practice.
      </p>
    </dialog>
    <dialog
      ref="restart"
      aria-label="Restart challenge"
      class="orbit-dialog"
    >
      <h2>Restart?</h2><p>The current run won't be ranked.</p><div class="dialog-actions">
        <button
          class="secondary-button"
          @click="restart?.close()"
        >
          Continue
        </button><button
          class="primary-button"
          @click="reset"
        >
          Restart
        </button>
      </div>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import EarthGlobe from '@/components/EarthGlobe.vue'
import GoogleLoginButton from '@/components/auth/GoogleLoginButton.vue'
import { account, accountBest, refreshAccount, type AtlasUser } from '@/globe/auth'
import { fetchCountries, type Country } from '@/globe/geography'
import { answerCountry, compareScores, correctCount, createSession, formatTime, isGuestId, percentage, readPersonalScores, type Answer, type RankedScore, type Session } from '@/globe/game'
import { rankingRequest, validRanking } from '@/globe/ranking'

const base = import.meta.env.BASE_URL
const countries = shallowRef<Country[]>([]), session = shallowRef<Session>()
const globe = ref<InstanceType<typeof EarthGlobe>>(), help = ref<HTMLDialogElement>(), restart = ref<HTMLDialogElement>()
const countryCount = ref<HTMLElement>()
const countryCountExplanation = '193 UN members + 2 observer states.'
function positionCountryCount(event: MouseEvent) {
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
  countryCount.value!.style.left = `${Math.max(20, Math.min(bounds.left, innerWidth - 300))}px`
  countryCount.value!.style.top = `${Math.max(20, Math.min(bounds.bottom + 8, innerHeight - 100))}px`
}
const ready = ref(false), error = ref(''), warning = ref(''), globeKey = ref(0)
const playerName = ref(''), rankings = ref<RankedScore[]>([]), rankingError = ref('')
const starting = ref(false), saving = ref(false), unranked = ref(false), localBest = ref<RankedScore>()
const locallySaved = ref(false), uploadUnconfirmed = ref(false)
const authBusy = ref(false)
const best = computed(() => account.value ? accountBest.value : localBest.value)
function connected(user: AtlasUser) {
  playerName.value = user.name
  refreshRanking()
  if (session.value?.phase === 'complete' && !saving.value && !claimMessage.value) {claimScore()}
}
const pendingClaim = ref<{ id: string; claimToken: string }>()
const claimMessage = ref('')
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
    claimMessage.value = 'Score saved to your account.'
    await Promise.all([refreshAccount(), refreshRanking()])
  } catch {
    if (mounted && current === generation) {claimMessage.value = pendingClaim.value ? 'Could not save to your account. Try again.' : 'Score saved. Could not refresh your best.'}
  } finally {if (mounted && current === generation) {saving.value = false}}
}
const elapsed = ref(0), verifiedTime = ref<number>(), feedback = ref(''), feedbackOutcome = ref('')
const noAnswers: Answer[] = []
const playing = computed(() => session.value?.phase === 'playing')
const canPlay = computed(() => ready.value && countries.value.length > 0 && !error.value)
const target = computed(() => session.value?.deck[session.value.answers.length])
const found = computed(() => session.value ? correctCount(session.value) : 0)
const accuracy = computed(() => percentage(found.value, session.value?.deck.length ?? 195))
const resultTime = computed(() => verifiedTime.value ?? session.value?.lastCorrectMs ?? 0)
const serviceNote = computed(() => {
  if (playing.value && unranked.value) {return uploadUnconfirmed.value ? 'Ranking connection lost.' : 'Offline · unranked run'}
  if (session.value && unranked.value) {
    if (!locallySaved.value) {return 'Ranking unavailable. This device could not save your score.'}
    return uploadUnconfirmed.value ? 'Shared score not confirmed. Saved on this device.' : 'Saved on this device. Shared ranking unavailable.'
  }
  return rankingError.value
})
let startedAt = 0, generation = 0, runId: string | undefined
let controller: AbortController | undefined, timer: ReturnType<typeof setInterval>
let upload: Promise<void> = Promise.resolve(), mounted = true
let playerId: string = crypto.randomUUID()

async function refreshRanking() {
  try { const rows = validRanking(await rankingRequest<unknown>('/leaderboard')); if (mounted) {rankings.value = rows; rankingError.value = ''} }
  catch { if (mounted) {rankingError.value = 'Shared ranking unavailable.'} }
}
async function load() {
  controller?.abort(); controller = new AbortController()
  if (error.value) {globeKey.value++}
  ready.value = false; error.value = ''; warning.value = ''
  try {const data = await fetchCountries(base, controller.signal); if (mounted) {countries.value = data}}
  catch (e) {if (mounted && !(e instanceof DOMException && e.name === 'AbortError')) {error.value = e instanceof Error ? e.message : 'Could not load countries.'}}
}
async function start() {
  if (!canPlay.value || starting.value || authBusy.value) {return}
  const name = playerName.value.normalize('NFKC').trim()
  if (!/^[\p{L}\p{N} ._'’-]{1,24}$/u.test(name)) {rankingError.value = 'Enter a name of 1–24 letters or numbers.'; return}
  starting.value = true
  const current = ++generation
  pendingClaim.value = undefined; claimMessage.value = ''
  runId = undefined; verifiedTime.value = undefined; feedback.value = ''; unranked.value = false; saving.value = false; locallySaved.value = false; uploadUnconfirmed.value = false
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
  } catch { if (unranked.value) {rankingError.value = 'This run could not be saved.'} }
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
  if (country === undefined) {feedback.value = 'Click land.'; return}
  tick()
  const previous = target.value!, index = session.value.answers.length, correct = country?.id === previous.id
  if (country) {globe.value?.showFeedback(correct)}
  session.value = answerCountry(session.value, country, elapsed.value)
  feedback.value = correct ? `✓ ${previous.name}` : country === null ? `Skipped ${previous.name}` : `× ${previous.name}`
  feedbackOutcome.value = correct ? 'success' : country === null ? 'muted' : 'missed'
  sendAnswer(index, country?.id ?? null, Math.floor(elapsed.value))
  if (session.value.phase === 'complete') {saveLocal(); showMission()}
}
function showMission() { if (innerWidth <= 720 || import.meta.env.VITE_NATIVE === 'true') {nextTick(() => document.querySelector('.mission-card')?.scrollIntoView({ block: 'start' }))} }
function viewportChanged() {
  if (countryCount.value?.matches(':popover-open')) {
    const bounds = countryCount.value.getBoundingClientRect()
    if (bounds.right > innerWidth || bounds.bottom > innerHeight) {countryCount.value.hidePopover()}
  }
  if (session.value) {showMission()}
}
function reset() {generation++; runId = undefined; pendingClaim.value = undefined; claimMessage.value = ''; session.value = undefined; starting.value = false; saving.value = false; feedback.value = ''; restart.value?.close(); globe.value?.reset()}
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
