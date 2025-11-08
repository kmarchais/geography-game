import type { GameConfig } from "./game.d";

/**
 * Game category for organization and filtering
 */
export type GameCategory = "countries" | "divisions" | "cities" | "capitals" | "flags";

/**
 * Difficulty level from 1 (easiest) to 5 (hardest)
 */
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

/**
 * Game definition in the registry
 * Combines metadata with game configuration
 */
export interface GameDefinition {
  /**
   * Unique identifier (kebab-case)
   * @example "world-countries", "us-states"
   */
  id: string;

  /**
   * Display name shown to users
   * @example "World Countries", "US States"
   */
  name: string;

  /**
   * Category for organization
   */
  category: GameCategory;

  /**
   * Route path (must start with /game/)
   * @example "/game/world-countries"
   */
  route: string;

  /**
   * Optional Material Design Icon
   * @example "mdi-earth"
   */
  icon?: string;

  /**
   * Optional emoji character
   * @example "🌍"
   */
  emoji?: string;

  /**
   * Optional Vuetify color
   * @example "blue-darken-1"
   */
  color?: string;

  /**
   * Game configuration
   */
  config: GameConfig;

  /**
   * Tags for search/filtering
   * @example ["europe", "easy", "geography"]
   */
  tags?: string[];

  /**
   * Difficulty level (1-5)
   * 1 = Very Easy, 5 = Very Hard
   */
  difficulty?: DifficultyLevel;

  /**
   * Is this game featured on the homepage?
   */
  featured?: boolean;

  /**
   * Optional description for the game
   */
  description?: string;

  /**
   * Estimated completion time in minutes
   */
  estimatedTime?: number;
}

/**
 * Game registry interface
 * Central store for all game definitions
 */
export interface GameRegistry {
  /**
   * All registered games indexed by ID
   */
  games: Map<string, GameDefinition>;

  /**
   * Games grouped by category
   */
  byCategory: Map<GameCategory, GameDefinition[]>;

  /**
   * Featured games
   */
  featured: GameDefinition[];

  /**
   * All available tags
   */
  tags: Set<string>;
}

/**
 * Registry initialization options
 */
export interface RegistryOptions {
  /**
   * Enable strict validation
   */
  strictValidation?: boolean;

  /**
   * Allow duplicate IDs (will throw error if false)
   */
  allowDuplicates?: boolean;
}
