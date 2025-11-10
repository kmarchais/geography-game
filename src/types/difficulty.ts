/**
 * Game Difficulty System
 *
 * This system provides gameplay difficulty modes (easy/medium/hard) that affect:
 * - Time limits per round
 * - Score multipliers
 * - Timer behavior
 *
 * This is separate from the inherent game difficulty rating (1-5 stars)
 * which indicates how challenging a game's content is.
 */

/**
 * Gameplay difficulty mode
 * - easy: Generous time limits, lower score multiplier
 * - medium: Standard time limits, standard scoring (default)
 * - hard: Strict time limits, higher score multiplier
 */
export type DifficultyMode = 'easy' | 'medium' | 'hard'

/**
 * Configuration for a specific difficulty mode
 */
export interface DifficultyConfig {
  /**
   * Display label for the difficulty
   */
  label: string

  /**
   * Description of what makes this difficulty different
   */
  description: string

  /**
   * Time limit per round in seconds
   * Defaults: easy=45s, medium=30s, hard=20s
   */
  timePerRound: number

  /**
   * Score multiplier applied to final score
   * Defaults: easy=0.8, medium=1.0, hard=1.5
   */
  scoreMultiplier: number

  /**
   * Icon for UI display
   */
  icon: string

  /**
   * Color for UI display (Vuetify color)
   */
  color: string

  /**
   * Whether time pressure is enabled
   * If false, no timer countdown (practice mode)
   */
  timedMode: boolean
}

/**
 * Default difficulty configurations
 */
export const DIFFICULTY_CONFIGS: Record<DifficultyMode, DifficultyConfig> = {
  easy: {
    label: 'Easy',
    description: 'Generous time limits, perfect for learning',
    timePerRound: 45,
    scoreMultiplier: 0.8,
    icon: 'mdi-emoticon-happy-outline',
    color: 'green',
    timedMode: true,
  },
  medium: {
    label: 'Medium',
    description: 'Standard difficulty, balanced challenge',
    timePerRound: 30,
    scoreMultiplier: 1.0,
    icon: 'mdi-emoticon-neutral-outline',
    color: 'blue',
    timedMode: true,
  },
  hard: {
    label: 'Hard',
    description: 'Strict time limits, maximum points',
    timePerRound: 20,
    scoreMultiplier: 1.5,
    icon: 'mdi-emoticon-cool-outline',
    color: 'deep-orange',
    timedMode: true,
  },
}

/**
 * Practice mode - no time limit, no score multiplier
 */
export const PRACTICE_MODE_CONFIG: DifficultyConfig = {
  label: 'Practice',
  description: 'No time limit, learn at your own pace',
  timePerRound: 0, // No limit
  scoreMultiplier: 0.5, // Reduced score for practice
  icon: 'mdi-school-outline',
  color: 'grey',
  timedMode: false,
}

/**
 * Get difficulty config by mode
 */
export function getDifficultyConfig(mode: DifficultyMode): DifficultyConfig {
  return DIFFICULTY_CONFIGS[mode]
}

/**
 * Get all available difficulty modes
 */
export function getAllDifficultyModes(): DifficultyMode[] {
  return Object.keys(DIFFICULTY_CONFIGS) as DifficultyMode[]
}

/**
 * Calculate final score with difficulty multiplier
 */
export function calculateDifficultyScore(
  baseScore: number,
  mode: DifficultyMode
): number {
  const config = getDifficultyConfig(mode)
  return Math.round(baseScore * config.scoreMultiplier)
}

/**
 * Get time limit for a round based on difficulty
 */
export function getTimeLimit(mode: DifficultyMode): number {
  const config = getDifficultyConfig(mode)
  return config.timePerRound
}

/**
 * Check if difficulty mode has time pressure
 */
export function isTimedMode(mode: DifficultyMode): boolean {
  const config = getDifficultyConfig(mode)
  return config.timedMode
}
