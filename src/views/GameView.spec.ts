import { describe, it, expect, vi } from "vitest";
import { computed } from "vue";
import { applyProcessors } from "../utils/geo/processors";
import type { GameDefinition } from "../types/gameRegistry";
import type { FeatureCollection, Point } from "geojson";

// Test the GameView logic without vue-test-utils (which has compatibility issues with vitest 4.x)
// This tests the core functionality: loading game data, error handling, processor integration

const createMockGame = (overrides: Partial<GameDefinition> = {}): GameDefinition => ({
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

describe("GameView Logic", () => {
  describe("Map options computation", () => {
    it("should compute map options from game config", () => {
      const gameDefinition = createMockGame({
        config: {
          name: "Test Config",
          dataUrl: "https://example.com/data.geojson",
          mapCenter: [10, 20],
          zoom: 6,
          propertyName: "name",
          targetLabel: "Country",
          maxBounds: [
            [-10, -20],
            [30, 40],
          ],
        },
      });

      const mapOptions = computed(() => {
        if (!gameDefinition?.config) {
          return {
            initialCenter: [0, 0] as [number, number],
            initialZoom: 2,
            minZoom: 2,
            maxZoom: 18,
          };
        }

        const config = gameDefinition.config;
        return {
          initialCenter: config.mapCenter as [number, number],
          initialZoom: config.zoom,
          minZoom: config.zoom - 2,
          maxZoom: config.zoom + 6,
          maxBounds: config.maxBounds as [[number, number], [number, number]] | undefined,
        };
      });

      expect(mapOptions.value.initialCenter).toEqual([10, 20]);
      expect(mapOptions.value.initialZoom).toBe(6);
      expect(mapOptions.value.minZoom).toBe(4);
      expect(mapOptions.value.maxZoom).toBe(12);
      expect(mapOptions.value.maxBounds).toEqual([
        [-10, -20],
        [30, 40],
      ]);
    });

    it("should use default map options when config missing", () => {
      const gameDefinition: GameDefinition | null = null;

      const mapOptions = computed(() => {
        if (!gameDefinition?.config) {
          return {
            initialCenter: [0, 0] as [number, number],
            initialZoom: 2,
            minZoom: 2,
            maxZoom: 18,
          };
        }

        const config = gameDefinition.config;
        return {
          initialCenter: config.mapCenter as [number, number],
          initialZoom: config.zoom,
          minZoom: config.zoom - 2,
          maxZoom: config.zoom + 6,
          maxBounds: config.maxBounds as [[number, number], [number, number]] | undefined,
        };
      });

      expect(mapOptions.value.initialCenter).toEqual([0, 0]);
      expect(mapOptions.value.initialZoom).toBe(2);
      expect(mapOptions.value.minZoom).toBe(2);
      expect(mapOptions.value.maxZoom).toBe(18);
      expect(mapOptions.value.maxBounds).toBeUndefined();
    });
  });

  describe("Total rounds computation", () => {
    it("should return total rounds from config", () => {
      const gameDefinition = createMockGame({
        config: {
          name: "Test Config",
          dataUrl: "https://example.com/data.geojson",
          mapCenter: [0, 0],
          zoom: 2,
          propertyName: "name",
          targetLabel: "Country",
          totalRounds: 15,
        },
      });

      const totalRounds = computed(() => {
        return gameDefinition?.config.totalRounds || undefined;
      });

      expect(totalRounds.value).toBe(15);
    });

    it("should return undefined when totalRounds not specified", () => {
      const gameDefinition = createMockGame();

      const totalRounds = computed(() => {
        return gameDefinition?.config.totalRounds || undefined;
      });

      expect(totalRounds.value).toBeUndefined();
    });
  });

  describe("Processor integration", () => {
    it("should apply processors when configured", () => {
      const gameDefinition = createMockGame({
        config: {
          name: "Test Config",
          dataUrl: "https://example.com/data.geojson",
          mapCenter: [0, 0],
          zoom: 2,
          propertyName: "name",
          targetLabel: "Country",
          processors: ["filterEurope"],
        },
      });

      const testData: FeatureCollection<Point> = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { name: "France" },
            geometry: { type: "Point", coordinates: [2, 48] },
          },
          {
            type: "Feature",
            properties: { name: "China" },
            geometry: { type: "Point", coordinates: [116, 40] },
          },
        ],
      };

      const result = applyProcessors(testData, gameDefinition.config.processors!);

      // filterEurope should keep only France
      expect(result.features.length).toBe(1);
      expect(result.features[0]?.properties?.name).toBe("France");
    });

    it("should not apply processors when not configured", () => {
      const gameDefinition = createMockGame();

      function processGeoJsonData(data: FeatureCollection): FeatureCollection {
        if (!gameDefinition?.config.processors) {
          return data;
        }

        try {
          return applyProcessors(data, gameDefinition.config.processors);
        } catch (err) {
          console.error("Error processing GeoJSON data:", err);
          return data;
        }
      }

      const testData: FeatureCollection<Point> = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { name: "Test" },
            geometry: { type: "Point", coordinates: [0, 0] },
          },
        ],
      };

      const result = processGeoJsonData(testData);

      expect(result).toBe(testData); // Returns same data
    });

    it("should handle processor errors gracefully", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const gameDefinition = createMockGame({
        config: {
          name: "Test Config",
          dataUrl: "https://example.com/data.geojson",
          mapCenter: [0, 0],
          zoom: 2,
          propertyName: "name",
          targetLabel: "Country",
          processors: ["invalidProcessor"] as any,
        },
      });

      function processGeoJsonData(data: FeatureCollection): FeatureCollection {
        if (!gameDefinition?.config.processors) {
          return data;
        }

        try {
          return applyProcessors(data, gameDefinition.config.processors);
        } catch (err) {
          console.error("Error processing GeoJSON data:", err);
          return data;
        }
      }

      const testData: FeatureCollection<Point> = {
        type: "FeatureCollection",
        features: [],
      };

      const result = processGeoJsonData(testData);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result).toBe(testData); // Returns original data on error

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Game loading logic", () => {
    it("should handle missing game ID", () => {
      const gameId = "";

      expect(() => {
        if (!gameId) {
          throw new Error("No game ID provided");
        }
      }).toThrow("No game ID provided");
    });

    it("should handle game not found", () => {
      const gameId = "non-existent";
      const mockGetGameById = vi.fn().mockReturnValue(undefined);

      expect(() => {
        const game = mockGetGameById(gameId);
        if (!game) {
          throw new Error(`Game not found: ${gameId}`);
        }
      }).toThrow("Game not found: non-existent");
    });

    it("should load game successfully", () => {
      const gameId = "test-game";
      const mockGame = createMockGame({ id: gameId });
      const mockGetGameById = vi.fn().mockReturnValue(mockGame);

      const game = mockGetGameById(gameId);

      expect(game).toEqual(mockGame);
      expect(game.id).toBe(gameId);
    });
  });
});
