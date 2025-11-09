# GeoJSON Caching System

## Overview

The GeoJSON caching system provides in-memory caching of fetched and processed GeoJSON data, significantly improving game load times for repeat plays and reducing network requests.

## Features

- **LRU Cache**: Least Recently Used eviction strategy with configurable size (default: 50 entries)
- **Time-to-Live**: Automatic expiration after 30 minutes
- **Processor-Aware**: Caches processed data based on URL + processor combination
- **Automatic Cleanup**: Expired entries cleared every 5 minutes
- **Cache Statistics**: Built-in stats tracking (size, max size, hit rate)

## Architecture

### Cache Key Generation

Cache keys are generated from the combination of:
1. **GeoJSON URL**: The source data URL
2. **Processors**: Array of processor names (e.g., `["filterEurope"]`)

This ensures that:
- Same game = cache hit
- Different processors = different cache entry (correct!)
- Different URLs = different cache entry

**Example:**
```typescript
// Different cache entries
"https://example.com/world.geojson" + [] → Key 1
"https://example.com/world.geojson" + ["filterEurope"] → Key 2
"https://example.com/world.geojson" + ["filterAsia"] → Key 3
```

### Cache Entry Structure

```typescript
interface CacheEntry {
  data: FeatureCollection;     // Processed GeoJSON data
  timestamp: number;            // Creation timestamp (for TTL)
  processorHash: string;        // Processor signature (for validation)
}
```

### Integration Flow

```
Game Load
    ↓
GameView.vue
    ↓ (passes processors)
MapGame.vue
    ↓ (uses fetchAndCacheGeoJSON)
geojsonCache
    ↓
├─ Cache Hit  → Return cached data (< 10ms)
└─ Cache Miss → Fetch → Process → Cache → Return (500ms - 2s)
```

## Usage

### In Components

```vue
<template>
  <MapGame
    :geojson-url="config.dataUrl"
    :processors="config.processors"
    ...other props
  />
</template>
```

MapGame automatically uses the cache when `processors` prop is provided.

### Direct API Usage

```typescript
import { fetchAndCacheGeoJSON } from '@/utils/geo/geojsonCache';

// Fetch with caching
const data = await fetchAndCacheGeoJSON(
  'https://example.com/data.geojson',
  ['filterEurope', 'worldWrapping']
);
```

### Cache Management

```typescript
import {
  clearGeoJSONCache,
  getGeoJSONCacheStats,
  clearExpiredGeoJSONCache
} from '@/utils/geo/geojsonCache';

// Clear entire cache
clearGeoJSONCache();

// Get statistics
const stats = getGeoJSONCacheStats();
console.log(stats); // { size: 10, maxSize: 50, hitRate: 0 }

// Clear only expired entries
clearExpiredGeoJSONCache();
```

## Performance Impact

### Baseline (Before Caching)

- First load: 500ms - 2s (network fetch + processing)
- Second load: 500ms - 2s (no caching)
- Network requests: Every game load

### With Caching

- First load: 500ms - 2s (network fetch + processing + cache store)
- Cached load: < 10ms (in-memory retrieval)
- Network requests: Only on cache misses

### Expected Improvements

Based on issue #48 target: **~60% faster processing**

**Typical User Journey:**
1. Play "Europe Countries" → 1.5s (cache miss)
2. Return home and replay → < 10ms (cache hit) ✨ **~99% faster**
3. Play "Asia Countries" → 1.5s (cache miss, different processors)
4. Play "Europe Countries" again → < 10ms (cache hit from step 1)

## Cache Behavior

### Cache Hits

A cache hit occurs when:
- Same URL
- Same processors (order matters!)
- Entry not expired (< 30 minutes old)

### Cache Misses

A cache miss occurs when:
- URL never fetched before
- Different processors
- Entry expired (> 30 minutes old)
- Cache was cleared

### LRU Eviction

When cache reaches 50 entries:
1. Oldest (least recently used) entry is removed
2. New entry is added

Access pattern updates "last used" time, keeping frequently accessed games in cache.

## Configuration

### Default Settings

```typescript
const geojsonCache = new GeoJSONCache(
  maxSize: 50,      // Max entries before LRU eviction
  maxAge: 30 * 60 * 1000  // 30 minutes in milliseconds
);
```

### Automatic Cleanup

```typescript
// Runs every 5 minutes (browser only)
setInterval(() => {
  clearExpiredGeoJSONCache();
}, 5 * 60 * 1000);
```

## Testing

### Test Coverage

- ✅ Cache storage and retrieval
- ✅ URL differentiation
- ✅ Processor differentiation
- ✅ LRU eviction
- ✅ TTL expiration
- ✅ Fetch integration
- ✅ Processor application
- ✅ Error handling

### Running Tests

```bash
npm test src/utils/geo/geojsonCache.spec.ts
```

## Browser DevTools Debugging

### View Cache Logs

Open browser console and play games. You'll see:
```
[GeoJSON Cache] Cache miss for https://..., fetching...
[GeoJSON Cache] Cache hit for https://...
```

### Inspect Cache State

```javascript
// Access cache stats (if exposed in debug builds)
console.log(geojsonCache.getStats());
// { size: 10, maxSize: 50, hitRate: 0 }
```

## Limitations & Future Work

### Current Limitations

1. **In-Memory Only**: Cache cleared on page refresh
2. **No Persistence**: Doesn't survive browser restarts
3. **Single Tab**: Each browser tab has separate cache

### Future Enhancements (See PR 4.2)

- Service Worker caching for offline support
- IndexedDB persistence across sessions
- Shared cache across tabs (Service Worker)
- Cache preloading for popular games

## Migration Notes

### Backward Compatibility

The cache is **fully backward compatible**:
- Components without `processors` prop: Use direct fetch (no caching)
- Components with `processors` prop: Use cached fetch
- Legacy `processGeojsonDataFn`: Still supported

### Upgrading Components

**Before:**
```vue
<MapGame
  :geojson-url="url"
  :process-geojson-data-fn="customProcessor"
/>
```

**After (with caching):**
```vue
<MapGame
  :geojson-url="url"
  :processors="['filterEurope']"
/>
```

## Performance Monitoring

### Metrics to Track

1. **Cache Hit Rate**: % of requests served from cache
2. **Average Load Time**: First load vs cached load
3. **Memory Usage**: Cache size over time
4. **Network Requests**: Reduction in GeoJSON fetches

### Analytics Integration

```typescript
// Example: Track cache performance
const stats = getGeoJSONCacheStats();
analytics.track('cache_stats', {
  size: stats.size,
  maxSize: stats.maxSize,
  // Add custom metrics
});
```

## Related

- **PR 4.2**: Service Worker caching (offline support)
- **PR 4.3**: Lazy loading game configs
- **PR 4.4**: Bundle size optimization
