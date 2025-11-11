/**
 * Daily Challenge System Types
 *
 * The daily challenge is a fixed-format quiz with 3 rounds:
 * 1. Find 10 countries on the world map
 * 2. Identify 5 country flags
 * 3. Name 5 capital cities
 *
 * All players worldwide get the same challenge each day (seeded by date).
 */

export type ChallengeRoundType = 'territory' | 'flag' | 'capital'

/**
 * A single round in the daily challenge
 */
export interface ChallengeRound {
  /**
   * Type of challenge
   */
  type: ChallengeRoundType

  /**
   * Display title for the round
   */
  title: string

  /**
   * Ordered list of entities to find/identify
   * For territory: country names
   * For flag: country names
   * For capital: country names
   */
  entities: string[]

  /**
   * Number of entities in this round
   */
  count: number
}

/**
 * Complete daily challenge definition
 */
export interface DailyChallenge {
  /**
   * Date string in YYYYMMDD format
   */
  date: string

  /**
   * Seed used for generation
   */
  seed: number

  /**
   * All rounds in order
   */
  rounds: ChallengeRound[]

  /**
   * Total number of rounds
   */
  totalRounds: number
}

/**
 * User's attempt at a daily challenge
 */
export interface ChallengeAttempt {
  /**
   * Date of the challenge (YYYYMMDD)
   */
  date: string

  /**
   * Timestamp when attempt was made
   */
  timestamp: number

  /**
   * Scores for each round
   */
  roundScores: number[]

  /**
   * Total score across all rounds
   */
  totalScore: number

  /**
   * Time taken in seconds
   */
  timeInSeconds: number

  /**
   * Whether all rounds were completed
   */
  completed: boolean
}

/**
 * User's daily challenge statistics
 */
export interface DailyChallengeStats {
  /**
   * Current streak (consecutive days played)
   */
  currentStreak: number

  /**
   * Longest streak ever achieved
   */
  longestStreak: number

  /**
   * Last date played (YYYYMMDD)
   */
  lastPlayedDate: string | null

  /**
   * Total challenges completed
   */
  totalChallengesCompleted: number

  /**
   * Best total score ever
   */
  bestScore: number

  /**
   * Average score across all attempts
   */
  averageScore: number

  /**
   * All attempts history (most recent first)
   */
  attempts: ChallengeAttempt[]
}

/**
 * Daily challenge round result
 */
export interface ChallengeRoundResult {
  /**
   * Round index (0-based)
   */
  roundIndex: number

  /**
   * Round type
   */
  type: ChallengeRoundType

  /**
   * Score achieved in this round
   */
  score: number

  /**
   * Time taken in seconds
   */
  timeInSeconds: number

  /**
   * Whether the round was completed
   */
  completed: boolean
}
