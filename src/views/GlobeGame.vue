<template>
  <div
    class="orbit-app"
    :class="{ 'native-app': native }"
  >
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
          class="quiet-button stop-run-button"
          :aria-label="t('stopRun')"
          @click="openStopDialog"
        >
          {{ t('stop') }}
        </button>
        <GoogleLoginButton
          ref="login"
          :disabled="playing || starting || saving || savingResult"
          :show-sign-in="session?.phase === 'complete' || (authMenuOpen && !playing && !starting)"
          :button-target="session?.phase === 'complete' ? '#result-google-entry' : '#menu-google-entry'"
          @busy="authBusy = $event"
          @connected="connected"
          @profile-updated="refreshRanking"
          @status="authMessage = $event"
        />
        <button
          class="account-avatar"
          :class="{ 'guest-avatar': !account }"
          :aria-label="t('menu')"
          :title="account ? t('connectedAs', { name: account.name }) : t('menu')"
          popovertarget="atlas-menu"
          @click="positionMenu"
        >
          <ProfileAvatar
            v-if="account"
            :user="account"
          />
          <svg
            v-else
            class="guest-silhouette"
            viewBox="0 0 24 24"
            aria-hidden="true"
          ><circle
            cx="12"
            cy="8"
            r="4"
          /><path d="M4 21a8 8 0 0 1 16 0z" /></svg>
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
          @toggle="menuToggled"
        >
          <div
            id="menu-google-entry"
            class="menu-google-entry"
          />
          <p
            v-if="authMessage && session?.phase !== 'complete'"
            class="account-feedback small"
            role="status"
          >
            {{ t(authMessage) }}
          </p>
          <div
            v-if="account"
            class="account-identity"
          >
            <strong>{{ t('connectedAs', { name: account.name }) }}</strong>
          </div>
          <button
            v-if="account"
            role="menuitem"
            :disabled="playing || starting || saving || savingResult || authBusy"
            @click="menu?.hidePopover(); login?.openProfile()"
          >
            {{ t('editProfile') }}
          </button>
          <button
            v-if="account"
            role="menuitem"
            :disabled="playing || starting || saving || savingResult || authBusy"
            @click="menu?.hidePopover(); login?.disconnect()"
          >
            {{ t('signOut') }}
          </button>
          <button
            role="menuitem"
            :disabled="playing || starting"
            @click="menu?.hidePopover(); scoresDialog?.open()"
          >
            {{ t('scores') }}
          </button>
          <button
            role="menuitem"
            :disabled="playing || starting"
            @click="menu?.hidePopover(); statisticsDialog?.open()"
          >
            {{ t('statistics') }}
          </button>
          <button
            v-if="playing"
            role="menuitem"
            @click="menu?.hidePopover(); openStopDialog()"
          >
            {{ t('stopRun') }}
          </button>
          <button
            role="menuitem"
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
    <main class="orbit-workspace">
      <aside
        v-if="!native"
        class="ranking-sidebar"
        :aria-label="t('sharedRanking')"
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
        <section
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
                  {{ t('points') }}
                </th><th scope="col">
                  {{ t('time') }}
                </th>
              </tr>
            </thead><tbody>
              <tr
                v-for="(row, i) in rankings"
                :key="row.id"
              >
                <td><span class="rank-number">{{ i + 1 }}</span>{{ row.name }}</td><td>{{ formatPercent(percentage(row.score ?? row.correct, row.total)) }}</td><td>{{ formatTime(row.timeMs) }}</td>
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
            :paint-found="true"
            :markers="true"
            :answers="session?.answers ?? noAnswers"
            :reveal="revealCountryId"
            :disabled="!playing || revealing"
            @select="answer"
            @tap-pending="setTapPending"
            @ready="ready = true"
            @error="error = $event"
            @warning="warning = $event"
          />
          <div
            v-if="error"
            class="planet-loading"
            role="alert"
          >
            <p>{{ t(error, { status: errorStatus }) }}</p><button
              class="secondary-button"
              @click="load"
            >
              {{ t('retry') }}
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
      <div
        class="mission-panel"
        :class="{ 'is-playing': playing, 'is-revealing': revealing }"
      >
        <section
          v-if="!session && !error"
          class="start-card"
        >
          <h1 class="sr-only">
            {{ t('appTitle') }}
          </h1>
          <button
            class="primary-button play-button"
            :aria-label="starting ? t('starting') : canPlay ? t('play') : t('loadingEarth')"
            :aria-busy="starting"
            :disabled="!canPlay || starting || authBusy"
            @click="start"
          >
            <svg
              v-if="canPlay && !starting"
              viewBox="0 0 24 24"
              aria-hidden="true"
            ><path
              fill="currentColor"
              d="M9 5v14l11-7z"
            /></svg>
            <span
              v-else
              class="play-spinner"
              aria-hidden="true"
            />
            <span class="play-label">{{ starting ? t('starting') : t('play') }}</span>
          </button>
        </section>
        <section
          v-else-if="session"
          class="mission-card"
          :class="{ 'result-card': !playing }"
          aria-labelledby="target-name"
        >
          <template v-if="playing">
            <div class="mission-topline">
              <span>{{ t('find') }}</span><span data-testid="progress">{{ session.answers.length + 1 }} / {{ session.deck.length }}</span>
            </div>
            <h1 id="target-name">
              {{ countryName(target) }}
            </h1>
            <p
              class="attempts-left"
              role="status"
            >
              {{ t('attemptsLeft', { count: revealing ? 0 : 3 - session.attempts }) }} <span aria-hidden="true">{{ '●'.repeat(revealing ? 0 : 3 - session.attempts) }}{{ '○'.repeat(revealing ? 3 : session.attempts) }}</span>
            </p>
          </template>
          <h1
            v-else
            id="target-name"
          >
            {{ t('yourScore') }}
          </h1>
          <button
            v-if="!playing"
            class="result-close quiet-button"
            :aria-label="t('backHome')"
            :disabled="authBusy || saving || savingResult"
            @click="reset"
          >
            ×
          </button>
          <div
            v-if="playing"
            class="session-stats"
          >
            <div><span class="sr-only">{{ t('points') }}</span><strong data-testid="accuracy">{{ formatPercent(accuracy) }}</strong></div>
            <div><span class="sr-only">{{ t('time') }}</span><strong data-testid="timer">{{ formatTime(elapsed) }}</strong></div>
          </div>
          <div
            v-else
            class="result-metrics"
          >
            <strong data-testid="correct-total">{{ formatPoints(session ? sessionScore(session) : 0) }}/195</strong>
            <strong data-testid="accuracy">{{ formatPercent(accuracy) }}</strong>
            <strong
              data-testid="timer"
            >{{ formatScoreTime(resultTime) }}</strong>
          </div>
          <div
            v-if="!playing"
            class="outcome-counts"
            data-testid="outcome-counts"
          >
            <span
              v-for="grade in grades"
              :key="grade"
              :class="grade"
              :aria-label="t(grade)"
            >{{ outcomeCounts(session.answers)[grade] }}</span>
          </div>
          <button
            v-if="playing"
            class="secondary-button skip-button"
            :disabled="revealing"
            @click="answer(null)"
          >
            {{ t('skip') }} <span aria-hidden="true">→</span>
          </button>
          <p
            v-if="playing"
            class="answer-feedback"
            :class="feedbackOutcome"
            role="status"
            aria-live="polite"
          >
            {{ revealing ? t('revealingCountry') : feedback }}
          </p>
          <template v-else>
            <div
              id="result-google-entry"
              class="result-google-entry"
            />
            <p
              v-if="!account"
              class="result-or"
            >
              {{ t('or') }}
            </p>
            <form
              class="result-save-form"
              @submit.prevent="saveResult"
            >
              <label
                class="sr-only"
                for="player-name"
              >{{ t('nickname') }}</label>
              <input
                id="player-name"
                v-model="playerName"
                maxlength="24"
                autocomplete="nickname"
                :placeholder="t('nickname')"
                :disabled="authBusy || savingResult"
              >
              <button
                class="primary-button"
                :disabled="saving || authBusy || savingResult || (unranked && !locallySaved)"
                :aria-busy="saving || savingResult"
              >
                {{ t('saveScore') }}
              </button>
            </form>
            <p
              v-if="claimMessage"
              class="small service-note"
              role="status"
            >
              {{ t(claimMessage) }}
            </p>
            <p
              v-if="authMessage"
              class="account-feedback small"
              role="status"
            >
              {{ t(authMessage) }}
            </p>
          </template>
          <p
            v-if="unranked"
            class="service-note"
            role="status"
          >
            {{ serviceNote }}
          </p>
        </section>
      </div>
    </main>
    <ScoresDialog ref="scoresDialog" />
    <StatisticsDialog
      ref="statisticsDialog"
      :countries="countries"
    />
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
      ref="stopDialog"
      :aria-label="t('stopDialog')"
      class="orbit-dialog"
    >
      <h2>{{ t('stopConfirm') }}</h2><p>{{ t('stopNotice') }}</p><div class="dialog-actions">
        <button
          class="secondary-button"
          autofocus
          @click="stopDialog?.close()"
        >
          {{ t('continue') }}
        </button><button
          class="primary-button"
          @click="reset"
        >
          {{ t('stopRun') }}
        </button>
      </div>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import EarthGlobe from '@/components/EarthGlobe.vue'
import GoogleLoginButton from '@/components/auth/GoogleLoginButton.vue'
import ProfileAvatar from '@/components/auth/ProfileAvatar.vue'
import BugReportDialog from '@/components/BugReportDialog.vue'
import StatisticsDialog from '@/components/StatisticsDialog.vue'
import ScoresDialog from '@/components/ScoresDialog.vue'
import { account, refreshAccount, type AtlasUser } from '@/globe/auth'
import { fetchCountries, type Country } from '@/globe/geography'
import { answerCountry, compareScores, correctCount, sessionScore, outcomeCounts, createSession, isGuestId, percentage, readPersonalScores, readCountryStats, recordCountryStat, type Answer, type RankedScore, type Session } from '@/globe/game'
import { rankingRequest, validRanking } from '@/globe/ranking'
import { t, language, countryName, formatPercent, formatTime, formatScoreTime, formatPoints, type MessageKey } from '@/globe/i18n'

const base = import.meta.env.BASE_URL
const native = import.meta.env.VITE_NATIVE === 'true'
const authMenuOpen = ref(false)
const scoresDialog = ref<InstanceType<typeof ScoresDialog>>()
const statisticsDialog = ref<InstanceType<typeof StatisticsDialog>>()
const countries = shallowRef<Country[]>([]), session = shallowRef<Session>()
const quizCountries = computed(() => countries.value.filter(country => country.playable).sort((a, b) => countryName(a).localeCompare(countryName(b), language.value)))
const globe = ref<InstanceType<typeof EarthGlobe>>(), help = ref<HTMLDialogElement>(), stopDialog = ref<HTMLDialogElement>()
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
  const buttons = Array.from(menu.value!.querySelectorAll<HTMLElement>('button:not(:disabled), [role="button"]:not([aria-disabled="true"]), iframe')).filter(element => element.getClientRects().length && !element.closest('[inert]'))
  const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
  buttons[next]?.focus()
}
async function menuToggled() {
  authMenuOpen.value = menu.value?.matches(':popover-open') || false
  if (!authMenuOpen.value) {return}
  globe.value?.cancelInput()
  await nextTick()
  if (menu.value?.matches(':popover-open')) {menu.value.querySelector<HTMLButtonElement>('button[role="menuitem"]:not(:disabled)')?.focus()}
}
const countryCountExplanation = computed(() => t('countryCountInfo'))
function positionCountryCount(event: MouseEvent) {
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
  countryCount.value!.style.left = `${Math.max(20, Math.min(bounds.left, innerWidth - 300))}px`
  countryCount.value!.style.top = `${Math.max(20, Math.min(bounds.bottom + 8, innerHeight - 100))}px`
}
const ready = ref(false), error = ref<MessageKey | ''>(''), warning = ref<MessageKey | ''>(''), errorStatus = ref(''), globeKey = ref(0)
const playerName = ref(''), rankings = ref<RankedScore[]>([]), rankingError = ref<MessageKey | ''>('')
const starting = ref(false), saving = ref(false), savingResult = ref(false), unranked = ref(false)
const revealing = ref(false), waitingForTap = ref(false), revealCountryId = ref<string>(), published = ref(false)
const locallySaved = ref(false), uploadUnconfirmed = ref(false)
const authBusy = ref(false), authMessage = ref<MessageKey | ''>('')
function connected(user: AtlasUser) {
  playerName.value = user.name
  refreshRanking()
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
    published.value = true
    await Promise.all([refreshAccount(), refreshRanking()])
  } catch {
    if (mounted && current === generation) {claimMessage.value = pendingClaim.value ? 'claimRetry' : 'claimRefreshFailed'}
  } finally {if (mounted && current === generation) {saving.value = false}}
}
async function publishScore() {
  const claim = pendingClaim.value, current = generation
  if (!claim || saving.value || account.value) {return}
  const name = playerName.value.normalize('NFKC').trim()
  if (!/^[\p{L}\p{N} ._'’-]{1,24}$/u.test(name)) {claimMessage.value = 'invalidName'; return}
  saving.value = true; claimMessage.value = ''
  try {
    await rankingRequest(`/runs/${claim.id}/publish`, { claimToken: claim.claimToken, playerId, name }, 2)
    if (!mounted || current !== generation) {return}
    published.value = true
    try {localStorage.setItem('atlas-name', name)} catch { /* Publication does not require device storage. */ }
    await refreshRanking()
  } catch {if (mounted && current === generation) {claimMessage.value = 'publishFailed'}}
  finally {if (mounted && current === generation) {saving.value = false}}
}
async function saveResult() {
  if (saving.value || savingResult.value || authBusy.value || (unranked.value && !locallySaved.value)) {return}
  const name = playerName.value.normalize('NFKC').trim(), current = generation
  if (name && !/^[\p{L}\p{N} ._'’-]{1,24}$/u.test(name)) {claimMessage.value = 'invalidName'; return}
  savingResult.value = true; claimMessage.value = ''
  try {
    await upload
    if (!mounted || current !== generation) {return}
    if (name && account.value && account.value.name !== name) {
      await rankingRequest('/auth/profile', { name, avatar: account.value.avatar || 'google' }, 2)
      await refreshAccount()
      if (account.value?.name !== name) {throw new Error('Profile not confirmed')}
    }
    if (name && pendingClaim.value && !unranked.value) {
      playerName.value = name
      if (account.value) {await claimScore()} else {await publishScore()}
      if (!published.value) {return}
    }
    if (mounted && current === generation) {
      if (!account.value) {try {localStorage.setItem('atlas-name', name)} catch { /* Storage can be unavailable. */ }}
      reset()
    }
  } catch {if (mounted && current === generation) {claimMessage.value = 'profileSaveFailed'}}
  finally {if (mounted && current === generation) {savingResult.value = false}}
}
watch(() => account.value?.name, (name, previous) => {
  if (name && session.value?.phase === 'complete' && name !== previous) {playerName.value = name}
  else if (!name && previous) {playerName.value = ''}
})
const elapsed = ref(0), verifiedTime = ref<number>(), feedbackKind = ref<'correct' | 'wrong' | 'skip' | 'land' | ''>(''), feedbackCountry = shallowRef<Country>(), feedbackOutcome = ref('')
const feedback = computed(() => feedbackKind.value === 'land' ? t('clickLand') : !feedbackKind.value ? '' : feedbackKind.value === 'skip' ? t('skippedCountry', { country: countryName(feedbackCountry.value) }) : `${feedbackKind.value === 'correct' ? '✓' : '×'} ${countryName(feedbackCountry.value)}`)
const grades = ['green', 'yellow', 'orange', 'red'] as const
const noAnswers: Answer[] = []
const playing = computed(() => session.value?.phase === 'playing')
const canPlay = computed(() => ready.value && countries.value.length > 0 && !error.value)
const target = computed(() => session.value?.deck[session.value.answers.length])
const found = computed(() => session.value ? correctCount(session.value) : 0)
const accuracy = computed(() => percentage(session.value ? sessionScore(session.value) : 0, session.value?.deck.length ?? 195))
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
let rankingTimer: ReturnType<typeof setInterval> | undefined
let upload: Promise<void> = Promise.resolve(), mounted = true
let playerId: string = crypto.randomUUID()

async function refreshRanking() {
  if (native) {return}
  try { const rows = validRanking(await rankingRequest<unknown>('/leaderboard?rules=4')); if (mounted) {rankings.value = rows; rankingError.value = ''} }
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
  globe.value?.cancelInput()
  starting.value = true
  const current = ++generation
  pendingClaim.value = undefined; claimMessage.value = ''; published.value = false; revealing.value = false; revealCountryId.value = undefined
  runId = undefined; verifiedTime.value = undefined; feedbackKind.value = ''; unranked.value = false; saving.value = false; locallySaved.value = false; uploadUnconfirmed.value = false
  let next: Session
  try {
    if (!navigator.onLine) {throw new Error('Offline')}
    const result = await rankingRequest<{ id: string; deck: string[]; claimToken?: string }>('/runs?rules=4', {})
    if (!isGuestId(result.id) || !Array.isArray(result.deck)) {throw new Error('Invalid run')}
    next = createSession(countries.value, result.deck)
    runId = result.id; rankingError.value = ''
    if (isGuestId(result.claimToken)) {pendingClaim.value = { id: result.id, claimToken: result.claimToken }}
  } catch { next = createSession(countries.value); unranked.value = true }
  if (!mounted || current !== generation) {return}
  session.value = next; elapsed.value = 0; startedAt = Date.now(); starting.value = false
  upload = Promise.resolve()
  globe.value?.reset()
}
function tick() { if (playing.value && !revealing.value && !waitingForTap.value) {elapsed.value = Math.max(elapsed.value, Date.now() - startedAt)} }
function setTapPending(pending: boolean) {if (pending) {tick()} waitingForTap.value = pending}
function openStopDialog() {globe.value?.cancelInput(); stopDialog.value?.showModal()}
function saveLocal() {
  try {
    const key = account.value ? `atlas-runs-v4:${account.value.id}` : 'atlas-runs-v4'
    const rows = readPersonalScores(localStorage, key)
    rows.push({ id: crypto.randomUUID(), name: account.value?.name || playerName.value.trim(), correct: found.value, score: sessionScore(session.value!), ...outcomeCounts(session.value!.answers), total: 195, timeMs: session.value!.lastCorrectMs })
    rows.sort(compareScores)
    localStorage.setItem(key, JSON.stringify(rows.slice(0, 20)))
    locallySaved.value = true
  } catch { if (unranked.value) {rankingError.value = 'localRunSaveFailed'} }
}
function sendAnswer(index: number, attempt: number, guess: string | null, elapsedMs: number, next: Session) {
  const id = runId, current = generation
  if (!id) {return}
  saving.value = true
  upload = upload.then(async () => {
    if (current !== generation || runId !== id) {return}
    const result = await rankingRequest<{ complete: boolean; correct: number; total: number; timeMs: number; score: number; green: number; yellow: number; orange: number; red: number }>(`/runs/${id}/answers`, { index, attempt, guess, elapsedMs }, 2)
    if (!mounted || current !== generation) {return}
    if (result.complete) {
      if (result.correct !== correctCount(next) || result.total !== 195 || result.timeMs !== next.lastCorrectMs || result.score !== sessionScore(next) || Object.entries(outcomeCounts(next.answers)).some(([key, value]) => Reflect.get(result, key) !== value)) {throw new Error('Invalid result')}
      verifiedTime.value = result.timeMs; saving.value = false
      await refreshRanking()
      if (account.value) {await refreshAccount()}
    }
  }).catch(() => { if (mounted && current === generation) {unranked.value = true; uploadUnconfirmed.value = true; runId = undefined; pendingClaim.value = undefined; saving.value = false} })
}
async function answer(country: Country | null | undefined, deferredMs = 0) {
  if (!session.value || !playing.value || revealing.value) {return}
  globe.value?.cancelInput()
  if (country === undefined) {feedbackKind.value = 'land'; return}
  startedAt += deferredMs
  tick()
  const previous = target.value!, index = session.value.answers.length, attempt = session.value.attempts, correct = country?.id === previous.id
  const current = generation, answeredAt = Math.floor(elapsed.value)
  if (country) {globe.value?.showFeedback(correct)}
  const next = answerCountry(session.value, country, elapsed.value)
  sendAnswer(index, attempt, country?.id ?? null, answeredAt, next)
  if (!account.value && next.answers.length > index) {
    try {localStorage.setItem('atlas-country-stats-v4', JSON.stringify(recordCountryStat(readCountryStats(localStorage), next.answers.at(-1)!)))} catch { /* Global statistics remain available when local storage is blocked. */ }
  }
  if (country && !correct && next.answers.length > index) {
    const pausedAt = Date.now()
    revealing.value = true; revealCountryId.value = previous.id
    await nextTick()
    await globe.value?.revealCountry(previous)
    await new Promise(resolve => setTimeout(resolve, matchMedia('(prefers-reduced-motion: reduce)').matches ? 100 : 250))
    if (!mounted || current !== generation) {return}
    await globe.value?.pullBack()
    if (!mounted || current !== generation) {return}
    startedAt += Date.now() - pausedAt
    revealing.value = false; revealCountryId.value = undefined
  }
  session.value = next
  feedbackCountry.value = country ?? previous; feedbackKind.value = correct ? 'correct' : country === null ? 'skip' : 'wrong'
  feedbackOutcome.value = correct ? 'success' : country === null ? 'muted' : 'missed'
  if (session.value.phase === 'complete') {if (account.value) {playerName.value = account.value.name} saveLocal()}
}
function viewportChanged() {
  if (menu.value?.matches(':popover-open')) {menu.value.hidePopover()}
  if (countryCount.value?.matches(':popover-open')) {
    const bounds = countryCount.value.getBoundingClientRect()
    if (bounds.right > innerWidth || bounds.bottom > innerHeight) {countryCount.value.hidePopover()}
  }
}
function reset() {savingResult.value = false; generation++; runId = undefined; pendingClaim.value = undefined; claimMessage.value = ''; session.value = undefined; starting.value = false; saving.value = false; feedbackKind.value = ''; revealing.value = false; revealCountryId.value = undefined; stopDialog.value?.close(); globe.value?.reset()}
onMounted(() => {
  try {
    const saved = localStorage.getItem('atlas-player-id')
    if (isGuestId(saved)) {playerId = saved}
    localStorage.setItem('atlas-player-id', playerId)
    playerName.value = (localStorage.getItem('atlas-name') || '').slice(0, 24)
  } catch { /* A temporary guest identity works without storage. */ }
  load(); refreshRanking(); timer = setInterval(tick, 100)
  if (!native) {rankingTimer = setInterval(() => {if (!document.hidden) {refreshRanking()}}, 30000)}
  document.addEventListener('visibilitychange', tick); window.addEventListener('resize', viewportChanged)
})
onBeforeUnmount(() => { mounted = false; generation++; controller?.abort(); clearInterval(timer); clearInterval(rankingTimer); document.removeEventListener('visibilitychange', tick); window.removeEventListener('resize', viewportChanged) })
</script>
