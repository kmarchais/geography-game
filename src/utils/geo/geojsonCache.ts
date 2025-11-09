import type { FeatureCollection, Geometry, GeoJsonProperties } from "geojson";
import { applyProcessors, type ProcessorName } from "./processors/index";

/**
 * Cache entry for processed GeoJSON data
 */
interface CacheEntry<
  G extends Geometry = Geometry,
  P extends GeoJsonProperties = GeoJsonProperties
> {
  /**
   * The processed GeoJSON data
   */
  data: FeatureCollection<G, P>;

  /**
   * Timestamp when the data was cached
   */
  timestamp: number;

  /**
   * Hash of the processors used to generate this data
   */
  processorHash: string;
}

/**
 * In-memory cache for processed GeoJSON data
 * Uses LRU (Least Recently Used) eviction strategy
 */
class GeoJSONCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;
  private maxAge: number; // in milliseconds

  /**
   * @param maxSize - Maximum number of entries to cache (default: 50)
   * @param maxAge - Maximum age of cached entries in milliseconds (default: 30 minutes)
   */
  constructor(maxSize = 50, maxAge = 30 * 60 * 1000) {
    this.maxSize = maxSize;
    this.maxAge = maxAge;
  }

  /**
   * Generate a cache key from URL and processors
   */
  private generateKey(url: string, processors: (ProcessorName | string)[]): string {
    const processorHash = processors.join(",");
    return `${url}|${processorHash}`;
  }

  /**
   * Generate a hash of the processors for validation
   */
  private generateProcessorHash(processors: (ProcessorName | string)[]): string {
    return processors.map(p => typeof p === "string" ? p : "custom").join(",");
  }

  /**
   * Check if an entry is still valid
   */
  private isValid(entry: CacheEntry): boolean {
    const age = Date.now() - entry.timestamp;
    return age < this.maxAge;
  }

  /**
   * Get cached data if available and valid
   */
  get<
    G extends Geometry = Geometry,
    P extends GeoJsonProperties = GeoJsonProperties
  >(
    url: string,
    processors: (ProcessorName | string)[]
  ): FeatureCollection<G, P> | null {
    const key = this.generateKey(url, processors);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (!this.isValid(entry)) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data as FeatureCollection<G, P>;
  }

  /**
   * Store data in cache
   */
  set<
    G extends Geometry = Geometry,
    P extends GeoJsonProperties = GeoJsonProperties
  >(
    url: string,
    processors: (ProcessorName | string)[],
    data: FeatureCollection<G, P>
  ): void {
    const key = this.generateKey(url, processors);

    // Evict oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const entry: CacheEntry<G, P> = {
      data,
      timestamp: Date.now(),
      processorHash: this.generateProcessorHash(processors),
    };

    this.cache.set(key, entry);
  }

  /**
   * Check if data exists in cache and is valid
   */
  has(url: string, processors: (ProcessorName | string)[]): boolean {
    const key = this.generateKey(url, processors);
    const entry = this.cache.get(key);
    return entry !== undefined && this.isValid(entry);
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isValid(entry)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Would need to track hits/misses to calculate
    };
  }

  /**
   * Get cache size in entries
   */
  get size(): number {
    return this.cache.size;
  }
}

// Global cache instance
const geojsonCache = new GeoJSONCache();

/**
 * Fetch and process GeoJSON data with caching
 *
 * This function automatically caches the result of fetching and processing
 * GeoJSON data. Subsequent calls with the same URL and processors will
 * return the cached result.
 *
 * @param url - URL to fetch GeoJSON data from
 * @param processors - Array of processors to apply
 * @returns Processed GeoJSON FeatureCollection
 *
 * @example
 * ```ts
 * const data = await fetchAndCacheGeoJSON(
 *   'https://example.com/countries.geojson',
 *   ['filterEurope', 'worldWrapping']
 * );
 * ```
 */
export async function fetchAndCacheGeoJSON<
  G extends Geometry = Geometry,
  P extends GeoJsonProperties = GeoJsonProperties
>(
  url: string,
  processors: ProcessorName[] = []
): Promise<FeatureCollection<G, P>> {
  // Check cache first
  const cached = geojsonCache.get<G, P>(url, processors);
  if (cached) {
    console.log(`[GeoJSON Cache] Cache hit for ${url}`);
    return cached;
  }

  console.log(`[GeoJSON Cache] Cache miss for ${url}, fetching...`);

  // Fetch data
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const rawData = await response.json() as FeatureCollection<G, P>;

  // Apply processors
  const processedData = processors.length > 0
    ? applyProcessors(rawData, processors)
    : rawData;

  // Cache the result
  geojsonCache.set(url, processors, processedData);

  return processedData as FeatureCollection<G, P>;
}

/**
 * Clear the GeoJSON cache
 */
export function clearGeoJSONCache(): void {
  geojsonCache.clear();
}

/**
 * Get cache statistics
 */
export function getGeoJSONCacheStats() {
  return geojsonCache.getStats();
}

/**
 * Clear expired cache entries
 */
export function clearExpiredGeoJSONCache(): void {
  geojsonCache.clearExpired();
}

// Automatically clear expired entries every 5 minutes
if (typeof window !== "undefined") {
  setInterval(() => {
    clearExpiredGeoJSONCache();
  }, 5 * 60 * 1000);
}

export { geojsonCache };
