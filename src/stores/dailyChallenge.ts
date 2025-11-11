/**
 * Daily Challenge Store
 *
 * Manages daily challenge attempts, streaks, and statistics.
 * All data is stored in localStorage for persistence.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  DailyChallenge,
  ChallengeAttempt,
  DailyChallengeStats,
  ChallengeRoundResult,
} from '../types/dailyChallenge'
import {
  generateTodaysChallenge,
  isSameDay,
  isConsecutiveDay,
  getTodayDateString,
} from '../utils/challengeGenerator'

const STORAGE_KEY = 'dailyChallengeStats'

/**
 * Load stats from localStorage
 */
function loadStats(): DailyChallengeStats {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Failed to load daily challenge stats:', error)
  }

  // Return default stats
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastPlayedDate: null,
    totalChallengesCompleted: 0,
    bestScore: 0,
    averageScore: 0,
    attempts: [],
  }
}

/**
 * Save stats to localStorage
 */
function saveStats(stats: DailyChallengeStats): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats))
  } catch (error) {
    console.error('Failed to save daily challenge stats:', error)
  }
}

export const useDailyChallengeStore = defineStore('dailyChallenge', () => {
  // State
  const stats = ref<DailyChallengeStats>(loadStats())
  const currentChallenge = ref<DailyChallenge | null>(null)
  const currentRoundResults = ref<ChallengeRoundResult[]>([])
  const currentRoundIndex = ref(0)
  const challengeStartTime = ref<number | null>(null)

  // Computed
  const todayAttempts = computed(() => {
    const today = getTodayDateString()
    return stats.value.attempts.filter((attempt) => attempt.date === today)
  })

  const bestTodayScore = computed(() => {
    if (todayAttempts.value.length === 0) return 0
    return Math.max(...todayAttempts.value.map((a) => a.totalScore))
  })

  const hasPlayedToday = computed(() => {
    return todayAttempts.value.length > 0
  })

  const currentStreakDisplay = computed(() => {
    return stats.value.currentStreak
  })

  const longestStreakDisplay = computed(() => {
    return stats.value.longestStreak
  })

  // Actions
  function loadTodaysChallenge(): DailyChallenge {
    currentChallenge.value = generateTodaysChallenge()
    return currentChallenge.value
  }

  function startChallenge(): void {
    currentRoundResults.value = []
    currentRoundIndex.value = 0
    challengeStartTime.value = Date.now()
    loadTodaysChallenge()
  }

  function recordRoundResult(result: ChallengeRoundResult): void {
    currentRoundResults.value.push(result)
    currentRoundIndex.value++
  }

  function finishChallenge(): ChallengeAttempt {
    if (!currentChallenge.value || challengeStartTime.value === null) {
      throw new Error('No active challenge')
    }

    const totalScore = currentRoundResults.value.reduce((sum, r) => sum + r.score, 0)
    const timeInSeconds = Math.floor((Date.now() - challengeStartTime.value) / 1000)
    const completed = currentRoundResults.value.length === currentChallenge.value.totalRounds

    const attempt: ChallengeAttempt = {
      date: currentChallenge.value.date,
      timestamp: Date.now(),
      roundScores: currentRoundResults.value.map((r) => r.score),
      totalScore,
      timeInSeconds,
      completed,
    }

    // Record the attempt
    recordAttempt(attempt)

    // Reset current challenge state
    currentChallenge.value = null
    currentRoundResults.value = []
    currentRoundIndex.value = 0
    challengeStartTime.value = null

    return attempt
  }

  function recordAttempt(attempt: ChallengeAttempt): void {
    const today = getTodayDateString()

    // Add attempt to history (keep most recent 100)
    stats.value.attempts.unshift(attempt)
    if (stats.value.attempts.length > 100) {
      stats.value.attempts = stats.value.attempts.slice(0, 100)
    }

    // Update total challenges completed (only count first completion of the day)
    const isFirstTodayAttempt = !stats.value.attempts.some(
      (a, index) => index > 0 && a.date === today && a.completed
    )
    if (attempt.completed && isFirstTodayAttempt) {
      stats.value.totalChallengesCompleted++
    }

    // Update streak (only on first completion of the day)
    if (attempt.completed && isFirstTodayAttempt) {
      updateStreak(today)
    }

    // Update best score
    if (attempt.totalScore > stats.value.bestScore) {
      stats.value.bestScore = attempt.totalScore
    }

    // Update average score
    const completedAttempts = stats.value.attempts.filter((a) => a.completed)
    if (completedAttempts.length > 0) {
      const sum = completedAttempts.reduce((total, a) => total + a.totalScore, 0)
      stats.value.averageScore = Math.round(sum / completedAttempts.length)
    }

    // Update last played date
    stats.value.lastPlayedDate = today

    // Save to localStorage
    saveStats(stats.value)
  }

  function updateStreak(today: string): void {
    const lastPlayed = stats.value.lastPlayedDate

    if (!lastPlayed) {
      // First time playing
      stats.value.currentStreak = 1
      stats.value.longestStreak = 1
    } else if (isSameDay(lastPlayed, today)) {
      // Already played today, streak stays the same
      // (this shouldn't happen due to isFirstTodayAttempt check)
      return
    } else if (isConsecutiveDay(lastPlayed, today)) {
      // Consecutive day - increment streak
      stats.value.currentStreak++
      if (stats.value.currentStreak > stats.value.longestStreak) {
        stats.value.longestStreak = stats.value.currentStreak
      }
    } else {
      // Streak broken - reset to 1
      stats.value.currentStreak = 1
    }
  }

  function getTodayAttempts(): ChallengeAttempt[] {
    return todayAttempts.value
  }

  function getAttemptHistory(limit = 10): ChallengeAttempt[] {
    return stats.value.attempts.slice(0, limit)
  }

  function resetStats(): void {
    stats.value = {
      currentStreak: 0,
      longestStreak: 0,
      lastPlayedDate: null,
      totalChallengesCompleted: 0,
      bestScore: 0,
      averageScore: 0,
      attempts: [],
    }
    saveStats(stats.value)
  }

  return {
    // State
    stats,
    currentChallenge,
    currentRoundResults,
    currentRoundIndex,

    // Computed
    todayAttempts,
    bestTodayScore,
    hasPlayedToday,
    currentStreakDisplay,
    longestStreakDisplay,

    // Actions
    loadTodaysChallenge,
    startChallenge,
    recordRoundResult,
    finishChallenge,
    getTodayAttempts,
    getAttemptHistory,
    resetStats,
  }
})
