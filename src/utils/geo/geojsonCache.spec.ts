import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { FeatureCollection, Point } from "geojson";
import {
  fetchAndCacheGeoJSON,
  clearGeoJSONCache,
  getGeoJSONCacheStats,
  geojsonCache,
} from "./geojsonCache";

describe("geojsonCache", () => {
  const mockData: FeatureCollection<Point> = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { name: "Test" },
        geometry: { type: "Point", coordinates: [0, 0] },
      },
    ],
  };

  beforeEach(() => {
    clearGeoJSONCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GeoJSONCache class", () => {
    it("should cache data correctly", () => {
      const url = "https://example.com/data.geojson";
      const processors: string[] = [];

      geojsonCache.set(url, processors, mockData);

      const cached = geojsonCache.get(url, processors);
      expect(cached).toEqual(mockData);
    });

    it("should return null for cache miss", () => {
      const url = "https://example.com/data.geojson";
      const processors: string[] = [];

      const cached = geojsonCache.get(url, processors);
      expect(cached).toBeNull();
    });

    it("should differentiate between different URLs", () => {
      const url1 = "https://example.com/data1.geojson";
      const url2 = "https://example.com/data2.geojson";
      const processors: string[] = [];

      geojsonCache.set(url1, processors, mockData);

      const cached1 = geojsonCache.get(url1, processors);
      const cached2 = geojsonCache.get(url2, processors);

      expect(cached1).toEqual(mockData);
      expect(cached2).toBeNull();
    });

    it("should differentiate between different processors", () => {
      const url = "https://example.com/data.geojson";
      const processors1 = ["filterEurope"];
      const processors2 = ["filterAsia"];

      geojsonCache.set(url, processors1, mockData);

      const cached1 = geojsonCache.get(url, processors1);
      const cached2 = geojsonCache.get(url, processors2);

      expect(cached1).toEqual(mockData);
      expect(cached2).toBeNull();
    });

    it("should check cache existence with has()", () => {
      const url = "https://example.com/data.geojson";
      const processors: string[] = [];

      expect(geojsonCache.has(url, processors)).toBe(false);

      geojsonCache.set(url, processors, mockData);

      expect(geojsonCache.has(url, processors)).toBe(true);
    });

    it("should clear cache", () => {
      const url = "https://example.com/data.geojson";
      const processors: string[] = [];

      geojsonCache.set(url, processors, mockData);
      expect(geojsonCache.get(url, processors)).toEqual(mockData);

      geojsonCache.clear();
      expect(geojsonCache.get(url, processors)).toBeNull();
    });

    it("should return cache size", () => {
      const url = "https://example.com/data.geojson";
      const processors: string[] = [];

      expect(geojsonCache.size).toBe(0);

      geojsonCache.set(url, processors, mockData);
      expect(geojsonCache.size).toBe(1);

      geojsonCache.set(url + "2", processors, mockData);
      expect(geojsonCache.size).toBe(2);
    });

    it("should get cache stats", () => {
      const stats = geojsonCache.getStats();

      expect(stats).toHaveProperty("size");
      expect(stats).toHaveProperty("maxSize");
      expect(stats).toHaveProperty("hitRate");
      expect(typeof stats.size).toBe("number");
      expect(typeof stats.maxSize).toBe("number");
    });
  });

  describe("fetchAndCacheGeoJSON", () => {
    beforeEach(() => {
      // Mock fetch
      globalThis.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockData),
        } as Response)
      );
    });

    it("should fetch and cache data on first call", async () => {
      const url = "https://example.com/data.geojson";

      const data = await fetchAndCacheGeoJSON(url);

      expect(data).toEqual(mockData);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(globalThis.fetch).toHaveBeenCalledWith(url);
    });

    it("should return cached data on second call", async () => {
      const url = "https://example.com/data.geojson";

      // First call - should fetch
      const data1 = await fetchAndCacheGeoJSON(url);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const data2 = await fetchAndCacheGeoJSON(url);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1); // Still 1, not 2
      expect(data2).toEqual(data1);
    });

    it("should fetch again if processors are different", async () => {
      const url = "https://example.com/data.geojson";

      // First call with no processors
      await fetchAndCacheGeoJSON(url, []);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);

      // Second call with processors - different cache key, so new fetch
      await fetchAndCacheGeoJSON(url, ["filterEurope"]);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2); // Different processors = different cache entry
    });

    it("should handle fetch errors", async () => {
      const url = "https://example.com/data.geojson";

      globalThis.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 404,
        } as Response)
      );

      await expect(fetchAndCacheGeoJSON(url)).rejects.toThrow("HTTP error! status: 404");
    });

    it("should apply processors before caching", async () => {
      const url = "https://example.com/data.geojson";
      const dataWithContinent: FeatureCollection<Point> = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { name: "France", continent: "Europe" },
            geometry: { type: "Point", coordinates: [2, 48] },
          },
          {
            type: "Feature",
            properties: { name: "China", continent: "Asia" },
            geometry: { type: "Point", coordinates: [116, 40] },
          },
        ],
      };

      globalThis.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(dataWithContinent),
        } as Response)
      );

      const result = await fetchAndCacheGeoJSON(url, ["filterEurope"]);

      // filterEurope should keep France and add Gibraltar
      expect(result.features.length).toBe(2);
      const names = result.features.map(f => f.properties?.name);
      expect(names).toContain("France");
      expect(names).toContain("Gibraltar");
    });
  });

  describe("clearGeoJSONCache", () => {
    it("should clear the cache", () => {
      const url = "https://example.com/data.geojson";
      const processors: string[] = [];

      geojsonCache.set(url, processors, mockData);
      expect(geojsonCache.has(url, processors)).toBe(true);

      clearGeoJSONCache();
      expect(geojsonCache.has(url, processors)).toBe(false);
    });
  });

  describe("getGeoJSONCacheStats", () => {
    it("should return cache statistics", () => {
      const stats = getGeoJSONCacheStats();

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty("size");
      expect(stats).toHaveProperty("maxSize");
    });
  });
});
