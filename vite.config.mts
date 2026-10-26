import Vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { defineConfig, type Manifest } from 'vite'

const base = process.env.BASE_URL || '/geography-game/'
let outputDirectory = 'dist'
export default defineConfig({
  base,
  plugins: [
    Vue({ template: { transformAssetUrls } }),
    Vuetify({ autoImport: true, styles: { configFile: 'src/styles/settings.scss' } }),
    Components({ dts: false }),
    {
      name: 'globe-offline-manifest',
      apply: 'build',
      configResolved(config) { outputDirectory = config.build.outDir },
      closeBundle() {
        const manifest: Manifest = JSON.parse(readFileSync(`${outputDirectory}/.vite/manifest.json`, 'utf8'))
        const files = new Set(['./', 'index.html', 'manifest.webmanifest', 'atlas.svg', 'atlas-192.png', 'atlas-512.png', 'apple-touch-icon.png', 'data/globe/countries.json', 'data/globe/countries.json.gz', 'data/globe/earth-preview.jpg', 'data/globe/earth.jpg', 'fonts/dm-sans.woff2', 'fonts/manrope.woff2'])
        const visited = new Set<string>()
        function include(key: string) {
          if (visited.has(key)) {return}
          visited.add(key)
          const entry = manifest[key]
          if (!entry) {throw new Error(`Missing precache entry ${key}`)}
          files.add(entry.file)
          entry.css?.forEach(file => files.add(file))
          entry.assets?.forEach(file => files.add(file))
          entry.imports?.forEach(include)
        }
        Object.entries(manifest).filter(([key, entry]) => entry.isEntry || key === 'src/views/GlobeGame.vue').forEach(([key]) => include(key))
        const paths = [...files]
        const hash = createHash('sha256')
        for (const file of paths) {hash.update(readFileSync(`${outputDirectory}/${file === './' ? 'index.html' : file}`))}
        writeFileSync(`${outputDirectory}/precache.js`, `self.ORBIT_CACHE_VERSION=${JSON.stringify(hash.digest('hex').slice(0, 16))};self.ORBIT_PRECACHE=${JSON.stringify(paths)};`)
      },
    },
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { port: 3000, host: '127.0.0.1', proxy: { '/atlas-api': `http://127.0.0.1:${process.env.ATLAS_PROXY_PORT || 4178}` } },
  preview: { host: true, proxy: { '/atlas-api': `http://127.0.0.1:${process.env.ATLAS_PROXY_PORT || 4178}` }, allowedHosts: ['healthcheck.railway.app', 'geography-game-test.up.railway.app', 'geography-game.up.railway.app', ...(process.env.RAILWAY_STATIC_URL ? [process.env.RAILWAY_STATIC_URL] : [])] },
  css: { preprocessorOptions: { scss: { api: 'modern-compiler' } } },
  build: { target: 'es2020', manifest: true, chunkSizeWarningLimit: 650 },
})
