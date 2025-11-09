import type { FeatureCollection, Geometry, GeoJsonProperties } from "geojson";
import { createWorldWrappedCollection } from "../worldWrapping";

/**
 * Processor function that transforms a GeoJSON FeatureCollection
 */
export type GeoJSONProcessor<
  G extends Geometry = Geometry,
  P extends GeoJsonProperties = GeoJsonProperties
> = (data: FeatureCollection<G, P>) => FeatureCollection<G, P>;

/**
 * Processor metadata for documentation and debugging
 */
export interface ProcessorMetadata {
  /**
   * Processor name
   */
  name: string;

  /**
   * Description of what the processor does
   */
  description: string;

  /**
   * Tags for categorization
   */
  tags?: string[];
}

/**
 * Processor entry in the registry
 */
export interface ProcessorEntry<
  G extends Geometry = Geometry,
  P extends GeoJsonProperties = GeoJsonProperties
> {
  /**
   * Processor function
   */
  processor: GeoJSONProcessor<G, P>;

  /**
   * Metadata
   */
  metadata: ProcessorMetadata;
}

/**
 * Registry of all available GeoJSON processors
 */
export const PROCESSOR_REGISTRY = {
  /**
   * World wrapping processor
   * Creates copies of features at ±360° for seamless map panning
   */
  worldWrapping: {
    processor: createWorldWrappedCollection,
    metadata: {
      name: "World Wrapping",
      description: "Creates feature copies at ±360° longitude for seamless world map panning",
      tags: ["world", "wrapping", "transform"],
    },
  } as ProcessorEntry,

  /**
   * Filter to European countries
   */
  filterEurope: {
    processor: <G extends Geometry, P extends GeoJsonProperties>(
      data: FeatureCollection<G, P>
    ): FeatureCollection<G, P> => {
      // Additional countries to include beyond continent=Europe
      const additionalCountries = ["Turkey", "Cyprus", "Greenland"];

      // Define latitude threshold for Svalbard
      const SVALBARD_LATITUDE_THRESHOLD = 72;

      // Check if a polygon has any point above threshold
      const isPolygonAboveThreshold = (polygon: any[][]): boolean => {
        return polygon.some(ring => ring.some(point => point[1] > SVALBARD_LATITUDE_THRESHOLD));
      };

      // Gibraltar feature (not in Natural Earth data)
      const gibraltarFeature: any = {
        type: "Feature",
        properties: {
          name: "Gibraltar",
          continent: "Europe",
          name_long: "Gibraltar",
          admin: "United Kingdom",
        },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-5.3536, 36.1086],
              [-5.3384, 36.1086],
              [-5.3384, 36.1225],
              [-5.3438, 36.1449],
              [-5.3536, 36.1449],
              [-5.3589, 36.1225],
              [-5.3536, 36.1086]
            ]
          ]
        }
      };

      const cyprusFeature = data.features.find(f => f.properties?.name === "Cyprus");
      const northCyprusFeature = data.features.find(f => f.properties?.name === "N. Cyprus");

      let filteredFeatures = data.features.filter((feature) => {
        const continent = feature.properties?.continent;
        const name = feature.properties?.name;

        // Include if continent is Europe OR if it's in additional countries (but exclude N. Cyprus as we'll merge it)
        return (continent === "Europe" ||
               (name && additionalCountries.includes(name) && name !== "N. Cyprus"));
      });

      // Merge Cyprus and Northern Cyprus
      if (cyprusFeature && northCyprusFeature) {
        const cyprusIndex = filteredFeatures.findIndex(f => f.properties?.name === "Cyprus");
        if (cyprusIndex !== -1) {
          let combinedCoordinates: any[] = [];

          // Handle Cyprus coordinates
          if (cyprusFeature.geometry.type === "Polygon") {
            combinedCoordinates.push((cyprusFeature.geometry as any).coordinates);
          } else if (cyprusFeature.geometry.type === "MultiPolygon") {
            combinedCoordinates = [...combinedCoordinates, ...(cyprusFeature.geometry as any).coordinates];
          }

          // Handle Northern Cyprus coordinates
          if (northCyprusFeature.geometry.type === "Polygon") {
            combinedCoordinates.push((northCyprusFeature.geometry as any).coordinates);
          } else if (northCyprusFeature.geometry.type === "MultiPolygon") {
            combinedCoordinates = [...combinedCoordinates, ...(northCyprusFeature.geometry as any).coordinates];
          }

          filteredFeatures[cyprusIndex] = {
            type: "Feature",
            properties: {
              ...cyprusFeature.properties,
              name: "Cyprus",
              name_long: "Republic of Cyprus",
            },
            geometry: {
              type: "MultiPolygon",
              coordinates: combinedCoordinates
            }
          } as any;
        }
      }

      // Add Gibraltar
      filteredFeatures.push(gibraltarFeature);

      // Split Norway and create Svalbard
      const norwayFeature = data.features.find(f => f.properties?.name === "Norway");
      if (norwayFeature && norwayFeature.geometry.type === "MultiPolygon") {
        const mainlandPolygons: any[] = [];
        const svalbardPolygons: any[] = [];

        for (const polygon of (norwayFeature.geometry as any).coordinates) {
          if (isPolygonAboveThreshold(polygon)) {
            svalbardPolygons.push(polygon);
          } else {
            mainlandPolygons.push(polygon);
          }
        }

        // Update Norway to mainland only
        const norwayIndex = filteredFeatures.findIndex(f => f.properties?.name === "Norway");
        if (norwayIndex !== -1 && mainlandPolygons.length > 0) {
          filteredFeatures[norwayIndex] = {
            type: "Feature",
            properties: { ...norwayFeature.properties },
            geometry: {
              type: "MultiPolygon",
              coordinates: mainlandPolygons
            }
          } as any;
        }

        // Add Svalbard as separate territory
        if (svalbardPolygons.length > 0) {
          filteredFeatures.push({
            type: "Feature",
            properties: {
              ...norwayFeature.properties,
              name: "Svalbard",
              name_long: "Svalbard and Jan Mayen",
              admin: "Norway",
            },
            geometry: {
              type: "MultiPolygon",
              coordinates: svalbardPolygons
            }
          } as any);
        }
      }

      return {
        ...data,
        features: filteredFeatures,
      };
    },
    metadata: {
      name: "Filter Europe",
      description: "Filters features to only European countries",
      tags: ["filter", "europe", "geography"],
    },
  } as ProcessorEntry,

  /**
   * Filter to Asian countries
   */
  filterAsia: {
    processor: <G extends Geometry, P extends GeoJsonProperties>(
      data: FeatureCollection<G, P>
    ): FeatureCollection<G, P> => {
      // Additional countries to include beyond continent=Asia
      const additionalCountries = ["Russia"];

      return {
        ...data,
        features: data.features.filter((feature) => {
          const continent = feature.properties?.continent;
          const name = feature.properties?.name;

          return continent === "Asia" || (name && additionalCountries.includes(name));
        }),
      };
    },
    metadata: {
      name: "Filter Asia",
      description: "Filters features to only Asian countries",
      tags: ["filter", "asia", "geography"],
    },
  } as ProcessorEntry,

  /**
   * Filter to African countries
   */
  filterAfrica: {
    processor: <G extends Geometry, P extends GeoJsonProperties>(
      data: FeatureCollection<G, P>
    ): FeatureCollection<G, P> => {
      return {
        ...data,
        features: data.features.filter((feature) => {
          return feature.properties?.continent === "Africa";
        }),
      };
    },
    metadata: {
      name: "Filter Africa",
      description: "Filters features to only African countries",
      tags: ["filter", "africa", "geography"],
    },
  } as ProcessorEntry,

  /**
   * Filter to North American countries
   */
  filterNorthAmerica: {
    processor: <G extends Geometry, P extends GeoJsonProperties>(
      data: FeatureCollection<G, P>
    ): FeatureCollection<G, P> => {
      return {
        ...data,
        features: data.features.filter((feature) => {
          return feature.properties?.continent === "North America";
        }),
      };
    },
    metadata: {
      name: "Filter North America",
      description: "Filters features to only North American countries",
      tags: ["filter", "north-america", "geography"],
    },
  } as ProcessorEntry,

  /**
   * Filter to South American countries
   */
  filterSouthAmerica: {
    processor: <G extends Geometry, P extends GeoJsonProperties>(
      data: FeatureCollection<G, P>
    ): FeatureCollection<G, P> => {
      return {
        ...data,
        features: data.features.filter((feature) => {
          return feature.properties?.continent === "South America";
        }),
      };
    },
    metadata: {
      name: "Filter South America",
      description: "Filters features to only South American countries",
      tags: ["filter", "south-america", "geography"],
    },
  } as ProcessorEntry,

  /**
   * Filter to Oceania countries
   */
  filterOceania: {
    processor: <G extends Geometry, P extends GeoJsonProperties>(
      data: FeatureCollection<G, P>
    ): FeatureCollection<G, P> => {
      return {
        ...data,
        features: data.features.filter((feature) => {
          return feature.properties?.continent === "Oceania";
        }),
      };
    },
    metadata: {
      name: "Filter Oceania",
      description: "Filters features to only Oceania countries",
      tags: ["filter", "oceania", "geography"],
    },
  } as ProcessorEntry,

  /**
   * Filter to Canadian provinces and territories
   */
  filterCanada: {
    processor: <G extends Geometry, P extends GeoJsonProperties>(
      data: FeatureCollection<G, P>
    ): FeatureCollection<G, P> => {
      return {
        ...data,
        features: data.features.filter((feature) => {
          const isoA2 = feature.properties?.iso_a2 as string | undefined;
          const admin = feature.properties?.admin as string | undefined;
          return isoA2 === "CA" || admin === "Canada";
        }),
      };
    },
    metadata: {
      name: "Filter Canada",
      description: "Filters features to only Canadian provinces and territories",
      tags: ["filter", "canada", "divisions"],
    },
  } as ProcessorEntry,

  /**
   * Filter to Brazilian states
   */
  filterBrazil: {
    processor: <G extends Geometry, P extends GeoJsonProperties>(
      data: FeatureCollection<G, P>
    ): FeatureCollection<G, P> => {
      return {
        ...data,
        features: data.features.filter((feature) => {
          const isoA2 = feature.properties?.iso_a2 as string | undefined;
          const admin = feature.properties?.admin as string | undefined;
          return isoA2 === "BR" || admin === "Brazil";
        }),
      };
    },
    metadata: {
      name: "Filter Brazil",
      description: "Filters features to only Brazilian states",
      tags: ["filter", "brazil", "divisions"],
    },
  } as ProcessorEntry,

  /**
   * Filter to Australian states and territories
   */
  filterAustralia: {
    processor: <G extends Geometry, P extends GeoJsonProperties>(
      data: FeatureCollection<G, P>
    ): FeatureCollection<G, P> => {
      return {
        ...data,
        features: data.features.filter((feature) => {
          const isoA2 = feature.properties?.iso_a2 as string | undefined;
          const admin = feature.properties?.admin as string | undefined;
          return isoA2 === "AU" || admin === "Australia";
        }),
      };
    },
    metadata: {
      name: "Filter Australia",
      description: "Filters features to only Australian states and territories",
      tags: ["filter", "australia", "divisions"],
    },
  } as ProcessorEntry,
} as const;

/**
 * Type for processor names in the registry
 */
export type ProcessorName = keyof typeof PROCESSOR_REGISTRY;

/**
 * Get a processor by name from the registry
 */
export function getProcessor(name: ProcessorName): ProcessorEntry {
  return PROCESSOR_REGISTRY[name];
}

/**
 * Apply multiple processors in sequence to a GeoJSON FeatureCollection
 *
 * @param data - Input GeoJSON FeatureCollection
 * @param processors - Array of processor names or functions to apply in order
 * @returns Transformed GeoJSON FeatureCollection
 *
 * @example
 * ```ts
 * const processed = applyProcessors(data, [
 *   'filterEurope',
 *   'worldWrapping'
 * ]);
 * ```
 */
export function applyProcessors<
  G extends Geometry = Geometry,
  P extends GeoJsonProperties = GeoJsonProperties
>(
  data: FeatureCollection<G, P>,
  processors: (ProcessorName | GeoJSONProcessor<G, P>)[]
): FeatureCollection<G, P> {
  return processors.reduce((currentData, processor) => {
    if (typeof processor === "string") {
      const entry = PROCESSOR_REGISTRY[processor];
      return entry.processor(currentData) as FeatureCollection<G, P>;
    } else {
      return processor(currentData);
    }
  }, data);
}

/**
 * Get all processor names from the registry
 */
export function getAllProcessorNames(): ProcessorName[] {
  return Object.keys(PROCESSOR_REGISTRY) as ProcessorName[];
}

/**
 * Get processors by tag
 */
export function getProcessorsByTag(tag: string): ProcessorEntry[] {
  return Object.values(PROCESSOR_REGISTRY).filter((entry) =>
    entry.metadata.tags?.includes(tag)
  );
}
