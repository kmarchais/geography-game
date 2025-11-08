import { describe, it, expect } from "vitest";
import { validateGameDefinition } from "../../schemas/gameConfig.schema";
import worldCountries from "./countries/world.json";
import europeCountries from "./countries/europe.json";
import usStates from "./divisions/us-states.json";
import parisArrondissements from "./cities/paris-arrondissements.json";
import londonBoroughs from "./cities/london-boroughs.json";

describe("Game JSON Configurations", () => {
  describe("World Countries", () => {
    it("should be valid against schema", () => {
      const errors = validateGameDefinition(worldCountries);
      expect(errors).toEqual([]);
    });

    it("should have correct id", () => {
      expect(worldCountries.id).toBe("world-countries");
    });

    it("should have correct category", () => {
      expect(worldCountries.category).toBe("countries");
    });

    it("should have world wrapping processor", () => {
      expect(worldCountries.config.processors).toContain("worldWrapping");
    });
  });

  describe("Europe Countries", () => {
    it("should be valid against schema", () => {
      const errors = validateGameDefinition(europeCountries);
      expect(errors).toEqual([]);
    });

    it("should have correct id", () => {
      expect(europeCountries.id).toBe("europe-countries");
    });

    it("should have Europe filter processor", () => {
      expect(europeCountries.config.processors).toContain("filterEurope");
    });
  });

  describe("US States", () => {
    it("should be valid against schema", () => {
      const errors = validateGameDefinition(usStates);
      expect(errors).toEqual([]);
    });

    it("should have correct id", () => {
      expect(usStates.id).toBe("us-states");
    });

    it("should have correct category", () => {
      expect(usStates.category).toBe("divisions");
    });

    it("should have map bounds", () => {
      expect(usStates.config.maxBounds).toBeDefined();
    });
  });

  describe("Paris Arrondissements", () => {
    it("should be valid against schema", () => {
      const errors = validateGameDefinition(parisArrondissements);
      expect(errors).toEqual([]);
    });

    it("should have correct id", () => {
      expect(parisArrondissements.id).toBe("paris-arrondissements");
    });

    it("should have correct category", () => {
      expect(parisArrondissements.category).toBe("cities");
    });

    it("should have correct property name", () => {
      expect(parisArrondissements.config.propertyName).toBe("c_ar");
    });
  });

  describe("London Boroughs", () => {
    it("should be valid against schema", () => {
      const errors = validateGameDefinition(londonBoroughs);
      expect(errors).toEqual([]);
    });

    it("should have correct id", () => {
      expect(londonBoroughs.id).toBe("london-boroughs");
    });

    it("should have correct category", () => {
      expect(londonBoroughs.category).toBe("cities");
    });

    it("should have map bounds", () => {
      expect(londonBoroughs.config.maxBounds).toBeDefined();
    });
  });

  describe("All Games", () => {
    const allGames = [
      worldCountries,
      europeCountries,
      usStates,
      parisArrondissements,
      londonBoroughs,
    ];

    it("should have unique IDs", () => {
      const ids = allGames.map((game) => game.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should have unique routes", () => {
      const routes = allGames.map((game) => game.route);
      const uniqueRoutes = new Set(routes);
      expect(uniqueRoutes.size).toBe(routes.length);
    });

    it("should all be featured", () => {
      allGames.forEach((game) => {
        expect(game.featured).toBe(true);
      });
    });

    it("should all have difficulty levels", () => {
      allGames.forEach((game) => {
        expect(game.difficulty).toBeGreaterThanOrEqual(1);
        expect(game.difficulty).toBeLessThanOrEqual(5);
      });
    });

    it("should all have valid routes", () => {
      allGames.forEach((game) => {
        expect(game.route).toMatch(/^\/game\/[a-z0-9-]+$/);
      });
    });
  });
});
