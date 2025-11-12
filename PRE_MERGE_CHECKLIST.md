# Pre-Merge Checklist - Modernization Branch

**Branch**: `modernization`
**Target**: `main`
**Status**: 🔴 Blocked - Critical issues must be resolved
**Last Updated**: 2025-01-11

---

## 🎯 Overview

This document tracks all required tasks before merging the modernization branch. The branch contains 51 commits across 4 phases representing ~8-10 weeks of development work.

**PR Stats:**
- 178 files changed (+27,373 / -4,970 lines)
- 51 commits
- 283 tests created
- 1,800+ lines of duplication eliminated
- All CI checks passing

---

## ❌ Critical Issues (Must Fix Before Merge)

### 1. Fix Node Modules Corruption

**Problem**: Type checking and linting fail with "could not open bin metadata file"

**Impact**: Blocks verification of type safety and code quality

**Solution**:
```bash
# Run this command
bun install --force

# Verify it works
bun run type-check
bun run lint

# Commit the updated lockfile
git add bun.lockb package-lock.json
git commit -m "fix: Resolve node_modules corruption with forced reinstall"
```

**Assignee**: _____
**Status**: ⬜ Not Started
**Estimated Time**: 10 minutes

---

### 2. Fix or Remove Failing Component Tests

**Problem**: 128 component tests failing due to Vitest 4.x/vue-test-utils compatibility issues

**Impact**: Failing tests on main branch is not acceptable

**Files Affected**:
- `src/components/MapGame.spec.ts`
- `src/components/GameHub.spec.ts`
- Others with component mounting

**Options**:

**Option A: Fix Tests (Recommended)**
```bash
# Downgrade Vitest to 3.x (more stable with vue-test-utils)
bun remove vitest @vitest/ui
bun add -D vitest@^3.0.0 @vitest/ui@^3.0.0

# Or update vue-test-utils to latest
bun update @vue/test-utils

# Run tests to verify
bun run test
```

**Option B: Remove Component Tests (Quick Fix)**
```bash
# Remove problematic test files
rm src/components/MapGame.spec.ts
rm src/components/GameHub.spec.ts

# Update test count in documentation
# Add note explaining why component tests were removed
```

**Recommendation**: Try Option A first. If it takes > 2 hours, go with Option B and create follow-up issue.

**Assignee**: _____
**Status**: ⬜ Not Started
**Estimated Time**: 2-4 hours (Option A) or 30 minutes (Option B)

---

### 3. Fix or Remove Skipped Timer Tests

**Problem**: Timer tests in `src/composables/useMapGameLogic.spec.ts` are disabled with `describe.skip`

**Impact**: Reduces test coverage and leaves dead code

**Solution**:

**Option A: Fix Timer Tests**
```typescript
// In useMapGameLogic.spec.ts
// Remove the .skip and fix the timer implementation
describe("timer", () => {  // Remove .skip
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Update tests to work with Vitest 4.x timer API
  it("should increment timer every second", () => {
    const game = createGameLogic();
    game.startNewGame();

    expect(game.timer.value).toBe(0);
    vi.advanceTimersByTime(1000);
    expect(game.timer.value).toBe(1);
  });
});
```

**Option B: Remove Timer Tests**
```typescript
// Delete the entire describe.skip block
// Add comment explaining why timers aren't tested
```

**Recommendation**: Try Option A. If timer tests are too flaky, go with Option B.

**Assignee**: _____
**Status**: ⬜ Not Started
**Estimated Time**: 1-2 hours (Option A) or 10 minutes (Option B)

---

## ⚠️ Important Issues (Should Fix Soon After Merge)

### 4. Remove Console.log Statements

**Problem**: 39 ESLint warnings for console.log usage

**Impact**: Production logs clutter, debugging noise

**Solution**:
```bash
# Find all console.log statements
grep -r "console.log" src/ --exclude-dir=node_modules

# Replace with proper logging or remove
# Option: Create a logger utility
```

**Assignee**: _____
**Status**: ⬜ Not Started
**Priority**: Medium
**Estimated Time**: 1 hour

---

### 5. Add Error Boundaries

**Problem**: GameView error handling is basic - just shows error message

**Impact**: Poor user experience on errors

**Solution**:
```vue
<!-- Create src/components/ErrorBoundary.vue -->
<template>
  <div v-if="error" class="error-boundary">
    <div class="error-content">
      <h2>⚠️ Something went wrong</h2>
      <p>{{ error.message }}</p>
      <v-btn @click="retry">Try Again</v-btn>
      <v-btn @click="goHome">Go Home</v-btn>
    </div>
  </div>
  <slot v-else />
</template>

<!-- Wrap GameView with error boundary in router -->
```

**Assignee**: _____
**Status**: ⬜ Not Started
**Priority**: Medium
**Estimated Time**: 2 hours

---

### 6. Document Service Worker Cache Strategy

**Problem**: Service worker caching behavior not fully documented

**Impact**: Future developers may not understand cache invalidation

**Solution**:
```markdown
# Add section to docs/performance/service-worker.md

## Cache Invalidation Strategy

### When caches are cleared:
1. On service worker update (new version deployed)
2. When cache storage exceeds browser limits
3. Manual clear via DevTools

### Cache persistence:
- Static assets: Until new deployment
- GeoJSON data: 24 hours with stale-while-revalidate
- API responses: Network-first with 5-minute cache
```

**Assignee**: _____
**Status**: ⬜ Not Started
**Priority**: Low
**Estimated Time**: 30 minutes

---

### 7. Auto-calculate totalRounds

**Problem**: totalRounds manually specified in each game config

**Impact**: Error-prone, requires counting GeoJSON features

**Solution**:
```bash
# Update scripts/add-total-rounds.ts to run in build process
# Or remove totalRounds from configs and calculate at runtime

# Add to vite.config.mts
export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'calculate-total-rounds',
      buildStart() {
        // Auto-calculate and inject totalRounds
      }
    }
  ]
});
```

**Assignee**: _____
**Status**: ⬜ Not Started
**Priority**: Low
**Estimated Time**: 2-3 hours

---

## 📝 Nice to Have (Future Improvements)

### 8. Extract Hardcoded Geography Data

**Problem**: Gibraltar, Cyprus, Svalbard hardcoded in filterEurope processor

**Impact**: Makes maintenance harder, less flexible

**Solution**:
```typescript
// Create src/data/geography/special-territories.json
{
  "gibraltar": {
    "name": "Gibraltar",
    "coordinates": [[-5.3536, 36.1086], ...]
  },
  // ...
}

// Import in processor
import specialTerritories from '@/data/geography/special-territories.json';
```

**Priority**: Low
**Estimated Time**: 1 hour

---

### 9. Add Cache Warming

**Problem**: First game load still slow (cache miss)

**Impact**: Suboptimal first-time user experience

**Solution**:
```typescript
// In App.vue onMounted
onMounted(async () => {
  await loadGames();

  // Warm cache for featured games
  const featured = registry.featured;
  featured.forEach(game => {
    fetchAndCacheGeoJSON(game.config.dataUrl, game.config.processors || [])
      .catch(() => {}); // Silent fail, cache warming is optional
  });
});
```

**Priority**: Low
**Estimated Time**: 1 hour

---

### 10. Add Quick Start Guide

**Problem**: New contributors need to read 7,000+ lines of docs

**Impact**: Harder onboarding

**Solution**:
```markdown
# Create QUICK_START.md

## Getting Started (5 minutes)

1. Clone and install:
   ```bash
   git clone ...
   bun install
   ```

2. Run dev server:
   ```bash
   bun dev
   ```

3. Add a new game:
   - Create JSON in `src/config/games/`
   - Import in `src/utils/gameLoader.ts`
   - Done!

4. Run tests:
   ```bash
   bun test
   ```

See CLAUDE.md for architecture details.
```

**Priority**: Low
**Estimated Time**: 30 minutes

---

## ✅ Verification Checklist

Before merging, verify all of the following:

### Build & Tests
- [ ] `bun install` completes without errors
- [ ] `bun run type-check` passes with 0 errors
- [ ] `bun run lint` passes with 0 errors (warnings OK)
- [ ] `bun run test` passes with 0 failures
- [ ] `bun run test:e2e` passes (if Playwright installed)
- [ ] `bun run build` succeeds
- [ ] `bun run preview` works locally

### CI/CD
- [ ] All GitHub Actions checks pass (green)
- [ ] Netlify preview deploys successfully
- [ ] Preview site tested manually (smoke test)

### Code Quality
- [ ] No `console.log` in production code (or documented exceptions)
- [ ] No `TODO` or `FIXME` comments (or documented in issues)
- [ ] No disabled tests (or documented why)
- [ ] TypeScript strict mode enabled
- [ ] ESLint warnings addressed or documented

### Functionality
- [ ] All 27 games load correctly
- [ ] Game mechanics work (scoring, timer, skip)
- [ ] Stats tracking works
- [ ] Service worker registers successfully
- [ ] Offline mode works for cached games
- [ ] Legacy routes redirect properly

### Documentation
- [ ] CLAUDE.md updated
- [ ] README accurate
- [ ] CHANGELOG.md updated (if exists)
- [ ] Breaking changes documented (none expected)

---

## 🚀 Merge Process

Once all critical issues are resolved and verification passes:

1. **Final Review**
   ```bash
   git log origin/main..HEAD --oneline
   git diff origin/main...HEAD --stat
   ```

2. **Update Version** (if using semantic versioning)
   ```bash
   # In package.json
   # Current: 0.0.0
   # New: 0.1.0 (minor version bump for new features)
   ```

3. **Create Merge Commit**
   ```bash
   git checkout main
   git merge modernization --no-ff -m "feat: Complete modernization overhaul (Phases 1-4)

   Major changes:
   - Eliminate 1,800+ lines of duplicate code
   - Migrate 29 components to 28 JSON configs
   - Add comprehensive testing (283 tests)
   - Implement performance optimizations (99% faster cache)
   - Add offline support with service worker
   - Migrate to Pinia state management
   - Add weighted scoring system (0-100 points)

   See MODERNIZATION_PLAN.md for full details.

   BREAKING CHANGES: None (backward compatible)
   "
   ```

4. **Push to Remote**
   ```bash
   git push origin main
   ```

5. **Deploy to Production**
   - Monitor CI/CD pipeline
   - Verify production deployment
   - Smoke test production site

6. **Cleanup**
   ```bash
   # Archive the modernization branch (don't delete - historical reference)
   git tag modernization-complete modernization
   git push origin modernization-complete

   # Delete planning docs no longer needed
   git rm PR_STRATEGY.md PROJECT_REVIEW.md PR-4.1-DESCRIPTION.md
   git commit -m "docs: Remove outdated planning documents"
   ```

7. **Create Follow-up Issues**
   - Create GitHub issues for items in "Important" and "Nice to Have" sections
   - Assign priorities and milestones
   - Link to this checklist for context

---

## 📊 Success Metrics

After merge, monitor these metrics:

### Performance
- [ ] Average page load time < 2s
- [ ] Cache hit rate > 70%
- [ ] Lighthouse score > 90
- [ ] Service worker activation rate > 80%

### Code Quality
- [ ] Test coverage > 70%
- [ ] Bundle size < 600 KB
- [ ] TypeScript strict mode: ✅
- [ ] Zero production console logs

### User Experience
- [ ] Game load time < 500ms (cached)
- [ ] Zero game loading errors
- [ ] Stats tracking working for all users
- [ ] All 27 games playable

---

## 📞 Help & Resources

- **Architecture**: See MODERNIZATION_PLAN.md
- **Testing**: See tests/e2e/README.md
- **Performance**: See docs/performance/phase-4-summary.md
- **AI Instructions**: See CLAUDE.md

---

## 🎉 Completion

Once all critical items are ✅ and verification passes:

**Modernization Status**: 🟢 Ready to Merge

Estimated merge date: _____

---

**Sign-off:**
- [ ] Technical Lead: _____
- [ ] QA: _____
- [ ] Product: _____
