# Changelog

All notable changes to the Geography Game will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-11-13

### 🎉 Major Modernization Release

This release represents a comprehensive modernization of the entire application, introducing a JSON-driven game registry system, weighted scoring, enhanced statistics, and extensive testing infrastructure.

### ✨ Added

#### Game Registry System
- **JSON-driven game configurations**: All 27 games migrated to JSON config files in `src/config/games/`
- **Dynamic game loading**: Games loaded via `useGameRegistry` composable and routed through `GameView` component
- **GeoJSON processor registry**: 7 reusable processors (worldWrapping, filterEurope, filterAsia, etc.)
- **Game metadata**: Difficulty levels, tags, featured flags, estimated completion times
- **Category organization**: Games organized into countries (7), divisions (13), and cities (7)

#### Weighted Scoring System
- **Point-based scoring**: 4 points (1st try), 2 points (2nd try), 1 point (3rd try), 0 points (failed/skipped)
- **Display score**: Floored to 0-100 scale (only perfect games achieve 100 points)
- **Raw percentage tracking**: Full precision stored for leaderboard tiebreaking
- **Leaderboard utilities**: Comprehensive tiebreaking logic (score → raw % → time)

#### Enhanced Statistics & Visualization
- **Interactive pie chart**: Custom SVG chart (`StatsChart.vue`) with hover tooltips showing territory names
- **Comprehensive stats dashboard**: Overview cards, most played games, best performances, recent games history
- **Stats export/import**: Backup and restore functionality with Zod validation
- **Color-coded performance**: Visual breakdown (🟢 1st try, 🟡 2nd try, 🟠 3rd try, 🔴 failed, ⚪ skipped)

#### Testing Infrastructure
- **Vitest setup**: 200+ unit tests for composables, components, and utilities
- **Playwright E2E tests**: 65+ tests validating game loading, navigation, and gameplay
- **Test coverage**: Comprehensive coverage for all game logic and core components
- **Validation report**: 100% feature parity confirmed for all migrated games

#### State Management
- **Pinia stores**: Centralized state management with `useAuthStore` and `useStatsStore`
- **localStorage persistence**: Automatic saving and loading of user data
- **Data migration**: Automatic migration for legacy data structures
- **Zod validation**: Runtime schema validation for all stored data

#### Performance & Optimization
- **Service worker**: Offline support with GeoJSON caching strategy
- **Lazy loading**: Dynamic imports for game components
- **Cache warming**: Preload featured games on app startup
- **Bundle optimization**: Efficient code splitting and tree shaking

#### Developer Experience
- **Automated totalRounds calculation**: Script extracts counts from test files and updates configs
- **Validation script**: Pre-deployment checks ensure config accuracy
- **QUICK_START.md**: 5-minute setup guide for new contributors
- **TypeScript strict mode**: Full type safety with noUncheckedIndexedAccess
- **Stricter ESLint rules**: Enhanced code quality with consistent style

### 🔄 Changed

#### Breaking Changes
- **Scoring algorithm**: Changed from simple ratio (correct/total) to weighted system (4/2/1/0)
  - *Migration*: Old scores automatically migrated with `rawScorePercentage = score`
- **Game routing**: Legacy routes now redirect to `/game/:gameId` pattern
- **Score display**: Changed from "X/Y" format to "X points" format
- **Data structure**: `GameResult` now includes `rawScorePercentage` field
  - *Migration*: Automatic on first app load, no user action required

#### Improvements
- **Home page**: Dynamic search functionality with real-time filtering
- **Game buttons**: Now show difficulty indicators with color-coded chips
- **Territory counts**: All games display correct entity counts (no more hardcoded limits)
- **Europe game**: Now shows all 55 territories (was 50) - includes Gibraltar, Svalbard, merged Cyprus
- **Australia game**: Now shows all 9 territories (was 8) - includes Jervis Bay Territory
- **Navigation**: Improved UX with category sections and themed styling

### 🐛 Fixed
- Fixed totalRounds miscalculation for games with marker functions
- Fixed TypeScript type errors in tests and environment definitions
- Fixed sass-embedded build error by using legacy API
- Fixed French Departments game count from 101 to 109 territories
- Fixed mixed line endings in validation script
- Resolved node_modules corruption issues in CI
- Fixed bundle visualizer plugin causing CI build hangs

### 📚 Documentation
- Added CLAUDE.md with comprehensive architecture documentation
- Added QUICK_START.md for new contributors
- Added E2E testing guide in `tests/e2e/README.md`
- Added validation report in `tests/e2e/VALIDATION.md`
- Added performance documentation in `docs/performance/`
- Updated all inline code documentation

### 🔧 Infrastructure
- Migrated from npm to Bun package manager
- Added pre-commit hooks for code quality
- Added prebuild script for automatic config updates
- Enhanced CI/CD pipeline with comprehensive checks
- Added Netlify deploy preview for PR branches

### 🗑️ Removed
- Removed ~1,800 lines of legacy game components
- Removed duplicate world wrapping logic (now in `worldWrapping` processor)
- Removed hardcoded territory limits from game configs
- Removed console.log statements from production code

### 📊 Statistics
- **186 files changed**: 20,735 additions, 9,440 deletions
- **Net change**: +11,295 lines
- **56 commits** in modernization branch
- **27 games** migrated to JSON configuration
- **53 test files** with 200+ unit tests
- **65+ E2E tests** with 100% feature parity validation

### 🎯 Future Enhancements Ready
- Backend leaderboard integration (tiebreaking logic complete)
- User authentication with backend sync
- Score weight adjustments (easily configurable via constants)
- Additional game types (infrastructure ready)
- Multiplayer support (foundation in place)

---

## [0.0.0] - 2025-11-09

Initial release with basic geography game functionality.
