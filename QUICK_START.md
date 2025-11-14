# Quick Start Guide

Get the Geography Game running locally in 5 minutes.

## Prerequisites

- **Node.js** 22+ or **Bun** 1.1+
- **Git**

## Setup (2 minutes)

```bash
# 1. Clone the repository
git clone https://github.com/kmarchais/geography-game
cd geography-game

# 2. Install dependencies
bun install
# or: npm install

# 3. Start development server
bun dev
# or: npm run dev
```

Open **http://localhost:3000** in your browser.

## Project Structure

```
src/
├── config/games/          # Game JSON configurations
│   ├── countries/         # World & continent games
│   ├── divisions/         # State/province games
│   └── cities/           # City district games
├── components/           # Vue components
│   ├── MapGame.vue      # Main game component
│   └── ...
├── composables/          # Game logic
│   ├── useMapGameLogic.ts
│   └── useGameRegistry.ts
├── utils/               # Utilities
│   ├── gameLoader.ts    # Game loading
│   └── geo/            # GeoJSON processing
└── views/              # Pages
    ├── HomeView.vue
    └── GameView.vue
```

## Add a New Game (5 minutes)

### 1. Create Game Config

Create `src/config/games/countries/my-game.json`:

```json
{
  "id": "my-game",
  "name": "My Game",
  "category": "countries",
  "featured": false,
  "difficulty": 3,
  "config": {
    "dataUrl": "https://example.com/data.geojson",
    "propertyName": "name",
    "targetLabel": "Country",
    "mapCenter": [0, 20],
    "zoom": 2,
    "processors": ["worldWrapping"]
  }
}
```

### 2. Create Test File

Create `src/config/games/countries/my-game.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import gameConfigJson from './my-game.json'
import type { GameDefinition } from '../../../types/gameRegistry'

const gameConfig = gameConfigJson as GameDefinition

describe('My Game', () => {
  it('should have valid config', () => {
    expect(gameConfig.id).toBe('my-game')
    expect(gameConfig.name).toBe('My Game')
  })
})
```

### 3. Import in Loader

Edit `src/utils/gameLoader.ts` and add your import:

```typescript
// Add to imports
import myGame from '../config/games/countries/my-game.json'

// Add to loadGamesForCategory()
case 'countries':
  return [
    // ... existing games
    myGame as GameDefinition,
  ]
```

### 4. Test It

```bash
bun run test my-game  # Run your test
bun dev               # Start server and play your game at /game/my-game
```

Done! Your game is playable at `http://localhost:3000/game/my-game`

## Common Tasks

### Run Tests

**Important:** Always use `bun run test`, not `bun test`

- ✅ `bun run test` - Uses Vitest (correct)
- ❌ `bun test` - Uses Bun's native test runner (incompatible with this project)

```bash
bun run test          # Unit tests with Vitest
bun run test:ui       # Interactive UI for tests
bun run test:coverage # With coverage report
bun run test:e2e      # E2E tests (requires Playwright)
bun run type-check    # TypeScript check
```

### Build for Production

```bash
bun run build         # Builds to dist/
bun run preview       # Preview production build
```

### Lint & Format

```bash
bun run lint          # ESLint with auto-fix
```

## Key Concepts

### Game Registry

All games are registered in a centralized registry (`useGameRegistry`) that provides:
- Filtering by category, difficulty, tags
- Featured games
- Search functionality

### GeoJSON Processing

Games use processors to transform GeoJSON data:
- `worldWrapping` - Wraps world map for seamless panning
- `filterEurope` - Filters to European countries only
- Custom processors can be added in `src/utils/geo/processors/`

### Caching

Two-level caching improves performance:
1. **In-memory cache** - 30min TTL, 50 entries (LRU)
2. **Service worker** - Stale-while-revalidate for GeoJSON

### Lazy Loading

Games are lazy-loaded by category to reduce initial bundle size:
- `loadGamesForCategory('countries')` loads only country games
- `loadAllGames()` loads all categories

## Architecture Patterns

- **Configuration-driven** - Games defined by JSON configs
- **Composable logic** - Game logic in reusable composables
- **Type-safe** - Full TypeScript with strict mode
- **Test-driven** - Every game has tests

## Need More Help?

- **Full Documentation**: See [CLAUDE.md](./CLAUDE.md)
- **Architecture**: Phase 1-4 modernization docs in `docs/performance/`
- **Testing**: See `tests/e2e/README.md`
- **Issues**: https://github.com/kmarchais/geography-game/issues

## Development Tips

1. **Hot Reload**: Vite provides instant HMR - changes reflect immediately
2. **TypeScript**: Run `bun run type-check` frequently
3. **Console Warnings**: Use `console.warn()` or `console.error()` (console.log is disabled)
4. **GeoJSON Testing**: Use https://geojson.io to test/visualize GeoJSON data
5. **Base URL**: All paths use `import.meta.env.BASE_URL` for GitHub Pages deployment

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make your changes
4. Run tests (`bun run test`)
5. Create a Pull Request

For larger changes, open an issue first to discuss.

## Tech Stack

- **Framework**: Vue 3 (Composition API)
- **UI**: Vuetify 3
- **Maps**: Leaflet
- **Build**: Vite
- **Package Manager**: Bun (or npm)
- **TypeScript**: Strict mode enabled
- **State**: Pinia + Composables
- **Router**: Vue Router 4
- **Testing**: Vitest + Playwright

---

**That's it!** You're ready to contribute. 🎉

For deeper architecture details, see [CLAUDE.md](./CLAUDE.md).
