import { ref, computed, type Ref } from "vue";
import type {
  GameDefinition,
  GameCategory,
  GameRegistry,
} from "../types/gameRegistry";

/**
 * Game registry composable for managing and accessing game definitions
 * Provides centralized access to all registered games with filtering and search
 */
export function useGameRegistry() {
  // Internal registry state
  const games = ref<Map<string, GameDefinition>>(new Map());
  const initialized = ref(false);

  /**
   * Games grouped by category
   */
  const byCategory = computed<Map<GameCategory, GameDefinition[]>>(() => {
    const categorized = new Map<GameCategory, GameDefinition[]>();
    const categories: GameCategory[] = ["countries", "divisions", "cities", "capitals", "flags"];

    categories.forEach((category) => {
      categorized.set(category, []);
    });

    games.value.forEach((game) => {
      const categoryGames = categorized.get(game.category);
      if (categoryGames) {
        categoryGames.push(game);
      }
    });

    return categorized;
  });

  /**
   * Featured games
   */
  const featured = computed<GameDefinition[]>(() => {
    return Array.from(games.value.values()).filter((game) => game.featured === true);
  });

  /**
   * All unique tags across all games
   */
  const tags = computed<Set<string>>(() => {
    const allTags = new Set<string>();
    games.value.forEach((game) => {
      game.tags?.forEach((tag) => allTags.add(tag));
    });
    return allTags;
  });

  /**
   * All games as an array
   */
  const allGames = computed<GameDefinition[]>(() => {
    return Array.from(games.value.values());
  });

  /**
   * Games by difficulty level
   */
  const byDifficulty = computed<Map<number, GameDefinition[]>>(() => {
    const difficultyMap = new Map<number, GameDefinition[]>();
    [1, 2, 3, 4, 5].forEach((level) => {
      difficultyMap.set(level, []);
    });

    games.value.forEach((game) => {
      if (game.difficulty) {
        const levelGames = difficultyMap.get(game.difficulty);
        if (levelGames) {
          levelGames.push(game);
        }
      }
    });

    return difficultyMap;
  });

  /**
   * Register a single game
   */
  function registerGame(game: GameDefinition): void {
    games.value.set(game.id, game);
  }

  /**
   * Register multiple games
   */
  function registerGames(gameList: GameDefinition[]): void {
    gameList.forEach((game) => registerGame(game));
    initialized.value = true;
  }

  /**
   * Get a game by ID
   */
  function getGameById(id: string): GameDefinition | undefined {
    return games.value.get(id);
  }

  /**
   * Get games by category
   */
  function getGamesByCategory(category: GameCategory): GameDefinition[] {
    return byCategory.value.get(category) || [];
  }

  /**
   * Get games by difficulty level
   */
  function getGamesByDifficulty(difficulty: number): GameDefinition[] {
    return byDifficulty.value.get(difficulty) || [];
  }

  /**
   * Get games by tag
   */
  function getGamesByTag(tag: string): GameDefinition[] {
    return Array.from(games.value.values()).filter((game) =>
      game.tags?.includes(tag)
    );
  }

  /**
   * Search games by name (case-insensitive partial match)
   */
  function searchGames(query: string): GameDefinition[] {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) {
      return [];
    }

    return Array.from(games.value.values()).filter((game) =>
      game.name.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Search games by multiple criteria
   */
  function searchGamesByFilters(filters: {
    category?: GameCategory;
    tag?: string;
    difficulty?: number;
    featured?: boolean;
    query?: string;
  }): GameDefinition[] {
    let results = Array.from(games.value.values());

    if (filters.category) {
      results = results.filter((game) => game.category === filters.category);
    }

    if (filters.tag) {
      results = results.filter((game) => game.tags?.includes(filters.tag!));
    }

    if (filters.difficulty !== undefined) {
      results = results.filter((game) => game.difficulty === filters.difficulty);
    }

    if (filters.featured !== undefined) {
      results = results.filter((game) => game.featured === filters.featured);
    }

    if (filters.query) {
      const lowerQuery = filters.query.toLowerCase().trim();
      results = results.filter((game) =>
        game.name.toLowerCase().includes(lowerQuery)
      );
    }

    return results;
  }

  /**
   * Get random game
   */
  function getRandomGame(): GameDefinition | undefined {
    const gameArray = Array.from(games.value.values());
    if (gameArray.length === 0) {
      return undefined;
    }
    const randomIndex = Math.floor(Math.random() * gameArray.length);
    return gameArray[randomIndex];
  }

  /**
   * Get random game from category
   */
  function getRandomGameFromCategory(category: GameCategory): GameDefinition | undefined {
    const categoryGames = getGamesByCategory(category);
    if (categoryGames.length === 0) {
      return undefined;
    }
    const randomIndex = Math.floor(Math.random() * categoryGames.length);
    return categoryGames[randomIndex];
  }

  /**
   * Check if a game exists by ID
   */
  function hasGame(id: string): boolean {
    return games.value.has(id);
  }

  /**
   * Unregister a game by ID
   */
  function unregisterGame(id: string): boolean {
    return games.value.delete(id);
  }

  /**
   * Clear all registered games
   */
  function clearRegistry(): void {
    games.value.clear();
    initialized.value = false;
  }

  /**
   * Get game count
   */
  const gameCount = computed<number>(() => games.value.size);

  /**
   * Get registry as a standard object (for serialization/debugging)
   */
  function toRegistry(): GameRegistry {
    return {
      games: new Map(games.value),
      byCategory: new Map(byCategory.value),
      featured: [...featured.value],
      tags: new Set(tags.value),
    };
  }

  return {
    // State
    games: games as Ref<ReadonlyMap<string, GameDefinition>>,
    initialized,

    // Computed
    byCategory,
    featured,
    tags,
    allGames,
    byDifficulty,
    gameCount,

    // Methods - Registration
    registerGame,
    registerGames,
    unregisterGame,
    clearRegistry,

    // Methods - Retrieval
    getGameById,
    getGamesByCategory,
    getGamesByDifficulty,
    getGamesByTag,
    searchGames,
    searchGamesByFilters,
    getRandomGame,
    getRandomGameFromCategory,
    hasGame,

    // Utility
    toRegistry,
  };
}
