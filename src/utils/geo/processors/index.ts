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
      const europeanCountries = new Set([
        "Albania",
        "Andorra",
        "Austria",
        "Belarus",
        "Belgium",
        "Bosnia and Herzegovina",
        "Bulgaria",
        "Croatia",
        "Cyprus",
        "Czech Republic",
        "Czechia",
        "Denmark",
        "Estonia",
        "Finland",
        "France",
        "Germany",
        "Greece",
        "Hungary",
        "Iceland",
        "Ireland",
        "Italy",
        "Kosovo",
        "Latvia",
        "Liechtenstein",
        "Lithuania",
        "Luxembourg",
        "Malta",
        "Moldova",
        "Monaco",
        "Montenegro",
        "Netherlands",
        "North Macedonia",
        "Norway",
        "Poland",
        "Portugal",
        "Romania",
        "San Marino",
        "Serbia",
        "Slovakia",
        "Slovenia",
        "Spain",
        "Sweden",
        "Switzerland",
        "Ukraine",
        "United Kingdom",
        "Vatican City",
      ]);

      return {
        ...data,
        features: data.features.filter((feature) => {
          const name = feature.properties?.name as string | undefined;
          return name && europeanCountries.has(name);
        }),
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
      const asianCountries = new Set([
        "Afghanistan",
        "Armenia",
        "Azerbaijan",
        "Bahrain",
        "Bangladesh",
        "Bhutan",
        "Brunei",
        "Cambodia",
        "China",
        "Georgia",
        "India",
        "Indonesia",
        "Iran",
        "Iraq",
        "Israel",
        "Japan",
        "Jordan",
        "Kazakhstan",
        "Kuwait",
        "Kyrgyzstan",
        "Laos",
        "Lebanon",
        "Malaysia",
        "Maldives",
        "Mongolia",
        "Myanmar",
        "Nepal",
        "North Korea",
        "Oman",
        "Pakistan",
        "Palestine",
        "Philippines",
        "Qatar",
        "Russia",
        "Saudi Arabia",
        "Singapore",
        "South Korea",
        "Sri Lanka",
        "Syria",
        "Taiwan",
        "Tajikistan",
        "Thailand",
        "Timor-Leste",
        "Turkey",
        "Turkmenistan",
        "United Arab Emirates",
        "Uzbekistan",
        "Vietnam",
        "Yemen",
      ]);

      return {
        ...data,
        features: data.features.filter((feature) => {
          const name = feature.properties?.name as string | undefined;
          return name && asianCountries.has(name);
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
      const africanCountries = new Set([
        "Algeria",
        "Angola",
        "Benin",
        "Botswana",
        "Burkina Faso",
        "Burundi",
        "Cameroon",
        "Cape Verde",
        "Central African Republic",
        "Chad",
        "Comoros",
        "Congo",
        "Democratic Republic of the Congo",
        "Djibouti",
        "Egypt",
        "Equatorial Guinea",
        "Eritrea",
        "Eswatini",
        "Ethiopia",
        "Gabon",
        "Gambia",
        "Ghana",
        "Guinea",
        "Guinea-Bissau",
        "Ivory Coast",
        "Kenya",
        "Lesotho",
        "Liberia",
        "Libya",
        "Madagascar",
        "Malawi",
        "Mali",
        "Mauritania",
        "Mauritius",
        "Morocco",
        "Mozambique",
        "Namibia",
        "Niger",
        "Nigeria",
        "Rwanda",
        "Sao Tome and Principe",
        "Senegal",
        "Seychelles",
        "Sierra Leone",
        "Somalia",
        "South Africa",
        "South Sudan",
        "Sudan",
        "Tanzania",
        "Togo",
        "Tunisia",
        "Uganda",
        "Zambia",
        "Zimbabwe",
      ]);

      return {
        ...data,
        features: data.features.filter((feature) => {
          const name = feature.properties?.name as string | undefined;
          return name && africanCountries.has(name);
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
      const northAmericanCountries = new Set([
        "Antigua and Barbuda",
        "Bahamas",
        "Barbados",
        "Belize",
        "Canada",
        "Costa Rica",
        "Cuba",
        "Dominica",
        "Dominican Republic",
        "El Salvador",
        "Grenada",
        "Guatemala",
        "Haiti",
        "Honduras",
        "Jamaica",
        "Mexico",
        "Nicaragua",
        "Panama",
        "Saint Kitts and Nevis",
        "Saint Lucia",
        "Saint Vincent and the Grenadines",
        "Trinidad and Tobago",
        "United States",
        "United States of America",
      ]);

      return {
        ...data,
        features: data.features.filter((feature) => {
          const name = feature.properties?.name as string | undefined;
          return name && northAmericanCountries.has(name);
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
      const southAmericanCountries = new Set([
        "Argentina",
        "Bolivia",
        "Brazil",
        "Chile",
        "Colombia",
        "Ecuador",
        "Guyana",
        "Paraguay",
        "Peru",
        "Suriname",
        "Uruguay",
        "Venezuela",
      ]);

      return {
        ...data,
        features: data.features.filter((feature) => {
          const name = feature.properties?.name as string | undefined;
          return name && southAmericanCountries.has(name);
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
      const oceaniaCountries = new Set([
        "Australia",
        "Fiji",
        "Kiribati",
        "Marshall Islands",
        "Micronesia",
        "Nauru",
        "New Zealand",
        "Palau",
        "Papua New Guinea",
        "Samoa",
        "Solomon Islands",
        "Tonga",
        "Tuvalu",
        "Vanuatu",
      ]);

      return {
        ...data,
        features: data.features.filter((feature) => {
          const name = feature.properties?.name as string | undefined;
          return name && oceaniaCountries.has(name);
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
