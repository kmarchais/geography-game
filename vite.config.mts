// vite.config.mts

// Plugins
import Vue from '@vitejs/plugin-vue'
import ViteFonts from 'unplugin-fonts/vite'
import Components from 'unplugin-vue-components/vite'
import VueRouter from 'unplugin-vue-router/vite'
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
// import { visualizer } from 'rollup-plugin-visualizer'

// Utilities
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

// --- Dynamic Host Logic ---
// Base allowed hosts
const allowed = ['healthcheck.railway.app', 'geography-game-test.up.railway.app']

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
    // Bundle analyzer - TEMPORARILY DISABLED (causing CI hangs)
    // visualizer({
    //   filename: 'dist/stats.html',
    //   open: false,
    //   gzipSize: true,
    //   brotliSize: true,
    //   template: 'treemap', // 'sunburst', 'treemap', 'network'
    // }) as any,

    // TODO: Replace manual service worker with vite-plugin-pwa
    // The current manual service worker in public/service-worker.js works but has limitations:
    // - Cannot cache hashed asset names (Vite generates index-[hash].js)
    // - Manual cache invalidation required
    // - No workbox integration
    //
    // To migrate to vite-plugin-pwa:
    // 1. Run: bun add -D vite-plugin-pwa
    // 2. Import: import { VitePWA } from 'vite-plugin-pwa'
    // 3. Add to plugins array (see git history for configuration)
    // 4. Remove manual registration in src/main.ts
    // 5. Use: import { registerSW } from 'virtual:pwa-register'
    //
    // Note: As of Dec 2024, there are known Sass compatibility issues with vite-plugin-pwa
    // that cause build failures. Revisit when vite-plugin-pwa is updated for Vite 6+
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
      scss: {
        api: 'legacy', // Use legacy Dart Sass API to avoid sass-embedded issues
        // additionalData: `@import "@/styles/variables.scss";`
      },
    },
  },
  build: {
    // Target modern browsers for smaller bundles
    target: 'es2020',

    // Source maps for production debugging (optional)
    sourcemap: false,

    // Chunk size warning limit
    chunkSizeWarningLimit: 600,

    // Simplified rollup options for CI compatibility
    // Manual chunking disabled to avoid CI hanging issues
    // rollupOptions: {
    //   output: {
    //     manualChunks: {
    //       'vue-core': ['vue', 'vue-router', 'pinia'],
    //       'vuetify': ['vuetify', 'vuetify/components', 'vuetify/directives'],
    //       'leaflet': ['leaflet'],
    //     },
    //     chunkFileNames: (chunkInfo) => {
    //       if (chunkInfo.name.includes('config/games/')) {
    //         const gameName = chunkInfo.name.split('/').pop()?.replace('.json', '') || 'game';
    //         return `assets/${gameName}-[hash].js`;
    //       }
    //       return 'assets/[name]-[hash].js';
    //     },
    //   },
    // },

    // Minification - using esbuild for faster builds
    minify: 'esbuild',
  },
})
