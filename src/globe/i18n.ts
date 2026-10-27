import { ref, watch } from 'vue'
import en from './locales/en.json'
import fr from './locales/fr.json'
import countryNamesFr from '../../public/data/globe/names.fr.json'
import { formatTime as gameTime } from './game'

export type Language = 'en' | 'fr'
export type MessageKey = keyof typeof en
const messages: Record<Language, Record<MessageKey, string>> = { en, fr }
const names: Record<string, string> = countryNamesFr
export function detectLanguage(tag = navigator.languages?.[0] || navigator.language): Language {return tag?.toLowerCase().startsWith('fr') ? 'fr' : 'en'}
export const language = ref<Language>(detectLanguage())
const percent = { en: new Intl.NumberFormat('en', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }), fr: new Intl.NumberFormat('fr', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }) }
const decimal = { en: new Intl.NumberFormat('en', { minimumFractionDigits: 1, maximumFractionDigits: 1 }), fr: new Intl.NumberFormat('fr', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) }
export function t(key: MessageKey, values: Record<string, string | number> = {}): string {return messages[language.value][key].replace(/\{(\w+)\}/g, (match, name) => values[name] === undefined ? match : String(values[name]))}
export function countryName(country: { id: string; name: string } | undefined): string {return country ? (language.value === 'fr' ? names[country.id] || country.name : country.name) : ''}
export function formatPercent(value: number): string {return percent[language.value].format(value / 100)}
export function formatTime(value: number): string {const time = gameTime(value); return language.value === 'fr' ? time.replace('.', ',') : time}
export function formatCoordinate(value: number): string {return decimal[language.value].format(value)}
function updateLanguage() {language.value = detectLanguage()}
if (typeof window !== 'undefined') {
  window.addEventListener('languagechange', updateLanguage)
  if (import.meta.hot) {import.meta.hot.dispose(() => window.removeEventListener('languagechange', updateLanguage))}
  watch(language, () => {
    document.documentElement.lang = language.value
    document.title = t('appTitle')
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('appDescription'))
    document.querySelector('link[rel="manifest"]')?.setAttribute('href', `${import.meta.env.BASE_URL}manifest${language.value === 'fr' ? '.fr' : ''}.webmanifest`)
  }, { immediate: true })
}

export function formatScoreTime(value: number): string {return formatTime(value).replace(/[.,]\d$/, '')}
