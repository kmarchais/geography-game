<template>
  <div
    ref="host"
    class="earth-host"
    :data-base-detail="baseDetail"
    :data-reveal="reveal"
    :data-hover="hovered?.id"
    data-testid="earth-host"
  >
    <canvas
      ref="canvas"
      tabindex="0"
      role="application"
      :aria-label="t('interactiveEarth')"
      @keydown="onKey"
    />
    <span
      class="crosshair"
      aria-hidden="true"
    />
    <span
      v-if="feedback"
      :key="feedback.id"
      class="answer-cue"
      :class="feedback.outcome"
      :style="{ left: `${feedback.x}px`, top: `${feedback.y}px` }"
      data-testid="answer-cue"
      :data-outcome="feedback.outcome"
      aria-hidden="true"
    >{{ feedback.outcome === 'correct' ? '✓' : '×' }}</span>
    <span
      class="sr-only"
      role="status"
    >{{ positionText }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { coordinateToVector, createCountryPicker, unwrapRing, vectorToCoordinate, type Country, type Coordinate } from '@/globe/geography'
import type { Answer } from '@/globe/game'
import { answerColor, countryAngularSize, islandBlend, rotationSpeed, revealDistance } from '@/globe/detail'
import { countryOutlines, countrySurface, outlineBatches, outlineHorizon, GlobeImagery } from '@/globe/terrain'
import { wheelPointer, zoomAtPointer, orbitPosition } from '@/globe/navigation'
import { t, language, formatCoordinate, type MessageKey } from '@/globe/i18n'

const props = defineProps<{ countries: Country[]; borders: boolean; paintFound: boolean; markers: boolean; answers: Answer[]; reveal?: string; disabled: boolean }>()
const emit = defineEmits<{ select: [country: Country | undefined]; ready: []; error: [message: MessageKey]; warning: [message: MessageKey] }>()
const host = ref<HTMLElement>()
const canvas = ref<HTMLCanvasElement>()
const positionCoordinates = ref<Coordinate>()
const positionText = computed(() => positionCoordinates.value ? t('globePosition', { coordinates: positionCoordinates.value.map(formatCoordinate).join(language.value === 'fr' ? ' ; ' : ', ') }) : '')
const baseDetail = ref('preview')
const hovered = ref<Country>()
let hoverMesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> | undefined
let hoverSurface: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> | undefined
const hoverIds = new Map<string, number>()
let hoverFrame = 0
const feedback = ref<{ id: number; outcome: 'correct' | 'wrong'; x: number; y: number }>()
let feedbackId = 0
let feedbackTimer: ReturnType<typeof setTimeout>
let detailTimer: ReturnType<typeof setTimeout>
let geometryTimer: ReturnType<typeof setTimeout>
let geometryIdle = 0
let imagery: GlobeImagery
let lastTap = { x: 0, y: 0 }
let renderer: THREE.WebGLRenderer | undefined
let controls: OrbitControls | undefined
let camera: THREE.PerspectiveCamera
let scene: THREE.Scene
let earth: THREE.Mesh
let atmosphere: THREE.Mesh
let baseGeometry: THREE.SphereGeometry
let detailedGeometry: THREE.SphereGeometry | undefined
let borderMesh: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>
let nearbyBorders: THREE.Group
let fillMesh: THREE.Mesh
let markerGroup: THREE.Group
let frame = 0
let disposed = false
let observer: ResizeObserver | undefined
let pointerStart: { x: number; y: number } | undefined
let holdTimer: ReturnType<typeof setTimeout> | undefined
let touchZoom: { id: number; x: number; y: number; lastY: number } | undefined
let mousePosition: [number, number] | undefined
let dragged = false
const pointers = new Set<number>()
const textures: THREE.Texture[] = []
const overlayWidth = navigator.maxTouchPoints > 0 || window.innerWidth < 800 ? 2048 : 4096
const overlayHeight = overlayWidth / 2
let pickCountry = createCountryPicker(props.countries)
const raycaster = new THREE.Raycaster()
const pickingSphere = new THREE.Sphere(new THREE.Vector3(), 1.0003)
const hitPoint = new THREE.Vector3()
const mouse = new THREE.Vector2()
const previousPosition = new THREE.Vector3()
const previousRotation = new THREE.Quaternion()
const markerPositions: { country: Country; position: THREE.Vector3; sprite: THREE.Sprite; surface: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>; angularSize: number; blend: number; highlighted: boolean }[] = []
let markerTexture: THREE.CanvasTexture
let fillCanvas: HTMLCanvasElement
let fillTexture: THREE.CanvasTexture
let fillCountries: Country[] | undefined
const paintedFills = new Map<string, string>()
let flight: { start: THREE.Vector3; turn: THREE.Quaternion; endDistance: number; started: number; duration: number; resolve: () => void } | undefined
function cancelFlight() {
  const current = flight
  flight = undefined
  if (controls) {controls.enabled = !props.reveal; controls.enableDamping = true}
  current?.resolve()
}
function flyTo(coordinate: Coordinate, distance: number, duration: number): Promise<void> {
  cancelFlight()
  if (!controls) {return Promise.resolve()}
  controls.enableDamping = false; controls.update(); controls.enabled = false
  const start = camera.position.clone(), end = new THREE.Vector3(...coordinateToVector(coordinate))
  return new Promise(resolve => {
    flight = { start, turn: new THREE.Quaternion().setFromUnitVectors(start.clone().normalize(), end), endDistance: distance,
      started: performance.now(), duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : duration, resolve }
    invalidate()
  })
}
function revealCountry(country: Country) {return flyTo(country.center, revealDistance(country, camera.aspect), 650)}
function pullBack() {return flyTo(vectorToCoordinate(camera.position), 3.1, 450)}

function invalidate() {
  if (!frame && !disposed && !document.hidden) {frame = requestAnimationFrame(render)}
}

function render() {
  frame = 0
  if (disposed || !renderer) {return}
  if (flight) {
    const current = flight, progress = Math.min(1, (performance.now() - current.started) / current.duration)
    camera.position.copy(orbitPosition(current.start, current.turn, current.endDistance, progress))
    camera.lookAt(0, 0, 0)
    if (progress === 1) {positionCoordinates.value = vectorToCoordinate(camera.position); cancelFlight()} else {invalidate()}
  }
  if (controls) {
    const distance = camera.position.length()
    controls.rotateSpeed = rotationSpeed(distance)
    controls.zoomSpeed = Math.min(.8, 2 * (distance - 1) / distance)
    const near = Math.max(.0001, Math.min(.01, (distance - 1) / 8))
    if (Math.abs(camera.near - near) > .000001) { camera.near = near; camera.updateProjectionMatrix() }
    atmosphere.visible = distance > 1.08
    const geometry = detailedGeometry && distance < 1.6 ? detailedGeometry : baseGeometry
    earth.geometry = geometry
    fillMesh.geometry = geometry
    if (hoverMesh) {hoverMesh.geometry = geometry}
  }
  previousPosition.copy(camera.position)
  previousRotation.copy(camera.quaternion)
  controls?.update()
  // OrbitControls' change threshold is too coarse at street-scale zoom.
  // Keep damping frames alive until the camera actually settles.
  if (previousPosition.distanceToSquared(camera.position) > 1e-18 || previousRotation.angleTo(camera.quaternion) > 1e-7) {
    invalidate()
    scheduleDetail()
  }
  if (mousePosition && !pointers.size && !props.disabled && !flight) {hoverCountry(countryAt(...mousePosition))}
  const focalLength = host.value!.clientHeight / (2 * Math.tan(21 * Math.PI / 180))
  const distance = camera.position.length()
  borderMesh.visible = props.borders && distance >= 1.4
  nearbyBorders.visible = props.borders && distance < 1.4
  const horizon = outlineHorizon(distance)
  if (nearbyBorders.visible) {for (const border of nearbyBorders.children as THREE.LineSegments[]) {
    const bounds = border.geometry.boundingSphere!
    // A conservative horizon test complements Three's frustum culling.
    border.visible = bounds.center.dot(camera.position) + bounds.radius * distance > horizon
  }}
  for (const marker of markerPositions) {
    marker.blend = islandBlend(marker.angularSize * focalLength / camera.position.distanceTo(marker.position), camera.position.length())
    marker.sprite.material.opacity = 1 - marker.blend
    marker.sprite.visible = marker.position.dot(camera.position) > marker.position.lengthSq() && (props.markers || marker.country.id === props.reveal) && marker.blend < 1
    marker.surface.visible = marker.highlighted && marker.blend > 0
    marker.surface.material.opacity = marker.blend * .65
    if (hoverSurface && marker.country.id === hovered.value?.id) {hoverSurface.material.opacity = marker.blend * .45}
  }
  renderer.render(scene, camera)
}

function scheduleDetail() {
  clearTimeout(detailTimer)
  detailTimer = setTimeout(() => { if (!disposed) { imagery?.update(camera, host.value!.clientHeight); invalidate() } }, 180)
}

function configureCountries() {
  if (!markerTexture || !scene) {return}
  pickCountry = createCountryPicker(props.countries)
  borderMesh.geometry.dispose()
  clearHover()
  borderMesh.geometry = countryOutlines(props.countries.filter(c => c.playable))
  for (const border of nearbyBorders.children as THREE.LineSegments[]) {border.geometry.dispose()}
  nearbyBorders.clear()
  for (const geometry of outlineBatches(borderMesh.geometry)) {
    const border = new THREE.LineSegments(geometry, borderMesh.material)
    border.renderOrder = 3
    nearbyBorders.add(border)
  }
  for (const marker of markerPositions) { marker.sprite.material.dispose(); marker.surface.geometry.dispose(); marker.surface.material.dispose() }
  markerGroup.clear()
  markerPositions.length = 0
  for (const country of props.countries.filter(c => c.playable && (c.small || !c.polygons.length))) {
    const position = new THREE.Vector3(...coordinateToVector(country.center)).multiplyScalar(1.0003)
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: markerTexture, sizeAttenuation: false, depthTest: true, transparent: true }))
    sprite.position.copy(position)
    sprite.scale.setScalar(.009)
    const surface = new THREE.Mesh(countrySurface(country), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0, side: THREE.DoubleSide }))
    surface.renderOrder = 2
    markerGroup.add(surface, sprite)
    markerPositions.push({ country, position, sprite, surface, angularSize: countryAngularSize(country), blend: 0, highlighted: false })
  }
  if (hoverMesh || matchMedia('(any-hover: hover)').matches) {prepareHover()}
  updateHighlights()
}

function showFeedback(correct: boolean) {
  clearTimeout(feedbackTimer)
  canvas.value?.getAnimations().forEach(animation => animation.cancel())
  if (!correct && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    canvas.value?.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }], { duration: 220, easing: 'ease-in-out' })
  }
  feedback.value = { ...lastTap, id: ++feedbackId, outcome: correct ? 'correct' : 'wrong' }
  feedbackTimer = setTimeout(() => { feedback.value = undefined }, 650)
}

function makeOverlay() {
  const image = document.createElement('canvas')
  image.width = overlayWidth
  image.height = overlayHeight
  const texture = new THREE.CanvasTexture(image)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.generateMipmaps = false
  texture.minFilter = THREE.LinearFilter
  textures.push(texture)
  return { image, texture }
}

function drawCountry(context: CanvasRenderingContext2D, country: Country) {
  for (const polygon of country.polygons) {
    for (const shift of [-overlayWidth, 0, overlayWidth]) {
      context.beginPath()
      for (const ring of polygon) {
        unwrapRing(ring).forEach(([lon, lat], index) => {
          const x = (lon + 180) / 360 * overlayWidth + shift
          const y = (90 - lat) / 180 * overlayHeight
          if (index === 0) {context.moveTo(x, y)}
          else {context.lineTo(x, y)}
        })
        context.closePath()
      }
      context.fill('evenodd')
    }
  }
}

function updateHighlights() {
  if (!fillTexture) {return}
  const context = fillCanvas.getContext('2d')!
  const answers = new Map(props.answers.map(answer => [answer.id, answer]))
  const fills = new Map<string, string>()
  for (const country of props.countries) {
    if (country.small) {continue} // Small countries use their exact vector surface.
    const answer = answers.get(country.id)
    const color = country.id === props.reveal ? '#ff4c58' : props.paintFound ? answerColor(answer) : undefined
    if (color) {fills.set(country.id, color + 'a6')}
  }
  // Keep resolved polygons on the canvas instead of redrawing the whole run.
  const clear = fillCountries !== props.countries || [...paintedFills].some(([id, color]) => fills.get(id) !== color)
  let changed = clear
  if (clear) {context.clearRect(0, 0, overlayWidth, overlayHeight); paintedFills.clear()}
  for (const country of props.countries) {
    const color = fills.get(country.id)
    if (!color || paintedFills.get(country.id) === color) {continue}
    context.fillStyle = color
    drawCountry(context, country)
    paintedFills.set(country.id, color); changed = true
  }
  fillCountries = props.countries
  fillMesh.visible = fills.size > 0
  if (changed) {fillTexture.needsUpdate = true}
  markerPositions.forEach(marker => {
    const answer = answers.get(marker.country.id)
    const color = marker.country.id === props.reveal ? '#ff4c58' : props.paintFound ? answerColor(answer) : undefined
    marker.sprite.material.color.set(marker.country.id === hovered.value?.id ? '#c3c9d0' : color ?? '#ccddd9')
    marker.highlighted = Boolean(color)
    if (color) {marker.surface.material.color.set(color)}
  })
  if (controls && !flight) {controls.enabled = !props.reveal}
  invalidate()
}

function focus(coordinate: Coordinate, distance = 2.8) {
  cancelFlight()
  if (!controls) {return}
  const position = new THREE.Vector3(...coordinateToVector(coordinate)).multiplyScalar(distance)
  if (!frame && camera.position.distanceToSquared(position) < 1e-18) {return}
  // Flush residual drag damping before a hint or reset changes the camera.
  controls.enableDamping = false
  controls.update()
  camera.position.copy(position)
  camera.lookAt(0, 0, 0)
  controls.update()
  controls.enableDamping = true
  invalidate()
}

function zoom(direction: number) {
  if (!controls || flight) {return}
  camera.position.setLength(THREE.MathUtils.clamp(1 + (camera.position.length() - 1) * (direction > 0 ? .7 : 1 / .7), controls.minDistance, controls.maxDistance))
  controls.update()
  invalidate()
}

function reset() { focus([18, 16], 3.1) }
defineExpose({ focus, zoom, reset, showFeedback, revealCountry, pullBack })

function countryAt(x: number, y: number): Country | undefined {
  if (!canvas.value || !controls) {return}
  const bounds = canvas.value.getBoundingClientRect()
  if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) {return}
  mouse.set((x - bounds.left) / bounds.width * 2 - 1, -(y - bounds.top) / bounds.height * 2 + 1)
  camera.updateMatrixWorld()
  raycaster.setFromCamera(mouse, camera)
  if (!raycaster.ray.intersectSphere(pickingSphere, hitPoint)) {return}
  // Markers use a fixed screen-space hit area so tiny islands remain tappable.
  let markerHit: Country | undefined
  let closest = 14
  for (const marker of markerPositions) {
    if (marker.blend >= .9) {continue}
    if (!props.markers && marker.country.polygons.length && marker.country.id !== props.reveal) {continue}
    if (marker.position.dot(camera.position.clone().sub(marker.position)) <= 0) {continue}
    const projected = marker.position.clone().project(camera)
    const dx = (projected.x + 1) * bounds.width / 2 + bounds.left - x
    const dy = (-projected.y + 1) * bounds.height / 2 + bounds.top - y
    const distance = Math.hypot(dx, dy)
    if (distance < closest) { closest = distance; markerHit = marker.country }
  }
  return markerHit ?? pickCountry(vectorToCoordinate(hitPoint))
}

function selectAt(x: number, y: number) {
  if (!canvas.value || props.disabled) {return}
  const bounds = canvas.value.getBoundingClientRect()
  lastTap = { x: x - bounds.left, y: y - bounds.top }
  emit('select', countryAt(x, y))
}
function clearHover() {
  cancelAnimationFrame(hoverFrame); hoverFrame = 0
  if (!hovered.value) {return}
  hovered.value = undefined
  if (hoverMesh) {hoverMesh.visible = false}
  if (hoverSurface) {hoverSurface.visible = false}
  updateHighlights()
}
function prepareHover() {
  if (hoverMesh) {
    const texture = hoverMesh.material.uniforms.mask!.value as THREE.Texture
    texture.dispose(); textures.splice(textures.indexOf(texture), 1)
    scene.remove(hoverMesh); hoverMesh.material.dispose()
  }
  const { image, texture } = makeOverlay(), context = image.getContext('2d')!
  // Upload country IDs once. Hover changes one uniform, never the whole globe texture.
  texture.colorSpace = THREE.NoColorSpace
  texture.minFilter = texture.magFilter = THREE.NearestFilter
  hoverIds.clear()
  props.countries.forEach((country, index) => {
    if (country.small) {return}
    hoverIds.set(country.id, index + 1)
    context.fillStyle = `rgb(${index + 1}, 0, 0)`
    drawCountry(context, country)
  })
  hoverMesh = new THREE.Mesh(baseGeometry, new THREE.ShaderMaterial({
    uniforms: { mask: { value: texture }, selected: { value: 0 }, color: { value: new THREE.Color('#c3c9d0') } },
    vertexShader: 'varying vec2 maskUv; void main(){ maskUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform sampler2D mask; uniform float selected; uniform vec3 color; varying vec2 maskUv;
      void main(){ if(abs(texture2D(mask,maskUv).r*255.-selected)>.5) discard;
        gl_FragColor=vec4(color,.45);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false,
  }))
  hoverMesh.scale.setScalar(1.00028); hoverMesh.renderOrder = 2; hoverMesh.visible = false; scene.add(hoverMesh)
}
function hoverCountry(country: Country | undefined) {
  if (country?.id === hovered.value?.id) {return}
  hovered.value = country
  if (hoverSurface) {hoverSurface.visible = false}
  if (country && !country.small) {
    if (!hoverMesh) {prepareHover()}
    hoverMesh!.material.uniforms.selected!.value = hoverIds.get(country.id)
    hoverMesh!.visible = true
  } else {
    if (hoverMesh) {hoverMesh.visible = false}
    if (country?.small) {
      const geometry = markerPositions.find(marker => marker.country.id === country.id)!.surface.geometry
      if (!hoverSurface) {
        hoverSurface = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: '#c3c9d0', transparent: true, depthWrite: false, opacity: .45, side: THREE.DoubleSide }))
        hoverSurface.renderOrder = 2; hoverSurface.scale.setScalar(1.00001); scene.add(hoverSurface)
      }
      hoverSurface.geometry = geometry; hoverSurface.visible = true
    }
  }
  updateHighlights()
}
function onPointerLeave() {mousePosition = undefined; clearHover()}

function onPointerDown(event: PointerEvent) {
  clearHover()
  if (event.pointerType !== 'mouse') {mousePosition = undefined}
  if (flight || props.reveal) {return}
  cancelTouchZoom()
  pointers.add(event.pointerId)
  if (pointers.size > 1) {dragged = true}
  else {
    dragged = false; pointerStart = { x: event.clientX, y: event.clientY }
    if (event.pointerType === 'touch') {
      holdTimer = setTimeout(() => {
        holdTimer = undefined
        if (!controls || flight || props.reveal || pointers.size !== 1 || dragged) {return}
        touchZoom = { id: event.pointerId, x: event.clientX, y: event.clientY, lastY: event.clientY }
        controls.enableRotate = false; dragged = true
      }, 300)
    }
  }
}
function onPointerMove(event: PointerEvent) {
  if (touchZoom?.id === event.pointerId) {
    const delta = touchZoom.lastY - event.clientY
    touchZoom.lastY = event.clientY
    if (delta) {zoomFromPoint(touchZoom.x, touchZoom.y, Math.exp(delta * .006))}
    return
  }
  if (event.pointerType === 'mouse') {
    mousePosition = [event.clientX, event.clientY]
    if (!pointers.size && !props.disabled && !flight && !hoverFrame) {
      hoverFrame = requestAnimationFrame(() => {
        hoverFrame = 0
        if (mousePosition && !pointers.size && !props.disabled && !flight) {hoverCountry(countryAt(...mousePosition))}
      })
    }
  }
  if (pointerStart && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 6) {dragged = true; clearTimeout(holdTimer)}
  if (pointers.size) {invalidate()}
}
function onPointerUp(event: PointerEvent) {
  if (!pointers.has(event.pointerId)) {return}
  cancelTouchZoom()
  pointers.delete(event.pointerId)
  if (pointerStart && !dragged && pointers.size === 0) {selectAt(event.clientX, event.clientY)}
  if (!pointers.size) {pointerStart = undefined}
}
function cancelTouchZoom() {
  clearTimeout(holdTimer); holdTimer = undefined; touchZoom = undefined
  if (controls) {controls.enableRotate = true}
}
function cancelPointer() { cancelTouchZoom(); clearHover(); pointers.clear(); pointerStart = undefined; mousePosition = undefined; dragged = true }

function zoomFromPoint(x: number, y: number, factor: number) {
  if (!controls || !canvas.value || flight || props.reveal) {return}
  const bounds = canvas.value.getBoundingClientRect()
  mouse.set((x - bounds.left) / bounds.width * 2 - 1, -(y - bounds.top) / bounds.height * 2 + 1)
  const distance = THREE.MathUtils.clamp(1 + (camera.position.length() - 1) * factor, controls.minDistance, controls.maxDistance)
  controls.enableDamping = false
  controls.update()
  zoomAtPointer(camera, mouse, distance)
  controls.update()
  controls.enableDamping = true
  scheduleDetail()
  invalidate()
}

function onWheel(event: WheelEvent) {
  if (flight || props.reveal) {event.preventDefault(); return}
  clearHover()
  if (!controls || !canvas.value) {return}
  event.preventDefault()
  event.stopImmediatePropagation()
  const [x, y] = wheelPointer([event.clientX, event.clientY], mousePosition)
  const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.value.clientHeight : 1)
  zoomFromPoint(x, y, Math.exp(THREE.MathUtils.clamp(pixels, -500, 500) * .002))
}

function onKey(event: KeyboardEvent) {
  if (flight || props.reveal) {event.preventDefault(); return}
  if (!controls) {return}
  if (event.key === 'Enter' && event.repeat) {return}
  const [lon, lat] = vectorToCoordinate(camera.position)
  const step = Math.max(.002, (camera.position.length() - 1) * 2)
  const movement: Record<string, Coordinate> = { ArrowLeft: [lon - step, lat], ArrowRight: [lon + step, lat], ArrowUp: [lon, Math.min(89, lat + step)], ArrowDown: [lon, Math.max(-89, lat - step)] }
  if (movement[event.key]) {focus(movement[event.key]!, camera.position.length())}
  else if (event.key === '+' || event.key === '=') {zoom(1)}
  else if (event.key === '-') {zoom(-1)}
  else if (event.key === 'Enter') {
    const bounds = canvas.value!.getBoundingClientRect()
    selectAt(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2)
  } else {return}
  event.preventDefault()
  positionCoordinates.value = vectorToCoordinate(camera.position)
}

function onVisibility() {
  if (document.hidden) { cancelPointer(); cancelAnimationFrame(frame); frame = 0 }
  else {invalidate()}
}
function onContextLost(event: Event) { event.preventDefault(); emit('error', 'graphicsLost') }

onMounted(async () => {
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas.value, antialias: true, alpha: true, powerPreference: 'low-power' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(42, 1, .01, 100)
    controls = new OrbitControls(camera, canvas.value)
    controls.enablePan = false
    controls.enableDamping = true
    controls.dampingFactor = .12
    controls.rotateSpeed = .65
    controls.zoomSpeed = .8
    controls.minDistance = 1.002
    controls.maxDistance = 5
    canvas.value!.addEventListener('wheel', onWheel, { capture: true, passive: false })
    controls.addEventListener('change', () => { invalidate(); scheduleDetail() })
    controls.addEventListener('start', () => { dragged = pointers.size > 1 || dragged })
    const geometry = new THREE.SphereGeometry(1, 96, 64)
    baseGeometry = geometry
    const material = new THREE.MeshPhongMaterial({ color: '#9cbaca', shininess: 12, specular: '#132537' })
    earth = new THREE.Mesh(geometry, material)
    scene.add(earth)
    scene.add(new THREE.AmbientLight('#b7d5e5', 1.5))
    const sun = new THREE.DirectionalLight('#fff1de', 2.1)
    // Camera-relative lighting keeps every country playable without a night-side penalty.
    sun.position.set(-3, 5, 5)
    camera.add(sun)
    scene.add(camera)

    imagery = new GlobeImagery(invalidate)
    scene.add(imagery)
    borderMesh = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#bbdcd6', transparent: true, opacity: .7, depthWrite: false }))
    borderMesh.renderOrder = 3
    borderMesh.visible = props.borders
    scene.add(borderMesh)
    nearbyBorders = new THREE.Group()
    scene.add(nearbyBorders)
    const fill = makeOverlay()
    fillCanvas = fill.image
    fillTexture = fill.texture
    fillMesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: fill.texture, transparent: true, depthWrite: false }))
    fillMesh.scale.setScalar(1.00025)
    scene.add(fillMesh)

    atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), new THREE.ShaderMaterial({
      uniforms: { glow: { value: new THREE.Color('#409bbd') } },
      vertexShader: 'varying vec3 n; varying vec3 v; void main(){ vec4 p=modelViewMatrix*vec4(position,1.); n=normalize(normalMatrix*normal); v=normalize(-p.xyz); gl_Position=projectionMatrix*p; }',
      fragmentShader: 'uniform vec3 glow; varying vec3 n; varying vec3 v; void main(){ float rim=pow(1.-abs(dot(normalize(n),normalize(v))),3.); gl_FragColor=vec4(glow,rim*.45); }',
      transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    }))
    atmosphere.scale.setScalar(1.025)
    scene.add(atmosphere)
    markerGroup = new THREE.Group()
    const markerCanvas = document.createElement('canvas')
    markerCanvas.width = markerCanvas.height = 32
    const mc = markerCanvas.getContext('2d')!
    mc.beginPath(); mc.arc(16, 16, 9, 0, Math.PI * 2); mc.fillStyle = 'white'; mc.fill()
    mc.strokeStyle = '#183830'; mc.lineWidth = 3; mc.stroke()
    markerTexture = new THREE.CanvasTexture(markerCanvas)
    textures.push(markerTexture)
    scene.add(markerGroup)
    configureCountries()
    observer = new ResizeObserver(() => {
      const { width, height } = host.value!.getBoundingClientRect()
      if (!width || !height) {return}
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer!.setSize(width, height, false)
      invalidate()
    })
    observer.observe(host.value!)
    canvas.value!.addEventListener('pointerdown', onPointerDown, { capture: true })
    canvas.value!.addEventListener('pointermove', onPointerMove)
    canvas.value!.addEventListener('pointerup', onPointerUp)
    canvas.value!.addEventListener('pointercancel', cancelPointer)
    canvas.value!.addEventListener('pointerleave', onPointerLeave)
    canvas.value!.addEventListener('webglcontextlost', onContextLost)
    document.addEventListener('visibilitychange', onVisibility)
    reset()
    try {
      const texture = await new THREE.TextureLoader().loadAsync(`${import.meta.env.BASE_URL}data/globe/earth-preview.jpg`)
      if (disposed) { texture.dispose(); return }
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
      textures.push(texture)
      material.map = texture
      material.color.set('#d8e3e7')
      material.needsUpdate = true
    } catch {
      if (!disposed) {emit('warning', 'imageryUnavailable')}
    }
    if (!disposed) { invalidate(); emit('ready') }
    const prepareGeometry = () => {
      if (!disposed) { detailedGeometry = new THREE.SphereGeometry(1, 512, 256); invalidate() }
    }
    if ('requestIdleCallback' in window) {geometryIdle = requestIdleCallback(prepareGeometry, { timeout: 2000 })}
    else {geometryTimer = setTimeout(prepareGeometry, 0)}
    new THREE.TextureLoader().loadAsync(`${import.meta.env.BASE_URL}data/globe/earth.jpg`).then(texture => {
      if (disposed) { texture.dispose(); return }
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = Math.min(4, renderer!.capabilities.getMaxAnisotropy())
      material.map?.dispose()
      material.map = texture
      textures.push(texture)
      material.needsUpdate = true
      baseDetail.value = 'full'
      invalidate()
    }).catch(() => { /* The small local image remains playable offline. */ })
  } catch {
    if (!disposed) {emit('error', 'webglError')}
  }
})

watch(() => props.disabled, disabled => {if (disabled) {cancelPointer()}})
watch(() => props.borders, visible => { if (borderMesh) { borderMesh.visible = visible; invalidate() } })
watch(() => props.countries, configureCountries)
watch([() => props.answers.length ? props.answers : undefined, () => props.paintFound, () => props.markers, () => props.reveal], updateHighlights)
onBeforeUnmount(() => {
  disposed = true
  cancelTouchZoom()
  cancelFlight()
  cancelAnimationFrame(frame)
  cancelAnimationFrame(hoverFrame)
  clearTimeout(feedbackTimer)
  clearTimeout(detailTimer)
  clearTimeout(geometryTimer)
  if (geometryIdle) {cancelIdleCallback(geometryIdle)}
  imagery?.dispose()
  observer?.disconnect()
  controls?.dispose()
  document.removeEventListener('visibilitychange', onVisibility)
  canvas.value?.removeEventListener('pointerdown', onPointerDown, { capture: true })
  canvas.value?.removeEventListener('pointermove', onPointerMove)
  canvas.value?.removeEventListener('pointerup', onPointerUp)
  canvas.value?.removeEventListener('pointercancel', cancelPointer)
  canvas.value?.removeEventListener('pointerleave', onPointerLeave)
  canvas.value?.removeEventListener('wheel', onWheel, true)
  canvas.value?.removeEventListener('webglcontextlost', onContextLost)
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  scene?.traverse(object => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Sprite || object instanceof THREE.LineSegments) {
      if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {geometries.add(object.geometry)}
      const objectMaterials = Array.isArray(object.material) ? object.material : [object.material]
      objectMaterials.forEach(material => materials.add(material))
    }
  })
  geometries.forEach(geometry => geometry.dispose())
  materials.forEach(material => material.dispose())
  baseGeometry?.dispose()
  detailedGeometry?.dispose()
  textures.forEach(texture => texture.dispose())
  renderer?.dispose()
})
</script>

<style scoped>
.earth-host {
  width: 100%;
  height: 100%;
  position: relative;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: grab;
  outline-offset: -5px;
}

canvas:active { cursor: grabbing; }

.crosshair {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 7px;
  height: 7px;
  border: 1px solid #fff9;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  opacity: 0;
}

.earth-host:focus-within .crosshair { opacity: 1; }

.answer-cue {
  position: absolute;
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border: 2px solid currentcolor;
  border-radius: 50%;
  background: #090f13d9;
  font-size: 28px;
  font-weight: 700;
  pointer-events: none;
  transform: translate(-50%, -50%);
  animation: answer-pop 650ms ease-out both;
  z-index: 5;
}

.answer-cue.correct { color: #99edc5; }
.answer-cue.wrong { color: #ff958c; }

@keyframes answer-pop {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(.5);
  }

  18% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }

  75% { opacity: 1; }

  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.4);
  }
}

</style>
