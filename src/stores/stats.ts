/**
 * User Stats Store
 * Tracks game statistics, progress, and historical performance
 * Persists to localStorage for local tracking (can be synced to backend later)
 */

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { z } from 'zod'
import { useAuthStore } from './auth'

// LocalStorage key
const STATS_KEY = 'app_userStats'

// Zod schemas for validation
const GameResultSchema = z.object({
  gameId: z.string().regex(/^[a-z0-9-]+$/, 'Invalid game ID format'),
  gameName: z.string().min(1).max(200),
  score: z.number().int().min(0).max(100),
  totalRounds: z.number().int().min(1).max(1000),
  correctAnswers: z.number().int().min(0).max(1000),
  timeInSeconds: z.number().int().min(0).max(86400), // Max 24 hours
  timestamp: z.number().int().positive(),
  accuracy: z.number().min(0).max(100),
  rawScorePercentage: z.number().min(0).max(100).optional(), // Optional for migration from old data
})

const GameStatsSchema = z.object({
  gameId: z.string().regex(/^[a-z0-9-]+$/),
  gameName: z.string().min(1).max(200),
  timesPlayed: z.number().int().nonnegative(),
  bestScore: z.number().min(0).max(100),
  bestTime: z.number().nonnegative(),
  averageScore: z.number().min(0).max(100),
  averageTime: z.number().nonnegative(),
  totalCorrect: z.number().int().nonnegative(),
  totalRounds: z.number().int().nonnegative(),
  lastPlayed: z.number().int().nonnegative(),
  highestAccuracy: z.number().min(0).max(100),
})

const UserStatsSchema = z.object({
  totalGamesPlayed: z.number().int().nonnegative(),
  totalScore: z.number().nonnegative(),
  totalTimeSeconds: z.number().nonnegative(),
  gamesCompleted: z.array(z.string().regex(/^[a-z0-9-]+$/)),
  gameStats: z.record(z.string(), GameStatsSchema),
  recentGames: z.array(GameResultSchema).max(20),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
})

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
  rawScorePercentage: number // Exact percentage for leaderboard tiebreaking (with full precision)
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
    if (stats.value.totalGamesPlayed === 0) {return 0}
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
        const parsed = JSON.parse(storedStats)

        // Validate data with Zod schema
        const validated = UserStatsSchema.parse(parsed)

        // MIGRATION: Add rawScorePercentage to old game results
        // This ensures backward compatibility with data created before weighted scoring
        if (validated.recentGames) {
          validated.recentGames = validated.recentGames.map(result => {
            // If rawScorePercentage is missing, use the score as fallback
            // This maintains existing display scores while allowing future tiebreaking
            if (result.rawScorePercentage === undefined) {
              return { ...result, rawScorePercentage: result.score } as GameResult
            }
            return result as GameResult
          })
        }

        stats.value = validated as UserStats
      } catch (e) {
        if (e instanceof z.ZodError) {
          console.error('Invalid stats data in localStorage, resetting:', e.issues)
        } else if (e instanceof SyntaxError) {
          console.error('Corrupted stats data in localStorage, resetting:', e.message)
        } else {
          console.error('Error loading stored user stats, resetting:', e)
        }
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
  function recordGameResult(inputResult: GameResult) {
    const authStore = useAuthStore()

    if (!authStore.isLoggedIn) {
      if (import.meta.env.DEV) {
        console.warn('Cannot record game result: user not logged in')
      }
      return
    }

    // MIGRATION: Ensure rawScorePercentage exists for backward compatibility
    // Create immutable copy to avoid mutating input
    const result: GameResult = {
      ...inputResult,
      rawScorePercentage: inputResult.rawScorePercentage ?? inputResult.score
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

  }

  function resetStats() {
    const authStore = useAuthStore()

    if (!authStore.isLoggedIn || !authStore.userProfile) {
      if (import.meta.env.DEV) {
        console.warn('Cannot reset stats: user not logged in')
      }
      return
    }

    const userId = authStore.userProfile.id
    const storageKey = `${STATS_KEY}_${userId}`

    clearStats()
    localStorage.removeItem(storageKey)
  }

  function exportStats(): string {
    return JSON.stringify(stats.value, null, 2)
  }

  function importStats(jsonData: string): boolean {
    try {
      const parsed = JSON.parse(jsonData)

      // Validate with Zod schema
      const validated = UserStatsSchema.parse(parsed)

      // Apply migration to ensure rawScorePercentage exists
      if (validated.recentGames) {
        validated.recentGames = validated.recentGames.map(result => {
          if (result.rawScorePercentage === undefined) {
            return { ...result, rawScorePercentage: result.score } as GameResult
          }
          return result as GameResult
        })
      }

      stats.value = validated as UserStats
      return true
    } catch (e) {
      if (e instanceof z.ZodError) {
        console.error('Invalid stats data format:', e.issues)
      } else if (e instanceof SyntaxError) {
        console.error('Invalid JSON format:', e.message)
      } else {
        console.error('Error importing stats:', e)
      }
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
