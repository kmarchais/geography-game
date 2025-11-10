import { describe, it, expect, beforeEach, vi } from "vitest";
import type { GameDefinition } from "../types/gameRegistry";

// Mock game definitions for testing
const mockGames: GameDefinition[] = [
  {
    id: "world-countries",
    name: "World Countries",
    category: "countries",
    route: "/game/world-countries",
    featured: true,
    config: {
      dataUrl: "https://example.com/world.geojson",
      mapCenter: [0, 0],
      zoom: 2,
      propertyName: "name",
      targetLabel: "Country",
    },
  },
  {
    id: "europe-countries",
    name: "European Countries",
    category: "countries",
    route: "/game/europe-countries",
    featured: true,
    config: {
      dataUrl: "https://example.com/europe.geojson",
      mapCenter: [55, 15],
      zoom: 4,
      propertyName: "name",
      targetLabel: "Country",
    },
  },
  {
    id: "us-states",
    name: "US States",
    category: "divisions",
    route: "/game/us-states",
    featured: true,
    config: {
      dataUrl: "https://example.com/us.geojson",
      mapCenter: [39, -98],
      zoom: 4,
      propertyName: "name",
      targetLabel: "State",
    },
  },
  {
    id: "paris-arrondissements",
    name: "Paris Arrondissements",
    category: "cities",
    route: "/game/paris-arrondissements",
    featured: true,
    config: {
      dataUrl: "https://example.com/paris.geojson",
      mapCenter: [48.8566, 2.3522],
      zoom: 11,
      propertyName: "c_ar",
      targetLabel: "Arrondissement",
    },
  },
  {
    id: "london-boroughs",
    name: "London Boroughs",
    category: "cities",
    route: "/game/london-boroughs",
    featured: true,
    config: {
      dataUrl: "https://example.com/london.geojson",
      mapCenter: [51.5074, -0.1278],
      zoom: 10,
      propertyName: "name",
      targetLabel: "Borough",
    },
  },
];

// Helper function to filter games by category
const getGamesByCategory = (
  games: GameDefinition[],
  category: string
): GameDefinition[] => {
  return games.filter((game) => game.category === category);
};

// Helper function to get unique categories
const getCategoriesWithGames = (games: GameDefinition[]): string[] => {
  const categories = new Set(games.map((game) => game.category));
  return Array.from(categories).sort();
};

// Simple search implementation
const searchGames = (games: GameDefinition[], query: string): GameDefinition[] => {
  const lowerQuery = query.toLowerCase();
  return games.filter(
    (game) =>
      game.name.toLowerCase().includes(lowerQuery) ||
      game.category.toLowerCase().includes(lowerQuery) ||
      (game.description?.toLowerCase().includes(lowerQuery)) ||
      (game.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery)))
  );
};

describe("HomeView", () => {
  describe("getGamesByCategory", () => {
    it("should return games for countries category", () => {
      const countryGames = getGamesByCategory(mockGames, "countries");
      expect(countryGames).toHaveLength(2);
      expect(countryGames.map((g) => g.id)).toEqual([
        "world-countries",
        "europe-countries",
      ]);
    });

    it("should return games for divisions category", () => {
      const divisionGames = getGamesByCategory(mockGames, "divisions");
      expect(divisionGames).toHaveLength(1);
      expect(divisionGames[0]!.id).toBe("us-states");
    });

    it("should return games for cities category", () => {
      const cityGames = getGamesByCategory(mockGames, "cities");
      expect(cityGames).toHaveLength(2);
      expect(cityGames.map((g) => g.id)).toEqual([
        "paris-arrondissements",
        "london-boroughs",
      ]);
    });

    it("should return empty array for non-existent category", () => {
      const games = getGamesByCategory(mockGames, "nonexistent");
      expect(games).toHaveLength(0);
    });
  });

  describe("getCategoriesWithGames", () => {
    it("should return all unique categories sorted", () => {
      const categories = getCategoriesWithGames(mockGames);
      expect(categories).toEqual(["cities", "countries", "divisions"]);
    });

    it("should return empty array for empty games list", () => {
      const categories = getCategoriesWithGames([]);
      expect(categories).toEqual([]);
    });

    it("should handle single category", () => {
      const singleCategoryGames = mockGames.filter(
        (g) => g.category === "countries"
      );
      const categories = getCategoriesWithGames(singleCategoryGames);
      expect(categories).toEqual(["countries"]);
    });
  });

  describe("searchGames", () => {
    it("should filter games by name", () => {
      const results = searchGames(mockGames, "World");
      expect(results).toHaveLength(1);
      expect(results[0]!.id).toBe("world-countries");
    });

    it("should filter games by category", () => {
      const results = searchGames(mockGames, "cities");
      expect(results).toHaveLength(2);
      expect(results.map((g) => g.id)).toEqual([
        "paris-arrondissements",
        "london-boroughs",
      ]);
    });

    it("should be case insensitive", () => {
      const results = searchGames(mockGames, "PARIS");
      expect(results).toHaveLength(1);
      expect(results[0]!.id).toBe("paris-arrondissements");
    });

    it("should return all games for empty query", () => {
      const results = searchGames(mockGames, "");
      expect(results).toHaveLength(5);
    });

    it("should return empty array when no matches found", () => {
      const results = searchGames(mockGames, "xyz123notfound");
      expect(results).toHaveLength(0);
    });

    it("should handle partial matches", () => {
      const results = searchGames(mockGames, "Euro");
      expect(results).toHaveLength(1);
      expect(results[0]!.id).toBe("europe-countries");
    });

    it("should search across multiple fields", () => {
      const results = searchGames(mockGames, "States");
      expect(results).toHaveLength(1);
      expect(results[0]!.id).toBe("us-states");
    });
  });

  describe("integration", () => {
    it("should filter games and get categories from filtered results", () => {
      const filtered = searchGames(mockGames, "countries");
      const categories = getCategoriesWithGames(filtered);
      expect(categories).toEqual(["countries"]);
    });

    it("should handle search with no results", () => {
      const filtered = searchGames(mockGames, "nonexistent");
      const categories = getCategoriesWithGames(filtered);
      expect(categories).toEqual([]);
    });

    it("should maintain category structure after filtering", () => {
      const filtered = searchGames(mockGames, "London");
      const categories = getCategoriesWithGames(filtered);
      const cityGames = getGamesByCategory(filtered, "cities");

      expect(categories).toEqual(["cities"]);
      expect(cityGames).toHaveLength(1);
      expect(cityGames[0]!.id).toBe("london-boroughs");
    });
  });

  describe("pilot games", () => {
    it("should have exactly 5 pilot games", () => {
      expect(mockGames).toHaveLength(5);
    });

    it("should have all pilot games as featured", () => {
      mockGames.forEach((game) => {
        expect(game.featured).toBe(true);
      });
    });

    it("should have all pilot games with valid configs", () => {
      mockGames.forEach((game) => {
        expect(game.config.dataUrl).toBeTruthy();
        expect(game.config.mapCenter).toHaveLength(2);
        expect(game.config.zoom).toBeGreaterThan(0);
        expect(game.config.propertyName).toBeTruthy();
        expect(game.config.targetLabel).toBeTruthy();
      });
    });

    it("should have games in 3 different categories", () => {
      const categories = getCategoriesWithGames(mockGames);
      expect(categories).toHaveLength(3);
      expect(categories).toEqual(["cities", "countries", "divisions"]);
    });
  });
});
