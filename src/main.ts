/**
 * main.ts
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

import { registerPlugins } from '@/plugins';
import 'leaflet/dist/leaflet.css';

import App from './App.vue';

import { createApp } from 'vue';

// Import Vuetify and its styles
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css' // if you're using Material Design Icons

// Import service worker registration
import { register as registerServiceWorker } from './utils/serviceWorkerRegistration';

const app = createApp(App)

registerPlugins(app)

app.mount('#app')

// Register service worker
registerServiceWorker({
  onSuccess: () => {
    console.log('[App] Service worker registered successfully');
  },
  onUpdate: () => {
    console.log('[App] New version available! Please refresh to update.');
  },
  onOffline: () => {
    console.log('[App] App is offline');
  },
  onOnline: () => {
    console.log('[App] App is back online');
  },
});
