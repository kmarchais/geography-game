// vite.config.mts

// Plugins
import Vue from '@vitejs/plugin-vue'
import ViteFonts from 'unplugin-fonts/vite'
import Components from 'unplugin-vue-components/vite'
import VueRouter from 'unplugin-vue-router/vite'
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'

// Utilities
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

// --- Dynamic Host Logic ---
// Base allowed hosts
const allowed = ['healthcheck.railway.app']

// Railway injects the public HOSTNAME into RAILWAY_STATIC_URL (based on error)
const railwayHost = process.env.RAILWAY_STATIC_URL

if (railwayHost) {
  // The environment variable directly contains the hostname we need
  allowed.push(railwayHost)
  console.log(`Using Railway host from env var: ${railwayHost}`)
} else {
  // Fallback for local development or if the variable isn't set
  console.warn(
    'RAILWAY_STATIC_URL environment variable not found. Falling back to default main branch host.',
  )
  // Add your main branch URL as a default fallback
  allowed.push('geography-game.up.railway.app')
}

// Ensure unique hosts
const uniqueAllowedHosts = [...new Set(allowed)]
console.log('Allowed hosts:', uniqueAllowedHosts) // Log the final list for debugging
// --- End Dynamic Host Logic ---

// Get base path from environment variable or use default
const basePath = process.env.BASE_URL || '/geography-game/'

// https://vitejs.dev/config/
export default defineConfig({
  base: basePath,
  plugins: [
    VueRouter(),
    Vue({
      template: { transformAssetUrls },
    }),
    // https://github.com/vuetifyjs/vuetify-loader/tree/master/packages/vite-plugin#readme
    Vuetify({
      autoImport: true,
      styles: {
        configFile: 'src/styles/settings.scss',
      },
    }),
    Components(),
    ViteFonts({
      google: {
        families: [
          {
            name: 'Roboto',
            styles: 'wght@100;300;400;500;700;900',
          },
        ],
      },
    }),
  ],
  define: { 'process.env': {} }, // Keep this if your client-side code needs it
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    extensions: ['.js', '.json', '.jsx', '.mjs', '.ts', '.tsx', '.vue'],
  },
  server: {
    port: 3000,
    // host: true, // Optional for dev server access
  },
  preview: {
    // Use the dynamically generated list of hosts
    allowedHosts: uniqueAllowedHosts,
    // Set host to true to allow access from network IPs (needed in containers)
    host: true,
    // port: 4173, // Default Vite preview port, Railway uses $PORT
  },
  css: {
    preprocessorOptions: {
      sass: {
        api: 'modern-compiler',
      },
      scss: {
        // additionalData: `@import "@/styles/variables.scss";`
      },
    },
  },
})
