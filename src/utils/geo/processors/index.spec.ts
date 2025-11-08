import { describe, it, expect } from "vitest";
import type { FeatureCollection, Feature, Point } from "geojson";
import {
  PROCESSOR_REGISTRY,
  getProcessor,
  applyProcessors,
  getAllProcessorNames,
  getProcessorsByTag,
  type GeoJSONProcessor,
} from "./index";

describe("processors/index", () => {
  const createTestFeature = (name: string): Feature<Point> => ({
    type: "Feature",
    properties: { name },
    geometry: { type: "Point", coordinates: [0, 0] },
  });

  const createTestCollection = (names: string[]): FeatureCollection<Point> => ({
    type: "FeatureCollection",
    features: names.map(createTestFeature),
  });

  describe("PROCESSOR_REGISTRY", () => {
    it("should contain all expected processors", () => {
      expect(PROCESSOR_REGISTRY.worldWrapping).toBeDefined();
      expect(PROCESSOR_REGISTRY.filterEurope).toBeDefined();
      expect(PROCESSOR_REGISTRY.filterAsia).toBeDefined();
      expect(PROCESSOR_REGISTRY.filterAfrica).toBeDefined();
      expect(PROCESSOR_REGISTRY.filterNorthAmerica).toBeDefined();
      expect(PROCESSOR_REGISTRY.filterSouthAmerica).toBeDefined();
      expect(PROCESSOR_REGISTRY.filterOceania).toBeDefined();
    });

    it("should have processor functions", () => {
      Object.values(PROCESSOR_REGISTRY).forEach((entry) => {
        expect(typeof entry.processor).toBe("function");
      });
    });

    it("should have metadata for each processor", () => {
      Object.values(PROCESSOR_REGISTRY).forEach((entry) => {
        expect(entry.metadata).toBeDefined();
        expect(entry.metadata.name).toBeTruthy();
        expect(entry.metadata.description).toBeTruthy();
      });
    });
  });

  describe("worldWrapping processor", () => {
    it("should create wrapped copies", () => {
      const data = createTestCollection(["Test1", "Test2"]);
      const result = PROCESSOR_REGISTRY.worldWrapping.processor(data);

      // Original 2 features + 2 east copies + 2 west copies = 6 total
      expect(result.features.length).toBe(6);
    });

    it("should have correct metadata", () => {
      const { metadata } = PROCESSOR_REGISTRY.worldWrapping;
      expect(metadata.name).toBe("World Wrapping");
      expect(metadata.description).toContain("±360°");
      expect(metadata.tags).toContain("world");
    });
  });

  describe("filterEurope processor", () => {
    it("should filter to European countries", () => {
      const data = createTestCollection([
        "France",
        "Germany",
        "China",
        "Brazil",
        "United Kingdom",
      ]);

      const result = PROCESSOR_REGISTRY.filterEurope.processor(data);

      expect(result.features.length).toBe(3);
      const names = result.features.map((f) => f.properties?.name);
      expect(names).toContain("France");
      expect(names).toContain("Germany");
      expect(names).toContain("United Kingdom");
      expect(names).not.toContain("China");
      expect(names).not.toContain("Brazil");
    });

    it("should handle empty input", () => {
      const data = createTestCollection([]);
      const result = PROCESSOR_REGISTRY.filterEurope.processor(data);
      expect(result.features.length).toBe(0);
    });

    it("should handle all non-European countries", () => {
      const data = createTestCollection(["China", "Japan", "Brazil"]);
      const result = PROCESSOR_REGISTRY.filterEurope.processor(data);
      expect(result.features.length).toBe(0);
    });
  });

  describe("filterAsia processor", () => {
    it("should filter to Asian countries", () => {
      const data = createTestCollection([
        "China",
        "Japan",
        "India",
        "France",
        "Brazil",
      ]);

      const result = PROCESSOR_REGISTRY.filterAsia.processor(data);

      expect(result.features.length).toBe(3);
      const names = result.features.map((f) => f.properties?.name);
      expect(names).toContain("China");
      expect(names).toContain("Japan");
      expect(names).toContain("India");
      expect(names).not.toContain("France");
      expect(names).not.toContain("Brazil");
    });

    it("should include Russia", () => {
      const data = createTestCollection(["Russia"]);
      const result = PROCESSOR_REGISTRY.filterAsia.processor(data);
      expect(result.features.length).toBe(1);
    });
  });

  describe("filterAfrica processor", () => {
    it("should filter to African countries", () => {
      const data = createTestCollection([
        "Egypt",
        "Nigeria",
        "South Africa",
        "France",
        "China",
      ]);

      const result = PROCESSOR_REGISTRY.filterAfrica.processor(data);

      expect(result.features.length).toBe(3);
      const names = result.features.map((f) => f.properties?.name);
      expect(names).toContain("Egypt");
      expect(names).toContain("Nigeria");
      expect(names).toContain("South Africa");
    });
  });

  describe("filterNorthAmerica processor", () => {
    it("should filter to North American countries", () => {
      const data = createTestCollection([
        "United States",
        "Canada",
        "Mexico",
        "Brazil",
        "China",
      ]);

      const result = PROCESSOR_REGISTRY.filterNorthAmerica.processor(data);

      expect(result.features.length).toBe(3);
      const names = result.features.map((f) => f.properties?.name);
      expect(names).toContain("United States");
      expect(names).toContain("Canada");
      expect(names).toContain("Mexico");
    });

    it("should include Caribbean countries", () => {
      const data = createTestCollection(["Cuba", "Jamaica", "Haiti"]);
      const result = PROCESSOR_REGISTRY.filterNorthAmerica.processor(data);
      expect(result.features.length).toBe(3);
    });
  });

  describe("filterSouthAmerica processor", () => {
    it("should filter to South American countries", () => {
      const data = createTestCollection([
        "Brazil",
        "Argentina",
        "Chile",
        "Mexico",
        "China",
      ]);

      const result = PROCESSOR_REGISTRY.filterSouthAmerica.processor(data);

      expect(result.features.length).toBe(3);
      const names = result.features.map((f) => f.properties?.name);
      expect(names).toContain("Brazil");
      expect(names).toContain("Argentina");
      expect(names).toContain("Chile");
    });
  });

  describe("filterOceania processor", () => {
    it("should filter to Oceania countries", () => {
      const data = createTestCollection([
        "Australia",
        "New Zealand",
        "Fiji",
        "China",
        "Brazil",
      ]);

      const result = PROCESSOR_REGISTRY.filterOceania.processor(data);

      expect(result.features.length).toBe(3);
      const names = result.features.map((f) => f.properties?.name);
      expect(names).toContain("Australia");
      expect(names).toContain("New Zealand");
      expect(names).toContain("Fiji");
    });
  });

  describe("getProcessor", () => {
    it("should return processor by name", () => {
      const processor = getProcessor("filterEurope");
      expect(processor).toBe(PROCESSOR_REGISTRY.filterEurope);
    });

    it("should work for all processor names", () => {
      const names = Object.keys(PROCESSOR_REGISTRY) as Array<keyof typeof PROCESSOR_REGISTRY>;
      names.forEach((name) => {
        const processor = getProcessor(name);
        expect(processor).toBeDefined();
        expect(typeof processor.processor).toBe("function");
      });
    });
  });

  describe("applyProcessors", () => {
    it("should apply single processor by name", () => {
      const data = createTestCollection(["France", "China", "Brazil"]);
      const result = applyProcessors(data, ["filterEurope"]);

      expect(result.features.length).toBe(1);
      expect(result.features[0]?.properties?.name).toBe("France");
    });

    it("should apply multiple processors in sequence", () => {
      const data = createTestCollection([
        "France",
        "Germany",
        "China",
        "Brazil",
      ]);

      // First filter to Europe, then wrap
      const result = applyProcessors(data, ["filterEurope", "worldWrapping"]);

      // 2 European countries * 3 (original + east + west) = 6
      expect(result.features.length).toBe(6);
    });

    it("should apply custom processor function", () => {
      const data = createTestCollection(["Test1", "Test2", "Test3"]);

      const customProcessor: GeoJSONProcessor = (d) => ({
        ...d,
        features: d.features.slice(0, 1), // Take only first feature
      });

      const result = applyProcessors(data, [customProcessor]);

      expect(result.features.length).toBe(1);
      expect(result.features[0]?.properties?.name).toBe("Test1");
    });

    it("should mix named and custom processors", () => {
      const data = createTestCollection(["France", "Germany", "China"]);

      const customProcessor: GeoJSONProcessor = (d) => ({
        ...d,
        features: d.features.map((f) => ({
          ...f,
          properties: { ...f.properties, processed: true },
        })),
      });

      const result = applyProcessors(data, [
        "filterEurope",
        customProcessor,
      ]);

      expect(result.features.length).toBe(2);
      expect(result.features[0]?.properties?.processed).toBe(true);
    });

    it("should handle empty processor array", () => {
      const data = createTestCollection(["Test1", "Test2"]);
      const result = applyProcessors(data, []);

      expect(result).toEqual(data);
    });

    it("should preserve original data", () => {
      const data = createTestCollection(["France", "China"]);
      const original = JSON.parse(JSON.stringify(data));

      applyProcessors(data, ["filterEurope"]);

      // Original data should not be mutated
      expect(data).toEqual(original);
    });
  });

  describe("getAllProcessorNames", () => {
    it("should return all processor names", () => {
      const names = getAllProcessorNames();

      expect(names).toContain("worldWrapping");
      expect(names).toContain("filterEurope");
      expect(names).toContain("filterAsia");
      expect(names).toContain("filterAfrica");
      expect(names).toContain("filterNorthAmerica");
      expect(names).toContain("filterSouthAmerica");
      expect(names).toContain("filterOceania");
    });

    it("should return correct number of processors", () => {
      const names = getAllProcessorNames();
      expect(names.length).toBe(7);
    });
  });

  describe("getProcessorsByTag", () => {
    it("should return processors with filter tag", () => {
      const processors = getProcessorsByTag("filter");

      expect(processors.length).toBeGreaterThan(0);
      processors.forEach((entry) => {
        expect(entry.metadata.tags).toContain("filter");
      });
    });

    it("should return processors with world tag", () => {
      const processors = getProcessorsByTag("world");

      expect(processors.length).toBeGreaterThan(0);
      expect(processors[0]?.metadata.name).toBe("World Wrapping");
    });

    it("should return empty array for non-existent tag", () => {
      const processors = getProcessorsByTag("nonexistent");
      expect(processors.length).toBe(0);
    });

    it("should return multiple processors for geography tag", () => {
      const processors = getProcessorsByTag("geography");

      expect(processors.length).toBeGreaterThan(1);
      processors.forEach((entry) => {
        expect(entry.metadata.tags).toContain("geography");
      });
    });
  });

  describe("processor chain integration", () => {
    it("should filter and wrap European countries", () => {
      const data = createTestCollection([
        "France",
        "Germany",
        "China",
        "Brazil",
        "Italy",
      ]);

      const result = applyProcessors(data, ["filterEurope", "worldWrapping"]);

      // 3 European countries * 3 (original + copies) = 9
      expect(result.features.length).toBe(9);

      // Check that only European countries are present
      const uniqueNames = new Set(
        result.features.map((f) => f.properties?.name)
      );
      expect(uniqueNames.size).toBe(3);
      expect(uniqueNames.has("France")).toBe(true);
      expect(uniqueNames.has("Germany")).toBe(true);
      expect(uniqueNames.has("Italy")).toBe(true);
      expect(uniqueNames.has("China")).toBe(false);
    });

    it("should apply multiple region filters", () => {
      const data = createTestCollection([
        "France",
        "China",
        "Brazil",
        "Egypt",
        "Australia",
      ]);

      // Filter to Europe first
      const europeResult = applyProcessors(data, ["filterEurope"]);
      expect(europeResult.features.length).toBe(1);

      // Filter to Asia from original data
      const asiaResult = applyProcessors(data, ["filterAsia"]);
      expect(asiaResult.features.length).toBe(1);

      // Filter to Africa from original data
      const africaResult = applyProcessors(data, ["filterAfrica"]);
      expect(africaResult.features.length).toBe(1);
    });
  });
});
