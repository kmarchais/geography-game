/**
 * Tests for stats store
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useStatsStore, type GameResult } from './stats'
import { useAuthStore } from './auth'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} }
  }
})()

// Mock localStorage on global object
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true
})

describe('Stats Store', () => {
  beforeEach(() => {
    // Create a new pinia instance for each test
    setActivePinia(createPinia())
    // Clear localStorage
    localStorageMock.clear()
    // Mock a logged-in user
    const authStore = useAuthStore()
    authStore.isLoggedIn = true
    authStore.userProfile = {
      id: 123,
      email: 'test@example.com',
      name: 'Test User'
    }
  })

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      const store = useStatsStore()
      expect(store.totalGamesPlayed).toBe(0)
      expect(store.totalScore).toBe(0)
      expect(store.averageScore).toBe(0)
      expect(store.gamesCompleted).toBe(0)
      expect(store.recentGames).toEqual([])
    })

    it('should load stats from localStorage if available', () => {
      const mockStats = {
        totalGamesPlayed: 5,
        totalScore: 400,
        totalTimeSeconds: 600,
        gamesCompleted: ['game1', 'game2'],
        gameStats: {},
        recentGames: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      localStorageMock.setItem('app_userStats_123', JSON.stringify(mockStats))

      const store = useStatsStore()
      expect(store.totalGamesPlayed).toBe(5)
      expect(store.totalScore).toBe(400)
    })

    it('should migrate old game results without rawScorePercentage', () => {
      const mockResult: Partial<GameResult> = {
        gameId: 'test-game',
        gameName: 'Test Game',
        score: 85,
        totalRounds: 10,
        correctAnswers: 8,
        timeInSeconds: 120,
        timestamp: Date.now(),
        accuracy: 85
        // rawScorePercentage is missing (old data)
      }

      const mockStats = {
        totalGamesPlayed: 1,
        totalScore: 85,
        totalTimeSeconds: 120,
        gamesCompleted: ['test-game'],
        gameStats: {},
        recentGames: [mockResult],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      localStorageMock.setItem('app_userStats_123', JSON.stringify(mockStats))

      const store = useStatsStore()
      const firstGame = store.recentGames[0]

      // Should have migrated rawScorePercentage
      expect(firstGame).toBeDefined()
      expect(firstGame?.rawScorePercentage).toBe(85)
    })

    it('should not break if localStorage has invalid JSON', () => {
      localStorageMock.setItem('app_userStats_123', 'invalid json')

      const store = useStatsStore()
      // Should clear stats and not crash
      expect(store.totalGamesPlayed).toBe(0)
    })
  })

  describe('Recording Game Results', () => {
    it('should record a game result correctly', () => {
      const store = useStatsStore()
      const result: GameResult = {
        gameId: 'world-countries',
        gameName: 'World Countries',
        score: 94,
        totalRounds: 10,
        correctAnswers: 9,
        timeInSeconds: 180,
        timestamp: Date.now(),
        accuracy: 94,
        rawScorePercentage: 94.44
      }

      store.recordGameResult(result)

      expect(store.totalGamesPlayed).toBe(1)
      expect(store.totalScore).toBe(94)
      expect(store.gamesCompleted).toBe(1)
      expect(store.recentGames).toHaveLength(1)
    })

    it('should update game-specific stats', () => {
      const store = useStatsStore()
      const result: GameResult = {
        gameId: 'world-countries',
        gameName: 'World Countries',
        score: 85,
        totalRounds: 10,
        correctAnswers: 8,
        timeInSeconds: 120,
        timestamp: Date.now(),
        accuracy: 85,
        rawScorePercentage: 85.42
      }

      store.recordGameResult(result)

      const gameStats = store.getGameStats('world-countries')
      expect(gameStats).toBeDefined()
      expect(gameStats?.timesPlayed).toBe(1)
      expect(gameStats?.bestScore).toBe(85)
      expect(gameStats?.averageScore).toBe(85)
    })

    it('should calculate averages correctly after multiple plays', () => {
      const store = useStatsStore()

      // First play: 80 points
      store.recordGameResult({
        gameId: 'test-game',
        gameName: 'Test',
        score: 80,
        totalRounds: 10,
        correctAnswers: 8,
        timeInSeconds: 100,
        timestamp: Date.now(),
        accuracy: 80,
        rawScorePercentage: 80.0
      })

      // Second play: 90 points
      store.recordGameResult({
        gameId: 'test-game',
        gameName: 'Test',
        score: 90,
        totalRounds: 10,
        correctAnswers: 9,
        timeInSeconds: 90,
        timestamp: Date.now(),
        accuracy: 90,
        rawScorePercentage: 90.0
      })

      const gameStats = store.getGameStats('test-game')
      expect(gameStats?.averageScore).toBe(85) // (80 + 90) / 2
      expect(gameStats?.bestScore).toBe(90)
      expect(gameStats?.bestTime).toBe(90) // Fastest time
    })

    it('should limit recent games to 20 entries', () => {
      const store = useStatsStore()

      // Record 25 games
      for (let i = 0; i < 25; i++) {
        store.recordGameResult({
          gameId: `game-${i}`,
          gameName: `Game ${i}`,
          score: 80,
          totalRounds: 10,
          correctAnswers: 8,
          timeInSeconds: 100,
          timestamp: Date.now() + i,
          accuracy: 80,
          rawScorePercentage: 80.0
        })
      }

      // Should only keep the 20 most recent
      expect(store.recentGames).toHaveLength(20)
      // Most recent should be game-24
      expect(store.recentGames[0]?.gameId).toBe('game-24')
    })

    it('should not record if user is not logged in', () => {
      const authStore = useAuthStore()
      authStore.isLoggedIn = false

      const store = useStatsStore()
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      store.recordGameResult({
        gameId: 'test',
        gameName: 'Test',
        score: 80,
        totalRounds: 10,
        correctAnswers: 8,
        timeInSeconds: 100,
        timestamp: Date.now(),
        accuracy: 80,
        rawScorePercentage: 80.0
      })

      expect(store.totalGamesPlayed).toBe(0)
      expect(consoleWarnSpy).toHaveBeenCalled()
      consoleWarnSpy.mockRestore()
    })
  })

  describe('Computed Properties', () => {
    it('should calculate average score correctly', () => {
      const store = useStatsStore()

      store.recordGameResult({
        gameId: 'game1',
        gameName: 'Game 1',
        score: 80,
        totalRounds: 10,
        correctAnswers: 8,
        timeInSeconds: 100,
        timestamp: Date.now(),
        accuracy: 80,
        rawScorePercentage: 80.0
      })

      store.recordGameResult({
        gameId: 'game2',
        gameName: 'Game 2',
        score: 90,
        totalRounds: 10,
        correctAnswers: 9,
        timeInSeconds: 100,
        timestamp: Date.now(),
        accuracy: 90,
        rawScorePercentage: 90.0
      })

      expect(store.averageScore).toBe(85) // (80 + 90) / 2
    })

    it('should return 0 average score when no games played', () => {
      const store = useStatsStore()
      expect(store.averageScore).toBe(0)
    })

    it('should return top 5 games by play count', () => {
      const store = useStatsStore()

      // Play different games different number of times
      for (let i = 0; i < 10; i++) {
        store.recordGameResult({
          gameId: 'popular-game',
          gameName: 'Popular',
          score: 80,
          totalRounds: 10,
          correctAnswers: 8,
          timeInSeconds: 100,
          timestamp: Date.now(),
          accuracy: 80,
          rawScorePercentage: 80.0
        })
      }

      for (let i = 0; i < 5; i++) {
        store.recordGameResult({
          gameId: 'medium-game',
          gameName: 'Medium',
          score: 80,
          totalRounds: 10,
          correctAnswers: 8,
          timeInSeconds: 100,
          timestamp: Date.now(),
          accuracy: 80,
          rawScorePercentage: 80.0
        })
      }

      const topGames = store.topGames
      expect(topGames[0]?.gameId).toBe('popular-game')
      expect(topGames[0]?.timesPlayed).toBe(10)
    })
  })

  describe('Import/Export', () => {
    it('should export stats as JSON string', () => {
      const store = useStatsStore()

      store.recordGameResult({
        gameId: 'test',
        gameName: 'Test',
        score: 80,
        totalRounds: 10,
        correctAnswers: 8,
        timeInSeconds: 100,
        timestamp: Date.now(),
        accuracy: 80,
        rawScorePercentage: 80.0
      })

      const exported = store.exportStats()
      const parsed = JSON.parse(exported)

      expect(parsed.totalGamesPlayed).toBe(1)
      expect(parsed.totalScore).toBe(80)
    })

    it('should import stats from JSON string', () => {
      const store = useStatsStore()

      const mockData = {
        totalGamesPlayed: 5,
        totalScore: 400,
        totalTimeSeconds: 500,
        gamesCompleted: ['game1'],
        gameStats: {},
        recentGames: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      const result = store.importStats(JSON.stringify(mockData))

      expect(result).toBe(true)
      expect(store.totalGamesPlayed).toBe(5)
      expect(store.totalScore).toBe(400)
    })

    it('should return false for invalid JSON on import', () => {
      const store = useStatsStore()
      const result = store.importStats('invalid json')
      expect(result).toBe(false)
    })
  })

  describe('Reset', () => {
    it('should reset all stats', () => {
      const store = useStatsStore()

      store.recordGameResult({
        gameId: 'test',
        gameName: 'Test',
        score: 80,
        totalRounds: 10,
        correctAnswers: 8,
        timeInSeconds: 100,
        timestamp: Date.now(),
        accuracy: 80,
        rawScorePercentage: 80.0
      })

      store.resetStats()

      expect(store.totalGamesPlayed).toBe(0)
      expect(store.totalScore).toBe(0)
      expect(store.recentGames).toHaveLength(0)
    })
  })
})
