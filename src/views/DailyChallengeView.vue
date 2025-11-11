<template>
  <div class="daily-challenge-view">
    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <v-progress-circular indeterminate color="primary" size="64" />
      <p class="mt-4">Loading today's challenge...</p>
    </div>

    <!-- Challenge Content -->
    <div v-else-if="challenge" class="challenge-container">
      <!-- Challenge Header -->
      <div class="challenge-header">
        <div class="challenge-title">
          <v-icon size="large" color="amber">mdi-trophy</v-icon>
          <h1>Daily Challenge</h1>
        </div>
        <div class="challenge-date">{{ formattedDate }}</div>
        <div class="time-remaining">
          <v-icon size="small">mdi-clock-outline</v-icon>
          {{ timeRemaining }} until next challenge
        </div>
      </div>

      <!-- Progress Indicator -->
      <div v-if="!gameCompleted" class="progress-section">
        <div class="round-indicator">
          Round {{ currentRoundIndex + 1 }} of {{ challenge.totalRounds }}
        </div>
        <v-progress-linear
          :model-value="progressPercentage"
          color="primary"
          height="8"
          rounded
        />
        <div class="current-round-title">
          {{ currentRound?.title }}
        </div>
      </div>

      <!-- Round 1: Territory (Find 10 Countries) -->
      <div
        v-if="currentRoundIndex === 0 && currentRound?.type === 'territory'"
        class="round-content"
      >
        <MapGame
          v-if="worldCountriesGameConfig"
          :key="`round-0-${gameResetKey}`"
          v-bind="worldCountriesGameConfig"
          :total-rounds-override="currentRound.count"
          :predefined-entity-order="currentRound.entities"
          @game-ended="onRoundCompleted"
        />
      </div>

      <!-- Round 2: Flags (Identify 5 Flags) -->
      <div
        v-else-if="currentRoundIndex === 1 && currentRound?.type === 'flag'"
        class="round-content"
      >
        <FlagGame
          :key="`round-1-${gameResetKey}`"
          :predefined-countries="predefinedFlagCountries"
          @game-ended="onRoundCompleted"
        />
      </div>

      <!-- Round 3: Capitals (Name 5 Capitals) -->
      <div
        v-else-if="currentRoundIndex === 2 && currentRound?.type === 'capital'"
        class="round-content"
      >
        <CapitalGame
          :key="`round-2-${gameResetKey}`"
          :predefined-capitals="predefinedCapitals"
          :total-rounds-override="currentRound.count"
          :map-options="{
            initialCenter: [20, 0],
            initialZoom: 2,
            minZoom: 1,
            maxZoom: 18,
            worldCopyJump: true,
          }"
          @game-ended="onRoundCompleted"
        />
      </div>

      <!-- Final Results -->
      <div v-if="gameCompleted" class="results-container">
        <div class="results-header">
          <v-icon size="64" color="success">mdi-check-circle</v-icon>
          <h2>Challenge Complete!</h2>
        </div>

        <div class="total-score">
          <div class="score-label">Total Score</div>
          <div class="score-value">{{ totalScore }} points</div>
        </div>

        <div class="round-breakdown">
          <h3>Round Breakdown</h3>
          <v-card
            v-for="(result, index) in roundResults"
            :key="index"
            class="round-result-card"
            variant="outlined"
          >
            <v-card-title>
              <v-icon class="mr-2">{{ getRoundIcon(result.type) }}</v-icon>
              {{ getRoundTitle(result.type) }}
            </v-card-title>
            <v-card-text>
              <div class="result-row">
                <span>Score:</span>
                <strong>{{ result.score }} points</strong>
              </div>
              <div class="result-row">
                <span>Time:</span>
                <strong>{{ formatTime(result.timeInSeconds) }}</strong>
              </div>
            </v-card-text>
          </v-card>
        </div>

        <div class="stats-section">
          <v-card variant="outlined">
            <v-card-title>Your Stats</v-card-title>
            <v-card-text>
              <div class="stat-row">
                <span>🔥 Current Streak:</span>
                <strong>{{ currentStreak }} days</strong>
              </div>
              <div class="stat-row">
                <span>🏆 Best Score:</span>
                <strong>{{ bestScore }} points</strong>
              </div>
              <div class="stat-row">
                <span>📊 Today's Best:</span>
                <strong>{{ bestTodayScore }} points</strong>
              </div>
            </v-card-text>
          </v-card>
        </div>

        <div class="action-buttons">
          <v-btn
            color="primary"
            size="large"
            @click="playAgain"
          >
            <v-icon class="mr-2">mdi-refresh</v-icon>
            Play Again
          </v-btn>
          <v-btn
            variant="outlined"
            size="large"
            @click="goHome"
          >
            <v-icon class="mr-2">mdi-home</v-icon>
            Back to Home
          </v-btn>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else class="error-container">
      <v-icon size="64" color="error">mdi-alert-circle</v-icon>
      <p class="mt-4">Failed to load daily challenge</p>
      <v-btn color="primary" @click="loadChallenge">Retry</v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDailyChallengeStore } from '../stores/dailyChallenge'
import type { DailyChallenge, ChallengeRound, ChallengeRoundResult } from '../types/dailyChallenge'
import {
  formatChallengeDate,
  getTimeUntilNextChallenge,
  formatTimeRemaining,
} from '../utils/challengeGenerator'
import MapGame from '../components/MapGame.vue'
import FlagGame from '../components/FlagGame.vue'
import CapitalGame from '../components/CapitalGame.vue'
import { worldCountriesConfig } from '../utils/worldCountriesConfig'
import { worldCapitals } from '../utils/capitalCitiesData'
import type { Country } from '../composables/useFlagGameLogic'
import type { Capital } from '../composables/useCapitalGameLogic'

const router = useRouter()
const challengeStore = useDailyChallengeStore()

const loading = ref(true)
const challenge = ref<DailyChallenge | null>(null)
const currentRoundIndex = ref(0)
const roundResults = ref<ChallengeRoundResult[]>([])
const gameCompleted = ref(false)
const gameResetKey = ref(0) // Force re-render of game components
const timeRemaining = ref('')
const timeUpdateInterval = ref<number | null>(null)

// Round start time for tracking
const roundStartTime = ref<number>(0)

// Computed
const currentRound = computed(() => {
  if (!challenge.value || currentRoundIndex.value >= challenge.value.rounds.length) {
    return null
  }
  return challenge.value.rounds[currentRoundIndex.value]
})

const progressPercentage = computed(() => {
  if (!challenge.value) return 0
  return (currentRoundIndex.value / challenge.value.totalRounds) * 100
})

const formattedDate = computed(() => {
  if (!challenge.value) return ''
  return formatChallengeDate(challenge.value.date)
})

const totalScore = computed(() => {
  return roundResults.value.reduce((sum, result) => sum + result.score, 0)
})

const currentStreak = computed(() => challengeStore.currentStreakDisplay)
const bestScore = computed(() => challengeStore.stats.bestScore)
const bestTodayScore = computed(() => challengeStore.bestTodayScore)

// World countries config for Round 1
const worldCountriesGameConfig = computed(() => {
  if (!currentRound.value || currentRound.value.type !== 'territory') return null

  const config = worldCountriesConfig

  return {
    entityNameSingular: config.targetLabel || 'Country',
    entityNamePlural: config.targetLabel ? `${config.targetLabel}s` : 'Countries',
    geojsonUrl: config.dataUrl,
    geojsonNameProperty: config.propertyName,
    processors: config.processors as ("worldWrapping" | "filterEurope" | "filterAsia" | "filterAfrica" | "filterNorthAmerica" | "filterSouthAmerica" | "filterOceania" | "filterCanada" | "filterBrazil" | "filterAustralia")[] | undefined,
    mapOptions: {
      initialCenter: config.mapCenter as [number, number],
      initialZoom: config.zoom,
      maxBounds: config.maxBounds,
      worldCopyJump: true,
    },
    gameId: 'daily-challenge-round-1',
    gameName: 'Daily Challenge - Countries',
  }
})

// Predefined flag countries for Round 2
const predefinedFlagCountries = computed<Country[]>(() => {
  if (!currentRound.value || currentRound.value.type !== 'flag') return []

  // Map country names to flag data
  return currentRound.value.entities
    .map((countryName) => {
      // Get country code (simplified - in real app would use a lookup table)
      const code = getCountryCode(countryName)
      return {
        name: countryName,
        code: code,
        flag: `https://flagcdn.com/w320/${code.toLowerCase()}.png`,
      }
    })
    .filter((c): c is Country => c !== null)
})

// Predefined capitals for Round 3
const predefinedCapitals = computed<Capital[]>(() => {
  if (!currentRound.value || currentRound.value.type !== 'capital') return []

  // Map country names to capital data
  return currentRound.value.entities
    .map((countryName) => {
      const capitalData = worldCapitals.find((c) => c.country === countryName)
      if (!capitalData) {
        console.warn(`No capital data found for ${countryName}`)
        return null
      }
      return {
        name: capitalData.name,
        country: capitalData.country,
        location: capitalData.location as [number, number],
      }
    })
    .filter((c): c is Capital => c !== null)
})

// Functions
function loadChallenge() {
  loading.value = true
  try {
    challenge.value = challengeStore.loadTodaysChallenge()
    challengeStore.startChallenge()
    currentRoundIndex.value = 0
    roundResults.value = []
    gameCompleted.value = false
    gameResetKey.value++
    roundStartTime.value = Date.now()
  } catch (error) {
    console.error('Failed to load challenge:', error)
    challenge.value = null
  } finally {
    loading.value = false
  }
}

function onRoundCompleted(gameData: { score: number; time: number }) {
  if (!currentRound.value) return

  const timeInSeconds = Math.floor((Date.now() - roundStartTime.value) / 1000)

  const result: ChallengeRoundResult = {
    roundIndex: currentRoundIndex.value,
    type: currentRound.value.type,
    score: gameData.score,
    timeInSeconds,
    completed: true,
  }

  challengeStore.recordRoundResult(result)
  roundResults.value.push(result)

  // Move to next round or finish
  if (currentRoundIndex.value < (challenge.value?.totalRounds ?? 0) - 1) {
    currentRoundIndex.value++
    gameResetKey.value++
    roundStartTime.value = Date.now()
  } else {
    // Challenge completed
    gameCompleted.value = true
    challengeStore.finishChallenge()
  }
}

function playAgain() {
  loadChallenge()
}

function goHome() {
  router.push('/')
}

function getRoundIcon(type: string): string {
  switch (type) {
    case 'territory':
      return 'mdi-map'
    case 'flag':
      return 'mdi-flag'
    case 'capital':
      return 'mdi-city'
    default:
      return 'mdi-help'
  }
}

function getRoundTitle(type: string): string {
  switch (type) {
    case 'territory':
      return 'Find Countries'
    case 'flag':
      return 'Identify Flags'
    case 'capital':
      return 'Name Capitals'
    default:
      return 'Unknown'
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function updateTimeRemaining() {
  const ms = getTimeUntilNextChallenge()
  timeRemaining.value = formatTimeRemaining(ms)
}

// Simplified country code lookup (in production, use a proper mapping)
function getCountryCode(countryName: string): string {
  const codeMap: Record<string, string> = {
    'United States of America': 'US',
    'United Kingdom': 'GB',
    'France': 'FR',
    'Germany': 'DE',
    'Italy': 'IT',
    'Spain': 'ES',
    'Canada': 'CA',
    'Australia': 'AU',
    'Brazil': 'BR',
    'China': 'CN',
    'Japan': 'JP',
    'India': 'IN',
    'Mexico': 'MX',
    'Russia': 'RU',
    'South Korea': 'KR',
    'Indonesia': 'ID',
    'Turkey': 'TR',
    'Saudi Arabia': 'SA',
    'Argentina': 'AR',
    'Poland': 'PL',
    'Netherlands': 'NL',
    'Belgium': 'BE',
    'Sweden': 'SE',
    'Norway': 'NO',
    'Denmark': 'DK',
    'Finland': 'FI',
    'Austria': 'AT',
    'Switzerland': 'CH',
    'Portugal': 'PT',
    'Greece': 'GR',
    // Add more mappings as needed
  }
  return codeMap[countryName] || 'XX'
}

// Lifecycle
onMounted(() => {
  loadChallenge()
  updateTimeRemaining()
  timeUpdateInterval.value = setInterval(updateTimeRemaining, 60000) as unknown as number // Update every minute
})

onUnmounted(() => {
  if (timeUpdateInterval.value !== null) {
    clearInterval(timeUpdateInterval.value)
  }
})
</script>

<style scoped>
.daily-challenge-view {
  min-height: 100vh;
  padding: 20px;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  text-align: center;
}

.challenge-container {
  max-width: 1200px;
  margin: 0 auto;
}

.challenge-header {
  text-align: center;
  margin-bottom: 30px;
}

.challenge-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 8px;
}

.challenge-title h1 {
  font-size: 2rem;
  font-weight: 700;
}

.challenge-date {
  font-size: 1.1rem;
  opacity: 0.8;
  margin-bottom: 4px;
}

.time-remaining {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 0.9rem;
  opacity: 0.7;
}

.progress-section {
  margin-bottom: 30px;
}

.round-indicator {
  text-align: center;
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 1.1rem;
}

.current-round-title {
  text-align: center;
  font-size: 1.3rem;
  font-weight: 700;
  margin-top: 12px;
  color: var(--v-theme-primary);
}

.round-content {
  margin-bottom: 20px;
}

.results-container {
  max-width: 800px;
  margin: 0 auto;
}

.results-header {
  text-align: center;
  margin-bottom: 30px;
}

.results-header h2 {
  margin-top: 16px;
  font-size: 2rem;
  font-weight: 700;
}

.total-score {
  text-align: center;
  padding: 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  margin-bottom: 30px;
  color: white;
}

.score-label {
  font-size: 1.1rem;
  opacity: 0.9;
  margin-bottom: 8px;
}

.score-value {
  font-size: 3rem;
  font-weight: 700;
}

.round-breakdown {
  margin-bottom: 30px;
}

.round-breakdown h3 {
  margin-bottom: 16px;
  font-size: 1.4rem;
  font-weight: 600;
}

.round-result-card {
  margin-bottom: 12px;
}

.result-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.stats-section {
  margin-bottom: 30px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.stat-row:last-child {
  border-bottom: none;
}

.action-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

@media (max-width: 600px) {
  .challenge-title h1 {
    font-size: 1.5rem;
  }

  .score-value {
    font-size: 2rem;
  }

  .action-buttons {
    flex-direction: column;
  }

  .action-buttons .v-btn {
    width: 100%;
  }
}
</style>
