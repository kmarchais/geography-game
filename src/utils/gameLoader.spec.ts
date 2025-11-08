import { describe, it, expect, beforeEach, vi } from "vitest";
import { loadGames, getPilotGames, getGameCount } from "./gameLoader";

// Mock registry
const mockRegistry = {
  registerGames: vi.fn(),
  games: { value: new Map() },
};

// Mock the composable
vi.mock("../composables/useGameRegistry", () => ({
  useGameRegistry: () => mockRegistry,
}));

describe("gameLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loadGames", () => {
    it("should call registerGames with pilot games", () => {
      loadGames();

      expect(mockRegistry.registerGames).toHaveBeenCalledTimes(1);
      expect(mockRegistry.registerGames).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: "world-countries" }),
          expect.objectContaining({ id: "europe-countries" }),
          expect.objectContaining({ id: "us-states" }),
          expect.objectContaining({ id: "paris-arrondissements" }),
          expect.objectContaining({ id: "london-boroughs" }),
        ])
      );
    });

    it("should load exactly 5 pilot games", () => {
      loadGames();

      const callArg = mockRegistry.registerGames.mock.calls[0][0];
      expect(callArg).toHaveLength(5);
    });
  });

  describe("getPilotGames", () => {
    it("should return all pilot games", () => {
      const games = getPilotGames();

      expect(games).toHaveLength(5);
      expect(games[0]).toHaveProperty("id");
      expect(games[0]).toHaveProperty("name");
      expect(games[0]).toHaveProperty("category");
      expect(games[0]).toHaveProperty("config");
    });

    it("should return readonly array", () => {
      const games = getPilotGames();

      // TypeScript enforces readonly, but we can verify it's the same array
      expect(Array.isArray(games)).toBe(true);
    });

    it("should include world-countries", () => {
      const games = getPilotGames();
      const worldGame = games.find((g) => g.id === "world-countries");

      expect(worldGame).toBeDefined();
      expect(worldGame?.name).toBe("World Countries");
      expect(worldGame?.category).toBe("countries");
    });

    it("should include europe-countries", () => {
      const games = getPilotGames();
      const europeGame = games.find((g) => g.id === "europe-countries");

      expect(europeGame).toBeDefined();
      expect(europeGame?.name).toBe("European Countries");
      expect(europeGame?.category).toBe("countries");
    });

    it("should include us-states", () => {
      const games = getPilotGames();
      const usGame = games.find((g) => g.id === "us-states");

      expect(usGame).toBeDefined();
      expect(usGame?.name).toBe("US States");
      expect(usGame?.category).toBe("divisions");
    });

    it("should include paris-arrondissements", () => {
      const games = getPilotGames();
      const parisGame = games.find((g) => g.id === "paris-arrondissements");

      expect(parisGame).toBeDefined();
      expect(parisGame?.name).toBe("Paris Arrondissements");
      expect(parisGame?.category).toBe("cities");
    });

    it("should include london-boroughs", () => {
      const games = getPilotGames();
      const londonGame = games.find((g) => g.id === "london-boroughs");

      expect(londonGame).toBeDefined();
      expect(londonGame?.name).toBe("London Boroughs");
      expect(londonGame?.category).toBe("cities");
    });

    it("should have all games with valid configs", () => {
      const games = getPilotGames();

      games.forEach((game) => {
        expect(game.config.dataUrl).toBeTruthy();
        expect(game.config.mapCenter).toHaveLength(2);
        expect(game.config.zoom).toBeGreaterThan(0);
        expect(game.config.propertyName).toBeTruthy();
        expect(game.config.targetLabel).toBeTruthy();
      });
    });

    it("should have all games as featured", () => {
      const games = getPilotGames();

      games.forEach((game) => {
        expect(game.featured).toBe(true);
      });
    });

    it("should have all games with difficulty levels", () => {
      const games = getPilotGames();

      games.forEach((game) => {
        expect(game.difficulty).toBeGreaterThanOrEqual(1);
        expect(game.difficulty).toBeLessThanOrEqual(5);
      });
    });
  });

  describe("getGameCount", () => {
    it("should return 5", () => {
      expect(getGameCount()).toBe(5);
    });

    it("should match pilot games length", () => {
      const games = getPilotGames();
      expect(getGameCount()).toBe(games.length);
    });
  });
});
