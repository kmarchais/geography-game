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

The application uses a **configuration-driven architecture** for games. Each game is defined by a `GameConfig` object (see `src/types/game.d.ts`) that specifies:
- GeoJSON data source URL
- Map center, zoom, and bounds
- Property name to extract entity names
- Optional data processing, filtering, and name mapping functions

Game configurations are centralized in:
- `src/utils/worldCountriesConfig.ts` - World map configurations
- `src/utils/cityDistrictsConfig.ts` - City district configurations (Paris, London, Barcelona, Bordeaux)
- `src/utils/capitalCitiesData.ts` - Capital cities data

### Component Architecture

**Reusable Game Components:**
- `MapGame.vue` - Generic map-based geography game component that accepts a `GameConfig`
- `CapitalGame.vue` - Capital cities quiz game
- `FlagGame.vue` - Country flag identification game

**Game-Specific Components:**
The app has multiple specific game components in:
- `src/components/WorldCountries/` - World and continent-based country games
- `src/components/AdministrativeDivisions/` - State/province/department games
- `src/components/CityDistricts/` - City district games

Each specific component typically wraps `MapGame.vue` with a specific `GameConfig`.

### Game Logic Composables

Game logic is extracted into reusable composables:
- `useMapGameLogic.ts` - Core map game logic (score, rounds, timer, feedback)
- `useCapitalGameLogic.ts` - Capital cities game logic
- `useFlagGameLogic.ts` - Flag game logic
- `useAuth.ts` - Authentication state management with localStorage persistence

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

World map games use special processing (`processData` in `worldCountriesConfig.ts`) to create wrapped world copies at -360° and +360° longitude for seamless panning.

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

1. Create a `GameConfig` in the appropriate config file (`worldCountriesConfig.ts` or `cityDistrictsConfig.ts`)
2. Create a component that uses `MapGame.vue` and passes the config as a prop
3. Add route in `src/router/index.ts`
4. Add navigation link in `HomeView.vue`

If the game uses local GeoJSON data, place the file in `public/data/` and reference it using `${import.meta.env.BASE_URL}data/filename.geojson`.

## Technology Stack

- **Frontend Framework:** Vue 3 (Composition API with `<script setup>`)
- **UI Library:** Vuetify 3
- **Mapping:** Leaflet
- **Build Tool:** Vite
- **Package Manager:** Bun
- **TypeScript:** Full type safety with vue-tsc
- **Router:** Vue Router 4
- **State:** Reactive composables (no Pinia currently used)
