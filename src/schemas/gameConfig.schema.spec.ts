import { describe, it, expect } from "vitest";
import {
  GAME_CONFIG_SCHEMA,
  isValidGameDefinition,
  validateGameDefinition,
} from "./gameConfig.schema";
import type { GameDefinition } from "../types/gameRegistry";

describe("gameConfig.schema", () => {
  const validGameDefinition: GameDefinition = {
    id: "world-countries",
    name: "World Countries",
    category: "countries",
    route: "/game/world-countries",
    emoji: "🌍",
    icon: "mdi-earth",
    color: "blue-darken-1",
    description: "Test all countries in the world",
    tags: ["geography", "world", "easy"],
    difficulty: 3,
    featured: true,
    estimatedTime: 15,
    config: {
      name: "World Countries",
      dataUrl: "https://example.com/countries.geojson",
      mapCenter: [0, 0],
      zoom: 2,
      maxBounds: [
        [-90, -180],
        [90, 180],
      ],
      propertyName: "name",
      targetLabel: "Country",
    },
  };

  describe("GAME_CONFIG_SCHEMA", () => {
    it("should have correct schema properties", () => {
      expect(GAME_CONFIG_SCHEMA.$schema).toBe("http://json-schema.org/draft-07/schema#");
      expect(GAME_CONFIG_SCHEMA.type).toBe("object");
      expect(GAME_CONFIG_SCHEMA.required).toContain("id");
      expect(GAME_CONFIG_SCHEMA.required).toContain("name");
      expect(GAME_CONFIG_SCHEMA.required).toContain("category");
      expect(GAME_CONFIG_SCHEMA.required).toContain("route");
      expect(GAME_CONFIG_SCHEMA.required).toContain("config");
    });

    it("should define all required field schemas", () => {
      expect(GAME_CONFIG_SCHEMA.properties.id).toBeDefined();
      expect(GAME_CONFIG_SCHEMA.properties.name).toBeDefined();
      expect(GAME_CONFIG_SCHEMA.properties.category).toBeDefined();
      expect(GAME_CONFIG_SCHEMA.properties.route).toBeDefined();
      expect(GAME_CONFIG_SCHEMA.properties.config).toBeDefined();
    });

    it("should define category enum", () => {
      const categories = GAME_CONFIG_SCHEMA.properties.category.enum;
      expect(categories).toEqual(["countries", "divisions", "cities", "capitals", "flags"]);
    });

    it("should define difficulty range", () => {
      const difficulty = GAME_CONFIG_SCHEMA.properties.difficulty;
      expect(difficulty.minimum).toBe(1);
      expect(difficulty.maximum).toBe(5);
    });
  });

  describe("isValidGameDefinition", () => {
    it("should return true for valid game definition", () => {
      expect(isValidGameDefinition(validGameDefinition)).toBe(true);
    });

    it("should return true for minimal valid definition", () => {
      const minimal = {
        id: "test-game",
        name: "Test Game",
        category: "countries",
        route: "/game/test-game",
        config: {
          dataUrl: "https://example.com/data.geojson",
          mapCenter: [0, 0],
          zoom: 2,
          propertyName: "name",
          targetLabel: "Entity",
        },
      };
      expect(isValidGameDefinition(minimal)).toBe(true);
    });

    it("should return false for null", () => {
      expect(isValidGameDefinition(null)).toBe(false);
    });

    it("should return false for non-object", () => {
      expect(isValidGameDefinition("string")).toBe(false);
      expect(isValidGameDefinition(123)).toBe(false);
      expect(isValidGameDefinition([])).toBe(false);
    });

    it("should return false for missing required fields", () => {
      expect(isValidGameDefinition({})).toBe(false);
      expect(isValidGameDefinition({ id: "test" })).toBe(false);
      expect(isValidGameDefinition({ id: "test", name: "Test" })).toBe(false);
    });

    it("should return false for invalid ID format", () => {
      const invalid = {
        ...validGameDefinition,
        id: "Invalid_ID",
      };
      expect(isValidGameDefinition(invalid)).toBe(false);
    });

    it("should return false for uppercase in ID", () => {
      const invalid = {
        ...validGameDefinition,
        id: "World-Countries",
      };
      expect(isValidGameDefinition(invalid)).toBe(false);
    });

    it("should return false for invalid category", () => {
      const invalid = {
        ...validGameDefinition,
        category: "invalid",
      };
      expect(isValidGameDefinition(invalid)).toBe(false);
    });

    it("should return false for invalid route format", () => {
      const invalid = {
        ...validGameDefinition,
        route: "invalid-route",
      };
      expect(isValidGameDefinition(invalid)).toBe(false);
    });

    it("should return false for route without /game/ prefix", () => {
      const invalid = {
        ...validGameDefinition,
        route: "/world-countries",
      };
      expect(isValidGameDefinition(invalid)).toBe(false);
    });

    it("should return false for invalid difficulty", () => {
      const invalid1 = {
        ...validGameDefinition,
        difficulty: 0,
      };
      expect(isValidGameDefinition(invalid1)).toBe(false);

      const invalid2 = {
        ...validGameDefinition,
        difficulty: 6,
      };
      expect(isValidGameDefinition(invalid2)).toBe(false);

      const invalid3 = {
        ...validGameDefinition,
        difficulty: 3.5,
      };
      expect(isValidGameDefinition(invalid3)).toBe(false);
    });

    it("should return false for non-string tags", () => {
      const invalid = {
        ...validGameDefinition,
        tags: ["valid", 123, "another"],
      };
      expect(isValidGameDefinition(invalid)).toBe(false);
    });

    it("should accept valid difficulty levels", () => {
      for (let i = 1; i <= 5; i++) {
        const valid = {
          ...validGameDefinition,
          difficulty: i,
        };
        expect(isValidGameDefinition(valid)).toBe(true);
      }
    });
  });

  describe("validateGameDefinition", () => {
    it("should return empty array for valid definition", () => {
      const errors = validateGameDefinition(validGameDefinition);
      expect(errors).toEqual([]);
    });

    it("should return error for null", () => {
      const errors = validateGameDefinition(null);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.field).toBe("root");
      expect(errors[0]?.message).toContain("must be an object");
    });

    it("should return error for missing ID", () => {
      const invalid = { ...validGameDefinition };
      delete (invalid as Record<string, unknown>).id;
      const errors = validateGameDefinition(invalid);
      const idError = errors.find((e) => e.field === "id");
      expect(idError).toBeDefined();
      expect(idError?.message).toContain("required");
    });

    it("should return error for invalid ID format", () => {
      const invalid = {
        ...validGameDefinition,
        id: "Invalid_ID",
      };
      const errors = validateGameDefinition(invalid);
      const idError = errors.find((e) => e.field === "id");
      expect(idError).toBeDefined();
      expect(idError?.message).toContain("kebab-case");
      expect(idError?.value).toBe("Invalid_ID");
    });

    it("should return error for empty name", () => {
      const invalid = {
        ...validGameDefinition,
        name: "   ",
      };
      const errors = validateGameDefinition(invalid);
      const nameError = errors.find((e) => e.field === "name");
      expect(nameError).toBeDefined();
      expect(nameError?.message).toContain("cannot be empty");
    });

    it("should return error for invalid category", () => {
      const invalid = {
        ...validGameDefinition,
        category: "invalid-category",
      };
      const errors = validateGameDefinition(invalid);
      const categoryError = errors.find((e) => e.field === "category");
      expect(categoryError).toBeDefined();
      expect(categoryError?.message).toContain("must be one of");
      expect(categoryError?.value).toBe("invalid-category");
    });

    it("should return error for invalid route", () => {
      const invalid = {
        ...validGameDefinition,
        route: "bad-route",
      };
      const errors = validateGameDefinition(invalid);
      const routeError = errors.find((e) => e.field === "route");
      expect(routeError).toBeDefined();
      expect(routeError?.message).toContain("/game/");
      expect(routeError?.value).toBe("bad-route");
    });

    it("should return error for missing config", () => {
      const invalid = { ...validGameDefinition };
      delete (invalid as Record<string, unknown>).config;
      const errors = validateGameDefinition(invalid);
      const configError = errors.find((e) => e.field === "config");
      expect(configError).toBeDefined();
      expect(configError?.message).toContain("required");
    });

    it("should return error for invalid difficulty", () => {
      const invalid = {
        ...validGameDefinition,
        difficulty: 10,
      };
      const errors = validateGameDefinition(invalid);
      const difficultyError = errors.find((e) => e.field === "difficulty");
      expect(difficultyError).toBeDefined();
      expect(difficultyError?.message).toContain("between 1 and 5");
      expect(difficultyError?.value).toBe(10);
    });

    it("should return error for non-integer difficulty", () => {
      const invalid = {
        ...validGameDefinition,
        difficulty: 2.5,
      };
      const errors = validateGameDefinition(invalid);
      const difficultyError = errors.find((e) => e.field === "difficulty");
      expect(difficultyError).toBeDefined();
      expect(difficultyError?.message).toContain("integer");
    });

    it("should return error for invalid tags", () => {
      const invalid = {
        ...validGameDefinition,
        tags: "not-an-array",
      };
      const errors = validateGameDefinition(invalid);
      const tagsError = errors.find((e) => e.field === "tags");
      expect(tagsError).toBeDefined();
      expect(tagsError?.message).toContain("must be an array");
    });

    it("should return error for non-string tags", () => {
      const invalid = {
        ...validGameDefinition,
        tags: ["valid", 123],
      };
      const errors = validateGameDefinition(invalid);
      const tagsError = errors.find((e) => e.field === "tags");
      expect(tagsError).toBeDefined();
      expect(tagsError?.message).toContain("must be strings");
    });

    it("should return error for invalid icon format", () => {
      const invalid = {
        ...validGameDefinition,
        icon: "invalid-icon",
      };
      const errors = validateGameDefinition(invalid);
      const iconError = errors.find((e) => e.field === "icon");
      expect(iconError).toBeDefined();
      expect(iconError?.message).toContain("mdi-");
      expect(iconError?.value).toBe("invalid-icon");
    });

    it("should return error for non-boolean featured", () => {
      const invalid = {
        ...validGameDefinition,
        featured: "yes",
      };
      const errors = validateGameDefinition(invalid);
      const featuredError = errors.find((e) => e.field === "featured");
      expect(featuredError).toBeDefined();
      expect(featuredError?.message).toContain("boolean");
    });

    it("should return error for invalid estimatedTime", () => {
      const invalid = {
        ...validGameDefinition,
        estimatedTime: -5,
      };
      const errors = validateGameDefinition(invalid);
      const timeError = errors.find((e) => e.field === "estimatedTime");
      expect(timeError).toBeDefined();
      expect(timeError?.message).toContain("positive integer");
    });

    it("should return error for non-integer estimatedTime", () => {
      const invalid = {
        ...validGameDefinition,
        estimatedTime: 10.5,
      };
      const errors = validateGameDefinition(invalid);
      const timeError = errors.find((e) => e.field === "estimatedTime");
      expect(timeError).toBeDefined();
      expect(timeError?.message).toContain("positive integer");
    });

    it("should return multiple errors for multiple issues", () => {
      const invalid = {
        id: "Invalid_ID",
        name: "",
        category: "bad-category",
        route: "bad-route",
        difficulty: 10,
      };
      const errors = validateGameDefinition(invalid);
      expect(errors.length).toBeGreaterThan(3);
    });
  });
});
