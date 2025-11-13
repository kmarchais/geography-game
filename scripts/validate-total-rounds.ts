#!/usr/bin/env tsx

/**
 * Validate that all game configs have correct totalRounds
 *
 * This script checks that totalRounds matches:
 * - GeoJSON entity count (from test files)
 * - Plus any additional marker function territories
 *
 * Exits with error code if any mismatches are found.
 * Use in CI/CD to prevent incorrect data from being deployed.
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

function extractGeoJSONCount(testFilePath: string): number | null {
  const content = fs.readFileSync(testFilePath, 'utf-8');
  const match = content.match(/expect\(uniqueEntities\)\.toHaveLength\((\d+)\)/);
  return match ? parseInt(match[1], 10) : null;
}

function extractManualOverride(testFilePath: string): number | null {
  const content = fs.readFileSync(testFilePath, 'utf-8');
  const match = content.match(/\/\/\s*TOTAL_ROUNDS:\s*(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function countMarkerFunctionTerritories(markerFunctionName: string): number | null {
  try {
    const markerFilePath = path.join(markersDir, `${markerFunctionName}.ts`);
    if (!fs.existsSync(markerFilePath)) {return null;}

    const content = fs.readFileSync(markerFilePath, 'utf-8');
    const arrayMatch = content.match(/export\s+const\s+additionalTerritories[^=]*=\s*\[([\s\S]*?)\]/);

    if (arrayMatch) {
      const objectCount = (arrayMatch[1].match(/\{/g) || []).length;
      return objectCount;
    }

    return null;
  } catch {
    return null;
  }
}

function calculateExpectedTotalRounds(testFilePath: string, config: GameConfig): {
  expected: number | null;
  source: string;
  canValidate: boolean;
} {
  // 1. Manual override takes precedence
  const manualOverride = extractManualOverride(testFilePath);
  if (manualOverride !== null) {
    return {
      expected: manualOverride,
      source: 'manual override',
      canValidate: true,
    };
  }

  // 2. Extract GeoJSON count
  const geoJSONCount = extractGeoJSONCount(testFilePath);
  if (geoJSONCount === null) {
    return {
      expected: null,
      source: 'test file',
      canValidate: false,
    };
  }

  // 3. Check for marker function
  const markerFunctionName = config.config.markerFunction;
  if (markerFunctionName) {
    const markerCount = countMarkerFunctionTerritories(markerFunctionName);
    if (markerCount !== null) {
      return {
        expected: geoJSONCount + markerCount,
        source: `GeoJSON (${geoJSONCount}) + markers (${markerCount})`,
        canValidate: true,
      };
    } else {
      return {
        expected: null,
        source: 'marker function',
        canValidate: false,
      };
    }
  }

  // 4. Just GeoJSON
  return {
    expected: geoJSONCount,
    source: 'GeoJSON',
    canValidate: true,
  };
}

// Main validation
console.log('🔍 Validating totalRounds in all game configs...\n');

const testFiles = findTestFiles(configDir);
let errors = 0;
let warnings = 0;
let validated = 0;

for (const testFile of testFiles) {
  const jsonFile = testFile.replace('.test.ts', '.json');

  if (!fs.existsSync(jsonFile)) {
    console.error(`❌ Missing JSON file: ${jsonFile}`);
    errors++;
    continue;
  }

  const content = fs.readFileSync(jsonFile, 'utf-8');
  const config: GameConfig = JSON.parse(content);

  const result = calculateExpectedTotalRounds(testFile, config);

  if (!result.canValidate) {
    console.warn(`⚠️  ${config.name}: Cannot validate (${result.source} unavailable)`);
    warnings++;
    continue;
  }

  const actual = config.config.totalRounds;

  if (actual === undefined) {
    console.error(`❌ ${config.name}: Missing totalRounds field`);
    errors++;
    continue;
  }

  if (actual !== result.expected) {
    console.error(`❌ ${config.name}: totalRounds mismatch!`);
    console.error(`   Expected: ${result.expected} (${result.source})`);
    console.error(`   Actual: ${actual}`);
    console.error(`   → Run: bun run scripts/add-total-rounds.ts`);
    errors++;
    continue;
  }

  validated++;
}

console.log(`\n📊 Results:`);
console.log(`   ✅ Validated: ${validated}`);
console.log(`   ⚠️  Warnings: ${warnings}`);
console.log(`   ❌ Errors: ${errors}`);

if (errors > 0) {
  console.error(`\n❌ Validation failed! ${errors} game(s) have incorrect totalRounds.`);
  console.error(`   Fix by running: bun run scripts/add-total-rounds.ts`);
  process.exit(1);
}

if (warnings > 0) {
  console.warn(`\n⚠️  ${warnings} game(s) could not be validated.`);
  console.warn(`   This is usually okay if tests are skipped or manual overrides are needed.`);
}

console.log(`\n✅ All validations passed!`);
process.exit(0);
