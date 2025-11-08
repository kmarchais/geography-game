# Geography Game - Pull Request Strategy

**Version:** 1.0
**Date:** 2025-01-08
**Total PRs:** 25-30
**Estimated Timeline:** 6-10 weeks

---

## Table of Contents

1. [PR Strategy Overview](#pr-strategy-overview)
2. [PR Numbering Convention](#pr-numbering-convention)
3. [Branching Strategy](#branching-strategy)
4. [Phase 1 PRs: Foundation](#phase-1-prs-foundation)
5. [Phase 2 PRs: Game Registry](#phase-2-prs-game-registry)
6. [Phase 3 PRs: State Management](#phase-3-prs-state-management)
7. [Phase 4 PRs: Performance](#phase-4-prs-performance)
8. [Phase 5 PRs: Features](#phase-5-prs-features)
9. [PR Review Guidelines](#pr-review-guidelines)
10. [Deployment Strategy](#deployment-strategy)
11. [Parallel Work Opportunities](#parallel-work-opportunities)

---

## PR Strategy Overview

### Principles

1. **Small, Focused PRs** - Each PR should do ONE thing well
2. **Independent Deployment** - Each PR should be deployable on its own
3. **Incremental Value** - Each PR should add value or reduce risk
4. **Easy Rollback** - Each PR should be independently revertable
5. **Fast Review** - Target <500 lines changed per PR (excluding generated code)

### PR Size Guidelines

| Size | Lines Changed | Review Time | Approval Required |
|------|---------------|-------------|-------------------|
| XS | <100 | <30 min | 1 reviewer |
| S | 100-300 | 30-60 min | 1 reviewer |
| M | 300-500 | 1-2 hours | 2 reviewers |
| L | 500-1000 | 2-4 hours | 2 reviewers |
| XL | >1000 | >4 hours | Avoid! Split it up |

### PR Template

```markdown
## Description
[What does this PR do?]

## Related Issue
Closes #[issue-number]

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Refactoring
- [ ] Documentation
- [ ] Performance improvement
- [ ] Test coverage

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] All tests passing

## Deployment Notes
- [ ] Can be deployed independently
- [ ] Requires feature flag: [flag-name]
- [ ] Requires database migration: No
- [ ] Requires env variable: [var-name]

## Checklist
- [ ] Code follows project style guide
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console.log or debugging code
- [ ] TypeScript strict mode passes

## Screenshots (if applicable)
[Add screenshots for UI changes]
```

---

## PR Numbering Convention

Format: `MOD-[PHASE][NUMBER]: [Brief Description]`

Examples:
- `MOD-1.1: Setup Vitest testing infrastructure`
- `MOD-2.3: Create game registry loader`

**Phases:**
- `MOD-1.x` - Foundation & Testing
- `MOD-2.x` - Game Registry System
- `MOD-3.x` - State Management
- `MOD-4.x` - Performance Optimization
- `MOD-5.x` - New Features

---

## Branching Strategy

### Overview

To safely execute this large modernization without disrupting the main branch, we'll use a **long-lived development branch** strategy.

### Branch Structure

```
main (production)
  ↑
  └── modernization (long-lived development branch)
        ↑
        ├── feat/MOD-1.1-setup-vitest
        ├── feat/MOD-1.2-typescript-strict
        ├── feat/MOD-1.3-coordinate-transforms
        └── ... (all feature branches)
```

### Workflow

#### 1. Initial Setup

```bash
# Create the modernization branch from main
git checkout main
git pull origin main
git checkout -b modernization
git push -u origin modernization

# Protect the modernization branch in GitHub settings
# Require PR reviews, status checks, etc.
```

#### 2. For Each PR

```bash
# Create feature branch from modernization
git checkout modernization
git pull origin modernization
git checkout -b feat/MOD-1.1-setup-vitest

# Make changes, commit
git add .
git commit -m "feat: Setup Vitest testing infrastructure (MOD-1.1)"

# Push and create PR targeting modernization
git push -u origin feat/MOD-1.1-setup-vitest
gh pr create --base modernization --title "MOD-1.1: Setup Vitest testing infrastructure"
```

#### 3. PR Review and Merge

```bash
# After approval, merge PR into modernization
gh pr merge --squash  # or --merge or --rebase based on preference

# Delete feature branch
git branch -d feat/MOD-1.1-setup-vitest
git push origin --delete feat/MOD-1.1-setup-vitest
```

#### 4. Periodic Sync from Main

Keep `modernization` up-to-date with `main` to avoid large merge conflicts later:

```bash
# Weekly or bi-weekly
git checkout modernization
git pull origin modernization
git merge origin/main

# Resolve any conflicts
# Test that everything still works
git push origin modernization
```

#### 5. Merge to Main (By Phase or At End)

**Option A: Merge each phase to main**
```bash
# After Phase 1 completes and is tested
git checkout main
git pull origin main
git merge modernization --no-ff -m "Merge Phase 1: Foundation & Testing"

# Run full test suite
# Deploy to production
git push origin main

# Tag the release
git tag -a v2.0.0-phase1 -m "Phase 1: Foundation & Testing"
git push origin v2.0.0-phase1
```

**Option B: Merge all at once (recommended if phases are quick)**
```bash
# After all phases complete
git checkout main
git pull origin main
git merge modernization --no-ff -m "Merge: Complete modernization (Phases 1-5)"

# Run full test suite
# Deploy to production
git push origin main

# Tag the major release
git tag -a v2.0.0 -m "Complete modernization"
git push origin v2.0.0
```

### Benefits of This Strategy

✅ **Main stays stable**
- Production deployments continue normally
- Hotfixes can be applied to main
- No risk of breaking main during refactoring

✅ **Isolated testing environment**
- Can deploy `modernization` branch to staging
- Test cumulative changes before merging to main
- Catch integration issues early

✅ **Easy rollback**
- If issues found, simply don't merge to main
- Can abandon `modernization` branch if needed
- No production impact until final merge

✅ **Clear progress tracking**
- All modernization PRs in one branch
- Easy to see what's completed
- Can demo progress from staging environment

✅ **Parallel development**
- Regular development continues on main
- Can cherry-pick urgent fixes both ways
- Teams don't block each other

### GitHub Settings

**Protect the `modernization` branch:**

1. Go to Settings → Branches → Add rule
2. Branch name pattern: `modernization`
3. Enable:
   - ✅ Require pull request reviews before merging (2 reviewers)
   - ✅ Require status checks to pass
   - ✅ Require conversation resolution before merging
   - ✅ Do not allow bypassing the above settings

**Set up branch deployment:**

Configure GitHub Actions to deploy:
- `main` → Production
- `modernization` → Staging
- PR previews → Temporary environments

### Handling Conflicts

If `main` changes conflict with `modernization`:

```bash
# On the modernization branch
git checkout modernization
git fetch origin
git merge origin/main

# Resolve conflicts
# Run tests to ensure nothing broke
git commit
git push origin modernization

# Inform team that modernization is synced
```

### When to Merge to Main

**Recommended approach:** Merge by phase

| Phase | When to Merge | Risk Level |
|-------|---------------|------------|
| Phase 1 | After all 7 PRs merged & tested | Low |
| Phase 2 | After all 12 PRs merged & tested | Medium |
| Phase 3 | After all 6 PRs merged & tested | Medium |
| Phase 4 | After all 4 PRs merged & tested | Low |
| Phase 5 | After features complete | Low |

**Advantages of phased merges:**
- ✅ Smaller changesets to main
- ✅ Easier to identify issues
- ✅ Incremental value delivery
- ✅ Faster feedback loop

**Advantages of single merge:**
- ✅ One large code review
- ✅ Atomic update
- ✅ Simpler git history

### Emergency Hotfixes

If a critical bug needs fixing during modernization:

**Option 1: Fix on main, cherry-pick to modernization**
```bash
# Fix bug on main
git checkout main
git checkout -b hotfix/critical-bug
# ... fix and merge to main

# Cherry-pick to modernization
git checkout modernization
git cherry-pick <commit-hash>
git push origin modernization
```

**Option 2: Fix on both branches**
```bash
# Fix on main first (urgent)
# Then create separate PR for modernization
```

### Cleanup After Completion

Once all phases merged to main:

```bash
# Delete the modernization branch
git push origin --delete modernization
git branch -d modernization

# Archive for reference (optional)
git tag -a archive/modernization -m "Archived modernization branch"
git push origin archive/modernization
```

### Deployment Pipeline

**.github/workflows/deploy.yml** (update):

```yaml
name: Deploy

on:
  push:
    branches:
      - main           # Deploy to production
      - modernization  # Deploy to staging
  pull_request:
    branches:
      - modernization  # Preview deployments

jobs:
  deploy-production:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Production
        # ... production deployment

  deploy-staging:
    if: github.ref == 'refs/heads/modernization'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Staging
        # ... staging deployment
        # Use different subdomain: staging.geography-game.com

  deploy-preview:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy PR Preview
        # ... preview deployment
        # Use PR number: pr-123.geography-game.com
```

### Communication

**Team communication during modernization:**

1. **Daily standups** (if working in parallel)
   - What PRs are you working on?
   - Any blockers?
   - What's merging today?

2. **Weekly reviews**
   - Review modernization branch in staging
   - Test cumulative changes
   - Plan next week's PRs

3. **Phase completion**
   - Demo to stakeholders
   - Get sign-off
   - Merge to main (if doing phased merges)

4. **Slack/Discord channels**
   - #modernization - General discussion
   - #modernization-reviews - PR review requests
   - #modernization-deploys - Deployment notifications

---

## Phase 1 PRs: Foundation

**Duration:** 2 weeks
**Total PRs:** 7
**Can Work in Parallel:** Yes (after PR 1.1)

### PR 1.1: Setup Vitest Testing Infrastructure
**Size:** S (~200 lines)
**Priority:** Critical - Blocking for all other Phase 1 PRs
**Deployment:** Yes

**Files Changed:**
```
+ vitest.config.ts
+ tests/setup.ts
~ package.json (add dependencies)
~ tsconfig.json (add test paths)
+ .github/workflows/test.yml (CI for tests)
```

**Changes:**
- Install Vitest, Vue Test Utils, jsdom
- Create vitest.config.ts
- Setup test helpers and mocks
- Add test npm scripts
- Configure CI to run tests

**Testing:**
- Create one sample test that passes
- Verify coverage report generates

**Review Focus:**
- Test configuration is correct
- CI pipeline works
- Coverage reporting works

**Deployment Notes:**
- No user-facing changes
- Can deploy immediately

---

### PR 1.2: Add TypeScript Strict Mode & Type Improvements
**Size:** M (~400 lines)
**Priority:** High - Blocking for type-safe utilities
**Deployment:** Yes
**Depends On:** None (can run parallel to 1.1)

**Files Changed:**
```
~ tsconfig.json (enable strict mode)
~ src/types/geojson.ts (new centralized types)
~ src/types/game.d.ts (improve types)
~ src/utils/geojsonUtils.ts (fix types)
```

**Changes:**
- Enable TypeScript strict mode
- Create centralized GeoJSON type definitions
- Remove all `any` types from utils
- Add proper type guards
- Fix type errors across codebase

**Testing:**
- `bun run type-check` passes with strict mode
- No runtime regressions

**Review Focus:**
- All `any` types removed
- Type safety improvements correct
- No breaking changes

**Deployment Notes:**
- No user-facing changes
- Improves developer experience immediately

---

### PR 1.3: Extract coordinateTransforms Utility
**Size:** S (~250 lines: 150 new + 100 tests)
**Priority:** High
**Deployment:** Yes
**Depends On:** PR 1.1 (for testing), PR 1.2 (for types)

**Files Changed:**
```
+ src/utils/geo/coordinateTransforms.ts
+ tests/unit/utils/geo/coordinateTransforms.spec.ts
+ README: src/utils/geo/README.md
```

**Changes:**
- Create `shiftFeatureCoordinates` with proper types
- Create `shiftFeatures` batch function
- Add comprehensive unit tests (>95% coverage)
- Document utility functions

**Testing:**
- Unit tests with various geometry types
- Edge case testing (empty features, null properties)
- Test coverage >95%

**Review Focus:**
- Function signatures correct
- Test coverage comprehensive
- Documentation clear

**Deployment Notes:**
- No user-facing changes
- Not used anywhere yet (preparation for 1.5)

---

### PR 1.4: Extract worldWrapping Utility
**Size:** S (~200 lines: 100 new + 100 tests)
**Priority:** High
**Deployment:** Yes
**Depends On:** PR 1.3

**Files Changed:**
```
+ src/utils/geo/worldWrapping.ts
+ tests/unit/utils/geo/worldWrapping.spec.ts
```

**Changes:**
- Create `createWorldWrappedFeatures` function
- Use `coordinateTransforms` from PR 1.3
- Add comprehensive unit tests (>90% coverage)
- Document world-wrapping strategy

**Testing:**
- Test with Point, Polygon, MultiPolygon
- Test mark copies option
- Test selective wrapping (east-only, west-only)

**Review Focus:**
- Correctly uses coordinateTransforms
- Options API is intuitive
- Tests are comprehensive

**Deployment Notes:**
- No user-facing changes
- Not used anywhere yet

---

### PR 1.5: Extract territoryProcessors Utilities
**Size:** M (~400 lines: 250 new + 150 tests)
**Priority:** Medium
**Deployment:** Yes
**Depends On:** PR 1.3

**Files Changed:**
```
+ src/utils/geo/processors/territoryProcessors.ts
+ tests/unit/utils/geo/processors/territoryProcessors.spec.ts
```

**Changes:**
- Create `splitTerritoryByLatitude` function
- Create `mergeFeatures` function
- Create `createCustomFeature` function
- Add tests for each processor
- Document use cases (Norway/Svalbard, Cyprus, Gibraltar)

**Testing:**
- Test splitting with mock data
- Test merging Polygon + MultiPolygon
- Test custom feature creation

**Review Focus:**
- Functions are reusable
- Edge cases handled
- Tests cover main scenarios

**Deployment Notes:**
- No user-facing changes
- Not used anywhere yet

---

### PR 1.6: Migrate 3 Components to Use New Utilities
**Size:** M (~300 lines changed)
**Priority:** Medium - Validates utilities work
**Deployment:** Yes (with testing)
**Depends On:** PR 1.3, 1.4, 1.5

**Files Changed:**
```
~ src/components/WorldCountries/WorldCountries.vue
~ src/components/AdministrativeDivisions/FrenchDepartments.vue
~ src/components/AdministrativeDivisions/UsStates.vue
```

**Changes:**
- Replace inline `shiftCoordinates` with import
- Replace inline world-wrapping with `createWorldWrappedFeatures`
- Remove duplicated code
- Verify functionality unchanged

**Testing:**
- Manual testing: Play each game, verify no regressions
- Visual testing: Screenshots before/after
- E2E tests for these 3 games

**Review Focus:**
- No functional changes
- Code is simpler and cleaner
- Games work identically

**Deployment Notes:**
- User-facing but no changes expected
- Monitor for regressions after deploy

---

### PR 1.7: Architecture Documentation
**Size:** S (~100 lines docs)
**Priority:** Low
**Deployment:** Yes
**Depends On:** None (can run in parallel)

**Files Changed:**
```
+ docs/ARCHITECTURE.md
+ docs/ADDING_GAMES.md
+ docs/TESTING.md
~ CLAUDE.md (update with new info)
```

**Changes:**
- Document current architecture
- Create "How to Add a Game" guide
- Document testing approach
- Update CLAUDE.md with new utilities

**Testing:**
- N/A (documentation only)

**Review Focus:**
- Documentation is accurate
- Examples are clear
- Covers common scenarios

**Deployment Notes:**
- Documentation only
- No code changes

---

### Phase 1 Summary

**Total PRs:** 7
**Total Lines:** ~1,950 lines (code + tests + docs)
**Parallel Opportunities:**
- PR 1.1 must go first
- PR 1.2 and 1.7 can run parallel to everything
- PR 1.3, 1.4, 1.5 are sequential but fast
- PR 1.6 is final validation

**Timeline:**
- Sequential: 2 weeks
- With 2 people: 1.5 weeks

**Deployment Strategy:**
- Deploy PR 1.1 immediately (no risk)
- Deploy PRs 1.2-1.5 as ready (no user impact)
- Deploy PR 1.6 with careful monitoring
- Deploy PR 1.7 anytime

---

## Phase 2 PRs: Game Registry

**Duration:** 2-3 weeks
**Total PRs:** 8-10
**Can Work in Parallel:** Partially

### PR 2.1: Define Game Registry Schema & Types
**Size:** S (~200 lines)
**Priority:** Critical - Blocking for all Phase 2
**Deployment:** Yes

**Files Changed:**
```
+ src/types/gameRegistry.ts
+ src/schemas/gameConfig.schema.ts
+ tests/unit/schemas/gameConfig.spec.ts
```

**Changes:**
- Create `GameDefinition` interface
- Create `GameRegistry` interface
- Create JSON schema for validation
- Add schema validation tests

**Testing:**
- Test schema validates correct configs
- Test schema rejects invalid configs

**Review Focus:**
- Schema is comprehensive
- Types match schema
- Extensible for future needs

**Deployment Notes:**
- No user-facing changes
- Types only

---

### PR 2.2: Create Processor Registry System
**Size:** L (~600 lines: 400 code + 200 tests)
**Priority:** High
**Deployment:** Yes
**Depends On:** PR 1.5 (territoryProcessors), PR 2.1

**Files Changed:**
```
+ src/utils/geo/processors/index.ts
+ tests/unit/utils/geo/processors/index.spec.ts
```

**Changes:**
- Create `PROCESSOR_REGISTRY` with all processors:
  - worldWrapping
  - splitNorwaySvalbard
  - mergeCyprus
  - addGibraltar
  - filterEurope, filterAsia, filterAfrica, etc.
- Create `applyProcessors` chain function
- Add tests for each processor
- Document processor system

**Testing:**
- Test each processor individually
- Test processor chaining
- Test with real GeoJSON samples

**Review Focus:**
- All processors work correctly
- Chain logic is correct
- Easy to add new processors

**Deployment Notes:**
- No user-facing changes
- Not used anywhere yet

---

### PR 2.3: Create useGameRegistry Composable
**Size:** M (~300 lines: 200 code + 100 tests)
**Priority:** High
**Deployment:** Yes
**Depends On:** PR 2.1

**Files Changed:**
```
+ src/composables/useGameRegistry.ts
+ tests/unit/composables/useGameRegistry.spec.ts
```

**Changes:**
- Create `useGameRegistry` composable
- Implement `getGameById`, `getGamesByCategory`, `searchGames`
- Add computed properties for organization
- Add tests for all functionality

**Testing:**
- Test game lookup
- Test category filtering
- Test search
- Test caching

**Review Focus:**
- API is intuitive
- Performance is good
- Tests are comprehensive

**Deployment Notes:**
- No user-facing changes
- Not used anywhere yet

---

### PR 2.4: Create Dynamic GameView Component
**Size:** M (~400 lines: 250 code + 150 tests)
**Priority:** High
**Deployment:** No (not routed yet)
**Depends On:** PR 2.2, PR 2.3

**Files Changed:**
```
+ src/views/GameView.vue
+ tests/unit/views/GameView.spec.ts
```

**Changes:**
- Create `GameView.vue` that loads games dynamically
- Integrate processor system
- Handle loading/error states
- Add component tests

**Testing:**
- Test with mock game definitions
- Test processor application
- Test error handling
- Test loading states

**Review Focus:**
- Component logic is correct
- Error handling is robust
- UI feedback is good

**Deployment Notes:**
- Not accessible yet (no route)
- Safe to merge

---

### PR 2.5: Create Game JSON Configs (Pilot - 5 games)
**Size:** S (~150 lines JSON)
**Priority:** High
**Deployment:** No (not used yet)
**Depends On:** PR 2.1

**Files Changed:**
```
+ src/config/games/countries/world.json
+ src/config/games/countries/europe.json
+ src/config/games/divisions/us-states.json
+ src/config/games/cities/paris-arrondissements.json
+ src/config/games/cities/london-boroughs.json
```

**Changes:**
- Create JSON configs for 5 pilot games
- Validate against schema
- Document any special configurations

**Testing:**
- Validate all JSONs against schema
- Ensure all required fields present

**Review Focus:**
- Configs are correct
- Schema validation passes
- Data URLs are correct

**Deployment Notes:**
- Just data files
- Not loaded anywhere yet

---

### PR 2.6: Update Router with Dynamic Game Route
**Size:** S (~100 lines)
**Priority:** High
**Deployment:** No (feature flag)
**Depends On:** PR 2.4, PR 2.5

**Files Changed:**
```
~ src/router/index.ts
```

**Changes:**
- Add `/game/:gameId` dynamic route
- Point to `GameView.vue`
- Add legacy route redirects for pilot games
- Keep old routes temporarily

**Testing:**
- Test navigation to `/game/world-countries`
- Test legacy redirects
- Test 404 for invalid game IDs

**Review Focus:**
- Route configuration correct
- Redirects work
- Auth guards still work

**Deployment Notes:**
- Behind feature flag
- Old routes still work

---

### PR 2.7: Refactor HomeView with Registry (Pilot)
**Size:** M (~500 lines: -200 old +300 new)
**Priority:** High
**Deployment:** No (feature flag)
**Depends On:** PR 2.3

**Files Changed:**
```
~ src/views/HomeView.vue
+ src/components/GameButton.vue
+ src/components/GameCategorySection.vue
```

**Changes:**
- Refactor HomeView to use game registry
- Create reusable GameButton component
- Create GameCategorySection component
- Add search functionality
- Show only pilot games initially (feature flag)

**Testing:**
- Visual testing of home page
- Test search
- Test navigation
- Test responsive layout

**Review Focus:**
- UI matches original
- All games appear
- Navigation works
- Code is cleaner

**Deployment Notes:**
- Behind feature flag
- Can toggle between old/new

---

### PR 2.8: Test & Validate Pilot Games
**Size:** M (~300 lines tests + validation)
**Priority:** Critical
**Deployment:** Enable feature flag
**Depends On:** PR 2.6, PR 2.7

**Files Changed:**
```
+ tests/e2e/game-loading.spec.ts
+ tests/e2e/game-play.spec.ts
```

**Changes:**
- Add E2E tests for each pilot game
- Validate functionality matches original
- Create visual regression tests
- Document any differences

**Testing:**
- Play each game start to finish
- Compare with original behavior
- Screenshot testing
- Performance testing

**Review Focus:**
- All games work identically
- No regressions found
- Performance is same or better

**Deployment Notes:**
- Enable feature flag for internal testing
- Monitor for issues
- Ready for rollback if needed

---

### PR 2.9: Migrate Remaining Games to JSON (Batch 1: Countries)
**Size:** M (~300 lines JSON)
**Priority:** Medium
**Deployment:** Yes
**Depends On:** PR 2.8 (pilot validated)

**Files Changed:**
```
+ src/config/games/countries/africa.json
+ src/config/games/countries/asia.json
+ src/config/games/countries/north-america.json
+ src/config/games/countries/south-america.json
+ src/config/games/countries/oceania.json
```

**Changes:**
- Create JSON configs for all continent games
- Update registry to load them
- Add to E2E tests

**Testing:**
- Test each new game
- Validate against originals

**Review Focus:**
- Configs are correct
- Processors match original logic

**Deployment Notes:**
- Low risk (same pattern as pilot)

---

### PR 2.10: Migrate Remaining Games to JSON (Batch 2: Divisions)
**Size:** L (~700 lines JSON)
**Priority:** Medium
**Deployment:** Yes
**Depends On:** PR 2.9

**Files Changed:**
```
+ src/config/games/divisions/*.json (14 files)
```

**Changes:**
- Create JSON configs for all administrative division games
- Update registry
- Add to E2E tests

**Testing:**
- Test each game
- Validate functionality

**Review Focus:**
- All games work
- No regressions

---

### PR 2.11: Migrate Remaining Games to JSON (Batch 3: Cities)
**Size:** M (~400 lines JSON)
**Priority:** Medium
**Deployment:** Yes
**Depends On:** PR 2.10

**Files Changed:**
```
+ src/config/games/cities/*.json (8 files)
```

**Changes:**
- Create JSON configs for all city district games
- Update registry
- Add to E2E tests

**Testing:**
- Test each game
- Validate functionality

---

### PR 2.12: Delete Old Game Components
**Size:** XL (~1800 lines deleted!)
**Priority:** High - The Big Cleanup
**Deployment:** Yes (after all games migrated)
**Depends On:** PR 2.11 (all games migrated)

**Files Changed:**
```
- src/components/WorldCountries/*.vue (7 files)
- src/components/AdministrativeDivisions/*.vue (14 files)
- src/components/CityDistricts/*.vue (8 files)
- src/utils/worldCountriesConfig.ts
- src/utils/cityDistrictsConfig.ts
```

**Changes:**
- Delete all old game component files
- Delete old config files
- Remove old imports from router
- Clean up unused directories
- Update documentation

**Testing:**
- Comprehensive regression testing
- Test all games still work
- Test navigation
- Visual testing

**Review Focus:**
- Verify nothing needed is deleted
- Confirm all games still accessible
- Ensure clean commit (no orphaned files)

**Deployment Notes:**
- High impact (deletes lots of code!)
- Requires full regression testing
- Have rollback plan ready
- Monitor after deployment

---

### Phase 2 Summary

**Total PRs:** 12
**Total Lines:** ~1,800 lines deleted, ~2,500 lines added (net: +700 lines, but much cleaner)
**Parallel Opportunities:**
- PR 2.1 must go first
- PR 2.2 and 2.3 can run in parallel
- PR 2.4 and 2.5 can run in parallel
- PR 2.9, 2.10, 2.11 are sequential but fast

**Timeline:**
- Sequential: 3 weeks
- With 2 people: 2 weeks

**Deployment Strategy:**
- PRs 2.1-2.5: Deploy as ready (no risk)
- PR 2.6-2.7: Deploy behind feature flag
- PR 2.8: Enable feature flag for testing
- PR 2.9-2.11: Deploy as ready
- PR 2.12: Deploy with monitoring

---

## Phase 3 PRs: State Management

**Duration:** 2 weeks
**Total PRs:** 6
**Can Work in Parallel:** Yes (with Phase 2)

### PR 3.1: Install & Configure Pinia
**Size:** XS (~50 lines)
**Priority:** Critical - Blocking for Phase 3
**Deployment:** Yes

**Files Changed:**
```
~ package.json (add pinia, pinia-plugin-persistedstate)
~ src/main.ts (configure pinia)
```

**Changes:**
- Install Pinia and persistence plugin
- Configure in main.ts
- Add to app setup

**Testing:**
- Verify app still works
- Test Pinia DevTools work

**Review Focus:**
- Configuration is correct
- No breaking changes

**Deployment Notes:**
- No user-facing changes
- Pinia not used yet

---

### PR 3.2: Create Auth Store
**Size:** L (~600 lines: 400 code + 200 tests)
**Priority:** High
**Deployment:** No (not used yet)
**Depends On:** PR 3.1

**Files Changed:**
```
+ src/stores/auth.ts
+ tests/unit/stores/auth.spec.ts
```

**Changes:**
- Create auth store with Pinia
- Implement login, logout, token refresh
- Add token expiry checking
- Add persistence
- Comprehensive tests

**Testing:**
- Test login flow
- Test token refresh
- Test logout
- Test persistence
- Mock backend API

**Review Focus:**
- Auth logic is correct
- Token refresh works
- Tests are comprehensive
- Security is maintained

**Deployment Notes:**
- Not used yet
- Safe to merge

---

### PR 3.3: Migrate useAuth to Use Store
**Size:** M (~300 lines changed)
**Priority:** High
**Deployment:** Yes (carefully)
**Depends On:** PR 3.2

**Files Changed:**
```
~ src/composables/useAuth.ts
~ src/components/auth/GoogleLoginButton.vue
~ src/components/auth/LoginDropdown.vue
~ src/router/index.ts
```

**Changes:**
- Update useAuth to wrap auth store
- Maintain backward compatibility
- Update components to use new API
- Test auth flow end-to-end

**Testing:**
- Test login flow
- Test logout
- Test route guards
- Test persistence
- Test token refresh

**Review Focus:**
- Backward compatibility maintained
- No auth regressions
- Token refresh works

**Deployment Notes:**
- User-facing changes
- Test auth thoroughly before deploy
- Monitor auth errors after deploy

---

### PR 3.4: Create User Stats Store
**Size:** L (~700 lines: 500 code + 200 tests)
**Priority:** Medium
**Deployment:** No (not used yet)
**Depends On:** PR 3.1

**Files Changed:**
```
+ src/stores/userStats.ts
+ tests/unit/stores/userStats.spec.ts
```

**Changes:**
- Create user stats store
- Implement game tracking
- Calculate statistics
- Add persistence
- Comprehensive tests

**Testing:**
- Test recording games
- Test statistics calculations
- Test persistence
- Test history limits

**Review Focus:**
- Statistics are accurate
- Performance is good (large histories)
- Tests cover edge cases

**Deployment Notes:**
- Not used yet
- Safe to merge

---

### PR 3.5: Integrate Stats Tracking with Games
**Size:** M (~400 lines)
**Priority:** Medium
**Deployment:** Yes
**Depends On:** PR 3.4

**Files Changed:**
```
~ src/composables/useMapGameLogic.ts
~ src/composables/useCapitalGameLogic.ts
~ src/composables/useFlagGameLogic.ts
~ src/views/GameView.vue
```

**Changes:**
- Add gameId to game logic options
- Call stats store on game completion
- Update all game views to pass gameId

**Testing:**
- Play games and verify stats recorded
- Check localStorage for stats
- Verify statistics calculate correctly

**Review Focus:**
- Stats recording works
- No performance impact
- Games still work

**Deployment Notes:**
- User-facing: stats now tracked
- Monitor localStorage usage

---

### PR 3.6: Create Stats Dashboard View
**Size:** L (~800 lines: 600 code + 200 tests)
**Priority:** Low
**Deployment:** Yes
**Depends On:** PR 3.5

**Files Changed:**
```
+ src/views/StatsView.vue
+ tests/unit/views/StatsView.spec.ts
~ src/router/index.ts (add route)
~ src/components/AppBar.vue (add nav link)
```

**Changes:**
- Create stats dashboard
- Show overview cards
- Show recent games table
- Show per-game statistics
- Add navigation

**Testing:**
- Test with mock data
- Test with real data
- Test responsive layout
- Visual testing

**Review Focus:**
- UI is polished
- Statistics display correctly
- Performance is good

**Deployment Notes:**
- New user-facing feature
- Adds value immediately

---

### Phase 3 Summary

**Total PRs:** 6
**Total Lines:** ~2,900 lines added
**Parallel Opportunities:**
- PR 3.1 must go first
- PR 3.2 and 3.4 can run in parallel
- PR 3.3 and 3.5 are sequential

**Timeline:**
- Sequential: 2 weeks
- With 2 people: 1.5 weeks

**Can Run Parallel with Phase 2:** Yes! After Phase 2 PR 2.1 completes

**Deployment Strategy:**
- PR 3.1: Deploy immediately
- PR 3.2, 3.4: Deploy when ready (no impact)
- PR 3.3: Deploy with careful auth testing
- PR 3.5: Deploy with monitoring
- PR 3.6: Deploy anytime (nice-to-have)

---

## Phase 4 PRs: Performance

**Duration:** 1 week
**Total PRs:** 4

### PR 4.1: Optimize GeoJSON Processing
**Size:** M (~400 lines: 200 code + 200 tests/benchmarks)
**Priority:** High
**Deployment:** Yes

**Files Changed:**
```
~ src/utils/geo/coordinateTransforms.ts
~ src/utils/geo/worldWrapping.ts
+ tests/benchmarks/geo-processing.bench.ts
```

**Changes:**
- Implement optimized coordinate shifting (copy-on-write)
- Add benchmarks comparing old vs new
- Update worldWrapping to use optimized version

**Testing:**
- Verify benchmarks show 60%+ improvement
- Verify functionality unchanged
- Run all geo tests

**Review Focus:**
- Performance improvement proven
- No regressions
- Benchmarks are accurate

**Deployment Notes:**
- Should be transparent to users
- Monitor for any issues

---

### PR 4.2: Add Service Worker for Caching
**Size:** M (~300 lines)
**Priority:** Medium
**Deployment:** Yes (monitor cache behavior)

**Files Changed:**
```
~ package.json (add vite-plugin-pwa)
~ vite.config.mts (configure PWA)
+ public/manifest.json
```

**Changes:**
- Install vite-plugin-pwa
- Configure service worker
- Set up GeoJSON caching strategy
- Add app manifest

**Testing:**
- Test cache behavior in DevTools
- Test offline mode
- Test cache updates

**Review Focus:**
- Caching strategy is correct
- Cache doesn't grow indefinitely
- Offline mode works

**Deployment Notes:**
- Monitor cache behavior after deploy
- Test on multiple browsers

---

### PR 4.3: Implement Lazy Loading for Game Configs
**Size:** M (~350 lines)
**Priority:** Medium
**Deployment:** Yes (reduces initial bundle)

**Files Changed:**
```
~ src/composables/useGameRegistry.ts
~ src/views/GameView.vue
```

**Changes:**
- Convert game imports to dynamic imports
- Add loading states
- Implement config caching
- Update GameView to handle async loading

**Testing:**
- Test game loading
- Verify bundle analysis shows improvement
- Test with slow network throttling

**Review Focus:**
- Bundle size reduced
- Loading states are good UX
- No functionality lost

**Deployment Notes:**
- Users see loading states
- Monitor for loading errors

---

### PR 4.4: Bundle Size Optimization & Analysis
**Size:** S (~100 lines config)
**Priority:** Low
**Deployment:** Yes

**Files Changed:**
```
~ vite.config.mts (add bundle analysis)
+ .github/workflows/bundle-size.yml
```

**Changes:**
- Add rollup-plugin-visualizer
- Configure bundle analysis in CI
- Add bundle size limits
- Document optimization findings

**Testing:**
- Generate bundle analysis
- Compare before/after sizes

**Review Focus:**
- Bundle analysis is useful
- CI reports are clear

**Deployment Notes:**
- No user impact
- Adds monitoring

---

### Phase 4 Summary

**Total PRs:** 4
**Total Lines:** ~1,150 lines
**Parallel Opportunities:** All can run in parallel

**Timeline:**
- Sequential: 1 week
- With 2 people: 3-4 days

**Deployment Strategy:**
- All PRs can deploy independently
- Monitor performance after each

---

## Phase 5 PRs: Features

**Duration:** 2+ weeks
**Total PRs:** 4+
**Priority:** Low (after core refactoring)

### PR 5.1: Game Difficulty System
**Size:** L (~800 lines)

Add easy/medium/hard modes to map games.

### PR 5.2: Daily Challenge System
**Size:** L (~700 lines)

Implement daily challenges with fixed seeds.

### PR 5.3: Leaderboards (Backend Required)
**Size:** XL (~1000+ lines)

Requires backend API for leaderboard storage.

### PR 5.4: Social Sharing
**Size:** M (~400 lines)

Add share buttons for social media.

---

## PR Review Guidelines

### For Reviewers

**What to Check:**

1. **Functionality**
   - [ ] Code does what PR says it does
   - [ ] No unintended side effects
   - [ ] Error handling is robust

2. **Testing**
   - [ ] Tests are comprehensive
   - [ ] All tests pass
   - [ ] Coverage targets met

3. **Code Quality**
   - [ ] Follows style guide
   - [ ] No console.logs or debug code
   - [ ] TypeScript types are correct
   - [ ] No `any` types introduced

4. **Performance**
   - [ ] No obvious performance issues
   - [ ] Bundle size impact acceptable

5. **Documentation**
   - [ ] Complex logic is commented
   - [ ] README/docs updated if needed
   - [ ] Breaking changes documented

**Review Checklist:**
```markdown
## Code Review Checklist

### Functionality
- [ ] Tested manually
- [ ] All acceptance criteria met
- [ ] No regressions introduced

### Tests
- [ ] Tests pass locally
- [ ] Tests pass in CI
- [ ] Coverage adequate
- [ ] Edge cases covered

### Code Quality
- [ ] Code is readable
- [ ] No code smells
- [ ] Follows conventions
- [ ] Types are correct

### Performance
- [ ] No performance regressions
- [ ] Bundle size acceptable
- [ ] Async operations handled

### Security
- [ ] No security vulnerabilities
- [ ] Input validation present
- [ ] Auth checks correct

### Documentation
- [ ] Comments are clear
- [ ] Docs updated
- [ ] Examples provided

### Deployment
- [ ] Can deploy independently
- [ ] Rollback plan exists
- [ ] Migration path clear
```

---

## Deployment Strategy

### Deployment Phases

```
Phase 1 (Weeks 1-2): Foundation
├── Deploy PRs 1.1-1.5 immediately (no risk)
├── Deploy PR 1.6 with monitoring
└── Deploy PR 1.7 anytime

Phase 2 (Weeks 3-5): Game Registry
├── Deploy PRs 2.1-2.5 immediately (no user impact)
├── Deploy PRs 2.6-2.7 behind feature flag
├── Test internally
├── Enable feature flag for 10% users
├── Monitor for 1 week
├── Enable for 100% users
├── Deploy PRs 2.9-2.11
└── Deploy PR 2.12 (the big cleanup)

Phase 3 (Weeks 3-5, parallel): State Management
├── Deploy PRs 3.1, 3.2, 3.4 immediately
├── Deploy PR 3.3 with auth monitoring
├── Deploy PR 3.5 with stats monitoring
└── Deploy PR 3.6 anytime

Phase 4 (Week 6): Performance
└── Deploy all PRs independently with monitoring

Phase 5 (Weeks 7+): Features
└── Deploy as completed
```

### Feature Flags

Use feature flags for risky changes:

```typescript
// src/config/features.ts
export const FEATURES = {
  USE_GAME_REGISTRY: import.meta.env.VITE_USE_GAME_REGISTRY === 'true',
  ENABLE_USER_STATS: import.meta.env.VITE_ENABLE_USER_STATS === 'true',
  ENABLE_LEADERBOARDS: import.meta.env.VITE_ENABLE_LEADERBOARDS === 'true'
};
```

**Environment configs:**
```bash
# .env.development
VITE_USE_GAME_REGISTRY=true
VITE_ENABLE_USER_STATS=true

# .env.production (start with false)
VITE_USE_GAME_REGISTRY=false
VITE_ENABLE_USER_STATS=false
```

---

## Parallel Work Opportunities

### Two-Person Team Strategy

**Person A: Infrastructure & Foundation**
- Week 1: PR 1.1, 1.2, 1.7
- Week 2: PR 1.3, 1.4, 1.5
- Week 3: PR 2.1, 2.2
- Week 4: PR 2.4, 2.6
- Week 5: PR 3.1, 3.2, 3.3
- Week 6: PR 4.1, 4.2

**Person B: Content & Features**
- Week 1: Review + docs
- Week 2: PR 1.6
- Week 3: PR 2.3, 2.5
- Week 4: PR 2.7, 2.8
- Week 5: PR 2.9, 2.10, 2.11, 2.12
- Week 6: PR 3.4, 3.5, 3.6

**Benefits:**
- Faster delivery (6 weeks vs 10 weeks)
- Better code review (cross-review)
- Knowledge sharing
- Risk mitigation (two sets of eyes)

### Parallel PR Execution

**Can Run in Parallel:**

Phase 1:
- PRs 1.2 and 1.7 (independent)
- PRs 1.3, 1.4, 1.5 after 1.2 completes

Phase 2:
- PRs 2.2 and 2.3 after 2.1
- PRs 2.4 and 2.5 after 2.1

Phase 3 can overlap with Phase 2:
- Phase 3 can start after Phase 2 PR 2.1 completes

Phase 4:
- All PRs are independent

---

## Success Metrics

Track these metrics for each PR:

### Code Metrics
- [ ] Lines added
- [ ] Lines deleted
- [ ] Net lines changed
- [ ] Test coverage delta
- [ ] TypeScript strict mode passing

### Review Metrics
- [ ] Time to first review
- [ ] Number of review cycles
- [ ] Time to merge
- [ ] Number of comments addressed

### Deployment Metrics
- [ ] Deploy time
- [ ] Rollback needed? (yes/no)
- [ ] Production errors (count)
- [ ] Performance impact (±%)

### Quality Metrics
- [ ] Bugs found in PR review
- [ ] Bugs found after deploy
- [ ] Test coverage %
- [ ] Type safety score

---

## Rollback Plan

For each PR, document rollback:

```markdown
## PR Rollback Procedure

### If deployed and issues found:

1. **Immediate Rollback**
   ```bash
   git revert <commit-hash>
   git push origin main
   # Deploy immediately
   ```

2. **Notify Team**
   - Post in Slack/Discord
   - Update status page
   - Document issue

3. **Root Cause Analysis**
   - What went wrong?
   - Why wasn't it caught?
   - How to prevent?

4. **Fix and Re-Deploy**
   - Create fix
   - Add tests
   - Re-review
   - Re-deploy with monitoring
```

---

## Summary

### Total PR Count by Phase

| Phase | PRs | Lines Changed | Duration |
|-------|-----|---------------|----------|
| Phase 1 | 7 | ~1,950 | 2 weeks |
| Phase 2 | 12 | ~2,500 | 2-3 weeks |
| Phase 3 | 6 | ~2,900 | 2 weeks |
| Phase 4 | 4 | ~1,150 | 1 week |
| Phase 5 | 4+ | ~3,000+ | 2+ weeks |
| **Total** | **33+** | **~11,500** | **9-12 weeks** |

### With Parallel Execution (2 people)

- **6-7 weeks** total
- **25-30% faster**
- **Better code quality** (more reviews)
- **Lower risk** (smaller PRs)

---

## Next Steps

1. **Create GitHub Issues** for each PR
2. **Set up Project Board** with columns:
   - Backlog
   - In Progress
   - In Review
   - Ready to Deploy
   - Deployed
3. **Assign PRs** to team members
4. **Start with Phase 1 PR 1.1** - Test infrastructure
5. **Weekly standup** to track progress

---

**Document Version:** 1.0
**Last Updated:** 2025-01-08
**Status:** Ready to Execute
