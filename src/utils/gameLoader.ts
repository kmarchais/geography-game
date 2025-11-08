/**
 * Game loader utility
 * Imports and registers all game configurations
 */

import { useGameRegistry } from "../composables/useGameRegistry";
import type { GameDefinition } from "../types/gameRegistry";

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

// Cities
import parisArrondissements from "../config/games/cities/paris-arrondissements.json";
import londonBoroughs from "../config/games/cities/london-boroughs.json";

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
 * Currently includes pilot games + continent games
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

  // Cities
  parisArrondissements,
  londonBoroughs,
] as GameDefinition[];

/**
 * Load and register all games into the registry
 * Call this once at app startup
 */
export function loadGames(): void {
  const registry = useGameRegistry();
  registry.registerGames(ALL_GAMES);
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
