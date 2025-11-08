import { describe, it, expect } from "vitest";
import type { GameDefinition } from "../types/gameRegistry";

// Helper functions from GameButton component
const getDifficultyColor = (difficulty: number): string => {
  const colors = ["green", "light-green", "orange", "deep-orange", "red"];
  return colors[difficulty - 1] || "grey";
};

const getDifficultyLabel = (difficulty: number): string => {
  const labels = ["Easy", "Medium", "Hard", "Expert", "Extreme"];
  return labels[difficulty - 1] || "";
};

describe("GameButton", () => {
  describe("getDifficultyColor", () => {
    it("should return green for difficulty 1 (Easy)", () => {
      expect(getDifficultyColor(1)).toBe("green");
    });

    it("should return light-green for difficulty 2 (Medium)", () => {
      expect(getDifficultyColor(2)).toBe("light-green");
    });

    it("should return orange for difficulty 3 (Hard)", () => {
      expect(getDifficultyColor(3)).toBe("orange");
    });

    it("should return deep-orange for difficulty 4 (Expert)", () => {
      expect(getDifficultyColor(4)).toBe("deep-orange");
    });

    it("should return red for difficulty 5 (Extreme)", () => {
      expect(getDifficultyColor(5)).toBe("red");
    });

    it("should return grey for invalid difficulty", () => {
      expect(getDifficultyColor(0)).toBe("grey");
      expect(getDifficultyColor(6)).toBe("grey");
      expect(getDifficultyColor(-1)).toBe("grey");
    });
  });

  describe("getDifficultyLabel", () => {
    it("should return Easy for difficulty 1", () => {
      expect(getDifficultyLabel(1)).toBe("Easy");
    });

    it("should return Medium for difficulty 2", () => {
      expect(getDifficultyLabel(2)).toBe("Medium");
    });

    it("should return Hard for difficulty 3", () => {
      expect(getDifficultyLabel(3)).toBe("Hard");
    });

    it("should return Expert for difficulty 4", () => {
      expect(getDifficultyLabel(4)).toBe("Expert");
    });

    it("should return Extreme for difficulty 5", () => {
      expect(getDifficultyLabel(5)).toBe("Extreme");
    });

    it("should return empty string for invalid difficulty", () => {
      expect(getDifficultyLabel(0)).toBe("");
      expect(getDifficultyLabel(6)).toBe("");
      expect(getDifficultyLabel(-1)).toBe("");
    });
  });

  describe("GameButton props validation", () => {
    it("should accept valid game definition with icon", () => {
      const game: GameDefinition = {
        id: "test-game",
        name: "Test Game",
        category: "countries",
        route: "/game/test",
        icon: "mdi-earth",
        difficulty: 3,
        featured: true,
        config: {
          dataUrl: "https://example.com/data.geojson",
          mapCenter: [0, 0],
          zoom: 2,
          propertyName: "name",
          targetLabel: "Country",
        },
      };

      expect(game.icon).toBe("mdi-earth");
      expect(game.name).toBe("Test Game");
      expect(game.difficulty).toBe(3);
    });

    it("should accept valid game definition with emoji", () => {
      const game: GameDefinition = {
        id: "test-game",
        name: "Test Game",
        category: "countries",
        route: "/game/test",
        emoji: "🌍",
        difficulty: 1,
        featured: true,
        config: {
          dataUrl: "https://example.com/data.geojson",
          mapCenter: [0, 0],
          zoom: 2,
          propertyName: "name",
          targetLabel: "Country",
        },
      };

      expect(game.emoji).toBe("🌍");
      expect(game.name).toBe("Test Game");
    });

    it("should accept game without difficulty", () => {
      const game: GameDefinition = {
        id: "test-game",
        name: "Test Game",
        category: "countries",
        route: "/game/test",
        featured: false,
        config: {
          dataUrl: "https://example.com/data.geojson",
          mapCenter: [0, 0],
          zoom: 2,
          propertyName: "name",
          targetLabel: "Country",
        },
      };

      expect(game.difficulty).toBeUndefined();
      expect(game.name).toBe("Test Game");
    });

    it("should accept game with color", () => {
      const game: GameDefinition = {
        id: "test-game",
        name: "Test Game",
        category: "countries",
        route: "/game/test",
        color: "blue-darken-1",
        featured: true,
        config: {
          dataUrl: "https://example.com/data.geojson",
          mapCenter: [0, 0],
          zoom: 2,
          propertyName: "name",
          targetLabel: "Country",
        },
      };

      expect(game.color).toBe("blue-darken-1");
    });
  });
});
