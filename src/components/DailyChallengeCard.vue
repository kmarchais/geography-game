<template>
  <v-card
    class="daily-challenge-card"
    :class="{ 'completed': hasPlayedToday }"
    elevation="4"
  >
    <div class="card-gradient" />

    <v-card-text class="card-content">
      <div class="trophy-icon">
        <v-icon size="48" :color="hasPlayedToday ? 'success' : 'amber'">
          {{ hasPlayedToday ? 'mdi-check-circle' : 'mdi-trophy' }}
        </v-icon>
      </div>

      <div class="challenge-info">
        <h2 class="challenge-title">Daily Challenge</h2>
        <p class="challenge-subtitle">{{ formattedDate }}</p>

        <div class="challenge-description">
          <div class="round-item">
            <v-icon size="small" class="mr-1">mdi-map</v-icon>
            <span>Find 10 countries</span>
          </div>
          <div class="round-item">
            <v-icon size="small" class="mr-1">mdi-flag</v-icon>
            <span>Identify 5 flags</span>
          </div>
          <div class="round-item">
            <v-icon size="small" class="mr-1">mdi-city</v-icon>
            <span>Name 5 capitals</span>
          </div>
        </div>

        <div v-if="hasPlayedToday" class="today-stats">
          <div class="stat-badge">
            <span class="stat-label">Best Today:</span>
            <span class="stat-value">{{ bestTodayScore }} pts</span>
          </div>
          <div class="stat-badge">
            <span class="stat-label">Attempts:</span>
            <span class="stat-value">{{ todayAttempts }}</span>
          </div>
        </div>

        <div class="streak-info">
          <v-icon size="small" color="deep-orange">mdi-fire</v-icon>
          <span>{{ currentStreak }} day streak</span>
        </div>

        <div class="time-info">
          <v-icon size="small">mdi-clock-outline</v-icon>
          <span>{{ timeRemaining }} remaining</span>
        </div>
      </div>

      <div class="action-section">
        <v-btn
          :color="hasPlayedToday ? 'success' : 'primary'"
          size="large"
          block
          @click="startChallenge"
        >
          {{ hasPlayedToday ? 'Play Again' : 'Start Challenge' }}
          <v-icon class="ml-2">mdi-arrow-right</v-icon>
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDailyChallengeStore } from '../stores/dailyChallenge'
import {
  formatChallengeDate,
  getTimeUntilNextChallenge,
  formatTimeRemaining,
  getTodayDateString,
} from '../utils/challengeGenerator'

const router = useRouter()
const challengeStore = useDailyChallengeStore()

const timeRemaining = ref('')
const timeUpdateInterval = ref<number | null>(null)

// Computed
const hasPlayedToday = computed(() => challengeStore.hasPlayedToday)
const bestTodayScore = computed(() => challengeStore.bestTodayScore)
const todayAttempts = computed(() => challengeStore.todayAttempts.length)
const currentStreak = computed(() => challengeStore.currentStreakDisplay)

const formattedDate = computed(() => {
  return formatChallengeDate(getTodayDateString())
})

// Functions
function startChallenge() {
  router.push('/daily-challenge')
}

function updateTimeRemaining() {
  const ms = getTimeUntilNextChallenge()
  timeRemaining.value = formatTimeRemaining(ms)
}

// Lifecycle
onMounted(() => {
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
.daily-challenge-card {
  position: relative;
  overflow: hidden;
  border-radius: 16px !important;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.daily-challenge-card.completed {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
}

.card-gradient {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0.1;
  background: radial-gradient(circle at top right, white 0%, transparent 60%);
}

.card-content {
  position: relative;
  color: white !important;
  padding: 24px !important;
}

.trophy-icon {
  text-align: center;
  margin-bottom: 16px;
}

.challenge-info {
  text-align: center;
}

.challenge-title {
  font-size: 1.8rem;
  font-weight: 700;
  margin-bottom: 4px;
  color: white !important;
}

.challenge-subtitle {
  font-size: 1rem;
  opacity: 0.9;
  margin-bottom: 20px;
}

.challenge-description {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.round-item {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  font-weight: 500;
}

.today-stats {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 16px;
}

.stat-badge {
  display: flex;
  flex-direction: column;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  backdrop-filter: blur(10px);
}

.stat-label {
  font-size: 0.75rem;
  opacity: 0.9;
  margin-bottom: 2px;
}

.stat-value {
  font-size: 1.1rem;
  font-weight: 700;
}

.streak-info,
.time-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 0.9rem;
  opacity: 0.9;
  margin-top: 12px;
}

.streak-info {
  font-weight: 600;
}

.action-section {
  margin-top: 24px;
}

.action-section .v-btn {
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0.5px;
}

@media (max-width: 600px) {
  .challenge-title {
    font-size: 1.5rem;
  }

  .today-stats {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
