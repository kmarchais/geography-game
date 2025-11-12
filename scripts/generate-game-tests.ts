/**
 * Script to generate integration tests for all game configurations
 *
 * Usage: npx tsx scripts/generate-game-tests.ts
 */

import fs from 'fs'
import path from 'path'
import { applyProcessors } from '../src/utils/geo/processors'
import type { FeatureCollection, Geometry } from 'geojson'
import type { GeoJSONProperties } from '../src/utils/geojsonUtils'

interface GameConfig {
  id: string
  name: string
  category: string
  route: string
  config: {
    dataUrl: string
    propertyName: string
    processors?: string[]
  }
}

async function analyzeGame(configPath: string): Promise<{
  config: GameConfig
  uniqueCount: number
  totalCount: number
  hasWorldWrapping: boolean
}> {
  // Read config
  const config: GameConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'))

  console.log(`Analyzing ${config.name}...`)

  // Resolve data URL (handle local files)
  let dataUrl = config.config.dataUrl
  if (dataUrl.startsWith('./')) {
    // Local file - read from public directory
    const localPath = path.join(process.cwd(), 'public', dataUrl.substring(2))
    if (!fs.existsSync(localPath)) {
      throw new Error(`Local file not found: ${localPath}`)
    }
    const fileContent = fs.readFileSync(localPath, 'utf-8')
    const data: FeatureCollection<Geometry, GeoJSONProperties> = JSON.parse(fileContent)

    // Process local data
    let processedData = data
    if (config.config.processors && config.config.processors.length > 0) {
      processedData = applyProcessors(data, config.config.processors)
    }

    const hasWorldWrapping = config.config.processors?.includes('worldWrapping') ?? false

    // Count unique entities (excluding wrapped copies)
    const uniqueEntities = processedData.features
      .filter((feature) => {
        const props = feature.properties as any
        return !props?.isEastCopy && !props?.isWestCopy
      })
      .map((feature) => {
        const value = feature.properties?.[config.config.propertyName]
        // Convert numbers to strings (e.g., Paris arrondissements use numeric IDs)
        return typeof value === 'number' ? String(value) : value
      })
      .filter((name): name is string =>
        typeof name === 'string' && name.trim() !== '' && name !== 'Unknown'
      )

    return {
      config,
      uniqueCount: uniqueEntities.length,
      totalCount: processedData.features.length,
      hasWorldWrapping
    }
  }

  // Fetch remote GeoJSON data
  const response = await fetch(dataUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${config.name}: ${response.status}`)
  }
  const data: FeatureCollection<Geometry, GeoJSONProperties> = await response.json()

  // Apply processors if any
  let processedData = data
  if (config.config.processors && config.config.processors.length > 0) {
    processedData = applyProcessors(data, config.config.processors)
  }

  const hasWorldWrapping = config.config.processors?.includes('worldWrapping') ?? false

  // Count unique entities (excluding wrapped copies)
  const uniqueEntities = processedData.features
    .filter((feature) => {
      const props = feature.properties as any
      return !props?.isEastCopy && !props?.isWestCopy
    })
    .map((feature) => {
      const value = feature.properties?.[config.config.propertyName]
      // Convert numbers to strings (e.g., Paris arrondissements use numeric IDs)
      return typeof value === 'number' ? String(value) : value
    })
    .filter((name): name is string =>
      typeof name === 'string' && name.trim() !== '' && name !== 'Unknown'
    )

  return {
    config,
    uniqueCount: uniqueEntities.length,
    totalCount: processedData.features.length,
    hasWorldWrapping
  }
}

function generateTestFile(
  configPath: string,
  analysis: {
    config: GameConfig
    uniqueCount: number
    totalCount: number
    hasWorldWrapping: boolean
  }
): string {
  const { config, uniqueCount, totalCount, hasWorldWrapping } = analysis

  const relativePath = path.relative(
    path.dirname(configPath),
    'src/utils/geo'
  )
  const configFileName = path.basename(configPath)

  const wrappingMultiplier = hasWorldWrapping ? 3 : 1
  const escapedName = config.name.replace(/'/g, "\\'") // Escape single quotes
  const isLocalFile = config.config.dataUrl.startsWith('./')

  const dataFetchCode = isLocalFile
    ? `    // Local file - read from public directory
    const fs = await import('fs')
    const path = await import('path')
    const localPath = path.join(process.cwd(), 'public', gameConfig.config.dataUrl.substring(2))
    const fileContent = fs.readFileSync(localPath, 'utf-8')
    const data: FeatureCollection<Geometry, GeoJSONProperties> = JSON.parse(fileContent)`
    : `    // Fetch the GeoJSON data from remote URL
    const response = await fetch(gameConfig.config.dataUrl)
    if (!response.ok) {
      throw new Error(\`Failed to fetch GeoJSON: \${response.status}\`)
    }
    const data: FeatureCollection<Geometry, GeoJSONProperties> = await response.json()`

  return `import { describe, it, expect, beforeAll } from 'vitest'
import { applyProcessors } from '${relativePath}/processors'
import gameConfig from './${configFileName}'
import type { FeatureCollection, Geometry } from 'geojson'
import type { GeoJSONProperties } from '${relativePath}/../geojsonUtils'

describe('${escapedName} Game Configuration', () => {
  let processedData: FeatureCollection<Geometry, GeoJSONProperties>

  beforeAll(async () => {
${dataFetchCode}

    // Apply processors as configured
    if (gameConfig.config.processors) {
      processedData = applyProcessors(data, gameConfig.config.processors)
    } else {
      processedData = data
    }
  }, 30000) // 30 second timeout for network request

  it('should have exactly ${uniqueCount} unique territories', () => {
    // Extract unique entity names by filtering out world-wrapped copies
    const uniqueEntities = processedData.features
      .filter((feature) => {
        // Only include original features (not wrapped copies)
        const props = feature.properties as any
        return !props?.isEastCopy && !props?.isWestCopy
      })
      .map((feature) => {
        const value = feature.properties?.[gameConfig.config.propertyName]
        // Convert numbers to strings (e.g., Paris arrondissements use numeric IDs)
        return typeof value === 'number' ? String(value) : value
      })
      .filter((name): name is string =>
        typeof name === 'string' && name.trim() !== '' && name !== 'Unknown'
      )

    expect(uniqueEntities).toHaveLength(${uniqueCount})
  })

  it('should have ${totalCount} total features${hasWorldWrapping ? ` after world wrapping (${uniqueCount} × ${wrappingMultiplier})` : ''}', () => {
    expect(processedData.features).toHaveLength(${totalCount})
  })${hasWorldWrapping ? `

  it('should mark wrapped copies with isEastCopy and isWestCopy', () => {
    const eastCopies = processedData.features.filter(
      (f) => (f.properties as any)?.isEastCopy
    )
    const westCopies = processedData.features.filter(
      (f) => (f.properties as any)?.isWestCopy
    )
    const originals = processedData.features.filter(
      (f) => !(f.properties as any)?.isEastCopy && !(f.properties as any)?.isWestCopy
    )

    expect(originals).toHaveLength(${uniqueCount})
    expect(eastCopies).toHaveLength(${uniqueCount})
    expect(westCopies).toHaveLength(${uniqueCount})
  })` : ''}

  it('should have all entities with valid names', () => {
    const uniqueEntities = processedData.features
      .filter((feature) => {
        const props = feature.properties as any
        return !props?.isEastCopy && !props?.isWestCopy
      })
      .map((feature) => {
        const value = feature.properties?.[gameConfig.config.propertyName]
        // Convert numbers to strings (e.g., Paris arrondissements use numeric IDs)
        return typeof value === 'number' ? String(value) : value
      })

    uniqueEntities.forEach((name) => {
      expect(typeof name).toBe('string')
      expect(name).not.toBe('')
      expect(name).not.toBe('Unknown')
    })
  })

  it('should have correct game metadata', () => {
    expect(gameConfig.id).toBe('${config.id}')
    expect(gameConfig.name).toBe('${escapedName}')
    expect(gameConfig.category).toBe('${config.category}')
  })
})
`
}

async function main() {
  const gamesDir = path.join(process.cwd(), 'src/config/games')

  // Find all JSON files
  const categories = ['countries', 'divisions', 'cities']

  for (const category of categories) {
    const categoryDir = path.join(gamesDir, category)

    if (!fs.existsSync(categoryDir)) {
      console.log(`Skipping ${category} - directory not found`)
      continue
    }

    const files = fs.readdirSync(categoryDir).filter(f => f.endsWith('.json'))

    console.log(`\n=== Processing ${category} (${files.length} games) ===\n`)

    for (const file of files) {
      const configPath = path.join(categoryDir, file)
      const testPath = configPath.replace('.json', '.test.ts')

      // Skip if test already exists
      if (fs.existsSync(testPath)) {
        console.log(`⏭️  ${file} - test already exists`)
        continue
      }

      try {
        const analysis = await analyzeGame(configPath)
        const testContent = generateTestFile(configPath, analysis)

        fs.writeFileSync(testPath, testContent)
        console.log(`✅ ${file} - generated test (${analysis.uniqueCount} entities)`)
      } catch (error) {
        console.error(`❌ ${file} - failed:`, error instanceof Error ? error.message : error)
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  console.log('\n✨ Test generation complete!')
}

main().catch(console.error)
