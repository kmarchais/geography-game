import { ref } from 'vue'
import { rankingRequest, validRanking } from './ranking'
import type { RankedScore } from './game'

export interface AtlasUser { id: string; name: string }
export const account = ref<AtlasUser | null>(null)
export const accountBest = ref<RankedScore>()
export const googleClientId = ref('')
export async function refreshAccount() {
  const result = await rankingRequest<{ user: AtlasUser | null; best: unknown; googleClientId: string }>('/auth/session')
  account.value = result.user
  accountBest.value = result.best ? validRanking([result.best])[0] : undefined
  googleClientId.value = result.googleClientId || ''
}
