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

// Railway injects the public URL into RAILWAY_STATIC_URL
// This will contain the specific URL for the current deployment (main or PR)
const railwayStaticUrl = process.env.RAILWAY_STATIC_URL

if (railwayStaticUrl) {
  try {
    // Extract the hostname (e.g., "my-app-pr-123.up.railway.app")
    const railwayHost = new URL(railwayStaticUrl).hostname
    allowed.push(railwayHost)
    console.log(`Dynamically added Railway host: ${railwayHost}`)
  } catch (e) {
    console.error(
      'Failed to parse RAILWAY_STATIC_URL:',
      railwayStaticUrl,
      e,
    )
    // Fallback to main branch URL if parsing fails
    allowed.push('geography-game-geography-game.up.railway.app')
    console.warn(
      'Falling back to default main branch host: geography-game-geography-game.up.railway.app',
    )
  }
} else {
  // Fallback for local development or if the variable isn't set
  console.warn(
    'RAILWAY_STATIC_URL environment variable not found. Falling back to default main branch host.',
  )
  // Add your main branch URL as a default fallback
  allowed.push('geography-game-geography-game.up.railway.app')
}

// Ensure unique hosts
const uniqueAllowedHosts = [...new Set(allowed)]

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
        families: [{
          name: 'Roboto',
          styles: 'wght@100;300;400;500;700;900',
        }],
      },
    }),
  ],
  define: { 'process.env': {} },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    extensions: [
      '.js',
      '.json',
      '.jsx',
      '.mjs',
      '.ts',
      '.tsx',
      '.vue',
    ],
  },
  server: {
    port: 3000,
  },
  preview: {
    // Use the dynamically generated list of hosts
    allowedHosts: uniqueAllowedHosts,
    // Set host to true to allow access from network IPs (needed in containers)
    host: true,
    // You can specify a port for the preview server if needed, e.g.:
    // port: 4173, // Vite's default preview port
  },
  css: {
    preprocessorOptions: {
      sass: {
        api: 'modern-compiler',
      },
    },
  },
})
