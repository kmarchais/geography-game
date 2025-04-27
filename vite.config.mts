// Plugins
import Vue from '@vitejs/plugin-vue'
import ViteFonts from 'unplugin-fonts/vite'
import Components from 'unplugin-vue-components/vite'
import VueRouter from 'unplugin-vue-router/vite'
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
// Utilities
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

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
    allowedHosts: ['healthcheck.railway.app', 'geography-game-geography-game-pr-17.up.railway.app'],
  },
  css: {
    preprocessorOptions: {
      sass: {
        // api: 'modern-compiler',
      },
    },
  },
})
