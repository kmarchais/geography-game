/**
 * Tests for leaderboard utilities
 */

import { describe, it, expect } from 'vitest'
import { compareGameResults, sortLeaderboard } from './leaderboardUtils'
import type { GameResult } from '../stores/stats'

describe('Leaderboard Utils', () => {
  const createResult = (score: number, rawScorePercentage: number, timeInSeconds: number): GameResult => ({
    gameId: 'test-game',
    gameName: 'Test Game',
    score,
    totalRounds: 10,
    correctAnswers: score,
    timeInSeconds,
    timestamp: Date.now(),
    accuracy: score,
    rawScorePercentage,
  })

  describe('compareGameResults', () => {
    it('should rank higher score first', () => {
      const a = createResult(85, 85.0, 120)
      const b = createResult(90, 90.0, 120)

      expect(compareGameResults(a, b)).toBeGreaterThan(0) // b ranks higher
      expect(compareGameResults(b, a)).toBeLessThan(0) // a ranks lower
    })

    it('should use raw percentage as first tiebreaker', () => {
      const a = createResult(85, 85.42, 120)
      const b = createResult(85, 85.69, 120)

      expect(compareGameResults(a, b)).toBeGreaterThan(0) // b ranks higher (85.69 > 85.42)
      expect(compareGameResults(b, a)).toBeLessThan(0)
    })

    it('should use time as second tiebreaker', () => {
      const a = createResult(85, 85.69, 120)
      const b = createResult(85, 85.69, 110)

      expect(compareGameResults(a, b)).toBeGreaterThan(0) // b ranks higher (faster)
      expect(compareGameResults(b, a)).toBeLessThan(0)
    })

    it('should return 0 for identical results', () => {
      const a = createResult(85, 85.42, 120)
      const b = createResult(85, 85.42, 120)

      expect(compareGameResults(a, b)).toBe(0)
    })

    it('should handle edge case with score 0', () => {
      const a = createResult(0, 0.0, 120)
      const b = createResult(0, 0.0, 110)

      expect(compareGameResults(a, b)).toBeGreaterThan(0) // b ranks higher (faster)
    })

    it('should handle edge case with score 100', () => {
      const a = createResult(100, 100.0, 120)
      const b = createResult(100, 100.0, 110)

      expect(compareGameResults(a, b)).toBeGreaterThan(0) // b ranks higher (faster)
    })
  })

  describe('sortLeaderboard', () => {
    it('should sort by score descending', () => {
      const results = [
        createResult(70, 70.0, 120),
        createResult(90, 90.0, 120),
        createResult(80, 80.0, 120),
      ]

      const sorted = sortLeaderboard(results)

      expect(sorted[0]?.score).toBe(90)
      expect(sorted[1]?.score).toBe(80)
      expect(sorted[2]?.score).toBe(70)
    })

    it('should break ties with raw percentage', () => {
      const results = [
        createResult(85, 85.42, 120),
        createResult(85, 85.69, 115),
        createResult(85, 85.10, 130),
      ]

      const sorted = sortLeaderboard(results)

      expect(sorted[0]?.rawScorePercentage).toBe(85.69)
      expect(sorted[1]?.rawScorePercentage).toBe(85.42)
      expect(sorted[2]?.rawScorePercentage).toBe(85.10)
    })

    it('should break ties with time when raw percentages equal', () => {
      const results = [
        createResult(85, 85.69, 120),
        createResult(85, 85.69, 110),
        createResult(85, 85.69, 115),
      ]

      const sorted = sortLeaderboard(results)

      expect(sorted[0]?.timeInSeconds).toBe(110)
      expect(sorted[1]?.timeInSeconds).toBe(115)
      expect(sorted[2]?.timeInSeconds).toBe(120)
    })

    it('should not mutate original array', () => {
      const results = [
        createResult(70, 70.0, 120),
        createResult(90, 90.0, 120),
        createResult(80, 80.0, 120),
      ]

      const originalFirst = results[0]
      sortLeaderboard(results)

      expect(results[0]).toBe(originalFirst) // Original array unchanged
    })

    it('should handle empty array', () => {
      const results: GameResult[] = []
      const sorted = sortLeaderboard(results)

      expect(sorted).toEqual([])
    })
  })
})
