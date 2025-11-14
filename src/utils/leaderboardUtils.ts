/**
 * Leaderboard utilities for sorting and ranking game results
 */

import type { GameResult } from '../stores/stats';

/**
 * Compares two game results for leaderboard ranking
 *
 * Tiebreaking order:
 * 1. Higher score wins (floored display score)
 * 2. If scores are equal, higher raw percentage wins (full precision)
 * 3. If raw percentages are equal, lower time wins (faster)
 *
 * @returns negative if a ranks higher, positive if b ranks higher, 0 if equal
 */
export function compareGameResults(a: GameResult, b: GameResult): number {
  // Primary: Higher score wins (floored display score)
  if (a.score !== b.score) {
    return b.score - a.score;
  }

  // First tiebreaker: Higher raw percentage wins (full precision)
  if (a.rawScorePercentage !== b.rawScorePercentage) {
    return b.rawScorePercentage - a.rawScorePercentage;
  }

  // Second tiebreaker: Lower time wins (faster)
  return a.timeInSeconds - b.timeInSeconds;
}

/**
 * Sorts game results for leaderboard display (highest rank first)
 */
export function sortLeaderboard(results: GameResult[]): GameResult[] {
  return [...results].sort(compareGameResults);
}

/**
 * Example usage:
 *
 * const results = [
 *   { score: 85, rawScorePercentage: 85.42, timeInSeconds: 120, ... },
 *   { score: 85, rawScorePercentage: 85.69, timeInSeconds: 115, ... },
 *   { score: 85, rawScorePercentage: 85.69, timeInSeconds: 110, ... },
 * ];
 *
 * const sorted = sortLeaderboard(results);
 * // Result:
 * // 1st: score=85, raw=85.69, time=110 (fastest with same raw %)
 * // 2nd: score=85, raw=85.69, time=115
 * // 3rd: score=85, raw=85.42, time=120 (lower raw %)
 */
