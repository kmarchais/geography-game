#!/usr/bin/env tsx

/**
 * Add totalRounds to all game configs based on test file data
 */

import * as fs from 'fs';
import * as path from 'path';

interface GameConfig {
  id: string;
  name: string;
  category: string;
  config: {
    totalRounds?: number;
    [key: string]: any;
  };
  [key: string]: any;
}

// Find all test files
const configDir = path.join(process.cwd(), 'src', 'config', 'games');

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

function extractEntityCount(testFilePath: string): number | null {
  const content = fs.readFileSync(testFilePath, 'utf-8');

  // Match: expect(uniqueEntities).toHaveLength(NUMBER)
  const match = content.match(/expect\(uniqueEntities\)\.toHaveLength\((\d+)\)/);

  if (match) {
    return parseInt(match[1], 10);
  }

  return null;
}

function updateGameConfig(jsonFilePath: string, totalRounds: number): void {
  const content = fs.readFileSync(jsonFilePath, 'utf-8');
  const config: GameConfig = JSON.parse(content);

  // Only update if totalRounds doesn't exist or is different
  if (config.config.totalRounds !== totalRounds) {
    config.config.totalRounds = totalRounds;

    // Write back with 2-space indentation
    fs.writeFileSync(jsonFilePath, JSON.stringify(config, null, 2) + '\n');
    console.log(`✅ ${config.name}: ${totalRounds} territories`);
  } else {
    console.log(`⏭️  ${config.name}: already has totalRounds=${totalRounds}`);
  }
}

// Main execution
console.log('🔍 Finding test files...\n');

const testFiles = findTestFiles(configDir);
let updated = 0;
let skipped = 0;

for (const testFile of testFiles) {
  const entityCount = extractEntityCount(testFile);

  if (entityCount === null) {
    console.log(`⚠️  Could not extract entity count from ${testFile}`);
    continue;
  }

  // Get corresponding JSON file
  const jsonFile = testFile.replace('.test.ts', '.json');

  if (!fs.existsSync(jsonFile)) {
    console.log(`⚠️  JSON file not found: ${jsonFile}`);
    continue;
  }

  const content = fs.readFileSync(jsonFile, 'utf-8');
  const config: GameConfig = JSON.parse(content);

  if (config.config.totalRounds === entityCount) {
    skipped++;
  } else {
    updated++;
  }

  updateGameConfig(jsonFile, entityCount);
}

console.log(`\n✨ Complete! Updated ${updated} configs, skipped ${skipped} (already up to date)`);
