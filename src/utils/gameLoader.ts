/**
 * Game loader utility
 * Imports and registers all game configurations
 */

import { useGameRegistry } from "../composables/useGameRegistry";
import type { GameDefinition } from "../types/gameRegistry";
import { validateGameDefinitions } from "./gameConfigValidation";

// Import game configurations
// Countries
import worldCountries from "../config/games/countries/world.json";
import europeCountries from "../config/games/countries/europe.json";
import africaCountries from "../config/games/countries/africa.json";
import asiaCountries from "../config/games/countries/asia.json";
import northAmericaCountries from "../config/games/countries/north-america.json";
import southAmericaCountries from "../config/games/countries/south-america.json";
import oceaniaCountries from "../config/games/countries/oceania.json";

// Divisions
import usStates from "../config/games/divisions/us-states.json";
import canadianProvinces from "../config/games/divisions/canadian-provinces.json";
import spanishCommunities from "../config/games/divisions/spanish-communities.json";
import germanStates from "../config/games/divisions/german-states.json";
import italianRegions from "../config/games/divisions/italian-regions.json";
import brazilianStates from "../config/games/divisions/brazilian-states.json";
import australianStates from "../config/games/divisions/australian-states.json";
import chineseProvinces from "../config/games/divisions/chinese-provinces.json";
import belgianProvinces from "../config/games/divisions/belgian-provinces.json";
import dutchProvinces from "../config/games/divisions/dutch-provinces.json";
import ukCounties from "../config/games/divisions/uk-counties.json";
import russianOblasts from "../config/games/divisions/russian-oblasts.json";
import ukrainianOblasts from "../config/games/divisions/ukrainian-oblasts.json";

// Cities
import parisArrondissements from "../config/games/cities/paris-arrondissements.json";
import londonBoroughs from "../config/games/cities/london-boroughs.json";
import parisQuartiers from "../config/games/cities/paris-quartiers.json";
import parisDistricts from "../config/games/cities/paris-districts.json";
import barcelonaDistricts from "../config/games/cities/barcelona-districts.json";
import barcelonaBarrios from "../config/games/cities/barcelona-barrios.json";
import bordeauxQuartiers from "../config/games/cities/bordeaux-quartiers.json";

/**
 * Pilot game configurations (original 5 games)
 */
const PILOT_GAMES: GameDefinition[] = [
  worldCountries,
  europeCountries,
  usStates,
  parisArrondissements,
  londonBoroughs,
] as GameDefinition[];

/**
 * All available game configurations
 * Currently includes pilot games + continent games + division games + city games
 */
const ALL_GAMES: GameDefinition[] = [
  // World
  worldCountries,

  // Continents
  europeCountries,
  africaCountries,
  asiaCountries,
  northAmericaCountries,
  southAmericaCountries,
  oceaniaCountries,

  // Divisions
  usStates,
  canadianProvinces,
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

  // Cities
  parisArrondissements,
  londonBoroughs,
  parisQuartiers,
  parisDistricts,
  barcelonaDistricts,
  barcelonaBarrios,
  bordeauxQuartiers,
] as GameDefinition[];

/**
 * Load and register all games into the registry
 * Call this once at app startup
 *
 * Validates all game configurations before registration
 */
export function loadGames(): void {
  const registry = useGameRegistry();

  // Validate all games before loading
  const { valid, invalid } = validateGameDefinitions(ALL_GAMES);

  // Log validation errors in development
  if (invalid.length > 0 && import.meta.env.DEV) {
    console.error(`[GameLoader] ${invalid.length} invalid game configuration(s):`);
    invalid.forEach(({ index, error }) => {
      const game = ALL_GAMES[index] as any;
      console.error(`  - ${game?.name || `Game at index ${index}`}:`, error.issues);
    });
  }

  // Register only valid games
  if (valid.length > 0) {
    registry.registerGames(valid as GameDefinition[]);
  }

  // Throw error in development if no valid games found
  if (valid.length === 0 && import.meta.env.DEV) {
    throw new Error('[GameLoader] No valid game configurations found!');
  }
}

/**
 * Get list of all pilot games without loading into registry
 * Useful for testing
 */
export function getPilotGames(): readonly GameDefinition[] {
  return PILOT_GAMES;
}

/**
 * Get list of all games without loading into registry
 * Useful for testing
 */
export function getAllGames(): readonly GameDefinition[] {
  return ALL_GAMES;
}

/**
 * Get count of available games
 */
export function getGameCount(): number {
  return ALL_GAMES.length;
}
