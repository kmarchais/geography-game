import { chromium } from '@playwright/test'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'

// One editable vector supplies the website, installed PWA, and Android launcher.
const svg = readFileSync('public/atlas.svg', 'utf8')
const foreground = svg.replace(/<g id="tile-background">[\s\S]*?<\/g>/, '')
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  async function render(source, size, round = false) {
    return Buffer.from(await page.evaluate(async ({ source, size, round }) => {
      const image = new Image()
      image.src = `data:image/svg+xml;base64,${btoa(source)}`
      await image.decode()
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = size
      const context = canvas.getContext('2d')
      if (round) {context.beginPath(); context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); context.clip()}
      context.drawImage(image, 0, 0, size, size)
      return canvas.toDataURL('image/png').split(',')[1]
    }, { source, size, round }), 'base64')
  }
  for (const size of [192, 512]) {writeFileSync(`public/atlas-${size}.png`, await render(svg, size))}
  writeFileSync('public/apple-touch-icon.png', await render(svg, 180))
  const png = await render(svg, 48)
  const ico = Buffer.alloc(22)
  ico.writeUInt16LE(1, 2); ico.writeUInt16LE(1, 4)
  ico[6] = ico[7] = 48; ico.writeUInt16LE(1, 10); ico.writeUInt16LE(32, 12)
  ico.writeUInt32LE(png.length, 14); ico.writeUInt32LE(22, 18)
  writeFileSync('public/favicon.ico', Buffer.concat([ico, png]))
  for (const [density, size] of Object.entries({ mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 })) {
    const path = `android/app/src/main/res/mipmap-${density}`
    mkdirSync(path, { recursive: true })
    writeFileSync(`${path}/ic_launcher.png`, await render(svg, size))
    writeFileSync(`${path}/ic_launcher_round.png`, await render(svg, size, true))
    writeFileSync(`${path}/ic_launcher_foreground.png`, await render(foreground, size * 108 / 48))
  }
  for (const directory of readdirSync('android/app/src/main/res').filter(name => name.startsWith('drawable'))) {
    const path = `android/app/src/main/res/${directory}/splash.png`
    let previous
    try {previous = readFileSync(path)} catch (error) {if (error.code === 'ENOENT') {continue} throw error}
    const width = previous.readUInt32BE(16), height = previous.readUInt32BE(20)
    const png = await page.evaluate(async ({ source, width, height }) => {
      const image = new Image(); image.src = `data:image/svg+xml;base64,${btoa(source)}`; await image.decode()
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
      const context = canvas.getContext('2d'); context.fillStyle = '#090f13'; context.fillRect(0, 0, width, height)
      const size = Math.round(Math.min(width, height) * .4)
      context.drawImage(image, (width - size) / 2, (height - size) / 2, size, size)
      return canvas.toDataURL('image/png').split(',')[1]
    }, { source: foreground, width, height })
    writeFileSync(path, Buffer.from(png, 'base64'))
  }
  console.log('Atlas icons generated for web, PWA, iOS bookmarks, and Android')
} finally {await browser.close()}
