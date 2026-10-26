import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles/orbit.css'

createApp(App).use(router).mount('#app')

if ('serviceWorker' in navigator && import.meta.env.PROD && import.meta.env.VITE_NATIVE !== 'true') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}service-worker.js`).catch(() => {})
  })
}
