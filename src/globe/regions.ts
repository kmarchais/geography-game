import flags from './flag-codes.json'
import type { Country } from './geography'
export const REGION_MODES = ['americas', 'europe', 'africa', 'asia', 'oceania'] as const
export type RegionMode = typeof REGION_MODES[number]
export type GameMode = 'world' | 'explore' | RegionMode
export interface RegionalCountry extends Country { regions: RegionMode[]; nameFr?: string; flag?: string }
const codes: Record<string, string> = flags
export function flagCode(country: Country | undefined): string | undefined {return country ? (country as RegionalCountry).flag || codes[country.id] : undefined}
export function regionalCountries(countries: RegionalCountry[], mode: RegionMode): Country[] {
  // Keep other regions visible and selectable as wrong guesses, outside the deck.
  return countries.map(country => ({...country, playable: true, inDeck: country.regions.includes(mode)}))
}
export function regionalDeck(countries: Country[]): Country[] {return countries.filter(c => (c as Country & { inDeck?: boolean }).inDeck)}
export function validateRegionalCountries(value: unknown): RegionalCountry[] {
  if (!Array.isArray(value) || value.length < 200 || value.length > 400 || new Set(value.map(c => c?.id)).size !== value.length) {throw new Error('Invalid regional geography')}
  for (const c of value) {
    if (!c || c.playable !== true || typeof c.small !== 'boolean' || typeof c.continent !== 'string' || typeof c.id !== 'string' || typeof c.name !== 'string' || !Array.isArray(c.regions) || !c.regions.length || c.regions.some((r: RegionMode) => !REGION_MODES.includes(r)) || !/^[a-z]{2}$/.test(c.flag) || !Array.isArray(c.center) || c.center.length !== 2 || !c.center.every(Number.isFinite) || Math.abs(c.center[0]) > 180 || Math.abs(c.center[1]) > 90 || !Array.isArray(c.polygons) || !c.polygons.length || !c.polygons.every((p: number[][][]) => Array.isArray(p) && p.length && p.every(r => Array.isArray(r) && r.length >= 4 && r.every(v => Array.isArray(v) && v.length === 2 && v.every(Number.isFinite) && Math.abs(v[0]!) <= 180 && Math.abs(v[1]!) <= 90)))) {throw new Error('Invalid regional country')}
  }
  return value
}
export async function fetchRegionalCountries(base: string, signal: AbortSignal): Promise<RegionalCountry[]> {
  const compressed = typeof DecompressionStream !== 'undefined' && import.meta.env.VITE_NATIVE !== 'true'
  const response = await fetch(`${base}data/globe/regions.json${compressed ? '.gz' : ''}`, {signal})
  if (!response.ok) {throw new Error('Regional geography could not be loaded')}
  const decoded = compressed && response.headers.get('content-encoding') !== 'gzip' && response.body ? new Response(response.body.pipeThrough(new DecompressionStream('gzip'))) : response
  return validateRegionalCountries(await decoded.json())
}
