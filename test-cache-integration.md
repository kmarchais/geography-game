# GeoJSON Cache Integration Test

## Manual Testing Steps

### 1. Test Cache Miss (First Load)
1. Open browser to http://localhost:3000/geography-game/
2. Open browser DevTools Console
3. Click on "Europe" game (or any continent game)
4. Expected console output: `[GeoJSON Cache] Cache miss for https://..., fetching...`
5. Game should load normally

### 2. Test Cache Hit (Subsequent Loads)
1. Return to home page (without refreshing browser)
2. Click on "Europe" game again
3. Expected console output: `[GeoJSON Cache] Cache hit for https://...`
4. Game should load much faster (no network request)

### 3. Verify Different Processors
1. Play "Europe" game
2. Return home and play "Asia" game
3. Expected: Both should show cache misses on first load (different processors)
4. Return home and replay "Europe"
5. Expected: Should show cache hit (same URL + same processors)

### 4. Verify Cache Stats
1. In browser console, run: `window.__geojsonCacheStats = () => console.log(geojsonCache.getStats())`
2. Expected output showing cache size, maxSize, etc.

## Performance Expectations

- **First load**: Network fetch time (500ms - 2s depending on connection)
- **Cached load**: < 10ms (instant)
- **Cache size**: Grows with each unique game played (up to 50 entries)
- **Cache TTL**: Entries expire after 30 minutes of inactivity

## Automated Test Coverage

The following test files verify cache behavior:
- `src/utils/geo/geojsonCache.spec.ts` - Core cache functionality
- Cache integration is tested through MapGame component behavior

## Known Limitations

1. Cache is in-memory only (cleared on page refresh)
2. Service worker caching (PR 4.2) will add persistent offline support
3. Cache eviction uses simple LRU (oldest entry removed when full)
