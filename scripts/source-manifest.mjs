import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// Compare source inputs between a working tree and an isolated build copy.
// Exclude dependency/build outputs and Capacitor's regenerated plugin glue.
const excluded = new Set(['build', '.gradle', '.idea', 'local.properties', 'capacitor.settings.gradle', 'capacitor.build.gradle', 'capacitor-cordova-android-plugins'])
const files = []
function add(path) {
  files.push({ path: path.replaceAll('\\', '/'), sha256: createHash('sha256').update(readFileSync(path)).digest('hex') })
}
function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (excluded.has(entry.name) || path.replaceAll('\\', '/') === 'android/app/src/main/assets') {continue}
    if (entry.isDirectory()) {walk(path)}
    else if (entry.isFile()) {add(path)}
  }
}
for (const directory of ['src', 'public', 'scripts', 'tests', 'server', 'android', '.github']) {walk(directory)}
for (const name of readdirSync('.').filter(name => /^(package\.json|bun\.lock|index\.html|env\.d\.ts|eslint\.config\.cjs|\.stylelintrc\.json|capacitor\.config\.ts|vite\.config\.mts|vitest\.config\.ts|playwright\.globe\.config\.ts|tsconfig.*\.json)$/.test(name))) {add(name)}
files.sort((a, b) => a.path.localeCompare(b.path, 'en'))
const sha256 = createHash('sha256').update(files.map(file => `${file.sha256} ${file.path}\n`).join('')).digest('hex')
const output = JSON.stringify({ algorithm: 'SHA-256', sha256, files }, null, 2) + '\n'
if (process.argv[2]) {writeFileSync(process.argv[2], output)}
else {process.stdout.write(output)}
