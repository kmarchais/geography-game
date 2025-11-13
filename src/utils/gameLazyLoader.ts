/**
 * Lazy Game Loader
 * Dynamically imports game configurations on demand to reduce bundle size
 */

import { useGameRegistry } from "../composables/useGameRegistry";
import type { GameDefinition } from "../types/gameRegistry";

/**
 * Game categories for lazy loading
 */
export type GameCategory = 'countries' | 'divisions' | 'cities';

/**
 * Tracking loaded categories
 */
const loadedCategories = new Set<GameCategory>();
const loadingPromises = new Map<GameCategory, Promise<GameDefinition[]>>();

/**
 * Load all games for a specific category
 */
async function loadCategoryGames(category: GameCategory): Promise<GameDefinition[]> {
  // Return cached promise if already loading
  if (loadingPromises.has(category)) {
    return loadingPromises.get(category)!;
  }

  // Return empty if already loaded
  if (loadedCategories.has(category)) {
    return [];
  }

  const loadPromise = (async () => {
    if (import.meta.env.DEV) {
      console.log(`[Lazy Loader] Loading ${category} games...`);
    }
    const startTime = performance.now();

    let games: GameDefinition[] = [];

    switch (category) {
      case 'countries':
        games = await loadCountryGames();
        break;
      case 'divisions':
        games = await loadDivisionGames();
        break;
      case 'cities':
        games = await loadCityGames();
        break;
    }

    loadedCategories.add(category);
    loadingPromises.delete(category);

    if (import.meta.env.DEV) {
      const loadTime = (performance.now() - startTime).toFixed(2);
      console.log(`[Lazy Loader] Loaded ${games.length} ${category} games in ${loadTime}ms`);
    }

    return games;
  })();

  loadingPromises.set(category, loadPromise);
  return loadPromise;
}

/**
 * Load country games
 */
async function loadCountryGames(): Promise<GameDefinition[]> {
  const [
    world,
    europe,
    africa,
    asia,
    northAmerica,
    southAmerica,
    oceania,
  ] = await Promise.all([
    import("../config/games/countries/world.json"),
    import("../config/games/countries/europe.json"),
    import("../config/games/countries/africa.json"),
    import("../config/games/countries/asia.json"),
    import("../config/games/countries/north-america.json"),
    import("../config/games/countries/south-america.json"),
    import("../config/games/countries/oceania.json"),
  ]);

  return [
    world.default,
    europe.default,
    africa.default,
    asia.default,
    northAmerica.default,
    southAmerica.default,
    oceania.default,
  ] as GameDefinition[];
}

/**
 * Load administrative division games
 */
async function loadDivisionGames(): Promise<GameDefinition[]> {
  const [
    usStates,
    canadianProvinces,
    frenchDepartments,
    spanishCommunities,
    germanStates,
    italianRegions,
    brazilianStates,
    australianStates,
    chineseProvinces,
    belgianProvinces,
    dutchProvinces,
    ukCounties,
    russianOblasts,
    ukrainianOblasts,
  ] = await Promise.all([
    import("../config/games/divisions/us-states.json"),
    import("../config/games/divisions/canadian-provinces.json"),
    import("../config/games/divisions/french-departments.json"),
    import("../config/games/divisions/spanish-communities.json"),
    import("../config/games/divisions/german-states.json"),
    import("../config/games/divisions/italian-regions.json"),
    import("../config/games/divisions/brazilian-states.json"),
    import("../config/games/divisions/australian-states.json"),
    import("../config/games/divisions/chinese-provinces.json"),
    import("../config/games/divisions/belgian-provinces.json"),
    import("../config/games/divisions/dutch-provinces.json"),
    import("../config/games/divisions/uk-counties.json"),
    import("../config/games/divisions/russian-oblasts.json"),
    import("../config/games/divisions/ukrainian-oblasts.json"),
  ]);

  return [
    usStates.default,
    canadianProvinces.default,
    frenchDepartments.default,
    spanishCommunities.default,
    germanStates.default,
    italianRegions.default,
    brazilianStates.default,
    australianStates.default,
    chineseProvinces.default,
    belgianProvinces.default,
    dutchProvinces.default,
    ukCounties.default,
    russianOblasts.default,
    ukrainianOblasts.default,
  ] as GameDefinition[];
}

/**
 * Load city games
 */
async function loadCityGames(): Promise<GameDefinition[]> {
  const [
    parisArrondissements,
    londonBoroughs,
    parisQuartiers,
    parisDistricts,
    barcelonaDistricts,
    barcelonaBarrios,
    bordeauxQuartiers,
  ] = await Promise.all([
    import("../config/games/cities/paris-arrondissements.json"),
    import("../config/games/cities/london-boroughs.json"),
    import("../config/games/cities/paris-quartiers.json"),
    import("../config/games/cities/paris-districts.json"),
    import("../config/games/cities/barcelona-districts.json"),
    import("../config/games/cities/barcelona-barrios.json"),
    import("../config/games/cities/bordeaux-quartiers.json"),
  ]);

  return [
    parisArrondissements.default,
    londonBoroughs.default,
    parisQuartiers.default,
    parisDistricts.default,
    barcelonaDistricts.default,
    barcelonaBarrios.default,
    bordeauxQuartiers.default,
  ] as GameDefinition[];
}

/**
 * Load a specific category and register to game registry
 */
export async function loadCategory(category: GameCategory): Promise<void> {
  const games = await loadCategoryGames(category);

  if (games.length > 0) {
    const registry = useGameRegistry();
    registry.registerGames(games);
  }
}

/**
 * Load multiple categories in parallel
 */
export async function loadCategories(categories: GameCategory[]): Promise<void> {
  await Promise.all(categories.map(cat => loadCategory(cat)));
}

/**
 * Load all games (lazy loaded by category)
 */
export async function loadAllGames(): Promise<void> {
  await loadCategories(['countries', 'divisions', 'cities']);
}

/**
 * Check if a category is loaded
 */
export function isCategoryLoaded(category: GameCategory): boolean {
  return loadedCategories.has(category);
}

/**
 * Check if a category is currently loading
 */
export function isCategoryLoading(category: GameCategory): boolean {
  return loadingPromises.has(category);
}

/**
 * Get all loaded categories
 */
export function getLoadedCategories(): GameCategory[] {
  return Array.from(loadedCategories);
}

/**
 * Reset loader state (useful for testing)
 */
export function resetLoader(): void {
  loadedCategories.clear();
  loadingPromises.clear();
}
