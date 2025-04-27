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

const app = createApp(App)

registerPlugins(app)

app.mount('#app')
