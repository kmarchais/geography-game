/**
 * JSON Schema for game configuration validation
 * Based on http://json-schema.org/draft-07/schema#
 */
export const GAME_CONFIG_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["id", "name", "category", "route", "config"],
  properties: {
    id: {
      type: "string",
      pattern: "^[a-z0-9-]+$",
      minLength: 1,
      description: "Unique identifier in kebab-case format",
      examples: ["world-countries", "us-states", "paris-districts"],
    },
    name: {
      type: "string",
      minLength: 1,
      description: "Human-readable display name",
      examples: ["World Countries", "US States", "Paris Districts"],
    },
    category: {
      type: "string",
      enum: ["countries", "divisions", "cities", "capitals", "flags"],
      description: "Game category for grouping and filtering",
    },
    route: {
      type: "string",
      pattern: "^/game/[a-z0-9-]+$",
      description: "URL route path for the game",
      examples: ["/game/world-countries", "/game/us-states"],
    },
    icon: {
      type: "string",
      pattern: "^mdi-[a-z0-9-]+$",
      description: "Material Design Icon name",
      examples: ["mdi-earth", "mdi-flag", "mdi-city"],
    },
    emoji: {
      type: "string",
      minLength: 1,
      maxLength: 4,
      description: "Emoji character for visual representation",
      examples: ["🌍", "🗺️", "🏙️"],
    },
    color: {
      type: "string",
      description: "Vuetify color name",
      examples: ["blue-darken-1", "green", "red-lighten-2"],
    },
    description: {
      type: "string",
      description: "Optional game description",
    },
    tags: {
      type: "array",
      items: {
        type: "string",
        minLength: 1,
      },
      uniqueItems: true,
      description: "Tags for search and filtering",
      examples: [["europe", "easy", "geography"]],
    },
    difficulty: {
      type: "integer",
      minimum: 1,
      maximum: 5,
      description: "Difficulty level from 1 (easiest) to 5 (hardest)",
    },
    featured: {
      type: "boolean",
      description: "Whether this game is featured",
      default: false,
    },
    estimatedTime: {
      type: "integer",
      minimum: 1,
      description: "Estimated completion time in minutes",
    },
    config: {
      type: "object",
      required: ["dataUrl", "mapCenter", "zoom", "propertyName", "targetLabel"],
      properties: {
        name: {
          type: "string",
          description: "Configuration name",
        },
        dataUrl: {
          type: "string",
          description: "URL to GeoJSON data source",
        },
        mapCenter: {
          type: "array",
          items: { type: "number" },
          minItems: 2,
          maxItems: 2,
          description: "Map center coordinates [latitude, longitude]",
          examples: [[48.8566, 2.3522]],
        },
        zoom: {
          type: "number",
          minimum: 1,
          maximum: 20,
          description: "Initial zoom level",
        },
        maxBounds: {
          type: "array",
          items: {
            type: "array",
            items: { type: "number" },
            minItems: 2,
            maxItems: 2,
          },
          minItems: 2,
          maxItems: 2,
          description: "Map bounds [[south, west], [north, east]]",
        },
        propertyName: {
          type: "string",
          description: "GeoJSON property containing entity name",
        },
        targetLabel: {
          type: "string",
          description: "Label for the target entity",
          examples: ["Country", "State", "District"],
        },
        totalRounds: {
          type: "integer",
          minimum: 1,
          description: "Total number of rounds for the game",
        },
        processors: {
          type: "array",
          items: {
            type: "string",
          },
          description: "List of processor names to apply to GeoJSON data",
          examples: [["worldWrapping"], ["filterEurope", "worldWrapping"]],
        },
      },
      additionalProperties: true,
      description: "Game configuration object",
    },
  },
  additionalProperties: false,
} as const;

/**
 * Type guard to check if a value matches the game config schema
 */
export function isValidGameDefinition(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // Check required fields
  if (
    typeof obj.id !== "string" ||
    typeof obj.name !== "string" ||
    typeof obj.category !== "string" ||
    typeof obj.route !== "string" ||
    typeof obj.config !== "object"
  ) {
    return false;
  }

  // Validate ID format
  if (!/^[a-z0-9-]+$/.test(obj.id)) {
    return false;
  }

  // Validate category
  const validCategories = ["countries", "divisions", "cities", "capitals", "flags"];
  if (!validCategories.includes(obj.category)) {
    return false;
  }

  // Validate route format
  if (!/^\/game\/[a-z0-9-]+$/.test(obj.route)) {
    return false;
  }

  // Validate optional fields
  if (obj.difficulty !== undefined) {
    if (
      typeof obj.difficulty !== "number" ||
      obj.difficulty < 1 ||
      obj.difficulty > 5 ||
      !Number.isInteger(obj.difficulty)
    ) {
      return false;
    }
  }

  if (obj.tags !== undefined) {
    if (!Array.isArray(obj.tags) || !obj.tags.every((tag) => typeof tag === "string")) {
      return false;
    }
  }

  return true;
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Validates a game definition and returns detailed errors
 */
export function validateGameDefinition(value: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (typeof value !== "object" || value === null) {
    errors.push({ field: "root", message: "Value must be an object" });
    return errors;
  }

  const obj = value as Record<string, unknown>;

  // Check required fields
  if (typeof obj.id !== "string") {
    errors.push({ field: "id", message: "ID is required and must be a string" });
  } else if (!/^[a-z0-9-]+$/.test(obj.id)) {
    errors.push({
      field: "id",
      message: "ID must be in kebab-case (lowercase letters, numbers, hyphens)",
      value: obj.id,
    });
  }

  if (typeof obj.name !== "string") {
    errors.push({ field: "name", message: "Name is required and must be a string" });
  } else if (obj.name.trim().length === 0) {
    errors.push({ field: "name", message: "Name cannot be empty" });
  }

  if (typeof obj.category !== "string") {
    errors.push({ field: "category", message: "Category is required and must be a string" });
  } else {
    const validCategories = ["countries", "divisions", "cities", "capitals", "flags"];
    if (!validCategories.includes(obj.category)) {
      errors.push({
        field: "category",
        message: `Category must be one of: ${validCategories.join(", ")}`,
        value: obj.category,
      });
    }
  }

  if (typeof obj.route !== "string") {
    errors.push({ field: "route", message: "Route is required and must be a string" });
  } else if (!/^\/game\/[a-z0-9-]+$/.test(obj.route)) {
    errors.push({
      field: "route",
      message: "Route must start with /game/ and contain only lowercase letters, numbers, and hyphens",
      value: obj.route,
    });
  }

  if (typeof obj.config !== "object" || obj.config === null) {
    errors.push({ field: "config", message: "Config is required and must be an object" });
  }

  // Validate optional fields
  if (obj.difficulty !== undefined) {
    if (typeof obj.difficulty !== "number") {
      errors.push({ field: "difficulty", message: "Difficulty must be a number" });
    } else if (obj.difficulty < 1 || obj.difficulty > 5 || !Number.isInteger(obj.difficulty)) {
      errors.push({
        field: "difficulty",
        message: "Difficulty must be an integer between 1 and 5",
        value: obj.difficulty,
      });
    }
  }

  if (obj.tags !== undefined) {
    if (!Array.isArray(obj.tags)) {
      errors.push({ field: "tags", message: "Tags must be an array" });
    } else if (!obj.tags.every((tag) => typeof tag === "string")) {
      errors.push({ field: "tags", message: "All tags must be strings" });
    }
  }

  if (obj.icon !== undefined && typeof obj.icon === "string") {
    if (!/^mdi-[a-z0-9-]+$/.test(obj.icon)) {
      errors.push({
        field: "icon",
        message: "Icon must be a Material Design Icon name (mdi-*)",
        value: obj.icon,
      });
    }
  }

  if (obj.featured !== undefined && typeof obj.featured !== "boolean") {
    errors.push({ field: "featured", message: "Featured must be a boolean" });
  }

  if (obj.estimatedTime !== undefined) {
    if (typeof obj.estimatedTime !== "number" || obj.estimatedTime < 1 || !Number.isInteger(obj.estimatedTime)) {
      errors.push({
        field: "estimatedTime",
        message: "Estimated time must be a positive integer",
        value: obj.estimatedTime,
      });
    }
  }

  return errors;
}
