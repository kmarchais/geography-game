/**
 * Daily Challenge Generator
 *
 * Generates a deterministic daily challenge from a date seed.
 * All players worldwide get the same challenge for a given date.
 */

import type { DailyChallenge, ChallengeRound } from '../types/dailyChallenge'
import { createSeededRandom } from './seededRandom'
import { worldCapitals } from './capitalCitiesData'

/**
 * Get today's date in YYYYMMDD format (UTC)
 */
export function getTodayDateString(): string {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(now.getUTCDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

// All countries available in the world map
// This should match the countries in public/data/countries.geojson
const ALL_COUNTRIES = [
  'Afghanistan',
  'Albania',
  'Algeria',
  'Andorra',
  'Angola',
  'Antigua and Barbuda',
  'Argentina',
  'Armenia',
  'Australia',
  'Austria',
  'Azerbaijan',
  'Bahamas',
  'Bahrain',
  'Bangladesh',
  'Barbados',
  'Belarus',
  'Belgium',
  'Belize',
  'Benin',
  'Bhutan',
  'Bolivia',
  'Bosnia and Herzegovina',
  'Botswana',
  'Brazil',
  'Brunei',
  'Bulgaria',
  'Burkina Faso',
  'Burundi',
  'Cambodia',
  'Cameroon',
  'Canada',
  'Cape Verde',
  'Central African Republic',
  'Chad',
  'Chile',
  'China',
  'Colombia',
  'Comoros',
  'Congo',
  'Costa Rica',
  'Croatia',
  'Cuba',
  'Cyprus',
  'Czech Republic',
  'Denmark',
  'Djibouti',
  'Dominica',
  'Dominican Republic',
  'East Timor',
  'Ecuador',
  'Egypt',
  'El Salvador',
  'Equatorial Guinea',
  'Eritrea',
  'Estonia',
  'Eswatini',
  'Ethiopia',
  'Fiji',
  'Finland',
  'France',
  'Gabon',
  'Gambia',
  'Georgia',
  'Germany',
  'Ghana',
  'Greece',
  'Grenada',
  'Guatemala',
  'Guinea',
  'Guinea-Bissau',
  'Guyana',
  'Haiti',
  'Honduras',
  'Hungary',
  'Iceland',
  'India',
  'Indonesia',
  'Iran',
  'Iraq',
  'Ireland',
  'Israel',
  'Italy',
  'Ivory Coast',
  'Jamaica',
  'Japan',
  'Jordan',
  'Kazakhstan',
  'Kenya',
  'Kiribati',
  'Kosovo',
  'Kuwait',
  'Kyrgyzstan',
  'Laos',
  'Latvia',
  'Lebanon',
  'Lesotho',
  'Liberia',
  'Libya',
  'Liechtenstein',
  'Lithuania',
  'Luxembourg',
  'Madagascar',
  'Malawi',
  'Malaysia',
  'Maldives',
  'Mali',
  'Malta',
  'Marshall Islands',
  'Mauritania',
  'Mauritius',
  'Mexico',
  'Micronesia',
  'Moldova',
  'Monaco',
  'Mongolia',
  'Montenegro',
  'Morocco',
  'Mozambique',
  'Myanmar',
  'Namibia',
  'Nauru',
  'Nepal',
  'Netherlands',
  'New Zealand',
  'Nicaragua',
  'Niger',
  'Nigeria',
  'North Korea',
  'North Macedonia',
  'Norway',
  'Oman',
  'Pakistan',
  'Palau',
  'Palestine',
  'Panama',
  'Papua New Guinea',
  'Paraguay',
  'Peru',
  'Philippines',
  'Poland',
  'Portugal',
  'Qatar',
  'Romania',
  'Russia',
  'Rwanda',
  'Saint Kitts and Nevis',
  'Saint Lucia',
  'Saint Vincent and the Grenadines',
  'Samoa',
  'San Marino',
  'Sao Tome and Principe',
  'Saudi Arabia',
  'Senegal',
  'Serbia',
  'Seychelles',
  'Sierra Leone',
  'Singapore',
  'Slovakia',
  'Slovenia',
  'Solomon Islands',
  'Somalia',
  'South Africa',
  'South Korea',
  'South Sudan',
  'Spain',
  'Sri Lanka',
  'Sudan',
  'Suriname',
  'Sweden',
  'Switzerland',
  'Syria',
  'Taiwan',
  'Tajikistan',
  'Tanzania',
  'Thailand',
  'Togo',
  'Tonga',
  'Trinidad and Tobago',
  'Tunisia',
  'Turkey',
  'Turkmenistan',
  'Tuvalu',
  'Uganda',
  'Ukraine',
  'United Arab Emirates',
  'United Kingdom',
  'United States of America',
  'Uruguay',
  'Uzbekistan',
  'Vanuatu',
  'Vatican City',
  'Venezuela',
  'Vietnam',
  'Yemen',
  'Zambia',
  'Zimbabwe',
]

/**
 * Generate daily challenge for a given date
 */
export function generateDailyChallenge(dateString: string): DailyChallenge {
  const seed = parseInt(dateString, 10)
  const rng = createSeededRandom(dateString)

  // Round 1: Find 10 countries on world map
  const territoriesRound: ChallengeRound = {
    type: 'territory',
    title: 'Find 10 Countries',
    entities: rng.sample(ALL_COUNTRIES, 10),
    count: 10,
  }

  // Round 2: Identify 5 country flags
  const flagsRound: ChallengeRound = {
    type: 'flag',
    title: 'Identify 5 Flags',
    entities: rng.sample(ALL_COUNTRIES, 5),
    count: 5,
  }

  // Round 3: Name 5 capitals
  // Only select countries that have capitals in our data
  const countriesWithCapitals = ALL_COUNTRIES.filter((country) =>
    worldCapitals.some((data) => data.country === country)
  )
  const capitalRound: ChallengeRound = {
    type: 'capital',
    title: 'Name 5 Capitals',
    entities: rng.sample(countriesWithCapitals, 5),
    count: 5,
  }

  return {
    date: dateString,
    seed,
    rounds: [territoriesRound, flagsRound, capitalRound],
    totalRounds: 3,
  }
}

/**
 * Generate today's daily challenge
 */
export function generateTodaysChallenge(): DailyChallenge {
  const today = getTodayDateString()
  return generateDailyChallenge(today)
}

/**
 * Check if two dates are the same day (YYYYMMDD format)
 */
export function isSameDay(date1: string, date2: string): boolean {
  return date1 === date2
}

/**
 * Check if date2 is the day after date1
 */
export function isConsecutiveDay(date1: string, date2: string): boolean {
  const d1 = parseDate(date1)
  const d2 = parseDate(date2)

  // Add one day to date1
  const nextDay = new Date(d1)
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)

  return (
    nextDay.getUTCFullYear() === d2.getUTCFullYear() &&
    nextDay.getUTCMonth() === d2.getUTCMonth() &&
    nextDay.getUTCDate() === d2.getUTCDate()
  )
}

/**
 * Parse YYYYMMDD string to Date object
 */
function parseDate(dateString: string): Date {
  const year = parseInt(dateString.substring(0, 4), 10)
  const month = parseInt(dateString.substring(4, 6), 10) - 1
  const day = parseInt(dateString.substring(6, 8), 10)
  return new Date(Date.UTC(year, month, day))
}

/**
 * Format date string for display (e.g., "January 11, 2025")
 */
export function formatChallengeDate(dateString: string): string {
  const date = parseDate(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

/**
 * Get time remaining until next challenge (in milliseconds)
 */
export function getTimeUntilNextChallenge(): number {
  const now = new Date()
  const tomorrow = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0)
  )
  return tomorrow.getTime() - now.getTime()
}

/**
 * Format milliseconds as "Xh Ym" remaining
 */
export function formatTimeRemaining(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}h ${minutes}m`
}
