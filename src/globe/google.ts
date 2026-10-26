import { Capacitor, registerPlugin } from '@capacitor/core'

export const nativeGoogle = registerPlugin<{ signIn(options: { clientId: string; nonce: string }): Promise<{ credential: string }>; signOut(): Promise<void>; persistCookies(): Promise<void> }>('AtlasGoogle')
export const nativeAccount = Capacitor.isNativePlatform()
let script: Promise<void> | undefined
export function loadGoogle(): Promise<void> {
  if (window.google?.accounts?.id) {return Promise.resolve()}
  if (!script) {
    script = new Promise<void>((resolve, reject) => {
      const element = document.createElement('script')
      const timeout = setTimeout(() => {element.remove(); reject(new Error('Google could not load. Try again.'))}, 10000)
      element.src = 'https://accounts.google.com/gsi/client'; element.async = true
      element.onload = () => {clearTimeout(timeout); resolve()}
      element.onerror = () => {clearTimeout(timeout); element.remove(); reject(new Error('Google could not load. Try again.'))}
      document.head.append(element)
    }).catch(error => {script = undefined; throw error})
  }
  return script
}
