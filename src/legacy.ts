import type { App } from 'vue'
import vuetify from './plugins/vuetify'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import 'leaflet/dist/leaflet.css'

let installed = false
export function installLegacy(app: App) {
  if (installed) {return}
  installed = true
  app.use(vuetify)
  const script = document.createElement('script')
  script.src = 'https://accounts.google.com/gsi/client'
  script.async = true
  document.head.append(script)
}
