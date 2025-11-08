import { describe, it, expect, beforeEach } from "vitest";
import { useGameRegistry } from "./useGameRegistry";
import type { GameDefinition } from "../types/gameRegistry";

describe("useGameRegistry", () => {
  let registry: ReturnType<typeof useGameRegistry>;

  const createTestGame = (overrides: Partial<GameDefinition> = {}): GameDefinition => ({
    id: "test-game",
    name: "Test Game",
    category: "countries",
    route: "/game/test-game",
    config: {
      name: "Test Config",
      dataUrl: "https://example.com/data.geojson",
      mapCenter: [0, 0],
      zoom: 2,
      propertyName: "name",
      targetLabel: "Country",
    },
    ...overrides,
  });

  beforeEach(() => {
    registry = useGameRegistry();
  });

  describe("initialization", () => {
    it("should initialize with empty state", () => {
      expect(registry.games.value.size).toBe(0);
      expect(registry.initialized.value).toBe(false);
      expect(registry.gameCount.value).toBe(0);
    });

    it("should have empty computed properties", () => {
      expect(registry.featured.value).toEqual([]);
      expect(registry.allGames.value).toEqual([]);
      expect(registry.tags.value.size).toBe(0);
    });
  });

  describe("registerGame", () => {
    it("should register a single game", () => {
      const game = createTestGame();
      registry.registerGame(game);

      expect(registry.games.value.size).toBe(1);
      expect(registry.games.value.get("test-game")).toEqual(game);
    });

    it("should update existing game with same ID", () => {
      const game1 = createTestGame({ name: "Game 1" });
      const game2 = createTestGame({ name: "Game 2" });

      registry.registerGame(game1);
      expect(registry.games.value.get("test-game")?.name).toBe("Game 1");

      registry.registerGame(game2);
      expect(registry.games.value.get("test-game")?.name).toBe("Game 2");
      expect(registry.games.value.size).toBe(1);
    });
  });

  describe("registerGames", () => {
    it("should register multiple games", () => {
      const games = [
        createTestGame({ id: "game-1", name: "Game 1" }),
        createTestGame({ id: "game-2", name: "Game 2" }),
        createTestGame({ id: "game-3", name: "Game 3" }),
      ];

      registry.registerGames(games);

      expect(registry.games.value.size).toBe(3);
      expect(registry.initialized.value).toBe(true);
    });

    it("should handle empty array", () => {
      registry.registerGames([]);
      expect(registry.games.value.size).toBe(0);
      expect(registry.initialized.value).toBe(true);
    });
  });

  describe("getGameById", () => {
    it("should return game by ID", () => {
      const game = createTestGame({ id: "world-countries" });
      registry.registerGame(game);

      const result = registry.getGameById("world-countries");
      expect(result).toEqual(game);
    });

    it("should return undefined for non-existent ID", () => {
      const result = registry.getGameById("non-existent");
      expect(result).toBeUndefined();
    });
  });

  describe("getGamesByCategory", () => {
    beforeEach(() => {
      registry.registerGames([
        createTestGame({ id: "game-1", category: "countries" }),
        createTestGame({ id: "game-2", category: "countries" }),
        createTestGame({ id: "game-3", category: "cities" }),
        createTestGame({ id: "game-4", category: "divisions" }),
      ]);
    });

    it("should return games by category", () => {
      const countries = registry.getGamesByCategory("countries");
      expect(countries.length).toBe(2);
      expect(countries.every((g) => g.category === "countries")).toBe(true);
    });

    it("should return empty array for category with no games", () => {
      const capitals = registry.getGamesByCategory("capitals");
      expect(capitals).toEqual([]);
    });

    it("should return different arrays for different categories", () => {
      const countries = registry.getGamesByCategory("countries");
      const cities = registry.getGamesByCategory("cities");

      expect(countries.length).toBe(2);
      expect(cities.length).toBe(1);
    });
  });

  describe("getGamesByDifficulty", () => {
    beforeEach(() => {
      registry.registerGames([
        createTestGame({ id: "easy-1", difficulty: 1 }),
        createTestGame({ id: "easy-2", difficulty: 1 }),
        createTestGame({ id: "medium", difficulty: 3 }),
        createTestGame({ id: "hard", difficulty: 5 }),
        createTestGame({ id: "no-difficulty" }),
      ]);
    });

    it("should return games by difficulty", () => {
      const easy = registry.getGamesByDifficulty(1);
      expect(easy.length).toBe(2);
      expect(easy.every((g) => g.difficulty === 1)).toBe(true);
    });

    it("should return empty array for difficulty with no games", () => {
      const level4 = registry.getGamesByDifficulty(4);
      expect(level4).toEqual([]);
    });
  });

  describe("getGamesByTag", () => {
    beforeEach(() => {
      registry.registerGames([
        createTestGame({ id: "game-1", tags: ["europe", "easy"] }),
        createTestGame({ id: "game-2", tags: ["europe", "medium"] }),
        createTestGame({ id: "game-3", tags: ["asia", "easy"] }),
        createTestGame({ id: "game-4" }), // no tags
      ]);
    });

    it("should return games with specific tag", () => {
      const europeGames = registry.getGamesByTag("europe");
      expect(europeGames.length).toBe(2);
      expect(europeGames.every((g) => g.tags?.includes("europe"))).toBe(true);
    });

    it("should return empty array for non-existent tag", () => {
      const result = registry.getGamesByTag("non-existent");
      expect(result).toEqual([]);
    });

    it("should handle games without tags", () => {
      const result = registry.getGamesByTag("europe");
      expect(result.length).toBe(2);
    });
  });

  describe("searchGames", () => {
    beforeEach(() => {
      registry.registerGames([
        createTestGame({ id: "world-countries", name: "World Countries" }),
        createTestGame({ id: "us-states", name: "US States" }),
        createTestGame({ id: "world-capitals", name: "World Capitals" }),
        createTestGame({ id: "france", name: "France Departments" }),
      ]);
    });

    it("should search by partial name match", () => {
      const results = registry.searchGames("World");
      expect(results.length).toBe(2);
      expect(results.some((g) => g.name === "World Countries")).toBe(true);
      expect(results.some((g) => g.name === "World Capitals")).toBe(true);
    });

    it("should be case-insensitive", () => {
      const results = registry.searchGames("world");
      expect(results.length).toBe(2);
    });

    it("should return empty array for no matches", () => {
      const results = registry.searchGames("Nonexistent");
      expect(results).toEqual([]);
    });

    it("should return empty array for empty query", () => {
      const results = registry.searchGames("");
      expect(results).toEqual([]);
    });

    it("should trim whitespace from query", () => {
      const results = registry.searchGames("  World  ");
      expect(results.length).toBe(2);
    });
  });

  describe("searchGamesByFilters", () => {
    beforeEach(() => {
      registry.registerGames([
        createTestGame({
          id: "easy-europe",
          name: "Europe Countries",
          category: "countries",
          difficulty: 1,
          tags: ["europe", "easy"],
          featured: true,
        }),
        createTestGame({
          id: "hard-asia",
          name: "Asia Countries",
          category: "countries",
          difficulty: 5,
          tags: ["asia", "hard"],
          featured: false,
        }),
        createTestGame({
          id: "paris-districts",
          name: "Paris Districts",
          category: "cities",
          difficulty: 3,
          tags: ["europe", "france"],
          featured: true,
        }),
      ]);
    });

    it("should filter by category", () => {
      const results = registry.searchGamesByFilters({ category: "countries" });
      expect(results.length).toBe(2);
    });

    it("should filter by tag", () => {
      const results = registry.searchGamesByFilters({ tag: "europe" });
      expect(results.length).toBe(2);
    });

    it("should filter by difficulty", () => {
      const results = registry.searchGamesByFilters({ difficulty: 1 });
      expect(results.length).toBe(1);
      expect(results[0]?.id).toBe("easy-europe");
    });

    it("should filter by featured", () => {
      const results = registry.searchGamesByFilters({ featured: true });
      expect(results.length).toBe(2);
    });

    it("should filter by query", () => {
      const results = registry.searchGamesByFilters({ query: "Countries" });
      expect(results.length).toBe(2);
    });

    it("should combine multiple filters", () => {
      const results = registry.searchGamesByFilters({
        category: "countries",
        tag: "europe",
        difficulty: 1,
      });
      expect(results.length).toBe(1);
      expect(results[0]?.id).toBe("easy-europe");
    });

    it("should return all games when no filters provided", () => {
      const results = registry.searchGamesByFilters({});
      expect(results.length).toBe(3);
    });
  });

  describe("featured games", () => {
    it("should return only featured games", () => {
      registry.registerGames([
        createTestGame({ id: "game-1", featured: true }),
        createTestGame({ id: "game-2", featured: false }),
        createTestGame({ id: "game-3", featured: true }),
        createTestGame({ id: "game-4" }), // undefined
      ]);

      expect(registry.featured.value.length).toBe(2);
      expect(registry.featured.value.every((g) => g.featured === true)).toBe(true);
    });

    it("should return empty array when no games are featured", () => {
      registry.registerGame(createTestGame({ featured: false }));
      expect(registry.featured.value).toEqual([]);
    });
  });

  describe("tags", () => {
    it("should collect all unique tags", () => {
      registry.registerGames([
        createTestGame({ id: "game-1", tags: ["europe", "easy"] }),
        createTestGame({ id: "game-2", tags: ["asia", "easy"] }),
        createTestGame({ id: "game-3", tags: ["europe", "hard"] }),
      ]);

      expect(registry.tags.value.size).toBe(4);
      expect(registry.tags.value.has("europe")).toBe(true);
      expect(registry.tags.value.has("asia")).toBe(true);
      expect(registry.tags.value.has("easy")).toBe(true);
      expect(registry.tags.value.has("hard")).toBe(true);
    });

    it("should handle games without tags", () => {
      registry.registerGames([
        createTestGame({ id: "game-1", tags: ["europe"] }),
        createTestGame({ id: "game-2" }),
      ]);

      expect(registry.tags.value.size).toBe(1);
    });
  });

  describe("byCategory", () => {
    it("should group games by category", () => {
      registry.registerGames([
        createTestGame({ id: "game-1", category: "countries" }),
        createTestGame({ id: "game-2", category: "cities" }),
        createTestGame({ id: "game-3", category: "countries" }),
      ]);

      const byCategory = registry.byCategory.value;
      expect(byCategory.get("countries")?.length).toBe(2);
      expect(byCategory.get("cities")?.length).toBe(1);
      expect(byCategory.get("capitals")?.length).toBe(0);
    });
  });

  describe("getRandomGame", () => {
    it("should return a random game", () => {
      const games = [
        createTestGame({ id: "game-1" }),
        createTestGame({ id: "game-2" }),
        createTestGame({ id: "game-3" }),
      ];
      registry.registerGames(games);

      const random = registry.getRandomGame();
      expect(random).toBeDefined();
      expect(games.some((g) => g.id === random?.id)).toBe(true);
    });

    it("should return undefined when no games", () => {
      const random = registry.getRandomGame();
      expect(random).toBeUndefined();
    });
  });

  describe("getRandomGameFromCategory", () => {
    beforeEach(() => {
      registry.registerGames([
        createTestGame({ id: "country-1", category: "countries" }),
        createTestGame({ id: "country-2", category: "countries" }),
        createTestGame({ id: "city-1", category: "cities" }),
      ]);
    });

    it("should return random game from category", () => {
      const random = registry.getRandomGameFromCategory("countries");
      expect(random).toBeDefined();
      expect(random?.category).toBe("countries");
    });

    it("should return undefined for empty category", () => {
      const random = registry.getRandomGameFromCategory("capitals");
      expect(random).toBeUndefined();
    });
  });

  describe("hasGame", () => {
    it("should return true for existing game", () => {
      registry.registerGame(createTestGame({ id: "test" }));
      expect(registry.hasGame("test")).toBe(true);
    });

    it("should return false for non-existent game", () => {
      expect(registry.hasGame("non-existent")).toBe(false);
    });
  });

  describe("unregisterGame", () => {
    it("should remove game by ID", () => {
      registry.registerGame(createTestGame({ id: "test" }));
      expect(registry.games.value.size).toBe(1);

      const result = registry.unregisterGame("test");
      expect(result).toBe(true);
      expect(registry.games.value.size).toBe(0);
    });

    it("should return false for non-existent game", () => {
      const result = registry.unregisterGame("non-existent");
      expect(result).toBe(false);
    });
  });

  describe("clearRegistry", () => {
    it("should remove all games", () => {
      registry.registerGames([
        createTestGame({ id: "game-1" }),
        createTestGame({ id: "game-2" }),
      ]);

      expect(registry.games.value.size).toBe(2);
      expect(registry.initialized.value).toBe(true);

      registry.clearRegistry();

      expect(registry.games.value.size).toBe(0);
      expect(registry.initialized.value).toBe(false);
    });
  });

  describe("gameCount", () => {
    it("should return number of registered games", () => {
      expect(registry.gameCount.value).toBe(0);

      registry.registerGame(createTestGame({ id: "game-1" }));
      expect(registry.gameCount.value).toBe(1);

      registry.registerGame(createTestGame({ id: "game-2" }));
      expect(registry.gameCount.value).toBe(2);

      registry.unregisterGame("game-1");
      expect(registry.gameCount.value).toBe(1);
    });
  });

  describe("toRegistry", () => {
    it("should return GameRegistry object", () => {
      registry.registerGames([
        createTestGame({ id: "game-1", category: "countries", featured: true, tags: ["europe"] }),
      ]);

      const registryObj = registry.toRegistry();

      expect(registryObj.games).toBeInstanceOf(Map);
      expect(registryObj.byCategory).toBeInstanceOf(Map);
      expect(Array.isArray(registryObj.featured)).toBe(true);
      expect(registryObj.tags).toBeInstanceOf(Set);
    });
  });

  describe("allGames", () => {
    it("should return all games as array", () => {
      const games = [
        createTestGame({ id: "game-1" }),
        createTestGame({ id: "game-2" }),
      ];
      registry.registerGames(games);

      expect(registry.allGames.value.length).toBe(2);
      expect(Array.isArray(registry.allGames.value)).toBe(true);
    });
  });
});
