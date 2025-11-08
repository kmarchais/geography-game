/**
 * Game loader utility
 * Imports and registers all game configurations
 */

import { useGameRegistry } from "../composables/useGameRegistry";
import type { GameDefinition } from "../types/gameRegistry";

// Import pilot game configurations
import worldCountries from "../config/games/countries/world.json";
import europeCountries from "../config/games/countries/europe.json";
import usStates from "../config/games/divisions/us-states.json";
import parisArrondissements from "../config/games/cities/paris-arrondissements.json";
import londonBoroughs from "../config/games/cities/london-boroughs.json";

/**
 * All available game configurations
 * Currently includes 5 pilot games
 */
const PILOT_GAMES: GameDefinition[] = [
  worldCountries,
  europeCountries,
  usStates,
  parisArrondissements,
  londonBoroughs,
] as GameDefinition[];

/**
 * Load and register all games into the registry
 * Call this once at app startup
 */
export function loadGames(): void {
  const registry = useGameRegistry();
  registry.registerGames(PILOT_GAMES);
}

/**
 * Get list of all pilot games without loading into registry
 * Useful for testing
 */
export function getPilotGames(): readonly GameDefinition[] {
  return PILOT_GAMES;
}

/**
 * Get count of available games
 */
export function getGameCount(): number {
  return PILOT_GAMES.length;
}
