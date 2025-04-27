/**
 * main.ts
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

import { registerPlugins } from '@/plugins';
import 'leaflet/dist/leaflet.css';

import App from './App.vue';

import { createApp } from 'vue';

import 'vuetify/styles'

const app = createApp(App)

registerPlugins(app)

app.mount('#app')
