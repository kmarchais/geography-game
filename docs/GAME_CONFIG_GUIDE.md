# Game Configuration Guide

This guide explains how to create and maintain game configurations for the Geography Game.

## Table of Contents
- [Overview](#overview)
- [File Structure](#file-structure)
- [totalRounds Automation](#totalrounds-automation)
- [Games with Manual Markers](#games-with-manual-markers)
- [Validation](#validation)
- [Troubleshooting](#troubleshooting)

## Overview

Each game consists of two files:
- `{game-id}.json` - Game configuration
- `{game-id}.test.ts` - Test file that validates GeoJSON data

The `totalRounds` field is **automatically calculated** from test files to ensure accuracy.

## File Structure

### Game Config (`*.json`)

```json
{
  "id": "example-game",
  "name": "Example Game",
  "category": "countries",
  "route": "/game/example-game",
  "icon": "mdi-map",
  "emoji": "🌍",
  "color": "blue",
  "description": "Game description",
  "tags": ["tag1", "tag2"],
  "difficulty": 3,
  "featured": false,
  "estimatedTime": 15,
  "config": {
    "dataUrl": "https://example.com/data.geojson",
    "mapCenter": [0, 0],
    "zoom": 5,
    "propertyName": "name",
    "targetLabel": "Country",
    "totalRounds": 50,  // ← Auto-calculated, don't edit manually
    "processors": ["worldWrapping"],
    "markerFunction": "exampleMarkers"  // Optional
  }
}
```

### Test File (`*.test.ts`)

```typescript
describe('Example Game Configuration', () => {
  it('should have exactly 50 unique territories from GeoJSON', () => {
    const uniqueEntities = processedData.features
      .filter((feature) => {
        const props = feature.properties as any
        return !props?.isEastCopy && !props?.isWestCopy
      })
      .map((feature) => feature.properties?.[gameConfig.config.propertyName])
      .filter((name): name is string =>
        typeof name === 'string' && name.trim() !== '' && name !== 'Unknown'
      )

    expect(uniqueEntities).toHaveLength(50)  // ← This number is used for automation
  })
})
```

## totalRounds Automation

### How It Works

The `add-total-rounds.ts` script automatically calculates `totalRounds` by:

1. **Extracting GeoJSON count** from test files
   - Looks for: `expect(uniqueEntities).toHaveLength(NUMBER)`

2. **Adding marker function territories** (if applicable)
   - Reads `markerFunction` from config
   - Counts territories in `src/utils/markers/{markerFunction}.ts`
   - Looks for: `export const additionalTerritories: Territory[] = [...]`

3. **Checking for manual overrides**
   - Looks for comment: `// TOTAL_ROUNDS: NUMBER` in test file

### Running the Script

```bash
# Update all game configs
bun run update-total-rounds

# Dry-run mode (preview changes)
bun run scripts/add-total-rounds.ts --dry-run

# Validate without modifying
bun run validate-total-rounds
```

### Example Output

```
✅ French Departments: 101 → 109 (GeoJSON (101) + marker function (8))
⏭️  World Countries: already has totalRounds=241
⚠️  Custom Game: Would DECREASE from 150 to 100 (GeoJSON entities)
```

## Games with Manual Markers

Some games have territories that don't exist in GeoJSON data (e.g., small islands, overseas territories). These use **marker functions**.

### Example: French Departments

**Config:**
```json
{
  "id": "french-departments",
  "config": {
    "dataUrl": "https://.../departements-avec-outre-mer.geojson",
    "propertyName": "nom",
    "totalRounds": 109,  // 101 from GeoJSON + 8 from markers
    "markerFunction": "frenchTerritories"
  }
}
```

**Marker Function (`src/utils/markers/frenchTerritories.ts`):**
```typescript
export const additionalTerritories: Territory[] = [
  { name: 'Saint Pierre et Miquelon', lat: 46.83, lng: -56.33, code: '975' },
  { name: 'Wallis et Futuna', lat: -13.77, lng: -177.15, code: '986' },
  // ... 6 more territories (8 total)
]
```

**Test File:**
```typescript
it('should have exactly 101 unique territories from GeoJSON', () => {
  // Only tests GeoJSON data, not markers
  expect(uniqueEntities).toHaveLength(101)
})

it('should have totalRounds set to 109 (101 from GeoJSON + 8 from marker function)', () => {
  expect(gameConfig.config.totalRounds).toBe(109)
})
```

**Automation:**
- Script detects `markerFunction: "frenchTerritories"`
- Counts 8 territories in `frenchTerritories.ts`
- Calculates: `101 (GeoJSON) + 8 (markers) = 109`
- Updates `totalRounds` to 109 ✅

### Creating a New Marker Function

1. **Create marker file**: `src/utils/markers/myMarkers.ts`
   ```typescript
   export const additionalTerritories: Territory[] = [
     { name: 'Territory 1', lat: 0, lng: 0, code: 'T1' },
     { name: 'Territory 2', lat: 1, lng: 1, code: 'T2' },
   ]

   export function addMyMarkers(
     map: L.Map,
     available: Ref<string[]>,
     found: Ref<Map<string, number>>,
     clickHandler: (name: string, latlng: L.LatLng) => void
   ): void {
     // Add markers to map...
   }
   ```

2. **Register in `src/utils/markers/index.ts`**:
   ```typescript
   import { addMyMarkers } from './myMarkers'

   const markerFunctions: Record<string, AddManualMarkersFunc> = {
     frenchTerritories: addFrenchTerritoryMarkers,
     myMarkers: addMyMarkers,  // ← Add here
   }
   ```

3. **Update game config**:
   ```json
   {
     "config": {
       "markerFunction": "myMarkers"
     }
   }
   ```

4. **Run automation**:
   ```bash
   bun run update-total-rounds
   ```

## Validation

### CI/CD Validation

Every pull request automatically validates game data integrity:

```yaml
- name: Validate game data integrity
  run: bun run validate-total-rounds
```

This prevents incorrect `totalRounds` from being deployed.

### Manual Validation

```bash
# Validate all configs
bun run validate-total-rounds

# Output:
# ✅ Validated: 28
# ⚠️  Warnings: 0
# ❌ Errors: 0
```

### Safety Features

The automation script has built-in safety checks:

1. **Prevents accidental decreases**:
   ```
   ⚠️  Custom Game: Would DECREASE from 150 to 100
      Skipping update for safety.
      Add // TOTAL_ROUNDS: 150 to test file to preserve.
   ```

2. **Warns about missing data**:
   ```
   ⚠️  Example Game: Has marker function "foo" but couldn't count territories
      Add comment: // TOTAL_ROUNDS: N
   ```

## Manual Overrides

If automation doesn't work for your use case, add a comment to the test file:

```typescript
// TOTAL_ROUNDS: 150

describe('Custom Game Configuration', () => {
  it('should have entities', () => {
    // ... tests ...
  })
})
```

The script will use `150` instead of calculating automatically.

## Troubleshooting

### Problem: totalRounds is wrong after running script

**Symptom**:
```
✅ French Departments: 101 territories
```
But you know there should be 109.

**Cause**: Game uses manual markers, but script didn't detect them.

**Solution**:
1. Check `markerFunction` is set in config
2. Verify `additionalTerritories` array exists in marker file
3. Ensure marker function is registered in `src/utils/markers/index.ts`
4. Run with dry-run to debug:
   ```bash
   bun run scripts/add-total-rounds.ts --dry-run
   ```

### Problem: Validation fails in CI/CD

**Symptom**:
```
❌ French Departments: totalRounds mismatch!
   Expected: 109 (GeoJSON (101) + markers (8))
   Actual: 101
```

**Solution**:
```bash
# Fix locally
bun run update-total-rounds

# Verify
bun run validate-total-rounds

# Commit
git add .
git commit -m "fix: Update totalRounds for games with marker functions"
```

### Problem: Script can't extract entity count

**Symptom**:
```
⚠️  Example Game: Could not extract entity count from test file
```

**Cause**: Test file doesn't match expected pattern.

**Solution**: Ensure test has this exact pattern:
```typescript
expect(uniqueEntities).toHaveLength(50)
```

Or use manual override:
```typescript
// TOTAL_ROUNDS: 50
```

## Best Practices

1. **Never manually edit `totalRounds`** - Let automation handle it
2. **Always run validation before committing**:
   ```bash
   bun run validate-total-rounds
   ```
3. **Use marker functions for additional territories** - Don't hardcode
4. **Test your changes**:
   ```bash
   # Dry-run to preview
   bun run scripts/add-total-rounds.ts --dry-run

   # Apply changes
   bun run update-total-rounds

   # Validate
   bun run validate-total-rounds
   ```
5. **CI/CD will catch errors** - But fix locally first

## Summary

- `totalRounds` is **auto-calculated** from test files
- Games with `markerFunction` get **automatic territory counting**
- **Validation runs in CI/CD** to prevent incorrect data
- **Safety checks** prevent accidental data loss
- Use **manual overrides** (`// TOTAL_ROUNDS: N`) for special cases

This ensures that `totalRounds` is **always accurate** and **never forgotten**.
