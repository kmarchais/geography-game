# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a geography learning game built with Vue 3, Vuetify 3, and Leaflet maps. Users can play various map-based geography games including identifying countries, administrative divisions, and city districts across different regions of the world. The application includes authentication via Google OAuth and an admin dashboard.

## Commands

### Development
```bash
bun dev          # Start dev server on http://localhost:3000
bun install      # Install dependencies
```

### Building
```bash
bun run build       # Build for production
bun run build-only  # Build without type checking
bun run preview     # Preview production build locally
```

### Code Quality
```bash
bun run type-check  # Run TypeScript type checker (vue-tsc)
bun run lint        # Run ESLint with auto-fix
```

### Maintenance & Scripts
```bash
bun run update-total-rounds  # Update totalRounds in all game configs
```

**Note:** The `totalRounds` field in game configs is automatically updated before each build via the `prebuild` script. The script extracts entity counts from test files and updates the JSON configs accordingly. This ensures `totalRounds` stays in sync with actual GeoJSON data without manual counting.

## Architecture

### Core Game System

The application uses a **JSON-driven game registry architecture**. All 27 games are defined as JSON configuration files in `src/config/games/` organized by category:
- `countries/` - World and continent-based country games (7 games)
- `divisions/` - Administrative divisions (states, provinces, departments) (13 games)
- `cities/` - City district games (7 games)

Each game is defined by a `GameDefinition` object (see `src/types/game.d.ts`) that includes:
- Game metadata (id, name, category, difficulty, tags)
- GeoJSON data source URL
- Map center, zoom, and bounds
- Property name to extract entity names
- Optional GeoJSON processors (worldWrapping, filterEurope, etc.)
- Optional marker functions for additional territories

Games are loaded dynamically via `useGameRegistry` composable and routed through the `GameView` component at `/game/:gameId`.

### Component Architecture

**Core Game Components:**
- `MapGame.vue` - Generic map-based geography game component that accepts a `GameConfig`
- `GameView.vue` - Dynamic game loader that routes games by ID using the game registry
- `GameButton.vue` - Reusable game button with difficulty indicators
- `GameCategorySection.vue` - Category organizer with themed styling
- `CapitalGame.vue` - Capital cities quiz game
- `FlagGame.vue` - Country flag identification game

**Home & Navigation:**
- `HomeView.vue` - Dynamic home page with search and category-based game organization
- Pulls games from the registry and displays them by category
- Includes real-time search filtering across game names and tags

### Game Logic Composables

Game logic is extracted into reusable composables:
- `useMapGameLogic.ts` - Core map game logic with weighted scoring system (4/2/1/0 points)
- `useCapitalGameLogic.ts` - Capital cities game logic
- `useFlagGameLogic.ts` - Flag game logic
- `useGameRegistry.ts` - Game registry management with filtering and search capabilities

### State Management

The application uses **Pinia stores** for centralized state management with localStorage persistence:
- `useAuthStore` - Authentication state (login status, user profile, Google OAuth)
- `useStatsStore` - User statistics tracking (game results, scores, timing, accuracy)
  - Automatic migration for legacy data
  - Zod schema validation for data integrity
  - Export/import functionality for stats backup

### Routing & Authentication

- Routes are defined in `src/router/index.ts`
- Admin routes require `meta: { requiresAuth: true, requiresAdmin: true }`
- Authentication guard checks `isLoggedIn` and `userProfile.is_admin` before allowing access
- Google OAuth integration via `src/components/auth/GoogleLoginButton.vue`

### GeoJSON Processing

`src/utils/geojsonUtils.ts` provides utilities for:
- Leaflet styling functions (`defaultStyle`, `selectedStyle`, `getStyleForAttempts`)
- Layer animations (`animateLayer`)
- Type guards (`isFeatureCollection`)

`src/utils/geo/processors.ts` provides a registry of GeoJSON processors:
- `worldWrapping` - Creates ±360° longitude copies for seamless panning
- `filterEurope`, `filterAsia`, `filterAfrica`, etc. - Continent filters
- Processors can be chained via the `processors` array in game configs

### Styling

- Vuetify theming with custom SCSS settings in `src/styles/settings.scss`
- Theme-aware map styling using `useTheme()` composable from Vuetify
- Leaflet CSS imported in components that use maps

## Deployment

The project uses GitHub Actions for CI/CD (`.github/workflows/deploy.yml`):
- Builds are deployed to GitHub Pages (gh-pages branch)
- Main branch deploys to root
- PR branches deploy to `/geography-game/{branch-name}/` subdirectories for preview
- Type checking runs on every build
- Environment variables: `VITE_GOOGLE_CLIENT_ID`, `VITE_BACKEND_API_URL`

The app also supports deployment to Railway via the `start` script in package.json.

## Important Paths & Conventions

- Base URL is configured via `import.meta.env.BASE_URL` (defaults to `/geography-game/`)
- Static GeoJSON files are stored in `public/data/` (e.g., `paris_districts.geojson`)
- TypeScript types are in `src/types/`
- Path alias `@/` maps to `src/`

## Adding a New Game

To add a new map-based geography game:

1. **Create a JSON configuration file** in `src/config/games/[category]/your-game.json`:
   ```json
   {
     "id": "your-game-id",
     "name": "Your Game Name",
     "category": "countries|divisions|cities",
     "route": "/game/your-game-id",
     "difficulty": 1-5,
     "config": {
       "dataUrl": "https://example.com/data.geojson",
       "mapCenter": [lat, lng],
       "zoom": 5,
       "propertyName": "name",
       "targetLabel": "Territory",
       "totalRounds": 50,
       "processors": ["worldWrapping"] // optional
     }
   }
   ```

2. **Create a test file** `src/config/games/[category]/your-game.test.ts` to validate the config and GeoJSON data

3. **Import the game** in `src/utils/gameLoader.ts`:
   ```typescript
   import yourGame from '@/config/games/[category]/your-game.json';
   // Add to ALL_GAMES array
   ```

4. The game will automatically appear on the home page in its category section

If using local GeoJSON data, place it in `public/data/` and reference via `${import.meta.env.BASE_URL}data/filename.geojson`.

## Technology Stack

- **Frontend Framework:** Vue 3 (Composition API with `<script setup>`)
- **UI Library:** Vuetify 3
- **Mapping:** Leaflet
- **Build Tool:** Vite
- **Package Manager:** Bun
- **TypeScript:** Full type safety with vue-tsc and strict mode enabled
- **Router:** Vue Router 4
- **State Management:** Pinia with localStorage persistence
- **Testing:** Vitest (unit tests) + Playwright (E2E tests)
- **Validation:** Zod for runtime schema validation
