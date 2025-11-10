/**
 * User Stats Store
 * Tracks game statistics, progress, and historical performance
 * Persists to localStorage for local tracking (can be synced to backend later)
 */

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useAuthStore } from './auth'
import type { DifficultyMode } from '../types/difficulty'

// LocalStorage key
const STATS_KEY = 'app_userStats'

// Interfaces
export interface GameResult {
  gameId: string
  gameName: string
  score: number
  totalRounds: number
  correctAnswers: number
  timeInSeconds: number
  timestamp: number // Unix timestamp
  accuracy: number // Percentage (0-100)
  rawScorePercentage?: number // Exact percentage for leaderboard tiebreaking (with full precision)
  difficulty?: DifficultyMode // Difficulty mode used (easy/medium/hard)
  baseScore?: number // Score before difficulty multiplier (for comparison)
}

export interface GameStats {
  gameId: string
  gameName: string
  timesPlayed: number
  bestScore: number
  bestTime: number
  averageScore: number
  averageTime: number
  totalCorrect: number
  totalRounds: number
  lastPlayed: number // Unix timestamp
  highestAccuracy: number
  // Difficulty-specific best scores
  bestScoreEasy?: number
  bestScoreMedium?: number
  bestScoreHard?: number
  // Track plays per difficulty
  playsEasy?: number
  playsMedium?: number
  playsHard?: number
}

export interface UserStats {
  totalGamesPlayed: number
  totalScore: number
  totalTimeSeconds: number
  gamesCompleted: string[] // List of unique game IDs completed
  gameStats: Record<string, GameStats> // Keyed by gameId
  recentGames: GameResult[] // Last 20 games
  createdAt: number // Unix timestamp
  updatedAt: number // Unix timestamp
}

export const useStatsStore = defineStore('stats', () => {
  // State
  const stats = ref<UserStats>({
    totalGamesPlayed: 0,
    totalScore: 0,
    totalTimeSeconds: 0,
    gamesCompleted: [],
    gameStats: {},
    recentGames: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })

  // Computed
  const totalGamesPlayed = computed(() => stats.value.totalGamesPlayed)
  const totalScore = computed(() => stats.value.totalScore)
  const averageScore = computed(() => {
    if (stats.value.totalGamesPlayed === 0) return 0
    return Math.round(stats.value.totalScore / stats.value.totalGamesPlayed)
  })
  const gamesCompleted = computed(() => stats.value.gamesCompleted.length)
  const recentGames = computed(() => stats.value.recentGames)

  const getGameStats = computed(() => {
    return (gameId: string): GameStats | undefined => {
      return stats.value.gameStats[gameId]
    }
  })

  const topGames = computed(() => {
    return Object.values(stats.value.gameStats)
      .sort((a, b) => b.timesPlayed - a.timesPlayed)
      .slice(0, 5)
  })

  const bestPerformances = computed(() => {
    return Object.values(stats.value.gameStats)
      .sort((a, b) => b.bestScore - a.bestScore)
      .slice(0, 5)
  })

  // Initialize from localStorage
  function initializeFromStorage() {
    const authStore = useAuthStore()

    // Only load stats if user is logged in
    if (!authStore.isLoggedIn || !authStore.userProfile) {
      return
    }

    // Stats are per-user (keyed by user ID)
    const userId = authStore.userProfile.id
    const storageKey = `${STATS_KEY}_${userId}`
    const storedStats = localStorage.getItem(storageKey)

    if (storedStats) {
      try {
        const parsed = JSON.parse(storedStats) as UserStats
        stats.value = parsed
        console.log('User stats loaded from localStorage')
      } catch (e) {
        console.error('Error parsing stored user stats:', e)
        clearStats()
      }
    }
  }

  // Save to localStorage
  function saveToStorage() {
    const authStore = useAuthStore()

    if (!authStore.isLoggedIn || !authStore.userProfile) {
      return
    }

    const userId = authStore.userProfile.id
    const storageKey = `${STATS_KEY}_${userId}`
    localStorage.setItem(storageKey, JSON.stringify(stats.value))
  }

  // Clear stats (for logout or reset)
  function clearStats() {
    stats.value = {
      totalGamesPlayed: 0,
      totalScore: 0,
      totalTimeSeconds: 0,
      gamesCompleted: [],
      gameStats: {},
      recentGames: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  }

  // Watch for changes and auto-save
  watch(
    stats,
    () => {
      stats.value.updatedAt = Date.now()
      saveToStorage()
    },
    { deep: true }
  )

  // Actions
  function recordGameResult(result: GameResult) {
    const authStore = useAuthStore()

    if (!authStore.isLoggedIn) {
      console.warn('Cannot record game result: user not logged in')
      return
    }

    // Update total stats
    stats.value.totalGamesPlayed += 1
    stats.value.totalScore += result.score
    stats.value.totalTimeSeconds += result.timeInSeconds

    // Add to completed games if not already there
    if (!stats.value.gamesCompleted.includes(result.gameId)) {
      stats.value.gamesCompleted.push(result.gameId)
    }

    // Update game-specific stats
    const gameId = result.gameId
    if (!stats.value.gameStats[gameId]) {
      stats.value.gameStats[gameId] = {
        gameId: result.gameId,
        gameName: result.gameName,
        timesPlayed: 0,
        bestScore: 0,
        bestTime: Infinity,
        averageScore: 0,
        averageTime: 0,
        totalCorrect: 0,
        totalRounds: 0,
        lastPlayed: 0,
        highestAccuracy: 0,
      }
    }

    const gameStats = stats.value.gameStats[gameId]
    gameStats.timesPlayed += 1
    gameStats.bestScore = Math.max(gameStats.bestScore, result.score)
    gameStats.bestTime = Math.min(gameStats.bestTime, result.timeInSeconds)
    gameStats.totalCorrect += result.correctAnswers
    gameStats.totalRounds += result.totalRounds
    gameStats.lastPlayed = result.timestamp
    gameStats.highestAccuracy = Math.max(gameStats.highestAccuracy, result.accuracy)

    // Track difficulty-specific stats
    if (result.difficulty) {
      const diffKey = `plays${result.difficulty.charAt(0).toUpperCase()}${result.difficulty.slice(1)}` as keyof GameStats
      const scoreKey = `bestScore${result.difficulty.charAt(0).toUpperCase()}${result.difficulty.slice(1)}` as keyof GameStats

      // Increment plays for this difficulty
      const currentPlays = (gameStats[diffKey] as number) || 0
      ;(gameStats[diffKey] as number) = currentPlays + 1

      // Update best score for this difficulty
      const currentBest = (gameStats[scoreKey] as number) || 0
      ;(gameStats[scoreKey] as number) = Math.max(currentBest, result.score)
    }

    // Calculate new averages
    gameStats.averageScore = Math.round(
      (gameStats.averageScore * (gameStats.timesPlayed - 1) + result.score) / gameStats.timesPlayed
    )
    gameStats.averageTime = Math.round(
      (gameStats.averageTime * (gameStats.timesPlayed - 1) + result.timeInSeconds) / gameStats.timesPlayed
    )

    // Add to recent games (keep last 20)
    stats.value.recentGames.unshift(result)
    if (stats.value.recentGames.length > 20) {
      stats.value.recentGames = stats.value.recentGames.slice(0, 20)
    }

    console.log(`Game result recorded for ${result.gameName}`)
  }

  function resetStats() {
    const authStore = useAuthStore()

    if (!authStore.isLoggedIn || !authStore.userProfile) {
      console.warn('Cannot reset stats: user not logged in')
      return
    }

    const userId = authStore.userProfile.id
    const storageKey = `${STATS_KEY}_${userId}`

    clearStats()
    localStorage.removeItem(storageKey)
    console.log('User stats reset')
  }

  function exportStats(): string {
    return JSON.stringify(stats.value, null, 2)
  }

  function importStats(jsonData: string): boolean {
    try {
      const imported = JSON.parse(jsonData) as UserStats
      stats.value = imported
      console.log('Stats imported successfully')
      return true
    } catch (e) {
      console.error('Error importing stats:', e)
      return false
    }
  }

  // Initialize on store creation
  initializeFromStorage()

  return {
    // State
    stats,
    // Computed
    totalGamesPlayed,
    totalScore,
    averageScore,
    gamesCompleted,
    recentGames,
    getGameStats,
    topGames,
    bestPerformances,
    // Actions
    recordGameResult,
    resetStats,
    exportStats,
    importStats,
    initializeFromStorage,
    clearStats,
  }
})
