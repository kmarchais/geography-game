#!/usr/bin/env tsx

/**
 * Intelligently update totalRounds in game configs
 *
 * Handles:
 * - GeoJSON entity counts from test files
 * - Additional manual markers (e.g., French overseas territories)
 * - Comment annotations for manual overrides
 * - Safety checks to prevent data loss
 */

import * as fs from 'fs';
import * as path from 'path';

interface GameConfig {
  id: string;
  name: string;
  category: string;
  config: {
    totalRounds?: number;
    markerFunction?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

// Find all test files
const configDir = path.join(process.cwd(), 'src', 'config', 'games');
const markersDir = path.join(process.cwd(), 'src', 'utils', 'markers');

function findTestFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findTestFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.test.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Extract entity count from test file
 * Looks for: expect(uniqueEntities).toHaveLength(NUMBER)
 */
function extractGeoJSONCount(testFilePath: string): number | null {
  const content = fs.readFileSync(testFilePath, 'utf-8');

  // Match: expect(uniqueEntities).toHaveLength(NUMBER)
  const match = content.match(/expect\(uniqueEntities\)\.toHaveLength\((\d+)\)/);

  if (match) {
    return parseInt(match[1], 10);
  }

  return null;
}

/**
 * Extract manual override from test file comment
 * Looks for: // TOTAL_ROUNDS: NUMBER
 */
function extractManualOverride(testFilePath: string): number | null {
  const content = fs.readFileSync(testFilePath, 'utf-8');

  // Match: // TOTAL_ROUNDS: 109
  const match = content.match(/\/\/\s*TOTAL_ROUNDS:\s*(\d+)/);

  if (match) {
    return parseInt(match[1], 10);
  }

  return null;
}

/**
 * Count additional territories from marker function
 * E.g., frenchTerritories.ts exports additionalTerritories array
 */
function countMarkerFunctionTerritories(markerFunctionName: string): number | null {
  try {
    const markerFilePath = path.join(markersDir, `${markerFunctionName}.ts`);

    if (!fs.existsSync(markerFilePath)) {
      return null;
    }

    const content = fs.readFileSync(markerFilePath, 'utf-8');

    // Look for: export const additionalTerritories: Territory[] = [...]
    // Count the array items
    const arrayMatch = content.match(/export\s+const\s+additionalTerritories[^=]*=\s*\[([\s\S]*?)\]/);

    if (arrayMatch) {
      const arrayContent = arrayMatch[1];
      // Count objects by counting opening braces
      const objectCount = (arrayContent.match(/\{/g) || []).length;
      return objectCount;
    }

    return null;
  } catch (error) {
    console.error(`⚠️  Error reading marker function file:`, error);
    return null;
  }
}

/**
 * Determine the correct totalRounds value
 */
function determineTotalRounds(
  testFilePath: string,
  config: GameConfig
): {
  totalRounds: number | null;
  source: string;
  warning?: string;
} {
  // 1. Check for manual override comment
  const manualOverride = extractManualOverride(testFilePath);
  if (manualOverride !== null) {
    return {
      totalRounds: manualOverride,
      source: 'manual override in test file',
    };
  }

  // 2. Extract GeoJSON count
  const geoJSONCount = extractGeoJSONCount(testFilePath);
  if (geoJSONCount === null) {
    return {
      totalRounds: null,
      source: 'none',
      warning: 'Could not extract entity count from test file',
    };
  }

  // 3. Check if game has marker function (additional territories)
  const markerFunctionName = config.config.markerFunction;
  if (markerFunctionName) {
    const markerCount = countMarkerFunctionTerritories(markerFunctionName);

    if (markerCount !== null) {
      return {
        totalRounds: geoJSONCount + markerCount,
        source: `GeoJSON (${geoJSONCount}) + marker function (${markerCount})`,
      };
    } else {
      return {
        totalRounds: null,
        source: 'marker function',
        warning: `Has marker function "${markerFunctionName}" but couldn't count territories. Add comment: // TOTAL_ROUNDS: N`,
      };
    }
  }

  // 4. Use GeoJSON count
  return {
    totalRounds: geoJSONCount,
    source: 'GeoJSON entities',
  };
}

function updateGameConfig(jsonFilePath: string, newTotalRounds: number, source: string, dryRun: boolean = false): boolean {
  const content = fs.readFileSync(jsonFilePath, 'utf-8');
  const config: GameConfig = JSON.parse(content);

  const currentValue = config.config.totalRounds;

  if (currentValue === newTotalRounds) {
    console.log(`⏭️  ${config.name}: already has totalRounds=${newTotalRounds}`);
    return false;
  }

  // Safety check: warn if decreasing value (might have manual markers)
  if (currentValue && newTotalRounds < currentValue) {
    console.log(`⚠️  ${config.name}: Would DECREASE from ${currentValue} to ${newTotalRounds} (${source})`);
    console.log(`   This might indicate manual markers. Check if markerFunction is set.`);

    if (!dryRun) {
      console.log(`   Skipping update for safety. Add // TOTAL_ROUNDS: ${currentValue} to test file to preserve.`);
      return false;
    }
  }

  if (dryRun) {
    console.log(`[DRY RUN] ${config.name}: ${currentValue || 'none'} → ${newTotalRounds} (${source})`);
    return true;
  }

  config.config.totalRounds = newTotalRounds;
  fs.writeFileSync(jsonFilePath, JSON.stringify(config, null, 2) + '\n');

  const action = currentValue ? `${currentValue} → ${newTotalRounds}` : newTotalRounds;
  console.log(`✅ ${config.name}: ${action} (${source})`);

  return true;
}

// Main execution
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || args.includes('-n');

if (dryRun) {
  console.log('🔍 DRY RUN MODE - No files will be modified\n');
}

console.log('🔍 Finding test files...\n');

const testFiles = findTestFiles(configDir);
let updated = 0;
let skipped = 0;
let warnings = 0;

for (const testFile of testFiles) {
  // Get corresponding JSON file
  const jsonFile = testFile.replace('.test.ts', '.json');

  if (!fs.existsSync(jsonFile)) {
    console.log(`⚠️  JSON file not found: ${jsonFile}`);
    warnings++;
    continue;
  }

  const content = fs.readFileSync(jsonFile, 'utf-8');
  const config: GameConfig = JSON.parse(content);

  const result = determineTotalRounds(testFile, config);

  if (result.warning) {
    console.log(`⚠️  ${config.name}: ${result.warning}`);
    warnings++;
    continue;
  }

  if (result.totalRounds === null) {
    console.log(`⚠️  ${config.name}: Could not determine totalRounds`);
    warnings++;
    continue;
  }

  const changed = updateGameConfig(jsonFile, result.totalRounds, result.source, dryRun);

  if (changed) {
    updated++;
  } else {
    skipped++;
  }
}

console.log(`\n✨ Complete! ${dryRun ? '[DRY RUN] ' : ''}Updated ${updated} configs, skipped ${skipped}, ${warnings} warnings`);

if (dryRun) {
  console.log(`\n💡 Run without --dry-run to apply changes`);
}
