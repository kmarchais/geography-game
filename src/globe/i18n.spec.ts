import { afterEach, expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import en from './locales/en.json'
import fr from './locales/fr.json'
import names from '../../public/data/globe/names.fr.json'
import { countryName, detectLanguage, formatPercent, formatTime, formatScoreTime, formatFinishedAt, language, t } from './i18n'

afterEach(() => {language.value = 'en'})
test('formats finish dates in the selected language and leaves historical dates unknown', () => {
  const timestamp = Date.UTC(2026, 9, 29, 15, 42)
  for (const locale of ['en', 'fr'] as const) {
    language.value = locale
    expect(formatFinishedAt(timestamp)).toBe(new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp))
    for (const missing of [undefined, null, NaN, -1, 1e20]) {expect(formatFinishedAt(missing)).toBe(t('finishDateUnknown'))}
  }
})
test('uses French only when the primary language is French, otherwise English', () => {
  for (const tag of ['fr', 'fr-FR', 'fr-CA', 'FR-be']) {expect(detectLanguage(tag)).toBe('fr')}
  for (const tag of ['en-US', 'de-DE', 'es', 'en-FR', '']) {expect(detectLanguage(tag)).toBe('en')}
})
test('catalogues have exactly the same keys and interpolation parameters', () => {
  expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort())
  for (const key of Object.keys(en) as (keyof typeof en)[]) {
    expect(fr[key].trim()).not.toBe('')
    const parameters = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort()
    expect(parameters(fr[key]), key).toEqual(parameters(en[key]))
  }
})
test('every quiz country has a French name without changing its identifier', () => {
  const countries = JSON.parse(readFileSync('public/data/globe/countries.json', 'utf8')).filter((country: { playable: boolean }) => country.playable)
  expect(countries).toHaveLength(195)
  for (const country of countries) {expect((names as Record<string, string>)[country.id]).toBeTruthy()}
  const chad = { id: 'TCD', name: 'Chad' }
  language.value = 'fr'; expect(countryName(chad)).toBe('Tchad'); expect(t('connectedAs', { name: 'Alex' })).toBe('Connecté : Alex')
  language.value = 'en'; expect(countryName(chad)).toBe('Chad'); expect(chad.id).toBe('TCD')
})
test('formats percentages and the chronometer for each language', () => {
  language.value = 'fr'; expect(formatPercent(.5)).toBe('0,5\u00a0%'); expect(formatTime(12345)).toBe('00:12,3')
  language.value = 'en'; expect(formatPercent(.5)).toBe('0.5%'); expect(formatTime(12345)).toBe('00:12.3')
})

test('shows whole-second result times in both languages', () => {
  for (const value of ['en', 'fr'] as const) {
    language.value = value
    expect(formatScoreTime(125900)).toBe('02:05')
    expect(formatScoreTime(0)).toBe('00:00')
  }
})
