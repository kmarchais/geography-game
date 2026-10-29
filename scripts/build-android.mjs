import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { rmSync } from 'node:fs'

const endpoint = process.env.VITE_ATLAS_API_URL
if (!endpoint || new URL(endpoint).protocol !== 'https:') {throw new Error('Set VITE_ATLAS_API_URL to the absolute HTTPS ranking endpoint before building Android.')}
const env = { ...process.env, BASE_URL: '/', VITE_NATIVE: 'true' }
execFileSync(process.execPath, [resolve('node_modules/vite/bin/vite.js'), 'build', '--outDir', '.local/android-web'], { stdio: 'inherit', env })
// Android treats foo.json and foo.json.gz as the same asset. APK compression
// already compresses the plain snapshot, which the native build loads directly.
for (const file of ['countries', 'regions']) {rmSync(resolve(`.local/android-web/data/globe/${file}.json.gz`))}
execFileSync(process.execPath, [resolve('node_modules/@capacitor/cli/bin/capacitor'), 'sync', 'android'], { stdio: 'inherit', env })
