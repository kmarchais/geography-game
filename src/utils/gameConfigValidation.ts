/**
 * Zod schemas for runtime game configuration validation
 */

import { z } from 'zod'

/**
 * Game category enum
 */
export const GameCategorySchema = z.enum(['countries', 'divisions', 'cities'])

/**
 * Difficulty level (1-5)
 */
export const DifficultySchema = z.number().int().min(1).max(5)

/**
 * Game configuration schema
 */
export const GameConfigSchema = z.object({
  dataUrl: z.string().refine(
    (url) => {
      // Accept full URLs (http/https)
      if (url.startsWith('http://') || url.startsWith('https://')) {
        try {
          new URL(url)
          return true
        } catch {
          return false
        }
      }
      // Accept absolute paths (starting with /)
      return url.startsWith('/')
    },
    { message: 'dataUrl must be a valid URL or absolute path starting with /' }
  ),
  mapCenter: z.tuple([z.number(), z.number()]),
  zoom: z.number().positive(),
  propertyName: z.string().min(1),
  targetLabel: z.string().min(1),
  totalRounds: z.number().int().positive(),
  processors: z.array(z.string()).optional(),
  markerFunction: z.string().optional(),
})

/**
 * Full game definition schema
 */
export const GameDefinitionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, 'ID must be kebab-case'),
  name: z.string().min(1),
  category: GameCategorySchema,
  route: z.string().regex(/^\/game\/[a-z0-9-]+$/, 'Route must be /game/{id}'),
  icon: z.string().optional(),
  emoji: z.string().optional(),
  color: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  difficulty: DifficultySchema,
  featured: z.boolean().optional(),
  estimatedTime: z.number().int().positive().optional(),
  config: GameConfigSchema,
})

/**
 * Type-safe game definition extracted from schema
 */
export type ValidatedGameDefinition = z.infer<typeof GameDefinitionSchema>

/**
 * Validates a game definition and returns typed result
 * @throws ZodError if validation fails
 */
export function validateGameDefinition(data: unknown): ValidatedGameDefinition {
  return GameDefinitionSchema.parse(data)
}

/**
 * Validates a game definition and returns success/error result
 */
export function safeValidateGameDefinition(data: unknown): {
  success: boolean
  data?: ValidatedGameDefinition
  error?: z.ZodError
} {
  const result = GameDefinitionSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  } else {
    return { success: false, error: result.error }
  }
}

/**
 * Validates multiple game definitions
 */
export function validateGameDefinitions(
  games: unknown[]
): { valid: ValidatedGameDefinition[]; invalid: Array<{ index: number; error: z.ZodError }> } {
  const valid: ValidatedGameDefinition[] = []
  const invalid: Array<{ index: number; error: z.ZodError }> = []

  games.forEach((game, index) => {
    const result = GameDefinitionSchema.safeParse(game)
    if (result.success) {
      valid.push(result.data)
    } else {
      invalid.push({ index, error: result.error })
    }
  })

  return { valid, invalid }
}
